import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { api } from '@/services/api';

export type UserRole = 'patient' | 'doctor' | 'receptionist' | 'pharmacist' | 'admin';
export type AccountType = 'patient' | 'staff';

interface AuthState {
  isAuthenticated: boolean;
  role: UserRole | null;        // currently active role for this session
  roles: UserRole[];            // all roles this user has
  accountType: AccountType | null;  // which table this user lives in
  phone: string;
  userName: string;
  userId: string | null;
  hospitalId: string | null;
  token: string | null;

  setPhone: (phone: string) => void;
  setRole: (role: UserRole | null) => void;

  login: (data: {
    token: string;
    userName: string;
    userId: string;
    role: UserRole;
    roles: UserRole[];
    hospitalId: string;
    accountType: AccountType;
  }) => Promise<void>;

  /** Switch to a different role the user holds. Calls backend to reissue JWT. */
  switchRole: (newRole: UserRole) => Promise<boolean>;

  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  role: null,
  roles: [],
  accountType: null,
  phone: '',
  userName: '',
  userId: null,
  hospitalId: null,
  token: null,

  setPhone: (phone) => set({ phone }),
  setRole: (role) => set({ role }),

  login: async (data) => {
    await SecureStore.setItemAsync('token', data.token);
    await SecureStore.setItemAsync('userRole', data.role);
    await SecureStore.setItemAsync('userRoles', JSON.stringify(data.roles));
    await SecureStore.setItemAsync('hospitalId', data.hospitalId);
    await SecureStore.setItemAsync('accountType', data.accountType);

    set({
      isAuthenticated: true,
      token: data.token,
      userName: data.userName,
      userId: data.userId,
      role: data.role,
      roles: data.roles,
      hospitalId: data.hospitalId,
      accountType: data.accountType,
    });
  },

  switchRole: async (newRole) => {
    try {
      const response = await api.post('/auth/switch-role', { role: newRole });
      const { token, user } = response.data;

      await SecureStore.setItemAsync('token', token);
      await SecureStore.setItemAsync('userRole', newRole);

      set({
        token,
        role: newRole,
        roles: user.roles as UserRole[],
      });

      return true;
    } catch (error) {
      console.error('[AuthStore] switchRole failed:', error);
      return false;
    }
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('userRole');
    await SecureStore.deleteItemAsync('userRoles');
    await SecureStore.deleteItemAsync('hospitalId');
    await SecureStore.deleteItemAsync('accountType');

    set({
      isAuthenticated: false,
      role: null,
      roles: [],
      accountType: null,
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
      const rolesJson = await SecureStore.getItemAsync('userRoles');
      const accountType = (await SecureStore.getItemAsync('accountType') || 'staff') as AccountType;
      const roles: UserRole[] = rolesJson ? JSON.parse(rolesJson) : (role ? [role] : []);

      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload.exp && payload.exp * 1000 < Date.now()) {
            console.log('Token expired, clearing session');
            await SecureStore.deleteItemAsync('token');
            await SecureStore.deleteItemAsync('userRole');
            await SecureStore.deleteItemAsync('userRoles');
            await SecureStore.deleteItemAsync('hospitalId');
            await SecureStore.deleteItemAsync('accountType');
            return;
          }
        } catch {
          await SecureStore.deleteItemAsync('token');
          return;
        }
        set({ isAuthenticated: true, token, role, roles, hospitalId, accountType });
      }
    } catch (e) {
      console.error('Failed to restore auth session', e);
    }
  }
}));
