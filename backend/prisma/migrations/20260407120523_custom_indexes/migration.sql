-- Partial index for churn risk detection
CREATE INDEX IF NOT EXISTS idx_members_churn_risk
  ON members (last_checkin_at)
  WHERE status = 'active';

-- BRIN index on checkins time (efficient for time-series append-only data)
CREATE INDEX IF NOT EXISTS idx_checkins_time_brin
  ON checkins USING BRIN (checked_in);

-- Partial composite for live occupancy (only open check-ins)
CREATE INDEX IF NOT EXISTS idx_checkins_live_occupancy
  ON checkins (gym_id, checked_out)
  WHERE checked_out IS NULL;

-- Partial index for active anomalies
CREATE INDEX IF NOT EXISTS idx_anomalies_active
  ON anomalies (gym_id, detected_at DESC)
  WHERE resolved = FALSE;

-- Materialized view for hourly stats
CREATE MATERIALIZED VIEW IF NOT EXISTS gym_hourly_stats AS
SELECT
  c.gym_id,
  EXTRACT(DOW FROM c.checked_in)::int AS day_of_week,
  EXTRACT(HOUR FROM c.checked_in)::int AS hour,
  COUNT(*)::int AS checkin_count,
  ROUND(AVG(c.duration_min))::int AS avg_duration_min
FROM checkins c
WHERE c.checked_out IS NOT NULL
  AND c.checked_in >= NOW() - INTERVAL '7 days'
GROUP BY c.gym_id, EXTRACT(DOW FROM c.checked_in), EXTRACT(HOUR FROM c.checked_in);

CREATE UNIQUE INDEX IF NOT EXISTS idx_gym_hourly_stats_unique
  ON gym_hourly_stats (gym_id, day_of_week, hour);
