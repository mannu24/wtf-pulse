# Requirements Document — WTF LivePulse

## Introduction

WTF LivePulse is a Real-Time Multi-Gym Intelligence Engine for WTF Gyms (Witness The Fitness), India's fitness-tech chain operating 50+ locations with 26,000+ active members. The system provides a unified live dashboard, analytics engine, anomaly detection, and data simulation — replacing the current 12–18 hour reporting lag with sub-second real-time visibility across all gym locations.

The system is built with React 18 + Vite (frontend), Node.js 20 + Express 4 + ws (backend), PostgreSQL 15 (database), and Docker Compose for single-command deployment.

## Glossary

- **Dashboard**: The React frontend application providing real-time visualization of gym operations
- **Backend**: The Node.js + Express server handling REST API, WebSocket broadcasting, and background jobs
- **Database**: The PostgreSQL 15 instance storing all gym, member, check-in, payment, and anomaly data
- **Gym_Selector**: The navigation component (tabs or dropdown) allowing operators to switch between gym locations
- **Occupancy_Counter**: A widget displaying the count and percentage of members currently checked in at a gym
- **Revenue_Ticker**: A widget displaying today's cumulative membership revenue for a gym
- **Activity_Feed**: A scrolling list of the last 20 real-time events (check-ins, check-outs, payments)
- **Summary_Bar**: An aggregation bar showing totals across all gyms (total checked in, total revenue, active anomaly count)
- **Heatmap**: A 7-day × 24-hour grid visualization of check-in counts per hour per day of week
- **Churn_Risk_Panel**: A panel listing active members with no check-in for 45+ days, categorized by risk level
- **Anomaly_Detector**: A background service running every 30 seconds to detect operational anomalies
- **Simulator**: A background engine generating realistic check-in/check-out/payment events for demonstration
- **Seed_Script**: An idempotent script that populates the database with 10 gyms, 5,000 members, and 90 days of history
- **WebSocket_Server**: The ws-based server broadcasting real-time events to all connected frontend clients
- **Materialized_View**: The `gym_hourly_stats` PostgreSQL materialized view pre-computing hourly check-in aggregations
- **Anomaly**: A detected operational issue (zero_checkins, capacity_breach, or revenue_drop) with severity and resolution status
- **Operating_Hours**: The time window (opens_at to closes_at) during which a gym is expected to have activity
- **Capacity**: The maximum number of members a gym can accommodate simultaneously
- **Plan_Type**: The membership duration category — monthly, quarterly, or annual
- **BRIN_Index**: A Block Range Index on checkins(checked_in) optimized for time-series append-only data
- **Partial_Index**: A PostgreSQL index with a WHERE clause filtering to a subset of rows

## Requirements

### Requirement 1: Infrastructure and Deployment

**User Story:** As a developer, I want to start the entire system with a single `docker compose up` command, so that there are zero manual setup steps for deployment.

#### Acceptance Criteria

1. THE Docker_Compose configuration SHALL define exactly 3 services: db (PostgreSQL 15), backend (Node.js 20 + Express 4), and frontend (React 18 + Vite)
2. WHEN `docker compose up` is executed from a cold start, THE Database SHALL auto-execute migration scripts via `/docker-entrypoint-initdb.d/` to create all tables, indexes, and materialized views
3. WHEN the Database service reports healthy, THE Backend SHALL run a seed check on startup and populate seed data if the database is empty
4. THE Docker_Compose configuration SHALL define all environment variables in the compose file with no hardcoded secrets committed to the repository
5. WHEN `docker compose up` is executed from a cold start, THE system SHALL reach a fully operational state with zero manual intervention steps

### Requirement 2: Database Schema

**User Story:** As a developer, I want a well-indexed PostgreSQL schema, so that all real-time queries meet sub-millisecond performance targets.

#### Acceptance Criteria

1. THE Database SHALL contain exactly 5 tables: gyms, members, checkins, payments, and anomalies with the specified column types and constraints
2. THE Database SHALL contain a BRIN index on checkins(checked_in) for time-series query optimization
3. THE Database SHALL contain a partial composite index on checkins(gym_id, checked_out) WHERE checked_out IS NULL for live occupancy queries
4. THE Database SHALL contain a partial index on members(last_checkin_at) WHERE status = 'active' for churn risk queries
5. THE Database SHALL contain a composite index on payments(gym_id, paid_at DESC) and a B-tree index on payments(paid_at DESC) for revenue queries
6. THE Database SHALL contain a partial index on anomalies(gym_id, detected_at DESC) WHERE resolved = FALSE for active anomaly queries
7. THE Database SHALL contain a materialized view named gym_hourly_stats aggregating check-in counts per hour per day of week, with a unique index
8. WHEN any query executes against the checkins or payments tables, THE Database query plan SHALL use index scans and produce no sequential scans

