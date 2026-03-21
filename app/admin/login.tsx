import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '@/stores/authStore';
import { Shadows } from '@/constants/theme';
import { api } from '@/services/api';
import {
  ArrowLeft,
  Stethoscope,
  Pill,
  Activity,
  HeartPulse,
  ChevronDown,
  ArrowRight,
  ShieldCheck,
  Phone,
  X,
} from 'lucide-react-native';

export default function AdminLoginScreen() {
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
      
      // Call ASP.NET Core API
      await api.post('/auth/send-otp', { mobileNumber: fullPhone });
      
      setPhone(fullPhone);
      router.push('/admin/otp');
    } catch (error: any) {
      if (error.response?.status === 429) {
        setPhoneError('Too many requests. Please wait a minute before trying again.');
      } else {
        setPhoneError(error.response?.data?.message || 'Failed to send OTP. Ensure you are a registered admin.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [phone, selectedCountry, setPhone, router, validatePhone]);

  const handleITSupport = () => {
    Alert.alert(
      'IT Support',
      'Contact IT Security for login assistance.\n\nEmail: it-support@arunpriya.com\nPhone: +91 44 2815 0000\nHours: Mon-Sat, 8AM - 8PM',
      [
        { text: 'Close', style: 'cancel' },
        {
          text: 'Call Now',
          onPress: () => Linking.openURL('tel:+914428150000'),
        },
        {
          text: 'Send Email',
          onPress: () => Linking.openURL('mailto:it-support@arunpriya.com?subject=Admin Login Issue'),
        },
      ]
    );
  };

  const handleHIPAA = () => {
    Alert.alert(
      'HIPAA Compliance',
      'This application is HIPAA compliant. All patient data is encrypted in transit and at rest.\n\n- Access is logged and audited\n- Session timeout: 15 minutes\n- Two-factor authentication required\n- Data retention per hospital policy',
      [{ text: 'Understood', style: 'default' }]
    );
  };

  const handlePrivacy = () => {
    Alert.alert(
      'Privacy Policy',
      'Arun Priya Multispeciality Hospital is committed to protecting your privacy.\n\nYour login activity, session data, and administrative actions are logged for security and compliance purposes.\n\nFor full privacy policy, visit our website or contact the Data Protection Officer.',
      [
        { text: 'Close', style: 'cancel' },
        {
          text: 'View Full Policy',
          onPress: () => Linking.openURL('https://arunpriya.com/privacy'),
        },
      ]
    );
  };

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
                Welcome to Nalam{'\n'}
                <Text className="text-[#7EB3FF] font-extrabold">Hospital Admin Portal</Text>
              </Text>
              <Text className="text-white/50 text-xs font-semibold uppercase tracking-[3px] mt-2">
                Secure Access
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

            <Text className="text-midnight text-[26px] font-extrabold mb-1">
              Admin Login
            </Text>
            <Text className="text-slate-400 text-sm mb-6 font-light">
              Verify your registered mobile number using OTP
            </Text>

            {/* Phone Login Mode */}
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
            <Pressable
              onPress={() =>
                Alert.alert(
                  'Security Notice',
                  'Admin access is restricted to authorized personnel only.\n\n- All login attempts are logged\n- Unauthorized access will be reported\n- Sessions expire after 15 minutes of inactivity\n- Multi-factor authentication is enforced',
                  [
                    { text: 'OK', style: 'default' },
                    { text: 'Contact IT Security', onPress: handleITSupport },
                  ]
                )
              }
              className="flex-row gap-3 p-4 bg-white/70 rounded-2xl border border-blue-100 active:opacity-80"
            >
              <ShieldCheck size={20} color="#1A73E8" />
              <Text className="text-xs text-slate-500 flex-1 leading-relaxed">
                Admin access is restricted. This portal is monitored. For login issues, please contact{' '}
                <Text className="text-primary font-semibold">IT Security</Text>.
              </Text>
            </Pressable>

            {/* Footer */}
            <View className="flex-row justify-between items-start mt-8">
              <Text className="text-[9px] text-slate-400 uppercase tracking-wide leading-4">
                {'© 2024 Nalam Medical Systems.\nInstitutional Policy Applied.'}
              </Text>
              <View className="flex-row gap-3">
                <Pressable onPress={handleITSupport} className="active:opacity-70">
                  <Text className="text-[9px] text-primary uppercase tracking-wide font-medium">
                    IT Support
                  </Text>
                </Pressable>
                <Pressable onPress={handleHIPAA} className="active:opacity-70">
                  <Text className="text-[9px] text-primary uppercase tracking-wide font-medium">
                    HIPAA
                  </Text>
                </Pressable>
                <Pressable onPress={handlePrivacy} className="active:opacity-70">
                  <Text className="text-[9px] text-primary uppercase tracking-wide font-medium">
                    Privacy
                  </Text>
                </Pressable>
              </View>
            </View>
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
            <Pressable
              onPress={() => {}}
              className="bg-white rounded-t-3xl"
            >
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
