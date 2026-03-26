using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NalamApi.Migrations
{
    /// <inheritdoc />
    public partial class AddSettingsModuleTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "hospital_integrations",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    hospital_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    is_connected = table.Column<bool>(type: "boolean", nullable: false),
                    config_json = table.Column<string>(type: "text", nullable: true),
                    last_synced_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_hospital_integrations", x => x.id);
                    table.ForeignKey(
                        name: "FK_hospital_integrations_hospitals_hospital_id",
                        column: x => x.hospital_id,
                        principalTable: "hospitals",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "hospital_working_hours",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    hospital_id = table.Column<Guid>(type: "uuid", nullable: false),
                    day_of_week = table.Column<int>(type: "integer", nullable: false),
                    start_time = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    end_time = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    is_enabled = table.Column<bool>(type: "boolean", nullable: false),
                    break_start = table.Column<TimeOnly>(type: "time without time zone", nullable: true),
                    break_end = table.Column<TimeOnly>(type: "time without time zone", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_hospital_working_hours", x => x.id);
                    table.ForeignKey(
                        name: "FK_hospital_working_hours_hospitals_hospital_id",
                        column: x => x.hospital_id,
                        principalTable: "hospitals",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_integrations_hospital_name",
                table: "hospital_integrations",
                columns: new[] { "hospital_id", "name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_working_hours_hospital_day",
                table: "hospital_working_hours",
                columns: new[] { "hospital_id", "day_of_week" },
                unique: true);

            // ── Seed default working hours for all existing hospitals ──
            migrationBuilder.Sql(@"
                INSERT INTO hospital_working_hours (id, hospital_id, day_of_week, start_time, end_time, is_enabled, break_start, break_end, updated_at)
                SELECT gen_random_uuid(), h.id, d.day,
                       '08:00'::time, '20:00'::time,
                       CASE WHEN d.day = 0 THEN false ELSE true END,
                       '13:00'::time, '14:00'::time, now()
                FROM hospitals h
                CROSS JOIN (VALUES (0),(1),(2),(3),(4),(5),(6)) AS d(day);
            ");

            // ── Seed default integrations for all existing hospitals ──
            migrationBuilder.Sql(@"
                INSERT INTO hospital_integrations (id, hospital_id, name, type, is_connected, status, created_at, updated_at)
                SELECT gen_random_uuid(), h.id, i.name, i.type, false, 'disconnected', now(), now()
                FROM hospitals h
                CROSS JOIN (VALUES
                    ('ABDM (Ayushman Bharat)', 'health_network'),
                    ('Lab Equipment API', 'lab'),
                    ('Pharmacy Inventory', 'pharmacy'),
                    ('Insurance Gateway', 'insurance'),
                    ('SMS Provider (Twilio)', 'sms')
                ) AS i(name, type);
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "hospital_integrations");

            migrationBuilder.DropTable(
                name: "hospital_working_hours");
        }
    }
}
