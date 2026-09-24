import { getViewer } from '@/lib/auth';
import { db, unavailable } from '@/lib/server';
import { pixPayload } from '@/lib/pix';
export async function GET(request: Request) {
  const viewer = await getViewer(); if (!viewer) return Response.json({ error: 'Entre com Google' }, { status: 401 });
  const id = new URL(request.url).searchParams.get('id'); if (!id) return Response.json({ error: 'Reserva inválida' }, { status: 400 });
  try {
    const database = db(), booking = await database.prepare("SELECT price_cents FROM bookings WHERE id=? AND user_sub=? AND payment_method='PIX' AND status<>'CANCELLED'").bind(id, viewer.sub).first<{ price_cents: number }>();
    if (!booking) return Response.json({ error: 'Reserva não encontrada' }, { status: 404 });
    const row = await database.prepare("SELECT value FROM settings WHERE key='pix'").first<{ value: string }>();
    if (!row) return Response.json({ error: 'Dados Pix ainda não configurados. Fale com o estabelecimento.' }, { status: 503 });
    const settings: { key: string; name: string; city: string } = JSON.parse(row.value);
    return Response.json({ code: pixPayload(settings.key, settings.name, settings.city, booking.price_cents, id), amount: booking.price_cents });
  } catch { return unavailable(); }
}
