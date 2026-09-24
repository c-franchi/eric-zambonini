import { getViewer } from '@/lib/auth';
import { db, unavailable } from '@/lib/server';
export async function GET() {
  const viewer=await getViewer();if(!viewer)return Response.json({error:'Entre com Google'},{status:401});
  try { const user=await db().prepare('SELECT name,email,phone FROM users WHERE sub=?').bind(viewer.sub).first();return Response.json(user||{name:viewer.name,email:viewer.email,phone:''}); } catch { return unavailable(); }
}
export async function PATCH(request:Request) {
  const viewer=await getViewer();if(!viewer)return Response.json({error:'Entre com Google'},{status:401});
  let data:{name?:string;phone?:string};try{data=await request.json()}catch{return Response.json({error:'Dados inválidos'},{status:400})}
  if(!data.name?.trim()||data.name.length>100||data.phone&& !/^\+?[\d()\s-]{8,20}$/.test(data.phone))return Response.json({error:'Confira nome e telefone'},{status:400});
  try{await db().prepare('UPDATE users SET name=?,phone=? WHERE sub=?').bind(data.name.trim(),data.phone?.trim()||null,viewer.sub).run();return Response.json({ok:true})}catch{return unavailable()}
}
