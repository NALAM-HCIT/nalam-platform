import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Shadows, Colors } from '@/constants/theme';
import {
  ArrowLeft, Search, ChevronDown, Star, MapPin, Briefcase,
  Video, Clock, ChevronRight, Heart, Brain, Bone, Baby,
  Stethoscope, Eye, Smile, WifiOff,
} from 'lucide-react-native';
import { getDoctors, DoctorListItem } from '@/services/appointmentService';

/* ───── Data ───── */

const SPECIALTIES = [
  { id: 'all', label: 'All', icon: Stethoscope, color: Colors.primary },
  { id: 'cardio', label: 'Cardiology', icon: Heart, color: '#DC2626' },
  { id: 'neuro', label: 'Neurology', icon: Brain, color: '#8B5CF6' },
  { id: 'ortho', label: 'Orthopedic', icon: Bone, color: '#0EA5E9' },
  { id: 'pedia', label: 'Pediatrics', icon: Baby, color: '#F59E0B' },
  { id: 'optha', label: 'Ophthalmology', icon: Eye, color: '#059669' },
  { id: 'dental', label: 'Dental', icon: Smile, color: '#EC4899' },
];

// Map specialty chip IDs to API search terms
const SPECIALTY_MAP: Record<string, string> = {
  cardio: 'cardio',
  neuro: 'neuro',
  ortho: 'ortho',
  pedia: 'pedia',
  optha: 'ophthalmol',
  dental: 'dental',
};

interface Doctor {
  id: string;
  doctorProfileId: string;
  name: string;
  initials: string;
  specialty: string;
  rating: number;
  reviews: number;
  exp: number;
  fee: number;
  online: boolean;
  languages: string;
}

/* ───── Sub-components ───── */

const SpecialtyChip = React.memo(function SpecialtyChip({
  item,
  isActive,
  onPress,
}: {
  item: typeof SPECIALTIES[0];
  isActive: boolean;
  onPress: () => void;
}) {
  const Icon = item.icon;
  return (
    <Pressable
      onPress={onPress}
      className={`items-center mr-4 ${isActive ? 'opacity-100' : 'opacity-60'}`}
    >
      <View
        className={`w-14 h-14 rounded-2xl items-center justify-center mb-1.5 ${
          isActive ? 'border-2' : 'bg-white'
        }`}
        style={[
          isActive
            ? { backgroundColor: item.color + '15', borderColor: item.color }
            : Shadows.card,
        ]}
      >
        <Icon size={22} color={isActive ? item.color : '#94A3B8'} />
      </View>
      <Text
        className={`text-[10px] font-bold ${isActive ? 'text-midnight' : 'text-slate-400'}`}
      >
        {item.label}
      </Text>
    </Pressable>
  );
});

const DoctorCard = React.memo(function DoctorCard({
  doc,
  onBook,
}: {
  doc: Doctor;
  onBook: () => void;
}) {
  return (
    <Pressable
      onPress={onBook}
      className="bg-white p-5 rounded-[24px] mb-4 border border-slate-50 active:opacity-90"
      style={Shadows.card}
    >
      {/* Doctor Info Row */}
      <View className="flex-row gap-4">
        <View className="relative">
          <View className="w-[76px] h-[76px] rounded-2xl bg-slate-100 items-center justify-center">
            <Text className="text-2xl font-bold text-slate-400">{doc.initials}</Text>
          </View>
          {doc.online && (
            <View className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-[#22C55E] rounded-full border-[3px] border-white items-center justify-center">
              <Video size={8} color="#FFFFFF" />
            </View>
          )}
        </View>

        <View className="flex-1 justify-between py-0.5">
          <View>
            <Text className="font-bold text-[16px] text-midnight">{doc.name}</Text>
            <Text className="text-primary text-xs font-bold mt-0.5">{doc.specialty}</Text>
          </View>

          <View className="flex-row items-center gap-3 mt-1.5">
            <View className="flex-row items-center gap-1">
              <Briefcase size={12} color="#94A3B8" />
              <Text className="text-[11px] text-slate-500 font-medium">{doc.exp} yrs</Text>
            </View>
            <View className="w-1 h-1 rounded-full bg-slate-300" />
            <View className="flex-row items-center gap-1">
              <Star size={12} color="#EAB308" fill="#EAB308" />
              <Text className="text-[11px] text-midnight font-bold">{doc.rating ?? '-'}</Text>
              <Text className="text-[10px] text-slate-400">({doc.reviews})</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Fee + Book */}
      <View className="flex-row items-center justify-between pt-4 mt-4 border-t border-slate-100">
        <View>
          {doc.languages ? (
            <Text className="text-[11px] text-slate-400 font-medium mb-1">{doc.languages}</Text>
          ) : null}
          <Text className="text-xl font-extrabold text-midnight">
            {'\u20B9'}{doc.fee}
          </Text>
        </View>
        <Pressable
          onPress={onBook}
          className="bg-primary px-8 py-3 rounded-full flex-row items-center gap-1.5"
          style={Shadows.focus}
        >
          <Text className="text-white font-bold text-sm">Book Now</Text>
          <ChevronRight size={14} color="#FFFFFF" />
        </Pressable>
      </View>
    </Pressable>
  );
});

/* ───── Main Screen ───── */

export default function ConsultationTypeScreen() {
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const [activeSpecialty, setActiveSpecialty] = useState('all');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDoctors = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const specialtyFilter = activeSpecialty !== 'all' ? SPECIALTY_MAP[activeSpecialty] : undefined;
      const searchFilter = searchText.trim() || undefined;

      const response = await getDoctors({
        specialty: specialtyFilter,
        search: searchFilter,
        pageSize: 50,
      });

      const mapped: Doctor[] = response.doctors.map((d) => ({
        id: d.userId,
        doctorProfileId: d.doctorProfileId,
        name: d.fullName,
        initials: d.initials,
        specialty: d.specialty,
        rating: d.rating ?? 0,
        reviews: d.reviewCount,
        exp: d.experienceYears,
        fee: d.consultationFee,
        online: d.availableForVideo,
        languages: d.languages ?? '',
      }));

      setDoctors(mapped);
    } catch (err: any) {
      setError(err.message || 'Failed to load doctors');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeSpecialty, searchText]);

  useEffect(() => {
    const timer = setTimeout(() => fetchDoctors(), 300);
    return () => clearTimeout(timer);
  }, [fetchDoctors]);

  const handleBook = useCallback(
    (doc: Doctor) => {
      router.push({
        pathname: '/patient/slot-selection',
        params: {
          doctorProfileId: doc.doctorProfileId,
          doctorName: doc.name,
          specialty: doc.specialty,
          fee: doc.fee.toString(),
          initials: doc.initials,
          exp: doc.exp.toString(),
          rating: doc.rating.toString(),
          reviews: doc.reviews.toString(),
        },
      });
    },
    [router],
  );

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top']}>
      {/* Header */}
      <View className="px-5 pt-2 pb-4">
        <View className="flex-row items-center gap-4 mb-5">
          <Pressable onPress={() => router.back()} className="p-2 -ml-2 rounded-full">
            <ArrowLeft size={22} color="#0B1B3D" />
          </Pressable>
          <Text className="text-xl font-bold tracking-tight text-midnight">Book Appointment</Text>
        </View>

        {/* Search Bar */}
        <View
          className="flex-row items-center bg-white rounded-2xl px-4 py-3.5"
          style={Shadows.card}
        >
          <Search size={18} color="#94A3B8" />
          <TextInput
            className="flex-1 ml-3 text-sm text-midnight"
            placeholder="Search doctors, specialties..."
            placeholderTextColor="#94A3B8"
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>

        {/* Specialty Icons */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-5"
          contentContainerStyle={{ paddingRight: 16 }}
        >
          {SPECIALTIES.map((s) => (
            <SpecialtyChip
              key={s.id}
              item={s}
              isActive={activeSpecialty === s.id}
              onPress={() => setActiveSpecialty(s.id)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Doctor List */}
      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchDoctors(true)} tintColor={Colors.primary} />
        }
      >
        <View className="flex-row items-center justify-between px-1 mb-4">
          <Text className="text-lg font-bold text-midnight">
            {activeSpecialty === 'all' ? 'Top Specialists' : SPECIALTIES.find((s) => s.id === activeSpecialty)?.label}
          </Text>
          <Text className="text-slate-400 text-xs font-semibold">{doctors.length} doctors</Text>
        </View>

        {loading ? (
          <View className="items-center pt-16">
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text className="text-slate-400 text-sm font-medium mt-4">Loading doctors...</Text>
          </View>
        ) : error ? (
          <View className="items-center pt-16">
            <WifiOff size={48} color="#CBD5E1" />
            <Text className="text-slate-400 text-sm font-medium mt-4">{error}</Text>
            <Pressable
              onPress={() => fetchDoctors()}
              className="mt-4 bg-primary px-6 py-2.5 rounded-full"
            >
              <Text className="text-white font-bold text-sm">Retry</Text>
            </Pressable>
          </View>
        ) : doctors.length === 0 ? (
          <View className="items-center pt-16">
            <Stethoscope size={48} color="#CBD5E1" />
            <Text className="text-slate-400 text-sm font-medium mt-4">No doctors found</Text>
            <Text className="text-slate-300 text-xs mt-1">Try a different specialty or search term</Text>
          </View>
        ) : (
          doctors.map((doc) => (
            <DoctorCard key={doc.doctorProfileId} doc={doc} onBook={() => handleBook(doc)} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
