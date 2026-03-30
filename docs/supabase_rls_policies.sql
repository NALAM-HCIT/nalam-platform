-- ==============================================================================
-- NALAM BACKEND — POSTGRESQL ROW-LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
-- Description: Defense Layer 4 
-- Enforces hard tenant isolation at the database level. 
-- These policies rely on the 'app.current_hospital_id' session variable 
-- injected by the ASP.NET Core TenantMiddleware.
-- ==============================================================================

-- 1. Enable RLS on all tenant-specific tables
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "departments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "hospital_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "otp_verifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "hospitals" ENABLE ROW LEVEL SECURITY;

-- 2. Hospitals Policy
-- Anyone can register/read a hospital, but can only update their own
CREATE POLICY "Hospitals Read All" ON "hospitals" FOR SELECT USING (true);
CREATE POLICY "Hospitals Insert All" ON "hospitals" FOR INSERT WITH CHECK (true);
CREATE POLICY "Hospitals Tenant Isolation" ON "hospitals" 
    FOR UPDATE 
    USING ("id" = (current_setting('app.current_hospital_id', true))::uuid);

-- 3. Users Policy
CREATE POLICY "Users Tenant Isolation" ON "users"
    AS PERMISSIVE FOR ALL
    USING ("hospital_id" = (current_setting('app.current_hospital_id', true))::uuid);

-- 4. Departments Policy
CREATE POLICY "Departments Tenant Isolation" ON "departments"
    AS PERMISSIVE FOR ALL
    USING ("hospital_id" = (current_setting('app.current_hospital_id', true))::uuid);

-- 5. Hospital Settings Policy
CREATE POLICY "Settings Tenant Isolation" ON "hospital_settings"
    AS PERMISSIVE FOR ALL
    USING ("hospital_id" = (current_setting('app.current_hospital_id', true))::uuid);

-- 6. Audit Logs Policy
CREATE POLICY "Audit Logs Tenant Isolation" ON "audit_logs"
    AS PERMISSIVE FOR ALL
    USING ("hospital_id" = (current_setting('app.current_hospital_id', true))::uuid);

-- 7. OTP Verifications Policy (Indirect isolation via Users table)
CREATE POLICY "OTP Tenant Isolation" ON "otp_verifications"
    AS PERMISSIVE FOR ALL
    USING (
        "user_id" IN (
            SELECT "id" FROM "users" 
            WHERE "hospital_id" = (current_setting('app.current_hospital_id', true))::uuid
        )
    );

-- NOTE FOR SUPABASE: By default, the 'postgres' role bypasses RLS.
-- This is fine because the API uses its own connection/role, or EF Core
-- Global Query Filters already handle protection if using the postgres role.


-- ==============================================================================
-- PATIENT DASHBOARD TABLES — RLS POLICIES (added Phase 4)
-- All five tables enforce hospital-level isolation via the same session variable.
-- health_tips uses two policies: SELECT allows global tips (hospital_id IS NULL),
-- while write operations are restricted to hospital-specific rows only.
-- ==============================================================================

ALTER TABLE patient_mood_logs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_water_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_water_logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_physio_logs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_vitals         ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_tips            ENABLE ROW LEVEL SECURITY;

-- 8. Mood Logs
CREATE POLICY "MoodLogs Tenant Isolation" ON patient_mood_logs
    AS PERMISSIVE FOR ALL
    USING (hospital_id = (current_setting('app.current_hospital_id', true))::uuid);

-- 9. Water Settings
CREATE POLICY "WaterSettings Tenant Isolation" ON patient_water_settings
    AS PERMISSIVE FOR ALL
    USING (hospital_id = (current_setting('app.current_hospital_id', true))::uuid);

-- 10. Water Logs
CREATE POLICY "WaterLogs Tenant Isolation" ON patient_water_logs
    AS PERMISSIVE FOR ALL
    USING (hospital_id = (current_setting('app.current_hospital_id', true))::uuid);

-- 11. Physio Logs
CREATE POLICY "PhysioLogs Tenant Isolation" ON patient_physio_logs
    AS PERMISSIVE FOR ALL
    USING (hospital_id = (current_setting('app.current_hospital_id', true))::uuid);

-- 12. Patient Vitals
CREATE POLICY "PatientVitals Tenant Isolation" ON patient_vitals
    AS PERMISSIVE FOR ALL
    USING (hospital_id = (current_setting('app.current_hospital_id', true))::uuid);

-- 13. Health Tips — SELECT allows global tips; mutations restricted to hospital scope
CREATE POLICY "HealthTips Read" ON health_tips
    AS PERMISSIVE FOR SELECT
    USING (
        hospital_id IS NULL
        OR hospital_id = (current_setting('app.current_hospital_id', true))::uuid
    );

CREATE POLICY "HealthTips Write" ON health_tips
    AS PERMISSIVE FOR ALL
    USING (hospital_id = (current_setting('app.current_hospital_id', true))::uuid)
    WITH CHECK (hospital_id = (current_setting('app.current_hospital_id', true))::uuid);
