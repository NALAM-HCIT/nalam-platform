using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NalamApi.Migrations
{
    /// <inheritdoc />
    public partial class DropDoubleBookingIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Drop the partial unique index that prevented multiple patients
            // from sharing the same doctor/date/time slot (overbooking).
            // Overbooking is now allowed and managed at the application layer.
            migrationBuilder.DropIndex(
                name: "ix_appointments_no_double_booking",
                table: "appointments");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Re-create the no-double-booking partial unique index if rolled back
            migrationBuilder.Sql(
                @"CREATE UNIQUE INDEX ix_appointments_no_double_booking
                  ON appointments (hospital_id, doctor_profile_id, schedule_date, start_time)
                  WHERE status != 'cancelled';");
        }
    }
}
