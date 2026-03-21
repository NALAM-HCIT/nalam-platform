import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Shadows, Colors } from '@/constants/theme';
import {
  Calendar, Clock, Video, Search, Plus, Building2, Star,
  MapPin, Briefcase, Phone, MessageSquare,
  ChevronRight, CheckCircle2, XCircle, RotateCcw, FileText,
  AlertCircle, Stethoscope,
} from 'lucide-react-native';

/* ───── Types & Data ───── */

type BookingStatus = 'confirmed' | 'pending' | 'completed' | 'cancelled' | 'no_show';
type BookingTab = 'upcoming' | 'past';

interface Booking {
  id: string;
  doctor: string;
  initials: string;
  specialty: string;
  date: string;
  time: string;
  type: 'video' | 'in-person';
  status: BookingStatus;
  tab: BookingTab;
  fee: number;
  location?: string;
  rating?: number;
  exp?: number;
  prescription?: boolean;
  followUp?: string;
  cancelReason?: string;
}

const STATUS_CONFIG: Record<BookingStatus, { label: string; bg: string; border: string; text: string; icon: React.ElementType; iconColor: string }> = {
  confirmed: {
    label: 'CONFIRMED',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    icon: CheckCircle2,
    iconColor: '#059669',
  },
  pending: {
    label: 'PENDING',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    icon: Clock,
    iconColor: '#D97706',
  },
  completed: {
    label: 'COMPLETED',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    icon: CheckCircle2,
    iconColor: '#2563EB',
  },
  cancelled: {
    label: 'CANCELLED',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    text: 'text-rose-700',
    icon: XCircle,
    iconColor: '#E11D48',
  },
  no_show: {
    label: 'NO SHOW',
    bg: 'bg-slate-100',
    border: 'border-slate-300',
    text: 'text-slate-600',
    icon: AlertCircle,
    iconColor: '#64748B',
  },
};

const BOOKINGS: Booking[] = [
  {
    id: '1',
    doctor: 'Dr. Aruna Devi',
    initials: 'AD',
    specialty: 'Cardiologist',
    date: 'Mar 24, 2026',
    time: '10:00 AM',
    type: 'in-person',
    status: 'confirmed',
    tab: 'upcoming',
    fee: 800,
    location: 'Nalam Hospital, Wing A',
    rating: 4.9,
    exp: 12,
  },
  {
    id: '2',
    doctor: 'Dr. Rajesh Kumar',
    initials: 'RK',
    specialty: 'Neurologist',
    date: 'Mar 28, 2026',
    time: '02:30 PM',
    type: 'video',
    status: 'pending',
    tab: 'upcoming',
    fee: 650,
    rating: 4.8,
    exp: 8,
  },
  {
    id: '3',
    doctor: 'Dr. Shalini Singh',
    initials: 'SS',
    specialty: 'Dermatologist',
    date: 'Apr 02, 2026',
    time: '11:00 AM',
    type: 'video',
    status: 'confirmed',
    tab: 'upcoming',
    fee: 700,
    rating: 4.7,
    exp: 10,
  },
  {
    id: '4',
    doctor: 'Dr. Aruna Devi',
    initials: 'AD',
    specialty: 'Cardiologist',
    date: 'Mar 10, 2026',
    time: '10:00 AM',
    type: 'in-person',
    status: 'completed',
    tab: 'past',
    fee: 800,
    location: 'Nalam Hospital, Wing A',
    rating: 4.9,
    exp: 12,
    prescription: true,
    followUp: 'Mar 24, 2026',
  },
  {
    id: '5',
    doctor: 'Dr. Rajesh Kumar',
    initials: 'RK',
    specialty: 'Neurologist',
    date: 'Feb 25, 2026',
    time: '03:00 PM',
    type: 'video',
    status: 'completed',
    tab: 'past',
    fee: 650,
    rating: 4.8,
    exp: 8,
    prescription: true,
  },
  {
    id: '6',
    doctor: 'Dr. James Wilson',
    initials: 'JW',
    specialty: 'Orthopedic',
    date: 'Feb 15, 2026',
    time: '09:30 AM',
    type: 'in-person',
    status: 'cancelled',
    tab: 'past',
    fee: 1000,
    cancelReason: 'Doctor unavailable',
  },
  {
    id: '7',
    doctor: 'Dr. Elena Gomez',
    initials: 'EG',
    specialty: 'Pediatrician',
    date: 'Jan 28, 2026',
    time: '11:00 AM',
    type: 'video',
    status: 'no_show',
    tab: 'past',
    fee: 500,
  },
  {
    id: '8',
    doctor: 'Dr. Priya Sharma',
    initials: 'PS',
    specialty: 'Cardiologist',
    date: 'Jan 10, 2026',
    time: '04:00 PM',
    type: 'in-person',
    status: 'completed',
    tab: 'past',
    fee: 600,
    location: 'Nalam Hospital, Wing B',
    prescription: true,
    followUp: 'Feb 10, 2026',
  },
];

/* ───── Sub-components ───── */

const BookingStatusBadge = React.memo(function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  return (
    <View className={`${config.bg} ${config.border} border px-2.5 py-1 rounded-full flex-row items-center gap-1`}>
      <Icon size={10} color={config.iconColor} strokeWidth={2.5} />
      <Text className={`${config.text} text-[10px] font-bold tracking-wider`}>{config.label}</Text>
    </View>
  );
});

const UpcomingBookingCard = React.memo(function UpcomingBookingCard({
  booking,
  onViewDetails,
  onJoinCall,
  onReschedule,
  onCancel,
  onCall,
  onMessage,
}: {
  booking: Booking;
  onViewDetails: () => void;
  onJoinCall: () => void;
  onReschedule: () => void;
  onCancel: () => void;
  onCall: () => void;
  onMessage: () => void;
}) {
  const isVideo = booking.type === 'video';
  const TypeIcon = isVideo ? Video : Building2;

  return (
    <View className="bg-white rounded-[22px] mb-4 overflow-hidden" style={Shadows.card}>
      {/* Type Banner */}
      <View className={`px-5 py-2.5 flex-row items-center justify-between ${isVideo ? 'bg-violet-50' : 'bg-blue-50'}`}>
        <View className="flex-row items-center gap-2">
          <TypeIcon size={14} color={isVideo ? '#7C3AED' : Colors.primary} />
          <Text className={`text-[11px] font-bold ${isVideo ? 'text-violet-600' : 'text-primary'}`}>
            {isVideo ? 'Video Consultation' : 'In-Person Visit'}
          </Text>
        </View>
        <BookingStatusBadge status={booking.status} />
      </View>

      <View className="p-5">
        {/* Doctor Info */}
        <View className="flex-row items-center gap-3 mb-4">
          <View className="w-14 h-14 rounded-2xl bg-primary/10 items-center justify-center">
            <Text className="text-lg font-bold text-primary">{booking.initials}</Text>
          </View>
          <View className="flex-1">
            <Text className="font-bold text-[15px] text-midnight">{booking.doctor}</Text>
            <Text className="text-primary text-xs font-semibold mt-0.5">{booking.specialty}</Text>
            {booking.rating && (
              <View className="flex-row items-center gap-2 mt-1">
                <View className="flex-row items-center gap-0.5">
                  <Star size={10} color="#EAB308" fill="#EAB308" />
                  <Text className="text-[10px] text-midnight font-bold">{booking.rating}</Text>
                </View>
                {booking.exp && (
                  <>
                    <View className="w-1 h-1 rounded-full bg-slate-300" />
                    <View className="flex-row items-center gap-0.5">
                      <Briefcase size={10} color="#94A3B8" />
                      <Text className="text-[10px] text-slate-400 font-medium">{booking.exp} yrs</Text>
                    </View>
                  </>
                )}
              </View>
            )}
          </View>
          {/* Quick actions */}
          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={onCall}
              className="w-9 h-9 rounded-full bg-emerald-50 items-center justify-center active:opacity-70"
            >
              <Phone size={14} color="#059669" />
            </Pressable>
            <Pressable
              onPress={onMessage}
              className="w-9 h-9 rounded-full bg-blue-50 items-center justify-center active:opacity-70"
            >
              <MessageSquare size={14} color={Colors.primary} />
            </Pressable>
          </View>
        </View>

        {/* Date/Time/Location Strip */}
        <View className="bg-slate-50 rounded-2xl p-3.5 mb-4">
          <View className="flex-row items-center gap-4">
            <View className="flex-row items-center gap-1.5">
              <Calendar size={13} color="#64748B" />
              <Text className="text-slate-600 text-xs font-semibold">{booking.date}</Text>
            </View>
            <View className="w-1 h-1 rounded-full bg-slate-300" />
            <View className="flex-row items-center gap-1.5">
              <Clock size={13} color="#64748B" />
              <Text className="text-slate-600 text-xs font-semibold">{booking.time}</Text>
            </View>
          </View>
          {booking.location && (
            <View className="flex-row items-center gap-1.5 mt-2 pt-2 border-t border-slate-200/50">
              <MapPin size={12} color="#94A3B8" />
              <Text className="text-slate-400 text-[11px] font-medium">{booking.location}</Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View className="flex-row gap-3">
          {isVideo ? (
            <Pressable
              onPress={onJoinCall}
              className="flex-1 bg-primary py-3.5 rounded-full items-center flex-row justify-center gap-2"
              style={Shadows.focus}
            >
              <Video size={14} color="#FFFFFF" />
              <Text className="text-white font-bold text-sm">Join Call</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={onViewDetails}
              className="flex-1 bg-primary py-3.5 rounded-full items-center flex-row justify-center gap-2"
              style={Shadows.focus}
            >
              <ChevronRight size={14} color="#FFFFFF" />
              <Text className="text-white font-bold text-sm">View Details</Text>
            </Pressable>
          )}
          <Pressable
            onPress={onReschedule}
            className="flex-1 border-[1.5px] border-primary/20 py-3.5 rounded-full items-center flex-row justify-center gap-1.5 active:opacity-70"
          >
            <RotateCcw size={12} color={Colors.primary} />
            <Text className="text-primary font-bold text-sm">Reschedule</Text>
          </Pressable>
        </View>

        {/* Cancel link */}
        <Pressable onPress={onCancel} className="mt-3 items-center active:opacity-60">
          <Text className="text-slate-400 text-[11px] font-medium">Cancel Appointment</Text>
        </Pressable>
      </View>
    </View>
  );
});

const PastBookingCard = React.memo(function PastBookingCard({
  booking,
  onRebook,
  onViewPrescription,
  onViewDetails,
}: {
  booking: Booking;
  onRebook: () => void;
  onViewPrescription: () => void;
  onViewDetails: () => void;
}) {
  const isVideo = booking.type === 'video';
  const TypeIcon = isVideo ? Video : Building2;
  const isCancelled = booking.status === 'cancelled';
  const isNoShow = booking.status === 'no_show';

  return (
    <Pressable
      onPress={onViewDetails}
      className={`bg-white rounded-[22px] mb-4 overflow-hidden active:opacity-90 ${
        isCancelled || isNoShow ? 'opacity-80' : ''
      }`}
      style={Shadows.card}
    >
      <View className="p-5">
        {/* Doctor + Status Row */}
        <View className="flex-row items-start gap-3 mb-3">
          <View className={`w-12 h-12 rounded-xl items-center justify-center ${
            isCancelled || isNoShow ? 'bg-slate-100' : 'bg-primary/10'
          }`}>
            <Text className={`text-base font-bold ${isCancelled || isNoShow ? 'text-slate-400' : 'text-primary'}`}>
              {booking.initials}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="font-bold text-[14px] text-midnight">{booking.doctor}</Text>
            <View className="flex-row items-center gap-2 mt-0.5">
              <Text className="text-slate-400 text-xs font-medium">{booking.specialty}</Text>
              <View className="w-1 h-1 rounded-full bg-slate-300" />
              <View className="flex-row items-center gap-1">
                <TypeIcon size={10} color="#94A3B8" />
                <Text className="text-slate-400 text-[10px] font-medium">{isVideo ? 'Video' : 'In-Person'}</Text>
              </View>
            </View>
          </View>
          <BookingStatusBadge status={booking.status} />
        </View>

        {/* Date/Time */}
        <View className="flex-row items-center gap-3 mb-3">
          <View className="flex-row items-center gap-1.5">
            <Calendar size={12} color="#94A3B8" />
            <Text className="text-slate-400 text-xs font-medium">{booking.date}</Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <Clock size={12} color="#94A3B8" />
            <Text className="text-slate-400 text-xs font-medium">{booking.time}</Text>
          </View>
        </View>

        {/* Cancel reason */}
        {isCancelled && booking.cancelReason && (
          <View className="bg-rose-50 rounded-xl px-3 py-2 mb-3 flex-row items-center gap-2">
            <AlertCircle size={12} color="#E11D48" />
            <Text className="text-rose-600 text-[11px] font-medium">Reason: {booking.cancelReason}</Text>
          </View>
        )}

        {/* Follow-up info */}
        {booking.followUp && (
          <View className="bg-blue-50 rounded-xl px-3 py-2 mb-3 flex-row items-center gap-2">
            <Calendar size={12} color={Colors.primary} />
            <Text className="text-primary text-[11px] font-medium">Follow-up scheduled: {booking.followUp}</Text>
          </View>
        )}

        {/* Actions */}
        <View className="flex-row gap-3 pt-3 border-t border-slate-100">
          {booking.prescription && (
            <Pressable
              onPress={onViewPrescription}
              className="flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-full bg-primary/5 active:opacity-70"
            >
              <FileText size={12} color={Colors.primary} />
              <Text className="text-primary text-xs font-bold">Prescription</Text>
            </Pressable>
          )}
          <Pressable
            onPress={onRebook}
            className="flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-full bg-primary/5 active:opacity-70"
          >
            <RotateCcw size={12} color={Colors.primary} />
            <Text className="text-primary text-xs font-bold">
              {isCancelled || isNoShow ? 'Rebook' : 'Book Again'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
});

/* ───── Main Screen ───── */

export default function BookingsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<BookingTab>('upcoming');

  const upcomingBookings = useMemo(() => BOOKINGS.filter((b) => b.tab === 'upcoming'), []);
  const pastBookings = useMemo(() => BOOKINGS.filter((b) => b.tab === 'past'), []);
  const filtered = activeTab === 'upcoming' ? upcomingBookings : pastBookings;

  const handleJoinCall = useCallback((booking: Booking) => {
    router.push('/patient/join-call');
  }, [router]);

  const handleViewDetails = useCallback((booking: Booking) => {
    router.push({ pathname: '/patient/appointment-details', params: { id: booking.id } });
  }, [router]);

  const handleReschedule = useCallback((booking: Booking) => {
    router.push({
      pathname: '/patient/edit-booking',
      params: { type: booking.type === 'video' ? 'online' : 'in-person' },
    });
  }, [router]);

  const handleCancel = useCallback((booking: Booking) => {
    Alert.alert(
      'Cancel Appointment',
      `Are you sure you want to cancel your appointment with ${booking.doctor} on ${booking.date}?`,
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel Appointment',
          style: 'destructive',
          onPress: () => Alert.alert('Cancelled', 'Your appointment has been cancelled. Refund will be processed within 3-5 business days.'),
        },
      ],
    );
  }, []);

  const handleCall = useCallback((booking: Booking) => {
    Alert.alert('Call Hospital', `Calling reception for ${booking.doctor}'s clinic...`, [{ text: 'OK' }]);
  }, []);

  const handleMessage = useCallback((booking: Booking) => {
    Alert.alert('Message', `Opening chat with ${booking.doctor}'s clinic...`, [{ text: 'OK' }]);
  }, []);

  const handleRebook = useCallback((booking: Booking) => {
    router.push({
      pathname: '/patient/slot-selection',
      params: {
        doctorName: booking.doctor,
        specialty: booking.specialty,
        fee: booking.fee.toString(),
        initials: booking.initials,
      },
    });
  }, [router]);

  const handleViewPrescription = useCallback((booking: Booking) => {
    router.push('/patient/digital-prescription');
  }, [router]);

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top']}>
      {/* Header */}
      <View className="px-6 pt-4 pb-2 flex-row items-center justify-between">
        <Text className="text-2xl font-extrabold text-midnight tracking-tight">My Bookings</Text>
        <Pressable
          onPress={() => router.push('/patient/consultation-type')}
          className="w-10 h-10 rounded-full bg-primary items-center justify-center"
          style={Shadows.focus}
        >
          <Plus size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Segmented Tabs */}
      <View className="flex-row mx-6 mt-3 mb-4 p-1.5 bg-slate-100/60 rounded-full">
        {([
          { key: 'upcoming' as BookingTab, label: 'Upcoming', count: upcomingBookings.length },
          { key: 'past' as BookingTab, label: 'Past', count: pastBookings.length },
        ]).map((tab) => (
          <Pressable
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            className={`flex-1 py-2.5 rounded-full items-center flex-row justify-center gap-1.5 ${
              activeTab === tab.key ? 'bg-white' : ''
            }`}
            style={activeTab === tab.key ? Shadows.card : undefined}
          >
            <Text
              className={`text-sm font-semibold ${
                activeTab === tab.key ? 'text-primary' : 'text-slate-400'
              }`}
            >
              {tab.label}
            </Text>
            <View className={`px-1.5 py-0.5 rounded-full ${activeTab === tab.key ? 'bg-primary/10' : 'bg-slate-200/60'}`}>
              <Text className={`text-[10px] font-bold ${activeTab === tab.key ? 'text-primary' : 'text-slate-400'}`}>
                {tab.count}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>

      {/* Next Appointment Highlight (upcoming tab only) */}
      {activeTab === 'upcoming' && upcomingBookings.length > 0 && (
        <Pressable
          onPress={() => {
            const next = upcomingBookings[0];
            if (next.type === 'video') handleJoinCall(next);
            else handleViewDetails(next);
          }}
          className="mx-6 mb-4 bg-primary rounded-2xl p-4 flex-row items-center gap-3 active:opacity-90"
          style={Shadows.focus}
        >
          <View className="w-12 h-12 rounded-xl bg-white/20 items-center justify-center">
            <Text className="text-white font-bold text-base">{upcomingBookings[0].initials}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-white/70 text-[10px] font-bold uppercase tracking-wider">Next Appointment</Text>
            <Text className="text-white font-bold text-[15px] mt-0.5">{upcomingBookings[0].doctor}</Text>
            <Text className="text-blue-100 text-xs mt-0.5">
              {upcomingBookings[0].date} • {upcomingBookings[0].time}
            </Text>
          </View>
          <View className="w-10 h-10 rounded-full bg-white/20 items-center justify-center">
            <ChevronRight size={18} color="#FFFFFF" />
          </View>
        </Pressable>
      )}

      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 ? (
          <View className="items-center justify-center pt-20">
            <Calendar size={48} color="#CBD5E1" />
            <Text className="text-slate-400 text-base mt-4 font-medium">
              {activeTab === 'upcoming' ? 'No upcoming bookings' : 'No past bookings'}
            </Text>
            <Text className="text-slate-300 text-xs mt-1">
              {activeTab === 'upcoming' ? 'Book an appointment to get started' : 'Your booking history will appear here'}
            </Text>
            {activeTab === 'upcoming' && (
              <Pressable
                onPress={() => router.push('/patient/consultation-type')}
                className="mt-5 bg-primary px-8 py-3 rounded-full flex-row items-center gap-2"
                style={Shadows.focus}
              >
                <Search size={14} color="#FFFFFF" />
                <Text className="text-white font-bold text-sm">Find a Doctor</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <>
            {activeTab === 'upcoming'
              ? filtered.map((booking) => (
                  <UpcomingBookingCard
                    key={booking.id}
                    booking={booking}
                    onViewDetails={() => handleViewDetails(booking)}
                    onJoinCall={() => handleJoinCall(booking)}
                    onReschedule={() => handleReschedule(booking)}
                    onCancel={() => handleCancel(booking)}
                    onCall={() => handleCall(booking)}
                    onMessage={() => handleMessage(booking)}
                  />
                ))
              : filtered.map((booking) => (
                  <PastBookingCard
                    key={booking.id}
                    booking={booking}
                    onRebook={() => handleRebook(booking)}
                    onViewPrescription={() => handleViewPrescription(booking)}
                    onViewDetails={() => handleViewDetails(booking)}
                  />
                ))}

            {/* Book New CTA */}
            {activeTab === 'upcoming' && (
              <Pressable
                onPress={() => router.push('/patient/consultation-type')}
                className="bg-white rounded-[22px] p-5 mb-4 border border-dashed border-primary/30 items-center active:opacity-80"
                style={Shadows.card}
              >
                <View className="w-12 h-12 rounded-full bg-primary/10 items-center justify-center mb-2">
                  <Stethoscope size={22} color={Colors.primary} />
                </View>
                <Text className="font-bold text-sm text-midnight">Book New Appointment</Text>
                <Text className="text-slate-400 text-xs mt-1 text-center">
                  Find the best specialists near you
                </Text>
              </Pressable>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
