import { db, unavailable } from '@/lib/server';
import { env } from 'cloudflare:workers';

export async function POST(request: Request) {
  const expected = (env as unknown as { PURGE_TEST_BOOKINGS_KEY?: string }).PURGE_TEST_BOOKINGS_KEY;
  if (!expected || request.headers.get('x-cleanup-key') !== expected) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const database = db();
    const bookings = await database.prepare('SELECT id, receipt_key FROM bookings').all<{ id: string; receipt_key: string | null }>();
    await database.batch([
      database.prepare('DELETE FROM booked_slots'),
      database.prepare('DELETE FROM bookings'),
      database.prepare("DELETE FROM owner_notifications WHERE kind IN ('BOOKING','CANCELLED')"),
    ]);

    const bucket = (env as unknown as { BUCKET?: R2Bucket }).BUCKET;
    if (bucket) {
      await Promise.all(bookings.results.map((booking) => booking.receipt_key ? bucket.delete(booking.receipt_key).catch(() => {}) : Promise.resolve()));
    }

    return Response.json({ deletedBookings: bookings.results.length, deletedBookingNotifications: 'BOOKING and CANCELLED' });
  } catch {
    return unavailable();
  }
}
