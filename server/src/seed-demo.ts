import { seedDemoTenant } from './demoTenant.js';

// CLI: npm run seed:demo  → (re)creates the public demo tenant.
// Tenant-scoped: wipes and re-inserts ONLY the demo hotel's rows.
if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_SEED !== 'true') {
  console.error(
    'Refusing to seed the demo tenant with NODE_ENV=production unless you set ' +
    'ALLOW_DEMO_SEED=true (this inserts well-known login credentials).'
  );
  process.exit(1);
}

seedDemoTenant()
  .then(() => process.exit(0))
  .catch(err => { console.error(err); process.exit(1); });
