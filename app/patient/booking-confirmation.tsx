import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Shadows, Colors } from '@/constants/theme';
import {
  CheckCircle, Calendar, Clock, Video, Home, CalendarCheck,
  Building2, Share2, Bell,
} from 'lucide-react-native';

export default function BookingConfirmationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    doctorName?: string;
    specialty?: string;
    consultationType?: string;
    date?: string;
    time?: string;
    total?: string;
  }>();

  const doctorName = params.doctorName ?? 'Dr. Aruna Reddy';
  const specialty = params.specialty ?? 'Cardiologist';
  const consultationType = params.consultationType ?? 'video';
  const dateStr = params.date ?? 'Mar 21';
  const timeStr = params.time ?? '10:00 AM';
  const total = params.total ?? '889.00';

  const isVideo = consultationType === 'video';
  const ConsultIcon = isVideo ? Video : Building2;
  const consultLabel = isVideo ? 'Video Consultation' : 'In-Person Visit';

  // Entrance animation
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [scaleAnim, fadeAnim, slideAnim]);

  const details = [
    { icon: ConsultIcon, label: 'Consultation', value: consultLabel },
    { icon: Calendar, label: 'Date', value: dateStr },
    { icon: Clock, label: 'Time', value: `${timeStr} (30 min)` },
  ];

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC] items-center justify-center px-6">
      {/* Decorative Rings */}
      <View className="absolute w-[200px] h-[200px] rounded-full border-2 border-green-100 opacity-60" />
      <View className="absolute w-[260px] h-[260px] rounded-full border border-green-50 opacity-40" />
      <View className="absolute w-[320px] h-[320px] rounded-full border border-green-50/50 opacity-20" />

      {/* Success Icon — animated */}
      <Animated.View
        style={{ transform: [{ scale: scaleAnim }] }}
        className="w-24 h-24 rounded-full bg-green-100 items-center justify-center mb-6"
      >
        <CheckCircle size={56} color="#22C55E" />
      </Animated.View>

      {/* Title */}
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <Text className="text-[28px] font-extrabold text-midnight text-center tracking-tight">
          Booking Confirmed!
        </Text>
        <Text className="text-slate-500 text-center mt-2 text-sm leading-5">
          Your appointment with {doctorName} has been confirmed.
        </Text>
      </Animated.View>

      {/* Booking Details Card */}
      <Animated.View
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], width: '100%' }}
      >
        <View
          className="w-full bg-white rounded-[24px] p-6 mt-6 border border-slate-50"
          style={Shadows.card}
        >
          {/* Booking ID + Amount */}
          <View className="flex-row items-center justify-between mb-4 pb-4 border-b border-slate-100">
            <View>
              <Text className="text-primary text-[10px] font-bold uppercase tracking-widest">
                Booking ID
              </Text>
              <Text className="text-midnight font-extrabold text-lg mt-0.5">#NLM-2026-0321</Text>
            </View>
            <View className="items-end">
              <Text className="text-[10px] text-slate-400 font-medium uppercase">Paid</Text>
              <Text className="text-emerald-600 font-extrabold text-lg">{'\u20B9'}{total}</Text>
            </View>
          </View>

          {/* Doctor */}
          <View className="flex-row items-center gap-3 mb-4 pb-4 border-b border-slate-100">
            <View className="w-12 h-12 rounded-xl bg-primary/10 items-center justify-center">
              <Text className="font-bold text-primary text-sm">
                {doctorName.split(' ').map(w => w[0]).slice(0, 2).join('')}
              </Text>
            </View>
            <View>
              <Text className="font-bold text-[15px] text-midnight">{doctorName}</Text>
              <Text className="text-primary text-xs font-semibold">{specialty}</Text>
            </View>
          </View>

          {/* Details */}
          <View className="gap-3.5">
            {details.map((d, idx) => {
              const Icon = d.icon;
              return (
                <View key={idx} className="flex-row items-center gap-3">
                  <View className="w-9 h-9 rounded-xl bg-primary/10 items-center justify-center">
                    <Icon size={16} color={Colors.primary} />
                  </View>
                  <View>
                    <Text className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                      {d.label}
                    </Text>
                    <Text className="text-midnight font-semibold text-sm mt-0.5">{d.value}</Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Reminder Note */}
          <View className="flex-row items-center gap-2.5 mt-4 pt-4 border-t border-slate-100 bg-amber-50 -mx-6 -mb-6 px-6 py-3.5 rounded-b-[24px]">
            <Bell size={14} color="#D97706" />
            <Text className="text-amber-700 text-xs font-medium flex-1">
              You'll receive a reminder 30 minutes before your appointment.
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Action Buttons */}
      <Animated.View
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], width: '100%' }}
        className="gap-3 mt-6"
      >
        <Pressable
          onPress={() => router.push('/patient/(tabs)/bookings')}
          className="w-full bg-primary py-4 rounded-full items-center flex-row justify-center gap-2"
          style={Shadows.focus}
        >
          <CalendarCheck size={18} color="#FFFFFF" />
          <Text className="text-white font-bold text-base">View My Bookings</Text>
        </Pressable>

        <View className="flex-row gap-3">
          <Pressable
            onPress={() => router.replace('/patient/(tabs)')}
            className="flex-1 bg-white border-2 border-primary/20 py-3.5 rounded-full items-center flex-row justify-center gap-2"
            style={Shadows.card}
          >
            <Home size={16} color={Colors.primary} />
            <Text className="text-primary font-bold text-sm">Home</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              // Share booking details
            }}
            className="flex-1 bg-white border-2 border-primary/20 py-3.5 rounded-full items-center flex-row justify-center gap-2"
            style={Shadows.card}
          >
            <Share2 size={16} color={Colors.primary} />
            <Text className="text-primary font-bold text-sm">Share</Text>
          </Pressable>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}
