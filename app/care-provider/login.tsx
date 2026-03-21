import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '@/stores/authStore';
import { Shadows } from '@/constants/theme';
import { ArrowLeft, Stethoscope, Pill, Activity, HeartPulse, ChevronDown, ArrowRight, ShieldCheck } from 'lucide-react-native';
import { TEST_USERS } from '@/constants/testUsers';

export default function CareProviderLoginScreen() {
  const router = useRouter();
  const { setPhone } = useAuthStore();
  const [phone, setPhoneLocal] = useState('');
  const [error, setError] = useState('');

  const handleSendOTP = () => {
    if (phone.length < 10) return;
    const fullPhone = `+91${phone}`;
    if (!TEST_USERS[fullPhone]) {
      setError('This number is not registered. Please contact your hospital administrator.');
      return;
    }
    setError('');
    setPhone(fullPhone);
    router.push('/care-provider/otp');
  };

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View className="flex-1 bg-[#EEF3FF]">
        <LinearGradient
          colors={['#0c1d4a', '#1a3a8f', '#2260d9']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ height: 260 }}
        >
          <SafeAreaView edges={['top']}>
            <View style={{ position: 'absolute', top: 20, left: 80 }} pointerEvents="none">
              <Activity size={80} color="rgba(255,255,255,0.08)" />
            </View>
            <View style={{ position: 'absolute', top: 10, right: 60 }} pointerEvents="none">
              <Stethoscope size={80} color="rgba(255,255,255,0.09)" />
            </View>
            <View style={{ position: 'absolute', top: 80, right: 10 }} pointerEvents="none">
              <HeartPulse size={70} color="rgba(255,255,255,0.08)" />
            </View>
            <View style={{ position: 'absolute', top: 60, left: 160 }} pointerEvents="none">
              <Pill size={60} color="rgba(255,255,255,0.07)" />
            </View>

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
                Care Provider Access
              </Text>
            </View>
          </SafeAreaView>
        </LinearGradient>

        <View className="flex-1 bg-[#EEF3FF] rounded-t-[32px] -mt-8 z-10">
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View className="w-12 h-1.5 bg-slate-300/60 rounded-full self-center mt-4 mb-6" />

            <Text className="text-midnight text-[26px] font-extrabold mb-1">
              Care Provider Login
            </Text>
            <Text className="text-slate-400 text-sm mb-6 font-light">
              Verify your registered mobile number
            </Text>

            <Text className="text-midnight text-sm font-bold mb-3">Mobile Number</Text>

            <View className="flex-row gap-3 mb-5">
              <Pressable
                className="flex-row items-center gap-2 bg-white rounded-xl px-4 py-4"
                style={Shadows.card}
              >
                <Text className="text-midnight font-semibold">+91</Text>
                <ChevronDown size={14} color="#64748B" />
              </Pressable>
              <View className="flex-1 bg-white rounded-xl" style={Shadows.card}>
                <TextInput
                  className="px-4 py-4 text-midnight font-medium"
                  placeholder="Enter 10 digit number"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={phone}
                  onChangeText={(t) => { setPhoneLocal(t); setError(''); }}
                />
              </View>
            </View>

            {error ? (
              <View className="flex-row items-start gap-2 bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3 mb-4">
                <Text className="text-rose-600 text-xs flex-1 leading-relaxed font-medium">{error}</Text>
              </View>
            ) : null}

            <Pressable
              onPress={handleSendOTP}
              className="w-full py-4 rounded-2xl flex-row items-center justify-center gap-3 mb-5 active:opacity-90"
              style={{
                backgroundColor: '#1A73E8',
                shadowColor: '#1A73E8',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 12,
                elevation: 8,
              }}
            >
              <Text className="text-white font-bold text-base">Get OTP</Text>
              <ArrowRight size={18} color="#FFFFFF" />
            </Pressable>

            <View className="flex-row gap-3 p-4 bg-white/70 rounded-2xl border border-blue-100">
              <ShieldCheck size={20} color="#1A73E8" />
              <Text className="text-xs text-slate-500 flex-1 leading-relaxed">
                Admin access is restricted. This portal is monitored. For login issues, please contact IT Security.
              </Text>
            </View>

            <View className="flex-row justify-between items-start mt-8">
              <Text className="text-[9px] text-slate-400 uppercase tracking-wide leading-4">
                {'© 2024 Arun Priya Multispeciality.\nInstitutional Policy Applied.'}
              </Text>
              <View className="flex-row gap-3">
                <Text className="text-[9px] text-slate-400 uppercase tracking-wide">IT Support</Text>
                <Text className="text-[9px] text-slate-400 uppercase tracking-wide">HIPAA</Text>
                <Text className="text-[9px] text-slate-400 uppercase tracking-wide">Privacy</Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
