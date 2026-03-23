CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
    "MigrationId" character varying(150) NOT NULL,
    "ProductVersion" character varying(32) NOT NULL,
    CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY ("MigrationId")
);

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260321164522_InitialCreate') THEN
    CREATE TABLE hospitals (
        id uuid NOT NULL,
        name character varying(200) NOT NULL,
        license_no character varying(100),
        address character varying(500),
        city character varying(100),
        state character varying(100),
        phone character varying(20) NOT NULL,
        email character varying(200),
        logo_url character varying(500),
        status character varying(20) NOT NULL,
        created_at timestamp with time zone NOT NULL,
        CONSTRAINT "PK_hospitals" PRIMARY KEY (id)
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260321164522_InitialCreate') THEN
    CREATE TABLE departments (
        id uuid NOT NULL,
        hospital_id uuid NOT NULL,
        name character varying(100) NOT NULL,
        is_active boolean NOT NULL,
        CONSTRAINT "PK_departments" PRIMARY KEY (id),
        CONSTRAINT "FK_departments_hospitals_hospital_id" FOREIGN KEY (hospital_id) REFERENCES hospitals (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260321164522_InitialCreate') THEN
    CREATE TABLE hospital_settings (
        id uuid NOT NULL,
        hospital_id uuid NOT NULL,
        key character varying(100) NOT NULL,
        value text,
        updated_at timestamp with time zone NOT NULL,
        CONSTRAINT "PK_hospital_settings" PRIMARY KEY (id),
        CONSTRAINT "FK_hospital_settings_hospitals_hospital_id" FOREIGN KEY (hospital_id) REFERENCES hospitals (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260321164522_InitialCreate') THEN
    CREATE TABLE users (
        id uuid NOT NULL,
        hospital_id uuid NOT NULL,
        full_name character varying(200) NOT NULL,
        mobile_number character varying(20) NOT NULL,
        email character varying(200),
        role character varying(30) NOT NULL,
        department character varying(100),
        employee_id character varying(50),
        profile_photo_url character varying(500),
        status character varying(20) NOT NULL,
        is_verified boolean NOT NULL,
        created_at timestamp with time zone NOT NULL,
        last_login timestamp with time zone,
        CONSTRAINT "PK_users" PRIMARY KEY (id),
        CONSTRAINT "FK_users_hospitals_hospital_id" FOREIGN KEY (hospital_id) REFERENCES hospitals (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260321164522_InitialCreate') THEN
    CREATE TABLE audit_logs (
        id uuid NOT NULL,
        hospital_id uuid NOT NULL,
        user_id uuid,
        action character varying(200) NOT NULL,
        category character varying(30) NOT NULL,
        severity character varying(20) NOT NULL,
        details text,
        created_at timestamp with time zone NOT NULL,
        CONSTRAINT "PK_audit_logs" PRIMARY KEY (id),
        CONSTRAINT "FK_audit_logs_hospitals_hospital_id" FOREIGN KEY (hospital_id) REFERENCES hospitals (id) ON DELETE CASCADE,
        CONSTRAINT "FK_audit_logs_users_user_id" FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260321164522_InitialCreate') THEN
    CREATE TABLE otp_verifications (
        id uuid NOT NULL,
        user_id uuid NOT NULL,
        mobile_number character varying(20) NOT NULL,
        otp_code character varying(10) NOT NULL,
        is_used boolean NOT NULL,
        attempt_count integer NOT NULL,
        last_attempt_at timestamp with time zone,
        expires_at timestamp with time zone NOT NULL,
        created_at timestamp with time zone NOT NULL,
        CONSTRAINT "PK_otp_verifications" PRIMARY KEY (id),
        CONSTRAINT "FK_otp_verifications_users_user_id" FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260321164522_InitialCreate') THEN
    CREATE INDEX "IX_audit_logs_hospital_id" ON audit_logs (hospital_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260321164522_InitialCreate') THEN
    CREATE INDEX "IX_audit_logs_user_id" ON audit_logs (user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260321164522_InitialCreate') THEN
    CREATE INDEX "IX_departments_hospital_id" ON departments (hospital_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260321164522_InitialCreate') THEN
    CREATE UNIQUE INDEX ix_settings_hospital_key ON hospital_settings (hospital_id, key);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260321164522_InitialCreate') THEN
    CREATE INDEX "IX_otp_verifications_user_id" ON otp_verifications (user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260321164522_InitialCreate') THEN
    CREATE UNIQUE INDEX ix_users_hospital_employee ON users (hospital_id, employee_id) WHERE employee_id IS NOT NULL;
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260321164522_InitialCreate') THEN
    CREATE UNIQUE INDEX ix_users_hospital_mobile ON users (hospital_id, mobile_number);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260321164522_InitialCreate') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260321164522_InitialCreate', '9.0.1');
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260322165428_AddAppointmentBooking') THEN
    CREATE TABLE doctor_profiles (
        id uuid NOT NULL,
        hospital_id uuid NOT NULL,
        user_id uuid NOT NULL,
        specialty character varying(100) NOT NULL,
        experience_years integer NOT NULL,
        consultation_fee numeric NOT NULL,
        available_for_video boolean NOT NULL,
        available_for_in_person boolean NOT NULL,
        languages character varying(200),
        rating numeric,
        review_count integer NOT NULL,
        bio character varying(500),
        is_accepting_appointments boolean NOT NULL,
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone NOT NULL,
        CONSTRAINT "PK_doctor_profiles" PRIMARY KEY (id),
        CONSTRAINT "FK_doctor_profiles_hospitals_hospital_id" FOREIGN KEY (hospital_id) REFERENCES hospitals (id) ON DELETE CASCADE,
        CONSTRAINT "FK_doctor_profiles_users_user_id" FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260322165428_AddAppointmentBooking') THEN
    CREATE TABLE appointments (
        id uuid NOT NULL,
        hospital_id uuid NOT NULL,
        patient_id uuid NOT NULL,
        doctor_profile_id uuid NOT NULL,
        schedule_date date NOT NULL,
        start_time time without time zone NOT NULL,
        end_time time without time zone NOT NULL,
        consultation_type character varying(20) NOT NULL,
        status character varying(20) NOT NULL,
        consultation_fee numeric NOT NULL,
        tax_amount numeric NOT NULL,
        platform_fee numeric NOT NULL,
        discount_amount numeric NOT NULL,
        total_amount numeric NOT NULL,
        coupon_code character varying(50),
        payment_method character varying(30),
        payment_status character varying(20) NOT NULL,
        booking_reference character varying(50) NOT NULL,
        cancel_reason character varying(200),
        cancelled_at timestamp with time zone,
        cancelled_by uuid,
        notes character varying(500),
        created_at timestamp with time zone NOT NULL,
        updated_at timestamp with time zone NOT NULL,
        CONSTRAINT "PK_appointments" PRIMARY KEY (id),
        CONSTRAINT "FK_appointments_doctor_profiles_doctor_profile_id" FOREIGN KEY (doctor_profile_id) REFERENCES doctor_profiles (id) ON DELETE CASCADE,
        CONSTRAINT "FK_appointments_hospitals_hospital_id" FOREIGN KEY (hospital_id) REFERENCES hospitals (id) ON DELETE CASCADE,
        CONSTRAINT "FK_appointments_users_patient_id" FOREIGN KEY (patient_id) REFERENCES users (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260322165428_AddAppointmentBooking') THEN
    CREATE TABLE doctor_schedules (
        id uuid NOT NULL,
        hospital_id uuid NOT NULL,
        doctor_profile_id uuid NOT NULL,
        day_of_week integer NOT NULL,
        start_time time without time zone NOT NULL,
        end_time time without time zone NOT NULL,
        slot_duration_minutes integer NOT NULL,
        consultation_type character varying(20) NOT NULL,
        is_active boolean NOT NULL,
        created_at timestamp with time zone NOT NULL,
        CONSTRAINT "PK_doctor_schedules" PRIMARY KEY (id),
        CONSTRAINT "FK_doctor_schedules_doctor_profiles_doctor_profile_id" FOREIGN KEY (doctor_profile_id) REFERENCES doctor_profiles (id) ON DELETE CASCADE,
        CONSTRAINT "FK_doctor_schedules_hospitals_hospital_id" FOREIGN KEY (hospital_id) REFERENCES hospitals (id) ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260322165428_AddAppointmentBooking') THEN
    CREATE UNIQUE INDEX ix_appointments_booking_reference ON appointments (booking_reference);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260322165428_AddAppointmentBooking') THEN
    CREATE INDEX "IX_appointments_doctor_profile_id" ON appointments (doctor_profile_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260322165428_AddAppointmentBooking') THEN
    CREATE UNIQUE INDEX ix_appointments_no_double_booking ON appointments (hospital_id, doctor_profile_id, schedule_date, start_time) WHERE status != 'cancelled';
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260322165428_AddAppointmentBooking') THEN
    CREATE INDEX "IX_appointments_patient_id" ON appointments (patient_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260322165428_AddAppointmentBooking') THEN
    CREATE UNIQUE INDEX ix_doctor_profiles_hospital_user ON doctor_profiles (hospital_id, user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260322165428_AddAppointmentBooking') THEN
    CREATE UNIQUE INDEX "IX_doctor_profiles_user_id" ON doctor_profiles (user_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260322165428_AddAppointmentBooking') THEN
    CREATE INDEX "IX_doctor_schedules_doctor_profile_id" ON doctor_schedules (doctor_profile_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260322165428_AddAppointmentBooking') THEN
    CREATE INDEX "IX_doctor_schedules_hospital_id" ON doctor_schedules (hospital_id);
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260322165428_AddAppointmentBooking') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260322165428_AddAppointmentBooking', '9.0.1');
    END IF;
END $EF$;
COMMIT;

