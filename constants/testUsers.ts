import { UserRole } from '@/stores/authStore';

export type TestUser = {
  name: string;
  userId: string;
  role: UserRole;
};

// Simulates backend user lookup by phone number.
// In production, the server returns user info (name + role) after OTP verification.
export const TEST_USERS: Record<string, TestUser> = {
  '+919876543210': { name: 'Dr. Aruna Devi',   userId: 'doc-001', role: 'doctor' },
  '+919876543211': { name: 'Dr. Rajesh Kumar',  userId: 'doc-002', role: 'doctor' },
  '+919876543212': { name: 'Priya Sharma',      userId: 'phm-001', role: 'pharmacist' },
  '+919876543213': { name: 'Kavitha Nair',      userId: 'rec-001', role: 'receptionist' },
  '+919876543215': { name: 'Admin User',        userId: 'adm-001', role: 'admin' },
};
