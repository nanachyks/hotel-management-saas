import { getDb } from '../db.js';

const db = getDb();

// Frees rooms held by guest bookings that started a Paystack checkout but never paid
// (abandoned checkout, declined card, closed tab, etc.) within the hold window set at
// booking creation (see pending_expires_at in routes/public.ts). Staff-created pending
// bookings have no pending_expires_at and are left alone — only a public/guest booking's
// unpaid hold expires on its own.
export async function expireStalePendingBookings(): Promise<number> {
  const stale = await db.queryAll(
    `SELECT id FROM bookings WHERE status = 'pending' AND pending_expires_at IS NOT NULL AND pending_expires_at < NOW()`
  );
  if (stale.length === 0) return 0;

  await db.execute(
    `UPDATE bookings SET status = 'cancelled', updated_at = NOW()
     WHERE status = 'pending' AND pending_expires_at IS NOT NULL AND pending_expires_at < NOW()`
  );
  await db.execute(
    `UPDATE booking_payments SET status = 'failed'
     WHERE status = 'pending' AND booking_id = ANY(?::text[])`,
    [stale.map((b: any) => b.id)]
  );
  return stale.length;
}

const SWEEP_INTERVAL_MS = 60 * 1000;
let interval: ReturnType<typeof setInterval> | undefined;

export function startPendingBookingSweeper(): void {
  if (interval) return;
  interval = setInterval(() => {
    expireStalePendingBookings().catch((err) => console.error('Pending booking sweep failed:', err));
  }, SWEEP_INTERVAL_MS);
  interval.unref();
}

export function stopPendingBookingSweeper(): void {
  if (interval) clearInterval(interval);
  interval = undefined;
}
