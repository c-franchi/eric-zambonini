import { getViewer } from '@/lib/auth';
import { db, unavailable } from '@/lib/server';
import { env } from 'cloudflare:workers';
export async function POST(request: Request) {
  const viewer = await getViewer();
  if (!viewer) return Response.json({ error: 'Entre com Google' }, { status: 401 });
  try {
    const form = await request.formData(), id = form.get('booking'), file = form.get('file');
    if (typeof id !== 'string' || !(file instanceof File) || !['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type) || file.size > 5 * 1024 * 1024 || !file.size) return Response.json({ error: 'Envie JPG, PNG, WebP ou PDF de até 5 MB' }, { status: 400 });
    const database = db();
    const booking = await database.prepare('SELECT receipt_key,status,payment_method,payment_status FROM bookings WHERE id=? AND user_sub=?').bind(id, viewer.sub).first<{ receipt_key: string | null; status: string; payment_method: string; payment_status: string }>();
    if (!booking || booking.status === 'CANCELLED' || booking.payment_method !== 'PIX' || booking.payment_status === 'PAID') return Response.json({ error: 'Reserva indisponível para comprovante' }, { status: 409 });
    const key = `receipts/${id}/${crypto.randomUUID()}`;
    await env.BUCKET!.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });
    try { await database.prepare("UPDATE bookings SET receipt_key=?,payment_status='REVIEW' WHERE id=? AND user_sub=?").bind(key, id, viewer.sub).run(); }
    catch { await env.BUCKET!.delete(key); throw Error('Falha ao salvar'); }
    if (booking.receipt_key) await env.BUCKET!.delete(booking.receipt_key).catch(() => {});
    return Response.json({ ok: true });
  } catch { return unavailable(); }
}
