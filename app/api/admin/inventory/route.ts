import { db, ownerOnly, unavailable } from '@/lib/server';
import { getViewer } from '@/lib/auth';
import { inventoryStatements, operationPayload, validInventoryOperation } from '@/lib/inventory-operations';
export async function GET(){
 if(!await ownerOnly())return Response.json({error:'Acesso negado'},{status:403});
 try{
  const database=db();const [products,movements]=await Promise.all([
   database.prepare('SELECT id,name,stock,minimum_stock,unit_cost_cents,price_cents,active FROM products ORDER BY active DESC,name').all(),
   database.prepare('SELECT m.*,p.name AS product_name FROM stock_movements m JOIN products p ON p.id=m.product_id ORDER BY m.created_at DESC,m.id DESC LIMIT 100').all(),
  ]);
  return Response.json({products:products.results,movements:movements.results},{headers:{'cache-control':'no-store'}});
 }catch{return unavailable()}
}
export async function POST(request:Request){
 if(!await ownerOnly())return Response.json({error:'Acesso negado'},{status:403});
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return Response.json({error:'Origem não autorizada'},{status:403});
 let value:unknown;try{value=await request.json()}catch{return Response.json({error:'Dados inválidos'},{status:400})}
 if(!validInventoryOperation(value))return Response.json({error:'Confira produto, quantidade inteira, custo e justificativa (3 a 300 caracteres).'},{status:400});
 try{
  const database=db(),viewer=await getViewer();if(!viewer)return Response.json({error:'Sessão expirada'},{status:401});
  const product=await database.prepare('SELECT id FROM products WHERE id=?').bind(value.product_id).first();if(!product)return Response.json({error:'Produto não encontrado'},{status:404});
  const payload=operationPayload(value),existing=await database.prepare('SELECT payload,applied FROM inventory_operations WHERE request_key=?').bind(value.request_key).first<{payload:string;applied:number}>();
  if(existing&&existing.payload!==payload)return Response.json({error:'Esta operação já foi usada com outros dados. Inicie uma nova movimentação.'},{status:409});
  if(existing?.applied)return Response.json({ok:true,replayed:true});
  await database.batch(inventoryStatements(database,value,viewer.sub,new Date().toISOString()));
  const saved=await database.prepare('SELECT payload,applied FROM inventory_operations WHERE request_key=?').bind(value.request_key).first<{payload:string;applied:number}>();
  if(!saved?.applied||saved.payload!==payload)return Response.json({error:'Operação concorrente; atualize a lista.'},{status:409});
  return Response.json({ok:true});
 }catch(error){if(error instanceof Error&&/Estoque insuficiente|constraint/i.test(error.message))return Response.json({error:'Estoque insuficiente ou alterado por outro pedido. Atualize e confira a quantidade.'},{status:409});return unavailable()}
}
