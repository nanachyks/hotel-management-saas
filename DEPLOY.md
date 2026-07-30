# Deployment Guide

## Prerequisites

- Node.js >= 20
- npm
- Docker & docker-compose (optional, for containerized deployment)
- A domain name pointing to your server (for production)
- SMTP / Resend API key for email (optional — falls back to console log)

---

## 1. Environment Setup

```bash
cp server/.env.example server/.env
```

Edit `server/.env` with your values:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | **Yes** | Postgres connection string (e.g. Supabase pooled connection string) |
| `JWT_SECRET` | **Yes** | Random 64-char hex string (`openssl rand -hex 32`) — generate a fresh one for production, never reuse a dev value |
| `RESEND_API_KEY` | No | Resend.com key for transactional emails |
| `PAYSTACK_SECRET_KEY` | No | Paystack secret for payment processing (use a live key, not test, for real payments) |
| `PAYSTACK_PUBLIC_KEY` | No | Paystack public key for frontend |
| `CORS_ORIGINS` | No | Comma-separated allowed origins (default: `http://localhost:5173`). Not needed if the backend serves the frontend itself (same-origin) — see step 2. |
| `TRUST_PROXY` | If behind a proxy | Number of trusted hops (e.g. `1`) when running behind Railway/Render/Fly/nginx/a load balancer |
| `PORT` | No | Server port (default: `3001`) |
| `SUPABASE_URL` | For room photos | Supabase project URL (Settings → API), used for room-photo storage |
| `SUPABASE_SERVICE_ROLE_KEY` | For room photos | Supabase service-role secret key (Settings → API) — keep this secret, it bypasses RLS |

---

## 2. Production Build

```bash
# Install all dependencies
npm run install:all

# Build the frontend
cd client && npm run build && cd ..

# Build the server
cd server && npm run build && cd ..
```

The server automatically serves the built client from `client/dist` (with an SPA fallback for
client-side routes) whenever that folder exists — no separate static host required. In local
dev, `client/dist` doesn't exist, so this is a no-op there and the Vite dev server (port 3000,
proxying `/api` to the backend) is used instead.

---

## 3. Deployment Options

### Option A: Docker (Recommended)

```bash
docker-compose up --build -d
```

The app will be available on port 80 (configured in `nginx.conf`).

Environment variables are passed via `docker-compose.yml` or a `.env` file.

### Option B: Manual (Linux VM)

```bash
# Install Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Clone & setup
git clone <your-repo> /opt/hotel
cd /opt/hotel
npm run install:all
cp server/.env.example server/.env
# Edit .env with production values

# Build frontend
cd client && npm run build && cd ..

# Install PM2 for process management
npm install -g pm2

# Start server
pm2 start server/src/index.ts --name hotel-server --interpreter tsx

# Save PM2 process list
pm2 save
pm2 startup
```

### Option C: One-Click Platform Deploy

#### Railway / Render / Fly.io

1. Create a new web service
2. Set build command: `npm install && cd client && npm install && npm run build`
3. Set start command: `cd server && npx tsx src/index.ts`
4. Add environment variables from `server/.env.example`
5. Set `CORS_ORIGINS` to your frontend domain

---

## 4. Nginx Reverse Proxy (Manual Deploy)

Since the Node server now serves the built client itself, the simplest nginx config just proxies
everything to it:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Set `TRUST_PROXY=1` in this case, so the app sees the real client IP from `X-Forwarded-For`.

If you'd rather have nginx serve static assets directly (skips a hop to Node for JS/CSS/images):

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location / {
        root /opt/hotel/client/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 5a. Room-Photo Storage (Supabase Storage)

One-time setup, on the Supabase project you're using (can be the same one as `DATABASE_URL` or a separate one):

1. In the Supabase dashboard, go to **Storage → New bucket**.
2. Name it exactly `room-photos`, and toggle **Public bucket** on (room photos are meant to be publicly viewable, like on a hotel's public booking page).
3. Go to **Settings → API** and copy the **Project URL** into `SUPABASE_URL`, and the **service_role** secret key into `SUPABASE_SERVICE_ROLE_KEY`.

The service-role key bypasses Row Level Security — never expose it to the frontend or commit it to version control.

---

## 5. Database

The app uses Postgres (e.g. a Supabase project), connected via the `pg` driver. Set `DATABASE_URL` in `server/.env` to your connection string — for Supabase, use the pooled ("Transaction" mode) connection string from Project Settings → Database.

**Migrations:** Schema is managed via plain SQL files in `server/migrations/`, tracked in a `schema_migrations` table. Run pending migrations with:

```bash
cd server && npm run migrate
```

`npm run dev` also applies pending migrations automatically on startup for local convenience; production deploys should run `npm run migrate` explicitly as part of the deploy step, before starting the server.

**Backup:** Use your Postgres provider's built-in backups (e.g. Supabase's automatic daily backups and point-in-time recovery), rather than file-based backup.

**Seed data:** Run `npm run seed` to populate sample data (rooms, bookings, users). This is demo/dev data only — `seed.ts` refuses to run when `NODE_ENV=production` unless you explicitly pass `ALLOW_SEED_IN_PRODUCTION=true`, since it inserts accounts with the well-known passwords below.

**Default demo credentials after seeding:**

| Username | Password | Role |
|----------|----------|------|
| `admin` | `admin123` | Admin |
| `owner` | `owner123` | Owner |
| `manager` | `manager123` | Manager |
| `receptionist` | `reception123` | Receptionist |
| `housekeeping` | `housekeep123` | Housekeeping |
| `accountant` | `account123` | Accountant |

**Before accepting real traffic:** change or delete these seeded accounts. They're only meant for local development/demos, not production tenants.

---

## 6. SSL / HTTPS

For production, always use HTTPS. Options:

**Docker:** Add a TLS-enabled nginx sidecar or use a reverse proxy like Caddy/Traefik.

**Manual:** Use certbot with the nginx config above:

```bash
apt install certbot python3-certbot-nginx
certbot --nginx -d yourdomain.com
```

---

## 7. Monitoring & Logs

- **Health check:** `GET /health` pings the database and returns `{ status: 'ok' }` (200) or `{ status: 'error' }` (503). Unauthenticated and not rate-limited — point your load balancer/orchestrator's liveness probe at it.
- **Request logs:** HTTP requests are logged via `morgan` (`combined` format in production, `dev` format otherwise) to stdout.
- **Error logs:** Unhandled errors are written to `server/server.log` in addition to stdout (see `middleware/errorHandler.ts`). There's no rotation on that file — add one (e.g. `logrotate`) or replace it with a structured logger (`winston`/`pino`) if volume grows.
- **PM2 logs:** `pm2 logs hotel-server`
- **Docker logs:** `docker-compose logs -f`
- The server logs all emails to console when `RESEND_API_KEY` is not set

---

## 8. Updating

```bash
git pull
npm run install:all
cd client && npm run build && cd ..
pm2 restart hotel-server   # or docker-compose restart
```

---

## 9. Architecture Notes

- **Auth:** Stateless JWT. Tokens expire after 24h. Refresh tokens stored in DB.
- **Database:** Postgres via `pg`, connected over `DATABASE_URL`. Suitable for multi-replica deployment — all app servers share the same database, no local file/volume dependency.
- **File uploads:** Room photos are stored in Supabase Storage (bucket `room-photos`), not on local disk — this keeps them intact across redeploys and multiple replicas on platforms with ephemeral filesystems (Railway/Render/Fly). Requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`; see step 5b below for one-time bucket setup.
- **Emails:** Resend API. Falls back to `console.log` if not configured.
- **Payments:** Paystack. Must configure both public and secret keys.
- **White-label:** Brand color stored in DB, applied via CSS custom properties at runtime.
