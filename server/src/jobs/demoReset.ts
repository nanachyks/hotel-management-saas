import { findDemoHotel, seedDemoTenant, demoTenantAgeHours } from '../demoTenant.js';

// Keeps the public demo tenant healthy:
//  - creates it on boot if missing (e.g. fresh database)
//  - resets it each night so a day of demo poking never breaks the
//    landing-page promise ("resets nightly") — the landing page and the
//    demo booking website always show the same polished sample data.

const CHECK_INTERVAL_MS = 30 * 60 * 1000; // check twice an hour
const RESET_AFTER_HOURS = 24;

export async function ensureDemoTenant(): Promise<'created' | 'reset' | 'ok' | 'error'> {
  try {
    const hotel = await findDemoHotel();
    if (!hotel) {
      console.log('Demo tenant not found — creating it now.');
      await seedDemoTenant();
      return 'created';
    }
    const age = await demoTenantAgeHours();
    if (age !== null && age >= RESET_AFTER_HOURS) {
      console.log(`Demo tenant is ${Math.round(age)}h old — resetting it for the new day.`);
      await seedDemoTenant();
      return 'reset';
    }
    return 'ok';
  } catch (err) {
    console.error('Demo tenant check failed:', err);
    return 'error';
  }
}

let interval: ReturnType<typeof setInterval> | undefined;

export function startDemoResetScheduler(): void {
  if (interval) return;
  // Run once shortly after boot (also handles the missing-demo case),
  // then re-check on every interval.
  setTimeout(() => { ensureDemoTenant(); }, 5000).unref();
  interval = setInterval(ensureDemoTenant, CHECK_INTERVAL_MS);
  interval.unref();
}
