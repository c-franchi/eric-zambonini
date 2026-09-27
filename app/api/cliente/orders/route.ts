import { waitUntil } from 'cloudflare:workers';
import { getViewer } from '@/lib/auth';
import { db, unavailable } from '@/lib/server';
import { ensureStoreSchema } from '@/lib/store-schema';
import { notificationInsert, deliverOwnerNotifications } from '@/lib/owner-notifications';
import { currentPixSettings, pixPayload } from '@/lib/pix';

type RequestedItem={product_id:string;quantity:number};
type Product={id:string;name:string;price_cents:number;stock:number;allow_preorder:number};
type Reserved={product:Product;quantity:number;preorder:boolean};
const money=(cents:number)=>(cents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});

export async function GET(){
  const viewer=await getViewer();if(!viewer)return Response.json({error:'Entre na sua conta para consultar pedidos.'},{status:401});
  try{
    await ensureStoreSchema();const database=db();
    const [sales,legacy]=await Promise.all([
      database.prepare('SELECT id,status,payment_status,payment_method,total_cents,created_at,customer_name,customer_email,customer_phone FROM product_sales WHERE user_sub=? ORDER BY created_at DESC LIMIT 50').bind(viewer.sub).all<Record<string,unknown>>(),
      database.prepare(`SELECT o.id,o.status,o.payment_status,'APPOINTMENT' AS payment_method,o.total_cents,o.created_at,b.date,b.time,s.name AS service_name FROM product_orders o JOIN bookings b ON b.id=o.booking_id JOIN services s ON s.id=b.service_id WHERE o.user_sub=? ORDER BY o.created_at DESC LIMIT 50`).bind(viewer.sub).all<Record<string,unknown>>(),
    ]);
    const salesWithItems=await Promise.all(sales.results.map(async order=>({...order,items:(await database.prepare('SELECT product_name,unit_price_cents,quantity,is_preorder FROM product_sale_items WHERE sale_id=?').bind(order.id).all()).results})));
    const legacyWithItems=await Promise.all(legacy.results.map(async order=>({...order,items:(await database.prepare('SELECT product_name,unit_price_cents,quantity,is_preorder FROM product_order_items WHERE order_id=?').bind(order.id).all()).results})));
    return Response.json([...salesWithItems,...legacyWithItems].sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at))),{headers:{'cache-control':'no-store'}});
  }catch{return unavailable()}
}

export async function POST(request:Request){
  const viewer=await getViewer();
  let data:{request_id?:string;items?:RequestedItem[];payment_method?:string;customer_name?:string;customer_email?:string;customer_phone?:string};try{data=await request.json()}catch{return Response.json({error:'Dados inválidos.'},{status:400})}
  if(!data.request_id||!/^[\da-f-]{36}$/i.test(data.request_id)||!Array.isArray(data.items)||data.items.length<1||data.items.length>20||!['PIX','PICKUP'].includes(data.payment_method||''))return Response.json({error:'Confira o pedido e a forma de pagamento.'},{status:400});
  const customerName=(data.customer_name||viewer?.name||'').trim(),customerEmail=(data.customer_email||viewer?.email||'').trim().toLowerCase(),customerPhone=(data.customer_phone||'').trim();
  if(customerName.length<2||customerName.length>100||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)||!/^\+?[\d()\s.-]{8,20}$/.test(customerPhone))return Response.json({error:'Informe nome, e-mail e telefone válidos para a retirada.'},{status:400});
  const unique=new Set<string>();for(const item of data.items){if(!item.product_id||!Number.isInteger(item.quantity)||item.quantity<1||item.quantity>20||unique.has(item.product_id))return Response.json({error:'Confira as quantidades dos produtos.'},{status:400});unique.add(item.product_id)}
  try{
    await ensureStoreSchema();const database=db();
    const prior=await database.prepare('SELECT id,total_cents,payment_method FROM product_sales WHERE request_key=?').bind(data.request_id).first<{id:string;total_cents:number;payment_method:string}>();
    if(prior){let pix_code:string|undefined;if(prior.payment_method==='PIX'){const pix=await currentPixSettings(database);if(pix)pix_code=pixPayload(pix.key,pix.name,pix.city,prior.total_cents,prior.id)}return Response.json({ok:true,id:prior.id,total_cents:prior.total_cents,payment_method:prior.payment_method,payment_status:prior.payment_method==='PIX'?'AWAITING_PIX':'DUE_AT_PICKUP',pix_code,duplicate:true})}
    const pix=data.payment_method==='PIX'?await currentPixSettings(database):null;
    if(data.payment_method==='PIX'&&!pix)return Response.json({error:'O Pix da loja ainda não está configurado. Escolha pagamento na retirada ou tente mais tarde.'},{status:503});
    const reserved:Reserved[]=[];
    const releaseReserved=async()=>Promise.all(reserved.filter(item=>!item.preorder).map(item=>database.prepare('UPDATE products SET stock=stock+?,updated_at=? WHERE id=?').bind(item.quantity,new Date().toISOString(),item.product.id).run().catch(()=>{})));
    for(const requested of data.items){
      let product=await database.prepare('SELECT id,name,price_cents,stock,allow_preorder FROM products WHERE id=? AND active=1').bind(requested.product_id).first<Product>();
      if(!product){await releaseReserved();return Response.json({error:'Um dos produtos não está mais disponível.'},{status:409})}
      if(product.stock>=requested.quantity){const changed=await database.prepare('UPDATE products SET stock=stock-?,updated_at=? WHERE id=? AND active=1 AND stock>=?').bind(requested.quantity,new Date().toISOString(),product.id,requested.quantity).run();if(changed.meta.changes){reserved.push({product,quantity:requested.quantity,preorder:false});continue}product=await database.prepare('SELECT id,name,price_cents,stock,allow_preorder FROM products WHERE id=? AND active=1').bind(requested.product_id).first<Product>()}
      if(product&&product.stock===0&&product.allow_preorder){reserved.push({product,quantity:requested.quantity,preorder:true});continue}
      await releaseReserved();return Response.json({error:`Estoque disponível de “${product?.name||'produto'}”: ${product?.stock??0}. Ajuste a quantidade ou aguarde o esgotamento para encomendar.`},{status:409});
    }
    const orderId=crypto.randomUUID(),now=new Date().toISOString(),total=reserved.reduce((sum,item)=>sum+item.product.price_cents*item.quantity,0),paymentMethod=data.payment_method!,paymentStatus=paymentMethod==='PIX'?'AWAITING_PIX':'DUE_AT_PICKUP';
    try{await database.batch([
      database.prepare('INSERT INTO product_sales(id,request_key,user_sub,customer_name,customer_email,customer_phone,status,payment_method,payment_status,total_cents,pickup_method,created_at,updated_at) VALUES(?,?,?,?,?,?,\'PENDING\',?,?,?,?,?,?)').bind(orderId,data.request_id,viewer?.sub||null,customerName,customerEmail,customerPhone,paymentMethod,paymentStatus,total,'IN_STORE',now,now),
      ...reserved.map(item=>database.prepare('INSERT INTO product_sale_items(id,sale_id,product_id,product_name,unit_price_cents,quantity,is_preorder) VALUES(?,?,?,?,?,?,?)').bind(crypto.randomUUID(),orderId,item.product.id,item.product.name,item.product.price_cents,item.quantity,Number(item.preorder))),
    ])}catch(error){await releaseReserved();throw error}
    const description=reserved.map(item=>`${item.quantity}× ${item.product.name}${item.preorder?' (encomenda)':''}`).join(', '),methodLabel=paymentMethod==='PIX'?'Pix para pagamento imediato':'pagamento na retirada';
    waitUntil((async()=>{await notificationInsert(database,'STORE_ORDER','Nova venda na loja',`${customerName} (${customerPhone}): ${description}. Total ${money(total)}. ${methodLabel}. Retirada no local.`,`/admin/loja`).run();await deliverOwnerNotifications()})().catch(()=>{}));
    return Response.json({ok:true,id:orderId,total_cents:total,payment_method:paymentMethod,payment_status:paymentStatus,pix_code:pix?pixPayload(pix.key,pix.name,pix.city,total,orderId):undefined,pix_key:pix?.key,pix_name:pix?.name},{status:201});
  }catch{return unavailable()}
}
