# Nalam Platform — App Strategy Comparison
### For Management Review | Date: 29 March 2026

---

## The Question
When we onboard 100 hospitals, should we build **one shared app** or **one app per hospital**?

---

## Option A — One App for All Hospitals ("Nalam Health")

Patients download a single app called **"Nalam Health"** and select their hospital inside the app.

```
Patient opens Play Store
→ Searches "Nalam Health"
→ Downloads one app
→ Selects "Arun Priya Hospital" inside the app
→ Logs in
```

**What the hospital sees on Play Store:**

| Field | Value |
|---|---|
| App Name | Nalam Health |
| Icon | Nalam logo |
| Developer | Team DVS |

---

## Option B — One App Per Hospital (100 Branded Apps)

Each hospital gets their own app with their name, logo, and Play Store listing.

```
Patient opens Play Store
→ Searches "Arun Priya Hospital"
→ Finds their hospital's own app
→ Downloads it
→ Logs in directly
```

**What the hospital sees on Play Store:**

| Field | Value |
|---|---|
| App Name | Arun Priya Hospital |
| Icon | Arun Priya logo |
| Developer | Team DVS |

---

## Direct Comparison

| | Option A (One App) | Option B (Per Hospital) |
|---|---|---|
| Hospital name on Play Store | ❌ No — shows "Nalam Health" | ✅ Yes — shows hospital name |
| Hospital logo as app icon | ❌ No — Nalam icon | ✅ Yes — hospital icon |
| Patient finds app by hospital name | ❌ No | ✅ Yes |
| Works on iPhone (iOS) | ✅ Yes — one App Store listing | ❌ Difficult — Apple blocks this |
| Adding a new hospital | ✅ Instant — no new app needed | ⏱ 30 min build + 1-2 days Play Store |
| Releasing an update | ✅ Update once — all hospitals get it | ⏱ Must update 100 apps |
| Backend & Database | ✅ Single (same for both options) | ✅ Single (same for both options) |
| Cost to run (API + Database) | Same | Same |

---

## Financial Comparison

| Cost Item | Option A | Option B |
|---|---|---|
| Google Play Store account | ₹2,000 one-time | ₹2,000 one-time |
| Apple App Store account | ₹8,000/year (one account) | ₹8,000 × 100 hospitals = ₹8L/year |
| Build cost per app release | Negligible | ~3 hours of build time (automated) |
| Server (API + Database) | ~₹2,500/month | ~₹2,500/month (identical) |

> **Key insight:** Backend and database cost is exactly the same in both options.
> The only difference is branding and app publishing.

---

## The Core Business Question

> **What does the hospital tell their patients?**

**Option A:**
> *"Download the 'Nalam Health' app from Play Store, then select our hospital."*

**Option B:**
> *"Search 'Arun Priya Hospital' on Play Store and download our app."*

Option B is simpler for patients and more prestigious for the hospital.
Hospitals are paying a monthly subscription — they expect their brand, not ours.

---

## The Deciding Question

> When a hospital pays us a monthly subscription, what are they paying for?

**If they are paying for software only** → Option A is fine.
They don't care about branding, just the features.

**If they are paying for their own branded digital presence** → Option B is the answer.
Their name on Play Store. Their logo on patients' phones. Their app.

For a hospital, their brand is their reputation.
A patient seeing **"Arun Priya Hospital"** on their phone homescreen builds trust.
A patient seeing **"Nalam Health"** and selecting a hospital inside feels like a shared platform — not their hospital's own app.

**In the healthcare B2B market, Option B wins more contracts.**

---

## iOS (iPhone) Reality

Apple does not allow 100 separately branded apps from one account.

| | Android | iPhone |
|---|---|---|
| Option A (One App) | ✅ Works | ✅ Works |
| Option B (Per Hospital) | ✅ Works | ❌ Apple rejects |
| India market share | **95%** | 5% |

**Conclusion:** iPhone is not a priority for India right now.
We can handle iOS with Option A (one generic app) when the need arises.

---

## Recommended Strategy

### Phase 1 — Now (0 to 50 hospitals)
**Android: Option B** — Per-hospital branded apps
- Each hospital gets their name and logo on Play Store
- Automated build system — adding a new hospital takes 30 minutes
- One codebase maintained by our team
- Strongest selling point when pitching to new hospitals

**iPhone: Skip for now** — India is 95% Android

### Phase 2 — Later (50+ hospitals)
**Android:** Continue Option B with fully automated pipeline
**iPhone:** Option A — one "Nalam Health" app on App Store
- Hospitals accept this for iPhone given Apple's restrictions

---

## Summary

| | Option A | Option B | **Recommended** |
|---|---|---|---|
| Hospital branding on Play Store | ❌ | ✅ | **Option B** |
| Easiest to manage | ✅ | ❌ | — |
| Best for selling to hospitals | ❌ | ✅ | **Option B** |
| Works on iPhone | ✅ | ❌ | Option A for iOS |
| Same backend & database | ✅ | ✅ | — |

**Decision: Option B for Android. Option A for iPhone (when needed).**

---

## Current Status

| Milestone | Status |
|---|---|
| Backend API live (api.teamdvs.in) | ✅ Done |
| Database with full hospital isolation | ✅ Done |
| First hospital app — Arun Priya Hospital (74 MB APK) | ✅ Done |
| Automated build system for new hospitals | 🔲 Ready to build |
| iOS app | 🔲 Future phase |

---

*Prepared by: Team DVS Development*
*Platform: Nalam — Multi-Hospital Telemedicine SaaS*
