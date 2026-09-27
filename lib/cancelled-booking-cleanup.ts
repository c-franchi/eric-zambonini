import { env } from 'cloudflare:workers';

const RETENTION_MS=48*60*60*1000;
type Database=D1Database;

// Backfill previous cancellations from deployment time, so records whose
// cancellation date was never stored are retained for a full 48h after rollout.
export async function cleanupOldCancelledBookings(database:Database){
  await database.prepare("UPDATE bookings SET cancelled_at=? WHERE status='CANCELLED' AND cancelled_at IS NULL").bind(new Date().toISOString()).run();
  const cutoff=new Date(Date.now()-RETENTION_MS).toISOString();
  let removed=0;
  for(let batchNumber=0;batchNumber<10;batchNumber++){
    const old=(await database.prepare("SELECT id,receipt_key FROM bookings WHERE status='CANCELLED' AND cancelled_at<? ORDER BY cancelled_at LIMIT 100").bind(cutoff).all<{id:string;receipt_key:string|null}>()).results;
    if(!old.length)break;
    const ids=old.map(item=>item.id),placeholders=ids.map(()=>'?').join(',');
    await database.batch([
      database.prepare(`DELETE FROM booked_slots WHERE booking_id IN (${placeholders})`).bind(...ids),
      database.prepare(`DELETE FROM bookings WHERE status='CANCELLED' AND id IN (${placeholders})`).bind(...ids),
    ]);
    const bucket=(env as unknown as {BUCKET?:R2Bucket}).BUCKET;
    if(bucket)await Promise.all(old.flatMap(item=>item.receipt_key?[bucket.delete(item.receipt_key).catch(()=>{})]:[]));
    removed+=ids.length;
  }
  return removed;
}
