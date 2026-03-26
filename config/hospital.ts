/**
 * Hospital-specific configuration — values injected at build time via EXPO_PUBLIC_* env vars.
 * Each hospital deployment gets its own .env.<slug> file with these values.
 */
export const HospitalConfig = {
  /** Hospital UUID from the database (used in API calls) */
  id: process.env.EXPO_PUBLIC_HOSPITAL_ID || '',

  /** Display name shown in headers and branding */
  name: process.env.EXPO_PUBLIC_HOSPITAL_NAME || 'Nalam Health',

  /** Subtitle/tagline shown under the hospital name */
  tagline: process.env.EXPO_PUBLIC_HOSPITAL_TAGLINE || 'Your Health Partner',
};
