# Vitals 3-Tier Aggregation Setup Guide

## Overview

The vitals aggregation automatically converts raw readings (1 row/60s) into efficient tiers:
- **Tier 1: Raw Data** (7 days) → ~500K rows → Real-time queries
- **Tier 2: Hourly Aggregates** (2 years) → ~8,760 rows → Reports & analytics
- **Tier 3: Daily Summaries** (5+ years) → 365 rows → Compliance archive

## Database Migration

Apply the migration to create the new tables:

```bash
cd NalamApi
dotnet ef database update
```

Tables created:
- `patient_vitals_hourly` - One row per hour (min/max/avg/latest)
- `patient_vitals_daily` - One row per day (daily stats + morning/evening snapshots)
- `vitals_aggregation_log` - Tracks job execution history

## API Endpoints

Three new job endpoints are available:

```
POST /api/jobs/vitals/aggregate-hourly   - Run hourly at :05 past
POST /api/jobs/vitals/aggregate-daily    - Run daily at 00:15 UTC
POST /api/jobs/vitals/cleanup-old-raw    - Run daily at 01:00 UTC (deletes raw >7 days)
```

## Scheduling Options

### Option A: Railway Cron Job (Recommended)

Railway has built-in cron support. Set up three jobs:

**1. Hourly Aggregation - Every hour at :05 past**
```
5 * * * *
```
Command:
```bash
curl -X POST https://your-api.railway.app/api/jobs/vitals/aggregate-hourly \
  -H "Authorization: Bearer YOUR_INTERNAL_API_KEY"
```

**2. Daily Aggregation - Daily at 00:15 UTC**
```
15 0 * * *
```
Command:
```bash
curl -X POST https://your-api.railway.app/api/jobs/vitals/aggregate-daily \
  -H "Authorization: Bearer YOUR_INTERNAL_API_KEY"
```

**3. Cleanup Job - Daily at 01:00 UTC**
```
0 1 * * *
```
Command:
```bash
curl -X POST https://your-api.railway.app/api/jobs/vitals/cleanup-old-raw \
  -H "Authorization: Bearer YOUR_INTERNAL_API_KEY"
```

### Option B: GitHub Actions Workflow

Create `.github/workflows/vitals-aggregation.yml`:

```yaml
name: Vitals Aggregation

on:
  schedule:
    - cron: '5 * * * *'    # Hourly at :05
    - cron: '15 0 * * *'   # Daily at 00:15 UTC
    - cron: '0 1 * * *'    # Daily at 01:00 UTC

jobs:
  aggregate:
    runs-on: ubuntu-latest
    steps:
      - name: Hourly Aggregation
        if: github.event.schedule == '5 * * * *'
        run: |
          curl -X POST ${{ secrets.API_URL }}/api/jobs/vitals/aggregate-hourly \
            -H "Authorization: Bearer ${{ secrets.API_KEY }}"

      - name: Daily Aggregation
        if: github.event.schedule == '15 0 * * *'
        run: |
          curl -X POST ${{ secrets.API_URL }}/api/jobs/vitals/aggregate-daily \
            -H "Authorization: Bearer ${{ secrets.API_KEY }}"

      - name: Cleanup Old Raw Data
        if: github.event.schedule == '0 1 * * *'
        run: |
          curl -X POST ${{ secrets.API_URL }}/api/jobs/vitals/cleanup-old-raw \
            -H "Authorization: Bearer ${{ secrets.API_KEY }}"
```

### Option C: .NET BackgroundService (Built-in)

Add to Program.cs for always-running scheduled tasks:

```csharp
// In Program.cs, before app.Run()

// Add hosted background service
app.Services.AddHostedService<VitalsAggregationService>();
```

Create `Services/VitalsAggregationService.cs`:

```csharp
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using System.Net.Http;

public class VitalsAggregationService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly HttpClient _httpClient;

    public VitalsAggregationService(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
        _httpClient = new HttpClient();
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                // Hourly aggregation at :05 past each hour
                if (DateTime.UtcNow.Minute == 5)
                {
                    await _httpClient.PostAsync("/api/jobs/vitals/aggregate-hourly", null, stoppingToken);
                    await Task.Delay(TimeSpan.FromMinutes(2), stoppingToken); // Prevent re-run
                }

                // Daily aggregation at 00:15 UTC
                if (DateTime.UtcNow.Hour == 0 && DateTime.UtcNow.Minute == 15)
                {
                    await _httpClient.PostAsync("/api/jobs/vitals/aggregate-daily", null, stoppingToken);
                    await Task.Delay(TimeSpan.FromMinutes(2), stoppingToken);
                }

                // Cleanup at 01:00 UTC
                if (DateTime.UtcNow.Hour == 1 && DateTime.UtcNow.Minute == 0)
                {
                    await _httpClient.PostAsync("/api/jobs/vitals/cleanup-old-raw", null, stoppingToken);
                    await Task.Delay(TimeSpan.FromMinutes(2), stoppingToken);
                }

                await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
            }
            catch (Exception ex)
            {
                // Log error
                Console.Error.WriteLine($"Vitals aggregation error: {ex.Message}");
            }
        }
    }
}
```

## Monitoring

Check aggregation status:

```sql
-- View last aggregation run times
SELECT * FROM vitals_aggregation_log;

-- Count rows by tier
SELECT 
  'raw' as tier, COUNT(*) as rows FROM patient_vitals
UNION ALL
SELECT 'hourly', COUNT(*) FROM patient_vitals_hourly
UNION ALL
SELECT 'daily', COUNT(*) FROM patient_vitals_daily;

-- Check data quality by patient
SELECT 
  patient_id,
  COUNT(*) as readings,
  MIN(recorded_at) as first_reading,
  MAX(recorded_at) as last_reading
FROM patient_vitals
WHERE recorded_at > NOW() - INTERVAL '1 day'
GROUP BY patient_id;
```

## Storage Reduction

**Before (Raw only):**
- 1 reading per 60 seconds
- ~500K rows per patient per year
- ~50GB per 1,000 patients

**After (3-tier):**
- Raw: ~500K rows (deleted after 7 days)
- Hourly: ~8,760 rows
- Daily: 365 rows
- **Total: 9,125 rows per patient per year**
- **~2GB per 1,000 patients (95% reduction!)**

## Querying the Aggregates

### Get Weekly Report
```sql
SELECT
  DATE(hour_start) as day,
  ROUND(AVG(hr_avg)) as avg_hr,
  MAX(hr_max) as max_hr,
  MIN(hr_min) as min_hr,
  ROUND(AVG(spo2_avg)) as avg_spo2
FROM patient_vitals_hourly
WHERE patient_id = $1 AND hour_start >= NOW() - INTERVAL '7 days'
GROUP BY DATE(hour_start)
ORDER BY day;
```

### Get Monthly Report
```sql
SELECT
  log_date,
  hr_avg, hr_min, hr_max, hr_morning, hr_evening,
  spo2_avg, spo2_min, spo2_max,
  temp_avg, temp_min, temp_max,
  data_quality
FROM patient_vitals_daily
WHERE patient_id = $1 AND log_date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY log_date;
```

## Next Steps

1. **Apply migration** (`dotnet ef database update`)
2. **Choose scheduling option** (Railway cron recommended)
3. **Deploy API changes** (commit and push)
4. **Monitor logs** to ensure jobs run successfully
5. **Verify aggregates** are being created (check tables)

Jobs will run automatically once deployed! ✅
