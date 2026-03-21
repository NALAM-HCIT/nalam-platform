import React, { useState, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Shadows } from '@/constants/theme';
import Svg, { Circle } from 'react-native-svg';
import {
  ArrowLeft,
  CheckCircle,
  MapPin,
  Clock,
  Hash,
  Users,
  Navigation,
  Home,
  Bell,
} from 'lucide-react-native';

const doctor = {
  name: 'Dr. Aruna Devi',
  specialty: 'Cardiologist',
  department: 'Cardiology',
  ward: 'Ward 4B, Room 12',
};

const queueInfo = {
  tokenNumber: 'T-024',
  position: 3,
  totalInQueue: 8,
  estimatedWait: 15,
};

const directions = [
  { step: 1, text: 'Enter through Main Lobby' },
  { step: 2, text: 'Take elevator to Floor 4' },
  { step: 3, text: 'Turn right towards Wing B' },
  { step: 4, text: 'Check-in at Ward 4B reception' },
];

function WaitRing({ minutes, size = 100, strokeWidth = 6 }: { minutes: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const maxMinutes = 30;
  const progress = Math.min(minutes / maxMinutes, 1);
  const offset = circumference * (1 - progress);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E2E8F0"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#1A73E8"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text className="text-3xl font-extrabold text-[#0B1B3D]">{minutes}</Text>
        <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">min wait</Text>
      </View>
    </View>
  );
}

export default function ArrivalConfirmedScreen() {
  const router = useRouter();
  const [showPulse, setShowPulse] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => setShowPulse((p) => !p), 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top', 'bottom']}>
      {/* Header */}
      <View className="flex-row items-center px-5 py-4">
        <Pressable onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
          <ArrowLeft size={22} color="#64748B" />
        </Pressable>
        <Text className="text-lg font-bold text-[#0B1B3D] flex-1 text-center pr-10">
          Arrival Confirmed
        </Text>
      </View>

      <View className="flex-1 px-6 justify-between">
        <View>
          {/* Success Banner */}
          <View
            className="bg-green-50 border border-green-100 rounded-2xl p-5 flex-row items-center gap-4 mb-6"
            style={Shadows.card}
          >
            <View className="w-14 h-14 rounded-full bg-green-100 items-center justify-center">
              <CheckCircle size={32} color="#22C55E" fill="#22C55E" />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold text-[#0B1B3D]">You're checked in!</Text>
              <Text className="text-green-700 text-sm font-medium">
                The hospital has been notified of your arrival.
              </Text>
            </View>
          </View>

          {/* Token & Wait Time */}
          <View
            className="bg-white rounded-[24px] p-6 border border-slate-100 mb-5"
            style={Shadows.card}
          >
            <View className="flex-row items-center justify-between">
              {/* Token Number */}
              <View className="items-center flex-1">
                <View className="bg-[#1A73E8]/10 px-5 py-3 rounded-2xl mb-2">
                  <Text className="text-2xl font-extrabold text-[#1A73E8] tracking-wider">
                    {queueInfo.tokenNumber}
                  </Text>
                </View>
                <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Your Token
                </Text>
              </View>

              {/* Divider */}
              <View className="w-px h-20 bg-slate-100 mx-4" />

              {/* Wait Ring */}
              <View className="items-center flex-1">
                <WaitRing minutes={queueInfo.estimatedWait} />
              </View>
            </View>

            {/* Queue Position */}
            <View className="mt-5 pt-5 border-t border-slate-100 flex-row items-center justify-center gap-6">
              <View className="flex-row items-center gap-2">
                <Users size={16} color="#94A3B8" />
                <Text className="text-slate-500 text-sm">
                  <Text className="font-bold text-[#0B1B3D]">{queueInfo.position}</Text> of {queueInfo.totalInQueue} in queue
                </Text>
              </View>
              <View
                className={`w-2 h-2 rounded-full ${showPulse ? 'bg-green-500' : 'bg-green-300'}`}
              />
              <Text className="text-green-600 text-xs font-bold">LIVE</Text>
            </View>
          </View>

          {/* Doctor & Location */}
          <View
            className="bg-white rounded-[24px] p-5 border border-slate-100 mb-5"
            style={Shadows.card}
          >
            <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
              Your Appointment
            </Text>
            <View className="gap-4">
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-xl bg-[#1A73E8]/10 items-center justify-center">
                  <Hash size={18} color="#1A73E8" />
                </View>
                <View>
                  <Text className="text-sm font-bold text-[#0B1B3D]">{doctor.name}</Text>
                  <Text className="text-xs text-[#1A73E8] font-medium">{doctor.specialty}</Text>
                </View>
              </View>
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-xl bg-[#1A73E8]/10 items-center justify-center">
                  <MapPin size={18} color="#1A73E8" />
                </View>
                <View>
                  <Text className="text-sm font-bold text-[#0B1B3D]">{doctor.department}</Text>
                  <Text className="text-xs text-slate-500 font-medium">{doctor.ward}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Navigation Directions */}
          <View
            className="bg-white rounded-[24px] p-5 border border-slate-100"
            style={Shadows.card}
          >
            <View className="flex-row items-center gap-2 mb-4">
              <Navigation size={16} color="#1A73E8" />
              <Text className="text-sm font-bold text-[#0B1B3D]">How to reach</Text>
            </View>
            <View className="gap-0">
              {directions.map((dir, index) => (
                <View key={dir.step} className="flex-row gap-3">
                  {/* Step indicator */}
                  <View className="items-center">
                    <View className="w-7 h-7 rounded-full bg-[#1A73E8]/10 items-center justify-center">
                      <Text className="text-xs font-bold text-[#1A73E8]">{dir.step}</Text>
                    </View>
                    {index < directions.length - 1 && (
                      <View className="w-0.5 flex-1 min-h-[16px] bg-[#1A73E8]/10 my-1" />
                    )}
                  </View>
                  <View className={`pb-4 flex-1 ${index === directions.length - 1 ? 'pb-0' : ''}`}>
                    <Text className="text-sm text-slate-600 font-medium">{dir.text}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Bottom Actions */}
        <View className="w-full gap-3 pb-4 pt-4">
          <Pressable
            className="w-full bg-[#1A73E8]/10 h-14 rounded-full items-center justify-center flex-row gap-2"
          >
            <Bell size={18} color="#1A73E8" />
            <Text className="text-[#1A73E8] font-bold text-base">Notify Me When My Turn</Text>
          </Pressable>

          <Pressable
            onPress={() => router.replace('/patient/(tabs)')}
            className="w-full bg-[#1A73E8] h-14 rounded-full items-center justify-center"
            style={Shadows.focus}
          >
            <Text className="text-white font-bold text-base">Go to Dashboard</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
