import { ExpoConfig, ConfigContext } from 'expo/config';
import { withAppBuildGradle } from 'expo/config-plugins';

/**
 * Custom plugin: slims down the Android APK at prebuild time.
 *
 * 1. ndk.abiFilters "arm64-v8a"  — tells CMake to only compile for arm64
 * 2. packagingOptions.jniLibs.excludes — drops x86/x86_64/armeabi-v7a pre-built
 *    .so files from AAR dependencies (Agora, etc.) that ndk.abiFilters cannot reach.
 * 3. Strips unused Agora extension .so files (lip-sync, spatial audio, face capture,
 *    beauty filters, etc.) — only core RTC + video encoder are needed.
 *
 * Combined savings: ~280 MB off the APK.
 */
function withSlimAndroid(config: ExpoConfig): ExpoConfig {
  return withAppBuildGradle(config, (mod) => {
    let contents = mod.modResults.contents;

    // 1. Inject ndk abiFilters if not already present
    if (!contents.includes('abiFilters')) {
      contents = contents.replace(
        /(defaultConfig\s*\{)/,
        `$1\n            ndk {\n                abiFilters "arm64-v8a"\n            }`
      );
    }

    // 2. Inject packagingOptions excludes for non-arm64 ABIs + unused Agora extensions
    if (!contents.includes('lib/x86/')) {
      const excludesBlock = `
    packagingOptions {
        jniLibs {
            // Drop non-arm64 ABIs (saves ~236 MB — x86/x86_64 are emulator-only,
            // armeabi-v7a is pre-2016 devices)
            excludes += ["lib/x86/**", "lib/x86_64/**", "lib/armeabi-v7a/**"]
            // Drop unused Agora extensions (saves ~40 MB on arm64).
            // Keep only: core RTC SDK, fdkaac, soundtouch, video_encoder, screen_capture
            excludes += [
                "lib/*/libagora_lip_sync_extension.so",
                "lib/*/libagora_clear_vision_extension.so",
                "lib/*/libagora_spatial_audio_extension.so",
                "lib/*/libagora_ai_noise_suppression_extension.so",
                "lib/*/libagora_ai_noise_suppression_ll_extension.so",
                "lib/*/libagora_segmentation_extension.so",
                "lib/*/libagora_face_capture_extension.so",
                "lib/*/libagora_face_detection_extension.so",
                "lib/*/libagora_ai_echo_cancellation_extension.so",
                "lib/*/libagora_ai_echo_cancellation_ll_extension.so",
                "lib/*/libagora_audio_beauty_extension.so",
                "lib/*/libagora_content_inspect_extension.so",
                "lib/*/libagora_video_quality_analyzer_extension.so",
                "lib/*/libagora_video_av1_encoder_extension.so",
                "lib/*/libagora-ffmpeg.so",
            ]
        }
    }`;

      // Replace existing packagingOptions block with our merged version
      contents = contents.replace(
        /packagingOptions\s*\{[^}]*jniLibs\s*\{[^}]*\}[^}]*\}/s,
        excludesBlock.trim()
      );
    }

    mod.modResults.contents = contents;
    return mod;
  });
}

const hospitalName = process.env.EXPO_PUBLIC_HOSPITAL_NAME || 'Nalam Health';
const appSlug = process.env.EXPO_PUBLIC_APP_SLUG || 'nalam-app';
const bundleId = process.env.EXPO_PUBLIC_BUNDLE_ID || 'com.nalam.app';

export default ({ config }: ConfigContext): ExpoConfig => withSlimAndroid({
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
      NSMotionUsageDescription: `${hospitalName} uses your device's motion sensor to count your daily steps and help you stay active.`,
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
      foregroundImage: './assets/icon_adaptive.png',
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
    [
      'expo-build-properties',
      {
        android: {
          enableProguardInReleaseBuilds: false,
          enableShrinkResourcesInReleaseBuilds: false,
        },
      },
    ],
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
} as ExpoConfig);
