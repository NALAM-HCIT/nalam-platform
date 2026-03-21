using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NalamApi.Entities;

[Table("otp_verifications")]
public class OtpVerification
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Column("user_id")]
    public Guid UserId { get; set; }

    [Required, MaxLength(20)]
    [Column("mobile_number")]
    public string MobileNumber { get; set; } = string.Empty;

    [Required, MaxLength(10)]
    [Column("otp_code")]
    public string OtpCode { get; set; } = string.Empty;

    [Column("is_used")]
    public bool IsUsed { get; set; } = false;

    [Column("attempt_count")]
    public int AttemptCount { get; set; } = 0;

    [Column("last_attempt_at")]
    public DateTime? LastAttemptAt { get; set; }

    [Column("expires_at")]
    public DateTime ExpiresAt { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    [ForeignKey("UserId")]
    public User User { get; set; } = null!;
}
