import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Uses EXPO_PUBLIC_API_URL baked in at EAS build time via eas.json env block.
// Falls back to the production Railway URL so device builds always work.
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.teamdvs.in/api';

// Log the resolved URL at startup so we can verify it in device logs
console.log('[API] Base URL:', BASE_URL);

// Hospital ID for patient self-signup (configured per hospital deployment)
export const HOSPITAL_ID = process.env.EXPO_PUBLIC_HOSPITAL_ID || '';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000, // 30s — allows Railway cold-start (~10–20s) to complete
  adapter: 'fetch', // Use fetch instead of XMLHttpRequest — fixes ERR_NETWORK in RN release builds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to inject JWT token into all requests
api.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.error('Error fetching token from SecureStore', error);
  }
  return config;
});

// Response interceptor: auto-retry network errors (Railway cold-start), handle 401s
let isLoggingOut = false;
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config as typeof error.config & { _retryCount?: number };

    // Retry up to 2 times on network error (no response = server cold-starting)
    if (!error.response && config) {
      config._retryCount = (config._retryCount ?? 0) + 1;
      console.warn(`[API] Network error, retry ${config._retryCount}/2 for ${config.url}`);
      if (config._retryCount <= 2) {
        await new Promise((r) => setTimeout(r, 3000 * config._retryCount!));
        return api(config);
      }
    }

    if (error.response?.status === 401 && !isLoggingOut) {
      isLoggingOut = true;
      setTimeout(async () => {
        try {
          const { useAuthStore } = require('@/stores/authStore');
          await useAuthStore.getState().logout();
        } finally {
          isLoggingOut = false;
        }
      }, 0);
    }
    return Promise.reject(error);
  }
);

/** Returns true if the error is a 401 (handled by auto-logout interceptor). */
export const isAuthError = (err: unknown): boolean =>
  axios.isAxiosError(err) && err.response?.status === 401;

/**
 * Network connectivity diagnostic — runs on app start.
 * Uses raw fetch (no Axios) to isolate the failure point.
 * Results are shown in an alert so we can debug on a real device.
 */
export async function warmUpApi(): Promise<boolean> {
  const results: string[] = [];

  // Test 1: Can we reach Google? (proves basic internet works)
  try {
    const r1 = await fetch('https://www.google.com', { method: 'HEAD' });
    results.push(`Google: ${r1.status} OK`);
  } catch (e: any) {
    results.push(`Google: FAIL ${e.message}`);
  }

  // Test 2: Can we reach the API via custom domain?
  try {
    const r2 = await fetch('https://api.teamdvs.in/', { method: 'GET' });
    const body = await r2.text();
    results.push(`API (teamdvs.in): ${r2.status} (${body.substring(0, 50)})`);
  } catch (e: any) {
    results.push(`API (teamdvs.in): FAIL ${e.message}`);
  }

  // Test 3: Can we POST to the auth endpoint?
  try {
    const r3 = await fetch('https://api.teamdvs.in/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobileNumber: '+910000000000', accountType: 'patient' }),
    });
    const body = await r3.text();
    results.push(`Auth API: ${r3.status} (${body.substring(0, 50)})`);
  } catch (e: any) {
    results.push(`Auth API: FAIL ${e.message}`);
  }

  const msg = results.join('\n');
  console.log('[API DIAG]', msg);

  // Show alert on device so user can screenshot it
  setTimeout(() => {
    try {
      const { CustomAlert } = require('@/components/CustomAlert');
      CustomAlert.alert('Network Diagnostic', msg);
    } catch { /* ignore */ }
  }, 1000);

  return !msg.includes('FAIL');
}
