import { db, ownerOnly, unavailable } from '@/lib/server';
import { expireUnpaidPix } from '@/lib/pix-expiry';
import { sendPush } from '@/lib/push';
import { cleanupOldCancelledBookings } from '@/lib/cancelled-booking-cleanup';
import { clearPaymentFollowup } from '@/lib/payment-followup';
import { availableTimes, occupiedSlotsFor, parseBlocks, parseBookingRules, parseSchedule, parseClosedInterval, validDate } from '@/lib/booking';
import { env } from 'cloudflare:workers';
export async function DELETE(request: Request) {
  if (!await ownerOnly()) return Response.json({ error: 'Acesso negado' }, { status: 403 });
  const id = new URL(request.url).searchParams.get('id');
  if (!id || id.length > 100) return Response.json({ error: 'Agendamento inválido.' }, { status: 400 });
  try {
    const database = db();
    const booking = await database.prepare('SELECT status,receipt_key,payment_status FROM bookings WHERE id=?').bind(id).first<{ status: string; receipt_key: string | null; payment_status: string }>();
    if (!booking) return Response.json({ error: 'Agendamento não encontrado.' }, { status: 404 });
    if (booking.status !== 'CANCELLED') return Response.json({ error: 'Só é possível excluir agendamentos cancelados.' }, { status: 409 });
    const completion=await database.prepare('SELECT 1 FROM service_completions WHERE booking_id=? LIMIT 1').bind(id).first();
    if(completion)return Response.json({error:'O histórico de consumo deste atendimento deve ser preservado.'},{status:409});
    const linkedOrder = await database.prepare('SELECT 1 AS found FROM product_orders WHERE booking_id=? LIMIT 1').bind(id).first();
    if (linkedOrder) return Response.json({ error: 'Este agendamento está vinculado a um pedido da loja e não pode ser excluído.' }, { status: 409 });
    await database.batch([
      database.prepare('DELETE FROM booked_slots WHERE booking_id=?').bind(id),
      database.prepare("DELETE FROM bookings WHERE id=? AND status='CANCELLED'").bind(id),
    ]);
    if (booking.receipt_key) {
      const bucket = (env as unknown as { BUCKET?: R2Bucket }).BUCKET;
      if (bucket) await bucket.delete(booking.receipt_key).catch(() => {});
    }
    return Response.json({ ok: true });
  } catch {
    return unavailable();
  }
}
export async function GET(request: Request) {
  if (!await ownerOnly()) return Response.json({ error: 'Acesso negado' }, { status: 403 });
  const month = new URL(request.url).searchParams.get('month');
  if (month && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return Response.json({ error: 'Mês inválido' }, { status: 400 });
  try {
    await expireUnpaidPix(db());
    await cleanupOldCancelledBookings(db());
    const query = `SELECT b.id, b.service_id, b.date, b.time, b.name, b.phone, b.status, b.price_cents, b.price_variable, b.payment_method, b.payment_status, b.receipt_key, b.user_sub, u.email, s.name AS service_name FROM bookings b JOIN services s ON s.id = b.service_id LEFT JOIN users u ON u.sub=b.user_sub`;
    const result = month
      ? await db().prepare(`${query} WHERE b.date >= ? AND b.date < ? ORDER BY b.date, b.time`).bind(`${month}-01`, new Date(Date.UTC(Number(month.slice(0,4)), Number(month.slice(5)), 1)).toISOString().slice(0,10)).all()
      : await db().prepare(`${query} ORDER BY b.date DESC, b.time DESC LIMIT 200`).all();
    return Response.json(result.results, { headers: { 'cache-control': 'no-store' } });
  } catch { return unavailable(); }
}
export async function PATCH(request: Request) {
  if (!await ownerOnly()) return Response.json({ error: 'Acesso negado' }, { status: 403 });
  let data: { id?: string; action?: string; price_cents?:number; service_id?:string; date?:string; time?:string; name?:string; phone?:string };
  try { data = await request.json(); } catch { return Response.json({ error: 'Dados inválidos' }, { status: 400 }); }
  if (!data.id || !['cancel','paid','quote','edit'].includes(data.action || '') || data.action==='quote'&&(!Number.isInteger(data.price_cents)||data.price_cents!<=0||data.price_cents!>10000000)) return Response.json({ error: 'Ação inválida' }, { status: 400 });
  try {
    const database = db();
    const locked=await database.prepare('SELECT 1 FROM service_completions WHERE booking_id=? AND voided_at IS NULL').bind(data.id).first();
    if(locked&&['cancel','edit','quote'].includes(data.action||''))return Response.json({error:'Estorne a conclusão em Insumos e serviços antes de editar ou cancelar.'},{status:409});
    const row = await database.prepare('SELECT status,service_id,payment_method,payment_status,price_cents,price_variable,receipt_key,user_sub,date,time FROM bookings WHERE id=?').bind(data.id).first<{status:string;service_id:string;payment_method:string;payment_status:string;price_cents:number;price_variable:number;receipt_key:string|null;user_sub:string|null;date:string;time:string}>();
    if (!row) return Response.json({ error: 'Reserva não encontrada' }, { status: 404 });
    if (data.action === 'cancel') {
      if(row.status==='CANCELLED')return Response.json({error:'Este agendamento já está cancelado.'},{status:409});
      await database.batch([database.prepare("UPDATE bookings SET status='CANCELLED',cancelled_at=? WHERE id=? AND status<>'CANCELLED'").bind(new Date().toISOString(),data.id),database.prepare('DELETE FROM booked_slots WHERE booking_id=?').bind(data.id)]);
    } else if(data.action==='edit'){
      if(row.status==='CANCELLED')return Response.json({error:'Não é possível editar um agendamento cancelado.'},{status:409});
      if(row.date<new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()))return Response.json({error:'Não é possível editar um atendimento que já passou.'},{status:409});
      const serviceId=data.service_id||row.service_id,date=data.date||'',time=data.time||'',name=data.name?.trim()||'',phone=data.phone?.trim()||'';
      if(!validDate(date)||!/^([01]\d|2[0-3]):(00|15|30|45)$/.test(time)||!name||name.length>100||!phone||!/^[+]?[\d()\s-]{8,20}$/.test(phone))return Response.json({error:'Confira serviço, data, horário, nome e telefone.'},{status:400});
      const service=await database.prepare('SELECT name,duration_min,interleaved_blocks,price_cents,price_variable,allow_in_person_payment FROM services WHERE id=? AND active=1').bind(serviceId).first<{name:string;duration_min:number;interleaved_blocks:string|null;price_cents:number;price_variable:number;allow_in_person_payment:number}>();
      if(!service)return Response.json({error:'Selecione um serviço ativo.'},{status:404});
      const serviceChanged=serviceId!==row.service_id;
      if(serviceChanged&&(row.payment_status==='PAID'||row.payment_status==='REVIEW'))return Response.json({error:'Este pagamento já foi aprovado ou está em análise. Conclua a análise ou cancele a reserva antes de trocar o serviço.'},{status:409});
      const [schedule,rulesRow,used,blocked,interval]=await Promise.all([
        database.prepare("SELECT value FROM settings WHERE key='schedule'").first<{value:string}>(),
        database.prepare("SELECT value FROM settings WHERE key='booking_rules'").first<{value:string}>(),
        database.prepare('SELECT slot FROM booked_slots WHERE date=? AND booking_id<>?').bind(date,data.id).all<{slot:string}>(),
        database.prepare('SELECT slot FROM blocked_slots WHERE date=?').bind(date).all<{slot:string}>(),
        database.prepare("SELECT value FROM settings WHERE key='closed_interval'").first<{value:string}>(),
      ]);
      const blocks=parseBlocks(service.interleaved_blocks,service.duration_min);
      if(!availableTimes(date,service.duration_min,parseSchedule(schedule?.value),new Set([...used.results,...blocked.results].map(item=>item.slot)),parseBookingRules(rulesRow?.value),blocks,parseClosedInterval(interval?.value)).includes(time))return Response.json({error:'Esse horário não está mais disponível ou está fora do expediente.'},{status:409});
      let paymentMethod=row.payment_method,paymentStatus=row.payment_status,priceCents=row.price_cents,priceVariable=row.price_variable,receiptKey=row.receipt_key;
      if(serviceChanged){
        priceCents=service.price_cents;priceVariable=service.price_variable;
        if(priceVariable){paymentMethod='IN_PERSON';paymentStatus='PENDING'}
        else if(paymentMethod==='PIX'||!service.allow_in_person_payment){paymentMethod='PIX';paymentStatus='AWAITING_PAYMENT'}
        else if(paymentMethod==='MANUAL_PAID')return Response.json({error:'Pagamento já recebido. Cancele e crie uma nova reserva para trocar o serviço.'},{status:409});
        receiptKey=null;
      }
      await database.batch([
        database.prepare('DELETE FROM booked_slots WHERE booking_id=?').bind(data.id),
        database.prepare('UPDATE bookings SET service_id=?,date=?,time=?,name=?,phone=?,price_cents=?,price_variable=?,payment_method=?,payment_status=?,receipt_key=?,created_at=CASE WHEN ? THEN ? ELSE created_at END WHERE id=? AND status<>\'CANCELLED\'').bind(serviceId,date,time,name,phone,priceCents,priceVariable,paymentMethod,paymentStatus,receiptKey,serviceChanged?1:0,new Date().toISOString(),data.id),
        ...occupiedSlotsFor(time,service.duration_min,blocks).map(slot=>database.prepare('INSERT INTO booked_slots(booking_id,date,slot) VALUES(?,?,?)').bind(data.id,date,slot)),
      ]);
      if(serviceChanged&&row.receipt_key){const bucket=(env as unknown as {BUCKET?:R2Bucket}).BUCKET;if(bucket)await bucket.delete(row.receipt_key).catch(()=>{})}
      if(row.user_sub)await sendPush(row.user_sub,`${data.id}:edited:${date}:${time}`,`Agendamento atualizado`,`Seu horário foi atualizado para ${service.name} em ${date.split('-').reverse().join('/')} às ${time}.${paymentMethod==='PIX'?' Confira o novo Pix na área do cliente.':''}`,'/cliente').catch(()=>{});
      return Response.json({ok:true});
    } else if(data.action==='quote'){
      if(row.status==='CANCELLED'||!row.price_variable||row.payment_status==='PAID')return Response.json({error:'Este agendamento não permite definir valor.'},{status:409});
      await database.prepare('UPDATE bookings SET price_cents=?,price_variable=0 WHERE id=?').bind(data.price_cents,data.id).run();
    } else {
      if (row.status === 'CANCELLED' || row.payment_method !== 'IN_PERSON') return Response.json({ error: 'Pagamento no atendimento indisponível' }, { status: 409 });
      if(row.price_variable)return Response.json({error:'Defina o valor combinado antes de marcar como pago.'},{status:409});
      await database.prepare("UPDATE bookings SET payment_status='PAID' WHERE id=?").bind(data.id).run();
      await clearPaymentFollowup(database,data.id);
    }
    if(row.user_sub)await sendPush(row.user_sub,`${data.id}:${data.action}`,data.action==='cancel'?'Agendamento cancelado':data.action==='quote'?'Valor do serviço atualizado':'Pagamento confirmado',data.action==='cancel'?`O horário de ${row.date.split('-').reverse().join('/')} às ${row.time} foi cancelado.${row.payment_status==='PAID'?' Entre em contato com o estabelecimento para tratar do reembolso.':''}`:'Confira os detalhes no aplicativo.','/cliente').catch(()=>{});
    return Response.json({ ok: true });
  } catch { return unavailable(); }
}
