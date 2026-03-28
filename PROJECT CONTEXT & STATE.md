======================================================
PROJECT CONTEXT & STATE (READ BEFORE GENERATING CODE)
======================================================

1. PROJECT OVERVIEW
------------------------------------------------------
* App Purpose: Nalam - A multi-tenant telemedicine platform (SaaS) for hospitals.
* Web Portal: React/Next.js (Hospital Registration Only) - Hosted on Vercel.
  - Live URL: https://nalamapp-webportal.vercel.app
  - Repo: https://github.com/Sureshb11/nalamapp-webportal
* Mobile App: React Native / Expo (Patient & Doctor interaction).
* Backend API: ASP.NET Core 10.0 (Minimal APIs) - Hosted on Railway.
  - Live URL: https://nalam-api-production.up.railway.app/api
  - Repo: https://github.com/NALAM-HCIT/nalam-platform
* Database: PostgreSQL - Managed by Supabase (Free Tier).
* Storage: Cloudinary (for Hospital Logos, Licenses, and Medical Records).
* OTP Provider: Pay4SMS API.

2. HARD RULES FOR AI (DO NOT IGNORE)
------------------------------------------------------
* RULE 1: Multi-Tenancy - Every table must have a 'HospitalID' to ensure data isolation.
* RULE 2: Authentication - Mobile app uses Mobile Number + OTP ONLY. No passwords/Employee IDs.
* RULE 3: Role-Based Access Control (RBAC) - Roles: Patient, Doctor, Hospital Admin, Staff (Pharmacist/Receptionist).
* RULE 4: Image Handling - Store URLs only in DB; actual files go to Cloudinary.
* RULE 5: Infrastructure - Keep code compatible with Docker for Railway deployment.
* RULE 6: Defense-in-Depth - 4-layer tenant isolation: JWT Claims → TenantMiddleware → EF Core Global Query Filters → PostgreSQL RLS.
* RULE 7: Never accept hospital_id from request body — always extract from JWT (except patient-register which is pre-auth).
* RULE 8: Auth Flow Split:
  - PATIENTS: Self-signup allowed. Any person can enter mobile number → if new, provide name → auto-create patient user → OTP login.
  - CARE PROVIDERS (Doctor, Pharmacist, Receptionist, Admin): Must be pre-created by hospital admin via Admin > Users. Cannot self-register.

3. DEVELOPMENT CHECKLIST (CURRENT STATE)
------------------------------------------------------
* [x] Phase 1: Tech Stack Selection & Architecture - COMPLETED
* [x] Phase 2A: Backend Project Setup (ASP.NET Core 9.0) - COMPLETED
* [x] Phase 2B: Entity Models & DbContext (6 tables) - COMPLETED
* [x] Phase 2C: DTOs (Auth, Admin, Hospital) - COMPLETED
* [x] Phase 2D: Services (JwtService, OtpService, AuditService) - COMPLETED
* [x] Phase 2E: TenantMiddleware (RLS support) - COMPLETED
* [x] Phase 2F: API Endpoints (Auth, Admin, Hospital) - COMPLETED
* [x] Phase 2G: Program.cs (DI, JWT, CORS, Rate Limiting) - COMPLETED
* [x] Phase 2H: Dockerfile & Configuration - COMPLETED
* [x] Phase 2I: Build Verification (0 errors, 0 warnings) - COMPLETED
* [x] Phase 2J: EF Core Migration (InitialCreate) - COMPLETED
* [x] Phase 2K: Supabase DB Connection configured - COMPLETED
* [x] Phase 2L: Manual Execution of Schema & RLS Scripts in Supabase - COMPLETED
* [x] Phase 3: Hospital Web Registration Flow (Vercel -> Railway API) - COMPLETED
* [x] Phase 4: Mobile App Integration (Connect Admin screens to APIs) - COMPLETED
  * [x] Removed Employee ID mockup login
  * [x] Created Axios interceptor and connected AuthStore to secure endpoints
  * [x] Connected Admin Dashboard, Users, Settings, and Profile to backend APIs
* [x] Phase 4.5: Global Backend Deployment (Railway URL Configured) - COMPLETED
* [x] Phase 4.6: Web Portal Deployment (Vercel: nalamapp-webportal.vercel.app) - COMPLETED
* [x] Phase 4.7: Live Database Configuration & CORS Fix (Supabase IPv4 Pooler) - COMPLETED
* [x] Phase 4.8: Database Migration Applied to Supabase - COMPLETED
  * [x] EF Core idempotent migration script generated (migrate.sql)
  * [x] InitialCreate migration applied (hospitals, users, otp_verifications, departments, hospital_settings, audit_logs + indexes)
  * [x] AddAppointmentBooking migration applied (doctor_profiles, doctor_schedules, appointments + indexes + double-booking prevention)
* [x] Phase 5: Patient Appointment Booking Flow (End-to-End) - COMPLETED
  * [x] Backend: DoctorProfile, DoctorSchedule, Appointment entities with EF Core
  * [x] Backend: AppointmentEndpoints (8 endpoints - list doctors, availability, book, list, view, reschedule, cancel, status change)
  * [x] Backend: AdminEndpoints extended with doctor profile & schedule CRUD (6 endpoints)
  * [x] Backend: Seed data endpoint (POST /api/admin/seed-doctors) for quick testing
  * [x] Backend: EF Core migration (AddAppointmentBooking) created
  * [x] Backend: PatientOnly authorization policy added
  * [x] Backend: Double-booking prevention via partial unique index
  * [x] Backend: Fee snapshot + pricing breakdown (GST 5% + ₹49 platform fee + coupon support)
  * [x] Backend: Booking reference generation (NLM-{year}-{sequential})
  * [x] Mobile: appointmentService.ts (TypeScript service layer with all API calls)
  * [x] Mobile: consultation-type.tsx rewritten (API-driven doctor list, debounced search, specialty filter)
  * [x] Mobile: slot-selection.tsx rewritten (API-driven availability, date picker, time slot groups)
  * [x] Mobile: booking-review.tsx connected to createAppointment API with loading/error states
  * [x] Mobile: booking-confirmation.tsx displays real booking reference from API
  * [x] Mobile: bookings.tsx (tabs) rewritten with API-driven upcoming/past lists + cancel action
  * [x] Mobile: Admin manage-doctors.tsx screen (create/delete profiles, add/delete schedules)
  * [x] Mobile: Admin dashboard quick action wired to manage-doctors screen
  * [x] Mobile: Admin layout registered manage-doctors stack screen
* [x] Phase 5.5: Doctor Dashboard & Consultation Flow (API-Connected) - COMPLETED
  * [x] Mobile: doctorService.ts (TypeScript service layer - getTodayAppointments, getUpcoming, getPast, changeStatus, getDetail)
  * [x] Mobile: doctor/(tabs)/index.tsx rewritten - API-driven dashboard with stats, appointment cards, status actions, Start Consultation button
  * [x] Mobile: doctor/(tabs)/patients.tsx rewritten - API-driven Upcoming/Past tabs, search, pull-to-refresh, status change actions
  * [x] Mobile: doctor/active-consultation.tsx rewritten - receives appointment ID, fetches real patient data, chief complaint + observations + e-prescription form, session timer
  * [x] Mobile: doctor/consultation-summary.tsx rewritten - receives clinical data via params, real patient info, diagnosis input, Finalize marks appointment completed via API
  * [x] Mobile: doctor/consultation-success.tsx rewritten - displays real patient name/booking ref, session duration, navigates back to dashboard
  * [x] Backend: AppointmentResponse extended with PatientName, PatientInitials, PatientId
  * [x] Backend: GET /api/appointments supports date=today filter for doctor dashboard
* [x] Phase 6: Receptionist Dashboard & Patient Flow (API-Connected) - COMPLETED
  * [x] Backend: ReceptionistEndpoints (dashboard stats, today's queue, patient search, walk-in registration)
  * [x] Backend: Appointment entity extended with 'arrived' and 'in_consultation' statuses
  * [x] Backend: ChangeAppointmentStatus endpoint updated for new statuses
  * [x] Mobile: services/receptionistService.ts (TypeScript service layer - getDashboard, getQueue, searchPatients, registerWalkIn, checkInPatient)
  * [x] Mobile: receptionist/(tabs)/index.tsx - API-driven dashboard (live stats grid, upcoming queue, check-in actions)
  * [x] Mobile: receptionist/(tabs)/appointments.tsx - API-driven live queue with status filters, search, check-in actions
  * [x] Mobile: receptionist/(tabs)/patients.tsx - API-driven patient search & walk-in registration modal
  * [x] Mobile: receptionist/patient-arrival.tsx - token assignment, vitals, room assignment, send-to-doctor flow
  * [x] Mobile: stores/authStore.ts - added missing setRole method
  * [x] Mobile: Fixed TS2702 Alert.AlertButton errors across 5 edit-profile screens
  * [x] TypeScript build verification: 0 errors (npx tsc --noEmit)
* [x] Phase 7: Pharmacist Dashboard & Order Management (API-Connected) - COMPLETED
  * [x] Backend: PharmacistEndpoints (dashboard stats, prescriptions queue, dispense, reject)
  * [x] Backend: Added prescription_status column to Appointment entity (null/pending/dispensed/rejected)
  * [x] Backend: Auto-trigger in ChangeAppointmentStatus — sets prescription_status=pending on completion with notes
  * [x] Mobile: services/pharmacistService.ts (TypeScript service layer - getDashboard, getPrescriptions, dispensePrescription, rejectPrescription)
  * [x] Mobile: pharmacist/(tabs)/index.tsx - API-driven dashboard (live stats, pending prescriptions queue, review/dispense/reject)
  * [x] Mobile: pharmacist/(tabs)/inventory.tsx - API-driven prescriptions list with filters, search, dispense/reject actions
  * [x] Mobile: pharmacist/(tabs)/orders.tsx - API-driven processed orders (dispensed + rejected history)
  * [x] Backend build: 0 errors, 0 warnings
  * [x] TypeScript build: 0 errors (npx tsc --noEmit)
* [x] Phase 8: Patient Remaining Screens (API-Connected) - COMPLETED
  * [x] Backend: PatientEndpoints (consultation-history, prescriptions list, prescription detail, profile-stats)
  * [x] Backend: Registered MapPatientEndpoints() in Program.cs
  * [x] Mobile: services/patientService.ts (typed service layer for all 4 patient endpoints)
  * [x] Mobile: patient/(tabs)/records.tsx — live consultation history from API (replaced mock data)
  * [x] Mobile: patient/digital-prescription.tsx — fetches real prescription by appointmentId route param
  * [x] Mobile: patient/(tabs)/profile.tsx — live profile stats (visits, Rx, appointments) from API
  * [x] Deferred: pharmacy.tsx (needs inventory table), care-schedule.tsx (client-side only)
  * [x] Backend build: 0 errors, 0 warnings
  * [x] TypeScript build: 0 errors (npx tsc --noEmit)
* [x] Phase 9: Doctor Remaining Screens (API-Connected) - COMPLETED
  * [x] Backend: DoctorPortalEndpoints (directory, my-profile, patient-summary)
  * [x] Backend: Registered MapDoctorPortalEndpoints() in Program.cs
  * [x] Mobile: services/doctorPortalService.ts (typed service layer for all 3 endpoints)
  * [x] Mobile: doctor/(tabs)/directory.tsx — live staff list from API grouped by role
  * [x] Mobile: doctor/(tabs)/profile.tsx — live doctor profile + appointment stats from API
  * [x] Mobile: doctor/patient-clinical-summary.tsx — live patient data by patientId
  * [x] Deferred: messages.tsx (needs real messaging infrastructure)
  * [x] Backend build: 0 errors, 0 warnings
  * [x] TypeScript build: 0 errors (npx tsc --noEmit)
* [x] Phase 10: Supabase Storage for Document Uploads - COMPLETED
  * [x] Installed `@supabase/supabase-js` and `base64-arraybuffer` packages
  * [x] services/supabase.ts — Supabase client config (configured with anon key)
  * [x] services/uploadService.ts — Supabase Storage: profile photos, medical docs, prescriptions
  * [x] nalam-uploads bucket created & public access enabled in Supabase Storage
  * [x] hooks/useProfilePhoto.ts — shared hook (camera/gallery + Supabase upload + progress)
  * [x] Integrated into patient/(tabs)/profile.tsx and doctor/(tabs)/profile.tsx
  * [x] Removed Firebase dependency (no Blaze billing needed)
  * [x] TypeScript build: 0 errors (npx tsc --noEmit)
* [x] Phase 11: Agora Video Integration - COMPLETED
  * [x] Mobile: services/agoraService.ts - Agora SDK integration (RTC Engine)
  * [x] Mobile: patient/video-consultation.tsx - real Agora video call integration
  * [x] Mobile: doctor/active-consultation.tsx - real Agora video call integration
  * [x] Fixed channel name alignment (consultation_{id}) between roles
  * [x] TypeScript build: 0 errors (npx tsc --noEmit)
* [x] Phase 12: Real SMS Gateway Integration - COMPLETED
  * [x] Backend: services/OtpService.cs - Pay4Sms API integration
  * [x] Backend: appsettings.json - configured ApiKey, SenderId (NALAMS), and Template
  * [x] Backend: Integrated ABHA verification format for OTP messages
  * [x] Backend: Auto-migration enabled for Railway deployments
* [x] Phase 13: Performance Optimizations & Railway Migration - COMPLETED
  * [x] Backend: Migrated hosting from Render to Railway (no cold starts)
  * [x] Backend: Added IMemoryCache for dashboard stats (2-min TTL per hospitalId)
  * [x] Backend: Added response compression (gzip, EnableForHttps = true)
  * [x] Backend: AsNoTracking() added to all read-only EF Core queries (30-40% faster)
  * [x] Web Portal: Updated NEXT_PUBLIC_API_URL to Railway URL in Vercel env vars
  * [x] Web Portal: Repo moved to https://github.com/Sureshb11/nalamapp-webportal
  * [x] Web Portal: Step-by-step progress indicator added to hospital registration form
  * [x] Railway Root Directory set to NalamApi (fixes Metro bundler misdeployment)
* [x] Phase 14: .NET 10 Upgrade - COMPLETED
  * [x] Upgraded NalamApi.csproj target framework to net10.0.
  * [x] Configured mixpacks.toml for Railway to use .NET 10 SDK.
* [x] Phase 15: Web Portal UI/UX Enhancement - COMPLETED
  * [x] Revamped page.tsx with premium Glassmorphism and responsive layout.
  * [x] Upgraded globals.css with new Emerald-Teal brand palette and keyframe animations.
  * [x] Built and verified React components locally (0 Next.js errors).

* [x] Phase 16: Multi-Role Login & Role Switching (Full Stack) - COMPLETED
  * [x] Backend: New UserRole entity + user_roles junction table (many-to-many user↔role)
  * [x] Backend: EF Core migration (AddUserRolesTable) with data seed SQL (copies existing roles)
  * [x] Backend: User entity updated with UserRoles navigation property
  * [x] Backend: AuthDtos updated — UserInfo includes List<string> Roles, added SwitchRoleRequest
  * [x] Backend: verify-otp endpoint loads all active roles from user_roles, returns roles array
  * [x] Backend: patient-register also creates UserRole record
  * [x] Backend: New POST /api/auth/switch-role — validates role, issues new JWT, audit logs
  * [x] Backend: AdminDtos updated — CreateUserRequest gets Roles[], ChangeRoleRequest accepts List<string>
  * [x] Backend: AdminEndpoints — CreateUser inserts user_roles, ChangeUserRole syncs roles, GetUsers/GetProfile include roles
  * [x] Mobile: stores/authStore.ts — roles[] persisted in SecureStore, new switchRole() method
  * [x] Mobile: Unified care-provider login (care-provider-select.tsx → phone+OTP for all staff)
  * [x] Mobile: New care-provider-otp.tsx (6-digit OTP, routes to role-select if multiple roles)
  * [x] Mobile: New care-provider-role-select.tsx (role cards with icons, calls switchRole on selection)
  * [x] Mobile: New components/RoleSwitcher.tsx (pill badge + bottom sheet, only shows if 2+ roles)
  * [x] Mobile: RoleSwitcher integrated into admin, doctor, receptionist, pharmacist profile screens
  * [x] Mobile: app/_layout.tsx AuthGate updated for transitional screens (OTP, role-select)
  * [x] Mobile: admin/create-user.tsx sends roles[] array to backend
  * [x] Mobile: admin/(tabs)/users.tsx shows multiple role badges per user
  * [x] Mobile: All 6 OTP screens updated to pass roles array to login()
  * [x] Backend build: 0 errors, 0 warnings
  * [x] Patient login flow completely unchanged

* [x] Phase 17: Hospital-Specific App Deployment (Multi-Tenant Build System) - COMPLETED
  * [x] Backend: SendOtpRequest & VerifyOtpRequest DTOs accept optional Guid? HospitalId
  * [x] Backend: send-otp endpoint scopes user lookup by hospitalId when provided (backward compatible)
  * [x] Backend: verify-otp endpoint scopes OTP lookup by user's hospitalId when provided
  * [x] Backend: Same mobile number across hospitals now correctly resolves to the right user
  * [x] Mobile: Converted static app.json → dynamic app.config.ts (reads EXPO_PUBLIC_* env vars)
  * [x] Mobile: New config/hospital.ts — centralized hospital branding (name, tagline, ID from env)
  * [x] Mobile: Patient login header uses HospitalConfig.name instead of hardcoded hospital name
  * [x] Mobile: Care provider login header uses HospitalConfig.name
  * [x] Mobile: All 11 login/OTP screens pass hospitalId to send-otp and verify-otp calls
  * [x] Mobile: Created .env.arunpriya template (first hospital env config)
  * [x] Mobile: Updated .env with hospital identity variables (HOSPITAL_ID, NAME, TAGLINE, SLUG, BUNDLE_ID)
  * [x] Mobile: eas.json updated with per-hospital build profiles (arunpriya extends production)
  * [x] Mobile: package.json build scripts — build:hospital, build:arunpriya:android, build:arunpriya:ios
  * [x] No database migration needed — existing (hospital_id, mobile_number) composite unique already supports multi-hospital patients
  * [x] 4-layer tenant isolation intact: JWT Claims → TenantMiddleware → EF Core Filters → PostgreSQL RLS
  * [x] Backend build: 0 errors | TypeScript build: 0 new errors

* [x] Phase 19: Admin Dashboard Enhancements (2026-03-26) - COMPLETED
  * [x] Backend: DashboardResponse DTO extended — TodayConfirmedAppointments, TodayCompletedAppointments, TodayCancelledAppointments, TodayPendingPrescriptions, TodayDispensedPrescriptions (revenue field removed)
  * [x] Backend: GetDashboard endpoint updated with per-status breakdown queries using shared IQueryable
  * [x] Mobile: admin/(tabs)/index.tsx — Removed "Doctors" quick action card (Stethoscope icon)
  * [x] Mobile: admin/(tabs)/index.tsx — Removed "Today Revenue" overview card
  * [x] Mobile: admin/(tabs)/index.tsx — Today's Appointments card shows breakdown (Confirmed / Completed / Cancelled) on press
  * [x] Mobile: admin/(tabs)/index.tsx — Today's Prescriptions card shows breakdown (Pending / Dispensed) on press
  * [x] Commit: 43c592f

* [x] Phase 19.5: Admin User Management Bug Fixes (2026-03-26) - COMPLETED
  * [x] Rename "Change Role" → "Manage Roles" (reflects add + remove capability, not just swap)
  * [x] Fix nested modal conflict — close user detail modal before showing action alerts
  * [x] Fix close role modal before showing nested alerts to prevent modal conflict
  * [x] Fix EF Core optimistic concurrency exception on user role save — load UserRoles directly instead of relying on tracked navigation property
  * [x] Auto-create DoctorProfile when "doctor" role is assigned to a user
  * [x] Prompt admin to log out and re-login if they change their own role
  * [x] Remove "Reset Auth" action from user detail modal
  * [x] Commits: 7492e17 → 93605ce → 5d49128 → 70ff4a8 → 81ef150 → 46df606

* [x] Phase 20: Receptionist Phase 1 — Real API Wiring (2026-03-27) - COMPLETED
  * [x] Backend: GET /api/reception/appointments/{id} — appointment detail for patient arrival screen
  * [x] Backend: PATCH /api/reception/appointments/{id}/checkin — sets status to "arrived" (replaces broken patient-facing endpoint call)
  * [x] Backend: PATCH /api/reception/appointments/{id}/in-consultation — sets status to "in_consultation"
  * [x] Mobile: receptionistService.ts — added getAppointmentDetail(), checkIn(), sendToDoctor(); removed broken checkInPatient()
  * [x] Mobile: receptionist/(tabs)/appointments.tsx — Check In button calls checkIn() API before navigating, shows API error on failure
  * [x] Mobile: receptionist/patient-arrival.tsx — full rewrite: loads real data via getAppointmentDetail(), all hardcoded arrivalData replaced, "Send to Doctor" calls sendToDoctor() and updates status in DB
  * [x] Mobile: patient-arrival.tsx — canSend = tokenAssigned only (no rooms table); room assignment stays as optional local UX
  * [x] Commit: b46e218

* [x] Phase 21: Receptionist Phase 2 — Book Appointment, Real Profile & Stats (2026-03-27) - COMPLETED
  * [x] Backend: GET /api/reception/profile — returns logged-in receptionist's fullName, mobileNumber, email, department, employeeId, joinDate
  * [x] Backend: PATCH /api/reception/profile — updates email/department fields
  * [x] Backend: GET /api/reception/stats — real DB counts: registeredToday, appointmentsToday, walkInsToday, pendingCheckIns
  * [x] Backend: GET /api/reception/doctors — lists active DoctorProfiles where IsAcceptingAppointments && User.Status == "active"
  * [x] Backend: POST /api/reception/book-appointment — creates Appointment (status=confirmed, paymentStatus=pending, paymentMethod=counter), validates double-booking, generates REC-{date}-{guid6} reference
  * [x] Mobile: receptionistService.ts — added interfaces (AppointmentDetail, ReceptionistProfile, ReceptionistStats, DoctorItem) and methods (getProfile, updateProfile, getStats, getDoctors, bookAppointment)
  * [x] Mobile: receptionist/(tabs)/profile.tsx — replaced static QUICK_STATS with STAT_META + real API data from getProfile() and getStats()
  * [x] Mobile: receptionist/(tabs)/patients.tsx — full 2-step booking modal: Step 1 = Doctor selection (cards with specialty/fee), Step 2 = Date chips + Time slot grid; calls bookAppointment() on confirm; shows booking reference on success
  * [x] Commit: 75f798d

* [x] Phase 22: Receptionist Appointments Grouped by Category (2026-03-27) - COMPLETED
  * [x] Mobile: receptionist/(tabs)/appointments.tsx — "All" tab now renders colour-coded section groups (Waiting / In Consultation / Upcoming / Completed) with per-section count badges
  * [x] Mobile: appointments.tsx — individual filter tabs retain existing flat filtered list behaviour
  * [x] Mobile: appointments.tsx — header subtitle shows total count + active (non-completed) count

* [x] Phase 23: Receptionist Dashboard Navigation + Real Notifications (2026-03-27) - COMPLETED
  * [x] Backend: GET /api/reception/notifications — last 24h audit log events (appointment + reception categories), friendly titles + filter hints
  * [x] Mobile: receptionist/(tabs)/index.tsx — stats cards navigate to Appointments tab with filter (all/arrived/in_consultation/completed)
  * [x] Mobile: index.tsx — New Reg → Patients tab; Instant Check-in → Appointments (confirmed filter); Emergency → Patients tab; Schedule → Appointments (confirmed filter) [superseded by Phase 25]
  * [x] Mobile: index.tsx — "View All" navigates to Appointments tab; upcoming list shows confirmed/pending only; checkIn() used consistently
  * [x] Mobile: index.tsx — notifications modal shows real audit log data; tapping notification navigates to Appointments with relevant filter
  * [x] Mobile: appointments.tsx — useLocalSearchParams reads filter param on navigation; useEffect applies it; useFocusEffect reloads list on tab focus
  * [x] Commit: fa9fe06

* [x] Phase 24: Patient Registration & Appointment Booking Improvements (2026-03-27) - COMPLETED
  * ── Schema ──
  * [x] No schema changes — unique (hospital_id, mobile_number) in patients table retained; overbooking removed at application layer only
  * ── Backend ──
  * [x] CreatePatient: 409 Conflict now returns existingPatient object {id, fullName, mobileNumber, initials} so frontend can offer "Use Existing Patient"
  * [x] BookAppointment: Removed double-booking conflict check — multiple appointments per doctor slot now allowed
  * ── Frontend ──
  * [x] patients.tsx: handleRegisterPatient catches 409 with existingPatient body → warning dialog: "Search Patient" pre-fills search bar with mobile number
  * [x] patients.tsx: availableSlots computed — when Today is selected, filters out past time slots (compares slot HH:MM against current time); future dates show all 16 slots
  * [x] patients.tsx: useEffect clears selectedTime if it becomes unavailable after date changes to today
  * [x] patients.tsx: Time section header shows "(Today — future slots only)" hint; empty-slots state shown when no more slots remain today

* [x] Phase 25: Emergency Priority & Dashboard Quick Actions (2026-03-27) - COMPLETED
  * ── Schema ──
  * [x] Migration DropDoubleBookingIndex (20260327091720): drops ix_appointments_no_double_booking partial unique index (IF EXISTS — idempotent)
  * [x] Migration AddAppointmentPriority (20260327092830): adds priority column to appointments (varchar(20), NOT NULL DEFAULT 'normal', IF NOT EXISTS — idempotent)
  * ── Backend ──
  * [x] Appointment entity: Priority property added (string, Column("priority"), MaxLength(20), default "normal")
  * [x] GetTodayQueue: accepts optional priority? query param; filters by priority; orders emergency first (Priority == "emergency" → top); returns priority field in response
  * [x] BookAppointmentRequest record: string? Priority field added
  * [x] BookAppointment: Priority = (request.Priority == "emergency") ? "emergency" : "normal" stored on Appointment
  * ── Frontend ──
  * [x] receptionistService.ts: QueuePatient interface gains priority: string; bookAppointment params gain priority?: string
  * [x] index.tsx (dashboard): Removed "Instant Check-in" and "Schedule" quick actions; now only "New Reg" + "Emergency"; Emergency navigates to Appointments tab with filter=emergency
  * [x] appointments.tsx: AppointmentStatus type extended with 'emergency'; Emergency filter tab added (count = priority==='emergency'); Emergency section at top of grouped view (red); filteredAppointments handles emergency filter via priority field
  * [x] patients.tsx: bookingPriority state ('normal'|'emergency'); Regular/Emergency toggle selector added at top of Step 1 in booking modal; priority passed to bookAppointment API call
  * [x] Commits: b5f5656 (feature), f3093dc (idempotent migrations fix)

* [x] Phase 26: Patient Booking Review — Razorpay, Pay on Visit, Real Patient Details - COMPLETED
  * ── Frontend ──
  * [x] booking-review.tsx: Removed hardcoded "John Doe"; Patient Details section reads real name + phone from useAuthStore
  * [x] booking-review.tsx: Removed Insurance Coverage payment option
  * [x] booking-review.tsx: Added "Pay on Visit" — skips payment, books directly with paymentStatus=pending
  * [x] booking-review.tsx: Razorpay integration (KEY_ID: rzp_test_h8mR4F2lGwgFX4) — lazy require() inside try/catch (prevents Expo Go native module crash)
  * [x] booking-review.tsx: CTA label dynamic — "Confirm Booking" for Pay on Visit, "Pay ₹X & Confirm" for online payment
  * [x] booking-review.tsx: Razorpay null-check — shows alert to use native build if module unavailable (Expo Go)
  * ── Backend ──
  * [x] AppointmentEndpoints.cs: PaymentStatus = "pending" when paymentMethod == "pay_on_visit", else "paid"
  * [x] AppointmentEndpoints.cs: Booking reference changed from sequential counter to random hex — NLM-{year}-{guid6} (global uniqueness, no FK collision)
  * [x] AppointmentEndpoints.cs: DbUpdateException caught + inner exception message exposed in response ({error, innerError, stackTrace})
  * [x] AppointmentEndpoints.cs: AuditLog.UserId = null for patient-initiated actions (CreateAppointment, UpdateAppointment, CancelAppointment) — prevents FK violation (patients table ≠ users table)
  * ── Bug Fixes ──
  * [x] stores/authStore.ts: userName + userId now persisted to SecureStore on login() and restored in checkAuth() — survives app restart
  * [x] Fixed "Booking Failed: An error occurred while saving the entity changes" — root cause was AuditLog FK constraint (patientId ≠ userId)
  * [x] Commits: a01b0d1 → 22c276b → 3afc2f6 → 3330bb0 → b3c367c

* [x] Phase 27: Receptionist Booking — Real Doctor Schedule Slots from DB - COMPLETED
  * ── Backend ──
  * [x] ReceptionistEndpoints.cs BookAppointment: Added .Include(dp => dp.User) to doctor fetch
  * [x] ReceptionistEndpoints.cs BookAppointment: Schedule validation — queries doctor_schedules by (doctorProfileId, dayOfWeek, startTime, consultationType), returns 400 if no matching schedule
  * [x] ReceptionistEndpoints.cs BookAppointment: endTime = startTime.AddMinutes(schedule.SlotDurationMinutes) (was hardcoded 30 min)
  * [x] ReceptionistEndpoints.cs BookAppointment: Transaction-wrapped capacity check — CountAsync booked slots, Conflict(409) if bookedCount >= MaxPatientsPerSlot
  * [x] ReceptionistEndpoints.cs BookAppointment: DbUpdateException catch with inner exception exposure
  * [x] ReceptionistEndpoints.cs BookAppointment: Response includes endTime, slotOccupancy, doctorName; audit log includes slotOccupancy
  * ── Frontend ──
  * [x] receptionistService.ts: Added getAvailableSlots(doctorProfileId, date) — calls GET /api/appointments/doctors/{id}/availability?startDate={date}&days=1; returns SlotGroup[]
  * [x] patients.tsx: Removed hardcoded TIME_SLOTS (9AM-2PM, 16 slots); replaced with API-driven slot groups (Morning/Afternoon/Evening)
  * [x] patients.tsx: SlotChip sub-component — shows occupancy badge (bookedCount/maxCapacity), disabled when full
  * [x] patients.tsx: useEffect fetches slots when doctor selected + bookingStep==2; cancelled on cleanup
  * [x] patients.tsx: Today → future slots only; future date → all slots (same business rules as patient booking — handled server-side in IST timezone)
  * [x] patients.tsx: handleBookingSubmit uses to24h() helper to convert display time → 24h for API; error reads innerError || error
  * [x] Commit: 723095f

* [x] Phase 29: Live Data — Post-Consultation, Doctor Dashboard, Patient Clinical Summary (2026-03-27) - COMPLETED
  * ── Backend ──
  * [x] DoctorPortalEndpoints.cs: GetMyProfile now includes(Hospital) to resolve hospitalName; added hospitalName to API response
  * ── Frontend ──
  * [x] services/doctorPortalService.ts: Added hospitalName: string | null to DoctorMyProfile interface
  * [x] doctor/(tabs)/index.tsx: Fetches getMyProfile() in parallel with today/upcoming appointments; displays real hospital name (fallback: "Nalam Hospital")
  * [x] patient/video-consultation.tsx: Passes appointmentId param when navigating to post-consultation screen
  * [x] patient/post-consultation.tsx: Fully rewritten — loads PrescriptionDetail via getPrescriptionDetail(appointmentId); shows real doctor name/specialty/hospital/date/notes; graceful fallback for missing ID
  * [x] doctor/patient-clinical-summary.tsx: Now accepts appointmentId param; "Start Consultation" navigates to active-consultation with correct id (falls back to appointments tab if no appointmentId)

* [x] Phase 34: Structured Prescription Items + Medicine Catalog Integration (2026-03-28) - COMPLETED
  * ── Schema ──
  * [x] New Entity: PrescriptionItem (prescription_items table) — appointment_id (FK CASCADE), medicine_id (FK nullable SET NULL → medicines), medicine_name (denormalized varchar 200 for history), dosage_instructions (varchar 500), quantity, created_at
  * [x] Migration: 20260328120000_AddPrescriptionItems — CREATE TABLE IF NOT EXISTS prescription_items + index on appointment_id
  * ── Backend ──
  * [x] NalamDbContext.cs: DbSet<PrescriptionItem>, relationships (Cascade from Appointment, SetNull from Medicine), appointment_id index
  * [x] Appointment.cs: Added ICollection<PrescriptionItem> PrescriptionItems navigation property
  * [x] MedicineEndpoints.cs: GET /api/medicines and /categories changed from PatientOnly → RequireAuthorization() — now accessible to all authenticated roles (doctors + pharmacists)
  * [x] AppointmentEndpoints.cs: POST /api/appointments/{id}/finalize (StaffAccess) — one-shot endpoint: saves chiefComplaint + observations + diagnosis as appointment.Notes, creates PrescriptionItem rows, sets status=completed, prescriptionStatus=pending if items present
  * [x] DoctorPortalEndpoints.cs: GET /api/doctor-portal/prescriptions/{id}/items (StaffAccess), POST /api/doctor-portal/prescriptions/{id}/items (DoctorOnly), DELETE /api/doctor-portal/prescriptions/{id}/items/{itemId} (DoctorOnly) — inline item management
  * [x] PharmacistEndpoints.cs: GetPrescriptions now .Include(a => a.PrescriptionItems) — each prescription card includes prescriptionItems[] with id/medicineId/medicineName/dosageInstructions/quantity
  * ── Service ──
  * [x] doctorPortalService.ts: Added MedicineCatalogItem, PrescriptionItem, AddPrescriptionItemPayload, FinalizeConsultationPayload interfaces; medicineService.search(); prescriptionItemService.{getItems, addItem, deleteItem, finalize}()
  * ── Frontend ──
  * [x] active-consultation.tsx: Replaced free-text medicine fields (medicineName/dosage/frequency/duration) with live medicine search — debounced GET /api/medicines?search= → dropdown results → tap adds to rxItems chip list (with remove); dosage instructions input per item
  * [x] consultation-summary.tsx: Parses rxItems from JSON route param; shows structured medication cards (name + dosage + qty); calls prescriptionItemService.finalize() — saves notes + items in one DB call (replaces old status-only PATCH)

* [x] Phase 33: Doctor Messaging + Pharmacy Prescription Widget (2026-03-28) - COMPLETED
  * ── Backend ──
  * [x] NalamApi/Entities/HospitalMessage.cs (NEW): Multi-tenant hospital_messages table (sender_id, recipient_id, body, is_read, created_at) — all staff within same hospital
  * [x] NalamApi/Data/NalamDbContext.cs: Added Messages DbSet + global query filter by hospital_id + relationships (Restrict delete for sender/recipient) + index on (hospital_id, sender_id, recipient_id, created_at)
  * [x] NalamApi/Migrations/20260328090000_AddHospitalMessages.cs (NEW): Idempotent CREATE TABLE IF NOT EXISTS
  * [x] NalamApi/Endpoints/MessageEndpoints.cs (NEW): StaffAccess policy. GET /api/messages/threads (all threads + contactable staff with no messages), GET /api/messages/thread/{recipientId} (history + auto-mark-read), POST /api/messages/send, PUT /api/messages/thread/{recipientId}/read
  * [x] NalamApi/Program.cs: Added app.MapMessageEndpoints()
  * ── Service ──
  * [x] services/messagesService.ts (NEW): MessageThread, MessageContact, MessageItem, ThreadResponse interfaces; getThreads(), getThread(id), sendMessage(id, body), markThreadRead(id)
  * ── Frontend ──
  * [x] doctor/(tabs)/messages.tsx: Full rewrite — replaced 5 fake conversations + 8 fake recipientList names with live API; loads threads + contactable staff; role-colored avatars; unread badge on avatar; "Tap to start a conversation" for new contacts; pull-to-refresh
  * [x] doctor/message-thread.tsx (NEW): Full chat screen — loads message history, polls every 10s; chat bubble UI (sent right/blue, received left/white); date separators (Today/Yesterday/weekday); read receipt (✓/✓✓); multiline TextInput + Send button; KeyboardAvoidingView
  * ── Quick fix ──
  * [x] patient/(tabs)/pharmacy.tsx: Removed hardcoded lastOrder (NLM-12345, Rs.300, fake items); replaced with live "Latest Prescription" widget loaded from patientService.getPrescriptions() — shows doctor name, date, prescription status (Dispensed/Pending), notes snippet

* [x] Phase 32: Patient Notifications (derived, no new table) (2026-03-27) - COMPLETED
  * ── Backend ──
  * [x] PatientEndpoints.cs: Added GET /api/patient/notifications — derives 4 notification types from existing data: (1) appointment reminder (upcoming within 48h), (2) prescription_ready (dispensed last 7 days), (3) prescription_pending (pending Rx), (4) consultation_summary (completed with notes last 3 days). Sorted unread-first then by timestamp desc.
  * ── Service ──
  * [x] services/patientService.ts: Added PatientNotification interface (id, type, title, body, timestamp ISO, read bool) + getNotifications() → GET /api/patient/notifications
  * ── Frontend ──
  * [x] patient/(tabs)/index.tsx: Removed 4-item hardcoded initialNotifications array; replaced with useState<PatientNotification[]>([])
  * [x] patient/(tabs)/index.tsx: Added notificationConfig map (type → { icon, color }) for appointment/prescription_ready/prescription_pending/consultation_summary
  * [x] patient/(tabs)/index.tsx: Added formatRelativeTime(iso) helper for human-readable timestamps
  * [x] patient/(tabs)/index.tsx: loadNotifications() useCallback + included in initial useEffect and pull-to-refresh
  * [x] patient/(tabs)/index.tsx: Notification modal now renders with type-based icon/color instead of inline icon refs; empty state shown when no notifications

* [x] Phase 31: Patient Care Plan + Doctor Profile Live Stats (2026-03-27) - COMPLETED
  * ── Backend ──
  * [x] PatientEndpoints.cs: Added GET /api/patient/care-plan — returns upcomingAppointment (next confirmed/pending with doctor/specialty/date/time), prescriptionNotes (last 3 completed appts with notes), activePrescriptionCount (dispensed Rx last 60 days)
  * ── Frontend ──
  * [x] services/patientService.ts: Added CarePlan interface + getCarePlan() → GET /api/patient/care-plan
  * [x] patient/(tabs)/index.tsx: Removed 10-item hardcoded initialTasks (fake Amlodipine, Metformin, Shoulder Stretches, etc.); replaced with buildTasksFromCarePlan() that maps API data to CareTask[]
  * [x] patient/(tabs)/index.tsx: Upcoming appointment → vitals task; each prescription note → medicine task (doctor name + truncated notes); always includes water intake + evening walk as defaults
  * [x] patient/(tabs)/index.tsx: pull-to-refresh also reloads care plan from API
  * [x] doctor/(tabs)/profile.tsx: Replaced static MENU_SECTIONS const with menuSections useMemo scoped to liveProfile
  * [x] doctor/(tabs)/profile.tsx: 'My Patients' subtitle → real stats.activePatients from API (was hardcoded "320")
  * [x] doctor/(tabs)/profile.tsx: handleStatPress 'Consults/Rating/Patients/Reviews' → real values from API (was fake data)
  * [x] doctor/(tabs)/profile.tsx: handleMenuPress 'my_patients' → real count + "View Appointments" navigates to patients tab
  * [x] doctor/(tabs)/profile.tsx: Removed hardcoded fake rating breakdown (84.7% five stars etc.), fake surgery stats, fake leave balances

* [x] Phase 30: Medicine Master Table + Doctor Edit-Profile Live API (2026-03-27) - COMPLETED
  * ── Backend ──
  * [x] New Entity: Medicine (medicines table) — hospital_id (FK), name, generic_name, category, dosage_form, strength, manufacturer, price, pack_size, stock_quantity, requires_prescription, is_active, created_at, updated_at
  * [x] Hospital entity: Added ICollection<Medicine> Medicines navigation property
  * [x] NalamDbContext: Added DbSet<Medicine>, Global Query Filter (tenant-scoped), Cascade relationship
  * [x] DoctorProfile entity: Added Qualification (varchar 200) and MciRegistration (varchar 100) fields
  * [x] Migration: 20260327160000_AddMedicinesAndDoctorProfileFields — CREATE TABLE IF NOT EXISTS medicines + ADD COLUMN IF NOT EXISTS qualification/mci_registration on doctor_profiles
  * [x] MedicineEndpoints.cs: GET /api/medicines (search + category filter, paginated), GET /api/medicines/categories
  * [x] MedicineEndpoints.cs: POST /api/medicines + PUT /api/medicines/{id} (StaffAccess — add/update medicine catalog)
  * [x] DoctorPortalEndpoints.cs: GetMyProfile now returns qualification + mciRegistration from doctor_profiles
  * [x] DoctorPortalEndpoints.cs: PUT /api/doctor-portal/my-profile — updates user (fullName, email, department) + doctorProfile (specialty, experienceYears, bio, languages, qualification, mciRegistration)
  * [x] Program.cs: app.MapMedicineEndpoints() registered; 20-medicine seed SQL runs on startup for hospitals with no medicines (using CROSS JOIN + ON CONFLICT DO NOTHING equivalent)
  * ── Frontend ──
  * [x] services/pharmacyService.ts: New service — getMedicines(search, category, page, pageSize), getCategories()
  * [x] services/doctorPortalService.ts: DoctorMyProfile.doctorProfile extended with qualification + mciRegistration; added UpdateDoctorProfilePayload interface + updateMyProfile() → PUT /api/doctor-portal/my-profile
  * [x] patient/(tabs)/pharmacy.tsx: Replaced hardcoded allMedicines array with live API via pharmacyService.getMedicines(); debounced search (400ms) re-fetches from server; category filter passes to API; ActivityIndicator while loading
  * [x] doctor/edit-profile.tsx: Full rewrite — loads profile via getMyProfile() on mount; all fields pre-populated (fullName, email, department, specialty, qualification, mciRegistration, experienceYears, bio); phone shown as read-only; save calls updateMyProfile() API; ActivityIndicator during load/save; completion % tracks 8 meaningful fields

* [x] Phase 28: Patient Profile — Full Live Data (2026-03-27) - COMPLETED
  * ── Backend ──
  * [x] GET /api/patient/profile — already existed in PatientProfileEndpoints.cs; returns all profile fields (no new endpoints needed)
  * [x] PUT /api/patient/profile — already existed; partial update (null fields skipped)
  * ── Frontend ──
  * [x] services/patientService.ts: Added PatientProfile interface (id, fullName, mobileNumber, email, profilePhotoUrl, bloodGroup, dateOfBirth, gender, address, city, state, pincode, emergencyContact*, insurance*, hospitalName)
  * [x] services/patientService.ts: Added UpdatePatientProfileRequest interface (all fields optional)
  * [x] services/patientService.ts: Added getProfile() → GET /api/patient/profile
  * [x] services/patientService.ts: Added updateProfile(data) → PUT /api/patient/profile
  * [x] patient/(tabs)/profile.tsx: Removed hardcoded PATIENT_INFO constant (fake UHID, blood, age, gender, email, address, emergency contact)
  * [x] patient/(tabs)/profile.tsx: Loads profile + stats in parallel via Promise.all on screen focus (useFocusEffect — re-fetches when returning from edit-profile)
  * [x] patient/(tabs)/profile.tsx: UHID derived as NLM-{first UUID segment} from patient.id
  * [x] patient/(tabs)/profile.tsx: Age computed from dateOfBirth (YYYY-MM-DD → years)
  * [x] patient/(tabs)/profile.tsx: Email/address show "Add…" prompts if empty; emergency contact shows "Tap to add" if not set
  * [x] patient/(tabs)/profile.tsx: Menu subtitles dynamic — active Rx count, total past visits, real insurance provider name
  * [x] patient/(tabs)/profile.tsx: ActivityIndicator shown in info card while loading
  * [x] patient/edit-profile.tsx: Shows full-screen loading spinner while fetching profile on mount
  * [x] patient/edit-profile.tsx: All form fields pre-populated from GET /api/patient/profile
  * [x] patient/edit-profile.tsx: Added City, State, Pincode, Insurance Provider, Policy Number fields (were missing)
  * [x] patient/edit-profile.tsx: Save button calls PUT /api/patient/profile; ActivityIndicator during save; API error shown on failure
  * [x] patient/edit-profile.tsx: UHID displayed from real patient ID
  * [x] Deferred (no backend): Vital signs (records.tsx), Pharmacy order history (order-history.tsx), Preferences/Security/Support (device-level settings)
  * [x] Commits: 7a43a9a (live data) → 1a72f41 (focus refresh fix)

* [x] Phase 18: Admin Settings Module (Full Stack — 6 Panels) - COMPLETED
  * ── Phase 18.1: Database Design & Schema ──
  * [x] hospitals table already contains all needed columns (name, address, city, state, phone, email, logo_url, license_no, status) — no migration needed
  * [x] New Entity: HospitalWorkingHour (hospital_working_hours table) — day_of_week, start_time (TimeOnly), end_time, is_enabled, break_start, break_end, updated_at
  * [x] New Entity: HospitalIntegration (hospital_integrations table) — name, type, is_connected, config_json, last_synced_at, status, created_at, updated_at
  * [x] Existing Entity: HospitalSetting (hospital_settings table) — key-value store for security + notification settings per hospital
  * [x] Unique index: ix_working_hours_hospital_day (hospital_id, day_of_week) — one row per day per hospital
  * [x] Unique index: ix_integrations_hospital_name (hospital_id, name) — prevents duplicate integrations per hospital
  * [x] FK constraints: hospital_working_hours.hospital_id → hospitals.id (CASCADE), hospital_integrations.hospital_id → hospitals.id (CASCADE)
  * [x] Global Query Filters added for HospitalWorkingHour and HospitalIntegration (tenant isolation layer 3)
  * [x] Hospital entity updated with navigation: WorkingHours and Integrations collections
  * [x] Migration: 20260326102248_AddSettingsModuleTables — creates tables + seeds default data for existing hospitals
  * [x] Seed SQL: 7 default working hours per hospital (08:00-20:00, Sunday off, 13:00-14:00 break)
  * [x] Seed SQL: 5 default integrations per hospital (ABDM, Lab, Pharmacy, Insurance, SMS/Twilio)
  * ── Phase 18.2: Backend API Implementation (10 Endpoints) ──
  * [x] GET  /api/admin/hospital-info — Read hospital details from hospitals table (tenant-scoped via JWT hospitalId claim)
  * [x] PUT  /api/admin/hospital-info — Partial update hospital (null fields skipped), audit logged
  * [x] GET  /api/admin/working-hours — Load 7 working hour records (auto-seeds defaults on first access)
  * [x] PUT  /api/admin/working-hours — Bulk upsert all 7 days (validates DayOfWeek 0-6, parses TimeOnly), audit logged
  * [x] GET  /api/admin/settings — Fetch all key-value settings for hospital (security + notification settings)
  * [x] PUT  /api/admin/settings — Upsert key-value settings (session_timeout, 2FA, max_attempts, audit_logging, notif_email/push/sms, alerts), audit logged
  * [x] GET  /api/admin/export-data — Streams hospital-specific JSON export (users, patients, appointments, doctor profiles, audit logs last 1000) as file download
  * [x] POST /api/admin/clear-cache — Evicts IMemoryCache for hospital dashboard, audit logged
  * [x] GET  /api/admin/integrations — List integrations (auto-seeds 5 defaults on first access), ordered by name
  * [x] PATCH /api/admin/integrations/{id} — Toggle connection status, sets last_synced_at on connect, audit logged
  * [x] All endpoints extract hospitalId from JWT claim (never from request body) — RULE 7 enforced
  * [x] All endpoints wrapped in AdminOnly authorization policy
  * [x] Security settings stored as key-value pairs: session_timeout_minutes, two_factor_enabled, max_login_attempts, audit_logging_enabled
  * [x] Notification settings stored as key-value pairs: notif_email, notif_push, notif_sms, alert_security, alert_user_activity, alert_system
  * ── Phase 18.3: Frontend / Mobile App (6 Settings Panels) ──
  * [x] Hospital Information panel — fetches GET /admin/hospital-info, editable fields, saves via PUT
  * [x] Working Hours panel — fetches GET /admin/working-hours, day-wise toggles + formatted times, saves via PUT
  * [x] Security Settings panel — fetches from /admin/settings, manages 2FA toggle, audit logging toggle, session timeout, max login attempts
  * [x] Notification Settings panel — fetches from /admin/settings, manages email/push/SMS channels + security/user-activity/system alert types
  * [x] Data Management panel — Export Data (JSON file download via expo-file-system + expo-sharing), Clear Cache (confirmation dialog)
  * [x] Integration panel — fetches GET /admin/integrations, toggle connect/disconnect with confirmation dialog, live status indicator
  * [x] Lazy loading: data fetched only when panel is opened (useEffect on activePanel)
  * [x] Modal-based UI with slide animation, back/close buttons, loading spinners
  * [x] Fixed response unwrapping bugs: res.data.hours (not res.data) for working hours, res.data.integrations for integrations
  * [x] Fixed expo-file-system import for SDK 53+ (use expo-file-system/legacy for cacheDirectory, writeAsStringAsync, EncodingType)
  * ── Phase 18.4: Security, Multi-Tenancy & Testing ──
  * [x] 4-layer tenant isolation intact for all settings data:
    - Layer 1: JWT hospitalId claim injected at login
    - Layer 2: TenantMiddleware validates hospitalId on every request
    - Layer 3: EF Core Global Query Filters on HospitalWorkingHour + HospitalIntegration + HospitalSetting
    - Layer 4: PostgreSQL RLS policies
  * [x] Hospital admins can only view/modify their own hospital's data
  * [x] All mutations audit-logged via AuditService (action, category, severity, userId, hospitalId)
  * [x] Auto-seeding prevents null state: working hours + integrations created on first GET if empty
  * [x] Composite unique indexes prevent duplicate settings/hours/integrations per hospital
  * [x] Export data excludes sensitive fields (passwords, OTP codes)
  * [x] Backend build: 0 errors, 0 warnings | TypeScript build: 0 errors
  * ── Pending: Apply migration to Supabase production ──
  * [ ] Run AddSettingsModuleTables migration on Supabase (auto-migration on Railway deploy, or manual SQL)
  * [ ] Add RLS policies for hospital_working_hours and hospital_integrations tables in Supabase

4. CURRENT DATABASE SCHEMA SNAPSHOT
------------------------------------------------------
* hospitals: [id (PK/UUID), name, license_no, address, city, state, phone, email, logo_url, status, created_at]
* users: [id (PK/UUID), hospital_id (FK), full_name, mobile_number, email, role, department, employee_id, profile_photo_url, status, is_verified, created_at, last_login]
* otp_verifications: [id (PK/UUID), user_id (FK), mobile_number, otp_code, is_used, attempt_count, last_attempt_at, expires_at, created_at]
* departments: [id (PK/UUID), hospital_id (FK), name, is_active]
* hospital_settings: [id (PK/UUID), hospital_id (FK), key, value, updated_at]
* audit_logs: [id (PK/UUID), hospital_id (FK), user_id (FK), action, category, severity, details, created_at]
* doctor_profiles: [id (PK/UUID), hospital_id (FK), user_id (FK/unique), specialty, experience_years, consultation_fee, available_for_video, available_for_in_person, languages, rating, review_count, bio, qualification, mci_registration, is_accepting_appointments, created_at, updated_at]
* medicines: [id (PK/UUID), hospital_id (FK), name, generic_name, category, dosage_form, strength, manufacturer, price, pack_size, stock_quantity, requires_prescription, is_active, created_at, updated_at]
* doctor_schedules: [id (PK/UUID), hospital_id (FK), doctor_profile_id (FK), day_of_week (0-6), start_time, end_time, slot_duration_minutes, consultation_type, is_active]
* user_roles: [id (PK/UUID), user_id (FK), role, assigned_at, is_active] — unique index on (user_id, role)
* appointments: [id (PK/UUID), hospital_id (FK), patient_id (FK), doctor_profile_id (FK), schedule_date, start_time, end_time, consultation_type, status, consultation_fee, tax_amount, platform_fee, discount_amount, total_amount, coupon_code, payment_method, payment_status, booking_reference, cancel_reason, cancelled_at, cancelled_by, notes, prescription_status (null/pending/dispensed/rejected), priority (varchar(20) NOT NULL DEFAULT 'normal' — "normal"|"emergency"), created_at, updated_at]
* hospital_working_hours: [id (PK/UUID), hospital_id (FK), day_of_week (0-6), start_time (TIME), end_time (TIME), is_enabled, break_start (TIME nullable), break_end (TIME nullable), updated_at] — unique index on (hospital_id, day_of_week)
* hospital_integrations: [id (PK/UUID), hospital_id (FK), name, type, is_connected, config_json (nullable), last_synced_at (nullable), status, created_at, updated_at] — unique index on (hospital_id, name)
* hospital_messages: [id (PK/UUID), hospital_id (FK), sender_id (FK→users RESTRICT), recipient_id (FK→users RESTRICT), body (varchar 2000), is_read, created_at] — index on (hospital_id, sender_id, recipient_id, created_at)
* prescription_items: [id (PK/UUID), appointment_id (FK→appointments CASCADE), medicine_id (FK→medicines nullable SET NULL), medicine_name (varchar 200 denormalized), dosage_instructions (varchar 500 nullable), quantity (int DEFAULT 1), created_at] — index on appointment_id

5. COMPLETED API ROUTES
------------------------------------------------------
* POST /api/auth/send-otp          — Send OTP via Pay4SMS (rate-limited: 5/min)
* POST /api/auth/verify-otp        — Verify OTP → JWT (max 5 attempts, then lock)
* POST /api/hospitals/register     — Register hospital + auto-create admin user
* GET  /api/admin/users            — List users (search, filter, pagination)
* POST /api/admin/users            — Create new user
* GET  /api/admin/users/{id}       — Get user details
* PUT  /api/admin/users/{id}       — Update user info
* PATCH /api/admin/users/{id}/status — Activate/deactivate user
* PATCH /api/admin/users/{id}/role  — Change user role
* DELETE /api/admin/users/{id}     — Remove user
* GET  /api/admin/dashboard        — Dashboard stats
* GET  /api/admin/activity         — Audit log feed (with severity)
* GET  /api/admin/settings         — Get hospital settings
* PUT  /api/admin/settings         — Update hospital settings
* GET  /api/admin/profile          — Get admin profile
* PUT  /api/admin/profile          — Update admin profile
* GET  /api/admin/doctor-profiles  — List all doctor profiles with schedules
* POST /api/admin/doctor-profiles  — Create doctor profile for a doctor user
* PUT  /api/admin/doctor-profiles/{id} — Update doctor profile
* DELETE /api/admin/doctor-profiles/{id} — Delete doctor profile
* POST /api/admin/doctor-schedules — Add schedule block for a doctor
* DELETE /api/admin/doctor-schedules/{id} — Remove schedule block
* POST /api/admin/seed-doctors     — Seed sample doctors, profiles & schedules
* GET  /api/appointments/doctors   — List doctors with profiles (filterable)
* GET  /api/appointments/doctors/{id}/availability — Available dates & time slots
* POST /api/appointments           — Create appointment (with pricing)
* GET  /api/appointments           — List appointments (upcoming/past, role-aware)
* GET  /api/appointments/{id}      — Get appointment details
* PUT  /api/appointments/{id}      — Reschedule appointment
* PATCH /api/appointments/{id}/cancel — Cancel appointment
* PATCH /api/appointments/{id}/status — Staff-only status change (now supports: arrived, in_consultation)
* GET  /api/reception/dashboard    — Receptionist daily stats (total, waiting, in-consult, completed, upcoming)
* GET  /api/reception/queue        — Today's appointments queue (filterable by status, searchable)
* GET  /api/reception/appointments/{id} — Appointment detail (patient info, doctor, status, payment)
* PATCH /api/reception/appointments/{id}/checkin — Check in patient (pending/confirmed → arrived)
* PATCH /api/reception/appointments/{id}/in-consultation — Send to doctor (arrived → in_consultation)
* GET  /api/reception/patients     — Search patients by name or mobile within hospital
* POST /api/reception/patients     — Register walk-in patient (creates user record)
* GET  /api/reception/profile      — Logged-in receptionist's profile (name, mobile, email, department, employeeId, joinDate)
* PATCH /api/reception/profile     — Update receptionist profile (email, department)
* GET  /api/reception/stats        — Real stats: registeredToday, appointmentsToday, walkInsToday, pendingCheckIns
* GET  /api/reception/doctors      — List active accepting doctors (name, specialty, fee, availability)
* POST /api/reception/book-appointment — Book appointment for patient (overbooking allowed, REC-{date}-{guid6} reference)
* GET  /api/reception/notifications   — Last 24h audit events (appointment + reception categories) with filter hints
* GET  /api/pharmacy/dashboard     — Pharmacist daily stats (pending, dispensed, rejected, total)
* GET  /api/pharmacy/prescriptions  — Today's prescription queue (filterable by status, searchable)
* PATCH /api/pharmacy/prescriptions/{id}/dispense — Mark prescription as dispensed
* PATCH /api/pharmacy/prescriptions/{id}/reject   — Reject prescription with reason
* GET  /api/patient/consultation-history  — Patient's completed consultations (paginated)
* GET  /api/patient/prescriptions          — Patient's prescription history
* GET  /api/patient/prescriptions/{id}     — Detailed prescription view (doctor, hospital, notes)
* GET  /api/patient/profile-stats          — Quick stats (visits, active Rx, total appointments)
* GET  /api/doctor-portal/directory         — Hospital staff list grouped by role
* GET  /api/doctor-portal/my-profile        — Doctor's own profile + appointment stats
* GET  /api/doctor-portal/patient-summary/{id} — Patient summary with appointment history
* POST /api/auth/switch-role             — Switch active role (issues new JWT, requires auth)
* GET  /api/admin/hospital-info          — Read hospital details from hospitals table
* PUT  /api/admin/hospital-info          — Update hospital info (partial update, null fields skipped)
* GET  /api/admin/working-hours          — Load working hours (auto-seeds 7 defaults on first access)
* PUT  /api/admin/working-hours          — Bulk upsert working hours for all 7 days
* GET  /api/admin/export-data            — Stream hospital data as JSON file download
* POST /api/admin/clear-cache            — Evict dashboard cache for hospital
* GET  /api/admin/integrations           — List integrations (auto-seeds 5 defaults on first access)
* PATCH /api/admin/integrations/{id}     — Toggle integration connection status
* GET  /api/patient/profile              — Full patient profile (id, fullName, mobile, email, bloodGroup, DOB, gender, address, city, state, pincode, emergency contact, insurance, hospitalName)
* PUT  /api/patient/profile              — Partial update patient profile (all fields optional, null fields skipped)
* GET  /api/patient/care-plan            — Today's care plan: upcomingAppointment, prescriptionNotes (last 3), activePrescriptionCount
* GET  /api/doctor-portal/my-schedule    — Doctor's active weekly schedule blocks
* POST /api/doctor-portal/my-schedule    — Add schedule block (DoctorOnly)
* PUT  /api/doctor-portal/my-schedule/{id} — Update schedule block (DoctorOnly)
* DELETE /api/doctor-portal/my-schedule/{id} — Soft-delete schedule block (DoctorOnly)
* PUT  /api/doctor-portal/my-profile     — Update doctor's own profile (fullName, email, department, specialty, experienceYears, bio, languages, qualification, mciRegistration)
* GET  /api/medicines                    — List medicine catalog (search + category filter, paginated) — all authenticated users
* GET  /api/medicines/categories         — Distinct categories for hospital's catalog — all authenticated users
* POST /api/medicines                    — Add medicine to catalog — StaffAccess
* PUT  /api/medicines/{id}               — Update medicine — StaffAccess
* GET  /api/messages/threads             — All conversation threads + contactable staff — StaffAccess
* GET  /api/messages/thread/{id}         — Full message history + auto-mark-read — StaffAccess
* POST /api/messages/send                — Send message to another staff member — StaffAccess
* PUT  /api/messages/thread/{id}/read    — Mark thread as read — StaffAccess
* POST /api/appointments/{id}/finalize   — Finalize consultation: save notes + create prescription items + complete — StaffAccess
* GET  /api/doctor-portal/prescriptions/{id}/items    — List structured prescription items for appointment — StaffAccess
* POST /api/doctor-portal/prescriptions/{id}/items    — Add single prescription item — DoctorOnly
* DELETE /api/doctor-portal/prescriptions/{id}/items/{itemId} — Remove prescription item — DoctorOnly

5.5. PAYMENT GATEWAY
------------------------------------------------------
* Provider: Razorpay (Test Mode)
* KEY_ID: rzp_test_h8mR4F2lGwgFX4
* SECRET KEY: hSzFNcgMB4AzDINXDy2V0zEp
* Mobile Package: react-native-razorpay ^2.3.1
* Flow: UPI / Card / Net Banking / Wallet → Razorpay checkout (client-side, amount in paise)
*       Pay on Visit → skip payment, appointment confirmed with paymentStatus=pending
* paymentStatus values: "paid" (online), "pending" (pay_on_visit)

6. INSTALLED PACKAGES (NalamApi)
------------------------------------------------------
* Npgsql.EntityFrameworkCore.PostgreSQL 9.0.4
* Microsoft.AspNetCore.Authentication.JwtBearer 9.0.3
* Microsoft.EntityFrameworkCore.Design 9.0.1
* System.IdentityModel.Tokens.Jwt 8.6.1
* System.Threading.RateLimiting 10.0.5

7.5. INSTALLED PACKAGES (Mobile App — Key)
------------------------------------------------------
* @supabase/supabase-js (Supabase client for Storage)
* base64-arraybuffer (file encoding for upload)
* react-native-agora (Agora RTC SDK)
* expo-modules-core (Required for Agora)

7. PROJECT FOLDER STRUCTURE
------------------------------------------------------
NalamApi/
├── Program.cs
├── appsettings.json
├── appsettings.Development.json
├── Dockerfile
├── .env.example
├── Data/NalamDbContext.cs
├── Entities/ (Hospital, User, UserRole, OtpVerification, Department, HospitalSetting, AuditLog, DoctorProfile, DoctorSchedule, Appointment, Patient, HospitalWorkingHour, HospitalIntegration, Medicine, HospitalMessage, PrescriptionItem)
├── DTOs/Auth/ DTOs/Admin/ DTOs/Hospital/ DTOs/Appointment/
├── Endpoints/ (AuthEndpoints, AdminEndpoints, HospitalEndpoints, AppointmentEndpoints, ReceptionistEndpoints, PharmacistEndpoints, PatientEndpoints, DoctorPortalEndpoints, MedicineEndpoints, MessageEndpoints)
├── Services/ (JwtService, OtpService, AuditService)
└── Middleware/ (TenantMiddleware)

Mobile App Key Files (Appointment Flow):
├── services/appointmentService.ts
├── services/doctorService.ts
├── app/patient/consultation-type.tsx
├── app/patient/slot-selection.tsx
├── app/patient/booking-review.tsx
├── app/patient/booking-confirmation.tsx
├── app/patient/(tabs)/bookings.tsx
├── app/admin/manage-doctors.tsx
├── app/doctor/(tabs)/index.tsx (API-driven dashboard)
├── app/doctor/(tabs)/patients.tsx (API-driven appointments)
├── app/doctor/active-consultation.tsx (consultation flow)
├── app/doctor/consultation-summary.tsx (review & finalize)
└── app/doctor/consultation-success.tsx (completion screen)

Mobile App Key Files (Receptionist Flow):
├── services/receptionistService.ts (API service layer)
├── app/receptionist/(tabs)/index.tsx (API-driven dashboard)
├── app/receptionist/(tabs)/appointments.tsx (live queue + check-in)
├── app/receptionist/(tabs)/patients.tsx (search + walk-in registration)
└── app/receptionist/patient-arrival.tsx (token + vitals + room assignment)

Mobile App Key Files (Patient Screens — Phase 8 + 26-28):
├── services/patientService.ts (PatientProfile type, getProfile, updateProfile, consultation history, prescriptions, stats)
├── app/patient/(tabs)/records.tsx (live consultation history)
├── app/patient/(tabs)/profile.tsx (live full profile — useFocusEffect re-fetches on return from edit)
├── app/patient/edit-profile.tsx (loads from API, saves to API, all fields including city/state/pincode/insurance)
├── app/patient/digital-prescription.tsx (live prescription detail)
└── app/patient/booking-review.tsx (Razorpay + Pay on Visit + real patient details from authStore)

Mobile App Key Files (Doctor Portal — Phase 9):
├── services/doctorPortalService.ts (API service layer)
├── app/doctor/(tabs)/directory.tsx (live staff directory)
├── app/doctor/(tabs)/profile.tsx (live doctor profile + stats)
└── app/doctor/patient-clinical-summary.tsx (live patient summary)

Mobile App Key Files (Agora Video — Phase 11):
├── services/agoraService.ts (RTC engine management)
├── app/patient/video-consultation.tsx (real video integration)
└── app/doctor/active-consultation.tsx (real video integration)

Mobile App Key Files (Pharmacist Flow):
├── services/pharmacistService.ts (API service layer)
├── app/pharmacist/(tabs)/index.tsx (API-driven dashboard)
├── app/pharmacist/(tabs)/inventory.tsx (live prescriptions list)
└── app/pharmacist/(tabs)/orders.tsx (processed orders history)

Mobile App Key Files (Multi-Role Login — Phase 16):
├── app/care-provider-select.tsx (unified staff phone login)
├── app/care-provider-otp.tsx (staff OTP verification)
├── app/care-provider-role-select.tsx (multi-role selection screen)
└── components/RoleSwitcher.tsx (role switching from profile screens)

Mobile App Key Files (Hospital-Specific Deployment — Phase 17):
├── app.config.ts (dynamic Expo config — reads env vars for hospital name, slug, bundle ID)
├── config/hospital.ts (centralized hospital branding config)
├── .env.arunpriya (first hospital env template)
└── eas.json (per-hospital build profiles)

Admin Settings Module Files (Phase 18):
Backend:
├── NalamApi/Entities/HospitalWorkingHour.cs (working hours entity)
├── NalamApi/Entities/HospitalIntegration.cs (integrations entity)
├── NalamApi/Migrations/20260326102248_AddSettingsModuleTables.cs (creates tables + seeds data)
├── NalamApi/Endpoints/AdminEndpoints.cs (10 settings endpoints added: hospital-info, working-hours, settings, export-data, clear-cache, integrations)
└── NalamApi/DTOs/Admin/AdminDtos.cs (HospitalInfoResponse, WorkingHourDto, IntegrationResponse, UpdateRequests)
Frontend:
└── app/admin/(tabs)/settings.tsx (6 panels: Hospital Info, Working Hours, Security, Data Mgmt, Notifications, Integrations)

======================================================
END OF PROJECT STATE. AWAITING USER PROMPT.
======================================================