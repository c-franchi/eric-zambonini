import {db,ownerOnly,unavailable} from '@/lib/server';
import {requireModule} from '@/lib/licensing';
import {getViewer} from '@/lib/auth';
import {validId,shortText,quantityMilli,moneyCents} from '@/lib/management-values';
export async function GET(){
 const moduleDenied=await requireModule('insumos');if(moduleDenied)return moduleDenied;
 if(!await ownerOnly())return Response.json({error:'Acesso negado'},{status:403});
 try{const d=db();const [supplies,recipes,services,bookings,movements]=await Promise.all([
 d.prepare('SELECT * FROM supplies ORDER BY name').all(),
 d.prepare('SELECT r.*,s.name,s.unit FROM service_supplies r JOIN supplies s ON s.id=r.supply_id ORDER BY s.name').all(),
 d.prepare('SELECT id,name FROM services WHERE active=1 ORDER BY name').all(),
 d.prepare(`SELECT b.id,b.name,b.date,b.time,b.service_id,b.price_cents,b.price_variable,b.status,s.name AS service_name,c.id AS completion_id,c.revenue_cents,(SELECT COALESCE(SUM(ROUND(-m.quantity_milli*m.unit_cost_cents/1000.0)),0) FROM supply_movements m WHERE m.completion_id=c.id AND m.kind='SERVICE') AS cost_cents FROM bookings b JOIN services s ON s.id=b.service_id LEFT JOIN service_completions c ON c.booking_id=b.id AND c.voided_at IS NULL WHERE b.status<>'CANCELLED' ORDER BY b.date DESC,b.time DESC LIMIT 200`).all(),
 d.prepare('SELECT m.*,s.name,s.unit FROM supply_movements m JOIN supplies s ON s.id=m.supply_id ORDER BY m.created_at DESC,m.id LIMIT 100').all()]);return Response.json({supplies:supplies.results,recipes:recipes.results,services:services.results,bookings:bookings.results,movements:movements.results},{headers:{'cache-control':'no-store'}})}catch{return unavailable()}
}
export async function POST(request:Request){
 const moduleDenied=await requireModule('insumos');if(moduleDenied)return moduleDenied;
 if(!await ownerOnly())return Response.json({error:'Acesso negado'},{status:403});
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return Response.json({error:'Origem inválida'},{status:403});
 let v:Record<string,unknown>;try{v=await request.json();if(!v||typeof v!=='object')throw Error()}catch{return Response.json({error:'Dados inválidos'},{status:400})}
 const bad=(error:string,status=400)=>Response.json({error},{status});
 try{const d=db(),actor=(await getViewer())!.sub,now=new Date().toISOString();
 if(v.action==='create'){
  const cost=moneyCents(v.cost),minimum=v.minimum==='0'?0:quantityMilli(v.minimum);
  if(!validId(v.id)||!shortText(v.name,100)||!['ml','g','un'].includes(String(v.unit))||cost===null||minimum===null)return bad('Confira nome, unidade, custo por unidade e estoque mínimo.');
  await d.prepare('INSERT INTO supplies(id,name,unit,unit_cost_cents,minimum_milli,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(v.id,v.name.trim(),v.unit,cost,minimum,now).run();
 }else if(v.action==='move'){
  const qty=quantityMilli(v.quantity),cost=moneyCents(v.cost);
  if(!validId(v.id)||!validId(v.supply_id)||qty===null||cost===null||!['PURCHASE','LOSS','ADJUST_IN','ADJUST_OUT'].includes(String(v.kind))||!shortText(v.note))return bad('Confira quantidade, custo e justificativa.');
  const delta=['LOSS','ADJUST_OUT'].includes(String(v.kind))?-qty:qty;
  const old=await d.prepare('SELECT supply_id,quantity_milli,kind,note,unit_cost_cents FROM supply_movements WHERE id=?').bind(v.id).first<{supply_id:string;quantity_milli:number;kind:string;note:string;unit_cost_cents:number}>();
  if(old&&(old.supply_id!==v.supply_id||old.quantity_milli!==delta||old.kind!==v.kind||old.note!==v.note.trim()||old.unit_cost_cents!==cost))return bad('Identificador já usado com outros dados. Atualize a página.',409);
  await d.prepare('INSERT INTO supply_movements(id,supply_id,quantity_milli,unit_cost_cents,kind,note,actor,created_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(v.id,v.supply_id,delta,cost,v.kind,v.note.trim(),actor,now).run();
 }else if(v.action==='recipe'){
  const qty=quantityMilli(v.quantity);if(!validId(v.service_id)||!validId(v.supply_id)||qty===null)return bad('Selecione serviço, insumo e quantidade.');
  await d.prepare('INSERT INTO service_supplies(id,service_id,supply_id,quantity_milli) VALUES(?,?,?,?) ON CONFLICT(service_id,supply_id) DO UPDATE SET quantity_milli=excluded.quantity_milli').bind(crypto.randomUUID(),v.service_id,v.supply_id,qty).run();
 }else if(v.action==='remove_recipe'){
  if(!validId(v.id))return bad('Receita inválida.');await d.prepare('DELETE FROM service_supplies WHERE id=?').bind(v.id).run();
 }else if(v.action==='complete'){
  if(!validId(v.id)||!validId(v.booking_id)||v.confirm!==true)return bad('Confirme o consumo antes de concluir.');
  const existing=await d.prepare('SELECT booking_id FROM service_completions WHERE id=?').bind(v.id).first<{booking_id:string}>();if(existing)return existing.booking_id===v.booking_id?Response.json({ok:true,replayed:true}):bad('Identificador já utilizado.',409);
  await d.prepare(`INSERT INTO service_completions(id,booking_id,revenue_cents,actor,created_at) SELECT ?,id,price_cents,?,? FROM bookings WHERE id=?`).bind(v.id,actor,now,v.booking_id).run();
  const saved=await d.prepare('SELECT id FROM service_completions WHERE id=?').bind(v.id).first();if(!saved)return bad('Atendimento não encontrado.',404);
 }else if(v.action==='undo'){
  if(!validId(v.id)||!shortText(v.note))return bad('Informe a justificativa do estorno.');
  await d.prepare('UPDATE service_completions SET voided_at=?,void_reason=?,actor=? WHERE id=? AND voided_at IS NULL').bind(now,v.note.trim(),actor,v.id).run();
 }else return bad('Ação inválida.');
 return Response.json({ok:true});
 }catch(error){const m=error instanceof Error?error.message:'';if(/insuficiente|conclusao|conclusão|UNIQUE|FOREIGN KEY|invalido/i.test(m))return bad('Não foi possível concluir: confira saldo dos insumos, data, valor definido e se o atendimento já foi concluído. Atualize a lista.',409);return unavailable()}
}
