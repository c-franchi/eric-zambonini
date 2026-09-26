import { getViewer } from '@/lib/auth';
import { db, unavailable } from '@/lib/server';
import { env } from 'cloudflare:workers';
import { expireUnpaidPix } from '@/lib/pix-expiry';
export async function POST(request: Request) {
  const viewer = await getViewer();
  if (!viewer) return Response.json({ error: 'Entre com Google' }, { status: 401 });
  try {
    const form = await request.formData(), id = form.get('booking'), file = form.get('file');
    if (typeof id !== 'string' || !(file instanceof File) || !['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type) || file.size > 5 * 1024 * 1024 || !file.size) return Response.json({ error: 'Envie JPG, PNG, WebP ou PDF de até 5 MB' }, { status: 400 });
    const database = db();
    await expireUnpaidPix(database);
    const booking = await database.prepare('SELECT receipt_key,status,payment_method,payment_status FROM bookings WHERE id=? AND user_sub=?').bind(id, viewer.sub).first<{ receipt_key: string | null; status: string; payment_method: string; payment_status: string }>();
    if (!booking || booking.status === 'CANCELLED' || booking.payment_method !== 'PIX' || booking.payment_status === 'PAID') return Response.json({ error: 'Reserva indisponível para comprovante' }, { status: 409 });
    const key = `receipts/${id}/${crypto.randomUUID()}`;
    await env.BUCKET!.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });
    try {
      const updated=await database.prepare("UPDATE bookings SET receipt_key=?,payment_status='REVIEW' WHERE id=? AND user_sub=? AND status='CONFIRMED' AND payment_method='PIX' AND payment_status IN ('AWAITING_PAYMENT','PENDING','REJECTED','REVIEW') AND (payment_status<>'AWAITING_PAYMENT' OR created_at>?)").bind(key, id, viewer.sub, new Date(Date.now()-15*60*1000).toISOString()).run();
      if(!updated.meta.changes){await env.BUCKET!.delete(key);return Response.json({error:'O prazo de 15 minutos terminou. Faça um novo agendamento.'},{status:409})}
    }
    catch { await env.BUCKET!.delete(key); throw Error('Falha ao salvar'); }
    if (booking.receipt_key) await env.BUCKET!.delete(booking.receipt_key).catch(() => {});
    return Response.json({ ok: true });
  } catch { return unavailable(); }
}
