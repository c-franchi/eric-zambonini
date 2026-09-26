import { db, unavailable } from '@/lib/server';
import { getViewer } from '@/lib/auth';
import { availableTimes, parseSchedule, parseBookingRules, parseBlocks, occupiedSlotsFor, validDate } from '@/lib/booking';
export async function POST(request: Request) {
  const viewer = await getViewer();
  if (!viewer) return Response.json({ error: 'Entre com Google para confirmar seu horário.' }, { status: 401 });
  let payload: { service?: string; date?: string; time?: string; name?: string; phone?: string; payment_method?: string };
  try { payload = await request.json(); } catch { return Response.json({ error: 'Dados inválidos.' }, { status: 400 }); }
  const { service, date, time, name, phone } = payload;
  if (!service || !date || !validDate(date) || !time || !/^([01]\d|2[0-3]):(00|15|30|45)$/.test(time) || !name?.trim() || name.length > 100 || !phone || !/^\+?[\d()\s-]{8,20}$/.test(phone)) {
    return Response.json({ error: 'Revise serviço, data, horário, nome e telefone.' }, { status: 400 });
  }
  try {
    const database = db();
    const chosen = await database.prepare('SELECT duration_min, price_cents, allow_in_person_payment, interleaved_blocks FROM services WHERE id = ? AND active = 1').bind(service).first<{ duration_min: number; price_cents: number; allow_in_person_payment: number; interleaved_blocks:string|null }>();
    const config = await database.prepare("SELECT value FROM settings WHERE key = 'schedule'").first<{ value: string }>();
    const rules = await database.prepare("SELECT value FROM settings WHERE key = 'booking_rules'").first<{ value: string }>();
    if (!chosen) return Response.json({ error: 'Serviço indisponível.' }, { status: 404 });
    if(payload.payment_method && !['PIX','IN_PERSON'].includes(payload.payment_method))return Response.json({error:'Forma de pagamento inválida.'},{status:400});
    if((payload.payment_method||'IN_PERSON')==='IN_PERSON'&&!chosen.allow_in_person_payment)return Response.json({error:'Esse serviço requer Pix. Selecione pagamento Pix.'},{status:409});
    if(payload.payment_method==='PIX' && !await database.prepare("SELECT 1 FROM settings WHERE key='pix'").first())return Response.json({error:'Pagamento Pix ainda não configurado. Escolha pagar no atendimento.'},{status:409});
    const occupiedSlots=occupiedSlotsFor(time,chosen.duration_min,parseBlocks(chosen.interleaved_blocks,chosen.duration_min));
    if (!availableTimes(date, chosen.duration_min, parseSchedule(config?.value), new Set(), parseBookingRules(rules?.value),parseBlocks(chosen.interleaved_blocks,chosen.duration_min)).includes(time)) return Response.json({ error: 'Horário fora da agenda.' }, { status: 400 });
    const blocked = await database.prepare('SELECT slot FROM blocked_slots WHERE date = ?').bind(date).all<{slot:string}>();
    if (occupiedSlots.some(slot => blocked.results.some(row => row.slot === slot))) return Response.json({error:'Horário bloqueado. Escolha outro.'},{status:409});
    const id = crypto.randomUUID();
    await database.batch([
      database.prepare(`INSERT INTO bookings (id, service_id, user_sub, date, time, name, phone, status, created_at, price_cents, payment_method, payment_status)
        SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE NOT EXISTS
        (SELECT 1 FROM blocked_slots WHERE date = ? AND slot IN (${occupiedSlots.map(()=>'?').join(',')}))`).bind(id, service, viewer.sub, date, time, name.trim(), phone.trim(), 'CONFIRMED', new Date().toISOString(),chosen.price_cents,payload.payment_method||'IN_PERSON','PENDING',date,...occupiedSlots),
      ...occupiedSlots.map((slot) => database.prepare('INSERT INTO booked_slots (booking_id, date, slot) VALUES (?, ?, ?)').bind(id, date, slot)),
      database.prepare('UPDATE users SET name=?,phone=? WHERE sub=?').bind(name.trim(),phone.trim(),viewer.sub),
    ]);
    return Response.json({ id }, { status: 201 });
  } catch (error) {
    if (/UNIQUE constraint|FOREIGN KEY constraint/.test(String(error))) return Response.json({ error: 'Esse horário acabou de ser reservado ou bloqueado. Escolha outro.' }, { status: 409 });
    return unavailable();
  }
}
