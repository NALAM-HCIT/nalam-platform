import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

export type UserRole = 'patient' | 'doctor' | 'receptionist' | 'pharmacist' | 'admin';

interface AuthState {
  isAuthenticated: boolean;
  role: UserRole | null;
  phone: string;
  userName: string;
  userId: string | null;
  hospitalId: string | null;
  token: string | null;
  setPhone: (phone: string) => void;
  setRole: (role: UserRole | null) => void;
  login: (data: { token: string; userName: string; userId: string; role: UserRole; hospitalId: string }) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  role: null,
  phone: '',
  userName: '',
  userId: null,
  hospitalId: null,
  token: null,
  
  setPhone: (phone) => set({ phone }),
  setRole: (role) => set({ role }),
  
  login: async (data) => {
    // Persist session securely
    await SecureStore.setItemAsync('token', data.token);
    await SecureStore.setItemAsync('userRole', data.role);
    await SecureStore.setItemAsync('hospitalId', data.hospitalId);
    
    set({
      isAuthenticated: true,
      token: data.token,
      userName: data.userName,
      userId: data.userId,
      role: data.role,
      hospitalId: data.hospitalId
    });
  },
  
  logout: async () => {
    // Clear session
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('userRole');
    await SecureStore.deleteItemAsync('hospitalId');
    
    set({
      isAuthenticated: false,
      role: null,
      phone: '',
      userName: '',
      userId: null,
      hospitalId: null,
      token: null,
    });
  },
  
  checkAuth: async () => {
    try {
      const token = await SecureStore.getItemAsync('token');
      const role = await SecureStore.getItemAsync('userRole') as UserRole;
      const hospitalId = await SecureStore.getItemAsync('hospitalId');
      
      if (token) {
        set({ isAuthenticated: true, token, role, hospitalId });
      }
    } catch (e) {
      console.error('Failed to restore auth session', e);
    }
  }
}));
