# WTF LivePulse — Project Task List

## Phase 1: Infrastructure & Project Setup (0:00 – 0:20)

### 1.1 Repository Structure
- [ ] Create the full folder structure as specified:
  ```
  wtf-livepulse/
  ├── docker-compose.yml
  ├── .env.example
  ├── README.md
  ├── backend/  (src/routes, services, db/migrations, db/seeds, jobs, websocket, app.js)
  ├── frontend/ (src/components, pages, hooks, store, main.jsx)
  └── benchmarks/screenshots/
  ```

### 1.2 Docker Compose
- [ ] Create `docker-compose.yml` with exactly 3 services:
  - `db`: PostgreSQL 15-alpine with healthcheck, auto-migration via `/docker-entrypoint-initdb.d/`
  - `backend`: Node.js 20 + Express, depends on db (service_healthy)
  - `frontend`: React 18 + Vite, served on port 3000
- [ ] Ensure `docker compose up` cold start works with zero manual steps
- [ ] Create `.env.example` with all environment variables documented
- [ ] No hardcoded secrets committed to repo (use env vars in compose)

### 1.3 Database Schema (Migrations)
- [ ] `001_initial.sql` — Create all 5 tables with exact schemas:
  - `gyms` (UUID PK, name, city, capacity, status, opens_at, closes_at)
  - `members` (UUID PK, gym_id FK, name, email, phone, plan_type, member_type, status, joined_at, plan_expires_at, last_checkin_at)
  - `checkins` (BIGSERIAL PK, member_id FK, gym_id FK, checked_in, checked_out, duration_min GENERATED)
  - `payments` (UUID PK, member_id FK, gym_id FK, amount, plan_type, payment_type, paid_at)
  - `anomalies` (UUID PK, gym_id FK, type, severity, message, resolved, dismissed, detected_at, resolved_at)
- [ ] `002_indexes.sql` — Create all required indexes:
  - `idx_members_churn_risk` — Partial index on last_checkin_at WHERE status='active'
  - `idx_members_gym_id` — B-tree on gym_id
  - `idx_checkins_time_brin` — BRIN index on checked_in
  - `idx_checkins_live_occupancy` — Partial composite on (gym_id, checked_out) WHERE checked_out IS NULL
  - `idx_checkins_member` — Composite on (member_id, checked_in DESC)
  - `idx_payments_gym_date` — Composite on (gym_id, paid_at DESC)
  - `idx_payments_date` — B-tree on (paid_at DESC)
  - `idx_anomalies_active` — Partial on (gym_id, detected_at DESC) WHERE resolved = FALSE
- [ ] `003_materialized_view.sql` — Create `gym_hourly_stats` materialized view with unique index

---

## Phase 2: Seed Script (0:20 – 0:45)

### 2.1 Gym Seeding
- [ ] Insert exactly 10 gyms with exact names, cities, capacities, opens_at, closes_at from spec
- [ ] All gyms status = 'active', UUIDs via gen_random_uuid()
- [ ] Store gym UUIDs in memory for FK references

### 2.2 Member Seeding (5,000 records)
- [ ] Distribute members across gyms per spec percentages (13%, 11%, 15%, 12%, 11%, 10%, 9%, 8%, 6%, 5%)
- [ ] Assign plan_type per gym distribution (monthly/quarterly/annual splits)
- [ ] 80% new, 20% renewal for member_type
- [ ] Status distribution: per Active% column, remainder split 8% inactive / 4% frozen
- [ ] Realistic Indian names, generated emails (firstname.lastname+random@gmail.com), 10-digit phone numbers
- [ ] joined_at: random within last 90 days (active), 91–180 days ago (inactive)
- [ ] plan_expires_at: joined_at + 30/90/365 days based on plan_type

### 2.3 Churn Risk Population
- [ ] Minimum 150 active members with last_checkin_at 45–60 days ago (HIGH risk)
- [ ] Minimum 80 active members with last_checkin_at 60+ days ago (CRITICAL risk)
- [ ] Remaining active members: last_checkin_at within last 44 days

### 2.4 Check-in History (~270,000 records)
- [ ] 90 days of history across all 10 gyms
- [ ] Apply hourly traffic multipliers (Morning Rush 1.0×, Evening Rush 0.9×, Afternoon 0.2×, etc.)
- [ ] Apply day-of-week multipliers (Mon 1.0×, Sun 0.45×, etc.)
- [ ] All historical check-ins must have checked_out = checked_in + random(45–90 min)
- [ ] Batch inserts (500–1000 rows per query), target < 60 seconds total
- [ ] Zero check-ins outside gym operating hours

### 2.5 Pre-seeded Open Check-ins (Currently In Gym)
- [ ] Large gyms (Bandra West, Powai): 25–35 open check-ins
- [ ] Medium gyms (Lajpat Nagar, CP, Indiranagar, Koramangala, Banjara Hills): 15–25 open check-ins
- [ ] Small gyms (Noida, Salt Lake, Velachery): 8–15 open check-ins
- [ ] **EXCEPTION — Velachery**: 0 open check-ins, last checkin > 2h10m ago (Anomaly Scenario A)
- [ ] **EXCEPTION — Bandra West**: 275–295 open check-ins (Anomaly Scenario B — capacity breach)

### 2.6 Payment History
- [ ] One payment per member (paid_at ≈ joined_at ±5 min)
- [ ] Renewal members get 2 payments (original + renewal at joined_at + plan duration)
- [ ] Exact amounts: monthly ₹1,499, quarterly ₹3,999, annual ₹11,999
- [ ] No future-dated payments
- [ ] **EXCEPTION — Salt Lake**: Seed 8–10 payments totalling ≥₹15,000 on same weekday 7 days ago, and ≤₹3,000 today (Anomaly Scenario C — revenue drop)

### 2.7 Post-Seed Consistency
- [ ] UPDATE members SET last_checkin_at via subquery from checkins table (ensure consistency)
- [ ] Seed must be idempotent (ON CONFLICT DO NOTHING or existence checks)
- [ ] Print progress to stdout during seeding
- [ ] Run all 10 validation queries (V1–V10) and confirm expected results

---

## Phase 3: Backend Core (0:45 – 1:20)

### 3.1 Express App Setup
- [ ] `app.js` — Express entry point with middleware, route mounting, seed check on startup
- [ ] `db/pool.js` — pg Pool singleton using DATABASE_URL env var
- [ ] Backend Dockerfile

### 3.2 REST API Endpoints (8 endpoints)
- [ ] `GET /api/gyms` — List all gyms with current_occupancy and today_revenue
- [ ] `GET /api/gyms/:id/live` — Single gym live snapshot (occupancy, revenue, recent events, anomalies) — < 5ms
- [ ] `GET /api/gyms/:id/analytics` — Peak hours heatmap, revenue by plan, churn risk, new/renewal ratio (dateRange param: 7d/30d/90d)
- [ ] `GET /api/anomalies` — Active anomalies, newest first (optional gym_id, severity filters)
- [ ] `PATCH /api/anomalies/:id/dismiss` — Dismiss warning anomalies only (403 for critical)
- [ ] `GET /api/analytics/cross-gym` — Revenue comparison all gyms, last 30 days, < 2ms
- [ ] `POST /api/simulator/start` — Start simulator at speed 1x/5x/10x
- [ ] `POST /api/simulator/stop` — Pause simulator
- [ ] `POST /api/simulator/reset` — Reset live data to seeded baseline

### 3.3 WebSocket Server
- [ ] Set up `ws` WebSocket server (NOT socket.io)
- [ ] Broadcast 5 event types to all connected clients:
  - `CHECKIN_EVENT` (gym_id, member_name, timestamp, current_occupancy, capacity_pct)
  - `CHECKOUT_EVENT` (gym_id, member_name, timestamp, current_occupancy, capacity_pct)
  - `PAYMENT_EVENT` (gym_id, amount, plan_type, member_name, today_total)
  - `ANOMALY_DETECTED` (anomaly_id, gym_id, gym_name, anomaly_type, severity, message)
  - `ANOMALY_RESOLVED` (anomaly_id, gym_id, resolved_at)

### 3.4 Services Layer
- [ ] `statsService.js` — Occupancy queries, revenue queries, analytics aggregations
- [ ] `anomalyService.js` — Anomaly detection logic, auto-resolve logic
- [ ] `simulatorService.js` — Event generation with realistic time patterns

---

## Phase 4: Background Jobs (part of Backend)

### 4.1 Anomaly Detection Engine (`jobs/anomalyDetector.js`)
- [ ] Runs every 30 seconds
- [ ] Detect zero_checkins: active gym + no check-ins in last 2 hours during operating hours → severity: warning
- [ ] Detect capacity_breach: occupancy > 90% of capacity → severity: critical
- [ ] Detect revenue_drop: today's revenue < 70% of same weekday last week → severity: warning
- [ ] Auto-resolve zero_checkins when a new check-in arrives
- [ ] Auto-resolve capacity_breach when occupancy drops below 85%
- [ ] Auto-resolve revenue_drop when revenue recovers within 20% of last week
- [ ] Broadcast ANOMALY_DETECTED / ANOMALY_RESOLVED via WebSocket
- [ ] Resolved anomalies remain visible 24 hours, then auto-archived

### 4.2 Simulator Engine (`jobs/simulator.js`)
- [ ] Generate check-in/check-out events every 2 seconds
- [ ] Follow realistic hourly patterns (morning/evening peaks)
- [ ] Support speed multiplier (1x / 5x / 10x)
- [ ] Write events to PostgreSQL (real data, not mocked)
- [ ] Broadcast events via WebSocket
- [ ] Reset capability (clear open check-ins, preserve historical)

### 4.3 Materialized View Refresh
- [ ] Refresh `gym_hourly_stats` every 15 minutes (Node.js scheduled job)

---

## Phase 5: React Frontend (1:20 – 2:10)

### 5.1 App Shell & Theming
- [ ] Dark theme: background #0D0D1A, cards #1A1A2E, accent color (teal/red/orange), text #E2E8F0/#64748B
- [ ] Typography: Inter/Sora/JetBrains Mono, large KPI numerals (32–48px)
- [ ] Functional at 1280px minimum width
- [ ] Skeleton loaders for all data panels
- [ ] Error states with meaningful messages (no console.log only)
- [ ] Frontend Dockerfile (serve built assets on port 80)

### 5.2 Module 1 — Live Gym Operations Dashboard
- [ ] Gym selector (tabs or dropdown) — switching updates all widgets without page reload (< 500ms)
- [ ] Live occupancy counter (absolute + percentage) via WebSocket
  - Color coding: < 60% green, 60–85% yellow, > 85% red
- [ ] Live revenue ticker — updates on PAYMENT_EVENT via WebSocket
- [ ] Scrolling activity feed — last 20 events (check-ins, check-outs, payments) with auto-scroll
- [ ] Summary bar — aggregated totals across ALL gyms (total checked in, total revenue, active anomaly count)
- [ ] Pulsing green dot when WebSocket connected, red when disconnected
- [ ] Number animations (300–500ms count-up) on KPI changes

### 5.3 Module 2 — Analytics Engine
- [ ] 7-day peak hours heatmap (from materialized view)
- [ ] Revenue breakdown chart by plan type (monthly/quarterly/annual), filterable by date range
- [ ] Churn risk panel — members with no check-in 45+ days, showing name, last check-in, risk level (High/Critical)
- [ ] New vs renewal ratio donut chart (last 30 days)
- [ ] Cross-gym revenue comparison chart (all 10 gyms ranked)

### 5.4 Module 3 — Anomaly Log
- [ ] Anomaly table: Gym Name, Anomaly Type, Severity, Time Detected, Status
- [ ] Resolved anomalies visible for 24 hours, marked "Resolved"
- [ ] Unread anomaly count badge in navigation (updates via WebSocket)
- [ ] Manual dismiss button for warning-level anomalies (with confirmation)
- [ ] Toast notification on ANOMALY_DETECTED

### 5.5 Module 4 — Simulator Controls
- [ ] Start / Pause button
- [ ] Speed multiplier selector (1x / 5x / 10x)
- [ ] Reset to baseline button

### 5.6 WebSocket Client Hook
- [ ] `useWebSocket` custom hook using native browser WebSocket API (NOT socket.io)
- [ ] Handle all 5 event types and dispatch to appropriate UI updates
- [ ] Connection status indicator (green/red dot)
- [ ] Auto-reconnect on disconnect

---

## Phase 6: Testing (2:10 – 2:40)

### 6.1 Unit Tests (Jest) — Minimum 10 tests
- [ ] zero_checkins anomaly fires correctly
- [ ] capacity_breach anomaly fires when occupancy > 90%
- [ ] revenue_drop anomaly fires when revenue < 70% of last week
- [ ] Anomalies auto-resolve when conditions clear
- [ ] Simulator generates events with realistic time distribution
- [ ] 5+ additional unit tests for edge cases

### 6.2 Integration Tests (Jest + Supertest) — Minimum 12 tests
- [ ] GET /api/gyms returns 10 gyms
- [ ] GET /api/gyms/:id/live returns all required fields
- [ ] GET /api/anomalies returns empty array when none exist
- [ ] PATCH /api/anomalies/:id/dismiss returns 403 for critical anomalies
- [ ] POST /api/simulator/start returns { status: 'running' }
- [ ] Invalid input returns 400/404/403 appropriately
- [ ] 6+ additional integration tests
- [ ] Coverage report included (target 80%+)

### 6.3 E2E Tests (Playwright) — Minimum 3 tests
- [ ] Dashboard loads and displays gym list
- [ ] Switching gym updates occupancy count
- [ ] Simulator check-in event updates activity feed within 2 seconds
- [ ] Anomaly badge increments on new anomaly
- [ ] Tests run headless, no manual config needed

---

## Phase 7: Benchmarks & Documentation (2:40 – 3:00)

### 7.1 Query Benchmarks (EXPLAIN ANALYZE)
- [ ] Q1: Live Occupancy (single gym) — target < 0.5ms
- [ ] Q2: Today's Revenue (single gym) — target < 0.8ms
- [ ] Q3: Churn Risk Members — target < 1ms
- [ ] Q4: Peak Hour Heatmap — target < 0.3ms
- [ ] Q5: Cross-Gym Revenue Comparison — target < 2ms
- [ ] Q6: Active Anomalies — target < 0.3ms
- [ ] Screenshot each EXPLAIN ANALYZE output → `/benchmarks/screenshots/`
- [ ] Confirm NO sequential scans on checkins or payments tables

### 7.2 README.md (5 mandatory sections)
- [ ] Quick Start — `docker compose up` and any prerequisites
- [ ] Architecture Decisions — index choices (BRIN vs B-Tree vs partial), materialized view rationale
- [ ] AI Tools Used — every tool listed with specific usage description
- [ ] Query Benchmarks — table with 6 queries, measured times, indexes used
- [ ] Known Limitations — honest list of incomplete items

### 7.3 Final QA
- [ ] `docker compose down -v && docker compose up` — full cold start test
- [ ] Verify Bandra West shows ~90%+ occupancy
- [ ] Verify Velachery shows 0 occupancy
- [ ] Verify all 10 gyms appear in dashboard
- [ ] Verify anomalies table has ≥3 records within 60 seconds of startup
- [ ] Verify activity feed shows events
- [ ] No 'undefined', empty white boxes, or broken layouts visible
- [ ] No hardcoded secrets in committed code
