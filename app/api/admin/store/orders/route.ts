import { db, ownerOnly, unavailable } from '@/lib/server';
import { ensureStoreSchema } from '@/lib/store-schema';

export async function PATCH(request:Request){
  if(!await ownerOnly())return Response.json({error:'Acesso negado'},{status:403});
  let data:{id?:string;status?:string;payment_status?:string};try{data=await request.json()}catch{return Response.json({error:'Dados inválidos'},{status:400})}
  if(!data.id||data.status!==undefined&&!['PENDING','CONFIRMED','READY','DELIVERED','CANCELLED'].includes(data.status)||data.payment_status!==undefined&&!['DUE_AT_APPOINTMENT','PAID'].includes(data.payment_status)||data.status===undefined&&data.payment_status===undefined)return Response.json({error:'Atualização inválida.'},{status:400});
  try{
    await ensureStoreSchema();const database=db(),order=await database.prepare('SELECT status,payment_status FROM product_orders WHERE id=?').bind(data.id).first<{status:string;payment_status:string}>();
    if(!order)return Response.json({error:'Encomenda não encontrada.'},{status:404});
    const nextStatus=data.status??order.status,nextPayment=data.payment_status??order.payment_status;
    if(order.status==='CANCELLED'&&nextStatus!=='CANCELLED')return Response.json({error:'Uma encomenda cancelada não pode ser reaberta; faça um novo pedido.'},{status:409});
    if(order.status==='DELIVERED'&&nextStatus==='CANCELLED')return Response.json({error:'Uma encomenda entregue não pode ser cancelada por aqui.'},{status:409});
    if(nextStatus==='CANCELLED'&&nextPayment==='PAID')return Response.json({error:'Registre o reembolso com o cliente antes de cancelar uma encomenda já paga.'},{status:409});
    const changed=await database.prepare('UPDATE product_orders SET status=?,payment_status=?,updated_at=? WHERE id=? AND status=?').bind(nextStatus,nextPayment,new Date().toISOString(),data.id,order.status).run();
    if(!changed.meta.changes)return Response.json({error:'A encomenda foi atualizada por outra ação. Recarregue a lista.'},{status:409});
    if(nextStatus==='CANCELLED'&&order.status!=='CANCELLED'){
      const lines=(await database.prepare('SELECT product_id,quantity FROM product_order_items WHERE order_id=? AND is_preorder=0').bind(data.id).all<{product_id:string;quantity:number}>()).results;
      await Promise.all(lines.map(line=>database.prepare('UPDATE products SET stock=stock+?,updated_at=? WHERE id=?').bind(line.quantity,new Date().toISOString(),line.product_id).run()));
    }
    return Response.json({ok:true});
  }catch{return unavailable()}
}
