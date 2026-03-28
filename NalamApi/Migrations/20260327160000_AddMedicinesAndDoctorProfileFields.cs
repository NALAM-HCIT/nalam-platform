using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NalamApi.Migrations
{
    /// <inheritdoc />
    public partial class AddMedicinesAndDoctorProfileFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ── medicines table ──────────────────────────────────────────
            migrationBuilder.Sql(@"
                CREATE TABLE IF NOT EXISTS medicines (
                    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
                    hospital_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
                    name character varying(200) NOT NULL,
                    generic_name character varying(200),
                    category character varying(100) NOT NULL,
                    dosage_form character varying(50) NOT NULL,
                    strength character varying(50),
                    manufacturer character varying(200),
                    price numeric NOT NULL DEFAULT 0,
                    pack_size character varying(100),
                    stock_quantity integer NOT NULL DEFAULT 0,
                    requires_prescription boolean NOT NULL DEFAULT true,
                    is_active boolean NOT NULL DEFAULT true,
                    created_at timestamp with time zone NOT NULL DEFAULT now(),
                    updated_at timestamp with time zone NOT NULL DEFAULT now()
                );
                CREATE INDEX IF NOT EXISTS ix_medicines_hospital_id ON medicines(hospital_id);
                CREATE INDEX IF NOT EXISTS ix_medicines_hospital_category ON medicines(hospital_id, category);
            ");

            // ── doctor_profiles: add qualification & mci_registration ────
            migrationBuilder.Sql(@"
                ALTER TABLE doctor_profiles ADD COLUMN IF NOT EXISTS qualification character varying(200);
                ALTER TABLE doctor_profiles ADD COLUMN IF NOT EXISTS mci_registration character varying(100);
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP TABLE IF EXISTS medicines;");
            migrationBuilder.Sql("ALTER TABLE doctor_profiles DROP COLUMN IF EXISTS qualification;");
            migrationBuilder.Sql("ALTER TABLE doctor_profiles DROP COLUMN IF EXISTS mci_registration;");
        }
    }
}
