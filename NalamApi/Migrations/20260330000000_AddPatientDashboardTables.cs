using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NalamApi.Migrations;

/// <inheritdoc />
public partial class AddPatientDashboardTables : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(@"
            -- ══════════════════════════════════════════════════════════════
            --  1. MOOD / FEELING LOG
            --     One entry per patient per calendar day per hospital.
            --     ON CONFLICT (hospital_id, patient_id, log_date) DO UPDATE
            --     enforces the overwrite-latest logic at insert time.
            -- ══════════════════════════════════════════════════════════════
            CREATE TABLE IF NOT EXISTS patient_mood_logs (
                id          uuid         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
                hospital_id uuid         NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
                patient_id  uuid         NOT NULL REFERENCES patients(id)  ON DELETE CASCADE,
                log_date    date         NOT NULL,
                mood_score  smallint     NOT NULL CHECK (mood_score BETWEEN 1 AND 5),
                mood_label  varchar(20)  NOT NULL,
                mood_note   varchar(500) NULL,
                logged_at   timestamptz  NOT NULL DEFAULT now(),

                CONSTRAINT uq_mood_patient_day UNIQUE (hospital_id, patient_id, log_date)
            );

            CREATE INDEX IF NOT EXISTS ix_mood_patient_date
                ON patient_mood_logs (hospital_id, patient_id, log_date DESC);

            -- ══════════════════════════════════════════════════════════════
            --  2. WATER INTAKE SETTINGS
            --     One row per patient — goal + reminder preferences.
            --     Upserted via ON CONFLICT (hospital_id, patient_id).
            -- ══════════════════════════════════════════════════════════════
            CREATE TABLE IF NOT EXISTS patient_water_settings (
                id                   uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
                hospital_id          uuid        NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
                patient_id           uuid        NOT NULL REFERENCES patients(id)  ON DELETE CASCADE,
                daily_goal_ml        integer     NOT NULL DEFAULT 2000,
                reminder_enabled     boolean     NOT NULL DEFAULT false,
                reminder_interval_h  smallint    NOT NULL DEFAULT 2,
                reminder_start_time  time        NOT NULL DEFAULT '08:00',
                reminder_end_time    time        NOT NULL DEFAULT '22:00',
                updated_at           timestamptz NOT NULL DEFAULT now(),

                CONSTRAINT uq_water_settings_patient UNIQUE (hospital_id, patient_id)
            );

            -- ══════════════════════════════════════════════════════════════
            --  3. WATER INTAKE DAILY LOG
            --     Each row is one glass/cup the patient logs.
            -- ══════════════════════════════════════════════════════════════
            CREATE TABLE IF NOT EXISTS patient_water_logs (
                id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
                hospital_id uuid        NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
                patient_id  uuid        NOT NULL REFERENCES patients(id)  ON DELETE CASCADE,
                log_date    date        NOT NULL DEFAULT CURRENT_DATE,
                amount_ml   integer     NOT NULL CHECK (amount_ml > 0),
                logged_at   timestamptz NOT NULL DEFAULT now()
            );

            CREATE INDEX IF NOT EXISTS ix_water_logs_patient_date
                ON patient_water_logs (hospital_id, patient_id, log_date DESC);

            -- ══════════════════════════════════════════════════════════════
            --  4. PHYSIOTHERAPY ACTIVITY LOG
            --     Each row is one exercise session logged by the patient.
            -- ══════════════════════════════════════════════════════════════
            CREATE TABLE IF NOT EXISTS patient_physio_logs (
                id            uuid         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
                hospital_id   uuid         NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
                patient_id    uuid         NOT NULL REFERENCES patients(id)  ON DELETE CASCADE,
                activity_name varchar(200) NOT NULL,
                duration_min  smallint     NOT NULL CHECK (duration_min > 0),
                sets          smallint     NULL,
                reps          smallint     NULL,
                pain_level    smallint     NULL CHECK (pain_level BETWEEN 0 AND 10),
                notes         varchar(1000) NULL,
                performed_at  timestamptz  NOT NULL DEFAULT now(),
                log_date      date         NOT NULL DEFAULT CURRENT_DATE
            );

            CREATE INDEX IF NOT EXISTS ix_physio_patient_date
                ON patient_physio_logs (hospital_id, patient_id, log_date DESC);

            -- ══════════════════════════════════════════════════════════════
            --  5. PATIENT VITALS
            --     Every reading is stored; the API picks the latest per day
            --     for the 30-day trend using DISTINCT ON (log_date).
            -- ══════════════════════════════════════════════════════════════
            CREATE TABLE IF NOT EXISTS patient_vitals (
                id               uuid          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
                hospital_id      uuid          NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
                patient_id       uuid          NOT NULL REFERENCES patients(id)  ON DELETE CASCADE,
                recorded_by_id   uuid          NULL     REFERENCES users(id)     ON DELETE SET NULL,
                recorded_at      timestamptz   NOT NULL DEFAULT now(),
                log_date         date          NOT NULL DEFAULT CURRENT_DATE,
                bp_systolic      smallint      NULL CHECK (bp_systolic  BETWEEN 50 AND 250),
                bp_diastolic     smallint      NULL CHECK (bp_diastolic BETWEEN 30 AND 150),
                heart_rate       smallint      NULL CHECK (heart_rate   BETWEEN 30 AND 250),
                temperature_c    numeric(4,1)  NULL CHECK (temperature_c BETWEEN 34 AND 43),
                spo2             smallint      NULL CHECK (spo2 BETWEEN 70 AND 100),
                respiratory_rate smallint      NULL CHECK (respiratory_rate BETWEEN 5 AND 60),
                weight_kg        numeric(5,1)  NULL,
                height_cm        numeric(5,1)  NULL,
                blood_glucose    numeric(5,1)  NULL,
                source           varchar(20)   NOT NULL DEFAULT 'self'
            );

            CREATE INDEX IF NOT EXISTS ix_vitals_patient_date
                ON patient_vitals (hospital_id, patient_id, log_date DESC, recorded_at DESC);

            -- ══════════════════════════════════════════════════════════════
            --  6. HEALTH TIPS
            --     hospital_id NULL = global tip shown to all hospitals.
            --     hospital_id set  = hospital-specific tip (overrides / adds to global).
            -- ══════════════════════════════════════════════════════════════
            CREATE TABLE IF NOT EXISTS health_tips (
                id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
                hospital_id uuid        NULL     REFERENCES hospitals(id) ON DELETE CASCADE,
                title       varchar(200) NOT NULL,
                body        text        NOT NULL,
                category    varchar(50) NOT NULL DEFAULT 'general',
                icon_name   varchar(50) NULL,
                is_active   boolean     NOT NULL DEFAULT true,
                valid_from  date        NULL,
                valid_until date        NULL,
                sort_order  integer     NOT NULL DEFAULT 0,
                created_at  timestamptz NOT NULL DEFAULT now()
            );

            CREATE INDEX IF NOT EXISTS ix_health_tips_active
                ON health_tips (hospital_id, is_active, category);
        ");

        // ── Seed global health tips (hospital_id = NULL, visible to all) ──
        migrationBuilder.Sql(@"
            INSERT INTO health_tips (id, hospital_id, title, body, category, icon_name, sort_order)
            SELECT gen_random_uuid(), NULL, v.title, v.body, v.category, v.icon_name, v.sort_order
            FROM (VALUES
                ('Stay Hydrated',
                 'Drink at least 8 glasses (2 litres) of water daily. Proper hydration supports kidney function, energy levels, and skin health.',
                 'nutrition', 'water-outline', 1),

                ('Move Every Hour',
                 'Sitting for long periods increases health risks. Stand up and walk for 2–3 minutes every hour to keep your circulation active.',
                 'exercise', 'walk-outline', 2),

                ('Eat a Rainbow',
                 'Include colourful fruits and vegetables in every meal. Different colours provide different vitamins, minerals, and antioxidants.',
                 'nutrition', 'nutrition-outline', 3),

                ('Prioritise Sleep',
                 'Adults need 7–9 hours of quality sleep. Good sleep improves memory, mood, immunity, and heart health.',
                 'general', 'moon-outline', 4),

                ('Practice Deep Breathing',
                 'Take 5 slow deep breaths (inhale 4s, hold 4s, exhale 6s) whenever you feel stressed. It activates your body''s natural calming response.',
                 'mental', 'pulse-outline', 5),

                ('Limit Added Sugar',
                 'Excess sugar contributes to weight gain, inflammation, and diabetes risk. Swap sugary drinks for water, coconut water, or herbal tea.',
                 'nutrition', 'cafe-outline', 6),

                ('Wash Hands Frequently',
                 'Handwashing with soap for 20 seconds is one of the most effective ways to prevent the spread of infections and illness.',
                 'general', 'hand-left-outline', 7),

                ('Take the Stairs',
                 'Climbing stairs burns more calories per minute than jogging and strengthens your legs and heart. Skip the lift when you can.',
                 'exercise', 'trending-up-outline', 8),

                ('Mind Your Posture',
                 'Poor posture leads to back and neck pain. Keep your screen at eye level, shoulders relaxed, and feet flat on the floor when sitting.',
                 'general', 'body-outline', 9),

                ('Connect with Others',
                 'Strong social connections reduce stress and improve mental health. Call a friend or spend 10 minutes with a family member today.',
                 'mental', 'people-outline', 10),

                ('Eat Mindfully',
                 'Slow down and savour each bite. Eating without distractions helps you recognise fullness, improves digestion, and reduces overeating.',
                 'nutrition', 'restaurant-outline', 11),

                ('Protect Your Eyes',
                 'Follow the 20-20-20 rule: every 20 minutes, look at something 20 feet away for 20 seconds to reduce digital eye strain.',
                 'general', 'eye-outline', 12),

                ('Stretch Daily',
                 'Just 10 minutes of stretching in the morning improves flexibility, reduces injury risk, and boosts circulation for the day ahead.',
                 'exercise', 'fitness-outline', 13),

                ('Limit Screen Time Before Bed',
                 'Blue light from phones and tablets disrupts melatonin production. Switch off screens at least 30 minutes before you sleep.',
                 'mental', 'phone-portrait-outline', 14),

                ('Know Your Numbers',
                 'Regularly monitor your blood pressure, blood sugar, and weight. Early detection of changes allows timely medical attention.',
                 'general', 'stats-chart-outline', 15)
            ) AS v(title, body, category, icon_name, sort_order)
            WHERE NOT EXISTS (SELECT 1 FROM health_tips WHERE hospital_id IS NULL LIMIT 1);
        ");
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(@"
            DROP TABLE IF EXISTS health_tips;
            DROP TABLE IF EXISTS patient_vitals;
            DROP TABLE IF EXISTS patient_physio_logs;
            DROP TABLE IF EXISTS patient_water_logs;
            DROP TABLE IF EXISTS patient_water_settings;
            DROP TABLE IF EXISTS patient_mood_logs;
        ");
    }
}
