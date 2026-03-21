import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '@/stores/authStore';
import { Shadows } from '@/constants/theme';
import { ArrowLeft, Stethoscope, Pill, Activity, HeartPulse, ChevronDown, ArrowRight, ShieldCheck } from 'lucide-react-native';

export default function PatientLoginScreen() {
  const router = useRouter();
  const setPhone = useAuthStore((s) => s.setPhone);
  const [phone, setPhoneLocal] = useState('');

  const handleGetOTP = () => {
    if (phone.length >= 10) {
      setPhone(`+91${phone}`);
      router.push('/patient/otp');
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View className="flex-1 bg-[#EEF3FF]">
        {/* Gradient Header — fixed height so bottom sheet always has room */}
        <LinearGradient
          colors={['#0c1d4a', '#1a3a8f', '#2260d9']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ height: 260 }}
        >
          <SafeAreaView edges={['top']}>
            {/* Medical watermark icons */}
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

            {/* Back Button */}
            <View className="px-5 pt-3 mb-4">
              <Pressable
                onPress={() => router.back()}
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
              >
                <ArrowLeft size={20} color="#FFFFFF" />
              </Pressable>
            </View>

            {/* Header Text */}
            <View className="px-6">
              <Text className="text-white text-[26px] font-bold leading-tight">
                Welcome to Arun Priya{'\n'}
                <Text className="text-[#7EB3FF] font-extrabold">Multispeciality Hospital</Text>
              </Text>
              <Text className="text-white/50 text-xs font-semibold uppercase tracking-[3px] mt-2">
                Patient Portal Access
              </Text>
            </View>
          </SafeAreaView>
        </LinearGradient>

        {/* Bottom Sheet — flex-1 fills all remaining space */}
        <View className="flex-1 bg-[#EEF3FF] rounded-t-[32px] -mt-8 z-10">
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Handle Bar */}
            <View className="w-12 h-1.5 bg-slate-300/60 rounded-full self-center mt-4 mb-6" />

            <Text className="text-midnight text-[26px] font-extrabold mb-1">
              Login or Sign up
            </Text>
            <Text className="text-slate-400 text-sm mb-6 font-light">
              Verify your mobile number to continue
            </Text>

            {/* Mobile Number Label */}
            <Text className="text-midnight text-sm font-bold mb-3">
              Mobile Number
            </Text>

            {/* Phone Input Row */}
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
                  onChangeText={setPhoneLocal}
                />
              </View>
            </View>

            {/* Get OTP Button */}
            <Pressable
              onPress={handleGetOTP}
              className="w-full py-4 rounded-2xl flex-row items-center justify-center gap-3 mb-6 active:opacity-90"
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

            {/* Security Info Callout */}
            <View className="flex-row gap-3 p-4 bg-white/70 rounded-2xl border border-blue-100 mb-6">
              <ShieldCheck size={20} color="#1A73E8" />
              <Text className="text-xs text-slate-500 flex-1 leading-relaxed">
                Your data is encrypted and secure. We will send a 6-digit verification code to your mobile number.
              </Text>
            </View>

            {/* Terms */}
            <Text className="text-slate-400 text-xs text-center leading-5">
              By continuing, you agree to Nalam's{' '}
              <Text className="text-primary font-semibold">Terms of Service</Text>
              {' & '}
              <Text className="text-primary font-semibold">Privacy Policy</Text>
            </Text>
          </ScrollView>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
