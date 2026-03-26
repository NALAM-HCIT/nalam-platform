import { ExpoConfig, ConfigContext } from 'expo/config';

const hospitalName = process.env.EXPO_PUBLIC_HOSPITAL_NAME || 'Nalam Health';
const appSlug = process.env.EXPO_PUBLIC_APP_SLUG || 'nalam-app';
const bundleId = process.env.EXPO_PUBLIC_BUNDLE_ID || 'com.nalam.app';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: hospitalName,
  slug: appSlug,
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/logo_arunpriya.png',
  userInterfaceStyle: 'automatic',
  splash: {
    image: './assets/logo_arunpriya_dark.png',
    resizeMode: 'contain',
    backgroundColor: '#FFFFFF',
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: bundleId,
    infoPlist: {
      NSCameraUsageDescription: `${hospitalName} uses your camera to scan documents and enable teleconsultation.`,
      NSFaceIDUsageDescription: `${hospitalName} uses Face ID to keep your health data secure.`,
      NSLocalAuthenticationUsageDescription: `${hospitalName} uses biometrics so only you can access your health records.`,
    },
  },
  android: {
    package: bundleId,
    splash: {
      image: './assets/logo_arunpriya_dark.png',
      resizeMode: 'contain',
      backgroundColor: '#FFFFFF',
      dark: {
        image: './assets/logo_arunpriya_white.png',
        backgroundColor: '#0B1B3D',
      },
    },
    adaptiveIcon: {
      foregroundImage: './assets/logo_arunpriya.png',
      backgroundColor: '#FFFFFF',
    },
    permissions: [
      'android.permission.USE_BIOMETRIC',
      'android.permission.USE_FINGERPRINT',
      'android.permission.CAMERA',
      'android.permission.RECORD_AUDIO',
    ],
  },
  plugins: [
    'expo-splash-screen',
    'expo-secure-store',
    'expo-local-authentication',
    [
      'expo-camera',
      {
        cameraPermission: `${hospitalName} uses your camera to scan documents and for teleconsultation.`,
      },
    ],
    'expo-router',
  ],
  extra: {
    eas: {
      projectId: 'bda93bc1-12b9-40a1-a566-67eaa5526272',
    },
    hospitalId: process.env.EXPO_PUBLIC_HOSPITAL_ID || '',
    router: {},
  },
  scheme: 'nalam',
  sdkVersion: '55.0.0',
  platforms: ['ios', 'android', 'web'],
  owner: 'sureshb11',
});
