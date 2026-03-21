import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Shadows } from '@/constants/theme';
import { ArrowLeft, Stethoscope, ClipboardList, Pill, ShieldCheck, ChevronRight } from 'lucide-react-native';

const roles = [
  {
    label: 'Doctor',
    subtitle: 'Clinical consultations & patient care',
    icon: Stethoscope,
    color: '#1A73E8',
    bg: '#EFF6FF',
    route: '/doctor/login',
  },
  {
    label: 'Receptionist',
    subtitle: 'Patient registration & appointments',
    icon: ClipboardList,
    color: '#059669',
    bg: '#ECFDF5',
    route: '/receptionist/login',
  },
  {
    label: 'Pharmacist',
    subtitle: 'Prescriptions & medication dispensing',
    icon: Pill,
    color: '#7C3AED',
    bg: '#F5F3FF',
    route: '/pharmacist/login',
  },
  {
    label: 'Admin',
    subtitle: 'Hospital management & user control',
    icon: ShieldCheck,
    color: '#DC2626',
    bg: '#FFF1F2',
    route: '/admin/login',
  },
];

export default function CareProviderSelectScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-[#EEF3FF]">
      <LinearGradient
        colors={['#0c1d4a', '#1a3a8f', '#2260d9']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ height: 220 }}
      >
        <SafeAreaView edges={['top']}>
          <View className="px-5 pt-3 mb-4">
            <Pressable
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full items-center justify-center"
              style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
            >
              <ArrowLeft size={20} color="#FFFFFF" />
            </Pressable>
          </View>
          <View className="px-6">
            <Text className="text-white text-[26px] font-bold leading-tight">
              Welcome to Arun Priya{'\n'}
              <Text className="text-[#7EB3FF] font-extrabold">Multispeciality Hospital</Text>
            </Text>
            <Text className="text-white/50 text-xs font-semibold uppercase tracking-[3px] mt-2">
              Select Your Role
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <View className="flex-1 rounded-t-[32px] -mt-8 z-10 bg-[#EEF3FF]">
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="w-12 h-1.5 bg-slate-300/60 rounded-full self-center mt-4 mb-6" />

          <Text className="text-midnight text-[22px] font-extrabold mb-1">Care Provider Login</Text>
          <Text className="text-slate-400 text-sm mb-6 font-light">Choose your role to continue</Text>

          {roles.map((role, i) => (
            <Pressable
              key={i}
              onPress={() => router.push(role.route as any)}
              className="bg-white rounded-2xl px-5 py-4 mb-3 flex-row items-center active:opacity-90"
              style={Shadows.card}
            >
              <View
                className="w-12 h-12 rounded-2xl items-center justify-center mr-4"
                style={{ backgroundColor: role.bg }}
              >
                <role.icon size={22} color={role.color} />
              </View>
              <View className="flex-1">
                <Text className="font-bold text-midnight text-base">{role.label}</Text>
                <Text className="text-slate-400 text-xs mt-0.5">{role.subtitle}</Text>
              </View>
              <ChevronRight size={18} color="#CBD5E1" />
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}
