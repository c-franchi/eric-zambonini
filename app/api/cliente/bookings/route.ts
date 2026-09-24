import { getViewer } from '@/lib/auth';
import { db, unavailable } from '@/lib/server';
import { dayInSalon, minuteInSalon, validDate, availableTimes, parseSchedule, slotsFor } from '@/lib/booking';
export async function PATCH(request:Request){
  const viewer=await getViewer();if(!viewer)return Response.json({error:'Entre com Google'},{status:401});
  let data:{id?:string;action?:string;date?:string;time?:string};try{data=await request.json()}catch{return Response.json({error:'Dados inválidos'},{status:400})}
  if(!data.id||!['cancel','reschedule'].includes(data.action||''))return Response.json({error:'Ação inválida'},{status:400});
  try{
    const database=db();const booking=await database.prepare('SELECT b.date,b.time,b.status,b.payment_status,s.duration_min FROM bookings b JOIN services s ON s.id=b.service_id WHERE b.id=? AND b.user_sub=?').bind(data.id,viewer.sub).first<{date:string;time:string;status:string;payment_status:string;duration_min:number}>();
    if(!booking)return Response.json({error:'Agendamento não encontrado'},{status:404});
    if(booking.status==='CANCELLED')return Response.json({error:'Agendamento cancelado'},{status:409});
    if(data.action==='cancel'&&booking.payment_status==='PAID')return Response.json({error:'Pagamento aprovado. Solicite o cancelamento diretamente ao estabelecimento para combinar o reembolso.'},{status:409});
    if(booking.date<dayInSalon()||booking.date===dayInSalon()&&Number(booking.time.slice(0,2))*60+Number(booking.time.slice(3))<=minuteInSalon())return Response.json({error:'O atendimento já começou ou passou'},{status:409});
    if(data.action==='cancel'){
      await database.batch([database.prepare("UPDATE bookings SET status='CANCELLED' WHERE id=? AND user_sub=? AND status<>'CANCELLED'").bind(data.id,viewer.sub),database.prepare('DELETE FROM booked_slots WHERE booking_id=?').bind(data.id)]);
      return Response.json({ok:true});
    }
    if(!data.date||!validDate(data.date)||!data.time||!/^([01]\d|2[0-3]):(00|15|30|45)$/.test(data.time))return Response.json({error:'Escolha uma data e horário válidos'},{status:400});
    if(data.date===booking.date&&data.time===booking.time)return Response.json({ok:true});
    const [settings,used,blocked]=await Promise.all([database.prepare("SELECT value FROM settings WHERE key='schedule'").first<{value:string}>(),database.prepare('SELECT slot FROM booked_slots WHERE date=? AND booking_id<>?').bind(data.date,data.id).all<{slot:string}>(),database.prepare('SELECT slot FROM blocked_slots WHERE date=?').bind(data.date).all<{slot:string}>()]);
    if(!availableTimes(data.date,booking.duration_min,parseSchedule(settings?.value),new Set([...used.results,...blocked.results].map(x=>x.slot))).includes(data.time))return Response.json({error:'Horário indisponível'},{status:409});
    await database.batch([database.prepare('DELETE FROM booked_slots WHERE booking_id=?').bind(data.id),database.prepare('UPDATE bookings SET date=?,time=? WHERE id=? AND user_sub=?').bind(data.date,data.time,data.id,viewer.sub),...slotsFor(data.time,booking.duration_min).map(slot=>database.prepare('INSERT INTO booked_slots (booking_id,date,slot) VALUES (?,?,?)').bind(data.id,data.date,slot))]);
    return Response.json({ok:true});
  }catch(error){if(String(error).includes('UNIQUE constraint'))return Response.json({error:'Horário acabou de ser reservado'},{status:409});return unavailable()}
}
