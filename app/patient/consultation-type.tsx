import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Shadows, Colors } from '@/constants/theme';
import {
  ArrowLeft, Search, ChevronDown, Star, MapPin, Briefcase,
  Video, Clock, ChevronRight, Heart, Brain, Bone, Baby,
  Stethoscope, Eye, Smile,
} from 'lucide-react-native';

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

interface Doctor {
  id: string;
  name: string;
  initials: string;
  specialty: string;
  specialtyId: string;
  rating: number;
  reviews: number;
  exp: number;
  dist: string;
  fee: number;
  online: boolean;
  nextSlot: string;
  languages: string;
}

const DOCTORS: Doctor[] = [
  { id: '1', name: 'Dr. Aruna Reddy', initials: 'AR', specialty: 'Cardiologist', specialtyId: 'cardio', rating: 4.9, reviews: 312, exp: 12, dist: '2.4 km', fee: 800, online: true, nextSlot: '10:30 AM Today', languages: 'Tamil, English' },
  { id: '2', name: 'Dr. Sarah Johnson', initials: 'SJ', specialty: 'Neurologist', specialtyId: 'neuro', rating: 4.8, reviews: 198, exp: 8, dist: '1.1 km', fee: 650, online: false, nextSlot: '2:00 PM Today', languages: 'English, Hindi' },
  { id: '3', name: 'Dr. James Wilson', initials: 'JW', specialty: 'Orthopedic', specialtyId: 'ortho', rating: 4.7, reviews: 425, exp: 15, dist: '3.8 km', fee: 1000, online: true, nextSlot: '11:00 AM Tomorrow', languages: 'English' },
  { id: '4', name: 'Dr. Elena Gomez', initials: 'EG', specialty: 'Pediatrician', specialtyId: 'pedia', rating: 5.0, reviews: 156, exp: 6, dist: '0.5 km', fee: 500, online: false, nextSlot: '9:00 AM Today', languages: 'Tamil, English, Hindi' },
  { id: '5', name: 'Dr. Priya Sharma', initials: 'PS', specialty: 'Cardiologist', specialtyId: 'cardio', rating: 4.6, reviews: 89, exp: 5, dist: '4.2 km', fee: 600, online: true, nextSlot: '3:30 PM Today', languages: 'Hindi, English' },
  { id: '6', name: 'Dr. Vikram Patel', initials: 'VP', specialty: 'Neurologist', specialtyId: 'neuro', rating: 4.9, reviews: 267, exp: 18, dist: '5.1 km', fee: 1200, online: true, nextSlot: '4:00 PM Today', languages: 'English, Gujarati' },
];

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
              <MapPin size={12} color="#94A3B8" />
              <Text className="text-[11px] text-slate-500 font-medium">{doc.dist}</Text>
            </View>
            <View className="w-1 h-1 rounded-full bg-slate-300" />
            <View className="flex-row items-center gap-1">
              <Star size={12} color="#EAB308" fill="#EAB308" />
              <Text className="text-[11px] text-midnight font-bold">{doc.rating}</Text>
              <Text className="text-[10px] text-slate-400">({doc.reviews})</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Next Slot + Fee + Book */}
      <View className="flex-row items-center justify-between pt-4 mt-4 border-t border-slate-100">
        <View>
          <View className="flex-row items-center gap-1.5 mb-1">
            <Clock size={11} color="#059669" />
            <Text className="text-[11px] text-emerald-600 font-semibold">{doc.nextSlot}</Text>
          </View>
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

  const filteredDoctors = useMemo(() => {
    let results = DOCTORS;
    if (activeSpecialty !== 'all') {
      results = results.filter((d) => d.specialtyId === activeSpecialty);
    }
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      results = results.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.specialty.toLowerCase().includes(q),
      );
    }
    return results;
  }, [activeSpecialty, searchText]);

  const handleBook = useCallback(
    (doc: Doctor) => {
      router.push({
        pathname: '/patient/slot-selection',
        params: {
          doctorId: doc.id,
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
      >
        <View className="flex-row items-center justify-between px-1 mb-4">
          <Text className="text-lg font-bold text-midnight">
            {activeSpecialty === 'all' ? 'Top Specialists' : SPECIALTIES.find((s) => s.id === activeSpecialty)?.label}
          </Text>
          <Text className="text-slate-400 text-xs font-semibold">{filteredDoctors.length} doctors</Text>
        </View>

        {filteredDoctors.length === 0 ? (
          <View className="items-center pt-16">
            <Stethoscope size={48} color="#CBD5E1" />
            <Text className="text-slate-400 text-sm font-medium mt-4">No doctors found</Text>
            <Text className="text-slate-300 text-xs mt-1">Try a different specialty or search term</Text>
          </View>
        ) : (
          filteredDoctors.map((doc) => (
            <DoctorCard key={doc.id} doc={doc} onBook={() => handleBook(doc)} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
