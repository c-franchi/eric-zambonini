import { env } from 'cloudflare:workers';
import { db } from '@/lib/server';
import { salonTimeStamp } from '@/lib/booking';
import { sendPush } from '@/lib/push';
import { cleanupOldCancelledBookings } from '@/lib/cancelled-booking-cleanup';

// Endpoint for an hourly external scheduler. A private bearer token is required.
export async function POST(request:Request){
 const token=(env as unknown as Record<string,string|undefined>).REMINDER_JOB_SECRET;
 if(!token||request.headers.get('authorization')!==`Bearer ${token}`)return Response.json({error:'Acesso negado'},{status:403});
 const removedCancelled=await cleanupOldCancelledBookings(db());
 const now=Date.now();
 const rows=(await db().prepare("SELECT b.id,b.user_sub,b.date,b.time,s.name AS service_name FROM bookings b JOIN services s ON s.id=b.service_id WHERE b.user_sub IS NOT NULL AND b.status='CONFIRMED' AND b.date>=? AND b.date<=? LIMIT 300").bind(new Date(now-86400000).toISOString().slice(0,10),new Date(now+3*86400000).toISOString().slice(0,10)).all<{id:string;user_sub:string;date:string;time:string;service_name:string}>()).results;
 let reminders=0;
 for(const row of rows){const remaining=(salonTimeStamp(row.date,row.time)-now)/3600000;const stage=remaining>23.5&&remaining<=24?'24h':remaining>1.5&&remaining<=2?'2h':null;if(!stage)continue;
  await sendPush(row.user_sub,`${row.id}:reminder:${stage}`,stage==='24h'?'Seu horário é amanhã':'Seu horário está chegando',`${row.service_name} em ${row.date.split('-').reverse().join('/')} às ${row.time}.`,'/cliente').catch(()=>{});reminders++;
 }
 return Response.json({ok:true,reminders,removedCancelled});
}
