# Hotel Management SaaS

A comprehensive hotel management platform built with Node.js/Express + React/Vite.

## Stack

- **Backend:** Node.js, Express, TypeScript, SQLite (sql.js)
- **Frontend:** React 18, TypeScript, Vite 5, Recharts, React Router v6
- **Auth:** JWT + bcryptjs, role-based access control
- **Payments:** Paystack integration
- **Email:** Resend (with graceful fallback)
- **Infra:** Docker, docker-compose, nginx

## Getting Started

### Prerequisites

- Node.js >= 20
- npm

### Setup

```bash
# Install dependencies (server & client)
npm run install:all

# Copy environment config (already done on first setup)
cp server/.env.example server/.env
# Edit server/.env with your own JWT_SECRET

# Seed the database with demo data
npm run seed
```

### Development

```bash
# Run both server and client
npm run dev

# Or run individually:
npm run dev:server   # Backend on :3001
npm run dev:client   # Frontend on :5173
```

### Docker

```bash
docker-compose up --build
```

## Testing

```bash
npm test           # Run all tests
npm run test:server
npm run test:client
```

## Project Structure

```
├── client/          # React frontend
├── server/          # Express backend
│   ├── src/
│   │   ├── routes/       # API route handlers
│   │   ├── middleware/    # Auth, error handling
│   │   ├── services/     # Email, payments, AI/ML
│   │   ├── types/        # TypeScript interfaces
│   │   └── __tests__/    # Backend tests
│   └── data/             # SQLite database
├── docker-compose.yml
└── package.json
```
