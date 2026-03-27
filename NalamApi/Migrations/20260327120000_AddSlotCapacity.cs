using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NalamApi.Migrations
{
    /// <inheritdoc />
    public partial class AddSlotCapacity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Use IF NOT EXISTS so the migration is safe to apply even if the
            // column already exists (e.g. after a partial previous deployment).
            migrationBuilder.Sql(
                "ALTER TABLE doctor_schedules ADD COLUMN IF NOT EXISTS max_patients_per_slot integer NOT NULL DEFAULT 3;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "max_patients_per_slot",
                table: "doctor_schedules");
        }
    }
}
