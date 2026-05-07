using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NalamApi.Migrations;

/// <inheritdoc />
public partial class AddVitalsTiers : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(@"
            -- ══════════════════════════════════════════════════════════════
            --  TIER 2: HOURLY AGGREGATES (2-year retention)
            --  One row per hour with min/max/avg/latest stats
            -- ══════════════════════════════════════════════════════════════
            CREATE TABLE IF NOT EXISTS patient_vitals_hourly (
                id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
                hospital_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
                patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
                
                hr_min smallint,
                hr_max smallint,
                hr_avg numeric(5,1),
                hr_latest smallint,
                hr_count integer,
                
                spo2_min smallint,
                spo2_max smallint,
                spo2_avg numeric(5,1),
                spo2_latest smallint,
                spo2_count integer,
                
                temp_min numeric(4,1),
                temp_max numeric(4,1),
                temp_avg numeric(4,1),
                temp_latest numeric(4,1),
                temp_count integer,
                
                hour_start timestamptz NOT NULL,
                data_quality varchar(20),
                created_at timestamptz DEFAULT now(),
                
                CONSTRAINT uq_vitals_hourly UNIQUE (hospital_id, patient_id, hour_start)
            );

            CREATE INDEX ix_vitals_hourly_patient_time 
                ON patient_vitals_hourly(hospital_id, patient_id, hour_start DESC);

            -- ══════════════════════════════════════════════════════════════
            --  TIER 3: DAILY SUMMARIES (5+ year compliance archive)
            --  One row per day with daily stats + morning/evening snapshots
            -- ══════════════════════════════════════════════════════════════
            CREATE TABLE IF NOT EXISTS patient_vitals_daily (
                id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
                hospital_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
                patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
                
                hr_min smallint,
                hr_max smallint,
                hr_avg numeric(5,1),
                hr_morning smallint,
                hr_evening smallint,
                
                spo2_min smallint,
                spo2_max smallint,
                spo2_avg numeric(5,1),
                spo2_morning smallint,
                spo2_evening smallint,
                
                temp_min numeric(4,1),
                temp_max numeric(4,1),
                temp_avg numeric(4,1),
                
                log_date date NOT NULL,
                readings_count integer,
                data_quality varchar(20),
                created_at timestamptz DEFAULT now(),
                
                CONSTRAINT uq_vitals_daily UNIQUE (hospital_id, patient_id, log_date)
            );

            CREATE INDEX ix_vitals_daily_patient_date 
                ON patient_vitals_daily(hospital_id, patient_id, log_date DESC);

            -- Track last aggregation run time (prevents duplicate aggregations)
            CREATE TABLE IF NOT EXISTS vitals_aggregation_log (
                id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
                job_type varchar(50) NOT NULL,  -- 'hourly' or 'daily'
                last_run timestamptz NOT NULL,
                next_run timestamptz NOT NULL,
                status varchar(20),  -- 'success' or 'failed'
                error_message text,
                CONSTRAINT uq_aggregation_log UNIQUE (job_type)
            );
        ");
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(@"
            DROP TABLE IF EXISTS vitals_aggregation_log;
            DROP TABLE IF EXISTS patient_vitals_daily;
            DROP TABLE IF EXISTS patient_vitals_hourly;
        ");
    }
}
