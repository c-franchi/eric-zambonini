import { db, ownerOnly, unavailable } from '@/lib/server';
import { availableTimes, parseSchedule, parseBookingRules, parseBlocks, parseClosedInterval, validDate } from '@/lib/booking';
import { getViewer } from '@/lib/auth';
import { expireUnpaidPix } from '@/lib/pix-expiry';
import { cleanupOldCancelledBookings } from '@/lib/cancelled-booking-cleanup';
export async function GET(request: Request) {
  const url = new URL(request.url), service = url.searchParams.get('service'), date = url.searchParams.get('date') || '', month = url.searchParams.get('month');
  if (!service || (month ? !/^\d{4}-(0[1-9]|1[0-2])$/.test(month) : !validDate(date))) return Response.json({ error: 'Selecione serviço e data válidos.' }, { status: 400 });
  try {
    const database = db();
    await expireUnpaidPix(database);
    await cleanupOldCancelledBookings(database);
    const exclude = url.searchParams.get('exclude');
    const viewer = exclude ? await getViewer() : null;
    let ownBooking = exclude && viewer ? await database.prepare('SELECT id FROM bookings WHERE id=? AND user_sub=? AND status<>?').bind(exclude,viewer.sub,'CANCELLED').first<{id:string}>() : null;
    if(exclude&&!ownBooking&&await ownerOnly())ownBooking=await database.prepare("SELECT id FROM bookings WHERE id=? AND status<>'CANCELLED'").bind(exclude).first<{id:string}>();
    const row = await database.prepare('SELECT duration_min, interleaved_blocks FROM services WHERE id = ? AND active = 1').bind(service).first<{ duration_min: number; interleaved_blocks:string|null }>();
    if (!row) return Response.json({ error: 'Serviço indisponível.' }, { status: 404 });
    if (month) {
      const [settings, rules, occupied, interval] = await Promise.all([
        database.prepare("SELECT value FROM settings WHERE key='schedule'").first<{value:string}>(),
        database.prepare("SELECT value FROM settings WHERE key='booking_rules'").first<{value:string}>(),
        database.prepare("SELECT date,slot FROM booked_slots WHERE date>=? AND date<? UNION SELECT date,slot FROM blocked_slots WHERE date>=? AND date<?").bind(`${month}-01`,`${month}-32`,`${month}-01`,`${month}-32`).all<{date:string;slot:string}>(),
        database.prepare("SELECT value FROM settings WHERE key='closed_interval'").first<{value:string}>(),
      ]);
      const byDate = new Map<string,Set<string>>();
      for (const item of occupied.results) { if (!byDate.has(item.date)) byDate.set(item.date,new Set()); byDate.get(item.date)!.add(item.slot); }
      const days = new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5)),0)).getUTCDate();
      const dates = Array.from({length:days},(_,i)=>`${month}-${String(i+1).padStart(2,'0')}`).filter(day=>availableTimes(day,row.duration_min,parseSchedule(settings?.value),byDate.get(day)||new Set(),parseBookingRules(rules?.value),parseBlocks(row.interleaved_blocks,row.duration_min),parseClosedInterval(interval?.value)).length>0);
      return Response.json({dates},{headers:{'cache-control':'no-store'}});
    }
    const [settings, used, rules, interval] = await Promise.all([
      database.prepare("SELECT value FROM settings WHERE key = 'schedule'").first<{ value: string }>(),
      database.prepare('SELECT slot FROM booked_slots WHERE date = ? AND booking_id <> ? UNION SELECT slot FROM blocked_slots WHERE date = ?').bind(date, ownBooking?.id || '', date).all<{ slot: string }>(),
      database.prepare("SELECT value FROM settings WHERE key='booking_rules'").first<{value:string}>(),
      database.prepare("SELECT value FROM settings WHERE key='closed_interval'").first<{value:string}>(),
    ]);
    return Response.json({ times: availableTimes(date, row.duration_min, parseSchedule(settings?.value), new Set(used.results.map((x) => x.slot)), parseBookingRules(rules?.value),parseBlocks(row.interleaved_blocks,row.duration_min),parseClosedInterval(interval?.value)) });
  } catch { return unavailable(); }
}
