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
