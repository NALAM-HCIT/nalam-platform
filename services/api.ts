import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Uses EXPO_PUBLIC_API_URL or defaults to localhost for Android emulator (10.0.2.2) or iOS simulator
// Make sure to set this in an .env file or rely on the default for now
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

// Hospital ID for patient self-signup (configured per hospital deployment)
export const HOSPITAL_ID = process.env.EXPO_PUBLIC_HOSPITAL_ID || '';

export const api = axios.create({
  baseURL: BASE_URL,
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

// Response interceptor for handling 401s (token expiration)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid, auto-logout logic can be added here
      await SecureStore.deleteItemAsync('token');
      await SecureStore.deleteItemAsync('userRole');
      await SecureStore.deleteItemAsync('hospitalId');
      // In a full app, you might dispatch an event to redirect to Login
    }
    return Promise.reject(error);
  }
);
