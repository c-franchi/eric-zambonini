import { env } from 'cloudflare:workers';
import { db } from '@/lib/server';
import { salonTimeStamp } from '@/lib/booking';
import { sendPush, sendOwnerPush } from '@/lib/push';
import { sendClientReminderEmail } from '@/lib/reminder-email';
import { notificationSettings } from '@/lib/owner-notifications';
import { cleanupOldCancelledBookings } from '@/lib/cancelled-booking-cleanup';

type ReminderRow={id:string;user_sub:string|null;email:string|null;date:string;time:string;service_name:string;name:string};
const siteUrl='https://ericzambonini.com.br';

// Invoked every 15 minutes by the external scheduler. Each stage is deduplicated
// independently so retries in its 30-minute window cannot send duplicate reminders.
export async function POST(request:Request){
 const token=(env as unknown as Record<string,string|undefined>).REMINDER_JOB_SECRET;
 if(!token||request.headers.get('authorization')!==`Bearer ${token}`)return Response.json({error:'Acesso negado'},{status:403});
 const database=db();
 const removedCancelled=await cleanupOldCancelledBookings(database);
 const now=Date.now();
 const from=new Date(now-86400000).toISOString().slice(0,10),through=new Date(now+3*86400000).toISOString().slice(0,10);
 const rows=(await database.prepare("SELECT b.id,b.user_sub,b.date,b.time,b.name,s.name AS service_name,u.email FROM bookings b JOIN services s ON s.id=b.service_id LEFT JOIN users u ON u.sub=b.user_sub WHERE b.status='CONFIRMED' AND b.date>=? AND b.date<=? LIMIT 300").bind(from,through).all<ReminderRow>()).results;
 let reminders=0,clientPushSent=0,clientPushMissing=0,clientEmailSent=0,clientEmailUnavailable=0,ownerPushSent=0,ownerPushMissing=0,failures=0;
 const senderConfigured=Boolean((env as unknown as Record<string,string|undefined>).RESEND_API_KEY&&(await notificationSettings()).from);
 for(const row of rows){
  const remaining=(salonTimeStamp(row.date,row.time)-now)/3600000;
  const stage=remaining>23.5&&remaining<=24?'24h':remaining>1.5&&remaining<=2?'2h':null;
  if(!stage)continue;
  reminders++;
  const date=row.date.split('-').reverse().join('/');
  const title=stage==='24h'?'Lembrete: cliente amanhã':'Lembrete: cliente em 2 horas';
  const body=`${row.name} — ${row.service_name}, ${date} às ${row.time}.`;
  const ownerId=`reminder:${row.id}:${stage}`;
  try{
   await database.prepare("INSERT OR IGNORE INTO owner_notifications(id,kind,title,body,link,created_at) VALUES(?,?,?,?,?,?)").bind(ownerId,'REMINDER',title,body,'/admin/agenda',new Date().toISOString()).run();
   const ownerResult=await sendOwnerPush(ownerId,title,body,'/admin/agenda');
   ownerPushSent+=ownerResult.sent;ownerPushMissing+=ownerResult.subscribed===0?1:0;
  }catch{failures++}
  if(row.user_sub){
   try{
    const result=await sendPush(row.user_sub,`${row.id}:reminder:${stage}`,stage==='24h'?'Seu horário é amanhã':'Seu horário está chegando',`${row.service_name} em ${date} às ${row.time}.`,'/cliente');
    clientPushSent+=result.sent;clientPushMissing+=result.subscribed===0?1:0;
    if(result.failed)failures+=result.failed;
   }catch{failures++}
  }else clientPushMissing++;
  if(row.email&&senderConfigured){
   const marker=`reminder_delivery:${row.id}:${stage}:client_email`;
   try{
    const claim=await database.prepare('INSERT OR IGNORE INTO settings(key,value) VALUES(?,?)').bind(marker,'PENDING').run();
    if(claim.meta.changes){
     const result=await sendClientReminderEmail(row.email,stage==='24h'?'Lembrete do seu horário amanhã':'Lembrete do seu horário em 2 horas',`Olá, ${row.name}!\n\nEste é um lembrete do serviço ${row.service_name}, marcado para ${date} às ${row.time}.\n\nConsulte os detalhes em ${siteUrl}/cliente.`,marker);
     if(result.sent){await database.prepare('UPDATE settings SET value=? WHERE key=?').bind('SENT',marker).run();clientEmailSent++}
     else{await database.prepare('DELETE FROM settings WHERE key=?').bind(marker).run();clientEmailUnavailable++}
    }
   }catch{await database.prepare('DELETE FROM settings WHERE key=?').bind(marker).run().catch(()=>{});failures++}
  }else clientEmailUnavailable++;
 }
 // Process any queued owner emails and other recent admin notifications on every run.
 try{
  const { deliverOwnerNotifications }=await import('@/lib/owner-notifications');
  await deliverOwnerNotifications();
 }catch{failures++}
 return Response.json({ok:true,reminders,clientPushSent,clientPushMissing,clientEmailSent,clientEmailUnavailable,ownerPushSent,ownerPushMissing,failures,removedCancelled});
}
