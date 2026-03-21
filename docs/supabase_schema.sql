CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
    "MigrationId" character varying(150) NOT NULL,
    "ProductVersion" character varying(32) NOT NULL,
    CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY ("MigrationId")
);

START TRANSACTION;
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

CREATE TABLE departments (
    id uuid NOT NULL,
    hospital_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    is_active boolean NOT NULL,
    CONSTRAINT "PK_departments" PRIMARY KEY (id),
    CONSTRAINT "FK_departments_hospitals_hospital_id" FOREIGN KEY (hospital_id) REFERENCES hospitals (id) ON DELETE CASCADE
);

CREATE TABLE hospital_settings (
    id uuid NOT NULL,
    hospital_id uuid NOT NULL,
    key character varying(100) NOT NULL,
    value text,
    updated_at timestamp with time zone NOT NULL,
    CONSTRAINT "PK_hospital_settings" PRIMARY KEY (id),
    CONSTRAINT "FK_hospital_settings_hospitals_hospital_id" FOREIGN KEY (hospital_id) REFERENCES hospitals (id) ON DELETE CASCADE
);

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

CREATE INDEX "IX_audit_logs_hospital_id" ON audit_logs (hospital_id);

CREATE INDEX "IX_audit_logs_user_id" ON audit_logs (user_id);

CREATE INDEX "IX_departments_hospital_id" ON departments (hospital_id);

CREATE UNIQUE INDEX ix_settings_hospital_key ON hospital_settings (hospital_id, key);

CREATE INDEX "IX_otp_verifications_user_id" ON otp_verifications (user_id);

CREATE UNIQUE INDEX ix_users_hospital_employee ON users (hospital_id, employee_id) WHERE employee_id IS NOT NULL;

CREATE UNIQUE INDEX ix_users_hospital_mobile ON users (hospital_id, mobile_number);

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260321164522_InitialCreate', '9.0.1');

COMMIT;

