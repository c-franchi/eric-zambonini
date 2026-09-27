import { env } from 'cloudflare:workers';
import { db, ownerOnly, unavailable } from '@/lib/server';
import { ensureStoreSchema } from '@/lib/store-schema';

function parsePositive(value:FormDataEntryValue|null,max:number){if(typeof value!=='string'||!/^\d+$/.test(value))return null;const number=Number(value);return Number.isSafeInteger(number)&&number>=0&&number<=max?number:null}
function imageFile(value:FormDataEntryValue|null):value is File{return value instanceof File&&value.size>0}

export async function GET(){
  if(!await ownerOnly())return Response.json({error:'Acesso negado'},{status:403});
  try{
    await ensureStoreSchema();const database=db();
    const products=(await database.prepare('SELECT * FROM products ORDER BY active DESC,name').all()).results;
    const orders=(await database.prepare(`SELECT o.id,o.status,o.payment_status,o.total_cents,o.created_at,u.name AS customer_name,u.email,b.date,b.time,s.name AS service_name
      FROM product_orders o JOIN users u ON u.sub=o.user_sub JOIN bookings b ON b.id=o.booking_id JOIN services s ON s.id=b.service_id
      ORDER BY o.created_at DESC LIMIT 200`).all<{id:string;status:string;payment_status:string;total_cents:number;created_at:string;customer_name:string;email:string;date:string;time:string;service_name:string}>()).results;
    const ordersWithItems=await Promise.all(orders.map(async order=>({...order,items:(await database.prepare('SELECT product_name,unit_price_cents,quantity,is_preorder FROM product_order_items WHERE order_id=?').bind(order.id).all()).results})));
    return Response.json({products,orders:ordersWithItems},{headers:{'cache-control':'no-store'}});
  }catch{return unavailable()}
}

export async function POST(request:Request){
  if(!await ownerOnly())return Response.json({error:'Acesso negado'},{status:403});
  let form:FormData;try{form=await request.formData()}catch{return Response.json({error:'Formulário inválido.'},{status:400})}
  const name=form.get('name'),description=form.get('description'),price=parsePositive(form.get('price_cents'),100000000),stock=parsePositive(form.get('stock'),100000),allowPreorder=form.get('allow_preorder')==='true',file=form.get('image');
  if(typeof name!=='string'||!name.trim()||name.length>100||typeof description!=='string'||description.length>800||price===null||price<1||stock===null||file!==null&&file!==''&&(!imageFile(file)||file.size>8*1024*1024||!['image/jpeg','image/png','image/webp'].includes(file.type)))return Response.json({error:'Confira nome, descrição, preço, estoque e imagem (até 8 MB).'}, {status:400});
  const id=crypto.randomUUID(),now=new Date().toISOString(),key=imageFile(file)?`products/${id}`:null;
  try{
    await ensureStoreSchema();
    if(key){const bucket=(env as unknown as {BUCKET?:R2Bucket}).BUCKET;if(!bucket)return Response.json({error:'Armazenamento de imagens indisponível.'},{status:503});await bucket.put(key,await file.arrayBuffer(),{httpMetadata:{contentType:file.type}})}
    await db().prepare('INSERT INTO products(id,name,description,price_cents,stock,allow_preorder,image_key,active,created_at,updated_at) VALUES(?,?,?,?,?,?,?,1,?,?)').bind(id,name.trim(),description.trim(),price,stock,Number(allowPreorder),key,now,now).run();
    return Response.json({ok:true,id},{status:201});
  }catch{if(key)(env as unknown as {BUCKET?:R2Bucket}).BUCKET?.delete(key).catch(()=>{});return unavailable()}
}

export async function PATCH(request:Request){
  if(!await ownerOnly())return Response.json({error:'Acesso negado'},{status:403});
  let form:FormData;try{form=await request.formData()}catch{return Response.json({error:'Formulário inválido.'},{status:400})}
  const id=form.get('id'),name=form.get('name'),description=form.get('description'),price=parsePositive(form.get('price_cents'),100000000),stock=parsePositive(form.get('stock'),100000),allowPreorder=form.get('allow_preorder')==='true',active=form.get('active')!=='false',file=form.get('image');
  if(typeof id!=='string'||typeof name!=='string'||!name.trim()||name.length>100||typeof description!=='string'||description.length>800||price===null||price<1||stock===null||file!==null&&file!==''&&(!imageFile(file)||file.size>8*1024*1024||!['image/jpeg','image/png','image/webp'].includes(file.type)))return Response.json({error:'Confira os dados do produto.'},{status:400});
  try{
    await ensureStoreSchema();
    const database=db(),current=await database.prepare('SELECT image_key FROM products WHERE id=?').bind(id).first<{image_key:string|null}>();if(!current)return Response.json({error:'Produto não encontrado.'},{status:404});
    const bucket=(env as unknown as {BUCKET?:R2Bucket}).BUCKET;let key=current.image_key;
    if(imageFile(file)){if(!bucket)return Response.json({error:'Armazenamento de imagens indisponível.'},{status:503});key=`products/${id}-${crypto.randomUUID()}`;await bucket.put(key,await file.arrayBuffer(),{httpMetadata:{contentType:file.type}})}
    await database.prepare('UPDATE products SET name=?,description=?,price_cents=?,stock=?,allow_preorder=?,image_key=?,active=?,updated_at=? WHERE id=?').bind(name.trim(),description.trim(),price,stock,Number(allowPreorder),key,Number(active),new Date().toISOString(),id).run();
    if(key!==current.image_key&&current.image_key)await bucket?.delete(current.image_key).catch(()=>{});
    return Response.json({ok:true});
  }catch{return unavailable()}
}

export async function DELETE(request:Request){
  if(!await ownerOnly())return Response.json({error:'Acesso negado'},{status:403});
  let data:{id?:string};try{data=await request.json()}catch{return Response.json({error:'Dados inválidos'},{status:400})}
  if(!data.id)return Response.json({error:'Produto inválido'},{status:400});
  try{await ensureStoreSchema();await db().prepare('UPDATE products SET active=0,updated_at=? WHERE id=?').bind(new Date().toISOString(),data.id).run();return Response.json({ok:true})}catch{return unavailable()}
}
