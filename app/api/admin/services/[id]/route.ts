import { db, ownerOnly, unavailable } from '@/lib/server';
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
  if(!await ownerOnly())return Response.json({error:'Acesso negado'},{status:403});
  const {id}=await params;let data:{name?:string;description?:string;duration_min?:number;price_cents?:number;active?:boolean};
  try{data=await request.json()}catch{return Response.json({error:'Dados inválidos'},{status:400})}
  if(data.name!==undefined&&(!data.name.trim()||data.name.length>100)||data.description!==undefined&&data.description.length>500||data.duration_min!==undefined&&(!Number.isInteger(data.duration_min)||data.duration_min<15||data.duration_min>480||data.duration_min%15!==0)||data.price_cents!==undefined&&(!Number.isInteger(data.price_cents)||data.price_cents<0)||data.active!==undefined&&typeof data.active!=='boolean')return Response.json({error:'Dados inválidos'},{status:400});
  try{
    const database=db();const current=await database.prepare('SELECT * FROM services WHERE id=?').bind(id).first<{name:string;description:string|null;duration_min:number;price_cents:number;active:number}>();if(!current)return Response.json({error:'Serviço não encontrado'},{status:404});
    if(data.duration_min!==undefined&&data.duration_min!==current.duration_min){const future=await database.prepare("SELECT 1 FROM bookings WHERE service_id=? AND status<>'CANCELLED' AND date>=date('now') LIMIT 1").bind(id).first();if(future)return Response.json({error:'Cancele ou conclua as reservas futuras antes de mudar a duração'},{status:409})}
    await database.prepare('UPDATE services SET name=?,description=?,duration_min=?,price_cents=?,active=? WHERE id=?').bind(data.name?.trim()??current.name,data.description?.trim()??current.description,data.duration_min??current.duration_min,data.price_cents??current.price_cents,data.active===undefined?current.active:Number(data.active),id).run();return Response.json({ok:true});
  }catch{return unavailable()}
}
