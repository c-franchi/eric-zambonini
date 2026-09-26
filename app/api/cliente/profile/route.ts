import { getViewer } from '@/lib/auth';
import { db, unavailable } from '@/lib/server';
export async function GET() {
  const viewer=await getViewer();if(!viewer)return Response.json({error:'Entre com Google'},{status:401});
  try { const database=db();const user=await database.prepare('SELECT name,email,phone FROM users WHERE sub=?').bind(viewer.sub).first<{name:string;email:string;phone:string|null}>();const previous=user?.phone?null:await database.prepare("SELECT phone FROM bookings WHERE user_sub=? AND phone<>'' ORDER BY created_at DESC LIMIT 1").bind(viewer.sub).first<{phone:string}>();return Response.json(user?{...user,phone:user.phone||previous?.phone||''}:{name:viewer.name,email:viewer.email,phone:previous?.phone||''}); } catch { return unavailable(); }
}
export async function PATCH(request:Request) {
  const viewer=await getViewer();if(!viewer)return Response.json({error:'Entre com Google'},{status:401});
  let data:{name?:string;phone?:string};try{data=await request.json()}catch{return Response.json({error:'Dados inválidos'},{status:400})}
  if(!data.name?.trim()||data.name.length>100||data.phone&& !/^\+?[\d()\s-]{8,20}$/.test(data.phone))return Response.json({error:'Confira nome e telefone'},{status:400});
  try{await db().prepare('UPDATE users SET name=?,phone=? WHERE sub=?').bind(data.name.trim(),data.phone?.trim()||null,viewer.sub).run();return Response.json({ok:true})}catch{return unavailable()}
}
