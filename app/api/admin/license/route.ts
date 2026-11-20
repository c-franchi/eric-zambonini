import {db,ownerOnly} from '@/lib/server';
import {getViewer} from '@/lib/auth';
import {isPlatformAdminEmail} from '@/lib/admin-access';
import {readLicense} from '@/lib/licensing';
import {isPlan,plans} from '@/lib/plans';
export async function GET(){
 if(!await ownerOnly())return Response.json({error:'Acesso negado'},{status:403});
 const viewer=await getViewer();
 try{return Response.json({...await readLicense(),canManage:Boolean(viewer&&isPlatformAdminEmail(viewer.email)),plans},{headers:{'cache-control':'no-store'}})}catch{return Response.json({error:'Não foi possível consultar o plano.'},{status:503})}
}
export async function PUT(request:Request){
 const viewer=await getViewer();
 if(!viewer||viewer.sub.startsWith('local:')||!isPlatformAdminEmail(viewer.email))return Response.json({error:'Somente a administração AgendaAÍ pode liberar planos.'},{status:403});
 if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'Origem inválida.'},{status:403});
 const data=await request.json().catch(()=>null) as {plan?:unknown;note?:unknown}|null;
 if(!data||!isPlan(data.plan)||typeof data.note!=='string'||data.note.trim().length<3||data.note.length>300)return Response.json({error:'Informe um plano válido e uma justificativa de 3 a 300 caracteres.'},{status:400});
 try{
  const database=db(),before=await readLicense(database),after={plan:data.plan,updatedAt:new Date().toISOString(),updatedBy:viewer.email};
  await database.batch([
   database.prepare("INSERT INTO settings(key,value) VALUES('installation_license',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(JSON.stringify(after)),
   database.prepare('INSERT INTO settings(key,value) VALUES(?,?)').bind(`license_audit:${crypto.randomUUID()}`,JSON.stringify({before,after,note:data.note.trim()})),
  ]);
  return Response.json({ok:true,...after});
 }catch{return Response.json({error:'Não foi possível alterar o plano.'},{status:503})}
}
