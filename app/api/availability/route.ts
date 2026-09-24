import { db, unavailable } from '@/lib/server';
import { availableTimes, parseSchedule, parseBookingRules, validDate } from '@/lib/booking';
import { getViewer } from '@/lib/auth';
export async function GET(request: Request) {
  const url = new URL(request.url), service = url.searchParams.get('service'), date = url.searchParams.get('date') || '';
  if (!service || !validDate(date)) return Response.json({ error: 'Selecione serviço e data válidos.' }, { status: 400 });
  try {
    const database = db();
    const exclude = url.searchParams.get('exclude');
    const viewer = exclude ? await getViewer() : null;
    const ownBooking = exclude && viewer ? await database.prepare('SELECT id FROM bookings WHERE id=? AND user_sub=? AND status<>?').bind(exclude,viewer.sub,'CANCELLED').first<{id:string}>() : null;
    const row = await database.prepare('SELECT duration_min FROM services WHERE id = ? AND active = 1').bind(service).first<{ duration_min: number }>();
    if (!row) return Response.json({ error: 'Serviço indisponível.' }, { status: 404 });
    const [settings, used, rules] = await Promise.all([
      database.prepare("SELECT value FROM settings WHERE key = 'schedule'").first<{ value: string }>(),
      database.prepare('SELECT slot FROM booked_slots WHERE date = ? AND booking_id <> ? UNION SELECT slot FROM blocked_slots WHERE date = ?').bind(date, ownBooking?.id || '', date).all<{ slot: string }>(),
      database.prepare("SELECT value FROM settings WHERE key='booking_rules'").first<{value:string}>(),
    ]);
    return Response.json({ times: availableTimes(date, row.duration_min, parseSchedule(settings?.value), new Set(used.results.map((x) => x.slot)), parseBookingRules(rules?.value)) });
  } catch { return unavailable(); }
}
