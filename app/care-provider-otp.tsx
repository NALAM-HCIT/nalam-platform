import { CustomAlert } from '@/components/CustomAlert';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, TextInput, Pressable, Vibration } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore, UserRole } from '@/stores/authStore';
import { Shadows } from '@/constants/theme';
import { ArrowLeft } from 'lucide-react-native';
import { api, HOSPITAL_ID } from '@/services/api';

const RESEND_COOLDOWN = 30;

export default function CareProviderOTPScreen() {
  const router = useRouter();
  const { phone, login } = useAuthStore();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(RESEND_COOLDOWN);
  const [canResend, setCanResend] = useState(false);
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendCount, setResendCount] = useState(0);
  const inputs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => { inputs.current[0]?.focus(); }, 400);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) { setCanResend(true); return 0; }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [countdown]);

  const handleOtpChange = (text: string, index: number) => {
    if (error) setError('');
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
      setError('Please enter the complete 6-digit code');
      Vibration.vibrate(100);
      return;
    }
    setIsVerifying(true);
    setError('');
    try {
      const response = await api.post('/auth/verify-otp', {
        mobileNumber: phone,
        otpCode: otpString,
        hospitalId: HOSPITAL_ID || undefined,
        accountType: 'staff',
      });

      if (!response.data.success) {
        setError(response.data.message || 'Verification failed.');
        Vibration.vibrate(100);
        return;
      }

      const { token, user } = response.data;
      const roles: UserRole[] = user.roles || [user.role];

      await login({
        token,
        userName: user.fullName || 'Care Provider',
        userId: user.id,
        role: user.role,
        roles,
        hospitalId: user.hospitalId,
        accountType: 'staff',
      });

      if (roles.length > 1) {
        router.replace('/care-provider-role-select');
      } else {
        router.replace(`/${roles[0]}/(tabs)` as any);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid OTP. Please try again.');
      Vibration.vibrate(100);
    } finally {
      setIsVerifying(false);
    }
  }, [otp, phone, login, router]);

  const handleResend = useCallback(async () => {
    if (!canResend) return;
    if (resendCount >= 5) {
      CustomAlert.alert(
        'Maximum Attempts Reached',
        'You have exceeded the maximum number of OTP resend attempts. Please try again after 30 minutes.',
        [{ text: 'OK', style: 'cancel' }]
      );
      return;
    }
    setError('');
    try {
      await api.post('/auth/send-otp', { mobileNumber: phone, hospitalId: HOSPITAL_ID || undefined, accountType: 'staff' });
      setResendCount((prev) => prev + 1);
      setCountdown(RESEND_COOLDOWN);
      setCanResend(false);
      setOtp(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resend OTP');
    }
  }, [canResend, resendCount, phone]);

  const maskedPhone = phone
    ? `${phone.slice(0, 3)} ${phone.slice(3, 5)}*** ***${phone.slice(-2)}`
    : '+91 XXXXX XXXXX';

  return (
    <View className="flex-1 bg-surface">
      <LinearGradient
        colors={['#0a192f', '#1c74e9', '#60a5fa']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="w-full px-6"
        style={{ paddingBottom: 52 }}
      >
        <SafeAreaView edges={['top']}>
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-white/15 items-center justify-center mt-2 mb-5"
          >
            <ArrowLeft size={20} color="#FFFFFF" />
          </Pressable>
        </SafeAreaView>
        <Text className="text-white text-3xl font-extrabold tracking-tight">
          Verify Your{'\n'}Number
        </Text>
      </LinearGradient>

      <View className="flex-1 bg-white rounded-t-[36px] -mt-8 z-10 px-8 pt-4" style={Shadows.presence}>
        <View className="w-12 h-1.5 bg-slate-200 rounded-full self-center mb-6" />
        <Text className="text-midnight text-2xl font-extrabold tracking-tight">Verify OTP</Text>
        <View className="flex-row items-center mt-2 mb-8">
          <Text className="text-slate-500 text-sm">Code sent to {maskedPhone}</Text>
          <Pressable onPress={() => router.back()} className="ml-2">
            <Text className="text-primary font-semibold text-sm">Edit</Text>
          </Pressable>
        </View>

        <View className="flex-row gap-3 mb-8 justify-center">
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => { inputs.current[index] = ref; }}
              className={`w-12 h-14 rounded-xl text-center text-xl font-bold text-midnight ${
                digit ? 'bg-primary/5 border-2 border-primary' : 'bg-surface border border-slate-200'
              }`}
              keyboardType="number-pad"
              maxLength={1}
              value={digit}
              onChangeText={(text) => handleOtpChange(text, index)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index, digit)}
              selectTextOnFocus
            />
          ))}
        </View>

        {error ? <Text className="text-red-500 text-sm text-center mb-4">{error}</Text> : null}

        <Pressable
          onPress={handleVerify}
          disabled={isVerifying}
          className="w-full bg-primary py-4 rounded-xl items-center active:opacity-90"
          style={Shadows.focus}
        >
          <Text className="text-white font-bold text-base tracking-wide">
            {isVerifying ? 'Verifying…' : 'Verify & Continue'}
          </Text>
        </Pressable>

        <View className="flex-row justify-center mt-6 gap-1 items-center">
          <Text className="text-slate-400 text-sm">Didn't receive the code?</Text>
          {canResend ? (
            <Pressable onPress={handleResend}>
              <Text className="text-primary font-semibold text-sm">Resend OTP</Text>
            </Pressable>
          ) : (
            <Text className="text-slate-400 text-sm font-medium">Resend in {countdown}s</Text>
          )}
        </View>
        <Text className="text-[10px] text-slate-300 tracking-[3px] uppercase text-center mt-8 font-light">
          Secure Staff Access
        </Text>
      </View>
    </View>
  );
}
