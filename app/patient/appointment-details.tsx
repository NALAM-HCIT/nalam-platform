import { CustomAlert } from '@/components/CustomAlert';
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Shadows, Colors } from '@/constants/theme';
import { getAppointment, AppointmentResponse } from '@/services/appointmentService';
import {
  ArrowLeft, Calendar, MapPin, CheckCircle, UserCheck,
  CalendarClock, Phone, Clock, CreditCard, AlertCircle,
} from 'lucide-react-native';

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  pending:        { label: 'Pending',         bg: 'bg-amber-100',   text: 'text-amber-700' },
  confirmed:      { label: 'Confirmed',       bg: 'bg-green-100',   text: 'text-green-700' },
  arrived:        { label: 'Arrived',         bg: 'bg-blue-100',    text: 'text-blue-700' },
  in_consultation:{ label: 'In Consultation', bg: 'bg-purple-100',  text: 'text-purple-700' },
  completed:      { label: 'Completed',       bg: 'bg-emerald-100', text: 'text-emerald-700' },
  cancelled:      { label: 'Cancelled',       bg: 'bg-red-100',     text: 'text-red-700' },
};

const CHECKLIST = [
  'Please carry your primary identification (Aadhar / Voter ID)',
  'Bring previous medical history and current prescriptions',
  'Arrive 10–15 minutes before your scheduled time',
];

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatTime(timeStr: string): string {
  // timeStr is "HH:mm" — convert to 12h
  try {
    const [h, m] = timeStr.split(':').map(Number);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
  } catch {
    return timeStr;
  }
}

export default function AppointmentDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [appointment, setAppointment] = useState<AppointmentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) { setError('No appointment ID provided.'); setLoading(false); return; }
    getAppointment(id)
      .then(setAppointment)
      .catch(() => setError('Failed to load appointment details.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleReschedule = useCallback(() => {
    if (!appointment) return;
    if (appointment.status === 'completed' || appointment.status === 'cancelled') {
      CustomAlert.alert('Cannot Reschedule', 'This appointment cannot be rescheduled.');
      return;
    }
    router.push({
      pathname: '/patient/edit-booking',
      params: { id: appointment.id, type: appointment.consultationType === 'online' ? 'online' : 'in-person' },
    });
  }, [appointment, router]);

  const handleContactHospital = useCallback(() => {
    CustomAlert.alert(
      'Contact Hospital',
      'Call the hospital reception to speak with staff about your appointment.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call 1800-123-NALAM', onPress: () => Linking.openURL('tel:1800123625') },
      ],
    );
  }, []);

  const handleMarkArrival = useCallback(() => {
    router.push('/patient/arrival-confirmed');
  }, [router]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#F0F7FF] items-center justify-center" edges={['top']}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text className="text-slate-400 text-sm mt-3">Loading appointment...</Text>
      </SafeAreaView>
    );
  }

  if (error || !appointment) {
    return (
      <SafeAreaView className="flex-1 bg-[#F0F7FF] items-center justify-center px-8" edges={['top']}>
        <AlertCircle size={40} color="#EF4444" />
        <Text className="text-midnight font-bold text-lg mt-3 text-center">{error || 'Appointment not found'}</Text>
        <Pressable onPress={() => router.back()} className="mt-4 px-6 py-3 bg-primary rounded-full">
          <Text className="text-white font-bold">Go Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const statusCfg = STATUS_CONFIG[appointment.status] ?? { label: appointment.status, bg: 'bg-slate-100', text: 'text-slate-700' };
  const initials = appointment.doctorInitials || appointment.doctorName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const isActive = ['pending', 'confirmed'].includes(appointment.status);

  return (
    <SafeAreaView className="flex-1 bg-[#F0F7FF]" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="flex-row items-center gap-4 px-6 pt-4 pb-6">
          <Pressable onPress={() => router.back()}>
            <ArrowLeft size={24} color="#1A73E8" />
          </Pressable>
          <Text className="text-3xl font-extrabold tracking-tight text-[#0B1B3D]">
            Appointment Details
          </Text>
        </View>

        {/* Doctor Card */}
        <View className="bg-white/70 rounded-[24px] p-8 mx-6 mb-6 items-center" style={Shadows.card}>
          <View className="w-24 h-24 rounded-full bg-primary/10 items-center justify-center border-4 border-white mb-4" style={Shadows.presence}>
            <Text className="text-3xl font-extrabold text-primary">{initials}</Text>
          </View>
          <Text className="text-2xl font-bold text-[#0B1B3D] text-center">{appointment.doctorName}</Text>
          <Text className="text-[#1A73E8] font-medium text-center mt-1">{appointment.specialty}</Text>
          <View className="flex-row items-center gap-3 mt-3">
            <View className="bg-blue-100 px-3 py-1 rounded-full">
              <Text className="text-[#1A73E8] text-[10px] font-bold uppercase tracking-wider">
                {appointment.consultationType === 'online' ? 'Video Consult' : 'In-Person'}
              </Text>
            </View>
            {appointment.doctorRating && (
              <View className="bg-amber-100 px-3 py-1 rounded-full">
                <Text className="text-amber-700 text-[10px] font-bold">★ {appointment.doctorRating.toFixed(1)}</Text>
              </View>
            )}
          </View>
          <Text className="text-xs text-slate-400 mt-2">Ref: {appointment.bookingReference}</Text>
        </View>

        {/* Details Grid */}
        <View className="px-6 gap-4 mb-6">
          {/* Date & Time */}
          <View className="bg-white/70 rounded-[24px] p-6 flex-row items-start gap-4" style={Shadows.card}>
            <View className="p-3 bg-blue-50 rounded-2xl">
              <Calendar size={22} color="#1A73E8" />
            </View>
            <View>
              <Text className="text-[14px] font-light tracking-widest text-[#64748B] uppercase">Date & Time</Text>
              <Text className="text-lg font-semibold mt-1 text-[#0B1B3D]">{formatDate(appointment.scheduleDate)}</Text>
              <Text className="text-[#64748B]">{formatTime(appointment.startTime)} – {formatTime(appointment.endTime)}</Text>
            </View>
          </View>

          {/* Location */}
          <View className="bg-white/70 rounded-[24px] p-6 flex-row items-start gap-4" style={Shadows.card}>
            <View className="p-3 bg-blue-50 rounded-2xl">
              <MapPin size={22} color="#1A73E8" />
            </View>
            <View>
              <Text className="text-[14px] font-light tracking-widest text-[#64748B] uppercase">
                {appointment.consultationType === 'online' ? 'Consultation' : 'Department'}
              </Text>
              <Text className="text-lg font-semibold mt-1 text-[#0B1B3D]">
                {appointment.consultationType === 'online' ? 'Video Consultation' : 'Hospital Clinic'}
              </Text>
              <Text className="text-[#64748B] text-sm">{appointment.specialty}</Text>
            </View>
          </View>

          {/* Status */}
          <View className="bg-white/70 rounded-[24px] p-6 flex-row items-start gap-4" style={Shadows.card}>
            <View className={`p-3 rounded-2xl ${appointment.status === 'confirmed' || appointment.status === 'completed' ? 'bg-green-50' : 'bg-slate-50'}`}>
              <CheckCircle size={22} color={appointment.status === 'cancelled' ? '#EF4444' : '#16a34a'} />
            </View>
            <View className="flex-1">
              <View className="flex-row justify-between items-center">
                <Text className="text-[14px] font-light tracking-widest text-[#64748B] uppercase">Status</Text>
                <View className={`px-3 py-1 rounded-full ${statusCfg.bg}`}>
                  <Text className={`text-xs font-bold uppercase tracking-wider ${statusCfg.text}`}>
                    {statusCfg.label}
                  </Text>
                </View>
              </View>
              <Text className="text-lg font-semibold mt-1 text-[#0B1B3D]">
                {appointment.status === 'confirmed' ? 'Your visit is all set.' :
                 appointment.status === 'completed' ? 'Consultation completed.' :
                 appointment.status === 'cancelled' ? 'This appointment was cancelled.' :
                 appointment.status === 'arrived' ? 'You have checked in.' :
                 appointment.status === 'in_consultation' ? 'Currently in consultation.' :
                 'Awaiting confirmation.'}
              </Text>
            </View>
          </View>

          {/* Payment */}
          <View className="bg-white/70 rounded-[24px] p-6 flex-row items-start gap-4" style={Shadows.card}>
            <View className="p-3 bg-emerald-50 rounded-2xl">
              <CreditCard size={22} color="#059669" />
            </View>
            <View>
              <Text className="text-[14px] font-light tracking-widest text-[#64748B] uppercase">Payment</Text>
              <Text className="text-lg font-semibold mt-1 text-[#0B1B3D]">₹{appointment.totalAmount.toFixed(0)}</Text>
              <Text className="text-[#64748B] text-sm capitalize">
                {appointment.paymentMethod?.replace('_', ' ') ?? 'N/A'} •{' '}
                <Text className={appointment.paymentStatus === 'paid' ? 'text-emerald-600' : 'text-amber-600'}>
                  {appointment.paymentStatus === 'paid' ? 'Paid' : 'Pay on Visit'}
                </Text>
              </Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View className="px-6 gap-4 pt-2 mb-6">
          {isActive && (
            <Pressable
              onPress={handleMarkArrival}
              className="bg-[#1A73E8] w-full py-5 rounded-full flex-row items-center justify-center gap-3 active:opacity-80"
              style={Shadows.focus}
            >
              <UserCheck size={22} color="#FFFFFF" />
              <Text className="text-white font-bold text-lg">Mark My Arrival</Text>
            </Pressable>
          )}

          <View className="flex-row gap-4">
            {isActive && (
              <Pressable
                onPress={handleReschedule}
                className="flex-1 bg-white/70 py-4 rounded-full flex-row items-center justify-center gap-2 active:opacity-70"
                style={Shadows.card}
              >
                <CalendarClock size={16} color="#1A73E8" />
                <Text className="text-[#1A73E8] font-semibold">Reschedule</Text>
              </Pressable>
            )}
            <Pressable
              onPress={handleContactHospital}
              className="flex-1 bg-white/70 py-4 rounded-full flex-row items-center justify-center gap-2 active:opacity-70"
              style={Shadows.card}
            >
              <Phone size={16} color="#64748B" />
              <Text className="text-[#64748B] font-semibold">Contact Hospital</Text>
            </Pressable>
          </View>
        </View>

        {/* Checklist — only for upcoming */}
        {isActive && (
          <View className="px-6 pb-8 gap-4">
            <Text className="text-xl font-bold text-[#0B1B3D]">Preparation Checklist</Text>
            <View className="gap-3">
              {CHECKLIST.map((item, index) => (
                <View key={index} className="flex-row items-center gap-4">
                  <View className="w-1.5 h-1.5 bg-[#1A73E8] rounded-full" />
                  <Text className="text-[#64748B] flex-1">{item}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Cancel reason */}
        {appointment.cancelReason && (
          <View className="mx-6 mb-6 p-4 bg-red-50 rounded-2xl border border-red-200">
            <Text className="text-red-700 text-xs font-bold uppercase mb-1">Cancellation Reason</Text>
            <Text className="text-red-800 text-sm">{appointment.cancelReason}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
