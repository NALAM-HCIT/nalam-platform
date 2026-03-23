using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NalamApi.Entities;

[Table("doctor_profiles")]
public class DoctorProfile
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("hospital_id")]
    public Guid HospitalId { get; set; }

    [Required]
    [Column("user_id")]
    public Guid UserId { get; set; }

    [Required, MaxLength(100)]
    [Column("specialty")]
    public string Specialty { get; set; } = string.Empty;

    [Column("experience_years")]
    public int ExperienceYears { get; set; }

    [Column("consultation_fee")]
    public decimal ConsultationFee { get; set; }

    [Column("available_for_video")]
    public bool AvailableForVideo { get; set; } = true;

    [Column("available_for_in_person")]
    public bool AvailableForInPerson { get; set; } = true;

    [MaxLength(200)]
    [Column("languages")]
    public string? Languages { get; set; }

    [Column("rating")]
    public decimal? Rating { get; set; }

    [Column("review_count")]
    public int ReviewCount { get; set; }

    [MaxLength(500)]
    [Column("bio")]
    public string? Bio { get; set; }

    [Column("is_accepting_appointments")]
    public bool IsAcceptingAppointments { get; set; } = true;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    [ForeignKey("HospitalId")]
    public Hospital Hospital { get; set; } = null!;

    [ForeignKey("UserId")]
    public User User { get; set; } = null!;

    public ICollection<DoctorSchedule> Schedules { get; set; } = [];
    public ICollection<Appointment> Appointments { get; set; } = [];
}
