import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Calendar, Clock, User, Search, Plus, Phone } from 'lucide-react-native';
import { Shadows } from '@/constants/theme';
import { StatusChip } from '@/components';

type AppointmentStatus = 'checked-in' | 'waiting' | 'upcoming';

interface Appointment {
  id: string;
  patient: string;
  doctor: string;
  time: string;
  status: AppointmentStatus;
  phone: string;
  age: number;
  reason: string;
}

const initialAppointments: Appointment[] = [
  { id: '1', patient: 'John Doe', doctor: 'Dr. Aruna Reddy', time: '10:00 AM', status: 'checked-in', phone: '+91 98765 43210', age: 32, reason: 'General checkup' },
  { id: '2', patient: 'Jane Smith', doctor: 'Dr. Sarah Johnson', time: '10:15 AM', status: 'waiting', phone: '+91 98765 43211', age: 28, reason: 'Migraine consultation' },
  { id: '3', patient: 'Robert Brown', doctor: 'Dr. Kumar Patel', time: '10:30 AM', status: 'upcoming', phone: '+91 98765 43212', age: 55, reason: 'Diabetes follow-up' },
  { id: '4', patient: 'Emily Davis', doctor: 'Dr. Elena Gomez', time: '11:00 AM', status: 'upcoming', phone: '+91 98765 43213', age: 42, reason: 'Knee pain evaluation' },
  { id: '5', patient: 'Michael Lee', doctor: 'Dr. Aruna Reddy', time: '11:30 AM', status: 'upcoming', phone: '+91 98765 43214', age: 36, reason: 'Skin allergy' },
  { id: '6', patient: 'Priya Sharma', doctor: 'Dr. Kumar Patel', time: '12:00 PM', status: 'waiting', phone: '+91 98765 43215', age: 45, reason: 'Blood pressure check' },
  { id: '7', patient: 'Anil Kapoor', doctor: 'Dr. Sarah Johnson', time: '12:30 PM', status: 'upcoming', phone: '+91 98765 43216', age: 50, reason: 'Post-surgery review' },
];

const filterTabs: { label: string; value: 'all' | AppointmentStatus }[] = [
  { label: 'All', value: 'all' },
  { label: 'Checked-In', value: 'checked-in' },
  { label: 'Waiting', value: 'waiting' },
  { label: 'Upcoming', value: 'upcoming' },
];

export default function AppointmentsScreen() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [activeFilter, setActiveFilter] = useState<'all' | AppointmentStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAppointments = useMemo(() => {
    let result = appointments;
    if (activeFilter !== 'all') {
      result = result.filter((a) => a.status === activeFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) => a.patient.toLowerCase().includes(q) || a.doctor.toLowerCase().includes(q)
      );
    }
    return result;
  }, [appointments, activeFilter, searchQuery]);

  const handleAddAppointment = () => {
    Alert.alert(
      'Add Appointment',
      'Create a new appointment:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Quick Book',
          onPress: () => {
            const newId = String(appointments.length + 1 + Math.floor(Math.random() * 1000));
            const newApt: Appointment = {
              id: newId,
              patient: 'New Patient',
              doctor: 'Dr. Aruna Reddy',
              time: '03:00 PM',
              status: 'upcoming',
              phone: '+91 00000 00000',
              age: 30,
              reason: 'New consultation',
            };
            setAppointments((prev) => [...prev, newApt]);
            Alert.alert('Appointment Created', `New appointment booked for 03:00 PM with Dr. Aruna Reddy.\n\nAppointment ID: APT-${newId}`);
          },
        },
        {
          text: 'From Patient List',
          onPress: () => {
            Alert.alert('Select Patient', 'Choose a patient to book for:\n\n1. John Doe\n2. Jane Smith\n3. Robert Brown\n4. Emily Davis', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Book for John Doe',
                onPress: () => {
                  const newId = String(appointments.length + 1 + Math.floor(Math.random() * 1000));
                  setAppointments((prev) => [...prev, {
                    id: newId,
                    patient: 'John Doe',
                    doctor: 'Dr. Elena Gomez',
                    time: '04:00 PM',
                    status: 'upcoming',
                    phone: '+91 98765 43210',
                    age: 32,
                    reason: 'Follow-up visit',
                  }]);
                  Alert.alert('Booked', 'Appointment booked for John Doe at 04:00 PM with Dr. Elena Gomez.');
                },
              },
            ]);
          },
        },
      ]
    );
  };

  const handleAppointmentPress = (apt: Appointment) => {
    const detailText = `Patient: ${apt.patient}\nDoctor: ${apt.doctor}\nTime: ${apt.time}\nAge: ${apt.age}\nPhone: ${apt.phone}\nReason: ${apt.reason}\nStatus: ${apt.status.toUpperCase()}`;

    if (apt.status === 'upcoming') {
      Alert.alert(apt.patient, detailText, [
        { text: 'Dismiss' },
        {
          text: 'Call Patient',
          onPress: () => Alert.alert('Calling', `Dialing ${apt.phone}...\n\nCall initiated to ${apt.patient}.`),
        },
        {
          text: 'Check In',
          onPress: () => {
            router.push('/receptionist/patient-arrival');
          },
        },
        {
          text: 'Reschedule',
          onPress: () => {
            Alert.alert('Reschedule', `Reschedule ${apt.patient}'s appointment?`, [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Tomorrow',
                onPress: () => Alert.alert('Rescheduled', `Moved to tomorrow at ${apt.time}. SMS sent to ${apt.patient}.`),
              },
              {
                text: 'Next Week',
                onPress: () => Alert.alert('Rescheduled', `Moved to next week at ${apt.time}. SMS sent to ${apt.patient}.`),
              },
            ]);
          },
        },
        {
          text: 'Cancel',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Confirm Cancel', `Cancel ${apt.patient}'s appointment?`, [
              { text: 'No', style: 'cancel' },
              {
                text: 'Yes, Cancel',
                style: 'destructive',
                onPress: () => {
                  setAppointments((prev) => prev.filter((a) => a.id !== apt.id));
                  Alert.alert('Cancelled', `${apt.patient}'s appointment cancelled. Notification sent.`);
                },
              },
            ]);
          },
        },
      ]);
    } else if (apt.status === 'waiting') {
      Alert.alert(apt.patient, detailText, [
        { text: 'Dismiss' },
        {
          text: 'Notify Doctor',
          onPress: () => Alert.alert('Doctor Notified', `${apt.doctor} has been notified that ${apt.patient} is waiting.\n\nEstimated wait: 5 minutes.`),
        },
        {
          text: 'Send to Room',
          onPress: () => {
            const room = Math.floor(Math.random() * 10) + 1;
            setAppointments((prev) =>
              prev.map((a) => (a.id === apt.id ? { ...a, status: 'checked-in' as AppointmentStatus } : a))
            );
            Alert.alert('Room Assigned', `${apt.patient} sent to Room ${room}.\n\n${apt.doctor} has been notified.`);
          },
        },
        {
          text: 'Cancel',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Confirm Cancel', `Cancel ${apt.patient}'s appointment while waiting?`, [
              { text: 'No', style: 'cancel' },
              {
                text: 'Yes, Cancel',
                style: 'destructive',
                onPress: () => {
                  setAppointments((prev) => prev.filter((a) => a.id !== apt.id));
                  Alert.alert('Cancelled', `${apt.patient}'s appointment cancelled.`);
                },
              },
            ]);
          },
        },
      ]);
    } else if (apt.status === 'checked-in') {
      Alert.alert(apt.patient, detailText, [
        { text: 'Dismiss' },
        {
          text: 'View Details',
          onPress: () => Alert.alert('Patient Details', `Full Name: ${apt.patient}\nAge: ${apt.age}\nPhone: ${apt.phone}\nDoctor: ${apt.doctor}\nTime: ${apt.time}\nReason: ${apt.reason}\n\nVitals: Pending\nAllergies: None on record\nInsurance: Active`),
        },
        {
          text: 'Send to Room',
          onPress: () => {
            const room = Math.floor(Math.random() * 10) + 1;
            Alert.alert('Room Assigned', `${apt.patient} directed to Room ${room}.\n\n${apt.doctor} has been alerted.`);
          },
        },
      ]);
    }
  };

  const statusLabel = (status: AppointmentStatus) => {
    if (status === 'checked-in') return 'CHECKED IN';
    if (status === 'waiting') return 'WAITING';
    return 'UPCOMING';
  };

  const statusVariant = (status: AppointmentStatus) => {
    if (status === 'checked-in') return 'success';
    if (status === 'waiting') return 'warning';
    return 'primary';
  };

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      {/* Header */}
      <View className="px-6 pt-4 pb-2 flex-row items-center justify-between">
        <View>
          <Text className="text-2xl font-bold text-midnight tracking-tight">Today's Appointments</Text>
          <Text className="text-slate-500 text-sm mt-1">{filteredAppointments.length} of {appointments.length} appointments</Text>
        </View>
        <Pressable
          onPress={handleAddAppointment}
          className="w-10 h-10 rounded-xl bg-primary items-center justify-center active:opacity-80"
          style={Shadows.focus}
        >
          <Plus size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Search Bar */}
      <View className="px-6 mt-2 mb-2">
        <View className="flex-row items-center bg-white rounded-2xl px-4 py-3 border border-slate-100" style={Shadows.card}>
          <Search size={18} color="#94A3B8" />
          <TextInput
            className="flex-1 ml-3 text-sm text-midnight"
            placeholder="Search by patient or doctor..."
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

      {/* Filter Tabs */}
      <View className="px-6 mt-2 mb-3">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {filterTabs.map((tab) => {
            const isActive = activeFilter === tab.value;
            const count = tab.value === 'all' ? appointments.length : appointments.filter((a) => a.status === tab.value).length;
            return (
              <Pressable
                key={tab.value}
                onPress={() => setActiveFilter(tab.value)}
                className={`px-4 py-2 rounded-full flex-row items-center gap-1.5 ${isActive ? 'bg-primary' : 'bg-white border border-slate-100'}`}
                style={!isActive ? Shadows.card : undefined}
              >
                <Text className={`text-xs font-bold ${isActive ? 'text-white' : 'text-slate-600'}`}>{tab.label}</Text>
                <View className={`px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20' : 'bg-slate-100'}`}>
                  <Text className={`text-[10px] font-bold ${isActive ? 'text-white' : 'text-slate-500'}`}>{count}</Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Appointments List */}
      <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {filteredAppointments.length === 0 ? (
          <View className="items-center justify-center py-16">
            <Calendar size={48} color="#CBD5E1" />
            <Text className="text-slate-400 text-sm mt-4 font-medium">No appointments found</Text>
            <Text className="text-slate-300 text-xs mt-1">Try adjusting your filters or search</Text>
          </View>
        ) : (
          filteredAppointments.map((apt) => (
            <Pressable
              key={apt.id}
              onPress={() => handleAppointmentPress(apt)}
              className="bg-white rounded-2xl p-4 mb-3 border border-slate-50 active:opacity-80"
              style={Shadows.card}
            >
              <View className="flex-row items-start justify-between">
                <View className="flex-row gap-3 flex-1">
                  <View className="w-10 h-10 rounded-xl bg-primary/10 items-center justify-center">
                    <User size={18} color="#1A73E8" />
                  </View>
                  <View className="flex-1">
                    <Text className="font-bold text-sm text-midnight">{apt.patient}</Text>
                    <Text className="text-slate-500 text-xs">{apt.doctor}</Text>
                    <View className="flex-row items-center gap-1 mt-1">
                      <Clock size={12} color="#94A3B8" />
                      <Text className="text-slate-400 text-xs">{apt.time}</Text>
                    </View>
                    <Text className="text-slate-400 text-[10px] mt-0.5">{apt.reason}</Text>
                  </View>
                </View>
                <StatusChip
                  label={statusLabel(apt.status)}
                  variant={statusVariant(apt.status) as any}
                />
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
