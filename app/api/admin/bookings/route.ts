import { db, ownerOnly, unavailable } from '@/lib/server';
import { expireUnpaidPix } from '@/lib/pix-expiry';
export async function GET(request: Request) {
  if (!await ownerOnly()) return Response.json({ error: 'Acesso negado' }, { status: 403 });
  const month = new URL(request.url).searchParams.get('month');
  if (month && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return Response.json({ error: 'Mês inválido' }, { status: 400 });
  try {
    await expireUnpaidPix(db());
    const query = `SELECT b.id, b.date, b.time, b.name, b.phone, b.status, b.price_cents, b.payment_method, b.payment_status, b.receipt_key, b.user_sub, u.email, s.name AS service_name FROM bookings b JOIN services s ON s.id = b.service_id LEFT JOIN users u ON u.sub=b.user_sub`;
    const result = month
      ? await db().prepare(`${query} WHERE b.date >= ? AND b.date < ? ORDER BY b.date, b.time`).bind(`${month}-01`, new Date(Date.UTC(Number(month.slice(0,4)), Number(month.slice(5)), 1)).toISOString().slice(0,10)).all()
      : await db().prepare(`${query} ORDER BY b.date DESC, b.time DESC LIMIT 200`).all();
    return Response.json(result.results, { headers: { 'cache-control': 'no-store' } });
  } catch { return unavailable(); }
}
export async function PATCH(request: Request) {
  if (!await ownerOnly()) return Response.json({ error: 'Acesso negado' }, { status: 403 });
  let data: { id?: string; action?: string };
  try { data = await request.json(); } catch { return Response.json({ error: 'Dados inválidos' }, { status: 400 }); }
  if (!data.id || !['cancel','paid'].includes(data.action || '')) return Response.json({ error: 'Ação inválida' }, { status: 400 });
  try {
    const database = db();
    const row = await database.prepare('SELECT status,payment_method,payment_status FROM bookings WHERE id=?').bind(data.id).first<{status:string;payment_method:string;payment_status:string}>();
    if (!row) return Response.json({ error: 'Reserva não encontrada' }, { status: 404 });
    if (data.action === 'cancel') {
      if (row.payment_status === 'PAID') return Response.json({ error: 'Pagamento aprovado: resolva o reembolso antes de cancelar.' }, { status: 409 });
      await database.batch([database.prepare("UPDATE bookings SET status='CANCELLED' WHERE id=? AND status<>'CANCELLED'").bind(data.id),database.prepare('DELETE FROM booked_slots WHERE booking_id=?').bind(data.id)]);
    } else {
      if (row.status === 'CANCELLED' || row.payment_method !== 'IN_PERSON') return Response.json({ error: 'Pagamento no atendimento indisponível' }, { status: 409 });
      await database.prepare("UPDATE bookings SET payment_status='PAID' WHERE id=?").bind(data.id).run();
    }
    return Response.json({ ok: true });
  } catch { return unavailable(); }
}
