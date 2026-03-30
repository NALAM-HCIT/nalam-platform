using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NalamApi.Entities;

[Table("patients")]
public class Patient
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("hospital_id")]
    public Guid HospitalId { get; set; }

    [Required, MaxLength(200)]
    [Column("full_name")]
    public string FullName { get; set; } = string.Empty;

    [Required, MaxLength(20)]
    [Column("mobile_number")]
    public string MobileNumber { get; set; } = string.Empty;

    [MaxLength(200)]
    [Column("email")]
    public string? Email { get; set; }

    [MaxLength(500)]
    [Column("profile_photo_url")]
    public string? ProfilePhotoUrl { get; set; }

    // ── Patient-Specific Fields ─────────────────────
    [MaxLength(10)]
    [Column("blood_group")]
    public string? BloodGroup { get; set; } // A+, A-, B+, B-, O+, O-, AB+, AB-

    [Column("date_of_birth")]
    public DateOnly? DateOfBirth { get; set; }

    [MaxLength(10)]
    [Column("gender")]
    public string? Gender { get; set; } // Male, Female, Other

    [MaxLength(500)]
    [Column("address")]
    public string? Address { get; set; }

    [MaxLength(100)]
    [Column("city")]
    public string? City { get; set; }

    [MaxLength(100)]
    [Column("state")]
    public string? State { get; set; }

    [MaxLength(10)]
    [Column("pincode")]
    public string? Pincode { get; set; }

    // ── Emergency Contact ───────────────────────────
    [MaxLength(200)]
    [Column("emergency_contact_name")]
    public string? EmergencyContactName { get; set; }

    [MaxLength(20)]
    [Column("emergency_contact_phone")]
    public string? EmergencyContactPhone { get; set; }

    [MaxLength(50)]
    [Column("emergency_contact_relation")]
    public string? EmergencyContactRelation { get; set; }

    // ── Insurance ───────────────────────────────────
    [MaxLength(200)]
    [Column("insurance_provider")]
    public string? InsuranceProvider { get; set; }

    [MaxLength(100)]
    [Column("insurance_policy_number")]
    public string? InsurancePolicyNumber { get; set; }

    // ── System Fields ───────────────────────────────
    [Required, MaxLength(20)]
    [Column("status")]
    public string Status { get; set; } = "active"; // active, inactive

    [Column("is_verified")]
    public bool IsVerified { get; set; } = false;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("last_login")]
    public DateTime? LastLogin { get; set; }

    // ── Navigation ──────────────────────────────────
    [ForeignKey("HospitalId")]
    public Hospital Hospital { get; set; } = null!;

    public ICollection<Appointment> Appointments { get; set; } = [];
    public ICollection<OtpVerification> OtpVerifications { get; set; } = [];

    // ── Patient Dashboard ────────────────────────────
    public ICollection<PatientMoodLog> MoodLogs { get; set; } = [];
    public PatientWaterSetting? WaterSetting { get; set; }
    public ICollection<PatientWaterLog> WaterLogs { get; set; } = [];
    public ICollection<PatientPhysioLog> PhysioLogs { get; set; } = [];
    public ICollection<PatientVital> Vitals { get; set; } = [];
}
