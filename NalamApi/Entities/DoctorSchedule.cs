using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NalamApi.Entities;

[Table("doctor_schedules")]
public class DoctorSchedule
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("hospital_id")]
    public Guid HospitalId { get; set; }

    [Required]
    [Column("doctor_profile_id")]
    public Guid DoctorProfileId { get; set; }

    [Column("day_of_week")]
    public int DayOfWeek { get; set; } // 0=Sunday, 6=Saturday

    [Column("start_time")]
    public TimeOnly StartTime { get; set; }

    [Column("end_time")]
    public TimeOnly EndTime { get; set; }

    [Column("slot_duration_minutes")]
    public int SlotDurationMinutes { get; set; } = 30;

    [Required, MaxLength(20)]
    [Column("consultation_type")]
    public string ConsultationType { get; set; } = "both"; // video, in-person, both

    /// <summary>
    /// Maximum number of patients that can book this slot concurrently.
    /// Defaults to 3 — slots remain bookable until this count is reached.
    /// </summary>
    [Column("max_patients_per_slot")]
    public int MaxPatientsPerSlot { get; set; } = 3;

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    [ForeignKey("HospitalId")]
    public Hospital Hospital { get; set; } = null!;

    [ForeignKey("DoctorProfileId")]
    public DoctorProfile DoctorProfile { get; set; } = null!;
}
