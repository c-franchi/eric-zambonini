import { env } from 'cloudflare:workers';
import { db, ownerOnly, unavailable } from '@/lib/server';
import { deliverOwnerNotifications, notificationSettings } from '@/lib/owner-notifications';
export async function GET(request:Request){
 if(!await ownerOnly())return Response.json({error:'Acesso negado'},{status:403});
 try{
  await deliverOwnerNotifications().catch(()=>{});
  const database=db();
  const url=new URL(request.url),all=url.searchParams.get('all')==='1',rawOffset=Number(url.searchParams.get('offset')||0);
  if(!Number.isInteger(rawOffset)||rawOffset<0||rawOffset>10000)return Response.json({error:'Página inválida'},{status:400});
  const limit=all?50:30,offset=all?rawOffset:0;
  const [items,unread,allCount,readCount,pending,settings]=await Promise.all([
   database.prepare('SELECT id,kind,title,body,link,created_at,read_at,email_status,email_error FROM owner_notifications ORDER BY created_at DESC LIMIT ? OFFSET ?').bind(limit,offset).all(),
   database.prepare('SELECT COUNT(*) AS total FROM owner_notifications WHERE read_at IS NULL').first<{total:number}>(),
   database.prepare('SELECT COUNT(*) AS total FROM owner_notifications').first<{total:number}>(),
   database.prepare('SELECT COUNT(*) AS total FROM owner_notifications WHERE read_at IS NOT NULL').first<{total:number}>(),
   database.prepare("SELECT COUNT(*) AS total FROM owner_notifications WHERE email_status='PENDING'").first<{total:number}>(),
   notificationSettings(),
  ]);
  const apiKeyConfigured=Boolean((env as unknown as Record<string,string|undefined>).RESEND_API_KEY);
  const webhookConfigured=Boolean((env as unknown as Record<string,string|undefined>).RESEND_WEBHOOK_SECRET);
  return Response.json({items:items.results,unread:unread?.total||0,total:allCount?.total||0,readCount:readCount?.total||0,hasMore:offset+items.results.length<(allCount?.total||0),pendingEmails:pending?.total||0,settings,apiKeyConfigured,webhookConfigured},{headers:{'cache-control':'no-store'}});
 }catch{return unavailable()}
}
export async function PATCH(request:Request){
 if(!await ownerOnly())return Response.json({error:'Acesso negado'},{status:403});
 if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'Origem inválida'},{status:403});
 let data:{id?:string;all?:boolean};try{data=await request.json()}catch{return Response.json({error:'Dados inválidos'},{status:400})}
 if(!data.all&&!data.id)return Response.json({error:'Aviso inválido'},{status:400});
 try{const database=db();const stamp=new Date().toISOString();if(data.all)await database.prepare('UPDATE owner_notifications SET read_at=? WHERE read_at IS NULL').bind(stamp).run();else await database.prepare('UPDATE owner_notifications SET read_at=? WHERE id=? AND read_at IS NULL').bind(stamp,data.id).run();return Response.json({ok:true})}catch{return unavailable()}
}
export async function DELETE(request:Request){
 if(!await ownerOnly())return Response.json({error:'Acesso negado'},{status:403});
 if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'Origem inválida'},{status:403});
 let data:{ids?:string[];read?:boolean};try{data=await request.json()}catch{return Response.json({error:'Dados inválidos'},{status:400})}
 if(data.read!==true&&(!Array.isArray(data.ids)||data.ids.length<1||data.ids.length>100||data.ids.some(id=>typeof id!=='string'||id.length>100)))return Response.json({error:'Selecione pelo menos um aviso válido.'},{status:400});
 try{
  const database=db();
  if(data.read===true){const result=await database.prepare('DELETE FROM owner_notifications WHERE read_at IS NOT NULL').run();return Response.json({ok:true,deleted:result.meta.changes||0})}
  const ids=[...new Set(data.ids!)],placeholders=ids.map(()=>'?').join(',');
  const result=await database.prepare(`DELETE FROM owner_notifications WHERE id IN (${placeholders})`).bind(...ids).run();
  return Response.json({ok:true,deleted:result.meta.changes||0});
 }catch{return unavailable()}
}
export async function PUT(request:Request){
 if(!await ownerOnly())return Response.json({error:'Acesso negado'},{status:403});
 if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'Origem inválida'},{status:403});
 let data:{to?:string;from?:string};try{data=await request.json()}catch{return Response.json({error:'Dados inválidos'},{status:400})}
 const to=data.to?.trim()||'',from=data.from?.trim()||'';
 const email=/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
 const sender=from.match(/^(?:[^<>]{1,80}\s<)?([^\s@<>]+@[^\s@<>]+\.[^\s@<>]+)>?$/)?.[1]||'';
 if((to||from)&&(!email.test(to)||!email.test(sender))||to.length>254||from.length>254)return Response.json({error:'Informe o e-mail de destino e o remetente de um domínio verificado no Resend.'},{status:400});
 try{const database=db();await database.batch([database.prepare("INSERT INTO settings(key,value) VALUES('owner_email_notifications',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(JSON.stringify({to,from})),database.prepare("UPDATE owner_notifications SET email_attempts=0,last_attempt_at=NULL,email_error=NULL WHERE email_status='PENDING'")]);await deliverOwnerNotifications().catch(()=>{});return Response.json({ok:true})}catch{return unavailable()}
}
