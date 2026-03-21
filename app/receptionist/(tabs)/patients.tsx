import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, Alert, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, User, Phone, ChevronRight, Plus, X, Calendar, FileText, Edit3, MessageSquare } from 'lucide-react-native';
import { Shadows } from '@/constants/theme';

interface Patient {
  id: string;
  name: string;
  age: number;
  phone: string;
  lastVisit: string;
  gender: string;
  bloodGroup: string;
  email: string;
  address: string;
  medicalHistory: string;
  allergies: string;
  insurance: string;
}

const initialPatients: Patient[] = [
  { id: 'NP-2026-0001', name: 'John Doe', age: 32, phone: '+91 98765 43210', lastVisit: 'Today', gender: 'Male', bloodGroup: 'O+', email: 'john.doe@email.com', address: '12, MG Road, Chennai', medicalHistory: 'Hypertension, Type 2 Diabetes', allergies: 'Penicillin', insurance: 'Star Health - Active' },
  { id: 'NP-2026-0002', name: 'Jane Smith', age: 28, phone: '+91 98765 43211', lastVisit: 'Today', gender: 'Female', bloodGroup: 'A+', email: 'jane.smith@email.com', address: '45, Anna Nagar, Chennai', medicalHistory: 'Migraine, Asthma', allergies: 'None', insurance: 'ICICI Lombard - Active' },
  { id: 'NP-2026-0003', name: 'Robert Brown', age: 55, phone: '+91 98765 43212', lastVisit: 'Yesterday', gender: 'Male', bloodGroup: 'B+', email: 'robert.b@email.com', address: '78, T Nagar, Chennai', medicalHistory: 'Coronary artery disease, Hypothyroidism', allergies: 'Sulfa drugs', insurance: 'New India Assurance - Active' },
  { id: 'NP-2026-0004', name: 'Emily Davis', age: 42, phone: '+91 98765 43213', lastVisit: '2 days ago', gender: 'Female', bloodGroup: 'AB-', email: 'emily.d@email.com', address: '23, Adyar, Chennai', medicalHistory: 'Osteoarthritis', allergies: 'Aspirin', insurance: 'Max Bupa - Expired' },
  { id: 'NP-2026-0005', name: 'Rajesh Kumar', age: 48, phone: '+91 98765 43214', lastVisit: '3 days ago', gender: 'Male', bloodGroup: 'O-', email: 'rajesh.k@email.com', address: '56, Velachery, Chennai', medicalHistory: 'GERD, Lower back pain', allergies: 'None', insurance: 'Bajaj Allianz - Active' },
  { id: 'NP-2026-0006', name: 'Meera Iyer', age: 35, phone: '+91 98765 43215', lastVisit: '1 week ago', gender: 'Female', bloodGroup: 'A-', email: 'meera.i@email.com', address: '89, Mylapore, Chennai', medicalHistory: 'PCOS, Iron deficiency anemia', allergies: 'Ibuprofen', insurance: 'HDFC Ergo - Active' },
];

export default function PatientsScreen() {
  const [patients, setPatients] = useState<Patient[]>(initialPatients);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const filteredPatients = useMemo(() => {
    if (!searchQuery.trim()) return patients;
    const q = searchQuery.toLowerCase();
    return patients.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.phone.includes(q) ||
        p.id.toLowerCase().includes(q)
    );
  }, [patients, searchQuery]);

  const handleRegisterPatient = () => {
    Alert.alert(
      'Register New Patient',
      'Select registration type:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Walk-in Patient',
          onPress: () => {
            const newId = `NP-2026-${String(patients.length + 1).padStart(4, '0')}`;
            const newPatient: Patient = {
              id: newId,
              name: 'New Patient',
              age: 0,
              phone: 'Not provided',
              lastVisit: 'Today',
              gender: 'Not specified',
              bloodGroup: 'Unknown',
              email: 'Not provided',
              address: 'Not provided',
              medicalHistory: 'No records yet',
              allergies: 'Unknown',
              insurance: 'Not provided',
            };
            setPatients((prev) => [newPatient, ...prev]);
            Alert.alert(
              'Patient Registered',
              `New patient registered successfully.\n\nPatient ID: ${newId}\n\nPlease collect complete details from the patient.`,
              [
                { text: 'OK' },
                {
                  text: 'Edit Details',
                  onPress: () => {
                    setSelectedPatient(newPatient);
                    setDetailModalVisible(true);
                  },
                },
              ]
            );
          },
        },
        {
          text: 'Pre-registered (Online)',
          onPress: () => {
            Alert.alert('Pre-registered Patients', 'Enter the registration code or search by name to find the pre-registered patient.\n\nPending registrations: 3\n\n1. Arun V. (Code: PR-001)\n2. Lakshmi S. (Code: PR-002)\n3. Karthik M. (Code: PR-003)', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Confirm PR-001',
                onPress: () => {
                  const newId = `NP-2026-${String(patients.length + 1).padStart(4, '0')}`;
                  setPatients((prev) => [{
                    id: newId, name: 'Arun V.', age: 33, phone: '+91 98765 43220',
                    lastVisit: 'Today', gender: 'Male', bloodGroup: 'B+',
                    email: 'arun.v@email.com', address: '10, Porur, Chennai',
                    medicalHistory: 'None', allergies: 'None', insurance: 'Star Health - Active',
                  }, ...prev]);
                  Alert.alert('Confirmed', `Arun V. has been registered.\nPatient ID: ${newId}`);
                },
              },
            ]);
          },
        },
      ]
    );
  };

  const openPatientDetail = (patient: Patient) => {
    setSelectedPatient(patient);
    setDetailModalVisible(true);
  };

  const handleLongPress = (patient: Patient) => {
    Alert.alert(
      patient.name,
      'Quick Actions',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call',
          onPress: () => Alert.alert('Calling', `Dialing ${patient.phone}...\n\nCall initiated to ${patient.name}.`),
        },
        {
          text: 'SMS',
          onPress: () => Alert.alert('SMS', `Send SMS to ${patient.name} at ${patient.phone}:\n\nTemplate options:\n- Appointment reminder\n- Payment due\n- Report ready\n- Custom message`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Send Reminder', onPress: () => Alert.alert('Sent', `Appointment reminder SMS sent to ${patient.phone}.`) },
          ]),
        },
        {
          text: 'Book Appointment',
          onPress: () => {
            Alert.alert('Book Appointment', `Book for ${patient.name}:\n\nAvailable slots today:\n- 02:00 PM - Dr. Aruna Reddy\n- 03:30 PM - Dr. Kumar Patel\n- 04:00 PM - Dr. Sarah Johnson`, [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Book 02:00 PM', onPress: () => Alert.alert('Booked', `Appointment booked for ${patient.name} at 02:00 PM with Dr. Aruna Reddy.`) },
            ]);
          },
        },
      ]
    );
  };

  const handlePatientAction = (action: string, patient: Patient) => {
    switch (action) {
      case 'call':
        Alert.alert('Calling', `Dialing ${patient.phone}...\n\nCall initiated to ${patient.name}.`);
        break;
      case 'book':
        Alert.alert('Book Appointment', `Available slots for ${patient.name}:\n\n- 02:00 PM - Dr. Aruna Reddy\n- 03:30 PM - Dr. Kumar Patel\n- 04:00 PM - Dr. Sarah Johnson\n- 05:00 PM - Dr. Elena Gomez`, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Book 02:00 PM', onPress: () => Alert.alert('Booked', `Appointment booked for ${patient.name}\n\nDate: Today\nTime: 02:00 PM\nDoctor: Dr. Aruna Reddy\n\nSMS confirmation sent to ${patient.phone}.`) },
          { text: 'Book 03:30 PM', onPress: () => Alert.alert('Booked', `Appointment booked for ${patient.name}\n\nDate: Today\nTime: 03:30 PM\nDoctor: Dr. Kumar Patel\n\nSMS confirmation sent to ${patient.phone}.`) },
        ]);
        break;
      case 'history':
        Alert.alert('Visit History', `${patient.name} - Visit History:\n\nLast Visit: ${patient.lastVisit}\nMedical History: ${patient.medicalHistory}\nAllergies: ${patient.allergies}\nInsurance: ${patient.insurance}\n\nTotal visits: ${Math.floor(Math.random() * 20) + 1}\nRegistered since: Jan 2025`);
        break;
      case 'edit':
        Alert.alert(
          'Edit Patient Info',
          `Edit details for ${patient.name}:`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Update Phone',
              onPress: () => Alert.alert('Update Phone', `Current: ${patient.phone}\n\nPhone number update would open an input form.\n\nFor now, the number remains unchanged.`),
            },
            {
              text: 'Update Address',
              onPress: () => Alert.alert('Update Address', `Current: ${patient.address}\n\nAddress update would open an input form.\n\nFor now, the address remains unchanged.`),
            },
            {
              text: 'Update Insurance',
              onPress: () => Alert.alert('Update Insurance', `Current: ${patient.insurance}\n\nInsurance update would open an input form.\n\nFor now, the insurance details remain unchanged.`),
            },
          ]
        );
        break;
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      {/* Header */}
      <View className="px-6 pt-4 pb-2 flex-row items-center justify-between">
        <View>
          <Text className="text-2xl font-bold text-midnight tracking-tight">Patients</Text>
          <Text className="text-slate-500 text-sm mt-1">{filteredPatients.length} of {patients.length} patients</Text>
        </View>
        <Pressable
          onPress={handleRegisterPatient}
          className="flex-row items-center gap-1.5 bg-primary px-4 py-2.5 rounded-xl active:opacity-80"
          style={Shadows.focus}
        >
          <Plus size={16} color="#FFFFFF" />
          <Text className="text-white text-xs font-bold">Register</Text>
        </Pressable>
      </View>

      {/* Search Bar */}
      <View className="px-6 mt-2 mb-4">
        <View className="flex-row items-center bg-white rounded-2xl px-4 py-3 border border-slate-100" style={Shadows.card}>
          <Search size={18} color="#94A3B8" />
          <TextInput
            className="flex-1 ml-3 text-sm text-midnight"
            placeholder="Search by name, phone, or ID..."
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
      <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {filteredPatients.length === 0 ? (
          <View className="items-center justify-center py-16">
            <User size={48} color="#CBD5E1" />
            <Text className="text-slate-400 text-sm mt-4 font-medium">No patients found</Text>
            <Text className="text-slate-300 text-xs mt-1">Try a different search term</Text>
          </View>
        ) : (
          filteredPatients.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => openPatientDetail(p)}
              onLongPress={() => handleLongPress(p)}
              delayLongPress={500}
              className="bg-white rounded-2xl p-4 mb-3 flex-row items-center gap-4 border border-slate-50 active:opacity-80"
              style={Shadows.card}
            >
              <View className="w-12 h-12 rounded-xl bg-primary/10 items-center justify-center">
                <Text className="text-primary font-bold text-base">{p.name.split(' ').map((n) => n[0]).join('')}</Text>
              </View>
              <View className="flex-1">
                <Text className="font-bold text-sm text-midnight">{p.name}</Text>
                <Text className="text-slate-500 text-xs">{p.age}y {'\u2022'} {p.gender} {'\u2022'} {p.bloodGroup}</Text>
                <View className="flex-row items-center gap-1 mt-0.5">
                  <Phone size={10} color="#94A3B8" />
                  <Text className="text-slate-400 text-xs">{p.phone}</Text>
                </View>
                <Text className="text-slate-400 text-[10px] mt-0.5">Last visit: {p.lastVisit}</Text>
              </View>
              <ChevronRight size={18} color="#CBD5E1" />
            </Pressable>
          ))
        )}
      </ScrollView>

      {/* Patient Detail Modal */}
      <Modal visible={detailModalVisible} animationType="slide" transparent>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl max-h-[90%]">
            <View className="flex-row items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
              <Text className="text-xl font-bold text-midnight">Patient Details</Text>
              <Pressable
                onPress={() => setDetailModalVisible(false)}
                className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center active:opacity-70"
              >
                <X size={18} color="#64748B" />
              </Pressable>
            </View>
            {selectedPatient && (
              <ScrollView className="px-6" contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Patient Header */}
                <View className="items-center py-5">
                  <View className="w-20 h-20 rounded-full bg-primary/10 items-center justify-center mb-3">
                    <Text className="text-primary font-bold text-2xl">
                      {selectedPatient.name.split(' ').map((n) => n[0]).join('')}
                    </Text>
                  </View>
                  <Text className="text-xl font-bold text-midnight">{selectedPatient.name}</Text>
                  <Text className="text-slate-500 text-sm mt-1">ID: {selectedPatient.id}</Text>
                </View>

                {/* Info Grid */}
                <View className="bg-slate-50 rounded-2xl p-4 mb-4">
                  <View className="flex-row flex-wrap">
                    {[
                      { label: 'Age', value: `${selectedPatient.age} years` },
                      { label: 'Gender', value: selectedPatient.gender },
                      { label: 'Blood Group', value: selectedPatient.bloodGroup },
                      { label: 'Phone', value: selectedPatient.phone },
                      { label: 'Email', value: selectedPatient.email },
                      { label: 'Last Visit', value: selectedPatient.lastVisit },
                    ].map((item, i) => (
                      <View key={i} className="w-1/2 mb-3">
                        <Text className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{item.label}</Text>
                        <Text className="text-sm text-midnight font-medium mt-0.5">{item.value}</Text>
                      </View>
                    ))}
                  </View>
                  <View className="mt-1">
                    <Text className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Address</Text>
                    <Text className="text-sm text-midnight font-medium mt-0.5">{selectedPatient.address}</Text>
                  </View>
                </View>

                {/* Medical Info */}
                <View className="bg-slate-50 rounded-2xl p-4 mb-4">
                  <Text className="text-xs font-bold text-midnight mb-2 uppercase tracking-wider">Medical Information</Text>
                  <View className="mb-2">
                    <Text className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Medical History</Text>
                    <Text className="text-sm text-midnight font-medium mt-0.5">{selectedPatient.medicalHistory}</Text>
                  </View>
                  <View className="mb-2">
                    <Text className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Allergies</Text>
                    <Text className={`text-sm font-medium mt-0.5 ${selectedPatient.allergies !== 'None' ? 'text-red-600' : 'text-midnight'}`}>{selectedPatient.allergies}</Text>
                  </View>
                  <View>
                    <Text className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Insurance</Text>
                    <Text className="text-sm text-midnight font-medium mt-0.5">{selectedPatient.insurance}</Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View className="flex-row flex-wrap gap-3 mb-6">
                  <Pressable
                    onPress={() => { setDetailModalVisible(false); setTimeout(() => handlePatientAction('call', selectedPatient), 300); }}
                    className="flex-1 min-w-[45%] bg-emerald-50 rounded-2xl p-4 items-center gap-2 border border-emerald-100 active:opacity-80"
                  >
                    <Phone size={20} color="#22C55E" />
                    <Text className="text-xs font-bold text-emerald-700">Call Patient</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => { setDetailModalVisible(false); setTimeout(() => handlePatientAction('book', selectedPatient), 300); }}
                    className="flex-1 min-w-[45%] bg-blue-50 rounded-2xl p-4 items-center gap-2 border border-blue-100 active:opacity-80"
                  >
                    <Calendar size={20} color="#1A73E8" />
                    <Text className="text-xs font-bold text-blue-700">Book Appointment</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => { setDetailModalVisible(false); setTimeout(() => handlePatientAction('history', selectedPatient), 300); }}
                    className="flex-1 min-w-[45%] bg-purple-50 rounded-2xl p-4 items-center gap-2 border border-purple-100 active:opacity-80"
                  >
                    <FileText size={20} color="#8B5CF6" />
                    <Text className="text-xs font-bold text-purple-700">View History</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => { setDetailModalVisible(false); setTimeout(() => handlePatientAction('edit', selectedPatient), 300); }}
                    className="flex-1 min-w-[45%] bg-amber-50 rounded-2xl p-4 items-center gap-2 border border-amber-100 active:opacity-80"
                  >
                    <Edit3 size={20} color="#F59E0B" />
                    <Text className="text-xs font-bold text-amber-700">Edit Info</Text>
                  </Pressable>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
