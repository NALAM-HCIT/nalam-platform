import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '@/stores/authStore';
import { Shadows } from '@/constants/theme';
import { ArrowLeft } from 'lucide-react-native';
import { TEST_USERS } from '@/constants/testUsers';

export default function OTPScreen() {
  const router = useRouter();
  const { phone, login } = useAuthStore();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const inputs = useRef<(TextInput | null)[]>([]);

  // Auto-focus first input on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      inputs.current[0]?.focus();
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  // Countdown timer for resend
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

  const handleOtpChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    // Auto-advance to next input
    if (text && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number, digit: string) => {
    if (key === 'Backspace' && !digit && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleResend = () => {
    if (canResend) {
      setCountdown(30);
      setCanResend(false);
      setOtp(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    }
  };

  const handleVerify = () => {
    const otpString = otp.join('');
    if (otpString.length === 6) {
      const user = TEST_USERS[phone];
      login({
        userName: user?.name || 'Patient',
        userId: user?.userId || 'patient-001',
        role: 'patient',
      });
      router.replace('/patient/(tabs)');
    }
  };

  const maskedPhone = phone
    ? `${phone.slice(0, 3)} ${phone.slice(3, 5)}*** ***${phone.slice(-2)}`
    : '+91 XXXXX XXXXX';

  return (
    <View className="flex-1 bg-surface">
      {/* Header with Gradient - shorter than login */}
      <LinearGradient
        colors={['#0a192f', '#1c74e9', '#60a5fa']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="h-[28%] w-full px-6 pt-14"
      >
        <SafeAreaView edges={['top']}>
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-white/15 items-center justify-center mb-6"
          >
            <ArrowLeft size={20} color="#FFFFFF" />
          </Pressable>
        </SafeAreaView>
        <Text className="text-white text-3xl font-extrabold tracking-tight">
          Verify Your{'\n'}Number
        </Text>
      </LinearGradient>

      {/* White Bottom Sheet Card */}
      <View
        className="flex-1 bg-white rounded-t-[36px] -mt-8 z-10 px-8 pt-4"
        style={Shadows.presence}
      >
        {/* Handle Bar */}
        <View className="w-12 h-1.5 bg-slate-200 rounded-full self-center mb-8" />

        {/* Title */}
        <Text className="text-midnight text-2xl font-extrabold tracking-tight">Verify OTP</Text>

        {/* Subtitle with phone number and edit link */}
        <View className="flex-row items-center mt-2 mb-8">
          <Text className="text-slate-500 text-sm">
            Code sent to {maskedPhone}
          </Text>
          <Pressable onPress={() => router.back()} className="ml-2">
            <Text className="text-primary font-semibold text-sm">Edit</Text>
          </Pressable>
        </View>

        {/* OTP Input Boxes */}
        <View className="flex-row gap-3 mb-8 justify-center">
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => {
                inputs.current[index] = ref;
              }}
              className={`w-12 h-14 rounded-xl text-center text-xl font-bold text-midnight ${
                digit
                  ? 'bg-primary/5 border-2 border-primary'
                  : 'bg-surface border border-slate-200'
              }`}
              keyboardType="number-pad"
              maxLength={1}
              value={digit}
              onChangeText={(text) => handleOtpChange(text, index)}
              onKeyPress={({ nativeEvent }) =>
                handleKeyPress(nativeEvent.key, index, digit)
              }
              selectTextOnFocus
            />
          ))}
        </View>

        {/* Verify Button */}
        <Pressable
          onPress={handleVerify}
          className="w-full bg-primary py-4 rounded-xl items-center active:opacity-90"
          style={Shadows.focus}
        >
          <Text className="text-white font-bold text-base tracking-wide">
            Verify & Continue
          </Text>
        </Pressable>

        {/* Resend OTP with countdown */}
        <View className="flex-row justify-center mt-6 gap-1 items-center">
          <Text className="text-slate-400 text-sm">Didn't receive the code?</Text>
          {canResend ? (
            <Pressable onPress={handleResend}>
              <Text className="text-primary font-semibold text-sm">Resend OTP</Text>
            </Pressable>
          ) : (
            <Text className="text-slate-400 text-sm font-medium">
              Resend in {countdown}s
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}
