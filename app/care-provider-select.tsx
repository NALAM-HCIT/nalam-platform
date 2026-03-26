import { CustomAlert } from '@/components/CustomAlert';
import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '@/stores/authStore';
import { Shadows } from '@/constants/theme';
import { api, HOSPITAL_ID } from '@/services/api';
import { HospitalConfig } from '@/config/hospital';
import {
  ArrowLeft, Stethoscope, Pill, Activity, HeartPulse,
  ChevronDown, ArrowRight, ShieldCheck, X, BriefcaseMedical,
} from 'lucide-react-native';

export default function CareProviderLoginScreen() {
  const router = useRouter();
  const { setPhone } = useAuthStore();
  const [phone, setPhoneLocal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState({ code: '+91', name: 'India', flag: 'IN' });

  const countries = [
    { code: '+91', name: 'India', flag: 'IN' },
    { code: '+1', name: 'United States', flag: 'US' },
    { code: '+44', name: 'United Kingdom', flag: 'UK' },
    { code: '+971', name: 'UAE', flag: 'AE' },
    { code: '+65', name: 'Singapore', flag: 'SG' },
    { code: '+61', name: 'Australia', flag: 'AU' },
  ];

  const validatePhone = useCallback((value: string): boolean => {
    if (!value.trim()) {
      setPhoneError('Phone number is required');
      return false;
    }
    if (value.length < 10) {
      setPhoneError('Enter a valid 10-digit number');
      return false;
    }
    if (!/^\d{10}$/.test(value)) {
      setPhoneError('Only digits are allowed');
      return false;
    }
    setPhoneError('');
    return true;
  }, []);

  const handleSendOTP = useCallback(async () => {
    if (!validatePhone(phone)) return;

    setIsLoading(true);
    setPhoneError('');

    try {
      const fullPhone = `${selectedCountry.code}${phone}`;
      const res = await api.post('/auth/send-otp', { mobileNumber: fullPhone, hospitalId: HOSPITAL_ID || undefined, accountType: 'staff' });

      if (!res.data.success) {
        if (res.data.isNewUser) {
          setPhoneError('Mobile not registered. Contact your hospital administrator.');
        } else {
          setPhoneError(res.data.message || 'Failed to send OTP.');
        }
        return;
      }

      setPhone(fullPhone);
      router.push('/care-provider-otp');
    } catch (error: any) {
      if (error.response?.status === 429) {
        setPhoneError('Too many requests. Please wait a minute before trying again.');
      } else {
        setPhoneError(error.response?.data?.message || 'Failed to connect. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [phone, selectedCountry, setPhone, router, validatePhone]);

  const handlePhoneChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    setPhoneLocal(cleaned);
    if (phoneError) setPhoneError('');
  };

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View className="flex-1 bg-[#EEF3FF]">
        {/* Gradient Header */}
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
                className="w-10 h-10 rounded-full items-center justify-center active:opacity-70"
                style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
              >
                <ArrowLeft size={20} color="#FFFFFF" />
              </Pressable>
            </View>

            {/* Header Text */}
            <View className="px-6">
              <Text className="text-white text-[26px] font-bold leading-tight">
                Welcome to{'\n'}
                <Text className="text-[#7EB3FF] font-extrabold">{HospitalConfig.name}</Text>
              </Text>
              <Text className="text-white/50 text-xs font-semibold uppercase tracking-[3px] mt-2">
                Secure Staff Access
              </Text>
            </View>
          </SafeAreaView>
        </LinearGradient>

        {/* Bottom Sheet */}
        <View className="flex-1 bg-[#EEF3FF] rounded-t-[32px] -mt-8 z-10">
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View className="w-12 h-1.5 bg-slate-300/60 rounded-full self-center mt-4 mb-6" />

            <View className="flex-row items-center gap-3 mb-1">
              <BriefcaseMedical size={24} color="#1A73E8" />
              <Text className="text-midnight text-[26px] font-extrabold">
                Staff Login
              </Text>
            </View>
            <Text className="text-slate-400 text-sm mb-6 font-light">
              Doctor, Admin, Pharmacist, or Receptionist — one login for all roles
            </Text>

            {/* Phone Input */}
            <Text className="text-midnight text-sm font-bold mb-3">
              Mobile Number
            </Text>

            <View className="flex-row gap-3 mb-2">
              {/* Country Code Picker */}
              <Pressable
                onPress={() => setShowCountryPicker(true)}
                className="flex-row items-center gap-2 bg-white rounded-xl px-4 py-4 active:opacity-80"
                style={Shadows.card}
              >
                <Text className="text-midnight font-semibold">{selectedCountry.code}</Text>
                <ChevronDown size={14} color="#64748B" />
              </Pressable>
              <View
                className={`flex-1 bg-white rounded-xl ${phoneError ? 'border border-red-400' : ''}`}
                style={Shadows.card}
              >
                <TextInput
                  className="px-4 py-4 text-midnight font-medium border-0"
                  placeholder="Enter 10 digit number"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={phone}
                  onChangeText={handlePhoneChange}
                />
              </View>
            </View>

            {/* Phone Error */}
            {phoneError ? (
              <Text className="text-red-500 text-xs mb-4 ml-1">{phoneError}</Text>
            ) : (
              <View className="mb-3" />
            )}

            {/* Get OTP Button */}
            <Pressable
              onPress={handleSendOTP}
              disabled={isLoading}
              className={`w-full py-4 rounded-2xl flex-row items-center justify-center gap-3 mb-8 ${
                isLoading ? 'opacity-70' : 'active:opacity-90'
              }`}
              style={{
                backgroundColor: '#1A73E8',
                shadowColor: '#1A73E8',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 12,
                elevation: 8,
              }}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text className="text-white font-bold text-base">Get OTP</Text>
                  <ArrowRight size={18} color="#FFFFFF" />
                </>
              )}
            </Pressable>

            {/* Security Callout */}
            <View className="flex-row gap-3 p-4 bg-white/70 rounded-2xl border border-blue-100">
              <ShieldCheck size={20} color="#1A73E8" />
              <Text className="text-xs text-slate-500 flex-1 leading-relaxed">
                Staff access is restricted to registered hospital personnel. All login attempts are monitored and logged for security compliance.
              </Text>
            </View>

            {/* Footer */}
            <Text className="text-[9px] text-slate-400 uppercase tracking-wide text-center mt-8 font-light">
              {'Secure Encryption \u2022 HIPAA Compliant \u2022 NALAM v2.4'}
            </Text>
          </ScrollView>
        </View>

        {/* Country Code Picker Modal */}
        <Modal
          visible={showCountryPicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowCountryPicker(false)}
        >
          <Pressable
            className="flex-1 bg-black/40 justify-end"
            onPress={() => setShowCountryPicker(false)}
          >
            <Pressable onPress={() => {}} className="bg-white rounded-t-3xl">
              <View className="w-12 h-1.5 bg-slate-300/60 rounded-full self-center mt-3 mb-2" />
              <View className="flex-row items-center justify-between px-6 py-3">
                <Text className="text-midnight text-lg font-bold">Select Country</Text>
                <Pressable
                  onPress={() => setShowCountryPicker(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center active:opacity-70"
                >
                  <X size={16} color="#64748B" />
                </Pressable>
              </View>
              <View className="pb-10">
                {countries.map((country) => (
                  <Pressable
                    key={country.code}
                    onPress={() => {
                      setSelectedCountry(country);
                      setShowCountryPicker(false);
                    }}
                    className={`flex-row items-center px-6 py-4 active:bg-primary/5 ${
                      selectedCountry.code === country.code ? 'bg-primary/5' : ''
                    }`}
                  >
                    <Text className="text-midnight font-semibold w-16">{country.code}</Text>
                    <Text className="text-midnight flex-1">{country.name}</Text>
                    {selectedCountry.code === country.code && (
                      <View className="w-5 h-5 rounded-full bg-primary items-center justify-center">
                        <Text className="text-white text-xs font-bold">&#10003;</Text>
                      </View>
                    )}
                  </Pressable>
                ))}
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
}
