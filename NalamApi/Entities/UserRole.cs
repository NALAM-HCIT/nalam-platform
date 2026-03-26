using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NalamApi.Entities;

/// <summary>
/// Junction table for multi-role support. A user can have one or more roles.
/// To add a new role, simply insert a new UserRole record for the user.
/// Valid roles: admin, doctor, pharmacist, receptionist, patient.
/// </summary>
[Table("user_roles")]
public class UserRole
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("user_id")]
    public Guid UserId { get; set; }

    [Required, MaxLength(30)]
    [Column("role")]
    public string Role { get; set; } = string.Empty;

    [Column("assigned_at")]
    public DateTime AssignedAt { get; set; } = DateTime.UtcNow;

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    // Navigation
    [ForeignKey("UserId")]
    public User User { get; set; } = null!;
}
