import { CustomAlert } from '@/components/CustomAlert';
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Modal, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, User, Phone, ChevronRight, Plus, X, Calendar, Stethoscope, Clock, AlertTriangle, Sun, CloudSun, Moon } from 'lucide-react-native';
import { Shadows, Colors } from '@/constants/theme';
import { receptionistService, PatientSearchResult, DoctorItem } from '@/services/receptionistService';
import type { SlotGroup, AvailableSlot } from '@/services/appointmentService';
import { isAuthError } from '@/services/api';

// ── Helpers ──────────────────────────────────────────────────────────────────

function getNextDays(n: number) {
  const days = [];
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  for (let i = 0; i < n; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : dayLabels[d.getDay()];
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    days.push({ label: `${label} ${dd}/${mm}`, value: `${yyyy}-${mm}-${dd}` });
  }
  return days;
}

/** Convert "10:30 AM" → "10:30" (24-hour HH:mm for API) */
function to24h(display: string): string {
  const m = display.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return display;
  let h = parseInt(m[1], 10);
  const mins = m[2];
  const ap = m[3].toUpperCase();
  if (ap === 'PM' && h !== 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${mins}`;
}

const DATE_OPTIONS = getNextDays(7);

const PERIOD_ICONS: Record<string, React.ElementType> = {
  Morning: Sun,
  Afternoon: CloudSun,
  Evening: Moon,
};
const PERIOD_COLORS: Record<string, string> = {
  Morning: '#F59E0B',
  Afternoon: '#F97316',
  Evening: '#8B5CF6',
};

// ── Sub-component ─────────────────────────────────────────────────────────────

const SlotChip = React.memo(function SlotChip({
  slot,
  isSelected,
  onPress,
}: {
  slot: AvailableSlot;
  isSelected: boolean;
  onPress: () => void;
}) {
  const showOccupancy = slot.maxCapacity > 1;
  const isFull = !slot.isAvailable;

  return (
    <Pressable
      onPress={isFull ? undefined : onPress}
      disabled={isFull}
      className={`px-3 py-2 rounded-xl border active:opacity-80 ${
        isFull
          ? 'bg-slate-50 border-slate-100 opacity-40'
          : isSelected
          ? 'bg-primary border-primary'
          : 'bg-white border-slate-200'
      }`}
      style={!isSelected && !isFull ? Shadows.card : undefined}
    >
      <View className="flex-row items-center gap-1">
        <Clock
          size={10}
          color={isFull ? '#CBD5E1' : isSelected ? '#fff' : '#94A3B8'}
        />
        <Text
          className={`text-xs font-bold ${
            isFull ? 'text-slate-300' : isSelected ? 'text-white' : 'text-slate-600'
          }`}
        >
          {slot.startTime}
        </Text>
      </View>
      {showOccupancy && (
        <Text
          className={`text-[9px] font-bold mt-0.5 ${
            isFull
              ? 'text-slate-300'
              : isSelected
              ? 'text-white/70'
              : slot.bookedCount === 0
              ? 'text-emerald-500'
              : 'text-amber-500'
          }`}
        >
          {isFull ? 'Full' : `${slot.bookedCount}/${slot.maxCapacity}`}
        </Text>
      )}
    </Pressable>
  );
});

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function PatientsScreen() {
  const [patients, setPatients] = useState<PatientSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<PatientSearchResult | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientMobile, setNewPatientMobile] = useState('');
  const [registerModalVisible, setRegisterModalVisible] = useState(false);

  // Booking flow
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [bookingStep, setBookingStep] = useState<1 | 2>(1);
  const [doctors, setDoctors] = useState<DoctorItem[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorItem | null>(null);
  const [selectedDate, setSelectedDate] = useState(DATE_OPTIONS[0].value);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [slotGroups, setSlotGroups] = useState<SlotGroup[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingPriority, setBookingPriority] = useState<'normal' | 'emergency'>('normal');

  // ── Patient list ──

  const fetchPatients = useCallback(async (query?: string) => {
    setLoading(true);
    try {
      const data = await receptionistService.searchPatients(query);
      setPatients(data);
    } catch (error) {
      if (!isAuthError(error)) CustomAlert.alert('Error', 'Failed to fetch patients.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);
  useEffect(() => {
    const t = setTimeout(() => fetchPatients(searchQuery), 500);
    return () => clearTimeout(t);
  }, [searchQuery, fetchPatients]);

  // ── Slot fetching — triggers when doctor or date changes in Step 2 ──

  useEffect(() => {
    if (!selectedDoctor || bookingStep !== 2) return;
    let cancelled = false;
    setSlotsLoading(true);
    setSlotGroups([]);
    setSelectedSlot(null);
    receptionistService.getAvailableSlots(selectedDoctor.id, selectedDate)
      .then((groups) => { if (!cancelled) setSlotGroups(groups); })
      .catch(() => { if (!cancelled) CustomAlert.alert('Error', 'Failed to load time slots.'); })
      .finally(() => { if (!cancelled) setSlotsLoading(false); });
    return () => { cancelled = true; };
  }, [selectedDoctor, selectedDate, bookingStep]);

  // ── Registration ──

  const handleRegisterPatient = async () => {
    if (!newPatientName.trim() || !newPatientMobile.trim()) {
      CustomAlert.alert('Validation', 'Please enter both full name and mobile number.');
      return;
    }
    try {
      setLoading(true);
      const newPatient = await receptionistService.registerWalkIn(newPatientName, newPatientMobile);
      setRegisterModalVisible(false);
      setNewPatientName('');
      setNewPatientMobile('');
      fetchPatients(searchQuery);
      CustomAlert.alert('Registered', `${newPatient.fullName} has been registered successfully.`);
    } catch (error: any) {
      const status = error.response?.status;
      const body = error.response?.data;
      if (status === 409 && body?.existingPatient) {
        const existing = body.existingPatient as PatientSearchResult;
        setRegisterModalVisible(false);
        CustomAlert.alert(
          'Mobile Already Registered',
          `This mobile number is already registered to:\n\n${existing.fullName}\n${existing.mobileNumber}\n\nWould you like to search for this patient?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Search Patient', onPress: () => setSearchQuery(existing.mobileNumber) },
          ]
        );
      } else {
        CustomAlert.alert('Registration Failed', body?.error || 'Failed to register patient.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Booking ──

  const openBookingForPatient = async () => {
    setDetailModalVisible(false);
    setBookingStep(1);
    setSelectedDoctor(null);
    setSelectedDate(DATE_OPTIONS[0].value);
    setSelectedSlot(null);
    setSlotGroups([]);
    setBookingPriority('normal');
    setBookingModalVisible(true);
    setDoctorsLoading(true);
    try {
      const data = await receptionistService.getDoctors();
      setDoctors(data);
    } catch (e) {
      if (!isAuthError(e)) CustomAlert.alert('Error', 'Failed to load doctors.');
    } finally {
      setDoctorsLoading(false);
    }
  };

  const handleBookingSubmit = async () => {
    if (!selectedPatient || !selectedDoctor || !selectedDate || !selectedSlot) return;
    setBookingSubmitting(true);
    try {
      const result = await receptionistService.bookAppointment({
        patientId: selectedPatient.id,
        doctorProfileId: selectedDoctor.id,
        scheduleDate: selectedDate,
        startTime: to24h(selectedSlot.startTime),
        consultationType: 'in-person',
        priority: bookingPriority,
      });
      setBookingModalVisible(false);
      CustomAlert.alert(
        'Appointment Booked',
        `Booking confirmed!\n\nRef: ${result.bookingReference}\nPatient: ${selectedPatient.fullName}\nDoctor: ${selectedDoctor.name}\nDate: ${selectedDate}\nTime: ${selectedSlot.startTime}\n\nPayment: Collect at counter`
      );
    } catch (e: any) {
      const msg = e.response?.data?.innerError || e.response?.data?.error || 'Failed to book appointment.';
      CustomAlert.alert('Booking Failed', msg);
    } finally {
      setBookingSubmitting(false);
    }
  };

  const allSlots = slotGroups.flatMap((g) => g.slots);
  const hasAnySlot = allSlots.length > 0;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      {/* Header */}
      <View className="px-6 pt-4 pb-2 flex-row items-center justify-between">
        <View>
          <Text className="text-2xl font-bold text-midnight tracking-tight">Patients</Text>
          <Text className="text-slate-500 text-sm mt-1">Directory & Registration</Text>
        </View>
        <Pressable
          onPress={() => setRegisterModalVisible(true)}
          className="flex-row items-center gap-1.5 bg-primary px-4 py-2.5 rounded-xl active:opacity-80"
          style={Shadows.focus}
        >
          <Plus size={16} color="#FFFFFF" />
          <Text className="text-white text-xs font-bold">Register</Text>
        </Pressable>
      </View>

      {/* Search */}
      <View className="px-6 mt-2 mb-4">
        <View className="flex-row items-center bg-white rounded-2xl px-4 py-3 border border-slate-100" style={Shadows.card}>
          <Search size={18} color="#94A3B8" />
          <TextInput
            className="flex-1 ml-3 text-sm text-midnight"
            placeholder="Search by name or mobile..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <Text className="text-primary text-xs font-semibold">Clear</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Patient List */}
      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => fetchPatients(searchQuery)} tintColor={Colors.primary} />}
      >
        {patients.length === 0 && !loading ? (
          <View className="items-center justify-center py-16">
            <User size={48} color="#CBD5E1" />
            <Text className="text-slate-400 text-sm mt-4 font-medium">No patients found</Text>
            <Text className="text-slate-300 text-xs mt-1">Try a different search term or register a new one.</Text>
          </View>
        ) : (
          patients.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => { setSelectedPatient(p); setDetailModalVisible(true); }}
              className="bg-white rounded-2xl p-4 mb-3 flex-row items-center gap-4 border border-slate-50 active:opacity-80"
              style={Shadows.card}
            >
              <View className="w-12 h-12 rounded-xl bg-primary/10 items-center justify-center">
                <Text className="text-primary font-bold text-base">{p.initials}</Text>
              </View>
              <View className="flex-1">
                <Text className="font-bold text-sm text-midnight">{p.fullName}</Text>
                <View className="flex-row items-center gap-1 mt-1">
                  <Phone size={12} color="#94A3B8" />
                  <Text className="text-slate-400 text-xs">{p.mobileNumber}</Text>
                </View>
              </View>
              <ChevronRight size={18} color="#CBD5E1" />
            </Pressable>
          ))
        )}
      </ScrollView>

      {/* ── Walk-in Registration Modal ── */}
      <Modal visible={registerModalVisible} animationType="slide" transparent>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6 pb-12">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-xl font-bold text-midnight">Walk-In Registration</Text>
              <Pressable onPress={() => setRegisterModalVisible(false)} className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center">
                <X size={18} color="#64748B" />
              </Pressable>
            </View>
            <View className="mb-4">
              <Text className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Full Name</Text>
              <TextInput
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-midnight font-medium text-base"
                placeholder="e.g. Rahul Sharma"
                value={newPatientName}
                onChangeText={setNewPatientName}
              />
            </View>
            <View className="mb-8">
              <Text className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Mobile Number</Text>
              <TextInput
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-midnight font-medium text-base"
                placeholder="+91 98765 43210"
                keyboardType="phone-pad"
                maxLength={10}
                value={newPatientMobile}
                onChangeText={setNewPatientMobile}
              />
            </View>
            <Pressable
              onPress={handleRegisterPatient}
              disabled={loading}
              className={`w-full bg-primary rounded-xl py-4 flex-row justify-center items-center ${loading ? 'opacity-70' : ''}`}
            >
              <Text className="text-white font-bold text-base">{loading ? 'Working...' : 'Register Patient'}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ── Patient Detail Modal ── */}
      <Modal visible={detailModalVisible} animationType="fade" transparent>
        <View className="flex-1 bg-black/50 justify-center items-center p-6">
          <View className="bg-white rounded-3xl w-full max-h-[80%] overflow-hidden">
            <View className="flex-row items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
              <Text className="text-lg font-bold text-midnight">Patient Summary</Text>
              <Pressable onPress={() => setDetailModalVisible(false)} className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center">
                <X size={18} color="#64748B" />
              </Pressable>
            </View>
            {selectedPatient && (
              <ScrollView className="px-6 py-4">
                <View className="items-center py-4">
                  <View className="w-20 h-20 rounded-full bg-primary/10 items-center justify-center mb-3">
                    <Text className="text-primary font-bold text-2xl">{selectedPatient.initials}</Text>
                  </View>
                  <Text className="text-xl font-bold text-midnight">{selectedPatient.fullName}</Text>
                  <Text className="text-slate-500 text-sm mt-1 font-medium tracking-wide">ID: {selectedPatient.id.substring(0, 8).toUpperCase()}</Text>
                </View>
                <View className="bg-slate-50 rounded-2xl p-4 mb-6">
                  <View className="mb-3">
                    <Text className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Mobile Number</Text>
                    <Text className="text-sm text-midnight font-medium mt-0.5">{selectedPatient.mobileNumber}</Text>
                  </View>
                  <View>
                    <Text className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Status</Text>
                    <Text className="text-sm text-emerald-600 font-bold mt-0.5">Active</Text>
                  </View>
                </View>
                <View className="flex-row flex-wrap gap-3 mb-6">
                  <Pressable
                    onPress={() => CustomAlert.alert('Call', `Calling ${selectedPatient.mobileNumber}...`)}
                    className="flex-1 min-w-[45%] bg-emerald-50 rounded-2xl p-4 items-center gap-2 border border-emerald-100 active:opacity-80"
                  >
                    <Phone size={20} color="#22C55E" />
                    <Text className="text-xs font-bold text-emerald-700">Call Patient</Text>
                  </Pressable>
                  <Pressable
                    onPress={openBookingForPatient}
                    className="flex-1 min-w-[45%] bg-blue-50 rounded-2xl p-4 items-center gap-2 border border-blue-100 active:opacity-80"
                  >
                    <Calendar size={20} color="#1A73E8" />
                    <Text className="text-xs font-bold text-blue-700">Book Appt</Text>
                  </Pressable>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Book Appointment Modal ── */}
      <Modal visible={bookingModalVisible} animationType="slide" transparent>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl" style={{ maxHeight: '92%' }}>
            {/* Header */}
            <View className="flex-row items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
              <View>
                <Text className="text-lg font-bold text-midnight">Book Appointment</Text>
                {selectedPatient && <Text className="text-xs text-slate-400 mt-0.5">{selectedPatient.fullName}</Text>}
              </View>
              <View className="flex-row items-center gap-3">
                <View className="flex-row items-center gap-1.5">
                  <View className={`w-2 h-2 rounded-full ${bookingStep >= 1 ? 'bg-primary' : 'bg-slate-200'}`} />
                  <View className={`w-2 h-2 rounded-full ${bookingStep >= 2 ? 'bg-primary' : 'bg-slate-200'}`} />
                </View>
                <Pressable onPress={() => setBookingModalVisible(false)} className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center">
                  <X size={16} color="#64748B" />
                </Pressable>
              </View>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>

              {/* ── Step 1: Priority + Doctor ── */}
              {bookingStep === 1 && (
                <View className="px-6 pt-4">
                  <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Appointment Category</Text>
                  <View className="flex-row gap-3 mb-5">
                    <Pressable
                      onPress={() => setBookingPriority('normal')}
                      className={`flex-1 flex-row items-center justify-center gap-2 py-3 rounded-2xl border active:opacity-80 ${bookingPriority === 'normal' ? 'bg-primary border-primary' : 'bg-white border-slate-200'}`}
                      style={bookingPriority !== 'normal' ? Shadows.card : undefined}
                    >
                      <Calendar size={16} color={bookingPriority === 'normal' ? '#fff' : '#64748B'} />
                      <Text className={`text-sm font-bold ${bookingPriority === 'normal' ? 'text-white' : 'text-slate-600'}`}>Regular</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setBookingPriority('emergency')}
                      className={`flex-1 flex-row items-center justify-center gap-2 py-3 rounded-2xl border active:opacity-80 ${bookingPriority === 'emergency' ? 'bg-red-600 border-red-600' : 'bg-red-50 border-red-200'}`}
                      style={bookingPriority !== 'emergency' ? Shadows.card : undefined}
                    >
                      <AlertTriangle size={16} color={bookingPriority === 'emergency' ? '#fff' : '#DC2626'} />
                      <Text className={`text-sm font-bold ${bookingPriority === 'emergency' ? 'text-white' : 'text-red-600'}`}>Emergency</Text>
                    </Pressable>
                  </View>

                  <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Select Doctor</Text>
                  {doctorsLoading ? (
                    <View className="items-center py-10">
                      <ActivityIndicator size="large" color={Colors.primary} />
                      <Text className="text-slate-400 text-sm mt-2">Loading doctors...</Text>
                    </View>
                  ) : doctors.length === 0 ? (
                    <View className="items-center py-10">
                      <Stethoscope size={40} color="#CBD5E1" />
                      <Text className="text-slate-400 text-sm mt-3">No doctors available</Text>
                    </View>
                  ) : (
                    <View className="gap-3">
                      {doctors.map((doc) => {
                        const isSelected = selectedDoctor?.id === doc.id;
                        return (
                          <Pressable
                            key={doc.id}
                            onPress={() => setSelectedDoctor(doc)}
                            className={`flex-row items-center gap-4 p-4 rounded-2xl border active:opacity-80 ${isSelected ? 'border-primary bg-primary/5' : 'border-slate-100 bg-white'}`}
                            style={isSelected ? undefined : Shadows.card}
                          >
                            <View className={`w-12 h-12 rounded-xl items-center justify-center ${isSelected ? 'bg-primary' : 'bg-primary/10'}`}>
                              <Stethoscope size={20} color={isSelected ? '#fff' : Colors.primary} />
                            </View>
                            <View className="flex-1">
                              <Text className="font-bold text-sm text-midnight">{doc.name}</Text>
                              <Text className="text-xs text-primary font-medium mt-0.5">{doc.specialty}</Text>
                              <Text className="text-[10px] text-slate-400 mt-0.5">Fee: ₹{doc.consultationFee}</Text>
                            </View>
                            {isSelected && (
                              <View className="w-6 h-6 rounded-full bg-primary items-center justify-center">
                                <Text className="text-white text-xs font-bold">✓</Text>
                              </View>
                            )}
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                  <Pressable
                    onPress={() => {
                      if (selectedDoctor) setBookingStep(2);
                      else CustomAlert.alert('Select Doctor', 'Please select a doctor to continue.');
                    }}
                    className={`mt-5 w-full py-4 rounded-full items-center ${selectedDoctor ? 'bg-primary' : 'bg-slate-200'}`}
                    style={selectedDoctor ? Shadows.focus : undefined}
                  >
                    <Text className={`font-bold text-base ${selectedDoctor ? 'text-white' : 'text-slate-400'}`}>
                      Next → Date & Time
                    </Text>
                  </Pressable>
                </View>
              )}

              {/* ── Step 2: Date + Slots from API ── */}
              {bookingStep === 2 && (
                <View className="px-6 pt-4">
                  {/* Selected doctor summary */}
                  {selectedDoctor && (
                    <Pressable
                      onPress={() => setBookingStep(1)}
                      className="flex-row items-center gap-3 mb-5 bg-primary/5 p-3 rounded-2xl border border-primary/20 active:opacity-70"
                    >
                      <Stethoscope size={16} color={Colors.primary} />
                      <View className="flex-1">
                        <Text className="font-bold text-sm text-midnight">{selectedDoctor.name}</Text>
                        <Text className="text-xs text-primary">{selectedDoctor.specialty} · ₹{selectedDoctor.consultationFee}</Text>
                      </View>
                      <Text className="text-xs text-primary font-semibold">Change</Text>
                    </Pressable>
                  )}

                  {/* Date chips */}
                  <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Select Date</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
                    {DATE_OPTIONS.map((d) => {
                      const isSelected = selectedDate === d.value;
                      return (
                        <Pressable
                          key={d.value}
                          onPress={() => setSelectedDate(d.value)}
                          className={`px-4 py-2.5 rounded-full border active:opacity-80 ${isSelected ? 'bg-primary border-primary' : 'bg-white border-slate-200'}`}
                          style={!isSelected ? Shadows.card : undefined}
                        >
                          <Text className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-midnight'}`}>{d.label}</Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>

                  {/* Time slots */}
                  <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-5 mb-3">
                    Select Time{selectedDate === DATE_OPTIONS[0].value ? ' (Today — future slots only)' : ''}
                  </Text>

                  {slotsLoading ? (
                    <View className="py-8 items-center">
                      <ActivityIndicator color={Colors.primary} />
                      <Text className="text-slate-400 text-xs mt-2">Loading available slots...</Text>
                    </View>
                  ) : !hasAnySlot ? (
                    <View className="py-6 items-center">
                      <Clock size={28} color="#CBD5E1" />
                      <Text className="text-slate-400 text-xs mt-2 text-center">
                        {selectedDate === DATE_OPTIONS[0].value
                          ? 'No more slots available today.'
                          : 'No slots available on this date.'}
                      </Text>
                      <Text className="text-slate-300 text-xs mt-1 text-center">Please select a different date.</Text>
                    </View>
                  ) : (
                    slotGroups.map((group) => {
                      const PeriodIcon = PERIOD_ICONS[group.period] ?? Clock;
                      const periodColor = PERIOD_COLORS[group.period] ?? '#94A3B8';
                      return (
                        <View key={group.period} className="mb-4">
                          {/* Period header */}
                          <View className="flex-row items-center gap-2 mb-2">
                            <PeriodIcon size={13} color={periodColor} />
                            <Text className="text-xs font-bold" style={{ color: periodColor }}>
                              {group.period}
                            </Text>
                            <Text className="text-[10px] text-slate-400 font-medium">
                              · {group.slots.filter((s) => s.isAvailable).length} of {group.slots.length} available
                            </Text>
                          </View>
                          {/* Slot chips */}
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

                  <Pressable
                    onPress={handleBookingSubmit}
                    disabled={!selectedSlot || bookingSubmitting}
                    className={`mt-4 w-full py-4 rounded-full items-center flex-row justify-center gap-2 ${selectedSlot && !bookingSubmitting ? 'bg-primary' : 'bg-slate-200'}`}
                    style={selectedSlot && !bookingSubmitting ? Shadows.focus : undefined}
                  >
                    <Calendar size={18} color={selectedSlot && !bookingSubmitting ? '#fff' : '#94A3B8'} />
                    <Text className={`font-bold text-base ${selectedSlot && !bookingSubmitting ? 'text-white' : 'text-slate-400'}`}>
                      {bookingSubmitting ? 'Booking...' : 'Confirm Appointment'}
                    </Text>
                  </Pressable>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
