import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Shadows, Colors } from '@/constants/theme';
import {
  ArrowLeft, MapPin, User, Video, UserSearch, ChevronRight,
  Building2, Star, Briefcase, Sun, CloudSun, Moon, AlertCircle,
} from 'lucide-react-native';

/* ───── Data ───── */

const DOCTOR = {
  name: 'Dr. Aruna Devi',
  initials: 'AD',
  specialty: 'Cardiologist',
  location: 'Nalam Hospital, Wing A',
  rating: 4.9,
  exp: 12,
};

const DAY_HEADERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const PREV_MONTH_DAYS = [28, 29, 30];
const CALENDAR_DAYS = Array.from({ length: 11 }, (_, i) => i + 1);
const UNAVAILABLE_DAYS = new Set([7, 8]); // Sunday, holidays

interface SlotGroup {
  label: string;
  icon: React.ElementType;
  color: string;
  slots: string[];
}

const SLOT_GROUPS: SlotGroup[] = [
  { label: 'Morning', icon: Sun, color: '#F59E0B', slots: ['09:00 AM', '09:30 AM', '10:30 AM'] },
  { label: 'Afternoon', icon: CloudSun, color: '#F97316', slots: ['02:30 PM', '03:00 PM', '04:00 PM'] },
  { label: 'Evening', icon: Moon, color: '#8B5CF6', slots: ['05:30 PM', '06:00 PM'] },
];

/* ───── Sub-components ───── */

const TimeSlotChip = React.memo(function TimeSlotChip({
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
      className={`px-4 py-2.5 rounded-xl border ${
        isSelected
          ? 'bg-primary/10 border-primary'
          : 'border-slate-200 bg-white'
      }`}
      style={!isSelected ? Shadows.card : undefined}
    >
      <Text
        className={`text-sm ${
          isSelected ? 'font-bold text-primary' : 'font-medium text-midnight'
        }`}
      >
        {slot}
      </Text>
    </Pressable>
  );
});

/* ───── Main Screen ───── */

export default function EditBookingScreen() {
  const router = useRouter();
  const { type } = useLocalSearchParams<{ type?: string }>();
  const [selectedDay, setSelectedDay] = useState(5);
  const [selectedTime, setSelectedTime] = useState('11:00 AM');
  const [consultationType, setConsultationType] = useState<'in-person' | 'online'>(
    type === 'online' ? 'online' : 'in-person',
  );

  const hasChanges = useMemo(() => {
    // Compare against original booking values
    return selectedDay !== 5 || selectedTime !== '11:00 AM' || consultationType !== (type === 'online' ? 'online' : 'in-person');
  }, [selectedDay, selectedTime, consultationType, type]);

  const handleConfirm = useCallback(() => {
    if (!hasChanges) {
      Alert.alert('No Changes', 'You haven\'t made any changes to your booking.');
      return;
    }
    router.push('/patient/edit-success');
  }, [hasChanges, router]);

  const handleChangeDoctor = useCallback(() => {
    Alert.alert(
      'Change Doctor',
      'This will take you to the doctor listing to select a new consultant.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', onPress: () => router.push('/patient/consultation-type') },
      ],
    );
  }, [router]);

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top']}>
      {/* Header */}
      <View className="px-4 pt-2 pb-2 flex-row items-center">
        <Pressable onPress={() => router.back()} className="w-10 h-10 items-center justify-center rounded-full">
          <ArrowLeft size={22} color="#0B1B3D" />
        </Pressable>
        <Text className="text-lg font-bold text-midnight flex-1 text-center pr-10 tracking-tight">
          Edit Booking
        </Text>
      </View>

      {/* Progress */}
      <View className="px-5 pb-4">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-xs text-slate-400 font-medium">Modification Progress</Text>
          <Text className="text-xs text-primary font-bold">Step 2 of 3</Text>
        </View>
        <View className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <View className="h-full bg-primary rounded-full w-2/3" />
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Current Doctor */}
        <View className="mb-5">
          <Text className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Current Doctor
          </Text>
          <View className="bg-white rounded-[20px] p-4 flex-row items-center gap-3" style={Shadows.card}>
            <View className="w-14 h-14 rounded-xl bg-primary/10 items-center justify-center">
              <Text className="text-lg font-bold text-primary">{DOCTOR.initials}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-[15px] font-bold text-midnight">{DOCTOR.name}</Text>
              <Text className="text-primary text-xs font-semibold">{DOCTOR.specialty}</Text>
              <View className="flex-row items-center gap-2.5 mt-1">
                <View className="flex-row items-center gap-1">
                  <MapPin size={10} color="#94A3B8" />
                  <Text className="text-[10px] text-slate-400 font-medium">{DOCTOR.location}</Text>
                </View>
                <View className="flex-row items-center gap-1">
                  <Star size={10} color="#EAB308" fill="#EAB308" />
                  <Text className="text-[10px] text-midnight font-bold">{DOCTOR.rating}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Consultation Type Toggle */}
        <View className="mb-5">
          <Text className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Consultation Type
          </Text>
          <View className="flex-row bg-slate-100 p-1.5 rounded-full gap-2">
            {[
              { key: 'in-person' as const, label: 'In-Person', icon: User },
              { key: 'online' as const, label: 'Online', icon: Video },
            ].map((ct) => {
              const Icon = ct.icon;
              const isActive = consultationType === ct.key;
              return (
                <Pressable
                  key={ct.key}
                  onPress={() => setConsultationType(ct.key)}
                  className={`flex-1 flex-row items-center justify-center gap-2 py-2.5 rounded-full ${
                    isActive ? 'bg-white' : ''
                  }`}
                  style={isActive ? Shadows.card : undefined}
                >
                  <Icon size={16} color={isActive ? Colors.primary : '#64748B'} />
                  <Text className={`font-semibold text-sm ${isActive ? 'text-primary' : 'text-slate-500'}`}>
                    {ct.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Calendar */}
        <View className="mb-5">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Reschedule Date
            </Text>
            <Text className="text-xs font-bold text-primary">March 2026</Text>
          </View>
          <View className="bg-white rounded-[20px] p-4" style={Shadows.card}>
            {/* Day headers */}
            <View className="flex-row mb-2">
              {DAY_HEADERS.map((day, i) => (
                <View key={i} className="flex-1 items-center">
                  <Text className="text-[10px] font-bold text-slate-400 uppercase">{day}</Text>
                </View>
              ))}
            </View>

            {/* Calendar grid */}
            <View className="flex-row flex-wrap">
              {PREV_MONTH_DAYS.map((d) => (
                <View key={`prev-${d}`} className="w-[14.28%] h-10 items-center justify-center">
                  <Text className="text-sm text-slate-200">{d}</Text>
                </View>
              ))}
              {CALENDAR_DAYS.map((d) => {
                const isSelected = d === selectedDay;
                const isUnavailable = UNAVAILABLE_DAYS.has(d);
                return (
                  <Pressable
                    key={d}
                    disabled={isUnavailable}
                    onPress={() => setSelectedDay(d)}
                    className={`w-[14.28%] h-10 items-center justify-center rounded-full ${
                      isUnavailable ? 'opacity-30' : isSelected ? 'bg-primary' : ''
                    }`}
                    style={isSelected ? Shadows.focus : undefined}
                  >
                    <Text
                      className={`text-sm ${
                        isUnavailable
                          ? 'text-slate-300 line-through'
                          : isSelected
                          ? 'font-bold text-white'
                          : 'font-medium text-midnight'
                      }`}
                    >
                      {d}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {/* Time Slots */}
        {SLOT_GROUPS.map((group) => {
          const Icon = group.icon;
          return (
            <View key={group.label} className="mb-4">
              <View className="flex-row items-center gap-2 mb-2.5">
                <Icon size={14} color={group.color} />
                <Text className="text-xs font-bold text-midnight">{group.label}</Text>
              </View>
              <View className="flex-row flex-wrap gap-2">
                {group.slots.map((slot) => (
                  <TimeSlotChip
                    key={slot}
                    slot={slot}
                    isSelected={slot === selectedTime}
                    onPress={() => setSelectedTime(slot)}
                  />
                ))}
              </View>
            </View>
          );
        })}

        {/* Change Doctor */}
        <Pressable
          onPress={handleChangeDoctor}
          className="flex-row items-center justify-between p-4 rounded-2xl bg-primary/5 border border-primary/20 mt-2 active:opacity-80"
        >
          <View className="flex-row items-center gap-3">
            <UserSearch size={18} color={Colors.primary} />
            <Text className="text-primary font-semibold text-sm">Change Consultant Doctor</Text>
          </View>
          <ChevronRight size={18} color={Colors.primary} />
        </Pressable>

        {/* Policy Note */}
        <View className="flex-row items-start gap-2 mt-4 px-1">
          <AlertCircle size={12} color="#94A3B8" />
          <Text className="text-[10px] text-slate-400 flex-1 leading-[14px]">
            Free rescheduling up to 4 hours before your appointment. Changes within 4 hours may incur a Rs. 50 fee.
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Action */}
      <View className="absolute bottom-0 left-0 right-0 p-5 bg-white border-t border-slate-100" style={Shadows.presence}>
        <SafeAreaView edges={['bottom']}>
          <Pressable
            onPress={handleConfirm}
            className={`w-full py-4 rounded-full items-center ${hasChanges ? 'bg-primary' : 'bg-slate-200'}`}
            style={hasChanges ? Shadows.focus : undefined}
          >
            <Text className={`font-bold text-base ${hasChanges ? 'text-white' : 'text-slate-400'}`}>
              Confirm Changes
            </Text>
          </Pressable>
        </SafeAreaView>
      </View>
    </SafeAreaView>
  );
}
