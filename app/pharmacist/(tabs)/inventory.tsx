import { CustomAlert } from '@/components/CustomAlert';
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, Modal, TextInput, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, FileText, X, User, Stethoscope, Pill, Clock } from 'lucide-react-native';
import { Shadows } from '@/constants/theme';
import { StatusChip } from '@/components';
import { pharmacistService, PrescriptionItem } from '@/services/pharmacistService';
import { isAuthError } from '@/services/api';
type RxFilter = 'all' | 'pending' | 'dispensed' | 'rejected';

const filterTabs: { label: string; value: RxFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Dispensed', value: 'dispensed' },
  { label: 'Rejected', value: 'rejected' },
];

export default function PrescriptionsScreen() {
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<RxFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRx, setSelectedRx] = useState<PrescriptionItem | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const loadPrescriptions = async () => {
    setLoading(true);
    try {
      const data = await pharmacistService.getPrescriptions(
        activeFilter !== 'all' ? activeFilter : undefined,
        searchQuery || undefined
      );
      setPrescriptions(data);
    } catch (err) {
      if (!isAuthError(err)) {
        console.error(err);
        CustomAlert.alert('Error', 'Failed to load prescriptions.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPrescriptions(); }, [activeFilter]);

  // Debounced search
  useEffect(() => {
    const delay = setTimeout(() => {
      loadPrescriptions();
    }, 500);
    return () => clearTimeout(delay);
  }, [searchQuery]);

  const onRefresh = useCallback(async () => {
    await loadPrescriptions();
  }, [activeFilter, searchQuery]);

  const getFilterCount = (status: RxFilter) => {
    if (status === 'all') return prescriptions.length;
    return prescriptions.filter((rx) => rx.prescriptionStatus === status).length;
  };

  const handleDispense = async (rx: PrescriptionItem) => {
    CustomAlert.alert(
      'Confirm Dispense',
      `Dispense prescription for ${rx.patientName}?\n\nRef: ${rx.bookingReference}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Dispense',
          onPress: async () => {
            try {
              await pharmacistService.dispensePrescription(rx.id);
              setShowDetail(false);
              setSelectedRx(null);
              loadPrescriptions();
              CustomAlert.alert('Dispensed', `${rx.bookingReference} has been dispensed.`);
            } catch (e) { CustomAlert.alert('Error', 'Failed to dispense.'); }
          },
        },
      ]
    );
  };

  const handleReject = async (rx: PrescriptionItem) => {
    CustomAlert.alert(
      'Reject Prescription',
      `Reject ${rx.bookingReference} for ${rx.patientName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Duplicate Rx',
          style: 'destructive',
          onPress: async () => {
            try {
              await pharmacistService.rejectPrescription(rx.id, 'Duplicate prescription');
              setShowDetail(false);
              setSelectedRx(null);
              loadPrescriptions();
              CustomAlert.alert('Rejected', `${rx.bookingReference} rejected.`);
            } catch (e) { CustomAlert.alert('Error', 'Failed to reject.'); }
          },
        },
        {
          text: 'Medication Unavailable',
          style: 'destructive',
          onPress: async () => {
            try {
              await pharmacistService.rejectPrescription(rx.id, 'Medication unavailable');
              setShowDetail(false);
              setSelectedRx(null);
              loadPrescriptions();
              CustomAlert.alert('Rejected', `${rx.bookingReference} rejected — meds unavailable.`);
            } catch (e) { CustomAlert.alert('Error', 'Failed to reject.'); }
          },
        },
      ]
    );
  };

  const getStatusVariant = (status: string): 'warning' | 'success' | 'danger' => {
    if (status === 'pending') return 'warning';
    if (status === 'dispensed') return 'success';
    return 'danger';
  };

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      {/* Header */}
      <View className="px-6 pt-4 pb-2">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-bold text-midnight tracking-tight">Prescriptions</Text>
            <Text className="text-xs text-slate-500 mt-0.5">Incoming prescriptions from doctors</Text>
          </View>
          <View className="px-3 py-1 rounded-full bg-primary/10">
            <Text className="text-primary text-xs font-bold">{prescriptions.length} total</Text>
          </View>
        </View>
      </View>

      {/* Search */}
      <View className="px-6 mt-2 mb-3">
        <View className="flex-row items-center bg-white rounded-2xl px-4 py-3 border border-slate-100" style={Shadows.card}>
          <Search size={18} color="#94A3B8" />
          <TextInput
            className="flex-1 ml-3 text-sm text-midnight"
            placeholder="Search patient, doctor, or reference..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} className="active:opacity-60">
              <X size={16} color="#94A3B8" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Filter Tabs */}
      <View className="mb-1">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, gap: 8 }}>
          {filterTabs.map((tab) => {
            const isActive = activeFilter === tab.value;
            return (
              <Pressable
                key={tab.value}
                onPress={() => setActiveFilter(tab.value)}
                className={`px-3.5 py-1.5 rounded-full flex-row items-center gap-1.5 ${isActive ? 'bg-primary' : 'bg-white border border-slate-100'}`}
              >
                <Text className={`text-[11px] font-bold ${isActive ? 'text-white' : 'text-slate-600'}`}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Prescription List */}
      <ScrollView
        className="flex-1 px-6 mt-4"
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor="#1A73E8" />}
      >
        {prescriptions.length === 0 && !loading ? (
          <View className="items-center py-12">
            <FileText size={40} color="#CBD5E1" />
            <Text className="text-slate-400 text-sm mt-3 font-medium">No prescriptions found</Text>
          </View>
        ) : (
          prescriptions.map((rx) => (
            <Pressable
              key={rx.id}
              onPress={() => { setSelectedRx(rx); setShowDetail(true); }}
              className="bg-white rounded-2xl p-4 mb-3 overflow-hidden active:opacity-80"
              style={Shadows.card}
            >
              <View className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ backgroundColor: rx.prescriptionStatus === 'pending' ? '#F59E0B' : rx.prescriptionStatus === 'dispensed' ? '#22C55E' : '#EF4444' }} />
              <View className="ml-2">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2 mb-1">
                      <Text className="font-extrabold text-base text-midnight">{rx.patientName}</Text>
                    </View>
                    <Text className="text-slate-500 text-xs">{rx.doctorName} - {rx.doctorSpecialty}</Text>
                    <View className="flex-row items-center gap-3 mt-1.5">
                      <View className="flex-row items-center gap-1">
                        <Clock size={10} color="#94A3B8" />
                        <Text className="text-slate-400 text-xs">{rx.time}</Text>
                      </View>
                      <Text className="text-slate-300 text-xs">{rx.bookingReference}</Text>
                    </View>
                  </View>
                  <StatusChip
                    label={rx.prescriptionStatus.toUpperCase()}
                    variant={getStatusVariant(rx.prescriptionStatus)}
                  />
                </View>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>

      {/* Prescription Detail Modal */}
      <Modal visible={showDetail} animationType="slide" transparent>
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white rounded-t-3xl max-h-[85%]" style={Shadows.presence}>
            {selectedRx && (() => {
              const rx = selectedRx;
              return (
                <>
                  <View className="flex-row items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
                    <View>
                      <Text className="text-xl font-extrabold text-midnight">{rx.bookingReference}</Text>
                      <Text className="text-xs text-slate-500 mt-0.5">{rx.time}</Text>
                    </View>
                    <Pressable onPress={() => { setShowDetail(false); setSelectedRx(null); }} className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center active:bg-slate-200">
                      <X size={18} color="#64748B" />
                    </Pressable>
                  </View>
                  <ScrollView className="px-6 py-4" showsVerticalScrollIndicator={false}>
                    {/* Patient Info */}
                    <View className="bg-slate-50 rounded-2xl p-4 mb-4">
                      <View className="flex-row items-center gap-2 mb-3">
                        <User size={14} color="#1A73E8" />
                        <Text className="text-xs font-bold uppercase tracking-wider text-slate-500">Patient</Text>
                      </View>
                      <Text className="text-base font-bold text-midnight">{rx.patientName}</Text>
                      <Text className="text-xs text-slate-500 mt-0.5">{rx.patientMobile}</Text>
                    </View>

                    {/* Doctor Info */}
                    <View className="bg-slate-50 rounded-2xl p-4 mb-4">
                      <View className="flex-row items-center gap-2 mb-3">
                        <Stethoscope size={14} color="#1A73E8" />
                        <Text className="text-xs font-bold uppercase tracking-wider text-slate-500">Prescribing Doctor</Text>
                      </View>
                      <Text className="text-base font-bold text-midnight">{rx.doctorName}</Text>
                      <Text className="text-xs text-slate-500 mt-0.5">{rx.doctorSpecialty}</Text>
                    </View>

                    {/* Prescription Notes */}
                    <View className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-4">
                      <View className="flex-row items-center gap-2 mb-2">
                        <Pill size={14} color="#F59E0B" />
                        <Text className="text-xs font-bold uppercase tracking-wider text-amber-700">Prescription Notes</Text>
                      </View>
                      <Text className="text-sm text-amber-900">{rx.prescriptionNotes || 'No prescription notes recorded.'}</Text>
                    </View>

                    {/* Status */}
                    <View className="mt-2 mb-2 flex-row items-center gap-2">
                      <Text className="text-xs font-bold uppercase tracking-wider text-slate-500">Status:</Text>
                      <StatusChip label={rx.prescriptionStatus.toUpperCase()} variant={getStatusVariant(rx.prescriptionStatus)} />
                    </View>

                    {/* Action Buttons */}
                    <View className="mt-4 mb-8">
                      {rx.prescriptionStatus === 'pending' && (
                        <View className="gap-3">
                          <Pressable
                            onPress={() => handleDispense(rx)}
                            className="bg-primary py-4 rounded-2xl items-center active:opacity-80"
                            style={Shadows.focus}
                          >
                            <Text className="text-white font-bold text-sm">Dispense Medications</Text>
                          </Pressable>
                          <Pressable
                            onPress={() => handleReject(rx)}
                            className="bg-white border border-rose-200 py-4 rounded-2xl items-center active:bg-rose-50"
                          >
                            <Text className="text-rose-600 font-bold text-sm">Reject with Reason</Text>
                          </Pressable>
                        </View>
                      )}
                      {rx.prescriptionStatus === 'dispensed' && (
                        <View className="bg-emerald-50 py-4 rounded-2xl items-center border border-emerald-100">
                          <Text className="text-emerald-700 font-bold text-sm">Prescription Dispensed ✓</Text>
                        </View>
                      )}
                      {rx.prescriptionStatus === 'rejected' && (
                        <View className="bg-rose-50 py-4 rounded-2xl items-center border border-rose-100">
                          <Text className="text-rose-700 font-bold text-sm">Prescription Rejected</Text>
                        </View>
                      )}
                    </View>
                  </ScrollView>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
