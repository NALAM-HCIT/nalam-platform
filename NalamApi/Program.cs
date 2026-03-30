using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using NalamApi.Data;
using NalamApi.Endpoints;
using NalamApi.Middleware;
using NalamApi.Services;

var builder = WebApplication.CreateBuilder(args);

// ═══════════════════════════════════════════════════════════
//  DATABASE (Supabase PostgreSQL)
// ═══════════════════════════════════════════════════════════

var rawConnectionString = Environment.GetEnvironmentVariable("DATABASE_URL")
    ?? builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("DATABASE_URL or ConnectionStrings:DefaultConnection must be set.");

// Convert PostgreSQL URI format (postgresql://user:pass@host:port/db) to Npgsql format
string connectionString;
if (rawConnectionString.StartsWith("postgresql://") || rawConnectionString.StartsWith("postgres://"))
{
    // Use regex to safely parse — handles special chars like & in passwords
    var match = System.Text.RegularExpressions.Regex.Match(
        rawConnectionString,
        @"postgres(?:ql)?://(?<user>[^:]+):(?<pass>[^@]+)@(?<host>[^:]+):(?<port>\d+)/(?<db>[^?]+)");
    
    var rawDbUrl = rawConnectionString;
    
    if (match.Success)
    {
        connectionString = $"Host={match.Groups["host"].Value};Port={match.Groups["port"].Value};Database={match.Groups["db"].Value};Username={match.Groups["user"].Value};Password={match.Groups["pass"].Value};Ssl Mode=Require;Trust Server Certificate=true;Pooling=false;Max Auto Prepare=0;";
    }
    else
    {
        throw new InvalidOperationException($"Cannot parse DATABASE_URL. Expected format: postgresql://user:pass@host:port/db");
    }
}
else
{
    connectionString = rawConnectionString;
}

builder.Services.AddDbContext<NalamDbContext>(options =>
    options.UseNpgsql(connectionString));

// ═══════════════════════════════════════════════════════════
//  AUTHENTICATION (JWT)
// ═══════════════════════════════════════════════════════════

var jwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET")
    ?? builder.Configuration["Jwt:Secret"]
    ?? "NalamDefaultSecretKey_ChangeInProduction_32chars!";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false; // Keep JWT claim names as-is (don't remap "role" to long URI)
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            ValidateIssuer = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "NalamApi",
            ValidateAudience = true,
            ValidAudience = builder.Configuration["Jwt:Audience"] ?? "NalamApp",
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero,
            RoleClaimType = "role",
            NameClaimType = "sub"
        };
    });

// ═══════════════════════════════════════════════════════════
//  AUTHORIZATION (Role-Based Policies)
// ═══════════════════════════════════════════════════════════

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy =>
        policy.RequireClaim("role", "admin"));

    options.AddPolicy("DoctorOnly", policy =>
        policy.RequireClaim("role", "doctor"));

    options.AddPolicy("StaffAccess", policy =>
        policy.RequireClaim("role", "admin", "doctor", "pharmacist", "receptionist"));

    options.AddPolicy("PatientOnly", policy =>
        policy.RequireClaim("role", "patient"));
});

// ═══════════════════════════════════════════════════════════
//  RATE LIMITING
// ═══════════════════════════════════════════════════════════

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("otp", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(1),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 2
            }));
});

// ═══════════════════════════════════════════════════════════
//  CACHING & COMPRESSION
// ═══════════════════════════════════════════════════════════

builder.Services.AddMemoryCache();
builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
});

// ═══════════════════════════════════════════════════════════
//  SERVICES (DI Registration)
// ═══════════════════════════════════════════════════════════

builder.Services.AddHttpContextAccessor();
builder.Services.AddSingleton<JwtService>();
builder.Services.AddScoped<OtpService>();
builder.Services.AddScoped<AuditService>();
builder.Services.AddHostedService<AuditArchivingService>();
builder.Services.AddHttpClient("Pay4Sms");

// ═══════════════════════════════════════════════════════════
//  CORS (Allow Mobile App & Web Portal)
// ═══════════════════════════════════════════════════════════

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowNalamClients", policy =>
    {
        policy.WithOrigins(
                "http://localhost:3000",
                "http://localhost:8081",
                "http://localhost:19006",
                "https://nalamapp-webportal.vercel.app")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

// ═══════════════════════════════════════════════════════════
//  SWAGGER (Development Only)
// ═══════════════════════════════════════════════════════════

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddOpenApi();

// ═══════════════════════════════════════════════════════════
//  BUILD APP & CONFIGURE MIDDLEWARE PIPELINE
// ═══════════════════════════════════════════════════════════

var app = builder.Build();

// Development: Swagger UI
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseExceptionHandler(exceptionHandlerApp =>
{
    exceptionHandlerApp.Run(async context =>
    {
        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        context.Response.ContentType = "application/json";
        var exception = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>()?.Error;
        Console.WriteLine($"[CRITICAL ERROR] {exception?.Message}\n{exception?.StackTrace}");
        await context.Response.WriteAsJsonAsync(new 
        { 
            success = false, 
            message = "An internal server error occurred.", 
            error = exception?.Message,
            innerError = exception?.InnerException?.Message,
            stackTrace = exception?.StackTrace
        });
    });
});

// Middleware pipeline (order matters!)
app.UseResponseCompression();
app.UseCors("AllowNalamClients");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.UseMiddleware<TenantMiddleware>();  // Defense Layer 2: inject hospital_id into PG session

// ═══════════════════════════════════════════════════════════
//  MAP ENDPOINTS
// ═══════════════════════════════════════════════════════════

app.MapAuthEndpoints();
app.MapHospitalEndpoints();
app.MapAdminEndpoints();
app.MapAppointmentEndpoints();
app.MapReceptionistEndpoints();
app.MapPharmacistEndpoints();
app.MapPatientEndpoints();
app.MapPatientProfileEndpoints();
app.MapPatientDashboardEndpoints();
app.MapDoctorPortalEndpoints();
app.MapMedicineEndpoints();
app.MapMessageEndpoints();

// Health check (root + /api/health for mobile connectivity test)
app.MapGet("/", () => Results.Ok(new
{
    service = "Nalam API",
    version = "1.0.0",
    status = "running",
    timestamp = DateTime.UtcNow
}));

app.MapGet("/api/health", () => Results.Ok(new
{
    status = "ok",
    timestamp = DateTime.UtcNow
}));

// DEBUG: Show JWT claims (remove after debugging)
app.MapGet("/api/_debug/claims", (HttpContext ctx) =>
{
    var claims = ctx.User.Claims.Select(c => new { c.Type, c.Value }).ToList();
    return Results.Ok(new { authenticated = ctx.User.Identity?.IsAuthenticated, claims });
}).RequireAuthorization();

// DEBUG ENDPOINT - Safe dump of connection string details to diagnose XX000 error
app.MapGet("/api/_debug/db-config", () => {
    var rawUrl = Environment.GetEnvironmentVariable("DATABASE_URL") ?? "Not set";
    var safeUrl = System.Text.RegularExpressions.Regex.Replace(rawUrl, @"(?<=:)[^@:]+(?=@)", "********");
    
    var m = System.Text.RegularExpressions.Regex.Match(
        rawUrl,
        @"postgres(?:ql)?://(?<user>[^:]+):(?<pass>[^@]+)@(?<host>[^:]+):(?<port>\d+)/(?<db>[^?]+)");
        
    return Results.Ok(new {
        raw_safe = safeUrl,
        parsed_user = m.Success ? m.Groups["user"].Value : null,
        parsed_host = m.Success ? m.Groups["host"].Value : null,
        parsed_port = m.Success ? m.Groups["port"].Value : null,
        parsed_db = m.Success ? m.Groups["db"].Value : null,
        regex_success = m.Success
    });
});


// ═══════════════════════════════════════════════════════════
//  AUTO-MIGRATE DATABASE ON STARTUP
// ═══════════════════════════════════════════════════════════

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<NalamDbContext>();
    try
    {
        await db.Database.MigrateAsync();
        Console.WriteLine("✅ Database migration applied successfully.");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"⚠️  Migration warning: {ex.Message}");
        Console.WriteLine("   Run 'dotnet ef database update' manually if needed.");
    }

    // Safety net: ensure schema-critical columns exist even if EF migration failed.
    // These are idempotent (IF NOT EXISTS / IF EXISTS) and safe to run on every startup.
    try
    {
        await db.Database.ExecuteSqlRawAsync(
            "ALTER TABLE appointments ADD COLUMN IF NOT EXISTS priority character varying(20) NOT NULL DEFAULT 'normal';");
        Console.WriteLine("✅ Schema safety check passed (priority column ensured).");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"⚠️  Schema safety check warning: {ex.Message}");
    }

    try
    {
        await db.Database.ExecuteSqlRawAsync(
            "ALTER TABLE doctor_schedules ADD COLUMN IF NOT EXISTS max_patients_per_slot integer NOT NULL DEFAULT 3;");
        Console.WriteLine("✅ Schema safety check passed (max_patients_per_slot column ensured).");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"⚠️  Schema safety check warning: {ex.Message}");
    }

    try
    {
        await db.Database.ExecuteSqlRawAsync(@"
            ALTER TABLE doctor_profiles ADD COLUMN IF NOT EXISTS qualification    varchar(200) NULL;
            ALTER TABLE doctor_profiles ADD COLUMN IF NOT EXISTS mci_registration varchar(100) NULL;
            ALTER TABLE appointments    ADD COLUMN IF NOT EXISTS prescription_status varchar(20) NULL;
        ");
        Console.WriteLine("✅ Schema safety check passed (doctor_profiles + prescription_status columns ensured).");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"⚠️  Schema safety check warning (doctor_profiles): {ex.Message}");
    }

    // Safety net: medicines table
    try
    {
        await db.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS medicines (
                id                   uuid          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
                hospital_id          uuid          NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
                name                 varchar(200)  NOT NULL,
                generic_name         varchar(200)  NULL,
                category             varchar(100)  NOT NULL,
                dosage_form          varchar(50)   NOT NULL,
                strength             varchar(50)   NULL,
                manufacturer         varchar(200)  NULL,
                price                numeric(10,2) NOT NULL DEFAULT 0,
                pack_size            varchar(100)  NULL,
                stock_quantity       integer       NOT NULL DEFAULT 0,
                requires_prescription boolean      NOT NULL DEFAULT true,
                is_active            boolean       NOT NULL DEFAULT true,
                created_at           timestamptz   NOT NULL DEFAULT now(),
                updated_at           timestamptz   NOT NULL DEFAULT now()
            );
        ");
        Console.WriteLine("✅ Schema safety check passed (medicines table ensured).");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"⚠️  Schema safety check warning (medicines): {ex.Message}");
    }

    // Safety net: hospital_messages table
    try
    {
        await db.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS hospital_messages (
                id              uuid          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
                hospital_id     uuid          NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
                sender_id       uuid          NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
                recipient_id    uuid          NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
                body            varchar(2000) NOT NULL,
                is_read         boolean       NOT NULL DEFAULT false,
                created_at      timestamptz   NOT NULL DEFAULT now()
            );
            CREATE INDEX IF NOT EXISTS ix_messages_hospital_thread_time
                ON hospital_messages (hospital_id, sender_id, recipient_id, created_at);
        ");
        Console.WriteLine("✅ Schema safety check passed (hospital_messages table ensured).");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"⚠️  Schema safety check warning (hospital_messages): {ex.Message}");
    }

    // Safety net: prescription_items table
    try
    {
        await db.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS prescription_items (
                id                  uuid         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
                appointment_id      uuid         NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
                medicine_id         uuid         NULL     REFERENCES medicines(id)    ON DELETE SET NULL,
                medicine_name       varchar(200) NOT NULL,
                dosage_instructions varchar(500) NULL,
                quantity            integer      NOT NULL DEFAULT 1,
                created_at          timestamptz  NOT NULL DEFAULT now()
            );
            CREATE INDEX IF NOT EXISTS ix_prescription_items_appointment
                ON prescription_items (appointment_id);
        ");
        Console.WriteLine("✅ Schema safety check passed (prescription_items table ensured).");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"⚠️  Schema safety check warning (prescription_items): {ex.Message}");
    }

    // Safety net: patient care task logs
    try
    {
        await db.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS patient_care_task_logs (
                id           uuid         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
                hospital_id  uuid         NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
                patient_id   uuid         NOT NULL REFERENCES patients(id)  ON DELETE CASCADE,
                log_date     date         NOT NULL DEFAULT CURRENT_DATE,
                task_id      varchar(200) NOT NULL,
                task_title   varchar(200) NOT NULL DEFAULT '',
                status       varchar(20)  NOT NULL DEFAULT 'completed',
                completed_at timestamptz  NOT NULL DEFAULT now(),
                CONSTRAINT uq_care_task_patient_day UNIQUE (hospital_id, patient_id, log_date, task_id)
            );
            CREATE INDEX IF NOT EXISTS ix_care_task_patient_date
                ON patient_care_task_logs (hospital_id, patient_id, log_date DESC);
        ");
        Console.WriteLine("✅ Schema safety check passed (patient_care_task_logs table ensured).");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"⚠️  Schema safety check warning (patient_care_task_logs): {ex.Message}");
    }

    // Safety net: patient custom tasks
    try
    {
        await db.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS patient_custom_tasks (
                id          uuid         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
                hospital_id uuid         NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
                patient_id  uuid         NOT NULL REFERENCES patients(id)  ON DELETE CASCADE,
                title       varchar(200) NOT NULL,
                category    varchar(20)  NOT NULL DEFAULT 'vitals',
                time_of_day varchar(20)  NOT NULL DEFAULT 'morning',
                notes       varchar(500),
                is_active   boolean      NOT NULL DEFAULT true,
                created_at  timestamptz  NOT NULL DEFAULT now()
            );
            CREATE INDEX IF NOT EXISTS ix_custom_task_patient_active
                ON patient_custom_tasks (hospital_id, patient_id, is_active);
        ");
        Console.WriteLine("✅ Schema safety check passed (patient_custom_tasks table ensured).");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"⚠️  Schema safety check warning (patient_custom_tasks): {ex.Message}");
    }

    // Safety net: patient step logs
    try
    {
        await db.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS patient_step_logs (
                id          uuid    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
                hospital_id uuid    NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
                patient_id  uuid    NOT NULL REFERENCES patients(id)  ON DELETE CASCADE,
                log_date    date    NOT NULL DEFAULT CURRENT_DATE,
                step_count  integer NOT NULL DEFAULT 0,
                goal_steps  integer NOT NULL DEFAULT 10000,
                updated_at  timestamptz NOT NULL DEFAULT now(),
                CONSTRAINT uq_step_log_patient_day UNIQUE (hospital_id, patient_id, log_date)
            );
        ");
        Console.WriteLine("✅ Schema safety check passed (patient_step_logs table ensured).");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"⚠️  Schema safety check warning (patient_step_logs): {ex.Message}");
    }

    // Safety net: patient dashboard tables
    try
    {
        await db.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS patient_mood_logs (
                id          uuid         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
                hospital_id uuid         NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
                patient_id  uuid         NOT NULL REFERENCES patients(id)  ON DELETE CASCADE,
                log_date    date         NOT NULL,
                mood_score  smallint     NOT NULL CHECK (mood_score BETWEEN 1 AND 5),
                mood_label  varchar(20)  NOT NULL,
                mood_note   varchar(500) NULL,
                logged_at   timestamptz  NOT NULL DEFAULT now(),
                CONSTRAINT uq_mood_patient_day UNIQUE (hospital_id, patient_id, log_date)
            );
            CREATE INDEX IF NOT EXISTS ix_mood_patient_date
                ON patient_mood_logs (hospital_id, patient_id, log_date DESC);

            CREATE TABLE IF NOT EXISTS patient_water_settings (
                id                   uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
                hospital_id          uuid        NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
                patient_id           uuid        NOT NULL REFERENCES patients(id)  ON DELETE CASCADE,
                daily_goal_ml        integer     NOT NULL DEFAULT 2000,
                reminder_enabled     boolean     NOT NULL DEFAULT false,
                reminder_interval_h  smallint    NOT NULL DEFAULT 2,
                reminder_start_time  time        NOT NULL DEFAULT '08:00',
                reminder_end_time    time        NOT NULL DEFAULT '22:00',
                updated_at           timestamptz NOT NULL DEFAULT now(),
                CONSTRAINT uq_water_settings_patient UNIQUE (hospital_id, patient_id)
            );

            CREATE TABLE IF NOT EXISTS patient_water_logs (
                id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
                hospital_id uuid        NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
                patient_id  uuid        NOT NULL REFERENCES patients(id)  ON DELETE CASCADE,
                log_date    date        NOT NULL DEFAULT CURRENT_DATE,
                amount_ml   integer     NOT NULL CHECK (amount_ml > 0),
                logged_at   timestamptz NOT NULL DEFAULT now()
            );
            CREATE INDEX IF NOT EXISTS ix_water_logs_patient_date
                ON patient_water_logs (hospital_id, patient_id, log_date DESC);

            CREATE TABLE IF NOT EXISTS patient_physio_logs (
                id            uuid          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
                hospital_id   uuid          NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
                patient_id    uuid          NOT NULL REFERENCES patients(id)  ON DELETE CASCADE,
                activity_name varchar(200)  NOT NULL,
                duration_min  smallint      NOT NULL CHECK (duration_min > 0),
                sets          smallint      NULL,
                reps          smallint      NULL,
                pain_level    smallint      NULL CHECK (pain_level BETWEEN 0 AND 10),
                notes         varchar(1000) NULL,
                performed_at  timestamptz   NOT NULL DEFAULT now(),
                log_date      date          NOT NULL DEFAULT CURRENT_DATE
            );
            CREATE INDEX IF NOT EXISTS ix_physio_patient_date
                ON patient_physio_logs (hospital_id, patient_id, log_date DESC);

            CREATE TABLE IF NOT EXISTS patient_vitals (
                id               uuid         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
                hospital_id      uuid         NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
                patient_id       uuid         NOT NULL REFERENCES patients(id)  ON DELETE CASCADE,
                recorded_by_id   uuid         NULL     REFERENCES users(id)     ON DELETE SET NULL,
                recorded_at      timestamptz  NOT NULL DEFAULT now(),
                log_date         date         NOT NULL DEFAULT CURRENT_DATE,
                bp_systolic      smallint     NULL CHECK (bp_systolic  BETWEEN 50 AND 250),
                bp_diastolic     smallint     NULL CHECK (bp_diastolic BETWEEN 30 AND 150),
                heart_rate       smallint     NULL CHECK (heart_rate   BETWEEN 30 AND 250),
                temperature_c    numeric(4,1) NULL CHECK (temperature_c BETWEEN 34 AND 43),
                spo2             smallint     NULL CHECK (spo2 BETWEEN 70 AND 100),
                respiratory_rate smallint     NULL CHECK (respiratory_rate BETWEEN 5 AND 60),
                weight_kg        numeric(5,1) NULL,
                height_cm        numeric(5,1) NULL,
                blood_glucose    numeric(5,1) NULL,
                source           varchar(20)  NOT NULL DEFAULT 'self'
            );
            CREATE INDEX IF NOT EXISTS ix_vitals_patient_date
                ON patient_vitals (hospital_id, patient_id, log_date DESC, recorded_at DESC);

            CREATE TABLE IF NOT EXISTS health_tips (
                id          uuid         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
                hospital_id uuid         NULL     REFERENCES hospitals(id) ON DELETE CASCADE,
                title       varchar(200) NOT NULL,
                body        text         NOT NULL,
                category    varchar(50)  NOT NULL DEFAULT 'general',
                icon_name   varchar(50)  NULL,
                is_active   boolean      NOT NULL DEFAULT true,
                valid_from  date         NULL,
                valid_until date         NULL,
                sort_order  integer      NOT NULL DEFAULT 0,
                created_at  timestamptz  NOT NULL DEFAULT now()
            );
            CREATE INDEX IF NOT EXISTS ix_health_tips_active
                ON health_tips (hospital_id, is_active, category);

            CREATE TABLE IF NOT EXISTS patient_wearable_devices (
                id              uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
                hospital_id     uuid        NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
                patient_id      uuid        NOT NULL REFERENCES patients(id)  ON DELETE CASCADE,
                device_type     varchar(50) NOT NULL,
                device_name     varchar(200) NULL,
                is_active       boolean     NOT NULL DEFAULT true,
                last_synced_at  timestamptz NULL,
                created_at      timestamptz NOT NULL DEFAULT now()
            );
            CREATE INDEX IF NOT EXISTS ix_wearable_device_patient_active
                ON patient_wearable_devices (hospital_id, patient_id, is_active);

            CREATE TABLE IF NOT EXISTS wearable_vitals (
                id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
                patient_id  uuid        NOT NULL REFERENCES patients(id)  ON DELETE CASCADE,
                device_id   uuid        NOT NULL REFERENCES patient_wearable_devices(id) ON DELETE CASCADE,
                heart_rate  smallint    NULL CHECK (heart_rate BETWEEN 30 AND 250),
                spo2        smallint    NULL CHECK (spo2 BETWEEN 70 AND 100),
                recorded_at timestamptz NOT NULL DEFAULT now()
            );
            CREATE INDEX IF NOT EXISTS ix_wearable_vital_device_time
                ON wearable_vitals (patient_id, device_id, recorded_at DESC);
        ");
        Console.WriteLine("✅ Schema safety check passed (patient dashboard tables ensured).");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"⚠️  Schema safety check warning (patient dashboard): {ex.Message}");
    }

    // Safety net: patient_documents table
    try
    {
        await db.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS patient_documents (
                id            uuid         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
                hospital_id   uuid         NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
                patient_id    uuid         NOT NULL REFERENCES patients(id)  ON DELETE CASCADE,
                name          varchar(200) NOT NULL,
                document_type varchar(50)  NOT NULL DEFAULT 'other',
                storage_url   varchar(1000) NOT NULL,
                storage_path  varchar(500) NULL,
                uploaded_at   timestamptz  NOT NULL DEFAULT now()
            );
            CREATE INDEX IF NOT EXISTS ix_patient_documents_patient
                ON patient_documents (patient_id, uploaded_at DESC);
        ");
        Console.WriteLine("✅ Schema safety check passed (patient_documents table ensured).");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"⚠️  Schema safety check warning (patient_documents): {ex.Message}");
    }

    // Safety net: seed global health tips if none exist
    try
    {
        await db.Database.ExecuteSqlRawAsync(@"
            INSERT INTO health_tips (id, hospital_id, title, body, category, icon_name, sort_order)
            SELECT gen_random_uuid(), NULL, v.title, v.body, v.category, v.icon_name, v.sort_order
            FROM (VALUES
                ('Stay Hydrated','Drink at least 8 glasses (2 litres) of water daily. Proper hydration supports kidney function, energy levels, and skin health.','nutrition','water-outline',1),
                ('Move Every Hour','Sitting for long periods increases health risks. Stand up and walk for 2–3 minutes every hour to keep your circulation active.','exercise','walk-outline',2),
                ('Eat a Rainbow','Include colourful fruits and vegetables in every meal. Different colours provide different vitamins, minerals, and antioxidants.','nutrition','nutrition-outline',3),
                ('Prioritise Sleep','Adults need 7–9 hours of quality sleep. Good sleep improves memory, mood, immunity, and heart health.','general','moon-outline',4),
                ('Practice Deep Breathing','Take 5 slow deep breaths whenever you feel stressed. It activates your body''s natural calming response.','mental','pulse-outline',5),
                ('Limit Added Sugar','Excess sugar contributes to weight gain and inflammation. Swap sugary drinks for water or herbal tea.','nutrition','cafe-outline',6),
                ('Wash Hands Frequently','Handwashing with soap for 20 seconds is one of the most effective ways to prevent the spread of infections.','general','hand-left-outline',7),
                ('Take the Stairs','Climbing stairs burns more calories per minute than jogging and strengthens your legs and heart.','exercise','trending-up-outline',8),
                ('Mind Your Posture','Poor posture leads to back and neck pain. Keep your screen at eye level and shoulders relaxed when sitting.','general','body-outline',9),
                ('Connect with Others','Strong social connections reduce stress and improve mental health. Call a friend or spend time with family today.','mental','people-outline',10),
                ('Eat Mindfully','Slow down and savour each bite. Eating without distractions helps recognise fullness and improves digestion.','nutrition','restaurant-outline',11),
                ('Protect Your Eyes','Every 20 minutes, look at something 20 feet away for 20 seconds to reduce digital eye strain.','general','eye-outline',12),
                ('Stretch Daily','Just 10 minutes of stretching in the morning improves flexibility and reduces injury risk.','exercise','fitness-outline',13),
                ('Limit Screen Time Before Bed','Blue light from phones disrupts melatonin. Switch off screens at least 30 minutes before you sleep.','mental','phone-portrait-outline',14),
                ('Know Your Numbers','Regularly monitor your blood pressure, blood sugar, and weight. Early detection allows timely medical attention.','general','stats-chart-outline',15)
            ) AS v(title, body, category, icon_name, sort_order)
            WHERE NOT EXISTS (SELECT 1 FROM health_tips WHERE hospital_id IS NULL LIMIT 1);
        ");
        Console.WriteLine("✅ Global health tips seeded.");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"⚠️  Health tips seed warning: {ex.Message}");
    }

    // Seed medicine catalog for hospitals that have none
    try
    {
        await db.Database.ExecuteSqlRawAsync(@"
            INSERT INTO medicines (id, hospital_id, name, generic_name, category, dosage_form, strength, manufacturer, price, pack_size, stock_quantity, requires_prescription, is_active, created_at, updated_at)
            SELECT
                gen_random_uuid(), h.id, v.name, v.generic_name, v.category, v.dosage_form, v.strength, v.manufacturer, v.price, v.pack_size, v.stock_qty, v.rx, true, now(), now()
            FROM hospitals h
            CROSS JOIN (VALUES
                ('Paracetamol 500mg','Paracetamol','General','Tablet','500mg','Cipla',35,'10 tablets',100,false),
                ('Amoxicillin 500mg','Amoxicillin','Antibiotics','Capsule','500mg','Sun Pharma',85,'10 capsules',80,true),
                ('Cetirizine 10mg','Cetirizine','General','Tablet','10mg','Mankind',45,'10 tablets',120,false),
                ('Omeprazole 20mg','Omeprazole','Gastro','Capsule','20mg','Dr Reddys',65,'15 capsules',90,false),
                ('Pantoprazole 40mg','Pantoprazole','Gastro','Tablet','40mg','Alkem',78,'15 tablets',75,false),
                ('Azithromycin 500mg','Azithromycin','Antibiotics','Tablet','500mg','Cipla',110,'3 tablets',60,true),
                ('Amlodipine 5mg','Amlodipine','Cardiac','Tablet','5mg','Torrent',120,'14 tablets',50,true),
                ('Atorvastatin 10mg','Atorvastatin','Cardiac','Tablet','10mg','Lupin',95,'10 tablets',60,true),
                ('Metformin 500mg','Metformin','Diabetes','Tablet','500mg','USV',95,'20 tablets',80,true),
                ('Glimepiride 1mg','Glimepiride','Diabetes','Tablet','1mg','Sanofi',68,'10 tablets',50,true),
                ('Telmisartan 40mg','Telmisartan','Cardiac','Tablet','40mg','Glenmark',110,'14 tablets',55,true),
                ('Rosuvastatin 10mg','Rosuvastatin','Cardiac','Tablet','10mg','AstraZeneca',130,'10 tablets',45,true),
                ('Salbutamol Inhaler','Salbutamol','Respiratory','Inhaler','100mcg','Cipla',220,'200 doses',30,true),
                ('Beclometasone Inhaler','Beclometasone','Respiratory','Inhaler','250mcg','GSK',380,'200 doses',20,true),
                ('Cough Relief Syrup','Dextromethorphan','Respiratory','Syrup','15mg/5ml','Pfizer',90,'100ml bottle',70,false),
                ('Benadryl Syrup','Diphenhydramine','General','Syrup','12.5mg/5ml','Johnson',75,'150ml bottle',85,false),
                ('Neurobion Forte','Vit B1+B6+B12','Neuro','Tablet',null,'Merck',180,'30 tablets',100,false),
                ('Pregabalin 75mg','Pregabalin','Neuro','Capsule','75mg','Pfizer',145,'10 capsules',40,true),
                ('Vitamin D3 60k','Cholecalciferol','General','Sachet','60000IU','Abbott',120,'4 sachets',90,false),
                ('Clopidogrel 75mg','Clopidogrel','Cardiac','Tablet','75mg','Sanofi',95,'14 tablets',45,true)
            ) AS v(name, generic_name, category, dosage_form, strength, manufacturer, price, pack_size, stock_qty, rx)
            WHERE NOT EXISTS (SELECT 1 FROM medicines WHERE hospital_id = h.id);
        ");
        Console.WriteLine("✅ Medicine catalog seeded (skipped hospitals that already have medicines).");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"⚠️  Medicine seed warning: {ex.Message}");
    }
}

// ═══════════════════════════════════════════════════════════
//  START SERVER
// ═══════════════════════════════════════════════════════════

var port = Environment.GetEnvironmentVariable("PORT") ?? "5000";
app.Urls.Add($"http://0.0.0.0:{port}");

Console.WriteLine($"""

    ╔══════════════════════════════════════════╗
    ║          🏥 Nalam API v1.0.0            ║
    ║   Multi-Tenant Telemedicine Backend      ║
    ╠══════════════════════════════════════════╣
    ║   Port: {port,-33}║
    ║   Env:  {app.Environment.EnvironmentName,-33}║
    ╚══════════════════════════════════════════╝

    """);

app.Run();
