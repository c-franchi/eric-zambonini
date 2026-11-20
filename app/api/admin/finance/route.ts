import {requireModule,readLicense} from '@/lib/licensing';
import {canUse} from '@/lib/plans';
import {db,ownerOnly,unavailable} from '@/lib/server';
import {getViewer} from '@/lib/auth';
import {validId,validDay,shortText,moneyCents} from '@/lib/management-values';
export async function GET(request:Request){
 const moduleDenied=await requireModule('financeiro');if(moduleDenied)return moduleDenied;
 if(!await ownerOnly())return Response.json({error:'Acesso negado'},{status:403});
 const month=new URL(request.url).searchParams.get('month');if(!month||!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))return Response.json({error:'Mês inválido'},{status:400});
 try{const d=db();const [summary,cash,totals,margins]=await Promise.all([
 d.prepare(`SELECT COUNT(*) AS total,SUM(CASE WHEN status<>'CANCELLED' AND payment_status='PAID' THEN price_cents ELSE 0 END) AS paid_cents,SUM(CASE WHEN status<>'CANCELLED' AND payment_status<>'PAID' THEN price_cents ELSE 0 END) AS pending_cents,SUM(CASE WHEN status='CANCELLED' THEN 1 ELSE 0 END) AS cancelled,SUM(CASE WHEN status<>'CANCELLED' AND payment_status='REVIEW' THEN 1 ELSE 0 END) AS receipts_to_review FROM bookings WHERE substr(date,1,7)=?`).bind(month).first(),
 d.prepare('SELECT * FROM cash_entries WHERE substr(date,1,7)=? ORDER BY date DESC,created_at DESC LIMIT 300').bind(month).all(),
 d.prepare(`SELECT COALESCE(SUM(CASE WHEN kind='IN' THEN amount_cents ELSE 0 END),0) AS income_cents,COALESCE(SUM(CASE WHEN kind='OUT' THEN amount_cents ELSE 0 END),0) AS expense_cents FROM cash_entries WHERE substr(date,1,7)=? AND voided_at IS NULL`).bind(month).first(),
 d.prepare(`SELECT c.id,b.name,b.date,s.name AS service_name,c.revenue_cents,COALESCE((SELECT SUM(ROUND(-m.quantity_milli*m.unit_cost_cents/1000.0)) FROM supply_movements m WHERE m.completion_id=c.id AND m.kind='SERVICE'),0) AS cost_cents FROM service_completions c JOIN bookings b ON b.id=c.booking_id JOIN services s ON s.id=b.service_id WHERE c.voided_at IS NULL AND substr(b.date,1,7)=? ORDER BY b.date DESC`).bind(month).all()]);
 return Response.json({...summary,entries:cash.results,...totals,margins:canUse((await readLicense()).plan,'insumos')?margins.results:[]},{headers:{'cache-control':'no-store'}})
 }catch{return unavailable()}
}
export async function POST(request:Request){
 const moduleDenied=await requireModule('financeiro');if(moduleDenied)return moduleDenied;
 if(!await ownerOnly())return Response.json({error:'Acesso negado'},{status:403});
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return Response.json({error:'Origem inválida'},{status:403});
 let v:Record<string,unknown>;try{v=await request.json();if(!v||typeof v!=='object')throw Error()}catch{return Response.json({error:'Dados inválidos'},{status:400})}
 if(!validId(v.id))return Response.json({error:'Identificador inválido'},{status:400});
 try{const d=db(),actor=(await getViewer())!.sub,now=new Date().toISOString();
 if(v.action==='void'){
  if(!shortText(v.note))return Response.json({error:'Informe o motivo.'},{status:400});
  const row=await d.prepare('SELECT source_key FROM cash_entries WHERE id=?').bind(v.id).first<{source_key:string|null}>();if(!row)return Response.json({error:'Lançamento não encontrado.'},{status:404});
  if(row.source_key)return Response.json({error:'Recebimento automático preservado. Para devolver dinheiro, registre uma saída na categoria Reembolso, com a referência do recebimento.'},{status:409});
  await d.prepare('UPDATE cash_entries SET voided_at=?,void_reason=? WHERE id=? AND voided_at IS NULL').bind(now,v.note.trim(),v.id).run();
 }else{
  const amount=moneyCents(v.amount);if(!['IN','OUT'].includes(String(v.kind))||amount===null||amount<=0||!validDay(v.date)||!shortText(v.category,80)||!shortText(v.note))return Response.json({error:'Confira tipo, valor, data, categoria e descrição.'},{status:400});
  const old=await d.prepare('SELECT kind,amount_cents,date,category,note FROM cash_entries WHERE id=?').bind(v.id).first<{kind:string;amount_cents:number;date:string;category:string;note:string}>();if(old&&(old.kind!==v.kind||old.amount_cents!==amount||old.date!==v.date||old.category!==v.category.trim()||old.note!==v.note.trim()))return Response.json({error:'Identificador já utilizado. Atualize a página.'},{status:409});
  await d.prepare('INSERT INTO cash_entries(id,kind,amount_cents,date,category,note,actor,created_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(v.id,v.kind,amount,v.date,v.category.trim(),v.note.trim(),actor,now).run();
 }return Response.json({ok:true});}catch{return unavailable()}
}
