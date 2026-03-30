using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NalamApi.Entities;

[Table("patient_physio_logs")]
public class PatientPhysioLog
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

    [Required, MaxLength(200)]
    [Column("activity_name")]
    public string ActivityName { get; set; } = string.Empty; // e.g. "Knee flexion", "Hip abduction"

    [Column("duration_min")]
    public short DurationMin { get; set; }

    [Column("sets")]
    public short? Sets { get; set; }

    [Column("reps")]
    public short? Reps { get; set; }

    // Patient-reported pain level 0 (none) to 10 (severe)
    [Column("pain_level")]
    public short? PainLevel { get; set; }

    [MaxLength(1000)]
    [Column("notes")]
    public string? Notes { get; set; }

    [Column("performed_at")]
    public DateTime PerformedAt { get; set; } = DateTime.UtcNow;

    [Column("log_date")]
    public DateOnly LogDate { get; set; }

    // Navigation
    [ForeignKey("HospitalId")]
    public Hospital Hospital { get; set; } = null!;

    [ForeignKey("PatientId")]
    public Patient Patient { get; set; } = null!;
}
