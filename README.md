# WTF LivePulse — Real-Time Gym Operations Dashboard

A full-stack real-time dashboard for monitoring gym operations across 10 WTF gym locations. Built with Node.js, Express, PostgreSQL (Prisma), React 18, WebSockets, and Docker.

## Quick Start (Docker)

**Prerequisites:** Docker and Docker Compose installed.

```bash
# Clone and start — that's it
docker compose up --build

# First run takes ~2 minutes (builds + seeds ~260K records)
# Subsequent runs start in seconds (data persists in volume)
```

Once running:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:4000
- **Login:** `admin@wtflivepulse.com` / `admin123`

To fully reset (wipe DB and re-seed):
```bash
docker compose down -v && docker compose up --build
```

## Quick Start (Local Development)

**Prerequisites:** Node.js 20+, PostgreSQL running on localhost:5432.

### 1. Database Setup

Create the database (using your local postgres user):
```bash
createdb livepulse
# or via psql:
psql -U postgres -c "CREATE DATABASE livepulse;"
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env — set DATABASE_URL to your local postgres connection:
# DATABASE_URL=postgresql://postgres@localhost:5432/livepulse

# Push schema to database
npx prisma db push

# Seed data (~260K records, takes ~12 seconds)
npm run seed

# Start the backend
npm run dev
# or: node src/app.js
```

Backend runs on http://localhost:4000.

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npx vite --port 3000
```

Frontend runs on http://localhost:3000. Vite proxies `/api` and `/ws` to the backend automatically.

### 4. Login

Open http://localhost:3000 and sign in:
- **Email:** `admin@wtflivepulse.com`
- **Password:** `admin123`

## Architecture

```
├── backend/
│   ├── src/
│   │   ├── app.js              # Express entry point
│   │   ├── middleware/auth.js   # JWT authentication
│   │   ├── routes/             # REST API (gyms, anomalies, analytics, simulator, auth)
│   │   ├── services/           # Business logic (stats, anomaly detection, simulator)
│   │   ├── jobs/               # Background jobs (anomaly detector, mat view refresh)
│   │   ├── websocket/          # WebSocket server (ws library)
│   │   ├── db/prisma.js        # Prisma client singleton
│   │   ├── db/seeds/seed.js    # Data seeding script
│   │   └── scripts/startup.js  # Docker startup orchestrator
│   └── prisma/schema.prisma    # Database schema
├── frontend/
│   ├── src/
│   │   ├── App.jsx             # Root with auth gate
│   │   ├── pages/              # Dashboard, Analytics, AnomalyLog, Login
│   │   ├── components/         # UI components
│   │   ├── hooks/useWebSocket  # WebSocket client with auto-reconnect
│   │   ├── store/useStore.js   # Zustand state management
│   │   └── utils/api.js        # Authenticated fetch helper
│   └── nginx.conf              # Production nginx config
├── docker-compose.yml
└── .env.example
```

## Architecture Decisions

### Database Indexes
- **BRIN index** on `checkins.checked_in` — optimal for time-series append-only data, much smaller than B-tree
- **Partial indexes** for live occupancy (`WHERE checked_out IS NULL`) and active anomalies (`WHERE resolved = FALSE`) — only index the rows we actually query
- **Composite indexes** on `(gym_id, paid_at DESC)` for revenue queries — covers both filter and sort in one index scan

### Materialized View
`gym_hourly_stats` pre-aggregates check-in counts by day-of-week and hour for the heatmap. Refreshed every 15 minutes. Avoids scanning 260K+ rows on every analytics request.

### WebSocket over Polling
Native `ws` library (not socket.io) for minimal overhead. 5 event types broadcast to all connected clients. Frontend uses a custom `useWebSocket` hook with auto-reconnect.

### Authentication
JWT-based auth with bcrypt password hashing. All API endpoints except `/api/auth/login` and `/api/health` require a valid Bearer token. Tokens expire after 24 hours.

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | No | Login, returns JWT |
| GET | `/api/auth/me` | Yes | Verify token |
| GET | `/api/gyms` | Yes | All gyms with live occupancy + revenue |
| GET | `/api/gyms/:id/live` | Yes | Single gym live snapshot |
| GET | `/api/gyms/:id/analytics` | Yes | Peak hours, revenue, churn, ratios |
| GET | `/api/anomalies` | Yes | Active anomalies list |
| PATCH | `/api/anomalies/:id/dismiss` | Yes | Dismiss warning anomalies |
| GET | `/api/analytics/cross-gym` | Yes | Revenue comparison all gyms |
| POST | `/api/simulator/start` | Yes | Start event simulator |
| POST | `/api/simulator/stop` | Yes | Pause simulator |
| POST | `/api/simulator/reset` | Yes | Reset to seeded baseline |

## Query Benchmarks

All measured via `EXPLAIN ANALYZE` on seeded dataset (~260K check-ins):

| Query | Time | Index Used |
|-------|------|------------|
| Live Occupancy (single gym) | ~0.05ms | `idx_checkins_live_occupancy` (partial) |
| Today's Revenue (single gym) | ~0.03ms | `idx_payments_gym_date` (composite) |
| Churn Risk Members | ~0.07ms | `idx_members_churn_risk` (partial) |
| Peak Hour Heatmap | ~0.07ms | `idx_gym_hourly_stats_unique` (mat view) |
| Cross-Gym Revenue (30 days) | ~0.40ms | `idx_payments_date` |
| Active Anomalies | ~0.02ms | `idx_anomalies_active` (partial) |

Zero sequential scans on checkins or payments tables.

## Seeded Data

- 10 gyms across Mumbai, Delhi, Bangalore, Hyderabad, Noida, Kolkata, Chennai
- 5,000 members with realistic Indian names, distributed per spec
- ~260,000 historical check-ins (90 days, hourly traffic patterns)
- ~5,400 payments (monthly ₹1,499 / quarterly ₹3,999 / annual ₹11,999)
- Pre-seeded anomaly scenarios:
  - **Velachery:** 0 occupancy → triggers `zero_checkins` warning
  - **Bandra West:** ~95% occupancy → triggers `capacity_breach` critical
  - **Salt Lake:** Revenue drop vs last week → triggers `revenue_drop` warning

## AI Tools Used

- **Kiro (Claude):** Full project scaffolding, schema design, seed script, API implementation, React frontend, Docker configuration, testing, and documentation

## Known Limitations

- Seed check-in count (~260K) slightly below the 270K target due to randomized traffic patterns
- Materialized view is empty until first refresh (15 min) or manual `REFRESH MATERIALIZED VIEW CONCURRENTLY gym_hourly_stats`
- Frontend is optimized for 1280px+ width; no mobile responsive layout
- E2E tests (Playwright) not yet implemented
- WebSocket has no authentication (connects without token)
