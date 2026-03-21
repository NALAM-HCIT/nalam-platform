import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, FileText, X, User, Stethoscope, Pill, Clock } from 'lucide-react-native';
import { Shadows, Colors } from '@/constants/theme';
import { StatusChip } from '@/components';

type RxStatus = 'pending' | 'dispensed' | 'rejected';

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

interface Prescription {
  id: string;
  patient: string;
  patientAge: number;
  patientGender: string;
  doctor: string;
  department: string;
  medications: Medication[];
  priority: 'STAT' | 'URGENT' | 'Regular';
  priorityColor: string;
  status: RxStatus;
  timestamp: string;
  date: string;
  notes?: string;
}

const initialPrescriptions: Prescription[] = [
  {
    id: 'RX-2050',
    patient: 'Arjun Menon',
    patientAge: 62,
    patientGender: 'Male',
    doctor: 'Dr. Aruna Reddy',
    department: 'Cardiology',
    medications: [
      { name: 'Clopidogrel', dosage: '75mg', frequency: 'Once daily', duration: '90 days' },
      { name: 'Atorvastatin', dosage: '20mg', frequency: 'At bedtime', duration: '90 days' },
      { name: 'Metoprolol', dosage: '50mg', frequency: 'Twice daily', duration: '30 days' },
      { name: 'Aspirin', dosage: '75mg', frequency: 'Once daily after food', duration: '90 days' },
    ],
    priority: 'STAT',
    priorityColor: '#DC2626',
    status: 'pending',
    timestamp: '11:20 AM',
    date: 'Today',
    notes: 'Post-angioplasty discharge medications',
  },
  {
    id: 'RX-2049',
    patient: 'Divya Sundar',
    patientAge: 28,
    patientGender: 'Female',
    doctor: 'Dr. Sarah Johnson',
    department: 'General Medicine',
    medications: [
      { name: 'Azithromycin', dosage: '500mg', frequency: 'Once daily', duration: '3 days' },
      { name: 'Paracetamol', dosage: '650mg', frequency: 'As needed (max 3/day)', duration: '5 days' },
      { name: 'Cetirizine', dosage: '10mg', frequency: 'Once at night', duration: '5 days' },
    ],
    priority: 'URGENT',
    priorityColor: '#38BDF8',
    status: 'pending',
    timestamp: '11:05 AM',
    date: 'Today',
  },
  {
    id: 'RX-2048',
    patient: 'Gopal Krishnan',
    patientAge: 55,
    patientGender: 'Male',
    doctor: 'Dr. Kumar Patel',
    department: 'Endocrinology',
    medications: [
      { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily after meals', duration: '90 days' },
      { name: 'Sitagliptin', dosage: '100mg', frequency: 'Once daily', duration: '90 days' },
    ],
    priority: 'Regular',
    priorityColor: '#64748B',
    status: 'pending',
    timestamp: '10:40 AM',
    date: 'Today',
  },
  {
    id: 'RX-2047',
    patient: 'Selvi Rajan',
    patientAge: 40,
    patientGender: 'Female',
    doctor: 'Dr. Aruna Reddy',
    department: 'Cardiology',
    medications: [
      { name: 'Amlodipine', dosage: '5mg', frequency: 'Once daily', duration: '30 days' },
      { name: 'Telmisartan', dosage: '40mg', frequency: 'Once daily', duration: '30 days' },
    ],
    priority: 'Regular',
    priorityColor: '#64748B',
    status: 'dispensed',
    timestamp: '09:50 AM',
    date: 'Today',
  },
  {
    id: 'RX-2046',
    patient: 'Venkat Ram',
    patientAge: 70,
    patientGender: 'Male',
    doctor: 'Dr. Sarah Johnson',
    department: 'General Medicine',
    medications: [
      { name: 'Pregabalin', dosage: '75mg', frequency: 'Twice daily', duration: '14 days' },
      { name: 'Methylcobalamin', dosage: '1500mcg', frequency: 'Once daily', duration: '30 days' },
      { name: 'Pantoprazole', dosage: '40mg', frequency: 'Before breakfast', duration: '14 days' },
    ],
    priority: 'URGENT',
    priorityColor: '#38BDF8',
    status: 'dispensed',
    timestamp: '09:15 AM',
    date: 'Today',
  },
  {
    id: 'RX-2045',
    patient: 'Nandini Babu',
    patientAge: 35,
    patientGender: 'Female',
    doctor: 'Dr. Kumar Patel',
    department: 'Endocrinology',
    medications: [
      { name: 'Levothyroxine', dosage: '50mcg', frequency: 'Once daily on empty stomach', duration: '90 days' },
    ],
    priority: 'Regular',
    priorityColor: '#64748B',
    status: 'rejected',
    timestamp: '08:30 AM',
    date: 'Today',
    notes: 'Duplicate prescription - already dispensed yesterday',
  },
];

const filterTabs: { label: string; value: 'all' | RxStatus }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Dispensed', value: 'dispensed' },
  { label: 'Rejected', value: 'rejected' },
];

export default function PrescriptionsScreen() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>(initialPrescriptions);
  const [activeFilter, setActiveFilter] = useState<'all' | RxStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRx, setSelectedRx] = useState<Prescription | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const filteredPrescriptions = prescriptions.filter((rx) => {
    const matchesFilter = activeFilter === 'all' || rx.status === activeFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || rx.patient.toLowerCase().includes(q) || rx.doctor.toLowerCase().includes(q) || rx.id.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  const getFilterCount = (status: 'all' | RxStatus) => {
    if (status === 'all') return prescriptions.length;
    return prescriptions.filter((rx) => rx.status === status).length;
  };

  const updateRxStatus = (rxId: string, newStatus: RxStatus) => {
    setPrescriptions((prev) => prev.map((rx) => rx.id === rxId ? { ...rx, status: newStatus } : rx));
    setShowDetail(false);
    setSelectedRx(null);
  };

  const handleDispense = (rx: Prescription) => {
    Alert.alert(
      'Confirm Dispense',
      `Dispense ${rx.medications.length} medication(s) for ${rx.patient}?\n\nThis will mark ${rx.id} as dispensed and create an order.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Dispense',
          onPress: () => {
            updateRxStatus(rx.id, 'dispensed');
            Alert.alert('Dispensed', `${rx.id} has been dispensed. Order created successfully.`);
          },
        },
      ]
    );
  };

  const handleClarification = (rx: Prescription) => {
    Alert.alert(
      'Request Clarification',
      `Send a clarification request to ${rx.doctor} for ${rx.id}?\n\nCommon reasons:\n- Dosage verification needed\n- Drug interaction concern\n- Allergy information missing\n- Medication unavailable`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Request',
          onPress: () => {
            Alert.alert('Request Sent', `Clarification request sent to ${rx.doctor} for ${rx.id}. You will be notified when they respond.`);
          },
        },
      ]
    );
  };

  const handleReject = (rx: Prescription) => {
    Alert.alert(
      'Reject Prescription',
      `Reject ${rx.id} for ${rx.patient}?\n\nPlease select a reason:`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Duplicate Rx',
          style: 'destructive',
          onPress: () => {
            updateRxStatus(rx.id, 'rejected');
            Alert.alert('Rejected', `${rx.id} rejected (Duplicate prescription). ${rx.doctor} has been notified.`);
          },
        },
        {
          text: 'Drug Interaction',
          style: 'destructive',
          onPress: () => {
            updateRxStatus(rx.id, 'rejected');
            Alert.alert('Rejected', `${rx.id} rejected (Drug interaction concern). ${rx.doctor} has been notified.`);
          },
        },
        {
          text: 'Medication Unavailable',
          style: 'destructive',
          onPress: () => {
            updateRxStatus(rx.id, 'rejected');
            Alert.alert('Rejected', `${rx.id} rejected (Medication unavailable). ${rx.doctor} has been notified.`);
          },
        },
      ]
    );
  };

  const openDetail = (rx: Prescription) => {
    setSelectedRx(rx);
    setShowDetail(true);
  };

  const getStatusVariant = (status: RxStatus): 'warning' | 'success' | 'danger' => {
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
            placeholder="Search patient, doctor, or RX ID..."
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
            const count = getFilterCount(tab.value);
            return (
              <Pressable
                key={tab.value}
                onPress={() => setActiveFilter(tab.value)}
                className={`px-3.5 py-1.5 rounded-full flex-row items-center gap-1.5 ${isActive ? 'bg-primary' : 'bg-white border border-slate-100'}`}
              >
                <Text className={`text-[11px] font-bold ${isActive ? 'text-white' : 'text-slate-600'}`}>{tab.label}</Text>
                <View className={`px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20' : 'bg-slate-100'}`}>
                  <Text className={`text-[9px] font-bold ${isActive ? 'text-white' : 'text-slate-500'}`}>{count}</Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Prescription List */}
      <ScrollView className="flex-1 px-6 mt-4" contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {filteredPrescriptions.length === 0 ? (
          <View className="items-center py-12">
            <FileText size={40} color="#CBD5E1" />
            <Text className="text-slate-400 text-sm mt-3 font-medium">No prescriptions found</Text>
          </View>
        ) : (
          filteredPrescriptions.map((rx) => (
            <Pressable
              key={rx.id}
              onPress={() => openDetail(rx)}
              className="bg-white rounded-2xl p-4 mb-3 overflow-hidden active:opacity-80"
              style={Shadows.card}
            >
              {/* Left accent border */}
              <View className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ backgroundColor: rx.priorityColor }} />

              <View className="ml-2">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2 mb-1">
                      <Text className="font-extrabold text-base text-midnight">{rx.patient}</Text>
                      {/* Priority badge */}
                      <View className="px-2.5 py-0.5 rounded-full" style={{ backgroundColor: `${rx.priorityColor}15` }}>
                        <Text className="text-[10px] font-bold uppercase tracking-wider" style={{ color: rx.priorityColor }}>
                          {rx.priority}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-slate-500 text-xs">{rx.doctor} - {rx.department}</Text>
                    <View className="flex-row items-center gap-3 mt-1.5">
                      <View className="flex-row items-center gap-1">
                        <Pill size={10} color="#94A3B8" />
                        <Text className="text-slate-400 text-xs">{rx.medications.length} meds</Text>
                      </View>
                      <View className="flex-row items-center gap-1">
                        <Clock size={10} color="#94A3B8" />
                        <Text className="text-slate-400 text-xs">{rx.timestamp}</Text>
                      </View>
                      <Text className="text-slate-300 text-xs">{rx.id}</Text>
                    </View>
                  </View>
                  <StatusChip
                    label={rx.status.toUpperCase()}
                    variant={getStatusVariant(rx.status)}
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
                      <View className="flex-row items-center gap-2">
                        <Text className="text-xl font-extrabold text-midnight">{rx.id}</Text>
                        <View className="px-2.5 py-0.5 rounded-full" style={{ backgroundColor: `${rx.priorityColor}15` }}>
                          <Text className="text-[10px] font-bold uppercase tracking-wider" style={{ color: rx.priorityColor }}>
                            {rx.priority}
                          </Text>
                        </View>
                      </View>
                      <Text className="text-xs text-slate-500 mt-0.5">{rx.date} at {rx.timestamp}</Text>
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
                        <Text className="text-xs font-bold uppercase tracking-wider text-slate-500">Patient Information</Text>
                      </View>
                      <Text className="text-base font-bold text-midnight">{rx.patient}</Text>
                      <Text className="text-xs text-slate-500 mt-0.5">{rx.patientGender}, {rx.patientAge} years old</Text>
                    </View>

                    {/* Doctor Info */}
                    <View className="bg-slate-50 rounded-2xl p-4 mb-4">
                      <View className="flex-row items-center gap-2 mb-3">
                        <Stethoscope size={14} color="#1A73E8" />
                        <Text className="text-xs font-bold uppercase tracking-wider text-slate-500">Prescribing Doctor</Text>
                      </View>
                      <Text className="text-base font-bold text-midnight">{rx.doctor}</Text>
                      <Text className="text-xs text-slate-500 mt-0.5">{rx.department}</Text>
                    </View>

                    {rx.notes && (
                      <View className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-4">
                        <Text className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-1">Notes</Text>
                        <Text className="text-sm text-amber-800">{rx.notes}</Text>
                      </View>
                    )}

                    {/* Medications */}
                    <View className="flex-row items-center gap-2 mb-3">
                      <Pill size={14} color="#1A73E8" />
                      <Text className="text-xs font-bold uppercase tracking-wider text-slate-500">Medications ({rx.medications.length})</Text>
                    </View>
                    {rx.medications.map((med, idx) => (
                      <View key={idx} className="bg-white border border-slate-100 rounded-2xl p-4 mb-2" style={Shadows.card}>
                        <Text className="font-bold text-sm text-midnight">{med.name}</Text>
                        <View className="flex-row flex-wrap gap-x-4 gap-y-1 mt-2">
                          <View>
                            <Text className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Dosage</Text>
                            <Text className="text-xs text-slate-700 mt-0.5">{med.dosage}</Text>
                          </View>
                          <View>
                            <Text className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Frequency</Text>
                            <Text className="text-xs text-slate-700 mt-0.5">{med.frequency}</Text>
                          </View>
                          <View>
                            <Text className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Duration</Text>
                            <Text className="text-xs text-slate-700 mt-0.5">{med.duration}</Text>
                          </View>
                        </View>
                      </View>
                    ))}

                    {/* Status */}
                    <View className="mt-2 mb-2 flex-row items-center gap-2">
                      <Text className="text-xs font-bold uppercase tracking-wider text-slate-500">Current Status:</Text>
                      <StatusChip label={rx.status.toUpperCase()} variant={getStatusVariant(rx.status)} />
                    </View>

                    {/* Action Buttons */}
                    <View className="mt-4 mb-8">
                      {rx.status === 'pending' && (
                        <View className="gap-3">
                          <Pressable
                            onPress={() => handleDispense(rx)}
                            className="bg-primary py-4 rounded-2xl items-center active:opacity-80"
                            style={Shadows.focus}
                          >
                            <Text className="text-white font-bold text-sm">Dispense Medications</Text>
                          </Pressable>
                          <Pressable
                            onPress={() => handleClarification(rx)}
                            className="bg-amber-500 py-4 rounded-2xl items-center active:opacity-80"
                          >
                            <Text className="text-white font-bold text-sm">Request Clarification</Text>
                          </Pressable>
                          <Pressable
                            onPress={() => handleReject(rx)}
                            className="bg-white border border-rose-200 py-4 rounded-2xl items-center active:bg-rose-50"
                          >
                            <Text className="text-rose-600 font-bold text-sm">Reject with Reason</Text>
                          </Pressable>
                        </View>
                      )}
                      {rx.status === 'dispensed' && (
                        <View className="bg-emerald-50 py-4 rounded-2xl items-center border border-emerald-100">
                          <Text className="text-emerald-700 font-bold text-sm">Prescription Dispensed</Text>
                        </View>
                      )}
                      {rx.status === 'rejected' && (
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
