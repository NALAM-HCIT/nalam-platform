import { CustomAlert } from '@/components/CustomAlert';
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Modal, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, User, Phone, ChevronRight, Plus, X, Calendar, FileText, Edit3, MessageSquare } from 'lucide-react-native';
import { Shadows } from '@/constants/theme';
import { receptionistService, PatientSearchResult } from '@/services/receptionistService';
export default function PatientsScreen() {
  const [patients, setPatients] = useState<PatientSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<PatientSearchResult | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientMobile, setNewPatientMobile] = useState('');
  const [registerModalVisible, setRegisterModalVisible] = useState(false);

  const fetchPatients = async (query?: string) => {
    setLoading(true);
    try {
      const data = await receptionistService.searchPatients(query);
      setPatients(data);
    } catch (error) {
      console.error(error);
      CustomAlert.alert('Error', 'Failed to fetch patients.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  // Debounced search
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchPatients(searchQuery);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleRegisterPatient = async () => {
    if (!newPatientName.trim() || !newPatientMobile.trim()) {
      CustomAlert.alert('Validation', 'Please enter both full name and mobile number.');
      return;
    }

    try {
      setLoading(true);
      const newPatient = await receptionistService.registerWalkIn(newPatientName, newPatientMobile);
      CustomAlert.alert('Success', `Patient ${newPatient.fullName} registered successfully.`);
      setRegisterModalVisible(false);
      setNewPatientName('');
      setNewPatientMobile('');
      fetchPatients(searchQuery);
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Failed to register patient.';
      CustomAlert.alert('Registration Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  const openPatientDetail = (patient: PatientSearchResult) => {
    setSelectedPatient(patient);
    setDetailModalVisible(true);
  };

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

      {/* Search Bar */}
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
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => fetchPatients(searchQuery)} tintColor="#1A73E8" />}
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
              onPress={() => openPatientDetail(p)}
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

      {/* Walk-in Registration Modal */}
      <Modal visible={registerModalVisible} animationType="slide" transparent>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6 pb-12">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-xl font-bold text-midnight">Walk-In Registration</Text>
              <Pressable
                onPress={() => setRegisterModalVisible(false)}
                className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center active:opacity-70"
              >
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

      {/* Patient Detail Modal */}
      <Modal visible={detailModalVisible} animationType="fade" transparent>
        <View className="flex-1 bg-black/50 justify-center items-center p-6">
          <View className="bg-white rounded-3xl w-full max-h-[80%] overflow-hidden">
            <View className="flex-row items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
              <Text className="text-lg font-bold text-midnight">Patient Summary</Text>
              <Pressable
                onPress={() => setDetailModalVisible(false)}
                className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center active:opacity-70"
              >
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

                {/* Action Buttons */}
                <View className="flex-row flex-wrap gap-3 mb-6">
                  <Pressable
                    onPress={() => CustomAlert.alert('Call', `Calling ${selectedPatient.mobileNumber}...`)}
                    className="flex-1 min-w-[45%] bg-emerald-50 rounded-2xl p-4 items-center gap-2 border border-emerald-100 active:opacity-80"
                  >
                    <Phone size={20} color="#22C55E" />
                    <Text className="text-xs font-bold text-emerald-700">Call Patient</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                        setDetailModalVisible(false);
                        CustomAlert.alert('Book Appointment', 'Routing to Booking Page -> Patient Context Enabled.');
                    }}
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
    </SafeAreaView>
  );
}
