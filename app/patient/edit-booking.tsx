import { CustomAlert } from '@/components/CustomAlert';
import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Shadows, Colors } from '@/constants/theme';
import {
  getAppointment,
  getDoctorAvailability,
  updateAppointment,
  AppointmentResponse,
  AvailableSlot,
  SlotGroup,
} from '@/services/appointmentService';
import {
  ArrowLeft, MapPin, User, Video, Star, Sun, CloudSun, Moon,
  AlertCircle, Calendar,
} from 'lucide-react-native';

/* ───── Helpers ───── */

function toDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

function isToday(dateStr: string): boolean {
  return new Date(dateStr).toDateString() === new Date().toDateString();
}

function isPast(dateStr: string): boolean {
  return new Date(dateStr) < new Date(new Date().toDateString());
}

const PERIOD_ICONS: Record<string, React.ElementType> = { Morning: Sun, Afternoon: CloudSun, Evening: Moon };
const PERIOD_COLORS: Record<string, string> = { Morning: '#F59E0B', Afternoon: '#F97316', Evening: '#8B5CF6' };

/* ───── Sub-components ───── */

const SlotChip = React.memo(function SlotChip({
  slot, isSelected, onPress,
}: { slot: AvailableSlot; isSelected: boolean; onPress: () => void }) {
  const isFull = slot.bookedCount >= slot.maxCapacity;
  const disabled = isFull;
  return (
    <Pressable
      onPress={!disabled ? onPress : undefined}
      className={`px-3 py-2 rounded-xl border ${
        disabled ? 'border-slate-100 bg-slate-50 opacity-40'
        : isSelected ? 'bg-primary/10 border-primary'
        : 'border-slate-200 bg-white'
      }`}
      style={!isSelected && !disabled ? Shadows.card : undefined}
    >
      <Text className={`text-xs font-semibold ${isSelected ? 'text-primary' : disabled ? 'text-slate-300' : 'text-midnight'}`}>
        {slot.startTime}
      </Text>
      {slot.maxCapacity > 1 && (
        <Text className={`text-[9px] font-medium mt-0.5 ${isFull ? 'text-red-400' : 'text-slate-400'}`}>
          {slot.bookedCount}/{slot.maxCapacity}
        </Text>
      )}
    </Pressable>
  );
});

/* ───── Main Screen ───── */

export default function EditBookingScreen() {
  const router = useRouter();
  const { id, type } = useLocalSearchParams<{ id?: string; type?: string }>();

  const [appointment, setAppointment] = useState<AppointmentResponse | null>(null);
  const [loadingAppt, setLoadingAppt] = useState(true);

  const [dates, setDates] = useState<{ date: string; availableSlots: number }[]>([]);
  const [selectedDate, setSelectedDate] = useState('');

  const [slotGroups, setSlotGroups] = useState<SlotGroup[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);

  const [consultationType, setConsultationType] = useState<'in-person' | 'online'>(
    type === 'online' ? 'online' : 'in-person',
  );
  const [saving, setSaving] = useState(false);

  // Load appointment + 14-day availability on mount
  useEffect(() => {
    if (!id) { setLoadingAppt(false); return; }
    getAppointment(id)
      .then(async (appt) => {
        setAppointment(appt);
        if (!appt.doctorProfileId) return;
        const today = new Date().toISOString().split('T')[0];
        const avail = await getDoctorAvailability(appt.doctorProfileId, today, 14);
        const futureDates = avail.dates.filter((d) => !isPast(d.date));
        setDates(futureDates);
        // Pre-select appointment's current date if still available
        const existingDate = futureDates.find((d) => d.date === appt.scheduleDate);
        const defaultDate = existingDate ? appt.scheduleDate : (futureDates[0]?.date ?? '');
        setSelectedDate(defaultDate);
      })
      .catch(() => CustomAlert.alert('Error', 'Failed to load appointment details.'))
      .finally(() => setLoadingAppt(false));
  }, [id]);

  // Fetch slots when selected date changes
  useEffect(() => {
    if (!selectedDate || !appointment?.doctorProfileId) return;
    let cancelled = false;
    setLoadingSlots(true);
    setSlotGroups([]);
    setSelectedSlot(null);
    getDoctorAvailability(appointment.doctorProfileId, selectedDate, 1)
      .then((avail) => {
        if (!cancelled) {
          setSlotGroups(avail.slotGroups);
          // Pre-select current slot if same date
          if (selectedDate === appointment.scheduleDate) {
            for (const g of avail.slotGroups) {
              const match = g.slots.find((s) => s.startTime === appointment.startTime);
              if (match) { setSelectedSlot(match); break; }
            }
          }
        }
      })
      .catch(() => { if (!cancelled) CustomAlert.alert('Error', 'Failed to load time slots.'); })
      .finally(() => { if (!cancelled) setLoadingSlots(false); });
    return () => { cancelled = true; };
  }, [selectedDate, appointment]);

  const hasChanges =
    selectedSlot !== null &&
    (selectedDate !== appointment?.scheduleDate ||
      selectedSlot.startTime !== appointment?.startTime ||
      consultationType !== (appointment?.consultationType === 'online' ? 'online' : 'in-person'));

  const handleConfirm = useCallback(async () => {
    if (!id || !selectedSlot || !selectedDate) return;
    if (!hasChanges) {
      CustomAlert.alert('No Changes', "You haven't changed anything.");
      return;
    }
    setSaving(true);
    try {
      await updateAppointment(id, {
        scheduleDate: selectedDate,
        startTime: selectedSlot.startTime,
        consultationType,
      });
      router.push('/patient/edit-success');
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to reschedule.';
      CustomAlert.alert('Reschedule Failed', msg);
    } finally {
      setSaving(false);
    }
  }, [id, selectedSlot, selectedDate, consultationType, hasChanges, router]);

  if (loadingAppt) {
    return (
      <SafeAreaView className="flex-1 bg-[#F8FAFC] items-center justify-center" edges={['top']}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text className="text-slate-400 text-sm mt-3">Loading booking details...</Text>
      </SafeAreaView>
    );
  }

  const initials = appointment?.doctorInitials ||
    appointment?.doctorName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '—';

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top']}>
      {/* Header */}
      <View className="px-4 pt-2 pb-2 flex-row items-center">
        <Pressable onPress={() => router.back()} className="w-10 h-10 items-center justify-center rounded-full">
          <ArrowLeft size={22} color="#0B1B3D" />
        </Pressable>
        <Text className="text-lg font-bold text-midnight flex-1 text-center pr-10 tracking-tight">
          Reschedule Appointment
        </Text>
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Doctor Card */}
        {appointment && (
          <View className="mb-5 mt-2">
            <Text className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Doctor</Text>
            <View className="bg-white rounded-[20px] p-4 flex-row items-center gap-3" style={Shadows.card}>
              <View className="w-14 h-14 rounded-xl bg-primary/10 items-center justify-center">
                <Text className="text-lg font-bold text-primary">{initials}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-bold text-midnight">{appointment.doctorName}</Text>
                <Text className="text-primary text-xs font-semibold">{appointment.specialty}</Text>
                <View className="flex-row items-center gap-2 mt-1">
                  {appointment.doctorRating && (
                    <View className="flex-row items-center gap-1">
                      <Star size={10} color="#EAB308" fill="#EAB308" />
                      <Text className="text-[10px] text-midnight font-bold">{appointment.doctorRating.toFixed(1)}</Text>
                    </View>
                  )}
                  <Text className="text-[10px] text-slate-400">Ref: {appointment.bookingReference}</Text>
                </View>
              </View>
            </View>
          </View>
        )}

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
                  className={`flex-1 flex-row items-center justify-center gap-2 py-2.5 rounded-full ${isActive ? 'bg-white' : ''}`}
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

        {/* Date Picker */}
        <View className="mb-5">
          <Text className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Select New Date
          </Text>
          {dates.length === 0 ? (
            <View className="bg-white rounded-2xl p-6 items-center" style={Shadows.card}>
              <Calendar size={24} color="#94A3B8" />
              <Text className="text-slate-400 text-sm mt-2">No available dates in the next 14 days</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-1">
              <View className="flex-row gap-2 px-1 pb-1">
                {dates.map((d) => {
                  const isSelected = d.date === selectedDate;
                  const today = isToday(d.date);
                  return (
                    <Pressable
                      key={d.date}
                      onPress={() => setSelectedDate(d.date)}
                      className={`items-center px-3 py-3 rounded-2xl min-w-[68px] ${
                        isSelected ? 'bg-primary' : 'bg-white'
                      }`}
                      style={isSelected ? Shadows.focus : Shadows.card}
                    >
                      <Text className={`text-[10px] font-bold uppercase ${isSelected ? 'text-white/70' : 'text-slate-400'}`}>
                        {toDateLabel(d.date).split(' ')[0]}
                      </Text>
                      <Text className={`text-xl font-extrabold ${isSelected ? 'text-white' : 'text-midnight'}`}>
                        {new Date(d.date).getDate()}
                      </Text>
                      <Text className={`text-[10px] font-medium ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                        {toDateLabel(d.date).split(' ').slice(1).join(' ')}
                      </Text>
                      {today && (
                        <View className={`mt-1 w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-primary'}`} />
                      )}
                      {d.availableSlots === 0 && (
                        <Text className={`text-[9px] mt-0.5 ${isSelected ? 'text-white/60' : 'text-red-400'}`}>Full</Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          )}
        </View>

        {/* Time Slots */}
        {selectedDate !== '' && (
          <View className="mb-4">
            <Text className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Select Time Slot
            </Text>
            {loadingSlots ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : slotGroups.length === 0 ? (
              <View className="bg-white rounded-2xl p-6 items-center" style={Shadows.card}>
                <Text className="text-slate-400 text-sm">No slots available for this date</Text>
              </View>
            ) : (
              slotGroups.map((group) => {
                const Icon = PERIOD_ICONS[group.period] ?? Sun;
                const color = PERIOD_COLORS[group.period] ?? '#64748B';
                const available = group.slots.filter((s) => s.bookedCount < s.maxCapacity).length;
                return (
                  <View key={group.period} className="mb-4">
                    <View className="flex-row items-center justify-between mb-2.5">
                      <View className="flex-row items-center gap-2">
                        <Icon size={14} color={color} />
                        <Text className="text-xs font-bold text-midnight">{group.period}</Text>
                      </View>
                      <Text className="text-[10px] text-slate-400">{available} of {group.slots.length} available</Text>
                    </View>
                    <View className="flex-row flex-wrap gap-2">
                      {group.slots.map((slot) => (
                        <SlotChip
                          key={slot.startTime}
                          slot={slot}
                          isSelected={selectedSlot?.startTime === slot.startTime}
                          onPress={() => setSelectedSlot(slot)}
                        />
                      ))}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* Policy Note */}
        <View className="flex-row items-start gap-2 mt-2 px-1">
          <AlertCircle size={12} color="#94A3B8" />
          <Text className="text-[10px] text-slate-400 flex-1 leading-[14px]">
            Free rescheduling up to 4 hours before your appointment. Changes within 4 hours may not be allowed.
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Action */}
      <View className="absolute bottom-0 left-0 right-0 p-5 bg-white border-t border-slate-100" style={Shadows.presence}>
        <SafeAreaView edges={['bottom']}>
          <Pressable
            onPress={handleConfirm}
            disabled={!hasChanges || saving}
            className={`w-full py-4 rounded-full items-center flex-row justify-center gap-2 ${hasChanges && !saving ? 'bg-primary' : 'bg-slate-200'}`}
            style={hasChanges ? Shadows.focus : undefined}
          >
            {saving
              ? <ActivityIndicator size="small" color="#FFFFFF" />
              : <Text className={`font-bold text-base ${hasChanges ? 'text-white' : 'text-slate-400'}`}>
                  {selectedSlot ? 'Confirm Changes' : 'Select a Time Slot'}
                </Text>
            }
          </Pressable>
        </SafeAreaView>
      </View>
    </SafeAreaView>
  );
}
