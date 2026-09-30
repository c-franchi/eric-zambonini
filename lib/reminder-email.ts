import { env } from 'cloudflare:workers';
import { notificationSettings } from '@/lib/owner-notifications';

const runtime=()=>env as unknown as Record<string,string|undefined>;

/** Send a client reminder only when the owner has configured a Resend sender. */
export async function sendClientReminderEmail(to:string,subject:string,text:string,idempotencyKey:string){
 const key=runtime().RESEND_API_KEY;
 const {from}=await notificationSettings();
 if(!key||!from||!to)return {sent:false,reason:'email_not_configured' as const};
 const response=await fetch('https://api.resend.com/emails',{
  method:'POST',
  headers:{authorization:`Bearer ${key}`,'content-type':'application/json','Idempotency-Key':idempotencyKey},
  body:JSON.stringify({from,to:[to],subject,text}),
 });
 if(!response.ok)throw new Error(`Resend HTTP ${response.status}`);
 return {sent:true,reason:null};
}
