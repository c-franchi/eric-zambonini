import { env } from 'cloudflare:workers';
import { Webhook } from 'svix';
import { db } from '@/lib/server';

export async function POST(request:Request){
 const secret=(env as unknown as Record<string,string|undefined>).RESEND_WEBHOOK_SECRET;
 if(!secret)return Response.json({error:'Webhook não configurado'},{status:503});
 const raw=await request.text();
 let event:{type?:string;data?:{email_id?:string;bounce?:{message?:string}}};
 try{new Webhook(secret).verify(raw,{
  'svix-id':request.headers.get('svix-id')||'',
  'svix-timestamp':request.headers.get('svix-timestamp')||'',
  'svix-signature':request.headers.get('svix-signature')||'',
 });event=JSON.parse(raw)}catch{return Response.json({error:'Assinatura inválida'},{status:400})}
 const id=event.data?.email_id;
 if(id&&id.length<150){
  const state:Record<string,string>={'email.delivered':'DELIVERED','email.bounced':'BOUNCED','email.failed':'FAILED','email.delivery_delayed':'DELAYED'};
  if(event.type&&state[event.type])await db().prepare('UPDATE owner_notifications SET email_status=?,email_error=? WHERE email_provider_id=?').bind(state[event.type],event.type==='email.bounced'?event.data?.bounce?.message?.slice(0,180)||'Destinatário rejeitado':event.type==='email.failed'?'Falha na entrega':null,id).run();
 }
 return Response.json({ok:true});
}
