import { getViewer } from '@/lib/auth';
import { db, unavailable } from '@/lib/server';
import { pixPayload, currentPixSettings } from '@/lib/pix';
import { expireUnpaidPix, pixExpiresAt } from '@/lib/pix-expiry';
export async function GET(request: Request) {
  const viewer = await getViewer(); if (!viewer) return Response.json({ error: 'Entre com Google' }, { status: 401 });
  const id = new URL(request.url).searchParams.get('id'); if (!id) return Response.json({ error: 'Reserva inválida' }, { status: 400 });
  try {
    const database = db();await expireUnpaidPix(database);
    const booking = await database.prepare("SELECT price_cents,created_at,payment_status FROM bookings WHERE id=? AND user_sub=? AND payment_method='PIX' AND status<>'CANCELLED'").bind(id, viewer.sub).first<{ price_cents: number;created_at:string;payment_status:string }>();
    if (!booking) return Response.json({ error: 'Reserva não encontrada' }, { status: 404 });
    const settings=await currentPixSettings(database);
    if (!settings) return Response.json({ error: 'Dados Pix ainda não configurados. Fale com o estabelecimento.' }, { status: 503 });
    return Response.json({ code: pixPayload(settings.key, settings.name, settings.city, booking.price_cents, id), amount: booking.price_cents, key:settings.key, name:settings.name,expiresAt:booking.payment_status==='AWAITING_PAYMENT'?pixExpiresAt(booking.created_at):null });
  } catch { return unavailable(); }
}
