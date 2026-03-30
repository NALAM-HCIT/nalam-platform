using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NalamApi.Entities;

/// <summary>
/// Daily step count logged by the patient (manual entry).
/// One row per (hospital, patient, log_date) — upserted on each update.
/// </summary>
[Table("patient_step_logs")]
public class PatientStepLog
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

    [Column("log_date")]
    public DateOnly LogDate { get; set; }

    [Column("step_count")]
    public int StepCount { get; set; }

    [Column("goal_steps")]
    public int GoalSteps { get; set; } = 10000;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    [ForeignKey("HospitalId")]
    public Hospital Hospital { get; set; } = null!;

    [ForeignKey("PatientId")]
    public Patient Patient { get; set; } = null!;
}
