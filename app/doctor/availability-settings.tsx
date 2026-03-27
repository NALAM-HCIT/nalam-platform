import { CustomAlert } from '@/components/CustomAlert';
import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, Pressable, Modal, ActivityIndicator,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Shadows, Colors } from '@/constants/theme';
import {
  ArrowLeft, Plus, Clock, Video, Building2, Users,
  ChevronDown, Trash2, Check, X,
} from 'lucide-react-native';
import {
  doctorPortalService,
  DoctorScheduleItem,
  AddSchedulePayload,
  UpdateSchedulePayload,
} from '@/services/doctorPortalService';

// ── Constants ─────────────────────────────────────────────────────────────

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const DURATION_OPTIONS = [15, 20, 30, 45, 60];
const CONSULT_TYPES: { id: 'video' | 'in-person' | 'both'; label: string; Icon: React.ElementType; color: string }[] = [
  { id: 'video', label: 'Video', Icon: Video, color: '#8B5CF6' },
  { id: 'in-person', label: 'In-Person', Icon: Building2, color: Colors.primary },
  { id: 'both', label: 'Both', Icon: Users, color: '#059669' },
];

// Generate time options 06:00–22:00 in 30-min steps
const TIME_OPTIONS: string[] = [];
for (let h = 6; h <= 22; h++) {
  TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:00`);
  if (h < 22) TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:30`);
}

function fmt12(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

// ── Default form state ─────────────────────────────────────────────────────

const defaultForm = () => ({
  dayOfWeek: 1,          // Monday
  startTime: '09:00',
  endTime: '13:00',
  slotDurationMinutes: 30,
  consultationType: 'both' as 'video' | 'in-person' | 'both',
  maxPatientsPerSlot: 3,
});

// ── Sub-components ─────────────────────────────────────────────────────────

const TimePickerRow = React.memo(function TimePickerRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (t: string) => void;
}) {
  return (
    <View className="mb-4">
      <Text className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">{label}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {TIME_OPTIONS.map((t) => {
          const isSelected = t === value;
          return (
            <Pressable
              key={t}
              onPress={() => onChange(t)}
              className={`px-3 py-2 rounded-xl ${isSelected ? 'bg-primary' : 'bg-slate-100'}`}
            >
              <Text className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-600'}`}>
                {fmt12(t)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
});

// ── Main Screen ────────────────────────────────────────────────────────────

export default function AvailabilitySettingsScreen() {
  const router = useRouter();
  const [schedules, setSchedules] = useState<DoctorScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null); // null = add mode
  const [form, setForm] = useState(defaultForm());

  // ── Load schedules ────────────────────────────────────────────────────

  const loadSchedules = useCallback(async () => {
    try {
      setLoading(true);
      const data = await doctorPortalService.getMySchedule();
      setSchedules(data);
    } catch (e: any) {
      console.error('Failed to load schedule:', e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSchedules(); }, [loadSchedules]);

  // ── Open modal ────────────────────────────────────────────────────────

  const openAdd = useCallback((dayOfWeek?: number) => {
    setEditingId(null);
    setForm({ ...defaultForm(), dayOfWeek: dayOfWeek ?? 1 });
    setModalVisible(true);
  }, []);

  const openEdit = useCallback((item: DoctorScheduleItem) => {
    setEditingId(item.id);
    setForm({
      dayOfWeek: item.dayOfWeek,
      startTime: item.startTime,
      endTime: item.endTime,
      slotDurationMinutes: item.slotDurationMinutes,
      consultationType: item.consultationType,
      maxPatientsPerSlot: item.maxPatientsPerSlot,
    });
    setModalVisible(true);
  }, []);

  // ── Save ─────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (form.endTime <= form.startTime) {
      CustomAlert.alert('Invalid Time', 'End time must be after start time.');
      return;
    }

    try {
      setSaving(true);
      if (editingId) {
        const payload: UpdateSchedulePayload = {
          startTime: form.startTime,
          endTime: form.endTime,
          slotDurationMinutes: form.slotDurationMinutes,
          consultationType: form.consultationType,
          maxPatientsPerSlot: form.maxPatientsPerSlot,
        };
        const updated = await doctorPortalService.updateSchedule(editingId, payload);
        setSchedules((prev) => prev.map((s) => s.id === editingId ? updated : s));
      } else {
        const payload: AddSchedulePayload = { ...form };
        const created = await doctorPortalService.addSchedule(payload);
        setSchedules((prev) => [...prev, created].sort((a, b) =>
          a.dayOfWeek !== b.dayOfWeek ? a.dayOfWeek - b.dayOfWeek : a.startTime.localeCompare(b.startTime)
        ));
      }
      setModalVisible(false);
    } catch (e: any) {
      CustomAlert.alert('Error', e.response?.data?.error || 'Failed to save schedule.');
    } finally {
      setSaving(false);
    }
  }, [editingId, form]);

  // ── Delete ────────────────────────────────────────────────────────────

  const handleDelete = useCallback(() => {
    if (!editingId) return;
    CustomAlert.alert(
      'Remove Schedule',
      'Remove this availability block? Existing booked appointments will not be affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true);
              await doctorPortalService.deleteSchedule(editingId);
              setSchedules((prev) => prev.filter((s) => s.id !== editingId));
              setModalVisible(false);
            } catch (e: any) {
              CustomAlert.alert('Error', e.response?.data?.error || 'Failed to remove schedule.');
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );
  }, [editingId]);

  // ── Slot count preview ────────────────────────────────────────────────

  function slotCount(startTime: string, endTime: string, duration: number): number {
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const totalMins = (eh * 60 + em) - (sh * 60 + sm);
    return totalMins > 0 ? Math.floor(totalMins / duration) : 0;
  }

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-5 pt-2 pb-4 gap-3">
        <Pressable onPress={() => router.back()} className="p-2 -ml-2 rounded-full">
          <ArrowLeft size={22} color="#0B1B3D" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-xl font-bold tracking-tight text-midnight">Availability Settings</Text>
          <Text className="text-xs text-slate-400 mt-0.5">Configure your weekly consultation schedule</Text>
        </View>
        <Pressable
          onPress={() => openAdd()}
          className="flex-row items-center gap-1.5 bg-primary px-4 py-2.5 rounded-full"
          style={Shadows.focus}
        >
          <Plus size={14} color="#FFFFFF" />
          <Text className="text-white font-bold text-xs">Add Slot</Text>
        </Pressable>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text className="text-slate-400 text-sm mt-3">Loading schedule...</Text>
        </View>
      ) : (
        <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {DAYS.map((dayName, dow) => {
            const daySchedules = schedules.filter((s) => s.dayOfWeek === dow);
            return (
              <View key={dow} className="mb-4">
                {/* Day header */}
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center gap-2">
                    <View className={`w-7 h-7 rounded-lg items-center justify-center ${daySchedules.length > 0 ? 'bg-primary' : 'bg-slate-200'}`}>
                      <Text className={`text-[9px] font-extrabold ${daySchedules.length > 0 ? 'text-white' : 'text-slate-400'}`}>
                        {DAY_SHORT[dow].toUpperCase()}
                      </Text>
                    </View>
                    <Text className="text-sm font-bold text-midnight">{dayName}</Text>
                    {daySchedules.length === 0 && (
                      <Text className="text-[10px] text-slate-300 font-medium">Rest day</Text>
                    )}
                  </View>
                  <Pressable
                    onPress={() => openAdd(dow)}
                    className="w-7 h-7 rounded-full bg-slate-100 items-center justify-center active:opacity-60"
                  >
                    <Plus size={14} color="#94A3B8" />
                  </Pressable>
                </View>

                {/* Schedule blocks */}
                {daySchedules.map((item) => {
                  const ct = CONSULT_TYPES.find((c) => c.id === item.consultationType);
                  const slots = slotCount(item.startTime, item.endTime, item.slotDurationMinutes);
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => openEdit(item)}
                      className="bg-white rounded-2xl px-4 py-3.5 mb-2 flex-row items-center gap-3 active:opacity-80"
                      style={Shadows.card}
                    >
                      <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: (ct?.color ?? Colors.primary) + '15' }}>
                        {ct ? <ct.Icon size={18} color={ct.color} /> : <Clock size={18} color={Colors.primary} />}
                      </View>
                      <View className="flex-1">
                        <Text className="font-bold text-sm text-midnight">
                          {fmt12(item.startTime)} – {fmt12(item.endTime)}
                        </Text>
                        <Text className="text-[11px] text-slate-400 mt-0.5">
                          {ct?.label ?? item.consultationType} · {item.slotDurationMinutes}min slots · {slots} slots · {item.maxPatientsPerSlot} patients/slot
                        </Text>
                      </View>
                      <ChevronDown size={14} color="#CBD5E1" style={{ transform: [{ rotate: '-90deg' }] }} />
                    </Pressable>
                  );
                })}
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Add / Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl" style={{ maxHeight: '92%' }}>
            {/* Modal header */}
            <View className="flex-row items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
              <Text className="text-lg font-bold text-midnight">
                {editingId ? 'Edit Schedule' : 'Add Schedule'}
              </Text>
              <Pressable onPress={() => setModalVisible(false)} className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center">
                <X size={16} color="#64748B" />
              </Pressable>
            </View>

            <ScrollView className="px-6" contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>

              {/* Day picker (only in add mode) */}
              {!editingId && (
                <View className="mt-5 mb-4">
                  <Text className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Day of Week</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {DAYS.map((d, i) => (
                      <Pressable
                        key={i}
                        onPress={() => setForm((f) => ({ ...f, dayOfWeek: i }))}
                        className={`px-4 py-2.5 rounded-2xl items-center ${form.dayOfWeek === i ? 'bg-primary' : 'bg-slate-100'}`}
                      >
                        <Text className={`text-[10px] font-bold uppercase ${form.dayOfWeek === i ? 'text-white' : 'text-slate-500'}`}>
                          {DAY_SHORT[i]}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Start time */}
              <View className="mt-4">
                <TimePickerRow
                  label="Start Time"
                  value={form.startTime}
                  onChange={(t) => setForm((f) => ({ ...f, startTime: t }))}
                />
              </View>

              {/* End time */}
              <TimePickerRow
                label="End Time"
                value={form.endTime}
                onChange={(t) => setForm((f) => ({ ...f, endTime: t }))}
              />

              {/* Slot duration */}
              <View className="mb-4">
                <Text className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Slot Duration</Text>
                <View className="flex-row gap-2 flex-wrap">
                  {DURATION_OPTIONS.map((d) => (
                    <Pressable
                      key={d}
                      onPress={() => setForm((f) => ({ ...f, slotDurationMinutes: d }))}
                      className={`px-4 py-2 rounded-xl ${form.slotDurationMinutes === d ? 'bg-primary' : 'bg-slate-100'}`}
                    >
                      <Text className={`text-xs font-bold ${form.slotDurationMinutes === d ? 'text-white' : 'text-slate-600'}`}>
                        {d} min
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Consultation type */}
              <View className="mb-4">
                <Text className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Consultation Type</Text>
                <View className="flex-row gap-2">
                  {CONSULT_TYPES.map((ct) => {
                    const isActive = form.consultationType === ct.id;
                    return (
                      <Pressable
                        key={ct.id}
                        onPress={() => setForm((f) => ({ ...f, consultationType: ct.id }))}
                        className={`flex-1 items-center py-3 rounded-2xl border-2 ${isActive ? 'border-primary bg-primary/5' : 'border-slate-100 bg-white'}`}
                        style={isActive ? undefined : Shadows.card}
                      >
                        <ct.Icon size={18} color={isActive ? Colors.primary : '#94A3B8'} />
                        <Text className={`text-[10px] font-bold mt-1.5 ${isActive ? 'text-primary' : 'text-slate-400'}`}>
                          {ct.label}
                        </Text>
                        {isActive && <Check size={10} color={Colors.primary} style={{ marginTop: 2 }} />}
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Max patients per slot */}
              <View className="mb-5">
                <Text className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Max Patients per Slot</Text>
                <View className="flex-row items-center gap-4 bg-slate-50 rounded-2xl px-4 py-3">
                  <Pressable
                    onPress={() => setForm((f) => ({ ...f, maxPatientsPerSlot: Math.max(1, f.maxPatientsPerSlot - 1) }))}
                    className="w-9 h-9 rounded-full bg-white items-center justify-center active:opacity-60"
                    style={Shadows.card}
                  >
                    <Text className="text-lg font-bold text-midnight">−</Text>
                  </Pressable>
                  <View className="flex-1 items-center">
                    <Text className="text-2xl font-extrabold text-midnight">{form.maxPatientsPerSlot}</Text>
                    <Text className="text-[10px] text-slate-400 font-medium">patients / slot</Text>
                  </View>
                  <Pressable
                    onPress={() => setForm((f) => ({ ...f, maxPatientsPerSlot: Math.min(20, f.maxPatientsPerSlot + 1) }))}
                    className="w-9 h-9 rounded-full bg-white items-center justify-center active:opacity-60"
                    style={Shadows.card}
                  >
                    <Text className="text-lg font-bold text-midnight">+</Text>
                  </Pressable>
                </View>
              </View>

              {/* Preview summary */}
              {form.endTime > form.startTime && (
                <View className="bg-primary/5 border border-primary/20 rounded-2xl px-4 py-3 mb-5">
                  <Text className="text-xs font-bold text-primary mb-1">Preview</Text>
                  <Text className="text-sm text-midnight font-medium">
                    {DAYS[form.dayOfWeek]}: {fmt12(form.startTime)} – {fmt12(form.endTime)}
                  </Text>
                  <Text className="text-xs text-slate-500 mt-0.5">
                    {slotCount(form.startTime, form.endTime, form.slotDurationMinutes)} slots of {form.slotDurationMinutes} min · up to {form.maxPatientsPerSlot} patients each
                  </Text>
                </View>
              )}

              {/* Buttons */}
              <Pressable
                onPress={handleSave}
                disabled={saving}
                className="w-full bg-primary py-4 rounded-full items-center mb-3"
                style={Shadows.focus}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text className="text-white font-bold text-base">
                    {editingId ? 'Save Changes' : 'Add Schedule'}
                  </Text>
                )}
              </Pressable>

              {editingId && (
                <Pressable
                  onPress={handleDelete}
                  disabled={saving}
                  className="w-full py-4 rounded-full items-center flex-row justify-center gap-2 border border-rose-200 bg-rose-50"
                >
                  <Trash2 size={14} color="#E11D48" />
                  <Text className="text-rose-500 font-bold text-sm">Remove Schedule</Text>
                </Pressable>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
