using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NalamApi.Entities;

[Table("users")]
public class User
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

    [Required, MaxLength(30)]
    [Column("role")]
    public string Role { get; set; } = "admin"; // admin, doctor, pharmacist, receptionist (patients use separate patients table)

    [MaxLength(100)]
    [Column("department")]
    public string? Department { get; set; }

    [MaxLength(50)]
    [Column("employee_id")]
    public string? EmployeeId { get; set; }

    [MaxLength(500)]
    [Column("profile_photo_url")]
    public string? ProfilePhotoUrl { get; set; }

    [Required, MaxLength(20)]
    [Column("status")]
    public string Status { get; set; } = "active"; // active, inactive

    [Column("is_verified")]
    public bool IsVerified { get; set; } = false;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("last_login")]
    public DateTime? LastLogin { get; set; }

    // Navigation
    [ForeignKey("HospitalId")]
    public Hospital Hospital { get; set; } = null!;

    public ICollection<OtpVerification> OtpVerifications { get; set; } = [];
    public ICollection<AuditLog> AuditLogs { get; set; } = [];
    public DoctorProfile? DoctorProfile { get; set; }
    public ICollection<UserRole> UserRoles { get; set; } = [];
}
