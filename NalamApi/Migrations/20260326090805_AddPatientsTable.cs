using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NalamApi.Migrations
{
    /// <inheritdoc />
    public partial class AddPatientsTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_appointments_users_patient_id",
                table: "appointments");

            migrationBuilder.AlterColumn<Guid>(
                name: "user_id",
                table: "otp_verifications",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AddColumn<Guid>(
                name: "patient_id",
                table: "otp_verifications",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "patients",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    hospital_id = table.Column<Guid>(type: "uuid", nullable: false),
                    full_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    mobile_number = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    email = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    profile_photo_url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    blood_group = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    date_of_birth = table.Column<DateOnly>(type: "date", nullable: true),
                    gender = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    address = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    city = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    state = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    pincode = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    emergency_contact_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    emergency_contact_phone = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    emergency_contact_relation = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    insurance_provider = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    insurance_policy_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    is_verified = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    last_login = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_patients", x => x.id);
                    table.ForeignKey(
                        name: "FK_patients_hospitals_hospital_id",
                        column: x => x.hospital_id,
                        principalTable: "hospitals",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_otp_verifications_patient_id",
                table: "otp_verifications",
                column: "patient_id");

            migrationBuilder.CreateIndex(
                name: "ix_patients_hospital_mobile",
                table: "patients",
                columns: new[] { "hospital_id", "mobile_number" },
                unique: true);

            // ── Data Migration: move existing patient records from users → patients ──
            // Uses same UUID so appointment FK values remain valid without changes.
            migrationBuilder.Sql(@"
                INSERT INTO patients (id, hospital_id, full_name, mobile_number, email, profile_photo_url, status, is_verified, created_at, last_login)
                SELECT id, hospital_id, full_name, mobile_number, email, profile_photo_url, status, is_verified, created_at, last_login
                FROM users WHERE role = 'patient';
            ");

            // Move OTP records from user_id to patient_id for patient users
            migrationBuilder.Sql(@"
                UPDATE otp_verifications SET patient_id = user_id, user_id = NULL
                WHERE user_id IN (SELECT id FROM users WHERE role = 'patient');
            ");

            migrationBuilder.AddForeignKey(
                name: "FK_appointments_patients_patient_id",
                table: "appointments",
                column: "patient_id",
                principalTable: "patients",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_otp_verifications_patients_patient_id",
                table: "otp_verifications",
                column: "patient_id",
                principalTable: "patients",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            // Clean up: remove patient records from users & user_roles
            migrationBuilder.Sql(@"
                DELETE FROM user_roles WHERE user_id IN (SELECT id FROM users WHERE role = 'patient');
                DELETE FROM users WHERE role = 'patient';
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_appointments_patients_patient_id",
                table: "appointments");

            migrationBuilder.DropForeignKey(
                name: "FK_otp_verifications_patients_patient_id",
                table: "otp_verifications");

            migrationBuilder.DropTable(
                name: "patients");

            migrationBuilder.DropIndex(
                name: "IX_otp_verifications_patient_id",
                table: "otp_verifications");

            migrationBuilder.DropColumn(
                name: "patient_id",
                table: "otp_verifications");

            migrationBuilder.AlterColumn<Guid>(
                name: "user_id",
                table: "otp_verifications",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_appointments_users_patient_id",
                table: "appointments",
                column: "patient_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
