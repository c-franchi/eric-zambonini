import { db, ownerOnly, unavailable } from '@/lib/server';
import { availableTimes, parseSchedule, slotsFor, validDate } from '@/lib/booking';
export async function POST(request: Request) {
  if (!await ownerOnly()) return Response.json({ error: 'Acesso restrito neste período de testes.' }, { status: 401 });
  let payload: { service?: string; date?: string; time?: string; name?: string; phone?: string };
  try { payload = await request.json(); } catch { return Response.json({ error: 'Dados inválidos.' }, { status: 400 }); }
  const { service, date, time, name, phone } = payload;
  if (!service || !date || !validDate(date) || !time || !/^([01]\d|2[0-3]):(00|15|30|45)$/.test(time) || !name?.trim() || name.length > 100 || !phone || !/^\+?[\d()\s-]{8,20}$/.test(phone)) {
    return Response.json({ error: 'Revise serviço, data, horário, nome e telefone.' }, { status: 400 });
  }
  try {
    const database = db();
    const chosen = await database.prepare('SELECT duration_min FROM services WHERE id = ? AND active = 1').bind(service).first<{ duration_min: number }>();
    const config = await database.prepare("SELECT value FROM settings WHERE key = 'schedule'").first<{ value: string }>();
    if (!chosen) return Response.json({ error: 'Serviço indisponível.' }, { status: 404 });
    if (!availableTimes(date, chosen.duration_min, parseSchedule(config?.value), new Set()).includes(time)) return Response.json({ error: 'Horário fora da agenda.' }, { status: 400 });
    const id = crypto.randomUUID();
    await database.batch([
      database.prepare('INSERT INTO bookings (id, service_id, date, time, name, phone, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(id, service, date, time, name.trim(), phone.trim(), 'CONFIRMED', new Date().toISOString()),
      ...slotsFor(time, chosen.duration_min).map((slot) => database.prepare('INSERT INTO booked_slots (booking_id, date, slot) VALUES (?, ?, ?)').bind(id, date, slot)),
    ]);
    return Response.json({ id }, { status: 201 });
  } catch (error) {
    if (String(error).includes('UNIQUE constraint')) return Response.json({ error: 'Esse horário acabou de ser reservado. Escolha outro.' }, { status: 409 });
    return unavailable();
  }
}
