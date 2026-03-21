import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Shadows } from '@/constants/theme';
import {
  Search,
  Bell,
  Clock,
  Hospital,
  ArrowDownUp,
} from 'lucide-react-native';

type PatientStatus = 'Stable' | 'Critical' | 'Observation';
type SortOption = 'name' | 'status' | 'lastVisit';

interface Patient {
  id: string;
  name: string;
  patientId: string;
  location: string;
  status: PatientStatus;
  tags: string[];
  lastVisit: string;
  avatar: string;
  phone: string;
}

const patients: Patient[] = [
  {
    id: '1',
    name: 'Sarah Jenkins',
    patientId: '#PT-88210',
    location: 'Room 402',
    status: 'Stable',
    tags: ['Post-op Recovery', 'Orthopedics'],
    lastVisit: 'Last visit: 10:30 AM (Today)',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDVBWK1doKSO34AjVxEcEVhaN4262zfUymHQMypRZ7FEKkUZ5FOEdrycfOg-atEBqtvcz7V-yot7tj_DOF0qiz9w6te6pXw0kShtp0ahyKfS3fNn59x5PL-4vypOAgP37yq4mAgjhp819gOH6i8jLLh2pAlTFMOTzaA6kU56KveJsYJvpRVNYR0j5j4eHwyWAFvn-paf5ISnLjh2yPfwONiKYNDgwaFkuO3YtVLCSdRPB8oLN8HK7QeUR1jWYZHNLMbafGRJa0FwR_S',
    phone: '+91 98765 43210',
  },
  {
    id: '2',
    name: 'Robert Vance',
    patientId: '#PT-44912',
    location: 'ICU Bed 12',
    status: 'Critical',
    tags: ['Cardiac Arrhythmia', 'Cardiology'],
    lastVisit: 'Last visit: 09:15 AM (Today)',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD8g8rsH5jVahUnVPSUiJjParVEyKp_btCbp2kP3sQqhuzOKlAQrLW4-CRDX_8fbhdEC0_YH91xTgdOEQ7KJYGx0nVXmKCMywCyK2PodWxrXPiqnaCl8R7Y45yuCmMtYE2kBQQmmEsJkzEwXwvz8pcd-VryCoGkts4c_VGRstNl35f3kze2uhYd_CA0dPjPFh-xEZsLIXhIXpHdCHS80sCJuw4NvViKo7zylUQ6o-oDbi1i-3Tr9F_mixYeVe5QTiXLzCr1itefT9m3',
    phone: '+91 98765 43211',
  },
  {
    id: '3',
    name: 'Elena Rodriguez',
    patientId: '#PT-99302',
    location: 'Out-patient',
    status: 'Observation',
    tags: ['Type II Diabetes', 'Endocrinology'],
    lastVisit: 'Last visit: 08:45 AM (Today)',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDN4Uk9jVX3VDsiYMoZpSVj0F43SuUhNJwtOePWi-SlEzNIplBw1XA3qtIICE3kHOYL-lHisHhmvzpwt06if2hw1it_Fwkx4hUdbOO2vuLU8IHTJbH2pDUrGTx6Mlqi10SVLdgXgjbSkWOKoy2XYCkoK0SwHGkoqE6Mw8oGNjwVBh6pNjTXlVFJXaY_laOohV2vFuvswrchrVAeWxOyJW5VS__Hbh2s6UX549AcTi1f3PEYoD8iPM6pljiGqePUQHiSzprYMhVn7neQ',
    phone: '+91 98765 43212',
  },
  {
    id: '4',
    name: 'Michael Cho',
    patientId: '#PT-11204',
    location: 'Room 205',
    status: 'Stable',
    tags: ['Bronchitis', 'Pulmonology'],
    lastVisit: 'Last visit: 04:20 PM (Yesterday)',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCGc9j11uwi6D0_KPClL2sd8WRJQUhNiicXuXpAASkRRJMNe1-02rpEqidUBrgpEy5qV_9zDleMTnpDIeoSHrZMHKLmW89CFQcihNLXk3Tc0kaiFNclOj-kEVVru_N6DxocJ3n8EP2oVQmS-iNDAd8Nd98vNR-tjFjKExlZhX4G_w_RxHi1nKrauaKF-eLdHZ2AKFRSjXpJ3cNmlFuBImljBlgsD257Vbrm8D6NACrHy9csrY8SAuyD8Lcdc-d6vulwOPMlprVZfFI7',
    phone: '+91 98765 43213',
  },
];

const filters = ['All', 'In-Person', 'Video Consultations'];

const statusConfig: Record<PatientStatus, { bg: string; text: string }> = {
  Stable: { bg: 'bg-emerald-100', text: 'text-emerald-600' },
  Critical: { bg: 'bg-red-100', text: 'text-red-600' },
  Observation: { bg: 'bg-amber-100', text: 'text-amber-600' },
};

const statusSortOrder: Record<PatientStatus, number> = {
  Critical: 0,
  Observation: 1,
  Stable: 2,
};

export default function PatientsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [sortBy, setSortBy] = useState<SortOption>('name');

  const filtered = patients
    .filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.patientId.toLowerCase().includes(search.toLowerCase()) ||
      p.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'status':
          return statusSortOrder[a.status] - statusSortOrder[b.status];
        case 'lastVisit':
          return a.lastVisit.includes('Today') && !b.lastVisit.includes('Today') ? -1 : 1;
        default:
          return 0;
      }
    });

  const handleSortPress = () => {
    Alert.alert('Sort Patients By', 'Choose sorting option:', [
      {
        text: 'Name (A-Z)',
        onPress: () => setSortBy('name'),
      },
      {
        text: 'Status (Critical First)',
        onPress: () => setSortBy('status'),
      },
      {
        text: 'Last Visit (Recent First)',
        onPress: () => setSortBy('lastVisit'),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleBellPress = () => {
    Alert.alert(
      'Notifications',
      '3 new notifications:\n\n1. Lab results ready for Sarah Jenkins\n2. Robert Vance vitals update\n3. Elena Rodriguez appointment reminder',
      [{ text: 'OK' }]
    );
  };

  const handleLongPress = (patient: Patient) => {
    Alert.alert(`Quick Actions - ${patient.name}`, `Patient ID: ${patient.patientId}`, [
      {
        text: 'Call Patient',
        onPress: () =>
          Alert.alert('Call Patient', `Calling ${patient.name} at ${patient.phone}...`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Call', onPress: () => Alert.alert('Calling...', `Dialing ${patient.phone}`) },
          ]),
      },
      {
        text: 'Send Message',
        onPress: () =>
          Alert.alert('Send Message', `Message will be sent to ${patient.name} via the hospital portal.`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Send', onPress: () => Alert.alert('Sent', 'Message delivered successfully.') },
          ]),
      },
      {
        text: 'View History',
        onPress: () =>
          Alert.alert(
            `${patient.name} - History`,
            `Patient: ${patient.patientId}\nLocation: ${patient.location}\nStatus: ${patient.status}\nConditions: ${patient.tags.join(', ')}\n\nRecent History:\n- Admission: 3 days ago\n- Last vitals: Normal range\n- Medications: On schedule\n- Next review: Tomorrow 9 AM`
          ),
      },
      {
        text: 'Emergency Flag',
        style: 'destructive',
        onPress: () =>
          Alert.alert(
            'Flag Emergency',
            `Are you sure you want to flag ${patient.name} for emergency attention?`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Flag Emergency',
                style: 'destructive',
                onPress: () => Alert.alert('Emergency Flagged', `${patient.name} has been flagged. On-call team notified.`),
              },
            ]
          ),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleViewCharts = (patient: Patient) => {
    router.push({
      pathname: '/doctor/patient-clinical-summary',
      params: { id: patient.id },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top']}>
      {/* Blocky Header */}
      <View className="bg-primary/10 pt-6 pb-8 px-6 rounded-b-xl border-b border-primary/10">
        <View className="flex-row items-center justify-between mb-6">
          <View className="flex-row items-center gap-3">
            <View className="bg-white p-2 rounded-xl shadow-sm" style={Shadows.card}>
              <Hospital size={22} color="#1A73E8" />
            </View>
            <View>
              <Text className="text-xl font-bold text-midnight tracking-tight">Active Patients</Text>
              <Text className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Arun Priya Hospital</Text>
            </View>
          </View>
          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={handleBellPress}
              className="w-10 h-10 rounded-full bg-white items-center justify-center"
              style={Shadows.card}
            >
              <Bell size={20} color="#64748B" />
              <View className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
            </Pressable>
            <View className="w-10 h-10 rounded-full overflow-hidden border-2 border-white" style={Shadows.card}>
              <Image
                source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCBi8O_-pwXr0Ls1oPUv_Mx2ps-4bNAw3siGUB8AD4y_qfK0JujjLZq12G53ISiicZVFdBUk-91xNEogr81KGcMI9FxEs_JLVwilufCgXiRPU8YbZEPt0jGBMy97tJ2LYpfNLFQ7iRTEyNS0GC5S5PIB8A1MRJ0_rWOKeFLC-4MAsoVfhrksaQOiRPDiSneHlkH6aFrG-WE67ePcr1xe6WqRvmOJHCPyZ-1UdY7jEJLPB9cwvuUMOiS4x9msQs-uStGwNHT2hyZUjka' }}
                className="w-full h-full"
                resizeMode="cover"
              />
            </View>
          </View>
        </View>

        {/* Search Bar - Nested in Header */}
        <View className="relative">
          <View className="absolute left-4 top-0 bottom-0 justify-center z-10">
            <Search size={18} color="#94A3B8" />
          </View>
          <TextInput
            className="w-full bg-white rounded-2xl py-3.5 pl-12 pr-4 text-sm text-midnight"
            style={Shadows.card}
            placeholder="Search patient name, ID or department..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* Content Area */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-6">
          {/* Filters */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mt-6 -mx-6 px-6 max-h-12"
            contentContainerStyle={{ gap: 8, paddingRight: 40 }}
          >
            {filters.map((filter) => (
              <Pressable
                key={filter}
                onPress={() => setActiveFilter(filter)}
                className={
                  activeFilter === filter
                    ? 'px-5 py-2 rounded-full bg-primary'
                    : 'px-5 py-2 rounded-full bg-white border border-slate-100'
                }
                style={activeFilter === filter ? Shadows.focus : Shadows.card}
              >
                <Text
                  className={
                    activeFilter === filter
                      ? 'text-sm font-semibold text-white'
                      : 'text-sm font-medium text-slate-500'
                  }
                >
                  {filter}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Section Header */}
          <View className="flex-row items-center justify-between py-6">
            <Text className="text-lg font-bold text-midnight">
              Active Patients{' '}
              <Text className="text-slate-400 font-normal">({filtered.length})</Text>
            </Text>
            <Pressable
              onPress={handleSortPress}
              className="flex-row items-center gap-1.5 bg-white px-3 py-1.5 rounded-full border border-slate-100"
              style={Shadows.card}
            >
              <ArrowDownUp size={14} color="#1A73E8" />
              <Text className="text-primary text-xs font-bold">Sort</Text>
            </Pressable>
          </View>

          {/* Patient Cards */}
          {filtered.map((patient) => (
            <Pressable
              key={patient.id}
              onPress={() =>
                router.push({
                  pathname: '/doctor/patient-clinical-summary',
                  params: { id: patient.id },
                })
              }
              onLongPress={() => handleLongPress(patient)}
              delayLongPress={500}
              className="bg-white p-4 rounded-2xl mb-4 border border-slate-100 active:opacity-80"
              style={Shadows.card}
            >
              <View className="flex-row items-start gap-4">
                <Image
                  source={{ uri: patient.avatar }}
                  className="w-14 h-14 rounded-xl"
                />
                <View className="flex-1">
                  <View className="flex-row justify-between items-start">
                    <View className="flex-1 mr-2">
                      <Text className="font-bold text-midnight text-base">{patient.name}</Text>
                      <Text className="text-xs text-slate-500 font-medium uppercase tracking-tight mt-0.5">
                        ID: {patient.patientId} &bull; {patient.location}
                      </Text>
                    </View>
                    <View className={`px-2.5 py-1 rounded-lg ${statusConfig[patient.status].bg}`}>
                      <Text
                        className={`text-[10px] font-bold uppercase tracking-wider ${statusConfig[patient.status].text}`}
                      >
                        {patient.status}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row flex-wrap gap-2 mt-3">
                    {patient.tags.map((tag) => (
                      <View key={tag} className="px-2 py-1 rounded-md bg-slate-50 border border-slate-100">
                        <Text className="text-[10px] font-bold text-slate-500 uppercase">{tag}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
              <View className="mt-4 pt-4 border-t border-slate-50 flex-row justify-between items-center">
                <View className="flex-row items-center gap-1.5">
                  <Clock size={14} color="#94A3B8" />
                  <Text className="text-xs text-slate-400 font-medium">{patient.lastVisit}</Text>
                </View>
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    handleViewCharts(patient);
                  }}
                  className="flex-row items-center gap-1"
                  hitSlop={8}
                >
                  <Text className="text-primary text-xs font-bold">View Charts</Text>
                  <ArrowDownUp size={12} color="#1A73E8" style={{ transform: [{ rotate: '-90deg' }] }} />
                </Pressable>
              </View>
            </Pressable>
          ))}

          {filtered.length === 0 && (
            <View className="py-16 items-center">
              <Search size={40} color="#CBD5E1" />
              <Text className="text-slate-400 mt-3 text-sm">No patients match your search.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
