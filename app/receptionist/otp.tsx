import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { Shadows } from '@/constants/theme';
import { ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react-native';
import { api } from '@/services/api';

export default function ReceptionistOTPScreen() {
  const router = useRouter();
  const { phone, login } = useAuthStore();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const inputs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (countdown > 0) {
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [countdown]);

  const handleResend = async () => {
    if (canResend) {
      setError('');
      try {
        await api.post('/auth/send-otp', { mobileNumber: phone });
        setCountdown(30);
        setCanResend(false);
        setOtp(['', '', '', '', '', '']);
        inputs.current[0]?.focus();
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to resend OTP');
      }
    }
  };

  const handleOtpChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    if (text && index < 5) inputs.current[index + 1]?.focus();
  };

  const handleVerify = async () => {
    const otpString = otp.join('');
    if (otpString.length < 6) return;
    setIsVerifying(true);
    setError('');
    try {
      const response = await api.post('/auth/verify-otp', {
        mobileNumber: phone,
        otpCode: otpString,
      });
      const { token, user } = response.data;
      await login({
        token,
        userName: user.fullName || 'Receptionist',
        userId: user.id,
        role: user.role,
        hospitalId: user.hospitalId,
      });
      router.replace(`/${user.role}/(tabs)` as any);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid OTP. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <View className="flex-1 bg-surface">
      {/* Decorative blobs */}
      <View className="absolute top-20 -right-20 w-72 h-72 bg-primary/5 rounded-full" />
      <View className="absolute bottom-32 -left-16 w-64 h-64 bg-tertiary/5 rounded-full" />

      <SafeAreaView edges={['top']}>
        <View className="flex-row items-center px-6 py-4">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-white/70 items-center justify-center border border-white/50 -ml-1"
          >
            <ArrowLeft size={20} color="#0B1B3D" />
          </Pressable>
        </View>
      </SafeAreaView>

      <View className="flex-1 items-center justify-center px-6">
        <View className="w-full max-w-md">
          {/* Hero */}
          <View className="items-center mb-8">
            <View className="w-20 h-20 rounded-full bg-primary/10 items-center justify-center mb-6">
              <ShieldCheck size={36} color="#1A73E8" />
            </View>
            <Text className="text-[11px] font-light uppercase tracking-[4px] text-primary/60 mb-2">
              Verification
            </Text>
            <Text className="text-3xl font-extrabold text-midnight tracking-tight text-center">
              Enter OTP Code
            </Text>
            <Text className="text-slate-400 mt-3 text-center font-light">
              We sent a 6-digit code to{'\n'}
              <Text className="font-medium text-midnight">{phone || '+91 XXXXX XXXXX'}</Text>
            </Text>
          </View>

          {/* Glass Card */}
          <View
            className="bg-white/70 rounded-2xl p-8 border border-white/50"
            style={Shadows.presence}
          >
            {/* OTP Inputs */}
            <View className="flex-row gap-3 justify-center mb-8">
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => { inputs.current[index] = ref; }}
                  className={`w-12 h-14 rounded-xl text-center text-xl font-extrabold border ${
                    digit
                      ? 'bg-primary/5 border-primary/30 text-primary'
                      : 'bg-white border-outline-variant text-midnight'
                  }`}
                  keyboardType="number-pad"
                  maxLength={1}
                  value={digit}
                  onChangeText={(text) => handleOtpChange(text, index)}
                  onKeyPress={({ nativeEvent }) => {
                    if (nativeEvent.key === 'Backspace' && !digit && index > 0) {
                      inputs.current[index - 1]?.focus();
                    }
                  }}
                />
              ))}
            </View>

            {/* Verify Button */}
            <Pressable
              onPress={handleVerify}
              className="w-full bg-primary py-4 rounded-full items-center flex-row justify-center gap-2 active:opacity-90"
              style={Shadows.focus}
            >
              <Text className="text-white font-semibold text-lg">Verify & Continue</Text>
              <ArrowRight size={20} color="#FFFFFF" />
            </Pressable>

            {/* Resend */}
            <View className="flex-row justify-center mt-6 gap-1 items-center">
              <Text className="text-slate-400 text-sm font-light">Didn't receive the code?</Text>
              {canResend ? (
                <Pressable onPress={handleResend}>
                  <Text className="text-primary font-semibold text-sm">Resend OTP</Text>
                </Pressable>
              ) : (
                <Text className="text-slate-400 text-sm font-medium">Resend in {countdown}s</Text>
              )}
            </View>
          </View>

          {/* Footer */}
          <Text className="text-[10px] text-slate-400 tracking-[3px] uppercase text-center mt-8 font-light">
            Secure Clinical Access
          </Text>
        </View>
      </View>
    </View>
  );
}
