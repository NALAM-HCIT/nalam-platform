import React, { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore, UserRole } from '@/stores/authStore';
import { Shadows } from '@/constants/theme';
import {
  Stethoscope, ClipboardList, Pill, ShieldCheck, ChevronRight, Star,
} from 'lucide-react-native';

const ROLE_CONFIG: Record<string, {
  label: string;
  subtitle: string;
  icon: any;
  color: string;
  bg: string;
}> = {
  doctor: {
    label: 'Doctor',
    subtitle: 'Clinical consultations & patient care',
    icon: Stethoscope,
    color: '#1A73E8',
    bg: '#EFF6FF',
  },
  receptionist: {
    label: 'Receptionist',
    subtitle: 'Patient registration & appointments',
    icon: ClipboardList,
    color: '#059669',
    bg: '#ECFDF5',
  },
  pharmacist: {
    label: 'Pharmacist',
    subtitle: 'Prescriptions & medication dispensing',
    icon: Pill,
    color: '#7C3AED',
    bg: '#F5F3FF',
  },
  admin: {
    label: 'Admin',
    subtitle: 'Hospital management & user control',
    icon: ShieldCheck,
    color: '#DC2626',
    bg: '#FFF1F2',
  },
};

export default function CareProviderRoleSelectScreen() {
  const router = useRouter();
  const { roles, role: primaryRole, userName, switchRole } = useAuthStore();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [isSwitching, setIsSwitching] = useState(false);

  // Filter to only care provider roles (exclude patient)
  const availableRoles = roles.filter((r) => r !== 'patient');

  const handleSelectRole = async (role: UserRole) => {
    setSelectedRole(role);
    setIsSwitching(true);

    try {
      const success = await switchRole(role);
      if (success) {
        router.replace(`/${role}/(tabs)` as any);
      }
    } catch {
      setSelectedRole(null);
    } finally {
      setIsSwitching(false);
    }
  };

  const firstName = userName?.split(' ')[0] || 'User';

  return (
    <View className="flex-1 bg-[#EEF3FF]">
      <LinearGradient
        colors={['#0c1d4a', '#1a3a8f', '#2260d9']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ height: 240 }}
      >
        <SafeAreaView edges={['top']}>
          <View className="px-6 pt-8">
            <Text className="text-white/50 text-xs font-semibold uppercase tracking-[3px] mb-2">
              Select Your Role
            </Text>
            <Text className="text-white text-[28px] font-bold leading-tight">
              Welcome, {firstName}
            </Text>
            <Text className="text-white/60 text-sm mt-2 font-light">
              You have access to {availableRoles.length} role{availableRoles.length > 1 ? 's' : ''}. Choose one to continue.
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <View className="flex-1 rounded-t-[32px] -mt-8 z-10 bg-[#EEF3FF]">
        <View className="px-6 pt-8">
          <View className="w-12 h-1.5 bg-slate-300/60 rounded-full self-center mb-8" />

          {availableRoles.map((role) => {
            const config = ROLE_CONFIG[role];
            if (!config) return null;
            const Icon = config.icon;
            const isDefault = role === primaryRole;
            const isSelected = selectedRole === role;

            return (
              <Pressable
                key={role}
                onPress={() => handleSelectRole(role)}
                disabled={isSwitching}
                className={`bg-white rounded-2xl px-5 py-5 mb-3 flex-row items-center active:opacity-90 ${
                  isSelected ? 'border-2 border-primary' : ''
                }`}
                style={Shadows.card}
              >
                <View
                  className="w-14 h-14 rounded-2xl items-center justify-center mr-4"
                  style={{ backgroundColor: config.bg }}
                >
                  <Icon size={26} color={config.color} />
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center gap-2">
                    <Text className="font-bold text-midnight text-base">{config.label}</Text>
                    {isDefault && (
                      <View className="flex-row items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-full">
                        <Star size={10} color="#D97706" fill="#D97706" />
                        <Text className="text-amber-700 text-[10px] font-bold">Default</Text>
                      </View>
                    )}
                  </View>
                  <Text className="text-slate-400 text-xs mt-0.5">{config.subtitle}</Text>
                </View>
                {isSelected && isSwitching ? (
                  <ActivityIndicator size="small" color="#1A73E8" />
                ) : (
                  <ChevronRight size={18} color="#CBD5E1" />
                )}
              </Pressable>
            );
          })}

          <Text className="text-[10px] text-slate-400 uppercase tracking-wide text-center mt-8 font-light">
            You can switch roles anytime from your profile
          </Text>
        </View>
      </View>
    </View>
  );
}
