using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NalamApi.Entities;

[Table("patient_vitals")]
public class PatientVital
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("hospital_id")]
    public Guid HospitalId { get; set; }

    [Required]
    [Column("patient_id")]
    public Guid PatientId { get; set; }

    // Nullable: null = self-reported, set = logged by staff
    [Column("recorded_by_id")]
    public Guid? RecordedById { get; set; }

    [Column("recorded_at")]
    public DateTime RecordedAt { get; set; } = DateTime.UtcNow;

    [Column("log_date")]
    public DateOnly LogDate { get; set; }

    // ── Vital Fields (all nullable — patient logs what they have) ──

    [Column("bp_systolic")]
    public short? BpSystolic { get; set; }

    [Column("bp_diastolic")]
    public short? BpDiastolic { get; set; }

    [Column("heart_rate")]
    public short? HeartRate { get; set; }

    [Column("temperature_c")]
    public decimal? TemperatureC { get; set; }

    [Column("spo2")]
    public short? Spo2 { get; set; }

    [Column("respiratory_rate")]
    public short? RespiratoryRate { get; set; }

    [Column("weight_kg")]
    public decimal? WeightKg { get; set; }

    [Column("height_cm")]
    public decimal? HeightCm { get; set; }

    [Column("blood_glucose")]
    public decimal? BloodGlucose { get; set; } // mg/dL

    // 'self', 'nurse', 'doctor', 'device'
    [Required, MaxLength(20)]
    [Column("source")]
    public string Source { get; set; } = "self";

    // Navigation
    [ForeignKey("HospitalId")]
    public Hospital Hospital { get; set; } = null!;

    [ForeignKey("PatientId")]
    public Patient Patient { get; set; } = null!;

    [ForeignKey("RecordedById")]
    public User? RecordedBy { get; set; }
}
