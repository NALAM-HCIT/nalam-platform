/**
 * Hospital-specific configuration — values injected at build time via EXPO_PUBLIC_* env vars.
 * Each hospital deployment gets its own .env.<slug> file with these values.
 */

// Add a new entry here for each hospital logo asset
const LOGO_ASSETS: Record<string, any> = {
  arunpriya: require('@/assets/logo_arunpriya.png'),
  links: require('@/assets/Logo_Links_Hospital.png'),
};

const logoKey = process.env.EXPO_PUBLIC_HOSPITAL_LOGO || 'arunpriya';

export const HospitalConfig = {
  /** Hospital UUID from the database (used in API calls) */
  id: process.env.EXPO_PUBLIC_HOSPITAL_ID || '',

  /** Display name shown in headers and branding */
  name: process.env.EXPO_PUBLIC_HOSPITAL_NAME || 'Nalam Health',

  /** Subtitle/tagline shown under the hospital name */
  tagline: process.env.EXPO_PUBLIC_HOSPITAL_TAGLINE || 'Your Health Partner',

  /** Logo image source — use as <Image source={HospitalConfig.logo} /> */
  logo: LOGO_ASSETS[logoKey] ?? LOGO_ASSETS.arunpriya,
};
