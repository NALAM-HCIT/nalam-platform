import { CustomAlert } from '@/components/CustomAlert';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Calendar, Clock, User, Search, Plus, Phone } from 'lucide-react-native';
import { Shadows } from '@/constants/theme';
import { StatusChip } from '@/components';
import { receptionistService, QueuePatient } from '@/services/receptionistService';
import { isAuthError } from '@/services/api';

type AppointmentStatus = 'all' | 'pending' | 'confirmed' | 'arrived' | 'in_consultation' | 'completed';

const filterTabs: { label: string; value: AppointmentStatus }[] = [
  { label: 'All', value: 'all' },
  { label: 'Waiting', value: 'arrived' },
  { label: 'In Consult', value: 'in_consultation' },
  { label: 'Upcoming', value: 'confirmed' },
  { label: 'Completed', value: 'completed' },
];

export default function AppointmentsScreen() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<QueuePatient[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<AppointmentStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadAppointments = async () => {
    try {
      const data = await receptionistService.getQueue();
      setAppointments(data);
    } catch (err) {
      if (!isAuthError(err)) {
        console.error(err);
        CustomAlert.alert('Error', 'Failed to load live appointments for today.');
      }
    }
  };

  useEffect(() => { loadAppointments(); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAppointments();
    setRefreshing(false);
  }, []);

  const filteredAppointments = useMemo(() => {
    let result = appointments;
    if (activeFilter !== 'all') {
      result = result.filter((a) => a.status === activeFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) => a.patientName.toLowerCase().includes(q) 
            || a.doctorName.toLowerCase().includes(q) 
            || a.bookingReference.toLowerCase().includes(q)
      );
    }
    return result;
  }, [appointments, activeFilter, searchQuery]);

  const handleAddAppointment = () => {
    CustomAlert.alert('New Registration', 'Directing you to the patient lookup to register a walk-in.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Go to Patients', onPress: () => router.push('/receptionist/(tabs)/patients') }
    ]);
  };

  const handleAppointmentPress = (apt: QueuePatient) => {
    const detailText = `Ref: ${apt.bookingReference}\nPatient: ${apt.patientName}\nDoctor: ${apt.doctorName}\nTime: ${apt.time}\nType: ${apt.type}\nStatus: ${apt.status.toUpperCase()}`;

    if (apt.status === 'pending' || apt.status === 'confirmed') {
      CustomAlert.alert(apt.patientName, detailText, [
        { text: 'Dismiss' },
        {
          text: 'Call Patient',
          onPress: () => CustomAlert.alert('Calling', `Dialing ${apt.patientMobile}...\n\nCall initiated to ${apt.patientName}.`),
        },
        {
          text: 'Check In',
          onPress: async () => {
            if (apt.type === 'in-person') {
              router.push({ pathname: '/receptionist/patient-arrival', params: { appointmentId: apt.id } });
            } else {
              try {
                await receptionistService.checkInPatient(apt.id);
                loadAppointments();
                CustomAlert.alert('Checked In', `${apt.patientName} has been checked in successfully.\n\nAssigned to: ${apt.doctorName}`);
              } catch (e) {
                CustomAlert.alert('Error', 'Failed to check-in patient');
              }
            }
          },
        },
      ]);
    } else if (apt.status === 'arrived') {
      CustomAlert.alert(apt.patientName, detailText, [
        { text: 'Dismiss' },
        {
          text: 'Inform Doctor',
          onPress: () => CustomAlert.alert('Sent', `${apt.doctorName} has been notified that ${apt.patientName} is waiting in the lobby.`),
        }
      ]);
    } else {
      CustomAlert.alert(apt.patientName, detailText, [{ text: 'Dismiss' }]);
    }
  };

  const statusLabel = (status: string) => {
    if (status === 'arrived') return 'WAITING';
    if (status === 'in_consultation') return 'IN CONSULT';
    if (status === 'completed') return 'COMPLETED';
    if (status === 'cancelled') return 'CANCELLED';
    return 'UPCOMING';
  };

  const statusVariant = (status: string) => {
    if (status === 'completed') return 'success';
    if (status === 'arrived') return 'warning';
    if (status === 'in_consultation') return 'error';
    return 'primary';
  };

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      {/* Header */}
      <View className="px-6 pt-4 pb-2 flex-row items-center justify-between">
        <View>
          <Text className="text-2xl font-bold text-midnight tracking-tight">Today's Appointments</Text>
          <Text className="text-slate-500 text-sm mt-1">{filteredAppointments.length} of {appointments.length} active appointments</Text>
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
            placeholder="Search by patient, doctor, or reference..."
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
      <ScrollView 
        className="flex-1 px-6" 
        contentContainerStyle={{ paddingBottom: 120 }} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1A73E8" />}
      >
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
                    <Text className="font-bold text-sm text-midnight">{apt.patientName}</Text>
                    <Text className="text-slate-500 text-xs">{apt.doctorName}</Text>
                    <View className="flex-row items-center gap-1 mt-1">
                      <Clock size={12} color="#94A3B8" />
                      <Text className="text-slate-400 text-xs">{apt.time}</Text>
                    </View>
                    <Text className="text-slate-400 text-[10px] mt-0.5">{apt.type.toUpperCase()} • {apt.bookingReference}</Text>
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
