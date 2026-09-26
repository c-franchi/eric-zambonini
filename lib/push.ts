import { env } from 'cloudflare:workers';
import { buildPushPayload, type PushSubscription } from '@block65/webcrypto-web-push';
import { db } from '@/lib/server';
import { isAdminEmail } from '@/lib/admin-access';

const config=()=>env as unknown as Record<string,string|undefined>;
export const pushPublicKey=()=>config().VAPID_PUBLIC_KEY||'';
export async function sendPush(userSub:string,id:string,title:string,body:string,path:string){
 const {VAPID_PUBLIC_KEY:publicKey,VAPID_PRIVATE_KEY:privateKey,VAPID_SUBJECT:subject}=config();
 if(!publicKey||!privateKey||!subject)return;
 const database=db();
 const subscriptions=(await database.prepare('SELECT endpoint,p256dh,auth FROM push_subscriptions WHERE user_sub=?').bind(userSub).all<{endpoint:string;p256dh:string;auth:string}>()).results;
 for(const sub of subscriptions){
  const deliveryId=`${id}:${await sha256(sub.endpoint)}`;
  const claimed=await database.prepare('INSERT OR IGNORE INTO push_deliveries(id,endpoint,created_at) VALUES(?,?,?)').bind(deliveryId,sub.endpoint,new Date().toISOString()).run();
  if(!claimed.meta.changes)continue;
  try{
   const subscription:PushSubscription={endpoint:sub.endpoint,expirationTime:null,keys:{p256dh:sub.p256dh,auth:sub.auth}};
   const payload=await buildPushPayload({data:JSON.stringify({title,body,url:path}),options:{ttl:86400}},subscription,{publicKey,privateKey,subject});
   const response=await fetch(sub.endpoint,payload);
   if(response.status===404||response.status===410)await database.prepare('DELETE FROM push_subscriptions WHERE endpoint=?').bind(sub.endpoint).run();
   else if(!response.ok)throw Error(`Push ${response.status}`);
  }catch{await database.prepare('DELETE FROM push_deliveries WHERE id=?').bind(deliveryId).run()}
 }
}
async function sha256(value:string){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return [...new Uint8Array(bytes)].map(byte=>byte.toString(16).padStart(2,'0')).join('')}
export async function sendOwnerPush(id:string,title:string,body:string,path:string){
 try{const users=(await db().prepare('SELECT sub,email FROM users').all<{sub:string;email:string}>()).results.filter(user=>!user.sub.startsWith('local:')&&isAdminEmail(user.email));await Promise.all(users.map(user=>sendPush(user.sub,id,title,body,path)))}catch{}
}
