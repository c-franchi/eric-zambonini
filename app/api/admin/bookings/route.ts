import { db, ownerOnly, unavailable } from '@/lib/server';
export async function GET() {
  if (!await ownerOnly()) return Response.json({ error: 'Acesso negado' }, { status: 403 });
  try { const result = await db().prepare('SELECT b.id, b.date, b.time, b.name, b.phone, b.status, b.price_cents, b.payment_method, b.payment_status, b.receipt_key, s.name AS service_name FROM bookings b JOIN services s ON s.id = b.service_id ORDER BY b.date DESC, b.time DESC LIMIT 200').all(); return Response.json(result.results); } catch { return unavailable(); }
}
