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
| `JWT_SECRET` | **Yes** | Random 64-char hex string (`openssl rand -hex 32`) |
| `JWT_REFRESH_SECRET` | **Yes** | Random 64-char hex string |
| `RESEND_API_KEY` | No | Resend.com key for transactional emails |
| `PAYSTACK_SECRET_KEY` | No | Paystack secret for payment processing |
| `PAYSTACK_PUBLIC_KEY` | No | Paystack public key for frontend |
| `NEXT_PUBLIC_APP_URL` | No | Your app URL (for Paystack callback) |
| `CORS_ORIGINS` | No | Comma-separated allowed origins (default: `http://localhost:5173`) |
| `PORT` | No | Server port (default: `3001`) |

---

## 2. Production Build

```bash
# Install all dependencies
npm run install:all

# Build the frontend
cd client && npm run build

# The server serves the built client from client/dist
# Make sure client/dist exists after build
```

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

If deploying without Docker, place an nginx config like:

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

## 5. Database

The app uses Postgres (e.g. a Supabase project), connected via the `pg` driver. Set `DATABASE_URL` in `server/.env` to your connection string — for Supabase, use the pooled ("Transaction" mode) connection string from Project Settings → Database.

**Migrations:** Schema is managed via plain SQL files in `server/migrations/`, tracked in a `schema_migrations` table. Run pending migrations with:

```bash
cd server && npm run migrate
```

`npm run dev` also applies pending migrations automatically on startup for local convenience; production deploys should run `npm run migrate` explicitly as part of the deploy step, before starting the server.

**Backup:** Use your Postgres provider's built-in backups (e.g. Supabase's automatic daily backups and point-in-time recovery), rather than file-based backup.

**Seed data:** Run `npm run seed` to populate sample data (rooms, bookings, users).

**Default demo credentials after seeding:**

| Username | Password | Role |
|----------|----------|------|
| `admin` | `admin123` | Admin |
| `owner` | `owner123` | Owner |
| `manager` | `manager123` | Manager |
| `receptionist` | `reception123` | Receptionist |
| `housekeeping` | `housekeep123` | Housekeeping |
| `accountant` | `account123` | Accountant |

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

- **PM2 logs:** `pm2 logs hotel-server`
- **Docker logs:** `docker-compose logs -f`
- The server logs all emails to console when `RESEND_API_KEY` is not set
- There is no built-in logging to disk — add via `winston` or similar if needed

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
- **File uploads:** Stored in `server/uploads/`. Serve via `/uploads` static route.
- **Emails:** Resend API. Falls back to `console.log` if not configured.
- **Payments:** Paystack. Must configure both public and secret keys.
- **White-label:** Brand color stored in DB, applied via CSS custom properties at runtime.
