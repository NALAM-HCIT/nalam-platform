-- ==============================================================================
-- NALAM — PATIENT DASHBOARD TEST SEED & VERIFICATION SCRIPT
-- ==============================================================================
-- Purpose  : Populate all five dashboard tables with realistic test data and
--            then verify correct behaviour for every feature and edge case.
-- Usage    : Run in psql or Supabase SQL editor against the target database.
--            Replace the two variable assignments at the top with real IDs
--            from your hospitals and patients tables before running.
-- ==============================================================================

-- ─── Step 0: Set target IDs ────────────────────────────────────────────────
-- Replace these with real values from your database.
\set TARGET_HOSPITAL_ID  'aaaaaaaa-0000-0000-0000-000000000001'
\set TARGET_PATIENT_ID   'bbbbbbbb-0000-0000-0000-000000000002'
\set OTHER_HOSPITAL_ID   'cccccccc-0000-0000-0000-000000000003'
\set OTHER_PATIENT_ID    'dddddddd-0000-0000-0000-000000000004'

-- ─── Step 1: Verify RLS is active on all dashboard tables ─────────────────
SELECT
    tablename,
    rowsecurity AS rls_enabled,
    CASE WHEN rowsecurity THEN 'PASS ✅' ELSE 'FAIL ❌ — run RLS migration' END AS status
FROM pg_tables
WHERE tablename IN (
    'patient_mood_logs', 'patient_water_settings', 'patient_water_logs',
    'patient_physio_logs', 'patient_vitals', 'health_tips'
)
ORDER BY tablename;

-- ─── Step 2: Verify indexes exist ─────────────────────────────────────────
SELECT
    indexname,
    tablename,
    'EXISTS ✅' AS status
FROM pg_indexes
WHERE indexname IN (
    'ix_mood_patient_date',
    'ix_water_logs_patient_date',
    'ix_physio_patient_date',
    'ix_vitals_patient_date',
    'ix_health_tips_active',
    'uq_mood_patient_day',
    'uq_water_settings_patient'
)
ORDER BY tablename, indexname;

-- ─── Step 3: Seed MOOD LOGS — 7 days of data ──────────────────────────────
DELETE FROM patient_mood_logs
WHERE hospital_id = :'TARGET_HOSPITAL_ID'::uuid
  AND patient_id  = :'TARGET_PATIENT_ID'::uuid;

INSERT INTO patient_mood_logs (hospital_id, patient_id, log_date, mood_score, mood_label, mood_note, logged_at)
SELECT
    :'TARGET_HOSPITAL_ID'::uuid,
    :'TARGET_PATIENT_ID'::uuid,
    CURRENT_DATE - s.i,
    (ARRAY[4,5,3,4,2,5,4])[s.i + 1],
    (ARRAY['good','great','okay','good','bad','great','good'])[s.i + 1],
    CASE s.i
        WHEN 0 THEN 'Feeling good today after physiotherapy session'
        WHEN 2 THEN 'Headache in the morning, better now'
        WHEN 4 THEN 'Slept poorly, feeling tired'
        ELSE NULL
    END,
    now() - (s.i * INTERVAL '1 day') + INTERVAL '8 hours'
FROM generate_series(0, 6) AS s(i);

-- Verify: should be 7 rows
SELECT 'Mood logs inserted: ' || COUNT(*) || ' (expected 7)' AS check_mood
FROM patient_mood_logs
WHERE hospital_id = :'TARGET_HOSPITAL_ID'::uuid
  AND patient_id  = :'TARGET_PATIENT_ID'::uuid;

-- Edge case: test duplicate-day overwrite — insert a second mood for today
INSERT INTO patient_mood_logs (hospital_id, patient_id, log_date, mood_score, mood_label, logged_at)
VALUES (:'TARGET_HOSPITAL_ID'::uuid, :'TARGET_PATIENT_ID'::uuid, CURRENT_DATE, 5, 'great', now())
ON CONFLICT (hospital_id, patient_id, log_date)
DO UPDATE SET mood_score = EXCLUDED.mood_score,
              mood_label = EXCLUDED.mood_label,
              logged_at  = EXCLUDED.logged_at;

-- Verify: still exactly 7 rows (overwrite, not duplicate)
SELECT
    'Mood overwrite check: ' ||
    CASE WHEN COUNT(*) = 7 THEN 'PASS ✅ (7 rows, no duplicates)' ELSE 'FAIL ❌ (' || COUNT(*) || ' rows found)' END
FROM patient_mood_logs
WHERE hospital_id = :'TARGET_HOSPITAL_ID'::uuid
  AND patient_id  = :'TARGET_PATIENT_ID'::uuid;

-- Verify: today's mood should be score=5 (great) after overwrite
SELECT
    'Mood overwrite value: ' ||
    CASE WHEN mood_score = 5 AND mood_label = 'great' THEN 'PASS ✅' ELSE 'FAIL ❌' END
FROM patient_mood_logs
WHERE hospital_id = :'TARGET_HOSPITAL_ID'::uuid
  AND patient_id  = :'TARGET_PATIENT_ID'::uuid
  AND log_date    = CURRENT_DATE;

-- ─── Step 4: Seed WATER SETTINGS ──────────────────────────────────────────
INSERT INTO patient_water_settings
    (hospital_id, patient_id, daily_goal_ml, reminder_enabled, reminder_interval_h,
     reminder_start_time, reminder_end_time, updated_at)
VALUES
    (:'TARGET_HOSPITAL_ID'::uuid, :'TARGET_PATIENT_ID'::uuid,
     2500, true, 2, '07:00', '21:00', now())
ON CONFLICT (hospital_id, patient_id)
DO UPDATE SET
    daily_goal_ml       = EXCLUDED.daily_goal_ml,
    reminder_enabled    = EXCLUDED.reminder_enabled,
    reminder_interval_h = EXCLUDED.reminder_interval_h,
    updated_at          = now();

SELECT 'Water settings: ' || COUNT(*) || ' row (expected 1)' AS check_water_settings
FROM patient_water_settings
WHERE patient_id = :'TARGET_PATIENT_ID'::uuid;

-- ─── Step 5: Seed WATER LOGS — today's intake ─────────────────────────────
DELETE FROM patient_water_logs
WHERE hospital_id = :'TARGET_HOSPITAL_ID'::uuid
  AND patient_id  = :'TARGET_PATIENT_ID'::uuid
  AND log_date    = CURRENT_DATE;

INSERT INTO patient_water_logs (hospital_id, patient_id, log_date, amount_ml, logged_at)
VALUES
    (:'TARGET_HOSPITAL_ID'::uuid, :'TARGET_PATIENT_ID'::uuid, CURRENT_DATE, 300, now() - INTERVAL '4 hours'),
    (:'TARGET_HOSPITAL_ID'::uuid, :'TARGET_PATIENT_ID'::uuid, CURRENT_DATE, 200, now() - INTERVAL '2 hours'),
    (:'TARGET_HOSPITAL_ID'::uuid, :'TARGET_PATIENT_ID'::uuid, CURRENT_DATE, 500, now() - INTERVAL '1 hour');

-- Verify today's total = 1000 ml, progress = 40% of 2500 ml goal
SELECT
    'Water total today: ' || SUM(amount_ml) || ' ml' ||
    CASE WHEN SUM(amount_ml) = 1000 THEN ' PASS ✅' ELSE ' FAIL ❌' END AS check_water_total
FROM patient_water_logs
WHERE patient_id = :'TARGET_PATIENT_ID'::uuid
  AND log_date   = CURRENT_DATE;

-- ─── Step 6: Seed PHYSIO LOGS — 30 days ───────────────────────────────────
DELETE FROM patient_physio_logs
WHERE hospital_id = :'TARGET_HOSPITAL_ID'::uuid
  AND patient_id  = :'TARGET_PATIENT_ID'::uuid;

INSERT INTO patient_physio_logs
    (hospital_id, patient_id, activity_name, duration_min, sets, reps, pain_level, notes, performed_at, log_date)
SELECT
    :'TARGET_HOSPITAL_ID'::uuid,
    :'TARGET_PATIENT_ID'::uuid,
    (ARRAY['Knee flexion','Hip abduction','Quad stretch','Ankle rotation','Calf raises'])[1 + (s.i % 5)],
    (ARRAY[15, 20, 10, 25, 15])[1 + (s.i % 5)],
    3,
    (ARRAY[12, 10, 15, 20, 12])[1 + (s.i % 5)],
    (ARRAY[2, 3, 1, 4, 2])[1 + (s.i % 5)],
    NULL,
    now() - (s.i * INTERVAL '1 day') + INTERVAL '17 hours',
    CURRENT_DATE - s.i
FROM generate_series(0, 29) AS s(i)
WHERE s.i % 3 != 2;   -- skip every 3rd day → realistic gaps (20 of 30 days active)

-- Verify counts
SELECT
    COUNT(*)                                     AS total_sessions,
    COUNT(DISTINCT log_date)                     AS days_active,
    SUM(duration_min)                            AS total_minutes,
    ROUND(AVG(pain_level::numeric), 1)           AS avg_pain,
    CASE WHEN COUNT(*) BETWEEN 18 AND 22 THEN 'PASS ✅' ELSE 'FAIL ❌' END AS sessions_check,
    CASE WHEN COUNT(DISTINCT log_date) BETWEEN 18 AND 22 THEN 'PASS ✅' ELSE 'FAIL ❌' END AS days_check
FROM patient_physio_logs
WHERE hospital_id = :'TARGET_HOSPITAL_ID'::uuid
  AND patient_id  = :'TARGET_PATIENT_ID'::uuid;

-- ─── Step 7: Seed VITALS — 30 days, realistic variation ───────────────────
DELETE FROM patient_vitals
WHERE hospital_id = :'TARGET_HOSPITAL_ID'::uuid
  AND patient_id  = :'TARGET_PATIENT_ID'::uuid;

INSERT INTO patient_vitals
    (hospital_id, patient_id, recorded_by_id, recorded_at, log_date,
     bp_systolic, bp_diastolic, heart_rate, temperature_c, spo2, weight_kg, source)
SELECT
    :'TARGET_HOSPITAL_ID'::uuid,
    :'TARGET_PATIENT_ID'::uuid,
    NULL,
    now() - (s.i * INTERVAL '1 day') + INTERVAL '8 hours',
    CURRENT_DATE - s.i,
    110 + (random() * 25)::int,          -- systolic 110–135
    68  + (random() * 15)::int,          -- diastolic 68–83
    65  + (random() * 20)::int,          -- heart rate 65–85
    36.1 + round((random() * 1.0)::numeric, 1),  -- temp 36.1–37.1
    96  + (random() * 4)::int,           -- SpO2 96–100
    70.0 + round((random() * 5.0)::numeric, 1),  -- weight 70–75 kg
    'self'
FROM generate_series(0, 29) AS s(i);

-- Verify 30 data points
SELECT
    COUNT(*)                  AS vitals_count,
    COUNT(DISTINCT log_date)  AS days_with_data,
    ROUND(AVG(bp_systolic), 0)  AS avg_systolic,
    ROUND(AVG(heart_rate), 0)   AS avg_hr,
    MIN(spo2)                   AS min_spo2,
    CASE WHEN COUNT(*) = 30 THEN 'PASS ✅' ELSE 'FAIL ❌' END AS count_check
FROM patient_vitals
WHERE hospital_id = :'TARGET_HOSPITAL_ID'::uuid
  AND patient_id  = :'TARGET_PATIENT_ID'::uuid;

-- Verify the 30-day trend query returns one row per day (DISTINCT ON pattern)
SELECT
    '30-day trend distinct rows: ' || COUNT(*) ||
    CASE WHEN COUNT(*) = 30 THEN ' PASS ✅' ELSE ' FAIL ❌' END AS trend_check
FROM (
    SELECT DISTINCT ON (log_date) log_date, bp_systolic, heart_rate, spo2
    FROM patient_vitals
    WHERE hospital_id = :'TARGET_HOSPITAL_ID'::uuid
      AND patient_id  = :'TARGET_PATIENT_ID'::uuid
      AND log_date   >= CURRENT_DATE - INTERVAL '30 days'
    ORDER BY log_date DESC, recorded_at DESC
) trend;

-- ─── Step 8: Verify global health tips seeded ─────────────────────────────
SELECT
    'Global health tips: ' || COUNT(*) ||
    CASE WHEN COUNT(*) >= 15 THEN ' PASS ✅' ELSE ' FAIL ❌ — re-run startup seed' END AS tips_check
FROM health_tips
WHERE hospital_id IS NULL
  AND is_active = true;

-- Check category distribution
SELECT category, COUNT(*) AS tips
FROM health_tips
WHERE hospital_id IS NULL
GROUP BY category
ORDER BY category;

-- ─── Step 9: CROSS-TENANT ISOLATION TESTS ─────────────────────────────────
-- These verify that Patient A's data is invisible when queried under Hospital B's session.

-- 9a: Set current session to OTHER_HOSPITAL_ID and query TARGET_PATIENT's data
SET app.current_hospital_id = :'OTHER_HOSPITAL_ID';

SELECT
    'Cross-tenant mood isolation: ' ||
    CASE WHEN COUNT(*) = 0 THEN 'PASS ✅ (0 rows leaked)' ELSE 'FAIL ❌ (' || COUNT(*) || ' rows visible!)' END
FROM patient_mood_logs
WHERE patient_id = :'TARGET_PATIENT_ID'::uuid;

SELECT
    'Cross-tenant vitals isolation: ' ||
    CASE WHEN COUNT(*) = 0 THEN 'PASS ✅ (0 rows leaked)' ELSE 'FAIL ❌ (' || COUNT(*) || ' rows visible!)' END
FROM patient_vitals
WHERE patient_id = :'TARGET_PATIENT_ID'::uuid;

SELECT
    'Cross-tenant water isolation: ' ||
    CASE WHEN COUNT(*) = 0 THEN 'PASS ✅ (0 rows leaked)' ELSE 'FAIL ❌ (' || COUNT(*) || ' rows visible!)' END
FROM patient_water_logs
WHERE patient_id = :'TARGET_PATIENT_ID'::uuid;

-- 9b: Verify global health tips ARE still visible from other hospital session
SELECT
    'Global tips visible cross-tenant: ' ||
    CASE WHEN COUNT(*) >= 15 THEN 'PASS ✅' ELSE 'FAIL ❌' END
FROM health_tips
WHERE hospital_id IS NULL AND is_active = true;

-- Restore session to target hospital
SET app.current_hospital_id = :'TARGET_HOSPITAL_ID';

-- ─── Step 10: EDGE CASE — Empty range physio report ───────────────────────
SELECT
    'Physio report — future date range (no data): ' ||
    CASE WHEN COUNT(*) = 0 THEN 'PASS ✅ (graceful empty)' ELSE 'FAIL ❌' END
FROM patient_physio_logs
WHERE patient_id = :'TARGET_PATIENT_ID'::uuid
  AND log_date BETWEEN CURRENT_DATE + 1 AND CURRENT_DATE + 30;

-- ─── Step 11: EDGE CASE — Vitals sparse trend (3 of 30 days) ─────────────
-- Delete most vitals, leave only 3 days to test sparse trend handling
DELETE FROM patient_vitals
WHERE hospital_id = :'TARGET_HOSPITAL_ID'::uuid
  AND patient_id  = :'TARGET_PATIENT_ID'::uuid
  AND log_date NOT IN (CURRENT_DATE, CURRENT_DATE - 7, CURRENT_DATE - 14);

SELECT
    'Sparse vitals trend (3 of 30 days): ' || COUNT(*) || ' rows returned' ||
    CASE WHEN COUNT(*) = 3 THEN ' PASS ✅' ELSE ' FAIL ❌' END AS sparse_check
FROM (
    SELECT DISTINCT ON (log_date) log_date
    FROM patient_vitals
    WHERE hospital_id = :'TARGET_HOSPITAL_ID'::uuid
      AND patient_id  = :'TARGET_PATIENT_ID'::uuid
      AND log_date   >= CURRENT_DATE - INTERVAL '30 days'
    ORDER BY log_date DESC, recorded_at DESC
) trend;

-- Restore full 30-day vitals
INSERT INTO patient_vitals
    (hospital_id, patient_id, recorded_by_id, recorded_at, log_date,
     bp_systolic, bp_diastolic, heart_rate, temperature_c, spo2, weight_kg, source)
SELECT
    :'TARGET_HOSPITAL_ID'::uuid,
    :'TARGET_PATIENT_ID'::uuid,
    NULL,
    now() - (s.i * INTERVAL '1 day') + INTERVAL '8 hours',
    CURRENT_DATE - s.i,
    118, 76, 72, 36.6, 98, 71.2, 'self'
FROM generate_series(0, 29) AS s(i)
WHERE CURRENT_DATE - s.i NOT IN (
    SELECT log_date FROM patient_vitals
    WHERE patient_id = :'TARGET_PATIENT_ID'::uuid
);

-- ─── Step 12: EDGE CASE — Water log same-day-only delete ──────────────────
-- Insert a yesterday log and verify it cannot be deleted via the "same-day" rule
INSERT INTO patient_water_logs (hospital_id, patient_id, log_date, amount_ml, logged_at)
VALUES (:'TARGET_HOSPITAL_ID'::uuid, :'TARGET_PATIENT_ID'::uuid,
        CURRENT_DATE - 1, 200, now() - INTERVAL '1 day')
ON CONFLICT DO NOTHING;

SELECT
    'Yesterday water log exists (id to use in DELETE test): ' || id
FROM patient_water_logs
WHERE patient_id = :'TARGET_PATIENT_ID'::uuid
  AND log_date   = CURRENT_DATE - 1
LIMIT 1;
-- Expected API response: DELETE /api/patient/water/log/{id} → 400
-- {"error":"Only today's water log entries can be removed."}

-- Clean up test entry
DELETE FROM patient_water_logs
WHERE patient_id = :'TARGET_PATIENT_ID'::uuid
  AND log_date   = CURRENT_DATE - 1;

-- ─── Step 13: FINAL SUMMARY ───────────────────────────────────────────────
SELECT '══════════════ SEED COMPLETE ══════════════' AS separator;

SELECT
    (SELECT COUNT(*) FROM patient_mood_logs     WHERE patient_id = :'TARGET_PATIENT_ID'::uuid) AS mood_rows,
    (SELECT COUNT(*) FROM patient_water_settings WHERE patient_id = :'TARGET_PATIENT_ID'::uuid) AS water_settings_rows,
    (SELECT COUNT(*) FROM patient_water_logs    WHERE patient_id = :'TARGET_PATIENT_ID'::uuid) AS water_log_rows,
    (SELECT COUNT(*) FROM patient_physio_logs   WHERE patient_id = :'TARGET_PATIENT_ID'::uuid) AS physio_rows,
    (SELECT COUNT(*) FROM patient_vitals        WHERE patient_id = :'TARGET_PATIENT_ID'::uuid) AS vitals_rows,
    (SELECT COUNT(*) FROM health_tips           WHERE hospital_id IS NULL) AS global_tips;

-- ─── Step 14: MANUAL API VERIFICATION CHECKLIST ───────────────────────────
-- Run these curl commands with a valid patient JWT (replace $TOKEN):
--
-- 1. MOOD
--    GET  /api/patient/mood/today          → 200 with mood_score=5, mood_label=great
--    POST /api/patient/mood {mood_score:3,mood_label:"okay"} → 200, overwrites today
--    GET  /api/patient/mood/today          → 200 with mood_score=3 (overwrite confirmed)
--
-- 2. WATER
--    GET  /api/patient/water/settings      → today_total_ml=1000, progress_pct=40
--    POST /api/patient/water/log {amount_ml:500} → today_total_ml=1500, pct=60
--    PUT  /api/patient/water/settings {daily_goal_ml:3000} → goal updated
--    DELETE /api/patient/water/log/{yesterday_id} → 400 "Only today's entries"
--
-- 3. PHYSIO
--    GET  /api/patient/physio/today        → sessions list
--    POST /api/patient/physio {activity_name:"Knee flexion",duration_min:20} → 201
--    GET  /api/patient/physio/report?from=2026-03-01&to=2026-03-30 → report
--    GET  /api/patient/physio/report?from=2026-01-01&to=2030-12-31 → capped to 365 days
--
-- 4. VITALS
--    GET  /api/patient/vitals/latest       → most recent reading
--    POST /api/patient/vitals {bp_systolic:300} → 400 "must be 50–250"
--    POST /api/patient/vitals {bp_systolic:120,bp_diastolic:80,heart_rate:72} → 201
--    GET  /api/patient/vitals/trend        → 30 daily data points
--
-- 5. HEALTH TIPS
--    GET  /api/patient/health-tips         → 5 rotating global tips
--    GET  /api/patient/health-tips?category=nutrition → nutrition tips only
--
-- 6. CROSS-TENANT PROBE (use Patient A token against Patient B data — expect 403/empty)
--    Any endpoint returns only the authenticated patient's own data.
--    EF Core query filter + RLS policy both enforce this independently.
