export const PIX_PAYMENT_WINDOW_MS=15*60*1000;

// Reservas Pix novas aguardam comprovante por 15 minutos. A operação em lote
// libera os horários junto com o cancelamento quando a agenda é consultada.
export async function expireUnpaidPix(database:D1Database){
  const cutoff=new Date(Date.now()-PIX_PAYMENT_WINDOW_MS).toISOString();
  await database.batch([
    database.prepare("UPDATE bookings SET status='CANCELLED' WHERE status='CONFIRMED' AND payment_method='PIX' AND payment_status='AWAITING_PAYMENT' AND receipt_key IS NULL AND created_at<=?").bind(cutoff),
    database.prepare("DELETE FROM booked_slots WHERE booking_id IN (SELECT id FROM bookings WHERE status='CANCELLED' AND payment_method='PIX' AND payment_status='AWAITING_PAYMENT' AND receipt_key IS NULL)"),
  ]);
}

export function pixExpiresAt(createdAt:string){return new Date(Date.parse(createdAt)+PIX_PAYMENT_WINDOW_MS).toISOString()}
