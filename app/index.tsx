import React from 'react';
import { View, Text, Image, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { GlassCard } from '@/components';
import { User, BriefcaseMedical, HelpCircle } from 'lucide-react-native';

export default function SplashRoleScreen() {
  const router = useRouter();
  const setRole = useAuthStore((s) => s.setRole);

  const handlePatient = () => {
    setRole('patient');
    router.push('/patient/login');
  };

  const handleCareProvider = () => {
    router.push('/care-provider/login');
  };

  return (
    <SafeAreaView className="flex-1 bg-surface">
      {/* Background decorations */}
      <View className="absolute -top-24 -left-24 w-[320px] h-[320px] rounded-full bg-primary/5" />
      <View className="absolute bottom-32 -right-24 w-[280px] h-[280px] rounded-full bg-tertiary/5" />
      <View className="absolute top-1/3 right-0 w-[200px] h-[200px] rounded-full bg-primary/[0.03]" />

      <View className="flex-1 items-center justify-center px-6">
        {/* Logo Section - standalone, not in card */}
        <View className="items-center mb-6">
          <View className="w-36 h-36 mb-5 items-center justify-center">
            <Image
              source={require('../assets/logo_arunpriya.png')}
              className="w-full h-full"
              resizeMode="contain"
            />
          </View>
          <Text
            className="text-2xl font-extrabold text-center tracking-widest uppercase leading-8"
            style={{ color: '#1A73E8' }}
          >
            ARUN PRIYA
          </Text>
          <Text
            className="text-base font-bold text-center tracking-widest uppercase"
            style={{ color: '#1A73E8' }}
          >
            MULTISPECIALITY HOSPITAL
          </Text>
        </View>

        {/* Role Selection Card */}
        <GlassCard className="w-full mb-6" variant="highest">
          <Text className="text-xl font-semibold text-midnight text-center mb-1 tracking-tight">
            Welcome to Clinical Sanctuary
          </Text>
          <Text className="text-sm text-slate-400 text-center mb-8 font-light">
            Please select your gateway
          </Text>

          <View className="gap-4">
            {/* Patient Button - Solid blue */}
            <Pressable
              onPress={handlePatient}
              className="w-full py-4 px-6 rounded-full flex-row items-center justify-center gap-3 active:opacity-90"
              style={{
                backgroundColor: '#1A73E8',
                shadowColor: '#1A73E8',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 12,
                elevation: 8,
              }}
            >
              <User size={22} color="#FFFFFF" />
              <Text className="text-white font-semibold text-lg">I'm a Patient</Text>
            </Pressable>

            {/* Care Provider Button - White with border */}
            <Pressable
              onPress={handleCareProvider}
              className="w-full py-4 px-6 rounded-full flex-row items-center justify-center gap-3 active:opacity-80"
              style={{
                backgroundColor: '#FFFFFF',
                borderWidth: 1.5,
                borderColor: '#E2EEFF',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.06,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <BriefcaseMedical size={22} color="#1A73E8" />
              <Text className="font-semibold text-lg" style={{ color: '#1A73E8' }}>
                I'm a Care Provider
              </Text>
            </Pressable>
          </View>
        </GlassCard>

        {/* Help Link */}
        <Pressable className="flex-row items-center gap-2 mt-2">
          <HelpCircle size={16} color="#64748B" />
          <Text className="text-slate-500 text-sm font-light">Need help logging in?</Text>
        </Pressable>
      </View>

      {/* Footer */}
      <View className="pb-10 pt-4 items-center gap-2">
        <Text className="text-[10px] font-light tracking-[3px] text-slate-400 uppercase">
          Secure Encryption {'\u2022'} HIPAA Compliant {'\u2022'} NALAM v2.4
        </Text>
        <Text className="text-[10px] font-medium tracking-widest text-slate-500/60 uppercase mt-1">
          Powered by NALAMHCIT SOLUTIONS PVT LTD
        </Text>
      </View>
    </SafeAreaView>
  );
}
