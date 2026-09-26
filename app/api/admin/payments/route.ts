import { db, ownerOnly, unavailable } from '@/lib/server';
import { sendPush } from '@/lib/push';
export async function PATCH(request: Request) {
  if (!await ownerOnly()) return Response.json({ error: 'Acesso negado' }, { status: 403 });
  let data: { id?: string; status?: string };
  try { data = await request.json(); } catch { return Response.json({ error: 'Dados inválidos' }, { status: 400 }); }
  if (!data.id || !['PAID', 'REJECTED'].includes(data.status || '')) return Response.json({ error: 'Ação inválida' }, { status: 400 });
  try {
    const result = await db().prepare("UPDATE bookings SET payment_status=? WHERE id=? AND payment_method='PIX' AND receipt_key IS NOT NULL AND payment_status IN ('REVIEW','REJECTED') AND status<>'CANCELLED'").bind(data.status, data.id).run();
    if(result.meta.changes){const booking=await db().prepare('SELECT user_sub FROM bookings WHERE id=?').bind(data.id).first<{user_sub:string|null}>();if(booking?.user_sub)await sendPush(booking.user_sub,`${data.id}:payment:${data.status}`,data.status==='PAID'?'Pagamento aprovado':'Comprovante não aprovado',data.status==='PAID'?'Seu Pix foi confirmado.':'Abra o aplicativo para conferir seu pagamento.','/cliente').catch(()=>{})}
    return Response.json({ ok: result.meta.changes > 0 }, { status: result.meta.changes ? 200 : 409 });
  } catch { return unavailable(); }
}
