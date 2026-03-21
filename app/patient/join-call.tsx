import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Shadows } from '@/constants/theme';
import Svg, { Circle } from 'react-native-svg';
import {
  ArrowLeft,
  Video,
  Mic,
  Wifi,
  Camera,
  CheckCircle,
  AlertCircle,
  Clock,
  Stethoscope,
  Shield,
  Phone,
} from 'lucide-react-native';

const doctorData = {
  name: 'Dr. Rajesh Kumar',
  specialty: 'Senior Cardiologist',
  avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAIh-3iidT6V2zFlQCc723B3LsrBC6k6TmjePD4jVV618U_pOajvUapbFi06sU9btVPM0XVIP8nqpJsykecIcZf3Oy0hWLGBPw42SkfjepTlOBnXhY3rYgKQ98sI7Dn2s5V-Qlqe7Jokvrs18PH1UIcty8Qm4eBAnngW45OYkbCXsssTzL1WvbIGZvHAGi-H5z451AaeFLHW6unAHKcYohEH9H1AvF3a2a9uVdyFcplFCCHeD6apalLPBfLC0kqLkUy790QFaWUyoP6',
  rating: 4.9,
  consultations: '2,400+',
};

const appointmentInfo = {
  date: 'Oct 28, 2023',
  time: '02:30 PM',
  duration: '30 min',
  bookingId: '#APH-2023-1028',
};

interface PreCheck {
  id: string;
  label: string;
  icon: any;
  status: 'checking' | 'ready' | 'warning';
  detail: string;
}

export default function JoinCallScreen() {
  const router = useRouter();
  const [checks, setChecks] = useState<PreCheck[]>([
    { id: 'camera', label: 'Camera', icon: Camera, status: 'checking', detail: 'Checking...' },
    { id: 'mic', label: 'Microphone', icon: Mic, status: 'checking', detail: 'Checking...' },
    { id: 'network', label: 'Network', icon: Wifi, status: 'checking', detail: 'Checking...' },
  ]);
  const [allReady, setAllReady] = useState(false);
  const [showPulse, setShowPulse] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => setShowPulse((p) => !p), 1200);
    return () => clearInterval(interval);
  }, []);

  // Simulate pre-call checks
  useEffect(() => {
    const timers = [
      setTimeout(() => {
        setChecks((prev) =>
          prev.map((c) => c.id === 'camera' ? { ...c, status: 'ready', detail: 'Working' } : c)
        );
      }, 800),
      setTimeout(() => {
        setChecks((prev) =>
          prev.map((c) => c.id === 'mic' ? { ...c, status: 'ready', detail: 'Working' } : c)
        );
      }, 1400),
      setTimeout(() => {
        setChecks((prev) =>
          prev.map((c) => c.id === 'network' ? { ...c, status: 'ready', detail: 'Strong (4G)' } : c)
        );
      }, 2000),
    ];

    const readyTimer = setTimeout(() => setAllReady(true), 2200);

    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(readyTimer);
    };
  }, []);

  const statusIcon = (status: PreCheck['status']) => {
    if (status === 'ready') return <CheckCircle size={16} color="#22C55E" />;
    if (status === 'warning') return <AlertCircle size={16} color="#F59E0B" />;
    return (
      <View className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-[#1A73E8] animate-spin" />
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top', 'bottom']}>
      {/* Header */}
      <View className="flex-row items-center px-5 py-4">
        <Pressable onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
          <ArrowLeft size={22} color="#64748B" />
        </Pressable>
        <Text className="text-lg font-bold text-[#0B1B3D] flex-1 text-center pr-10">
          Join Consultation
        </Text>
      </View>

      <View className="flex-1 px-6 justify-between">
        <View>
          {/* Doctor Card */}
          <View
            className="bg-white rounded-[24px] p-6 border border-slate-100 mb-5"
            style={Shadows.card}
          >
            <View className="flex-row items-center gap-4">
              <View className="relative">
                <View className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-[#1A73E8]/20">
                  <Image
                    source={{ uri: doctorData.avatar }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                </View>
                <View className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white items-center justify-center ${showPulse ? 'bg-green-500' : 'bg-green-400'}`}>
                  <View className="w-2 h-2 rounded-full bg-white" />
                </View>
              </View>
              <View className="flex-1">
                <Text className="text-lg font-bold text-[#0B1B3D]">{doctorData.name}</Text>
                <Text className="text-sm text-[#1A73E8] font-medium">{doctorData.specialty}</Text>
                <View className="flex-row items-center gap-3 mt-2">
                  <Text className="text-xs text-slate-500">
                    {'\u2B50'} {doctorData.rating}
                  </Text>
                  <Text className="text-xs text-slate-400">|</Text>
                  <Text className="text-xs text-slate-500">{doctorData.consultations} consults</Text>
                </View>
              </View>
            </View>

            {/* Doctor is waiting banner */}
            <View className="mt-4 bg-green-50 border border-green-100 rounded-xl p-3 flex-row items-center gap-2">
              <View className={`w-2.5 h-2.5 rounded-full ${showPulse ? 'bg-green-500' : 'bg-green-300'}`} />
              <Text className="text-sm text-green-700 font-medium">Doctor is ready and waiting for you</Text>
            </View>
          </View>

          {/* Appointment Details */}
          <View
            className="bg-white rounded-[24px] p-5 border border-slate-100 mb-5"
            style={Shadows.card}
          >
            <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
              Appointment Details
            </Text>
            <View className="flex-row gap-3">
              <View className="flex-1 bg-slate-50 rounded-xl p-3 items-center gap-1">
                <Clock size={16} color="#1A73E8" />
                <Text className="text-xs font-bold text-[#0B1B3D]">{appointmentInfo.time}</Text>
                <Text className="text-[10px] text-slate-400">{appointmentInfo.date}</Text>
              </View>
              <View className="flex-1 bg-slate-50 rounded-xl p-3 items-center gap-1">
                <Video size={16} color="#1A73E8" />
                <Text className="text-xs font-bold text-[#0B1B3D]">Video Call</Text>
                <Text className="text-[10px] text-slate-400">{appointmentInfo.duration}</Text>
              </View>
              <View className="flex-1 bg-slate-50 rounded-xl p-3 items-center gap-1">
                <Stethoscope size={16} color="#1A73E8" />
                <Text className="text-xs font-bold text-[#0B1B3D]">{appointmentInfo.bookingId}</Text>
                <Text className="text-[10px] text-slate-400">Booking ID</Text>
              </View>
            </View>
          </View>

          {/* Pre-Call System Check */}
          <View
            className="bg-white rounded-[24px] p-5 border border-slate-100 mb-5"
            style={Shadows.card}
          >
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Pre-Call Check
              </Text>
              {allReady && (
                <View className="bg-green-50 px-3 py-1 rounded-full border border-green-100">
                  <Text className="text-[10px] font-bold text-green-600">ALL READY</Text>
                </View>
              )}
            </View>
            <View className="gap-3">
              {checks.map((check) => (
                <View key={check.id} className="flex-row items-center gap-3">
                  <View className={`w-10 h-10 rounded-xl items-center justify-center ${
                    check.status === 'ready' ? 'bg-green-50' : check.status === 'warning' ? 'bg-amber-50' : 'bg-slate-50'
                  }`}>
                    <check.icon
                      size={18}
                      color={check.status === 'ready' ? '#22C55E' : check.status === 'warning' ? '#F59E0B' : '#94A3B8'}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-[#0B1B3D]">{check.label}</Text>
                    <Text className={`text-xs font-medium ${
                      check.status === 'ready' ? 'text-green-600' : check.status === 'warning' ? 'text-amber-600' : 'text-slate-400'
                    }`}>
                      {check.detail}
                    </Text>
                  </View>
                  {statusIcon(check.status)}
                </View>
              ))}
            </View>
          </View>

          {/* Privacy Notice */}
          <View className="flex-row items-start gap-2 px-2">
            <Shield size={14} color="#94A3B8" />
            <Text className="text-xs text-slate-400 flex-1">
              This consultation is end-to-end encrypted. By joining, you agree to our Telemedicine Terms and Privacy Policy.
            </Text>
          </View>
        </View>

        {/* Bottom Actions */}
        <View className="w-full gap-3 pb-4 pt-4">
          <Pressable
            onPress={() => router.replace('/patient/video-consultation')}
            className={`w-full h-14 rounded-full items-center justify-center flex-row gap-3 ${
              allReady ? 'bg-[#22C55E]' : 'bg-slate-200'
            }`}
            style={allReady ? {
              shadowColor: '#22C55E',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 12,
              elevation: 8,
            } : undefined}
            disabled={!allReady}
          >
            <Video size={20} color={allReady ? '#FFFFFF' : '#94A3B8'} />
            <Text className={`font-bold text-base ${allReady ? 'text-white' : 'text-slate-400'}`}>
              Join Now
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.back()}
            className="w-full h-14 rounded-full items-center justify-center border-2 border-slate-200"
          >
            <Text className="text-slate-500 font-bold text-base">Cancel</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
