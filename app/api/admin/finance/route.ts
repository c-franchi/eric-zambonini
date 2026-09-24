import { db, ownerOnly, unavailable } from '@/lib/server';
export async function GET(request:Request){
 if(!await ownerOnly())return Response.json({error:'Acesso negado'},{status:403});
 const month=new URL(request.url).searchParams.get('month');if(!month||!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))return Response.json({error:'Mês inválido'},{status:400});
 try{const database=db();const row=await database.prepare(`SELECT COUNT(*) AS total,
 SUM(CASE WHEN status<>'CANCELLED' AND payment_status='PAID' THEN price_cents ELSE 0 END) AS paid_cents,
 SUM(CASE WHEN status<>'CANCELLED' AND payment_status<>'PAID' THEN price_cents ELSE 0 END) AS pending_cents,
 SUM(CASE WHEN status='CANCELLED' THEN 1 ELSE 0 END) AS cancelled,
 SUM(CASE WHEN status<>'CANCELLED' AND payment_status='REVIEW' THEN 1 ELSE 0 END) AS receipts_to_review
 FROM bookings WHERE substr(date,1,7)=?`).bind(month).first();return Response.json(row||{total:0,paid_cents:0,pending_cents:0,cancelled:0,receipts_to_review:0})}catch{return unavailable()}
}
