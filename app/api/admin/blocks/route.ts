import { db, ownerOnly, unavailable } from '@/lib/server';
import { slotsFor, validDate } from '@/lib/booking';
const timePattern=/^([01]\d|2[0-3]):(00|15|30|45)$/;
export async function GET(request:Request){
  if(!await ownerOnly())return Response.json({error:'Acesso negado'},{status:403});
  const date=new URL(request.url).searchParams.get('date');
  if(!date||!validDate(date))return Response.json({error:'Data inválida'},{status:400});
  try{return Response.json((await db().prepare('SELECT slot, reason FROM blocked_slots WHERE date = ? ORDER BY slot').bind(date).all()).results,{headers:{'cache-control':'no-store'}})}catch{return unavailable()}
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
  try{const database=db();await database.batch(slots.map(slot=>database.prepare('INSERT OR IGNORE INTO blocked_slots (date,slot,reason) SELECT ?,?,? WHERE NOT EXISTS (SELECT 1 FROM booked_slots WHERE date=? AND slot=?)').bind(data.date,slot,data.reason?.trim()||null,data.date,slot)));return Response.json({ok:true,excluded:'Horários já reservados não foram bloqueados.'})}catch{return unavailable()}
}
export async function PUT(request:Request){
  if(!await ownerOnly())return Response.json({error:'Acesso negado'},{status:403});
  let data:{date?:string;start?:string;end?:string;oldSlots?:string[]};try{data=await request.json()}catch{return Response.json({error:'Dados inválidos'},{status:400})}
  if(!data.date||!validDate(data.date)||!data.start||!timePattern.test(data.start)||!data.end||!timePattern.test(data.end)||data.end<=data.start||!Array.isArray(data.oldSlots)||!data.oldSlots.length||data.oldSlots.length>48||data.oldSlots.some(slot=>typeof slot!=='string'||!timePattern.test(slot)))return Response.json({error:'Confira data e intervalo do bloqueio.'},{status:400});
  const minutes=(t:string)=>Number(t.slice(0,2))*60+Number(t.slice(3));
  const duration=minutes(data.end)-minutes(data.start);if(duration>720)return Response.json({error:'Intervalo muito longo.'},{status:400});
  const oldSlots=[...new Set(data.oldSlots)].sort();
  try{
    const database=db(),existing=await database.prepare(`SELECT slot FROM blocked_slots WHERE date=? AND slot IN (${oldSlots.map(()=>'?').join(',')})`).bind(data.date,...oldSlots).all<{slot:string}>();
    if(existing.results.length!==oldSlots.length)return Response.json({error:'O bloqueio mudou. Atualize a página e tente novamente.'},{status:409});
    const newSlots=slotsFor(data.start,duration),reserved=await database.prepare(`SELECT slot FROM booked_slots WHERE date=? AND slot IN (${newSlots.map(()=>'?').join(',')})`).bind(data.date,...newSlots).all<{slot:string}>();
    if(reserved.results.length)return Response.json({error:'O novo intervalo inclui um horário já reservado. Escolha outro.'},{status:409});
    await database.batch([
      ...oldSlots.map(slot=>database.prepare('DELETE FROM blocked_slots WHERE date=? AND slot=?').bind(data.date,slot)),
      ...newSlots.map(slot=>database.prepare('INSERT OR IGNORE INTO blocked_slots(date,slot,reason) VALUES(?,?,NULL)').bind(data.date,slot)),
    ]);
    return Response.json({ok:true});
  }catch{return unavailable()}
}
export async function DELETE(request:Request){
  if(!await ownerOnly())return Response.json({error:'Acesso negado'},{status:403});
  let data:{date?:string;slot?:string;slots?:string[]};try{data=await request.json()}catch{return Response.json({error:'Dados inválidos'},{status:400})}
  const slots=data.slots?.length?data.slots:data.slot?[data.slot]:[];
  if(!data.date||!validDate(data.date)||!slots.length||slots.length>48||slots.some(slot=>typeof slot!=='string'||!timePattern.test(slot)))return Response.json({error:'Dados inválidos'},{status:400});
  try{await db().batch([...new Set(slots)].map(slot=>db().prepare('DELETE FROM blocked_slots WHERE date=? AND slot=?').bind(data.date,slot)));return Response.json({ok:true})}catch{return unavailable()}
}
