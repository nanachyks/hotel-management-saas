# HotelEase — Outstanding Work

Updated: 2026-10-29

Status at a glance:

- ✅ Working: demo login (`demo.admin` / `demo123`, also `demo.owner` / `demo123`) with Ghana-flavored data, landing page, per-hotel booking site (`/stay/:slug`), subscription gate, role limits (admin vs owner), nightly demo auto-reset.
- 🔴 → use this list top-down. Sections 1–2 block selling; 3–4 are polish.

---

## 1. Blockers (must do before taking a single cedi)

### 1.1 Real credentials in `server/.env`
All three are currently **empty**:

| Key | Needed for | Impact if missing |
|---|---|---|
| `PAYSTACK_SECRET_KEY` + `PAYSTACK_PUBLIC_KEY` | Booking checkout + subscription payments | Nobody can pay — for the SaaS *or* the hotels' websites |
| `RESEND_API_KEY` | Booking confirmations, receipts, invites | Guests book silently; invites fail |
| `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | Room photo uploads (`room-photos` bucket) | Demo uses Unsplash fallbacks; real hotels can't upload |

### 1.2 Verify the Paystack round trip once keys are set
- [ ] Subscription payment: initialize → Paystack → webhook → subscription flips to `active`
- [ ] Booking payment: demo booking → charge success → `confirmBookingPayment` → booking `confirmed`, invoice paid
- [ ] Webhook URL configured in Paystack dashboard: `https://<your-domain>/api/subscriptions/paystack-webhook`
- [ ] Test with Paystack **test keys** first, then swap to live keys

### 1.3 Fill in the "EDIT ME" block
- File: `client/src/pages/Landing.tsx` (top of file)
- [ ] `WHATSAPP_NUMBER` — placeholder is `233501234567`
- [ ] `WHATSAPP_MESSAGE`
- [ ] `SUPPORT_EMAIL` — placeholder is `hello@hotelease.com`

### 1.4 Production deployment
- [ ] Managed Postgres (or self-hosted) with backups
- [ ] Server on a host with Node 20+; `NODE_ENV=production`
- [ ] `npm run migrate` against the prod DB (`npm run seed:demo` is optional — the demo auto-creates on boot)
- [ ] `JWT_SECRET`, `CORS_ORIGINS=https://<real-domain>` set
- [ ] `TRUST_PROXY=1` if behind nginx/Cloudflare
- [ ] Build the client (`npm run build`) and let the server serve `client/dist` (already supported), same port
- [ ] Demo auto-reset runs **inside the server process** → keep exactly **one** server instance, or move the reset to an external cron (`npm run seed:demo` as a daily job) before scaling out
- [ ] Uptime monitoring on `/health`

## 2. Before public launch
- [ ] Domain + HTTPS for the app and `/stay/:slug` sites (same domain, no extra config)
- [ ] Resend sending-domain verified so emails don't land in spam
- [ ] Database backup policy — even a nightly `pg_dump`
- [ ] Terms of Service, Privacy Policy, and a short refund-policy line near "no lock-in" on the landing page
- [ ] Add Open Graph meta tags + favicon for `/` and `/stay/:slug` (WhatsApp link previews matter in this market)

## 3. Sales prep
- [ ] Rehearse a 10-minute demo script with `demo.admin`: dashboard numbers → create booking → check guest in → housekeeping board → add an expense → open a report
- [ ] Show `demo.owner` (owner/partner view) as the second act
- [ ] Demo booking site: `/stay/golden-sands-osu` — works end-to-end once Paystack keys are in; before that, checkout shows a graceful "not configured" message (don't demo checkout live)
- [ ] WordPress plugin (falls back to the `@api/public` API): package the zip + README if a prospect asks for embedding into an existing WP site

## 4. Known loose ends (low priority)
- [ ] `client/tsconfig.tsbuildinfo` should probably be gitignored (build artifact)
- [ ] Pre-existing test failures: 7 Paystack-mock tests in `server/src/__tests__/invoices.test.ts` & `public.test.ts` (identical before/after current work — investigate when touching payments next)
- [ ] Per-property billing for Enterprise-adds-property (subscription row currently created on the new property; invoices per property is future work)
- [ ] If demand justifies: move demo reset to a separate cron/systemd timer so multiple app instances can run safely
