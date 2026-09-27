import { env } from 'cloudflare:workers';
import { db, ownerOnly, unavailable } from '@/lib/server';
import { ensureStoreSchema } from '@/lib/store-schema';

function parsePositive(value:FormDataEntryValue|null,max:number){if(typeof value!=='string'||!/^\d+$/.test(value))return null;const number=Number(value);return Number.isSafeInteger(number)&&number>=0&&number<=max?number:null}
function imageFile(value:FormDataEntryValue|null):value is File{return value instanceof File&&value.size>0}
function imageFiles(form:FormData){const files=form.getAll('images').filter(imageFile);const legacy=form.get('image');if(!files.length&&imageFile(legacy))files.push(legacy);return files}
function validImages(files:File[]){return files.length<=8&&files.every(file=>file.size<=8*1024*1024&&['image/jpeg','image/png','image/webp'].includes(file.type))&&files.reduce((total,file)=>total+file.size,0)<=32*1024*1024}

export async function GET(){
  if(!await ownerOnly())return Response.json({error:'Acesso negado'},{status:403});
  try{
    await ensureStoreSchema();const database=db();
    const products=(await database.prepare('SELECT * FROM products ORDER BY active DESC,name').all<{id:string;image_key:string|null;[key:string]:unknown}>()).results;
    const productsWithImages=await Promise.all(products.map(async product=>({...product,image_keys:(await database.prepare('SELECT image_key FROM product_images WHERE product_id=? ORDER BY sort_order').bind(product.id).all<{image_key:string}>()).results.map(row=>row.image_key)})));
    const orders=(await database.prepare(`SELECT o.id,o.status,o.payment_status,'APPOINTMENT' AS payment_method,o.total_cents,o.created_at,u.name AS customer_name,u.email,b.date,b.time,s.name AS service_name
      FROM product_orders o JOIN users u ON u.sub=o.user_sub JOIN bookings b ON b.id=o.booking_id JOIN services s ON s.id=b.service_id
      ORDER BY o.created_at DESC LIMIT 200`).all<{id:string;status:string;payment_status:string;payment_method:string;total_cents:number;created_at:string;customer_name:string;email:string;date:string;time:string;service_name:string}>()).results;
    const ordersWithItems=await Promise.all(orders.map(async order=>({...order,items:(await database.prepare('SELECT product_name,unit_price_cents,quantity,is_preorder FROM product_order_items WHERE order_id=?').bind(order.id).all()).results})));
    const sales=(await database.prepare(`SELECT id,status,payment_status,payment_method,total_cents,created_at,customer_name,customer_email AS email,customer_phone FROM product_sales ORDER BY created_at DESC LIMIT 200`).all<{id:string;status:string;payment_status:string;payment_method:string;total_cents:number;created_at:string;customer_name:string;email:string;customer_phone:string}>()).results;
    const salesWithItems=await Promise.all(sales.map(async order=>({...order,items:(await database.prepare('SELECT product_name,unit_price_cents,quantity,is_preorder FROM product_sale_items WHERE sale_id=?').bind(order.id).all()).results})));
    return Response.json({products:productsWithImages,orders:[...ordersWithItems,...salesWithItems].sort((a,b)=>b.created_at.localeCompare(a.created_at)).slice(0,200)},{headers:{'cache-control':'no-store'}});
  }catch{return unavailable()}
}

export async function POST(request:Request){
  if(!await ownerOnly())return Response.json({error:'Acesso negado'},{status:403});
  let form:FormData;try{form=await request.formData()}catch{return Response.json({error:'Formulário inválido.'},{status:400})}
  const name=form.get('name'),description=form.get('description'),price=parsePositive(form.get('price_cents'),100000000),stock=parsePositive(form.get('stock'),100000),allowPreorder=form.get('allow_preorder')==='true',files=imageFiles(form);
  if(typeof name!=='string'||!name.trim()||name.length>100||typeof description!=='string'||description.length>800||price===null||price<1||stock===null||!validImages(files))return Response.json({error:'Confira nome, descrição, preço, estoque e fotos (até 8 imagens de 8 MB cada, JPG, PNG ou WebP).'}, {status:400});
  const id=crypto.randomUUID(),now=new Date().toISOString(),keys=files.map(()=>`products/${id}-${crypto.randomUUID()}`),key=keys[0]||null;
  try{
    await ensureStoreSchema();
    const bucket=(env as unknown as {BUCKET?:R2Bucket}).BUCKET;if(files.length&&!bucket)return Response.json({error:'Armazenamento de imagens indisponível.'},{status:503});
    await Promise.all(files.map((file,index)=>bucket!.put(keys[index],file.stream(),{httpMetadata:{contentType:file.type}})));
    const database=db();await database.batch([
      database.prepare('INSERT INTO products(id,name,description,price_cents,stock,allow_preorder,image_key,active,created_at,updated_at) VALUES(?,?,?,?,?,?,?,1,?,?)').bind(id,name.trim(),description.trim(),price,stock,Number(allowPreorder),key,now,now),
      ...keys.map((imageKey,index)=>database.prepare('INSERT INTO product_images(id,product_id,image_key,sort_order,created_at) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),id,imageKey,index,now)),
    ]);
    return Response.json({ok:true,id},{status:201});
  }catch{await Promise.all(keys.map(key=> (env as unknown as {BUCKET?:R2Bucket}).BUCKET?.delete(key).catch(()=>{})));return unavailable()}
}

export async function PATCH(request:Request){
  if(!await ownerOnly())return Response.json({error:'Acesso negado'},{status:403});
  let form:FormData;try{form=await request.formData()}catch{return Response.json({error:'Formulário inválido.'},{status:400})}
  const id=form.get('id'),name=form.get('name'),description=form.get('description'),price=parsePositive(form.get('price_cents'),100000000),stock=parsePositive(form.get('stock'),100000),allowPreorder=form.get('allow_preorder')==='true',active=form.get('active')!=='false',files=imageFiles(form);
  if(typeof id!=='string'||typeof name!=='string'||!name.trim()||name.length>100||typeof description!=='string'||description.length>800||price===null||price<1||stock===null||!validImages(files))return Response.json({error:'Confira os dados do produto e as fotos selecionadas.'},{status:400});
  let stagedKeys:string[]=[];
  try{
    await ensureStoreSchema();
    const database=db(),current=await database.prepare('SELECT image_key FROM products WHERE id=?').bind(id).first<{image_key:string|null}>();if(!current)return Response.json({error:'Produto não encontrado.'},{status:404});
    const bucket=(env as unknown as {BUCKET?:R2Bucket}).BUCKET,oldKeys=(await database.prepare('SELECT image_key FROM product_images WHERE product_id=?').bind(id).all<{image_key:string}>()).results.map(row=>row.image_key);let keys=oldKeys.length?oldKeys:current.image_key?[current.image_key]:[];
    if(files.length){if(!bucket)return Response.json({error:'Armazenamento de imagens indisponível.'},{status:503});keys=files.map(()=>`products/${id}-${crypto.randomUUID()}`);stagedKeys=keys;await Promise.all(files.map((file,index)=>bucket.put(keys[index],file.stream(),{httpMetadata:{contentType:file.type}})))}
    const now=new Date().toISOString();
    await database.batch([
      database.prepare('UPDATE products SET name=?,description=?,price_cents=?,stock=?,allow_preorder=?,image_key=?,active=?,updated_at=? WHERE id=?').bind(name.trim(),description.trim(),price,stock,Number(allowPreorder),keys[0]||null,Number(active),now,id),
      ...(files.length?[database.prepare('DELETE FROM product_images WHERE product_id=?').bind(id),...keys.map((imageKey,index)=>database.prepare('INSERT INTO product_images(id,product_id,image_key,sort_order,created_at) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),id,imageKey,index,now))]:[]),
    ]);
    if(files.length){await Promise.all(oldKeys.map(key=>bucket?.delete(key).catch(()=>{})));stagedKeys=[]}
    return Response.json({ok:true});
  }catch{await Promise.all(stagedKeys.map(key=>(env as unknown as {BUCKET?:R2Bucket}).BUCKET?.delete(key).catch(()=>{})));return unavailable()}
}

export async function DELETE(request:Request){
  if(!await ownerOnly())return Response.json({error:'Acesso negado'},{status:403});
  let data:{id?:string};try{data=await request.json()}catch{return Response.json({error:'Dados inválidos'},{status:400})}
  if(!data.id)return Response.json({error:'Produto inválido'},{status:400});
  try{await ensureStoreSchema();await db().prepare('UPDATE products SET active=0,updated_at=? WHERE id=?').bind(new Date().toISOString(),data.id).run();return Response.json({ok:true})}catch{return unavailable()}
}
