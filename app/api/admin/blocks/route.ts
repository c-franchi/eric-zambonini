import { db, ownerOnly, unavailable } from '@/lib/server';
import { slotsFor, validDate } from '@/lib/booking';
const timePattern=/^([01]\d|2[0-3]):(00|15|30|45)$/;
export async function GET(request:Request){
  if(!await ownerOnly())return Response.json({error:'Acesso negado'},{status:403});
  const date=new URL(request.url).searchParams.get('date');
  if(!date||!validDate(date))return Response.json({error:'Data inválida'},{status:400});
  try{return Response.json((await db().prepare('SELECT slot, reason FROM blocked_slots WHERE date = ? ORDER BY slot').bind(date).all()).results)}catch{return unavailable()}
}
export async function POST(request:Request){
  if(!await ownerOnly())return Response.json({error:'Acesso negado'},{status:403});
  let data:{date?:string;start?:string;end?:string;reason?:string};
  try{data=await request.json()}catch{return Response.json({error:'Dados inválidos'},{status:400})}
  if(!data.date||!validDate(data.date)||!data.start||!timePattern.test(data.start)||!data.end||!timePattern.test(data.end)||data.end<=data.start||data.reason&&data.reason.length>200)return Response.json({error:'Confira data e intervalo'},{status:400});
  const minutes=(t:string)=>Number(t.slice(0,2))*60+Number(t.slice(3));
  const duration=minutes(data.end)-minutes(data.start);
  if(duration>720)return Response.json({error:'Intervalo muito longo'},{status:400});
  const slots=slotsFor(data.start,duration);
  try{const database=db();await database.batch(slots.map(slot=>database.prepare('INSERT INTO blocked_slots (date,slot,reason) SELECT ?,?,? WHERE NOT EXISTS (SELECT 1 FROM booked_slots WHERE date=? AND slot=?)').bind(data.date,slot,data.reason?.trim()||null,data.date,slot)));return Response.json({ok:true,excluded:'Horários já reservados não foram bloqueados.'})}catch{return unavailable()}
}
export async function DELETE(request:Request){
  if(!await ownerOnly())return Response.json({error:'Acesso negado'},{status:403});
  let data:{date?:string;slot?:string};try{data=await request.json()}catch{return Response.json({error:'Dados inválidos'},{status:400})}
  if(!data.date||!validDate(data.date)||!data.slot||!timePattern.test(data.slot))return Response.json({error:'Dados inválidos'},{status:400});
  try{await db().prepare('DELETE FROM blocked_slots WHERE date=? AND slot=?').bind(data.date,data.slot).run();return Response.json({ok:true})}catch{return unavailable()}
}
