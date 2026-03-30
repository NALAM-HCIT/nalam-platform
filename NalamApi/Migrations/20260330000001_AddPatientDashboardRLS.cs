using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NalamApi.Migrations;

/// <summary>
/// Defense Layer 4: PostgreSQL Row-Level Security policies for all five
/// patient dashboard tables added in 20260330000000_AddPatientDashboardTables.
///
/// Each policy enforces hospital-level isolation using the
/// 'app.current_hospital_id' session variable injected by TenantMiddleware.
/// This is a belt-and-suspenders complement to:
///   • Defense Layer 1: JWT hospital_id claim
///   • Defense Layer 2: TenantMiddleware session variable
///   • Defense Layer 3: EF Core Global Query Filters
/// </summary>
public partial class AddPatientDashboardRLS : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(@"
            -- ══════════════════════════════════════════════════════════════════════
            --  ENABLE ROW-LEVEL SECURITY
            -- ══════════════════════════════════════════════════════════════════════

            ALTER TABLE patient_mood_logs     ENABLE ROW LEVEL SECURITY;
            ALTER TABLE patient_water_settings ENABLE ROW LEVEL SECURITY;
            ALTER TABLE patient_water_logs    ENABLE ROW LEVEL SECURITY;
            ALTER TABLE patient_physio_logs   ENABLE ROW LEVEL SECURITY;
            ALTER TABLE patient_vitals        ENABLE ROW LEVEL SECURITY;
            ALTER TABLE health_tips           ENABLE ROW LEVEL SECURITY;

            -- ══════════════════════════════════════════════════════════════════════
            --  MOOD LOGS — full isolation by hospital_id
            -- ══════════════════════════════════════════════════════════════════════

            DROP POLICY IF EXISTS ""MoodLogs Tenant Isolation"" ON patient_mood_logs;
            CREATE POLICY ""MoodLogs Tenant Isolation"" ON patient_mood_logs
                AS PERMISSIVE FOR ALL
                USING (
                    hospital_id = (current_setting('app.current_hospital_id', true))::uuid
                );

            -- ══════════════════════════════════════════════════════════════════════
            --  WATER SETTINGS — full isolation by hospital_id
            -- ══════════════════════════════════════════════════════════════════════

            DROP POLICY IF EXISTS ""WaterSettings Tenant Isolation"" ON patient_water_settings;
            CREATE POLICY ""WaterSettings Tenant Isolation"" ON patient_water_settings
                AS PERMISSIVE FOR ALL
                USING (
                    hospital_id = (current_setting('app.current_hospital_id', true))::uuid
                );

            -- ══════════════════════════════════════════════════════════════════════
            --  WATER LOGS — full isolation by hospital_id
            -- ══════════════════════════════════════════════════════════════════════

            DROP POLICY IF EXISTS ""WaterLogs Tenant Isolation"" ON patient_water_logs;
            CREATE POLICY ""WaterLogs Tenant Isolation"" ON patient_water_logs
                AS PERMISSIVE FOR ALL
                USING (
                    hospital_id = (current_setting('app.current_hospital_id', true))::uuid
                );

            -- ══════════════════════════════════════════════════════════════════════
            --  PHYSIO LOGS — full isolation by hospital_id
            -- ══════════════════════════════════════════════════════════════════════

            DROP POLICY IF EXISTS ""PhysioLogs Tenant Isolation"" ON patient_physio_logs;
            CREATE POLICY ""PhysioLogs Tenant Isolation"" ON patient_physio_logs
                AS PERMISSIVE FOR ALL
                USING (
                    hospital_id = (current_setting('app.current_hospital_id', true))::uuid
                );

            -- ══════════════════════════════════════════════════════════════════════
            --  PATIENT VITALS — full isolation by hospital_id
            -- ══════════════════════════════════════════════════════════════════════

            DROP POLICY IF EXISTS ""PatientVitals Tenant Isolation"" ON patient_vitals;
            CREATE POLICY ""PatientVitals Tenant Isolation"" ON patient_vitals
                AS PERMISSIVE FOR ALL
                USING (
                    hospital_id = (current_setting('app.current_hospital_id', true))::uuid
                );

            -- ══════════════════════════════════════════════════════════════════════
            --  HEALTH TIPS — two policies:
            --    SELECT: hospital-specific tips OR global tips (hospital_id IS NULL)
            --    INSERT/UPDATE/DELETE: hospital-specific tips only (admins manage their own)
            -- ══════════════════════════════════════════════════════════════════════

            DROP POLICY IF EXISTS ""HealthTips Read"" ON health_tips;
            CREATE POLICY ""HealthTips Read"" ON health_tips
                AS PERMISSIVE FOR SELECT
                USING (
                    hospital_id IS NULL
                    OR hospital_id = (current_setting('app.current_hospital_id', true))::uuid
                );

            DROP POLICY IF EXISTS ""HealthTips Write"" ON health_tips;
            CREATE POLICY ""HealthTips Write"" ON health_tips
                AS PERMISSIVE FOR ALL
                USING (
                    hospital_id = (current_setting('app.current_hospital_id', true))::uuid
                )
                WITH CHECK (
                    hospital_id = (current_setting('app.current_hospital_id', true))::uuid
                );
        ");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(@"
            DROP POLICY IF EXISTS ""MoodLogs Tenant Isolation""     ON patient_mood_logs;
            DROP POLICY IF EXISTS ""WaterSettings Tenant Isolation"" ON patient_water_settings;
            DROP POLICY IF EXISTS ""WaterLogs Tenant Isolation""     ON patient_water_logs;
            DROP POLICY IF EXISTS ""PhysioLogs Tenant Isolation""    ON patient_physio_logs;
            DROP POLICY IF EXISTS ""PatientVitals Tenant Isolation"" ON patient_vitals;
            DROP POLICY IF EXISTS ""HealthTips Read""                ON health_tips;
            DROP POLICY IF EXISTS ""HealthTips Write""               ON health_tips;

            ALTER TABLE patient_mood_logs      DISABLE ROW LEVEL SECURITY;
            ALTER TABLE patient_water_settings DISABLE ROW LEVEL SECURITY;
            ALTER TABLE patient_water_logs     DISABLE ROW LEVEL SECURITY;
            ALTER TABLE patient_physio_logs    DISABLE ROW LEVEL SECURITY;
            ALTER TABLE patient_vitals         DISABLE ROW LEVEL SECURITY;
            ALTER TABLE health_tips            DISABLE ROW LEVEL SECURITY;
        ");
    }
}
