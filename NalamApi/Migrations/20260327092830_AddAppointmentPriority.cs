using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NalamApi.Migrations
{
    /// <inheritdoc />
    public partial class AddAppointmentPriority : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Use IF NOT EXISTS so the migration is safe to apply even if the
            // column already exists (e.g. after a partial previous deployment).
            migrationBuilder.Sql(
                "ALTER TABLE appointments ADD COLUMN IF NOT EXISTS priority character varying(20) NOT NULL DEFAULT 'normal';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "priority",
                table: "appointments");
        }
    }
}
