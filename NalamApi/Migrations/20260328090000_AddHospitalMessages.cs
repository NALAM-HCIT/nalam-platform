using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NalamApi.Migrations;

/// <inheritdoc />
public partial class AddHospitalMessages : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(@"
            CREATE TABLE IF NOT EXISTS hospital_messages (
                id              uuid         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
                hospital_id     uuid         NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
                sender_id       uuid         NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
                recipient_id    uuid         NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
                body            varchar(2000) NOT NULL,
                is_read         boolean      NOT NULL DEFAULT false,
                created_at      timestamptz  NOT NULL DEFAULT now()
            );

            CREATE INDEX IF NOT EXISTS ix_messages_hospital_thread_time
                ON hospital_messages (hospital_id, sender_id, recipient_id, created_at);
        ");
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("DROP TABLE IF EXISTS hospital_messages;");
    }
}
