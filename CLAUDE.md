# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

Node.js/Express/TypeScript backend, React 18/Vite/TypeScript frontend, Postgres via `pg` (raw SQL, no ORM). Auth is JWT + bcryptjs. Payments/subscriptions via Paystack. Email via Resend with a graceful no-op fallback when unconfigured. A WordPress plugin (`wordpress-plugin/`) consumes a public API surface for embeddable booking widgets.

## Commands

Run from repo root unless noted.

```bash
npm run install:all      # installs server AND client deps
npm run dev               # server (:3001) + client concurrently
npm run dev:server        # server only, tsx watch
npm run dev:client        # client only, vite dev server on :3000 (see client/vite.config.ts)
npm run seed               # cd server && tsx src/seed.ts — demo data
npm run build              # tsc build for both server and client
npm test                   # server tests then client tests
npm run test:server        # vitest run, server
npm run test:client        # vitest run, client
```

Single test file / single test (run inside `server/` or `client/`, both use vitest):
```bash
cd server && npx vitest run src/__tests__/bookings.test.ts
cd server && npx vitest run -t "name of test"
cd server && npm run test:watch
```

Migrations (server-only, plain SQL files applied in filename order, tracked in a `schema_migrations` table):
```bash
cd server && npm run migrate     # applies server/migrations/*.sql not yet recorded
```
To add a migration, add a new numbered `.sql` file to `server/migrations/` — there is no down-migration mechanism.

Required env for the server to boot: `DATABASE_URL`, `JWT_SECRET` (server refuses to start without these). Tests use `TEST_DATABASE_URL` (`server/src/__tests__/setup.ts` truncates all tables between tests). See `.env.example` for the full list (Paystack keys, Resend key, CORS origins, etc.).

## Architecture

**Multi-tenant, row-scoped by `hotel_id`.** Almost every table carries `hotel_id`, and almost every query filters on it. There's no Postgres RLS — isolation is enforced entirely at the query layer, so any new route/query must filter by `req.user.hotel_id` (or `req.apiKeyAuth.hotelId`) explicitly.

**DB access (`server/src/db.ts`).** `getDb()` returns `{ queryAll, queryOne, execute }` backed by a single `pg.Pool`. Queries are written with `?` placeholders (a `translate()` helper rewrites them to `$1, $2, ...`), not native Postgres `$n` syntax — keep using `?` for consistency. There is currently no exposed transaction/client-checkout helper on `getDb()`; the only place that runs multi-statement transactions is `migrate.ts`, which calls `pool.connect()` directly.

**Route mounting and cross-cutting middleware live in `server/src/index.ts`**, not in the individual route files — this is the map of what's public vs. authenticated vs. subscription-gated:
- `authenticate` (JWT) gates most `/api/*` routers.
- `requireActiveSubscription` (`middleware/subscriptionGate.ts`) additionally gates the "core operational" routers (bookings, rooms, invoices, housekeeping, etc.) — account/billing/auth routes stay reachable even with a lapsed subscription so a hotel can renew.
- `/api/public/*` uses a separate auth scheme, `authenticateApiKey` (`middleware/apiKeyAuth.ts`), keyed off the `api_keys` table (`X-API-Key` / `X-API-Secret` headers, per-key permissions and IP whitelist) — this is what the WordPress plugin and other external integrations call.
- `/api/subscriptions/paystack-webhook` is intentionally mounted with no `authenticate` — Paystack calls it server-to-server and it's verified instead via HMAC-SHA512 over the raw request body (`services/paystack.ts#verifyWebhookSignature`), which is why `index.ts` captures `req.rawBody` in the `express.json()` verify hook.

**Payments.** `services/paystack.ts` wraps Paystack's HTTP API (initialize/verify/refund transaction, webhook signature check). Two flows share this service and the same shape — initialize a transaction with `metadata`, store a `pending` payment row, confirm via the webhook (`routes/paystackWebhook.ts` branches on `metadata.type === 'booking'`/`metadata.booking_id` vs `metadata.plan_id`):
- Subscriptions: `routes/subscriptions.ts`, `subscription_payments` table, confirmed by `activateSubscriptionForPayment()` (also reachable via the browser-redirect `verify-payment` endpoint).
- Guest bookings: `routes/public.ts`, `booking_payments` table, confirmed by `confirmBookingPayment()`. A booking is created `pending` and only flips to `confirmed` once payment clears — see "Booking holds" below.

Refunds (`routes/invoices.ts` `POST /:id/refund`) call `refundTransaction()` when the invoice's original payment has `method = 'online'`, using the stored Paystack reference. The local refund is only recorded if that call succeeds — never mark something refunded before the gateway confirms it.

**Booking holds & the overlap constraint.** `bookings` has a Postgres exclusion constraint (`no_overlapping_bookings`, `migrations/0004` + `0006`) that rejects any INSERT/UPDATE overlapping another `confirmed`/`checked_in`/`pending` booking for the same room — this is the actual source of truth for double-booking prevention, not the app-level `NOT EXISTS` checks in `public.ts`/`bookings.ts`/`rooms.ts` (those still run first, purely to give a friendlier error than a raw constraint violation). Because `pending` counts, an unpaid public booking holds the room; `pending_expires_at` (set only on public bookings, 15 minutes out) bounds that hold, and `jobs/expirePendingBookings.ts` — an in-process `setInterval` sweeper started from `index.ts`, no external cron — cancels stale ones every minute to free the room. Staff-created `pending` bookings have no expiry and hold the room indefinitely until confirmed/cancelled. Any code that inserts/updates a booking's status or dates should catch Postgres error code `23P01` (exclusion violation) rather than letting it surface as a raw 500.

**Testing.** Server tests (`server/src/__tests__/`) spin up an isolated Express app (`test-app.ts`, a slimmer route mount than production `index.ts` — new routers may need adding there too) against a real Postgres test DB (`TEST_DATABASE_URL`), not a mock. `setup.ts` truncates every table after each test and exposes `seedTestData()` for a standard hotel/users/rooms/guest fixture. Client tests use Testing Library + jsdom via vitest.

**Client.** `client/src/api/client.ts` is a thin fetch wrapper: attaches the JWT from `localStorage`, and globally redirects to `/login` on 401 and `/subscriptions` on 402 (subscription lapsed) — any new API call should go through this rather than raw `fetch`.

**WordPress plugin (`wordpress-plugin/hotelease-booking/`).** PHP plugin whose AJAX handler (`includes/ajax-handlers.php`) proxies to `/api/public/*` via `class-hotelease-api-client.php`, which holds the API key/secret server-side in `wp_options` (never sent to the visitor's browser). Front-end behavior is in `assets/js/hotelease-booking.js`.

## Known gaps (in progress / tracked, not yet fixed)

- `routes/channels.ts` `/sync` is a stub — it returns local room availability but never actually calls an OTA. Deferred until after launch.
- A very late Paystack webhook (payment succeeds after the booking's `pending_expires_at` hold was swept and the room resold) leaves the invoice marked `paid` with the booking still `cancelled` — money captured but no room to show for it. `confirmBookingPayment()`'s exclusion-violation branch flags this with a staff notification for manual reassignment/refund rather than resolving it automatically.
