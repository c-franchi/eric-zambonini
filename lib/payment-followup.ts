import type { db } from '@/lib/server';

export async function clearPaymentFollowup(database:ReturnType<typeof db>,bookingId:string){
 await database.batch([
  database.prepare('DELETE FROM owner_notifications WHERE id=?').bind(`payment-followup:${bookingId}`),
  database.prepare('DELETE FROM settings WHERE key=?').bind(`payment_followup:last:${bookingId}`),
 ]);
}
