import { db, unavailable } from '@/lib/server';
import { getViewer } from '@/lib/auth';
import { availableTimes, parseSchedule, parseBookingRules, parseBlocks, occupiedSlotsFor, validDate } from '@/lib/booking';
import { expireUnpaidPix, pixExpiresAt } from '@/lib/pix-expiry';
import { ensureServiceCatalog } from '@/lib/service-catalog';
import { notificationInsert, deliverOwnerNotifications } from '@/lib/owner-notifications';
import { sendPush } from '@/lib/push';
export async function POST(request: Request) {
  const viewer = await getViewer();
  if (!viewer) return Response.json({ error: 'Entre com Google para confirmar seu horário.' }, { status: 401 });
  let payload: { service?: string; date?: string; time?: string; name?: string; phone?: string; payment_method?: string;acceptedLegal?:boolean;legalVersion?:string };
  try { payload = await request.json(); } catch { return Response.json({ error: 'Dados inválidos.' }, { status: 400 }); }
  if(payload.acceptedLegal!==true||payload.legalVersion!=='2026-09-26')return Response.json({error:'Aceite os Termos de Serviço e confirme que está ciente da Política de Privacidade para concluir a reserva.'},{status:400});
  const { service, date, time, name, phone } = payload;
  if (!service || !date || !validDate(date) || !time || !/^([01]\d|2[0-3]):(00|15|30|45)$/.test(time) || !name?.trim() || name.length > 100 || !phone || !/^\+?[\d()\s-]{8,20}$/.test(phone)) {
    return Response.json({ error: 'Revise serviço, data, horário, nome e telefone.' }, { status: 400 });
  }
  try {
    await ensureServiceCatalog();
    const database = db();
    await expireUnpaidPix(database);
    const chosen = await database.prepare('SELECT name, duration_min, price_cents, price_variable, allow_in_person_payment, interleaved_blocks FROM services WHERE id = ? AND active = 1').bind(service).first<{ name:string;duration_min: number; price_cents: number; price_variable:number; allow_in_person_payment: number; interleaved_blocks:string|null }>();
    const config = await database.prepare("SELECT value FROM settings WHERE key = 'schedule'").first<{ value: string }>();
    const rules = await database.prepare("SELECT value FROM settings WHERE key = 'booking_rules'").first<{ value: string }>();
    if (!chosen) return Response.json({ error: 'Serviço indisponível.' }, { status: 404 });
    if(chosen.price_variable&&payload.payment_method==='PIX')return Response.json({error:'O valor desse serviço é combinado após avaliação; reserve sem pagamento antecipado.'},{status:400});
    if(payload.payment_method && !['PIX','IN_PERSON'].includes(payload.payment_method))return Response.json({error:'Forma de pagamento inválida.'},{status:400});
    if((payload.payment_method||'IN_PERSON')==='IN_PERSON'&&!chosen.allow_in_person_payment)return Response.json({error:'Esse serviço requer Pix. Selecione pagamento Pix.'},{status:409});
    if(payload.payment_method==='PIX' && !await database.prepare("SELECT 1 FROM settings WHERE key='pix'").first())return Response.json({error:'Pagamento Pix ainda não configurado. Escolha pagar no atendimento.'},{status:409});
    const occupiedSlots=occupiedSlotsFor(time,chosen.duration_min,parseBlocks(chosen.interleaved_blocks,chosen.duration_min));
    if (!availableTimes(date, chosen.duration_min, parseSchedule(config?.value), new Set(), parseBookingRules(rules?.value),parseBlocks(chosen.interleaved_blocks,chosen.duration_min)).includes(time)) return Response.json({ error: 'Horário fora da agenda.' }, { status: 400 });
    const blocked = await database.prepare('SELECT slot FROM blocked_slots WHERE date = ?').bind(date).all<{slot:string}>();
    if (occupiedSlots.some(slot => blocked.results.some(row => row.slot === slot))) return Response.json({error:'Horário bloqueado. Escolha outro.'},{status:409});
    const id = crypto.randomUUID(),createdAt=new Date().toISOString(),isPix=payload.payment_method==='PIX';
    await database.batch([
      database.prepare(`INSERT INTO bookings (id, service_id, user_sub, date, time, name, phone, status, created_at, price_cents, price_variable, payment_method, payment_status)
        SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE NOT EXISTS
        (SELECT 1 FROM blocked_slots WHERE date = ? AND slot IN (${occupiedSlots.map(()=>'?').join(',')}))`).bind(id, service, viewer.sub, date, time, name.trim(), phone.trim(), 'CONFIRMED', createdAt,chosen.price_cents,chosen.price_variable,payload.payment_method||'IN_PERSON',isPix?'AWAITING_PAYMENT':'PENDING',date,...occupiedSlots),
      ...occupiedSlots.map((slot) => database.prepare('INSERT INTO booked_slots (booking_id, date, slot) VALUES (?, ?, ?)').bind(id, date, slot)),
      database.prepare('UPDATE users SET name=?,phone=? WHERE sub=?').bind(name.trim(),phone.trim(),viewer.sub),
      database.prepare('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(`legal_acceptance:${viewer.sub}`,JSON.stringify({termsVersion:payload.legalVersion,privacyVersion:payload.legalVersion,acceptedAt:createdAt,method:'booking'})),
      notificationInsert(database,'BOOKING',isPix?'Nova reserva aguardando Pix':'Novo agendamento',`${name.trim()} reservou ${chosen.name} para ${date.split('-').reverse().join('/')} às ${time}. Telefone: ${phone.trim()}. ${isPix?'Aguardando pagamento e comprovante Pix.':chosen.price_variable?'Valor a combinar.':'Pagamento no atendimento.'}`,`/admin/agenda?date=${date}`),
    ]);
    await deliverOwnerNotifications().catch(()=>{});
    await sendPush(viewer.sub,id,'Horário reservado',`${chosen.name} em ${date.split('-').reverse().join('/')} às ${time}.${isPix?' Pague o Pix em até 15 minutos para manter a reserva.':''}`,'/cliente').catch(()=>{});
    return Response.json({ id,expiresAt:isPix?pixExpiresAt(createdAt):null }, { status: 201 });
  } catch (error) {
    if (/UNIQUE constraint|FOREIGN KEY constraint/.test(String(error))) return Response.json({ error: 'Esse horário acabou de ser reservado ou bloqueado. Escolha outro.' }, { status: 409 });
    return unavailable();
  }
}
