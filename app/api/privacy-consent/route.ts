import { db, unavailable } from '@/lib/server';
import { getViewer } from '@/lib/auth';
const validId=(value:unknown)=>typeof value==='string'&&/^[0-9a-f-]{36}$/i.test(value);
export async function POST(request:Request){
 if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'Origem inválida.'},{status:403});
 let body:{visitorId?:unknown;action?:unknown;privacyVersion?:unknown;termsVersion?:unknown};
 try{body=await request.json()}catch{return Response.json({error:'Dados inválidos.'},{status:400})}
 if(!validId(body.visitorId)||!['notice_acknowledged','push_opt_in','push_opt_out'].includes(String(body.action))||body.privacyVersion!=='2026-09-26')return Response.json({error:'Registro inválido.'},{status:400});
 const viewer=await getViewer();
 if(String(body.action).startsWith('push_')&&!viewer)return Response.json({error:'Entre na conta para registrar a preferência.'},{status:401});
 const record={action:body.action,privacyVersion:typeof body.privacyVersion==='string'?body.privacyVersion:null,termsVersion:typeof body.termsVersion==='string'?body.termsVersion:null,acceptedAt:new Date().toISOString(),subject:viewer?.sub||null};
 try{
  const key=body.action==='notice_acknowledged'?`privacy_notice:${body.visitorId}`:`push_consent:${viewer!.sub}`;
  await db().prepare('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(key,JSON.stringify(record)).run();
  return Response.json({ok:true},{headers:{'cache-control':'no-store'}});
 }catch{return unavailable()}
}
