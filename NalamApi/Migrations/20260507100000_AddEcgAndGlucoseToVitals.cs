using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NalamApi.Migrations;

/// <inheritdoc />
public partial class AddEcgAndGlucoseToVitals : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // Add ECG data column to raw vitals
        migrationBuilder.AddColumn<string>(
            name: "ecg_data",
            table: "patient_vitals",
            type: "text",
            nullable: true,
            comment: "ECG reading result (e.g. 'Normal', 'Irregular')");

        // Add blood_glucose aggregation columns to hourly table
        migrationBuilder.AddColumn<decimal>(
            name: "blood_glucose_min",
            table: "patient_vitals_hourly",
            type: "numeric(6,1)",
            nullable: true);

        migrationBuilder.AddColumn<decimal>(
            name: "blood_glucose_max",
            table: "patient_vitals_hourly",
            type: "numeric(6,1)",
            nullable: true);

        migrationBuilder.AddColumn<decimal>(
            name: "blood_glucose_avg",
            table: "patient_vitals_hourly",
            type: "numeric(6,1)",
            nullable: true);

        migrationBuilder.AddColumn<int>(
            name: "blood_glucose_count",
            table: "patient_vitals_hourly",
            type: "integer",
            nullable: true);

        // Add blood_glucose aggregation columns to daily table
        migrationBuilder.AddColumn<decimal>(
            name: "blood_glucose_min",
            table: "patient_vitals_daily",
            type: "numeric(6,1)",
            nullable: true);

        migrationBuilder.AddColumn<decimal>(
            name: "blood_glucose_max",
            table: "patient_vitals_daily",
            type: "numeric(6,1)",
            nullable: true);

        migrationBuilder.AddColumn<decimal>(
            name: "blood_glucose_avg",
            table: "patient_vitals_daily",
            type: "numeric(6,1)",
            nullable: true);

        // Add comment for documentation
        migrationBuilder.Sql(@"
            COMMENT ON COLUMN patient_vitals_hourly.blood_glucose_min IS 'Minimum blood glucose (mg/dL) in the hour';
            COMMENT ON COLUMN patient_vitals_hourly.blood_glucose_max IS 'Maximum blood glucose (mg/dL) in the hour';
            COMMENT ON COLUMN patient_vitals_hourly.blood_glucose_avg IS 'Average blood glucose (mg/dL) in the hour';
            COMMENT ON COLUMN patient_vitals_daily.blood_glucose_min IS 'Minimum blood glucose (mg/dL) in the day';
            COMMENT ON COLUMN patient_vitals_daily.blood_glucose_max IS 'Maximum blood glucose (mg/dL) in the day';
            COMMENT ON COLUMN patient_vitals_daily.blood_glucose_avg IS 'Average blood glucose (mg/dL) in the day';
        ");
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "ecg_data",
            table: "patient_vitals");

        migrationBuilder.DropColumn(
            name: "blood_glucose_min",
            table: "patient_vitals_hourly");

        migrationBuilder.DropColumn(
            name: "blood_glucose_max",
            table: "patient_vitals_hourly");

        migrationBuilder.DropColumn(
            name: "blood_glucose_avg",
            table: "patient_vitals_hourly");

        migrationBuilder.DropColumn(
            name: "blood_glucose_count",
            table: "patient_vitals_hourly");

        migrationBuilder.DropColumn(
            name: "blood_glucose_min",
            table: "patient_vitals_daily");

        migrationBuilder.DropColumn(
            name: "blood_glucose_max",
            table: "patient_vitals_daily");

        migrationBuilder.DropColumn(
            name: "blood_glucose_avg",
            table: "patient_vitals_daily");
    }
}
