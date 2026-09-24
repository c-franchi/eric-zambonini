import { db, unavailable } from '@/lib/server';
import { availableTimes, parseSchedule, validDate } from '@/lib/booking';
export async function GET(request: Request) {
  const url = new URL(request.url), service = url.searchParams.get('service'), date = url.searchParams.get('date') || '';
  if (!service || !validDate(date)) return Response.json({ error: 'Selecione serviço e data válidos.' }, { status: 400 });
  try {
    const database = db();
    const row = await database.prepare('SELECT duration_min FROM services WHERE id = ? AND active = 1').bind(service).first<{ duration_min: number }>();
    if (!row) return Response.json({ error: 'Serviço indisponível.' }, { status: 404 });
    const [settings, used] = await Promise.all([
      database.prepare("SELECT value FROM settings WHERE key = 'schedule'").first<{ value: string }>(),
      database.prepare('SELECT slot FROM booked_slots WHERE date = ?').bind(date).all<{ slot: string }>(),
    ]);
    return Response.json({ times: availableTimes(date, row.duration_min, parseSchedule(settings?.value), new Set(used.results.map((x) => x.slot))) });
  } catch { return unavailable(); }
}
