import { CustomAlert } from '@/components/CustomAlert';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Shadows, Colors } from '@/constants/theme';
import {
  Mic, MicOff, Video, VideoOff, User, ArrowLeft, Clock,
  Search, Plus, X, Pill,
} from 'lucide-react-native';
import { agoraService } from '@/services/agoraService';
import { AgoraSurfaceView, isAgoraAvailable } from '@/components/AgoraSurface';
import { getAppointmentDetail, DoctorAppointment } from '@/services/doctorService';
import {
  medicineService, MedicineCatalogItem,
  AddPrescriptionItemPayload,
} from '@/services/doctorPortalService';

function formatTime(t: string): string {
  const [hh, mm] = t.split(':');
  const h = parseInt(hh, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${mm} ${ampm}`;
}

export default function ActiveConsultationScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [appointment, setAppointment] = useState<DoctorAppointment | null>(null);
  const [loading, setLoading] = useState(true);

  const [chiefComplaint, setChiefComplaint] = useState('');
  const [observations, setObservations] = useState('');
  const [isDictating, setIsDictating] = useState(false);
  const [timer, setTimer] = useState(0);
  const [remoteUid, setRemoteUid] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);

  // Prescription state
  const [rxItems, setRxItems] = useState<AddPrescriptionItemPayload[]>([]);
  const [medSearch, setMedSearch] = useState('');
  const [medResults, setMedResults] = useState<MedicineCatalogItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [pendingDosage, setPendingDosage] = useState('');
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Agora Lifecycle
  useEffect(() => {
    if (!id || !appointment || appointment.consultationType !== 'video') return;

    let mounted = true;
    async function setupAgora() {
      try {
        await agoraService.init({
          onUserJoined: (connection, uid) => { if (mounted) setRemoteUid(uid); },
          onUserOffline: () => { if (mounted) setRemoteUid(null); },
        });
        await agoraService.join(`consultation_${id}`);
      } catch (err) {
        console.error('Agora Init Error', err);
      }
    }
    setupAgora();
    return () => { mounted = false; agoraService.leave(); };
  }, [id, appointment]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const data = await getAppointmentDetail(id);
        setAppointment(data);
      } catch (err) {
        console.error('Failed to load appointment:', err);
        CustomAlert.alert('Error', 'Could not load appointment details.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    const interval = setInterval(() => setTimer((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const fmtTimer = (s: number) => {
    const h = String(Math.floor(s / 3600)).padStart(2, '0');
    const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    const sec = String(s % 60).padStart(2, '0');
    return `${h}:${m}:${sec}`;
  };

  const handleDictate = () => {
    setIsDictating(true);
    setTimeout(() => {
      setChiefComplaint((prev) =>
        prev + 'Patient reports persistent headache and mild fatigue for the past 3 days. '
      );
      setIsDictating(false);
    }, 1500);
  };

  // Medicine search with debounce
  const handleMedSearchChange = useCallback((text: string) => {
    setMedSearch(text);
    setShowResults(text.trim().length > 0);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!text.trim()) { setMedResults([]); return; }
    searchTimeout.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await medicineService.search({ search: text, pageSize: 8 });
        setMedResults(res.medicines);
      } catch {
        /* silent */
      } finally {
        setSearchLoading(false);
      }
    }, 350);
  }, []);

  const handleAddMedicine = (med: MedicineCatalogItem) => {
    const dosage = pendingDosage.trim() || `${med.strength ?? med.dosageForm}`;
    setRxItems((prev) => [
      ...prev,
      {
        medicineId: med.id,
        medicineName: med.name,
        dosageInstructions: dosage,
        quantity: 1,
      },
    ]);
    setMedSearch('');
    setPendingDosage('');
    setMedResults([]);
    setShowResults(false);
  };

  const handleRemoveItem = (index: number) => {
    setRxItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEndConsultation = () => {
    if (!chiefComplaint.trim()) {
      CustomAlert.alert('Required', 'Please enter the chief complaint before proceeding.');
      return;
    }
    router.push({
      pathname: '/doctor/consultation-summary',
      params: {
        id: id!,
        chiefComplaint,
        observations,
        rxItems: JSON.stringify(rxItems),
        sessionDuration: fmtTimer(timer),
      },
    });
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#F8FAFC] items-center justify-center" edges={['top']}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text className="text-slate-400 text-sm mt-4">Loading consultation...</Text>
      </SafeAreaView>
    );
  }

  if (!appointment) {
    return (
      <SafeAreaView className="flex-1 bg-[#F8FAFC] items-center justify-center" edges={['top']}>
        <Text className="text-slate-500 text-base">Appointment not found.</Text>
        <Pressable onPress={() => router.back()} className="mt-4 px-6 py-3 bg-primary rounded-xl">
          <Text className="text-white font-bold">Go Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const isVideo = appointment.consultationType === 'video';

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top']}>
      {/* Header */}
      <View className="px-4 py-3 flex-row items-center justify-between border-b border-slate-100 bg-white">
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => router.back()} className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center">
            <ArrowLeft size={20} color="#0B1B3D" />
          </Pressable>
          <View>
            <Text className="text-base font-bold text-midnight">Active Consultation</Text>
            <Text className="text-[10px] text-slate-400 font-medium">{appointment.bookingReference}</Text>
          </View>
        </View>
        <View className="flex-row items-center gap-2 bg-red-50 px-3 py-1.5 rounded-full border border-red-200">
          <View className="w-2 h-2 bg-red-500 rounded-full" />
          <Text className="text-red-600 text-xs font-bold">{fmtTimer(timer)}</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Patient Info Card */}
        <View className="bg-white rounded-2xl p-4 border border-slate-100 flex-row items-center gap-4" style={Shadows.card}>
          <View className="w-14 h-14 rounded-xl items-center justify-center" style={{ backgroundColor: isVideo ? '#1D4ED815' : '#16A34A15' }}>
            {isVideo ? <Video size={22} color="#1D4ED8" /> : <User size={22} color="#16A34A" />}
          </View>
          <View className="flex-1">
            <Text className="font-bold text-lg text-midnight">{appointment.patientName || 'Patient'}</Text>
            <Text className="text-xs text-slate-500 font-medium mt-0.5">
              {isVideo ? 'Video Consultation' : 'In-Person Visit'}
            </Text>
            <View className="flex-row items-center gap-1.5 mt-1">
              <Clock size={11} color="#94A3B8" />
              <Text className="text-[11px] text-slate-400">
                {formatTime(appointment.startTime)} – {formatTime(appointment.endTime)}
              </Text>
            </View>
          </View>
          <View className="w-12 h-12 rounded-xl bg-primary/10 items-center justify-center">
            <Text className="text-primary font-bold text-base">{appointment.patientInitials || '??'}</Text>
          </View>
        </View>

        {/* Video Call Area */}
        {isVideo && (
          <View className="w-full aspect-video bg-slate-800 rounded-2xl overflow-hidden items-center justify-center" style={Shadows.card}>
            {remoteUid && isAgoraAvailable() ? (
              <AgoraSurfaceView
                canvas={{ uid: remoteUid }}
                style={{ flex: 1, width: '100%' }}
              />
            ) : (
              <View className="items-center justify-center">
                <Video size={40} color="#64748B" />
                <Text className="text-slate-400 font-semibold text-sm mt-3">
                  {!isAgoraAvailable() ? 'Video requires a development build' : 'Waiting for Patient...'}
                </Text>
              </View>
            )}

            {/* Local PIP */}
            <View className="absolute top-4 right-4 w-32 aspect-video bg-slate-900 rounded-lg border border-white/20 overflow-hidden">
              {isVideoOn && isAgoraAvailable() ? (
                <AgoraSurfaceView canvas={{ uid: 0 }} style={{ flex: 1 }} />
              ) : (
                <View className="flex-1 items-center justify-center">
                  <VideoOff size={20} color="#64748B" />
                </View>
              )}
            </View>

            <View className="absolute bottom-4 flex-row items-center gap-3">
              <Pressable
                onPress={() => { const m = !isMuted; setIsMuted(m); agoraService.toggleMute(m); }}
                className={`p-3 rounded-full ${isMuted ? 'bg-red-500' : 'bg-white/20'}`}
              >
                {isMuted ? <MicOff size={20} color="#FFFFFF" /> : <Mic size={20} color="#FFFFFF" />}
              </Pressable>
              <Pressable
                onPress={() => { const v = !isVideoOn; setIsVideoOn(v); agoraService.toggleVideo(v); }}
                className={`p-3 rounded-full ${!isVideoOn ? 'bg-red-500' : 'bg-white/20'}`}
              >
                {!isVideoOn ? <VideoOff size={20} color="#FFFFFF" /> : <Video size={20} color="#FFFFFF" />}
              </Pressable>
              <Pressable onPress={() => agoraService.leave()} className="py-3 px-6 bg-red-500 rounded-full">
                <Text className="text-white font-bold text-sm">End Call</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Chief Complaint */}
        <View className="bg-white p-5 rounded-2xl border border-slate-100" style={Shadows.card}>
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Chief Complaint *</Text>
            <Pressable
              onPress={handleDictate}
              className="flex-row items-center gap-2 bg-red-500 px-4 py-2 rounded-full"
            >
              <Mic size={14} color="#FFFFFF" />
              <Text className="text-white text-[10px] font-bold">
                {isDictating ? 'LISTENING...' : 'DICTATE'}
              </Text>
            </Pressable>
          </View>
          <TextInput
            className="w-full border border-slate-200 bg-slate-50 rounded-xl p-4 text-sm text-midnight min-h-[100px]"
            placeholder="Describe patient's chief complaint..."
            placeholderTextColor="#94A3B8"
            multiline
            textAlignVertical="top"
            value={chiefComplaint}
            onChangeText={setChiefComplaint}
          />
        </View>

        {/* Observations */}
        <View className="bg-white p-5 rounded-2xl border border-slate-100" style={Shadows.card}>
          <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-4">Observations</Text>
          <TextInput
            className="w-full border border-slate-200 bg-slate-50 rounded-xl p-4 text-sm text-midnight min-h-[80px]"
            placeholder="Clinical observations, vitals notes..."
            placeholderTextColor="#94A3B8"
            multiline
            textAlignVertical="top"
            value={observations}
            onChangeText={setObservations}
          />
        </View>

        {/* E-Prescription — Medicine Search */}
        <View className="bg-white p-5 rounded-2xl border border-slate-100" style={Shadows.card}>
          <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-4">E-Prescription</Text>

          {/* Added items */}
          {rxItems.length > 0 && (
            <View className="gap-2 mb-4">
              {rxItems.map((item, i) => (
                <View
                  key={i}
                  className="flex-row items-center gap-3 bg-primary/5 border border-primary/20 rounded-xl px-3 py-2.5"
                >
                  <View className="w-8 h-8 rounded-lg bg-primary/10 items-center justify-center">
                    <Pill size={14} color="#1A73E8" />
                  </View>
                  <View className="flex-1 min-w-0">
                    <Text className="font-bold text-sm text-midnight" numberOfLines={1}>{item.medicineName}</Text>
                    {item.dosageInstructions ? (
                      <Text className="text-[11px] text-slate-500" numberOfLines={1}>{item.dosageInstructions}</Text>
                    ) : null}
                  </View>
                  <Pressable onPress={() => handleRemoveItem(i)} className="p-1 active:opacity-60">
                    <X size={16} color="#94A3B8" />
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          {/* Dosage input (filled before selecting a medicine) */}
          <View className="mb-2">
            <Text className="text-[10px] font-bold text-slate-500 mb-1 px-1">Dosage / Instructions</Text>
            <TextInput
              className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm text-midnight"
              placeholder="e.g. 500mg twice daily after meals for 5 days"
              placeholderTextColor="#94A3B8"
              value={pendingDosage}
              onChangeText={setPendingDosage}
            />
          </View>

          {/* Medicine search */}
          <View>
            <Text className="text-[10px] font-bold text-slate-500 mb-1 px-1">Search Medicine Catalog</Text>
            <View className="flex-row items-center border border-slate-200 bg-slate-50 rounded-xl px-4">
              <Search size={16} color="#94A3B8" />
              <TextInput
                className="flex-1 ml-2 py-3 text-sm text-midnight"
                placeholder="Type medicine name..."
                placeholderTextColor="#94A3B8"
                value={medSearch}
                onChangeText={handleMedSearchChange}
                returnKeyType="search"
              />
              {medSearch.length > 0 && (
                <Pressable onPress={() => { setMedSearch(''); setMedResults([]); setShowResults(false); }}>
                  <X size={16} color="#94A3B8" />
                </Pressable>
              )}
            </View>

            {/* Search results dropdown */}
            {showResults && (
              <View className="mt-1 bg-white border border-slate-200 rounded-xl overflow-hidden" style={Shadows.card}>
                {searchLoading ? (
                  <View className="py-4 items-center">
                    <ActivityIndicator size="small" color="#1A73E8" />
                  </View>
                ) : medResults.length === 0 ? (
                  <View className="py-4 px-4">
                    <Text className="text-slate-400 text-sm text-center">No medicines found</Text>
                  </View>
                ) : (
                  medResults.map((med, i) => (
                    <Pressable
                      key={med.id}
                      onPress={() => handleAddMedicine(med)}
                      className={`flex-row items-center gap-3 px-4 py-3 active:bg-primary/5 ${
                        i < medResults.length - 1 ? 'border-b border-slate-100' : ''
                      }`}
                    >
                      <View className="w-9 h-9 rounded-lg bg-primary/10 items-center justify-center">
                        <Pill size={16} color="#1A73E8" />
                      </View>
                      <View className="flex-1 min-w-0">
                        <Text className="font-semibold text-sm text-midnight" numberOfLines={1}>{med.name}</Text>
                        <Text className="text-[11px] text-slate-400">
                          {[med.genericName, med.strength, med.dosageForm].filter(Boolean).join(' · ')}
                        </Text>
                      </View>
                      <View className="flex-row items-center gap-1 bg-primary/10 px-2 py-1 rounded-full">
                        <Plus size={10} color="#1A73E8" />
                        <Text className="text-[10px] font-bold text-primary">Add</Text>
                      </View>
                    </Pressable>
                  ))
                )}
              </View>
            )}
          </View>
        </View>

        {/* Action Button */}
        <Pressable
          onPress={handleEndConsultation}
          className="w-full bg-primary py-4 rounded-2xl items-center mt-2"
          style={Shadows.focus}
        >
          <Text className="text-white font-bold text-sm uppercase tracking-widest">
            Review & Finalize
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
