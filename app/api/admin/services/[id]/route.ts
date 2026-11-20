import { db, ownerOnly, unavailable } from '@/lib/server';
import { validBlocks } from '@/lib/booking';
import { validServiceIcon } from '@/lib/service-icons';
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
  if(!await ownerOnly())return Response.json({error:'Acesso negado'},{status:403});
  const {id}=await params;let data:{name?:string;icon?:string;description?:string;duration_min?:number;price_cents?:number;price_variable?:boolean;active?:boolean;allow_in_person_payment?:boolean;interleaved_blocks?:unknown};
  try{data=await request.json()}catch{return Response.json({error:'Dados inválidos'},{status:400})}
  if(data.name!==undefined&&(!data.name.trim()||data.name.length>100)||data.icon!==undefined&&!validServiceIcon(data.icon)||data.description!==undefined&&data.description.length>500||data.duration_min!==undefined&&(!Number.isInteger(data.duration_min)||data.duration_min<15||data.duration_min>480||data.duration_min%15!==0)||data.price_cents!==undefined&&(!Number.isInteger(data.price_cents)||data.price_cents<0)||data.price_variable!==undefined&&typeof data.price_variable!=='boolean'||data.active!==undefined&&typeof data.active!=='boolean'||data.allow_in_person_payment!==undefined&&typeof data.allow_in_person_payment!=='boolean')return Response.json({error:'Dados inválidos'},{status:400});
  try{
    const database=db();const current=await database.prepare('SELECT * FROM services WHERE id=?').bind(id).first<{name:string;icon:string|null;description:string|null;duration_min:number;price_cents:number;price_variable:number;active:number;allow_in_person_payment:number;interleaved_blocks:string|null}>();if(!current)return Response.json({error:'Serviço não encontrado'},{status:404});
    const duration=data.duration_min??current.duration_min;
    if(data.interleaved_blocks!==undefined&&data.interleaved_blocks!==null&&!validBlocks(data.interleaved_blocks,duration))return Response.json({error:'Configure blocos de 15 minutos, cobrindo toda a duração e começando com um bloco ocupado.'},{status:400});
    const blocks=data.interleaved_blocks===undefined?current.interleaved_blocks:data.interleaved_blocks===null?null:JSON.stringify(data.interleaved_blocks);
    if(blocks&&!validBlocks(JSON.parse(blocks),duration))return Response.json({error:'Atualize os blocos ao mudar a duração.'},{status:400});
    if(duration!==current.duration_min||blocks!==current.interleaved_blocks){const future=await database.prepare("SELECT 1 FROM bookings WHERE service_id=? AND status<>'CANCELLED' AND date>=? LIMIT 1").bind(id,new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())).first();if(future)return Response.json({error:'Há reservas futuras deste serviço. Mantenha duração e blocos até concluí-las.'},{status:409})}
    const variable=data.price_variable===undefined?Boolean(current.price_variable):data.price_variable;
    await database.prepare('UPDATE services SET name=?,icon=?,description=?,duration_min=?,price_cents=?,price_variable=?,active=?,allow_in_person_payment=?,interleaved_blocks=? WHERE id=?').bind(data.name?.trim()??current.name,data.icon??current.icon,data.description?.trim()??current.description,duration,variable?0:data.price_cents??current.price_cents,Number(variable),data.active===undefined?current.active:Number(data.active),variable?1:data.allow_in_person_payment===undefined?current.allow_in_person_payment:Number(data.allow_in_person_payment),blocks,id).run();return Response.json({ok:true});
  }catch{return unavailable()}
}
