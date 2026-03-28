using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NalamApi.Migrations;

/// <inheritdoc />
public partial class AddPrescriptionItems : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(@"
            CREATE TABLE IF NOT EXISTS prescription_items (
                id                  uuid         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
                appointment_id      uuid         NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
                medicine_id         uuid         NULL     REFERENCES medicines(id)    ON DELETE SET NULL,
                medicine_name       varchar(200) NOT NULL,
                dosage_instructions varchar(500) NULL,
                quantity            integer      NOT NULL DEFAULT 1,
                created_at          timestamptz  NOT NULL DEFAULT now()
            );

            CREATE INDEX IF NOT EXISTS ix_prescription_items_appointment
                ON prescription_items (appointment_id);
        ");
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("DROP TABLE IF EXISTS prescription_items;");
    }
}
