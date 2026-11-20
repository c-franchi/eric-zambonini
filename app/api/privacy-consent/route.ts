import { db, unavailable } from '@/lib/server';
import { getViewer } from '@/lib/auth';
export async function POST(request:Request){
 if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'Origem inválida.'},{status:403});
 let body:{action?:unknown;privacyVersion?:unknown};
 try{body=await request.json()}catch{return Response.json({error:'Dados inválidos.'},{status:400})}
 if(!['push_opt_in','push_opt_out'].includes(String(body.action))||body.privacyVersion!=='2026-09-26')return Response.json({error:'Registro inválido.'},{status:400});
 const viewer=await getViewer();
 if(!viewer)return Response.json({error:'Entre na conta para registrar a preferência.'},{status:401});
 const record={action:body.action,privacyVersion:body.privacyVersion,updatedAt:new Date().toISOString(),subject:viewer.sub};
 try{
  const key=`push_consent:${viewer.sub}`;
  await db().prepare('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(key,JSON.stringify(record)).run();
  return Response.json({ok:true},{headers:{'cache-control':'no-store'}});
 }catch{return unavailable()}
}
