import { env } from 'cloudflare:workers';
import { db } from '@/lib/server';
import { sendOwnerPush } from '@/lib/push';

const runtime=()=>env as unknown as Record<string,string|undefined>;
export type NotificationSettings={to:string;from:string};
export async function notificationSettings():Promise<NotificationSettings>{
 const row=await db().prepare("SELECT value FROM settings WHERE key='owner_email_notifications'").first<{value:string}>();
 if(!row)return {to:'',from:''};
 try{const value=JSON.parse(row.value);return {to:typeof value.to==='string'?value.to:'',from:typeof value.from==='string'?value.from:''}}catch{return {to:'',from:''}}
}
export function notificationInsert(database:ReturnType<typeof db>,kind:string,title:string,body:string,link:string){
 return database.prepare('INSERT INTO owner_notifications(id,kind,title,body,link,created_at) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),kind,title,body,link,new Date().toISOString());
}
export async function deliverOwnerNotifications(){
 const recent=(await db().prepare('SELECT id,title,body,link FROM owner_notifications WHERE created_at>? ORDER BY created_at DESC LIMIT 20').bind(new Date(Date.now()-86400000).toISOString()).all<{id:string;title:string;body:string;link:string}>()).results;
 await Promise.all(recent.map(item=>sendOwnerPush(item.id,item.title,item.body,item.link)));
 const key=runtime().RESEND_API_KEY;
 if(!key)return;
 const settings=await notificationSettings();
 if(!settings.to||!settings.from)return;
 const database=db();
 const cutoff=new Date(Date.now()-60_000).toISOString();
 const pending=await database.prepare("SELECT id,title,body,link FROM owner_notifications WHERE email_status='PENDING' AND email_attempts<5 AND (last_attempt_at IS NULL OR last_attempt_at<?) ORDER BY created_at LIMIT 5").bind(cutoff).all<{id:string;title:string;body:string;link:string}>();
 for(const item of pending.results){
  const claimed=await database.prepare("UPDATE owner_notifications SET email_attempts=email_attempts+1,last_attempt_at=? WHERE id=? AND email_status='PENDING' AND (last_attempt_at IS NULL OR last_attempt_at<?)").bind(new Date().toISOString(),item.id,cutoff).run();
  if(!claimed.meta.changes)continue;
  try{
   const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{'authorization':`Bearer ${key}`,'content-type':'application/json','Idempotency-Key':item.id},body:JSON.stringify({from:settings.from,to:[settings.to],subject:item.title,text:`${item.body}\n\nAcesse o painel: https://ericzambonini.com.br${item.link}`})});
   if(!response.ok)throw Error(`Resend HTTP ${response.status}`);
   await database.prepare("UPDATE owner_notifications SET email_status='SENT',email_error=NULL WHERE id=?").bind(item.id).run();
  }catch(error){await database.prepare('UPDATE owner_notifications SET email_error=? WHERE id=?').bind(String(error).slice(0,180),item.id).run()}
 }
}
