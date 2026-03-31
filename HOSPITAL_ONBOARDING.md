# Adding a New Hospital to the Nalam App

This document covers every step required to onboard a new hospital.
Follow it top to bottom. Do not skip steps.

---

## What you will need before starting

| Item | Example |
|---|---|
| Hospital name | Green Park Hospital |
| Hospital tagline | Your Health, Our Priority |
| Hospital UUID | (from the backend database — `hospitals` table) |
| Hospital logo PNG | `Logo_GreenPark.png` |
| Short slug key | `greenpark` (lowercase, no spaces) |
| Bundle ID | `com.nalam.greenpark` (unique per hospital) |

---

## Overview of the system

Every hospital build is controlled by a single env var key called
`EXPO_PUBLIC_HOSPITAL_LOGO` (the "slug"). The slug connects:

- The **logo asset** in `/assets/`
- The **app icon + splash screen** in `app.config.ts`
- The **logo shown inside the app** via `config/hospital.ts`
- The **hospital name shown everywhere** via `EXPO_PUBLIC_HOSPITAL_NAME`

Change the slug + env vars → everything in the app updates automatically.

---

## Step-by-Step Instructions

---

### STEP 1 — Prepare the logo file

1. Get the hospital logo as a **PNG file**
2. Make sure it is **square** and at least **1024 × 1024 pixels**
   (this is required for the home screen app icon)
3. Copy the file into the `/assets/` folder:

```
/assets/Logo_GreenPark.png
```

> Tip: If you have a dark version (for dark mode splash), name it
> `Logo_GreenPark_dark.png` and a white version `Logo_GreenPark_white.png`.
> If you only have one version, use the same file for all.

---

### STEP 2 — Register the logo in `config/hospital.ts`

Open the file: **`config/hospital.ts`**

Find the `LOGO_ASSETS` block and add one line for the new hospital:

```ts
const LOGO_ASSETS: Record<string, any> = {
  arunpriya: require('@/assets/logo_arunpriya.png'),
  links:     require('@/assets/Logo_Links_Hospital.png'),
  greenpark: require('@/assets/Logo_GreenPark.png'),  // ← ADD THIS LINE
};
```

**What this does:** Makes the logo available inside the app
(patient dashboard header, login screens, document viewer, etc.)

---

### STEP 3 — Register the logo in `app.config.ts`

Open the file: **`app.config.ts`**

Find the `LOGO_MAP` block and add one entry for the new hospital:

```ts
const LOGO_MAP = {
  arunpriya: {
    icon:        './assets/logo_arunpriya.png',
    splash:      './assets/logo_arunpriya.png',
    splashDark:  './assets/logo_arunpriya_dark.png',
    splashWhite: './assets/logo_arunpriya_white.png',
  },
  links: {
    icon:        './assets/Logo_Links_Hospital.png',
    splash:      './assets/Logo_Links_Hospital.png',
    splashDark:  './assets/Logo_Links_Hospital.png',
    splashWhite: './assets/Logo_Links_Hospital.png',
  },
  greenpark: {                                        // ← ADD THIS BLOCK
    icon:        './assets/Logo_GreenPark.png',
    splash:      './assets/Logo_GreenPark.png',
    splashDark:  './assets/Logo_GreenPark.png',       // use _dark version if you have one
    splashWhite: './assets/Logo_GreenPark.png',       // use _white version if you have one
  },
};
```

**What this does:** Sets the home screen app icon and splash screen
for the Green Park build.

---

### STEP 4 — Create the env file `.env.greenpark`

Create a new file at the root of the project called `.env.greenpark`.

The easiest way is to copy an existing one and update 6 values:

**Copy:**
```
cp .env.links .env.greenpark
```

**Then edit `.env.greenpark` and change these 6 lines:**

```
EXPO_PUBLIC_HOSPITAL_ID=<UUID from database>
EXPO_PUBLIC_HOSPITAL_NAME=Green Park Hospital
EXPO_PUBLIC_HOSPITAL_TAGLINE=Your Health, Our Priority
EXPO_PUBLIC_HOSPITAL_LOGO=greenpark
EXPO_PUBLIC_APP_SLUG=greenpark-app
EXPO_PUBLIC_BUNDLE_ID=com.nalam.greenpark
```

**Leave everything else unchanged** (API URL, Supabase, Agora keys
are shared across all hospitals).

Full file will look like this:

```
# ─── Green Park Hospital ───
# Copy this to .env before building: cp .env.greenpark .env

# API
EXPO_PUBLIC_API_URL=https://api.teamdvs.in/api

# Hospital identity (UUID from hospitals table)
EXPO_PUBLIC_HOSPITAL_ID=<paste UUID here>
EXPO_PUBLIC_HOSPITAL_NAME=Green Park Hospital
EXPO_PUBLIC_HOSPITAL_TAGLINE=Your Health, Our Priority
EXPO_PUBLIC_HOSPITAL_LOGO=greenpark

# App identity (unique per hospital for store listings)
EXPO_PUBLIC_APP_SLUG=greenpark-app
EXPO_PUBLIC_BUNDLE_ID=com.nalam.greenpark

# Supabase Storage (shared)
EXPO_PUBLIC_SUPABASE_URL=https://tmplrslirkhtjqodjoen.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<same key as other hospitals>

# Agora Video (shared)
EXPO_PUBLIC_AGORA_APP_ID=<same key as other hospitals>
```

---

### STEP 5 — Add build profiles to `eas.json`

Open the file: **`eas.json`**

Copy the `links-preview` and `links-production` blocks.
Paste them after the `links-production` block.
Update the values for Green Park:

```json
"greenpark-preview": {
  "distribution": "internal",
  "android": {
    "buildType": "apk"
  },
  "env": {
    "EXPO_PUBLIC_APP_SLUG":         "greenpark-app",
    "EXPO_PUBLIC_BUNDLE_ID":        "com.nalam.greenpark",
    "EXPO_PUBLIC_HOSPITAL_NAME":    "Green Park Hospital",
    "EXPO_PUBLIC_HOSPITAL_TAGLINE": "Your Health, Our Priority",
    "EXPO_PUBLIC_HOSPITAL_ID":      "<paste UUID here>",
    "EXPO_PUBLIC_HOSPITAL_LOGO":    "greenpark",
    "EXPO_PUBLIC_API_URL":          "https://api.teamdvs.in/api",
    "EXPO_PUBLIC_SUPABASE_URL":     "https://tmplrslirkhtjqodjoen.supabase.co",
    "EXPO_PUBLIC_SUPABASE_ANON_KEY":"<same key as other hospitals>",
    "EXPO_PUBLIC_AGORA_APP_ID":     "<same key as other hospitals>"
  }
},
"greenpark-production": {
  "env": {
    "EXPO_PUBLIC_APP_SLUG":         "greenpark-app",
    "EXPO_PUBLIC_BUNDLE_ID":        "com.nalam.greenpark",
    "EXPO_PUBLIC_HOSPITAL_NAME":    "Green Park Hospital",
    "EXPO_PUBLIC_HOSPITAL_TAGLINE": "Your Health, Our Priority",
    "EXPO_PUBLIC_HOSPITAL_ID":      "<paste UUID here>",
    "EXPO_PUBLIC_HOSPITAL_LOGO":    "greenpark",
    "EXPO_PUBLIC_API_URL":          "https://api.teamdvs.in/api",
    "EXPO_PUBLIC_SUPABASE_URL":     "https://tmplrslirkhtjqodjoen.supabase.co",
    "EXPO_PUBLIC_SUPABASE_ANON_KEY":"<same key as other hospitals>",
    "EXPO_PUBLIC_AGORA_APP_ID":     "<same key as other hospitals>"
  }
}
```

---

### STEP 6 — Test locally

Switch your `.env` to the new hospital and start Metro:

```bash
cp .env.greenpark .env
npx expo start --clear
```

Open the app on your phone/simulator and check:

- [ ] Role selection screen shows Green Park logo and name
- [ ] All login screens show "Welcome to Green Park Hospital"
- [ ] Patient dashboard header shows Green Park logo and name
- [ ] Video consultation shows Green Park name as watermark
- [ ] Document viewer shows Green Park name in header
- [ ] Staff login footers show `© 2024 Green Park Hospital`

---

### STEP 7 — Build the APK

**Test APK (share with hospital for UAT):**
```bash
eas build --profile greenpark-preview --platform android
```

**Production build (for Play Store):**
```bash
eas build --profile greenpark-production --platform android
```

> The app icon and splash screen are baked into the build.
> Every hospital gets its own separate app on the Play Store
> because each has a unique `BUNDLE_ID`.

---

## Complete Checklist

Use this as a checklist every time you add a new hospital:

```
[ ] 1. Logo PNG added to /assets/ (min 1024×1024, square)
[ ] 2. config/hospital.ts — added slug to LOGO_ASSETS
[ ] 3. app.config.ts — added slug to LOGO_MAP
[ ] 4. .env.<slug> file created with all 6 hospital-specific values
[ ] 5. eas.json — added <slug>-preview and <slug>-production profiles
[ ] 6. Tested locally with: cp .env.<slug> .env && npx expo start --clear
[ ] 7. All screens verified showing correct name and logo
[ ] 8. Built APK with: eas build --profile <slug>-preview --platform android
```

---

## What changes inside the app (automatically)

Once the slug and env vars are set, these update with zero extra code:

### Patient App
| Screen | What updates |
|---|---|
| Patient login | Hospital name in gradient header |
| Patient home / dashboard | Logo + hospital name in top header |
| Document viewer | Hospital name in document header |
| Video consultation | Hospital name as watermark |

### Staff App
| Screen | What updates |
|---|---|
| Doctor login | Hospital name in gradient header + footer |
| Pharmacist login | Hospital name in gradient header + footer |
| Receptionist login | Hospital name in gradient header + footer |
| Care Provider login | Hospital name in gradient header + footer |
| Care Provider role select | Hospital name in gradient header |
| Admin login | Hospital name in gradient header + privacy policy text |
| Admin dashboard | Hospital name in header |
| Admin profile → Hospital Info | Hospital name in popup |
| Doctor profile → About | Hospital name in about popup |
| Receptionist dashboard | Hospital name in header |

### App Shell (baked into the build)
| What | Updates |
|---|---|
| Home screen app icon | Hospital logo |
| Splash screen | Hospital logo |
| App name on home screen | Hospital name (`EXPO_PUBLIC_HOSPITAL_NAME`) |

---

## Files modified for each new hospital (summary)

| File | Change |
|---|---|
| `/assets/Logo_XYZ.png` | New file — logo image |
| `config/hospital.ts` | +1 line in `LOGO_ASSETS` |
| `app.config.ts` | +1 block in `LOGO_MAP` |
| `.env.<slug>` | New file — env vars |
| `eas.json` | +2 build profiles |

Only **5 touch points** total.

---

## Slug naming rules

- Lowercase only: `greenpark` not `GreenPark`
- No spaces or hyphens: `greenpark` not `green-park`
- Must match exactly across all 5 places:
  `LOGO_ASSETS` key = `LOGO_MAP` key = `EXPO_PUBLIC_HOSPITAL_LOGO` value

---

## Hospitals currently configured

| Hospital | Slug | Bundle ID |
|---|---|---|
| Arun Priya Multispeciality Hospital | `arunpriya` | `com.nalam.arunpriya` |
| Links Hospital | `links` | `com.nalam.links` |





# 1. Set the env
cp .env.links .env

# 2. Regenerate the native android/ folder from scratch
npx expo prebuild --platform android --clean

# 3. Now run Gradle — it will have Links Hospital values
cd android && ./gradlew assembleDebug
