import React, { useState } from 'react';
import { View, Text, Pressable, Modal, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore, UserRole } from '@/stores/authStore';
import { Shadows } from '@/constants/theme';
import {
  Stethoscope, ClipboardList, Pill, ShieldCheck, ChevronDown, Check, X, RefreshCw,
} from 'lucide-react-native';

const ROLE_META: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  doctor:       { label: 'Doctor',       icon: Stethoscope,   color: '#1A73E8', bg: '#EFF6FF' },
  receptionist: { label: 'Receptionist', icon: ClipboardList, color: '#059669', bg: '#ECFDF5' },
  pharmacist:   { label: 'Pharmacist',   icon: Pill,          color: '#7C3AED', bg: '#F5F3FF' },
  admin:        { label: 'Admin',        icon: ShieldCheck,   color: '#DC2626', bg: '#FFF1F2' },
};

/**
 * RoleSwitcher — shows current role as a pill. Tapping opens a bottom sheet
 * to switch to another role. Only renders if user has 2+ roles.
 */
export function RoleSwitcher() {
  const router = useRouter();
  const { role, roles, switchRole } = useAuthStore();
  const [showSheet, setShowSheet] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);

  // Only care provider roles (exclude patient)
  const staffRoles = roles.filter((r) => r !== 'patient');
  if (staffRoles.length <= 1) return null;

  const currentMeta = role ? ROLE_META[role] : null;
  const CurrentIcon = currentMeta?.icon || RefreshCw;

  const handleSwitch = async (newRole: UserRole) => {
    if (newRole === role) {
      setShowSheet(false);
      return;
    }

    setSwitching(newRole);
    const success = await switchRole(newRole);
    setSwitching(null);

    if (success) {
      setShowSheet(false);
      router.replace(`/${newRole}/(tabs)` as any);
    }
  };

  return (
    <>
      {/* Trigger Pill */}
      <Pressable
        onPress={() => setShowSheet(true)}
        className="flex-row items-center gap-2 bg-primary/10 px-3 py-2 rounded-full active:opacity-80"
      >
        <CurrentIcon size={14} color={currentMeta?.color || '#1A73E8'} />
        <Text className="text-primary text-xs font-bold">{currentMeta?.label || 'Role'}</Text>
        <ChevronDown size={12} color="#1A73E8" />
      </Pressable>

      {/* Bottom Sheet Modal */}
      <Modal
        visible={showSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSheet(false)}
      >
        <Pressable
          className="flex-1 bg-black/40 justify-end"
          onPress={() => setShowSheet(false)}
        >
          <Pressable onPress={() => {}} className="bg-white rounded-t-3xl">
            <View className="w-12 h-1.5 bg-slate-300/60 rounded-full self-center mt-3 mb-2" />
            <View className="flex-row items-center justify-between px-6 py-3">
              <Text className="text-midnight text-lg font-bold">Switch Role</Text>
              <Pressable
                onPress={() => setShowSheet(false)}
                className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center active:opacity-70"
              >
                <X size={16} color="#64748B" />
              </Pressable>
            </View>

            <View className="px-5 pb-10">
              {staffRoles.map((r) => {
                const meta = ROLE_META[r];
                if (!meta) return null;
                const Icon = meta.icon;
                const isCurrent = r === role;
                const isSwitching = switching === r;

                return (
                  <Pressable
                    key={r}
                    onPress={() => handleSwitch(r)}
                    disabled={switching !== null}
                    className={`flex-row items-center px-4 py-4 rounded-2xl mb-2 active:opacity-90 ${
                      isCurrent ? 'bg-primary/5 border border-primary/20' : 'bg-slate-50'
                    }`}
                    style={isCurrent ? {} : Shadows.card}
                  >
                    <View
                      className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                      style={{ backgroundColor: meta.bg }}
                    >
                      <Icon size={20} color={meta.color} />
                    </View>
                    <Text className={`flex-1 font-semibold ${isCurrent ? 'text-primary' : 'text-midnight'}`}>
                      {meta.label}
                    </Text>
                    {isSwitching ? (
                      <ActivityIndicator size="small" color="#1A73E8" />
                    ) : isCurrent ? (
                      <View className="w-6 h-6 rounded-full bg-primary items-center justify-center">
                        <Check size={14} color="#FFFFFF" />
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
