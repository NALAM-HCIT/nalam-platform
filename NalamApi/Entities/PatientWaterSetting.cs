using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NalamApi.Entities;

[Table("patient_water_settings")]
public class PatientWaterSetting
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

    [Column("daily_goal_ml")]
    public int DailyGoalMl { get; set; } = 2000;

    [Column("reminder_enabled")]
    public bool ReminderEnabled { get; set; } = false;

    // Every N hours (e.g. 2 = remind every 2 hours)
    [Column("reminder_interval_h")]
    public short ReminderIntervalH { get; set; } = 2;

    [Column("reminder_start_time")]
    public TimeOnly ReminderStartTime { get; set; } = new TimeOnly(8, 0);

    [Column("reminder_end_time")]
    public TimeOnly ReminderEndTime { get; set; } = new TimeOnly(22, 0);

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    [ForeignKey("HospitalId")]
    public Hospital Hospital { get; set; } = null!;

    [ForeignKey("PatientId")]
    public Patient Patient { get; set; } = null!;
}
