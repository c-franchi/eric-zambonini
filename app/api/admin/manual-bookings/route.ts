import { db, ownerOnly, unavailable } from '@/lib/server';
import { availableTimes, occupiedSlotsFor, parseBlocks, parseBookingRules, parseSchedule, parseClosedInterval, validDate } from '@/lib/booking';
import { expireUnpaidPix } from '@/lib/pix-expiry';
import { ensureServiceCatalog } from '@/lib/service-catalog';
import { notificationInsert, deliverOwnerNotifications } from '@/lib/owner-notifications';

const timePattern=/^([01]\d|2[0-3]):(00|15|30|45)$/;
export async function POST(request:Request){
  if(!await ownerOnly())return Response.json({error:'Acesso negado'},{status:403});
  let input:{service?:string;date?:string;time?:string;name?:string;phone?:string;payment?:string};
  try{input=await request.json()}catch{return Response.json({error:'Dados inválidos'},{status:400})}
  const {service,date,time,name,phone,payment}=input;
  if(!service||!date||!validDate(date)||!time||!timePattern.test(time)||!name?.trim()||name.trim().length>100||!phone?.trim()||!/^\+?[\d()\s-]{8,20}$/.test(phone)||!['ON_DAY','PAID_NOW'].includes(payment||''))return Response.json({error:'Confira serviço, data, horário, nome, telefone e pagamento.'},{status:400});
  try{
    await ensureServiceCatalog();
    const database=db();await expireUnpaidPix(database);
    const chosen=await database.prepare('SELECT name,duration_min,price_cents,price_variable,interleaved_blocks FROM services WHERE id=? AND active=1').bind(service).first<{name:string;duration_min:number;price_cents:number;price_variable:number;interleaved_blocks:string|null}>();
    if(!chosen)return Response.json({error:'Serviço indisponível.'},{status:404});
    if(chosen.price_variable&&payment==='PAID_NOW')return Response.json({error:'Esse serviço ainda não possui valor definido. Registre pagamento no atendimento.'},{status:400});
    const [settings,rules,blocked,interval]=await Promise.all([
      database.prepare("SELECT value FROM settings WHERE key='schedule'").first<{value:string}>(),
      database.prepare("SELECT value FROM settings WHERE key='booking_rules'").first<{value:string}>(),
      database.prepare('SELECT slot FROM blocked_slots WHERE date=?').bind(date).all<{slot:string}>(),
      database.prepare("SELECT value FROM settings WHERE key='closed_interval'").first<{value:string}>(),
    ]);
    const blocks=parseBlocks(chosen.interleaved_blocks,chosen.duration_min);
    if(!availableTimes(date,chosen.duration_min,parseSchedule(settings?.value),new Set(blocked.results.map(x=>x.slot)),parseBookingRules(rules?.value),blocks,parseClosedInterval(interval?.value)).includes(time))return Response.json({error:'Horário indisponível. Escolha outro.'},{status:409});
    const slots=occupiedSlotsFor(time,chosen.duration_min,blocks),id=crypto.randomUUID();
    await database.batch([
      database.prepare(`INSERT INTO bookings(id,service_id,user_sub,date,time,name,phone,status,created_at,price_cents,price_variable,payment_method,payment_status)
        SELECT ?,?,NULL,?,?,?,?,?,?,?,?, ?,? WHERE NOT EXISTS (SELECT 1 FROM blocked_slots WHERE date=? AND slot IN (${slots.map(()=>'?').join(',')}))`).bind(id,service,date,time,name.trim(),phone.trim(),'CONFIRMED',new Date().toISOString(),chosen.price_cents,chosen.price_variable,payment==='PAID_NOW'?'MANUAL_PAID':'IN_PERSON',payment==='PAID_NOW'?'PAID':'PENDING',date,...slots),
      ...slots.map(slot=>database.prepare('INSERT INTO booked_slots(booking_id,date,slot) VALUES(?,?,?)').bind(id,date,slot)),
      notificationInsert(database,'BOOKING','Agendamento manual',`${name.trim()} · ${chosen.name} · ${date.split('-').reverse().join('/')} às ${time}. Telefone: ${phone.trim()}.`,`/admin/agenda?date=${date}`),
    ]);
    await deliverOwnerNotifications().catch(()=>{});
    return Response.json({id},{status:201});
  }catch(error){if(/UNIQUE constraint|FOREIGN KEY constraint/.test(String(error)))return Response.json({error:'Esse horário acabou de ser reservado. Escolha outro.'},{status:409});return unavailable()}
}
