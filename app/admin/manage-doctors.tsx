import { CustomAlert } from '@/components/CustomAlert';
import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, ActivityIndicator, Modal, RefreshControl, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Shadows, Colors } from '@/constants/theme';
import {
  ArrowLeft, Stethoscope, Plus, ChevronDown, Clock, Video, Building2,
  Star, Briefcase, Calendar, X, Check, Trash2, Edit3, Languages,
  IndianRupee, BookOpen,
} from 'lucide-react-native';
import { api } from '@/services/api';

/* ───── Types ───── */

interface DoctorSchedule {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  consultationType: string;
  isActive: boolean;
}

interface DoctorProfile {
  id: string;
  userId: string;
  doctorName: string;
  specialty: string;
  experienceYears: number;
  consultationFee: number;
  availableForVideo: boolean;
  availableForInPerson: boolean;
  languages: string | null;
  rating: number | null;
  reviewCount: number;
  bio: string | null;
  isAcceptingAppointments: boolean;
  createdAt: string;
  schedules: DoctorSchedule[];
}

interface DoctorUser {
  id: string;
  fullName: string;
  role: string;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FULL_DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/* ───── Sub-components ───── */

const ScheduleBadge = React.memo(function ScheduleBadge({
  schedule,
  onDelete,
}: {
  schedule: DoctorSchedule;
  onDelete: () => void;
}) {
  return (
    <View className="bg-slate-50 rounded-xl px-3 py-2 mr-2 mb-2" style={{ minWidth: 100 }}>
      <Text className="text-xs font-bold text-midnight">{DAY_NAMES[schedule.dayOfWeek]}</Text>
      <Text className="text-[10px] text-slate-400">{schedule.startTime} - {schedule.endTime}</Text>
      <Text className="text-[9px] text-primary font-medium mb-1.5">{schedule.consultationType} ({schedule.slotDurationMinutes}min)</Text>
      <Pressable onPress={onDelete} className="p-1.5 rounded-full bg-rose-50 self-start active:opacity-70">
        <Trash2 size={12} color="#E11D48" />
      </Pressable>
    </View>
  );
});

const DoctorProfileCard = React.memo(function DoctorProfileCard({
  profile,
  onEdit,
  onDelete,
  onAddSchedule,
  onDeleteSchedule,
}: {
  profile: DoctorProfile;
  onEdit: () => void;
  onDelete: () => void;
  onAddSchedule: () => void;
  onDeleteSchedule: (scheduleId: string) => void;
}) {
  return (
    <View className="bg-white rounded-[20px] mb-4 overflow-hidden" style={Shadows.card}>
      {/* Header */}
      <View className="px-5 py-4 bg-blue-50 flex-row items-center gap-3">
        <View className="w-14 h-14 rounded-2xl bg-white items-center justify-center" style={Shadows.card}>
          <Text className="text-lg font-bold text-primary">
            {profile.doctorName.split(' ').filter(w => w.length > 0).slice(0, 2).map(w => w[0]).join('').toUpperCase()}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="font-bold text-[15px] text-midnight">{profile.doctorName}</Text>
          <Text className="text-primary text-xs font-semibold">{profile.specialty}</Text>
          <View className="flex-row items-center gap-2 mt-1">
            <View className="flex-row items-center gap-1">
              <Briefcase size={10} color="#94A3B8" />
              <Text className="text-[10px] text-slate-400">{profile.experienceYears} yrs</Text>
            </View>
            <View className="w-1 h-1 rounded-full bg-slate-300" />
            <Text className="text-[10px] text-midnight font-bold">{'\u20B9'}{profile.consultationFee}</Text>
            {profile.rating != null && (
              <>
                <View className="w-1 h-1 rounded-full bg-slate-300" />
                <View className="flex-row items-center gap-0.5">
                  <Star size={9} color="#EAB308" fill="#EAB308" />
                  <Text className="text-[10px] text-midnight font-bold">{profile.rating}</Text>
                </View>
              </>
            )}
          </View>
        </View>
        {/* Actions */}
        <View className="flex-row gap-2">
          <Pressable onPress={onEdit} className="w-8 h-8 rounded-full bg-white items-center justify-center" style={Shadows.card}>
            <Edit3 size={14} color={Colors.primary} />
          </Pressable>
          <Pressable onPress={onDelete} className="w-8 h-8 rounded-full bg-white items-center justify-center" style={Shadows.card}>
            <Trash2 size={14} color="#E11D48" />
          </Pressable>
        </View>
      </View>

      <View className="px-5 py-4">
        {/* Availability badges */}
        <View className="flex-row gap-2 mb-3">
          {profile.availableForVideo && (
            <View className="flex-row items-center gap-1 bg-violet-50 px-2.5 py-1 rounded-full">
              <Video size={10} color="#7C3AED" />
              <Text className="text-[10px] text-violet-600 font-bold">Video</Text>
            </View>
          )}
          {profile.availableForInPerson && (
            <View className="flex-row items-center gap-1 bg-blue-50 px-2.5 py-1 rounded-full">
              <Building2 size={10} color={Colors.primary} />
              <Text className="text-[10px] text-primary font-bold">In-Person</Text>
            </View>
          )}
          <View className={`flex-row items-center gap-1 px-2.5 py-1 rounded-full ${profile.isAcceptingAppointments ? 'bg-emerald-50' : 'bg-rose-50'}`}>
            <View className={`w-1.5 h-1.5 rounded-full ${profile.isAcceptingAppointments ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            <Text className={`text-[10px] font-bold ${profile.isAcceptingAppointments ? 'text-emerald-600' : 'text-rose-600'}`}>
              {profile.isAcceptingAppointments ? 'Accepting' : 'Not Accepting'}
            </Text>
          </View>
        </View>

        {profile.languages && (
          <Text className="text-[11px] text-slate-400 mb-3">{profile.languages}</Text>
        )}

        {/* Schedules */}
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-xs font-bold text-midnight">Schedule Blocks</Text>
          <Pressable onPress={onAddSchedule} className="flex-row items-center gap-1 active:opacity-70">
            <Plus size={12} color={Colors.primary} />
            <Text className="text-primary text-[11px] font-bold">Add</Text>
          </Pressable>
        </View>

        {profile.schedules.length === 0 ? (
          <View className="bg-amber-50 rounded-xl p-3 flex-row items-center gap-2">
            <Clock size={14} color="#D97706" />
            <Text className="text-amber-700 text-xs font-medium flex-1">No schedule blocks yet. Add at least one to enable booking.</Text>
          </View>
        ) : (
          <View className="flex-row flex-wrap">
            {profile.schedules.map((s) => (
              <ScheduleBadge key={s.id} schedule={s} onDelete={() => onDeleteSchedule(s.id)} />
            ))}
          </View>
        )}
      </View>
    </View>
  );
});

/* ───── Main Screen ───── */

export default function ManageDoctorsScreen() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<DoctorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Create profile modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [doctorUsers, setDoctorUsers] = useState<DoctorUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [expYears, setExpYears] = useState('');
  const [fee, setFee] = useState('');
  const [languages, setLanguages] = useState('');
  const [bio, setBio] = useState('');
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [inPersonEnabled, setInPersonEnabled] = useState(true);
  const [creating, setCreating] = useState(false);

  // Add schedule modal state
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleProfileId, setScheduleProfileId] = useState('');
  const [scheduleDay, setScheduleDay] = useState(1);
  const [scheduleStart, setScheduleStart] = useState('09:00');
  const [scheduleEnd, setScheduleEnd] = useState('12:00');
  const [scheduleDuration, setScheduleDuration] = useState('30');
  const [scheduleType, setScheduleType] = useState('both');
  const [addingSchedule, setAddingSchedule] = useState(false);

  const fetchProfiles = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const { data } = await api.get('/admin/doctor-profiles');
      setProfiles(data.profiles || []);
    } catch (err: any) {
      console.error('Failed to load doctor profiles:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchProfiles(); }, [fetchProfiles]);

  // Fetch doctor users without profiles for the create modal
  const openCreateModal = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/users', { params: { role: 'doctor', pageSize: 100 } });
      const existingUserIds = new Set(profiles.map(p => p.userId));
      const available = (data.users || [])
        .filter((u: any) => !existingUserIds.has(u.id))
        .map((u: any) => ({ id: u.id, fullName: u.fullName, role: u.role }));
      setDoctorUsers(available);
      if (available.length > 0) setSelectedUserId(available[0].id);
      setShowCreateModal(true);
    } catch (err: any) {
      CustomAlert.alert('Error', 'Failed to load doctor users.');
    }
  }, [profiles]);

  const handleCreateProfile = useCallback(async () => {
    if (!selectedUserId || !specialty.trim() || !fee.trim()) {
      CustomAlert.alert('Validation', 'Please fill in User, Specialty, and Fee.');
      return;
    }
    setCreating(true);
    try {
      await api.post('/admin/doctor-profiles', {
        userId: selectedUserId,
        specialty: specialty.trim(),
        experienceYears: parseInt(expYears || '0', 10),
        consultationFee: parseFloat(fee),
        availableForVideo: videoEnabled,
        availableForInPerson: inPersonEnabled,
        languages: languages.trim() || null,
        bio: bio.trim() || null,
      });
      setShowCreateModal(false);
      setSpecialty(''); setExpYears(''); setFee(''); setLanguages(''); setBio('');
      fetchProfiles(true);
      CustomAlert.alert('Success', 'Doctor profile created.');
    } catch (err: any) {
      CustomAlert.alert('Error', err.response?.data?.error || 'Failed to create profile.');
    } finally {
      setCreating(false);
    }
  }, [selectedUserId, specialty, expYears, fee, videoEnabled, inPersonEnabled, languages, bio, fetchProfiles]);

  const handleDeleteProfile = useCallback((profile: DoctorProfile) => {
    CustomAlert.alert('Delete Profile', `Remove doctor profile for ${profile.doctorName}? This will also delete all schedules.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/admin/doctor-profiles/${profile.id}`);
            fetchProfiles(true);
          } catch (err: any) {
            CustomAlert.alert('Error', err.response?.data?.error || 'Failed to delete.');
          }
        },
      },
    ]);
  }, [fetchProfiles]);

  const openAddSchedule = useCallback((profileId: string) => {
    setScheduleProfileId(profileId);
    setScheduleDay(1);
    setScheduleStart('09:00');
    setScheduleEnd('12:00');
    setScheduleDuration('30');
    setScheduleType('both');
    setShowScheduleModal(true);
  }, []);

  const handleAddSchedule = useCallback(async () => {
    setAddingSchedule(true);
    try {
      await api.post('/admin/doctor-schedules', {
        doctorProfileId: scheduleProfileId,
        dayOfWeek: scheduleDay,
        startTime: scheduleStart,
        endTime: scheduleEnd,
        slotDurationMinutes: parseInt(scheduleDuration, 10),
        consultationType: scheduleType,
      });
      setShowScheduleModal(false);
      fetchProfiles(true);
    } catch (err: any) {
      CustomAlert.alert('Error', err.response?.data?.error || 'Failed to add schedule.');
    } finally {
      setAddingSchedule(false);
    }
  }, [scheduleProfileId, scheduleDay, scheduleStart, scheduleEnd, scheduleDuration, scheduleType, fetchProfiles]);

  const handleDeleteSchedule = useCallback(async (scheduleId: string) => {
    try {
      await api.delete(`/admin/doctor-schedules/${scheduleId}`);
      fetchProfiles(true);
    } catch (err: any) {
      CustomAlert.alert('Error', err.response?.data?.error || 'Failed to delete schedule.');
    }
  }, [fetchProfiles]);

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-4 pt-2 pb-3 gap-3">
        <Pressable onPress={() => router.back()} className="p-2 -ml-2 rounded-full">
          <ArrowLeft size={22} color="#0B1B3D" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-xl font-bold text-midnight tracking-tight">Doctor Profiles</Text>
          <Text className="text-slate-400 text-xs">{profiles.length} profiles configured</Text>
        </View>
        <Pressable
          onPress={openCreateModal}
          className="w-10 h-10 rounded-full bg-primary items-center justify-center"
          style={Shadows.focus}
        >
          <Plus size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchProfiles(true)} tintColor={Colors.primary} />
        }
      >
        {loading ? (
          <View className="items-center pt-20">
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text className="text-slate-400 text-sm mt-4">Loading doctor profiles...</Text>
          </View>
        ) : profiles.length === 0 ? (
          <View className="items-center pt-20">
            <Stethoscope size={48} color="#CBD5E1" />
            <Text className="text-slate-400 text-base font-medium mt-4">No doctor profiles yet</Text>
            <Text className="text-slate-300 text-xs mt-1 text-center">Create a profile for each doctor user{'\n'}to enable patient booking.</Text>
            <Pressable
              onPress={openCreateModal}
              className="mt-5 bg-primary px-6 py-3 rounded-full flex-row items-center gap-2"
              style={Shadows.focus}
            >
              <Plus size={14} color="#FFFFFF" />
              <Text className="text-white font-bold text-sm">Create Doctor Profile</Text>
            </Pressable>
          </View>
        ) : (
          profiles.map((p) => (
            <DoctorProfileCard
              key={p.id}
              profile={p}
              onEdit={() => CustomAlert.alert('Edit', 'Edit functionality coming soon.')}
              onDelete={() => handleDeleteProfile(p)}
              onAddSchedule={() => openAddSchedule(p.id)}
              onDeleteSchedule={handleDeleteSchedule}
            />
          ))
        )}
      </ScrollView>

      {/* ───── Create Profile Modal ───── */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View className="flex-1 bg-black/50 justify-end">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View className="bg-white rounded-t-[28px] p-6 max-h-[85%]">
              <View className="flex-row items-center justify-between mb-5">
                <Text className="text-lg font-bold text-midnight">Create Doctor Profile</Text>
                <Pressable onPress={() => setShowCreateModal(false)} className="p-2 -mr-2">
                  <X size={20} color="#94A3B8" />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Select Doctor User */}
                <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Doctor User</Text>
                {doctorUsers.length === 0 ? (
                  <View className="bg-amber-50 rounded-xl p-3 mb-4">
                    <Text className="text-amber-700 text-xs">No doctor users without profiles. Create a doctor user first.</Text>
                  </View>
                ) : (
                  <View className="mb-4">
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {doctorUsers.map((u) => (
                        <Pressable
                          key={u.id}
                          onPress={() => setSelectedUserId(u.id)}
                          className={`mr-2 px-4 py-2.5 rounded-xl border-2 ${selectedUserId === u.id ? 'border-primary bg-primary/5' : 'border-slate-100 bg-white'}`}
                        >
                          <Text className={`text-sm font-bold ${selectedUserId === u.id ? 'text-primary' : 'text-slate-600'}`}>{u.fullName}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Specialty */}
                <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Specialty *</Text>
                <TextInput
                  className="bg-slate-50 rounded-xl px-4 py-3 text-sm text-midnight mb-4"
                  placeholder="e.g. Cardiologist"
                  placeholderTextColor="#94A3B8"
                  value={specialty}
                  onChangeText={setSpecialty}
                />

                {/* Experience + Fee row */}
                <View className="flex-row gap-3 mb-4">
                  <View className="flex-1">
                    <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Exp (years)</Text>
                    <TextInput
                      className="bg-slate-50 rounded-xl px-4 py-3 text-sm text-midnight"
                      placeholder="12"
                      placeholderTextColor="#94A3B8"
                      keyboardType="number-pad"
                      value={expYears}
                      onChangeText={setExpYears}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Fee ({'\u20B9'}) *</Text>
                    <TextInput
                      className="bg-slate-50 rounded-xl px-4 py-3 text-sm text-midnight"
                      placeholder="800"
                      placeholderTextColor="#94A3B8"
                      keyboardType="number-pad"
                      value={fee}
                      onChangeText={setFee}
                    />
                  </View>
                </View>

                {/* Languages */}
                <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Languages</Text>
                <TextInput
                  className="bg-slate-50 rounded-xl px-4 py-3 text-sm text-midnight mb-4"
                  placeholder="Tamil, English, Hindi"
                  placeholderTextColor="#94A3B8"
                  value={languages}
                  onChangeText={setLanguages}
                />

                {/* Consultation types */}
                <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Available For</Text>
                <View className="flex-row gap-3 mb-4">
                  <Pressable
                    onPress={() => setVideoEnabled(!videoEnabled)}
                    className={`flex-1 flex-row items-center justify-center gap-2 py-3 rounded-xl border-2 ${videoEnabled ? 'border-primary bg-primary/5' : 'border-slate-100 bg-white'}`}
                  >
                    <Video size={16} color={videoEnabled ? Colors.primary : '#94A3B8'} />
                    <Text className={`text-sm font-bold ${videoEnabled ? 'text-primary' : 'text-slate-400'}`}>Video</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setInPersonEnabled(!inPersonEnabled)}
                    className={`flex-1 flex-row items-center justify-center gap-2 py-3 rounded-xl border-2 ${inPersonEnabled ? 'border-primary bg-primary/5' : 'border-slate-100 bg-white'}`}
                  >
                    <Building2 size={16} color={inPersonEnabled ? Colors.primary : '#94A3B8'} />
                    <Text className={`text-sm font-bold ${inPersonEnabled ? 'text-primary' : 'text-slate-400'}`}>In-Person</Text>
                  </Pressable>
                </View>

                {/* Bio */}
                <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Bio (Optional)</Text>
                <TextInput
                  className="bg-slate-50 rounded-xl px-4 py-3 text-sm text-midnight mb-6"
                  placeholder="Brief description..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={3}
                  value={bio}
                  onChangeText={setBio}
                />

                {/* Create button */}
                <Pressable
                  onPress={handleCreateProfile}
                  disabled={creating || doctorUsers.length === 0}
                  className={`py-4 rounded-full items-center flex-row justify-center gap-2 mb-6 ${creating || doctorUsers.length === 0 ? 'bg-slate-200' : 'bg-primary'}`}
                  style={creating || doctorUsers.length === 0 ? undefined : Shadows.focus}
                >
                  {creating ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Check size={18} color={doctorUsers.length === 0 ? '#94A3B8' : '#FFFFFF'} />
                      <Text className={`font-bold text-base ${doctorUsers.length === 0 ? 'text-slate-400' : 'text-white'}`}>Create Profile</Text>
                    </>
                  )}
                </Pressable>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ───── Add Schedule Modal ───── */}
      <Modal visible={showScheduleModal} animationType="slide" transparent>
        <View className="flex-1 bg-black/50 justify-end">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View className="bg-white rounded-t-[28px] p-6">
              <View className="flex-row items-center justify-between mb-5">
                <Text className="text-lg font-bold text-midnight">Add Schedule Block</Text>
                <Pressable onPress={() => setShowScheduleModal(false)} className="p-2 -mr-2">
                  <X size={20} color="#94A3B8" />
                </Pressable>
              </View>

              {/* Day Selection */}
              <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Day of Week</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                {DAY_NAMES.map((name, idx) => (
                  <Pressable
                    key={idx}
                    onPress={() => setScheduleDay(idx)}
                    className={`w-12 h-12 rounded-xl items-center justify-center mr-2 ${scheduleDay === idx ? 'bg-primary' : 'bg-slate-100'}`}
                  >
                    <Text className={`text-xs font-bold ${scheduleDay === idx ? 'text-white' : 'text-slate-500'}`}>{name}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              {/* Time row */}
              <View className="flex-row gap-3 mb-4">
                <View className="flex-1">
                  <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Start Time</Text>
                  <TextInput
                    className="bg-slate-50 rounded-xl px-4 py-3 text-sm text-midnight"
                    placeholder="09:00"
                    placeholderTextColor="#94A3B8"
                    value={scheduleStart}
                    onChangeText={setScheduleStart}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">End Time</Text>
                  <TextInput
                    className="bg-slate-50 rounded-xl px-4 py-3 text-sm text-midnight"
                    placeholder="12:00"
                    placeholderTextColor="#94A3B8"
                    value={scheduleEnd}
                    onChangeText={setScheduleEnd}
                  />
                </View>
              </View>

              {/* Duration + Type */}
              <View className="flex-row gap-3 mb-4">
                <View className="flex-1">
                  <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Slot Duration</Text>
                  <View className="flex-row gap-2">
                    {['15', '30', '45', '60'].map((d) => (
                      <Pressable
                        key={d}
                        onPress={() => setScheduleDuration(d)}
                        className={`flex-1 py-2.5 rounded-xl items-center ${scheduleDuration === d ? 'bg-primary' : 'bg-slate-100'}`}
                      >
                        <Text className={`text-xs font-bold ${scheduleDuration === d ? 'text-white' : 'text-slate-500'}`}>{d}m</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>

              {/* Consultation Type */}
              <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Consultation Type</Text>
              <View className="flex-row gap-2 mb-6">
                {['both', 'video', 'in-person'].map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => setScheduleType(t)}
                    className={`flex-1 py-2.5 rounded-xl items-center border-2 ${scheduleType === t ? 'border-primary bg-primary/5' : 'border-slate-100 bg-white'}`}
                  >
                    <Text className={`text-xs font-bold capitalize ${scheduleType === t ? 'text-primary' : 'text-slate-400'}`}>{t}</Text>
                  </Pressable>
                ))}
              </View>

              {/* Summary */}
              <View className="bg-slate-50 rounded-xl p-3 mb-5">
                <Text className="text-xs text-slate-500">
                  {FULL_DAY_NAMES[scheduleDay]} {scheduleStart} - {scheduleEnd}, {scheduleDuration} min slots, {scheduleType}
                </Text>
              </View>

              {/* Add button */}
              <Pressable
                onPress={handleAddSchedule}
                disabled={addingSchedule}
                className={`py-4 rounded-full items-center flex-row justify-center gap-2 ${addingSchedule ? 'bg-slate-200' : 'bg-primary'}`}
                style={addingSchedule ? undefined : Shadows.focus}
              >
                {addingSchedule ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Plus size={18} color="#FFFFFF" />
                    <Text className="text-white font-bold text-base">Add Schedule Block</Text>
                  </>
                )}
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
