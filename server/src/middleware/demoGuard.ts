import { Request, Response, NextFunction } from 'express';
import { isDemoTenantId } from '../demoTenant.js';

/* Keeps the public demo tenant out of the admin/configuration tools.
   The demo nav (client side) hides those pages; this middleware is the
   server-side backstop so hitting the URLs directly — or poking the API
   directly — gets a clean 403 instead of exposing the billing/config
   surface to prospects. Real tenants are untouched. */

const DEMO_BLOCK = { error: 'This section is not part of the public demo.', code: 'DEMO_LIMITED' };

async function demoTenantUser(req: Request): Promise<boolean> {
  return isDemoTenantId((req as any).user?.hotel_id);
}

export async function blockDemoTenant(req: Request, res: Response, next: NextFunction) {
  try {
    if (await demoTenantUser(req)) {
      return res.status(403).json(DEMO_BLOCK);
    }
    next();
  } catch (err) {
    next(err);
  }
}

// For routers the demo user may still READ from (e.g. subscriptions state for
// banners) but must not WRITE to — config pages stay hidden, demo data intact.
export async function blockDemoTenantWrites(req: Request, res: Response, next: NextFunction) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  return blockDemoTenant(req, res, next);
}
