import { waitUntil } from 'cloudflare:workers';
import { getViewer } from '@/lib/auth';
import { db, unavailable } from '@/lib/server';
import { ensureStoreSchema } from '@/lib/store-schema';
import { notificationInsert, deliverOwnerNotifications } from '@/lib/owner-notifications';

type RequestedItem={product_id:string;quantity:number};
type Product={id:string;name:string;price_cents:number;stock:number;allow_preorder:number};
type Reserved={product:Product;quantity:number;preorder:boolean};

function localDate(){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}

export async function GET(){
  const viewer=await getViewer();if(!viewer)return Response.json({error:'Entre na sua conta para consultar encomendas.'},{status:401});
  try{
    await ensureStoreSchema();const database=db();
    const orders=(await database.prepare(`SELECT o.id,o.status,o.payment_status,o.total_cents,o.created_at,b.date,b.time,s.name AS service_name
      FROM product_orders o JOIN bookings b ON b.id=o.booking_id JOIN services s ON s.id=b.service_id
      WHERE o.user_sub=? ORDER BY o.created_at DESC LIMIT 50`).bind(viewer.sub).all<{id:string;status:string;payment_status:string;total_cents:number;created_at:string;date:string;time:string;service_name:string}>()).results;
    const withItems=await Promise.all(orders.map(async order=>({...order,items:(await database.prepare('SELECT product_name,unit_price_cents,quantity,is_preorder FROM product_order_items WHERE order_id=?').bind(order.id).all()).results})));
    return Response.json(withItems,{headers:{'cache-control':'no-store'}});
  }catch{return unavailable()}
}

export async function POST(request:Request){
  const viewer=await getViewer();if(!viewer)return Response.json({error:'Entre na sua conta para fazer uma encomenda.'},{status:401});
  let data:{booking_id?:string;request_id?:string;items?:RequestedItem[]};try{data=await request.json()}catch{return Response.json({error:'Dados inválidos.'},{status:400})}
  if(!data.booking_id||!data.request_id||!/^[\da-f-]{36}$/i.test(data.request_id)||!Array.isArray(data.items)||data.items.length<1||data.items.length>20)return Response.json({error:'Selecione um agendamento e pelo menos um produto.'},{status:400});
  const unique=new Set<string>();for(const item of data.items){if(!item.product_id||!Number.isInteger(item.quantity)||item.quantity<1||item.quantity>20||unique.has(item.product_id))return Response.json({error:'Confira as quantidades dos produtos.'},{status:400});unique.add(item.product_id)}
  try{
    await ensureStoreSchema();const database=db();
    const prior=await database.prepare('SELECT id FROM product_orders WHERE request_key=? AND user_sub=?').bind(data.request_id,viewer.sub).first<{id:string}>();
    if(prior)return Response.json({ok:true,id:prior.id,duplicate:true});
    const booking=await database.prepare("SELECT date,time FROM bookings WHERE id=? AND user_sub=? AND status='CONFIRMED'").bind(data.booking_id,viewer.sub).first<{date:string;time:string}>();
    if(!booking||booking.date<localDate())return Response.json({error:'Selecione um agendamento futuro ativo da sua conta.'},{status:409});
    const reserved:Reserved[]=[];
    const releaseReserved=async()=>Promise.all(reserved.filter(item=>!item.preorder).map(item=>database.prepare('UPDATE products SET stock=stock+?,updated_at=? WHERE id=?').bind(item.quantity,new Date().toISOString(),item.product.id).run().catch(()=>{})));
    for(const requested of data.items){
      let product=await database.prepare('SELECT id,name,price_cents,stock,allow_preorder FROM products WHERE id=? AND active=1').bind(requested.product_id).first<Product>();
      if(!product){await releaseReserved();return Response.json({error:'Um dos produtos não está mais disponível.'},{status:409});}
      let preorder=false;
      if(product.stock>=requested.quantity){
        const changed=await database.prepare('UPDATE products SET stock=stock-?,updated_at=? WHERE id=? AND active=1 AND stock>=?').bind(requested.quantity,new Date().toISOString(),product.id,requested.quantity).run();
        if(changed.meta.changes){reserved.push({product,quantity:requested.quantity,preorder:false});continue;}
        product=await database.prepare('SELECT id,name,price_cents,stock,allow_preorder FROM products WHERE id=? AND active=1').bind(requested.product_id).first<Product>();
        if(!product){await releaseReserved();return Response.json({error:'Um dos produtos não está mais disponível.'},{status:409});}
      }
      if(product.stock===0&&product.allow_preorder){preorder=true;reserved.push({product,quantity:requested.quantity,preorder});continue;}
      await releaseReserved();return Response.json({error:`Estoque disponível de “${product.name}”: ${product.stock}. Ajuste a quantidade ou aguarde o esgotamento para encomendar.`},{status:409});
    }
    const orderId=crypto.randomUUID(),now=new Date().toISOString(),total=reserved.reduce((sum,item)=>sum+item.product.price_cents*item.quantity,0);
    try{
      await database.batch([
        database.prepare("INSERT INTO product_orders(id,request_key,user_sub,booking_id,status,payment_status,total_cents,created_at,updated_at) VALUES(?,?,?,?,'PENDING','DUE_AT_APPOINTMENT',?,?,?)").bind(orderId,data.request_id,viewer.sub,data.booking_id,total,now,now),
        ...reserved.map(item=>database.prepare('INSERT INTO product_order_items(id,order_id,product_id,product_name,unit_price_cents,quantity,is_preorder) VALUES(?,?,?,?,?,?,?)').bind(crypto.randomUUID(),orderId,item.product.id,item.product.name,item.product.price_cents,item.quantity,Number(item.preorder))),
      ]);
    }catch(error){await releaseReserved();throw error}
    const description=reserved.map(item=>`${item.quantity}× ${item.product.name}${item.preorder?' (encomenda)':''}`).join(', ');
    waitUntil((async()=>{await notificationInsert(database,'STORE_ORDER','Nova encomenda de produto',`${viewer.name}: ${description}. Total ${new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(total/100)}. Pagamento no atendimento.`,`/admin/loja`).run();await deliverOwnerNotifications()})().catch(()=>{}));
    return Response.json({ok:true,id:orderId,total_cents:total,payment_status:'DUE_AT_APPOINTMENT'},{status:201});
  }catch{return unavailable()}
}
