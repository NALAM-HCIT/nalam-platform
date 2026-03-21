import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Shadows, Colors } from '@/constants/theme';
import {
  ArrowLeft, Video, Building2, ChevronRight, Star, Briefcase,
  Sun, CloudSun, Moon,
} from 'lucide-react-native';

/* ───── Data ───── */

const CONSULT_TYPES = [
  {
    id: 'video',
    icon: Video,
    label: 'Video Consultation',
    desc: 'Consult from home via video call',
    color: '#8B5CF6',
  },
  {
    id: 'in-person',
    icon: Building2,
    label: 'In-Person Visit',
    desc: 'Visit the clinic for consultation',
    color: '#1A73E8',
  },
];

const DATES = [
  { day: 'Today', date: '21', month: 'Mar', available: true, slotsLeft: 3 },
  { day: 'Sat', date: '22', month: 'Mar', available: true, slotsLeft: 6 },
  { day: 'Sun', date: '23', month: 'Mar', available: false, slotsLeft: 0 },
  { day: 'Mon', date: '24', month: 'Mar', available: true, slotsLeft: 8 },
  { day: 'Tue', date: '25', month: 'Mar', available: true, slotsLeft: 5 },
  { day: 'Wed', date: '26', month: 'Mar', available: true, slotsLeft: 4 },
  { day: 'Thu', date: '27', month: 'Mar', available: true, slotsLeft: 7 },
];

interface SlotGroup {
  label: string;
  icon: React.ElementType;
  color: string;
  slots: string[];
}

const SLOT_GROUPS: SlotGroup[] = [
  {
    label: 'Morning',
    icon: Sun,
    color: '#F59E0B',
    slots: ['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM'],
  },
  {
    label: 'Afternoon',
    icon: CloudSun,
    color: '#F97316',
    slots: ['12:00 PM', '12:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM'],
  },
  {
    label: 'Evening',
    icon: Moon,
    color: '#8B5CF6',
    slots: ['05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM', '07:00 PM'],
  },
];

/* ───── Sub-components ───── */

const DateChip = React.memo(function DateChip({
  item,
  isSelected,
  onPress,
}: {
  item: typeof DATES[0];
  isSelected: boolean;
  onPress: () => void;
}) {
  const isDisabled = !item.available;
  return (
    <Pressable
      disabled={isDisabled}
      onPress={onPress}
      className={`w-[68px] py-3 rounded-2xl items-center ${
        isDisabled
          ? 'bg-slate-100 opacity-40'
          : isSelected
          ? 'bg-primary'
          : 'bg-white border border-slate-100'
      }`}
      style={isSelected ? Shadows.focus : isDisabled ? undefined : Shadows.card}
    >
      <Text
        className={`text-[10px] font-bold uppercase tracking-wide ${
          isSelected ? 'text-white/70' : 'text-slate-400'
        }`}
      >
        {item.day}
      </Text>
      <Text
        className={`text-xl font-extrabold mt-0.5 ${
          isSelected ? 'text-white' : 'text-midnight'
        }`}
      >
        {item.date}
      </Text>
      <Text
        className={`text-[10px] font-medium ${
          isSelected ? 'text-white/70' : 'text-slate-400'
        }`}
      >
        {item.month}
      </Text>
      {item.available && !isSelected && (
        <Text className="text-[8px] text-emerald-600 font-bold mt-1">{item.slotsLeft} slots</Text>
      )}
    </Pressable>
  );
});

const TimeSlot = React.memo(function TimeSlot({
  slot,
  isSelected,
  onPress,
}: {
  slot: string;
  isSelected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`px-4 py-2.5 rounded-xl ${
        isSelected ? 'bg-primary' : 'bg-white border border-slate-100'
      }`}
      style={isSelected ? Shadows.focus : Shadows.card}
    >
      <Text
        className={`text-sm font-semibold ${
          isSelected ? 'text-white' : 'text-midnight'
        }`}
      >
        {slot}
      </Text>
    </Pressable>
  );
});

/* ───── Main Screen ───── */

export default function SlotSelectionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    doctorId?: string;
    doctorName?: string;
    specialty?: string;
    fee?: string;
    initials?: string;
    exp?: string;
    rating?: string;
    reviews?: string;
  }>();

  const [selectedType, setSelectedType] = useState('video');
  const [selectedDate, setSelectedDate] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const doctorName = params.doctorName ?? 'Dr. Aruna Reddy';
  const specialty = params.specialty ?? 'Cardiologist';
  const fee = params.fee ?? '800';
  const initials = params.initials ?? 'AR';
  const exp = params.exp ?? '12';
  const rating = params.rating ?? '4.9';
  const reviews = params.reviews ?? '312';

  const selectedDateObj = DATES[selectedDate];

  const handleContinue = useCallback(() => {
    if (!selectedSlot) return;
    router.push({
      pathname: '/patient/booking-review',
      params: {
        doctorName,
        specialty,
        fee,
        consultationType: selectedType,
        date: `${selectedDateObj.month} ${selectedDateObj.date}`,
        time: selectedSlot,
        initials,
        exp,
        rating,
        reviews,
      },
    });
  }, [selectedSlot, router, doctorName, specialty, fee, selectedType, selectedDateObj, initials, exp, rating, reviews]);

  const progressPercent = useMemo(() => {
    if (selectedSlot) return 66;
    return 33;
  }, [selectedSlot]);

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-4 pt-2 pb-2">
        <Pressable onPress={() => router.back()} className="w-12 h-12 items-start justify-center">
          <ArrowLeft size={22} color="#0B1B3D" />
        </Pressable>
        <Text className="flex-1 text-lg font-bold text-midnight text-center tracking-tight pr-12">
          Select Date & Time
        </Text>
      </View>

      {/* Progress */}
      <View className="px-5 pb-4">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-xs text-slate-400 font-medium">Step 1 of 3</Text>
          <Text className="text-xs text-primary font-bold">{progressPercent}%</Text>
        </View>
        <View className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <View className="h-full bg-primary rounded-full" style={{ width: `${progressPercent}%` }} />
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Doctor Mini Card */}
        <View className="mx-5 mb-5 bg-white rounded-2xl p-4 flex-row items-center gap-3" style={Shadows.card}>
          <View className="w-14 h-14 rounded-xl bg-primary/10 items-center justify-center">
            <Text className="text-lg font-bold text-primary">{initials}</Text>
          </View>
          <View className="flex-1">
            <Text className="font-bold text-[15px] text-midnight">{doctorName}</Text>
            <Text className="text-primary text-xs font-semibold">{specialty}</Text>
            <View className="flex-row items-center gap-2 mt-1">
              <View className="flex-row items-center gap-1">
                <Briefcase size={10} color="#94A3B8" />
                <Text className="text-[10px] text-slate-400 font-medium">{exp} yrs</Text>
              </View>
              <View className="w-1 h-1 rounded-full bg-slate-300" />
              <View className="flex-row items-center gap-1">
                <Star size={10} color="#EAB308" fill="#EAB308" />
                <Text className="text-[10px] text-midnight font-bold">{rating}</Text>
                <Text className="text-[9px] text-slate-400">({reviews})</Text>
              </View>
            </View>
          </View>
          <View className="items-end">
            <Text className="text-[9px] text-slate-400 font-medium uppercase">Fee</Text>
            <Text className="text-lg font-extrabold text-midnight">{'\u20B9'}{fee}</Text>
          </View>
        </View>

        {/* Consultation Type */}
        <View className="px-5 mb-5">
          <Text className="text-base font-bold text-midnight mb-3">Consultation Type</Text>
          <View className="flex-row gap-3">
            {CONSULT_TYPES.map((ct) => {
              const isActive = selectedType === ct.id;
              const Icon = ct.icon;
              return (
                <Pressable
                  key={ct.id}
                  onPress={() => setSelectedType(ct.id)}
                  className={`flex-1 items-center p-4 rounded-2xl border-2 ${
                    isActive ? 'border-primary bg-primary/5' : 'border-slate-100 bg-white'
                  }`}
                  style={isActive ? undefined : Shadows.card}
                >
                  <View
                    className={`w-12 h-12 rounded-xl items-center justify-center mb-2 ${
                      isActive ? 'bg-primary' : 'bg-slate-100'
                    }`}
                  >
                    <Icon size={22} color={isActive ? '#FFFFFF' : ct.color} />
                  </View>
                  <Text className={`text-xs font-bold text-center ${isActive ? 'text-midnight' : 'text-slate-500'}`}>
                    {ct.label}
                  </Text>
                  {/* Radio */}
                  <View
                    className={`w-5 h-5 rounded-full border-2 items-center justify-center mt-2.5 ${
                      isActive ? 'border-primary' : 'border-slate-300'
                    }`}
                  >
                    {isActive && <View className="w-3 h-3 rounded-full bg-primary" />}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Date Selection */}
        <View className="px-5 mb-5">
          <Text className="text-base font-bold text-midnight mb-3">Select Date</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10 }}
          >
            {DATES.map((d, i) => (
              <DateChip
                key={i}
                item={d}
                isSelected={selectedDate === i}
                onPress={() => { setSelectedDate(i); setSelectedSlot(null); }}
              />
            ))}
          </ScrollView>
        </View>

        {/* Time Slots by Period */}
        {SLOT_GROUPS.map((group) => {
          const Icon = group.icon;
          return (
            <View key={group.label} className="px-5 mb-5">
              <View className="flex-row items-center gap-2 mb-3">
                <Icon size={16} color={group.color} />
                <Text className="text-sm font-bold text-midnight">{group.label}</Text>
                <Text className="text-[10px] text-slate-400 font-medium">({group.slots.length} slots)</Text>
              </View>
              <View className="flex-row flex-wrap gap-2.5">
                {group.slots.map((slot) => (
                  <TimeSlot
                    key={slot}
                    slot={slot}
                    isSelected={selectedSlot === slot}
                    onPress={() => setSelectedSlot(slot)}
                  />
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Bottom CTA */}
      <View className="absolute bottom-0 left-0 right-0 p-5 bg-white border-t border-slate-100" style={Shadows.presence}>
        <SafeAreaView edges={['bottom']}>
          {selectedSlot && (
            <View className="flex-row items-center justify-between mb-3 px-1">
              <Text className="text-slate-400 text-xs font-medium">Selected</Text>
              <Text className="text-midnight text-sm font-bold">
                {selectedDateObj.month} {selectedDateObj.date} • {selectedSlot}
              </Text>
            </View>
          )}
          <Pressable
            onPress={handleContinue}
            className={`w-full py-4 rounded-full items-center flex-row justify-center gap-2 ${
              selectedSlot ? 'bg-primary' : 'bg-slate-200'
            }`}
            style={selectedSlot ? Shadows.focus : undefined}
            disabled={!selectedSlot}
          >
            <Text
              className={`font-bold text-base ${
                selectedSlot ? 'text-white' : 'text-slate-400'
              }`}
            >
              Continue to Review
            </Text>
            <ChevronRight size={18} color={selectedSlot ? '#FFFFFF' : '#94A3B8'} />
          </Pressable>
        </SafeAreaView>
      </View>
    </SafeAreaView>
  );
}
