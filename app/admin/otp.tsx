import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { Shadows } from '@/constants/theme';
import { api } from '@/services/api';
import { ArrowLeft, ArrowRight, ShieldCheck, RotateCcw } from 'lucide-react-native';

const RESEND_COOLDOWN = 30;

export default function AdminOTPScreen() {
  const router = useRouter();
  const { phone, login } = useAuthStore();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [resendTimer, setResendTimer] = useState(RESEND_COOLDOWN);
  const [resendCount, setResendCount] = useState(0);
  const inputs = useRef<(TextInput | null)[]>([]);

  // Resend countdown timer
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleOtpChange = (text: string, index: number) => {
    if (otpError) setOtpError('');
    const cleaned = text.replace(/[^0-9]/g, '');
    const newOtp = [...otp];
    newOtp[index] = cleaned;
    setOtp(newOtp);
    if (cleaned && index < 5) inputs.current[index + 1]?.focus();
  };

  const handleKeyPress = (key: string, index: number, digit: string) => {
    if (key === 'Backspace' && !digit && index > 0) {
      const newOtp = [...otp];
      newOtp[index - 1] = '';
      setOtp(newOtp);
      inputs.current[index - 1]?.focus();
    }
  };

  const handleVerify = useCallback(async () => {
    const otpString = otp.join('');
    if (otpString.length < 6) {
      setOtpError('Please enter the complete 6-digit code');
      Vibration.vibrate(100);
      return;
    }

    setIsVerifying(true);
    setOtpError('');

    try {
      const response = await api.post('/auth/verify-otp', {
        mobileNumber: phone,
        otpCode: otpString
      });
      
      const { token, user } = response.data;
      
      // Persist the token and user session securely
      await login({
        token,
        userName: user.fullName || 'Admin User',
        userId: user.id,
        role: user.role,
        hospitalId: user.hospitalId
      });
      
      // Navigate to the respective dashboard based on role
      router.replace(`/${user.role}/(tabs)` as any);
    } catch (error: any) {
      if (error.response?.data?.message) {
        setOtpError(error.response.data.message);
      } else {
        setOtpError('Network error. Please try again.');
      }
      Vibration.vibrate(100);
    } finally {
      setIsVerifying(false);
    }
  }, [otp, phone, login, router]);

  const handleResendOTP = useCallback(async () => {
    if (resendTimer > 0) return;

    if (resendCount >= 5) {
      Alert.alert(
        'Maximum Attempts Reached',
        'You have exceeded the maximum number of OTP resend attempts. Please try again after 30 minutes or contact IT Support.',
        [{ text: 'OK', style: 'cancel' }]
      );
      return;
    }

    try {
      // Re-trigger the send OTP endpoint
      await api.post('/auth/send-otp', { mobileNumber: phone });
      
      setResendCount((prev) => prev + 1);
      setResendTimer(RESEND_COOLDOWN);
      setOtp(['', '', '', '', '', '']);
      setOtpError('');
      inputs.current[0]?.focus();

      Alert.alert(
        'OTP Resent',
        `A new verification code has been sent to ${phone || 'your registered number'}.`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to resend OTP');
    }
  }, [resendTimer, resendCount, phone]);

  const handleChangeNumber = () => {
    Alert.alert(
      'Change Number',
      'Go back to login screen to enter a different number?',
      [
        { text: 'Stay', style: 'cancel' },
        {
          text: 'Go Back',
          onPress: () => router.back(),
        },
      ]
    );
  };

  const formatPhone = (phoneNumber: string) => {
    if (!phoneNumber) return '+91 XXXXX XXXXX';
    const digits = phoneNumber.replace(/\D/g, '');
    if (digits.length >= 12) {
      return `+${digits.slice(0, 2)} ${digits.slice(2, 7)} ${digits.slice(7)}`;
    }
    return phoneNumber;
  };

  const isOtpComplete = otp.every((d) => d !== '');

  return (
    <View className="flex-1 bg-surface">
      {/* Decorative blobs */}
      <View className="absolute top-20 -right-20 w-72 h-72 bg-primary/5 rounded-full" />
      <View className="absolute bottom-32 -left-16 w-64 h-64 bg-tertiary/5 rounded-full" />

      <SafeAreaView edges={['top']}>
        <View className="flex-row items-center px-6 py-4">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-white/70 items-center justify-center border border-white/50 -ml-1 active:opacity-70"
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
            <View className="mt-3 items-center">
              <Text className="text-slate-400 text-center font-light">
                We sent a 6-digit code to
              </Text>
              <View className="flex-row items-center mt-1 gap-2">
                <Text className="font-medium text-midnight">{formatPhone(phone)}</Text>
                <Pressable onPress={handleChangeNumber} className="active:opacity-70">
                  <Text className="text-primary text-xs font-semibold">Change</Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* Glass Card */}
          <View
            className="bg-white/70 rounded-2xl p-8 border border-white/50"
            style={Shadows.presence}
          >
            {/* OTP Inputs */}
            <View className="flex-row gap-3 justify-center mb-3">
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => {
                    inputs.current[index] = ref;
                  }}
                  className={`w-12 h-14 rounded-xl text-center text-xl font-extrabold border outline-0 ${
                    otpError
                      ? 'bg-red-50 border-red-300 text-red-500'
                      : digit
                        ? 'bg-primary/5 border-primary/30 text-primary'
                        : 'bg-white border-outline-variant text-midnight'
                  }`}
                  keyboardType="number-pad"
                  maxLength={1}
                  value={digit}
                  onChangeText={(text) => handleOtpChange(text, index)}
                  onKeyPress={({ nativeEvent }) =>
                    handleKeyPress(nativeEvent.key, index, digit)
                  }
                />
              ))}
            </View>

            {/* OTP Error */}
            {otpError ? (
              <Text className="text-red-500 text-xs text-center mb-5">{otpError}</Text>
            ) : (
              <View className="mb-5" />
            )}

            {/* Verify Button */}
            <Pressable
              onPress={handleVerify}
              disabled={isVerifying}
              className={`w-full py-4 rounded-full items-center flex-row justify-center gap-2 ${
                isVerifying
                  ? 'opacity-70'
                  : isOtpComplete
                    ? 'active:opacity-90'
                    : 'opacity-50'
              }`}
              style={[
                { backgroundColor: '#1A73E8' },
                isOtpComplete && !isVerifying ? Shadows.focus : {},
              ]}
            >
              {isVerifying ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text className="text-white font-semibold text-lg">Verify & Continue</Text>
                  <ArrowRight size={20} color="#FFFFFF" />
                </>
              )}
            </Pressable>

            {/* Resend */}
            <View className="flex-row justify-center mt-6 gap-1 items-center">
              <Text className="text-slate-400 text-sm font-light">Didn't receive the code?</Text>
              {resendTimer > 0 ? (
                <Text className="text-slate-300 font-semibold text-sm">
                  Resend in {resendTimer}s
                </Text>
              ) : (
                <Pressable
                  onPress={handleResendOTP}
                  className="flex-row items-center gap-1 active:opacity-70"
                >
                  <RotateCcw size={12} color="#1A73E8" />
                  <Text className="text-primary font-semibold text-sm">Resend OTP</Text>
                </Pressable>
              )}
            </View>
          </View>

          {/* Footer */}
          <Text className="text-[10px] text-slate-400 tracking-[3px] uppercase text-center mt-8 font-light">
            Secure Admin Access
          </Text>
        </View>
      </View>
    </View>
  );
}
