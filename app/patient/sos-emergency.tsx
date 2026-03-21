import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Shadows } from '@/constants/theme';
import {
  ArrowLeft, Info, Phone, MapPin, User, Users, Heart, AlertCircle, Siren,
} from 'lucide-react-native';

const emergencyContacts = [
  { name: 'Dr. Sarah Johnson', relation: 'Primary Physician', icon: User },
  { name: 'Ravi Kumar', relation: 'Spouse', icon: Users },
];

export default function SOSEmergencyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white/70 border-b border-slate-200/50">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-white items-center justify-center border border-slate-200"
          style={Shadows.card}
        >
          <ArrowLeft size={20} color="#0B1B3D" />
        </Pressable>
        <Text className="text-lg font-bold leading-tight tracking-tight text-midnight">
          Emergency SOS
        </Text>
        <Pressable className="w-10 h-10 rounded-full bg-white items-center justify-center border border-slate-200">
          <Info size={20} color="#0B1B3D" />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Indicator */}
        <View className="items-center py-6">
          <View className="flex-row items-center gap-2 px-3 py-1 rounded-full bg-primary/10 mb-2">
            <View className="w-3 h-3 rounded-full bg-primary" />
            <Text className="text-[10px] font-bold uppercase tracking-widest text-primary">
              Emergency Mode Active
            </Text>
          </View>
          <Text className="text-3xl font-extrabold leading-tight text-midnight text-center">
            Nalam Hospital Dispatch
          </Text>
          <Text className="text-slate-500 text-sm mt-1 text-center">
            Help is available 24/7. Connecting you to the nearest trauma center.
          </Text>
        </View>

        {/* Main SOS Button Area */}
        <View className="items-center justify-center py-8">
          <View className="items-center justify-center w-64 h-64">
            {/* Ripple Layers */}
            <View className="absolute w-64 h-64 rounded-full bg-primary/5" />
            <View className="absolute w-56 h-56 rounded-full bg-primary/10" />
            <View className="absolute w-48 h-48 rounded-full bg-primary/20" />
            {/* The Primary Action Button */}
            <Pressable
              className="w-40 h-40 rounded-full bg-primary items-center justify-center border-8 border-white"
              style={{
                ...Shadows.focus,
                shadowOpacity: 0.4,
              }}
            >
              <Phone size={42} color="#FFFFFF" />
              <Text className="text-[10px] font-black uppercase tracking-tighter text-white text-center mt-1 px-4 leading-tight">
                Hold to Call{'\n'}Emergency
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Location Snippet */}
        <View className="mt-4 rounded-xl overflow-hidden bg-white border border-slate-200" style={Shadows.card}>
          <View className="h-32 bg-slate-100 items-center justify-center">
            <MapPin size={40} color="#1A73E8" />
            <Text className="text-slate-400 text-xs mt-1">Map View</Text>
          </View>
          <View className="flex-row items-center justify-between px-3 py-2 bg-white/95">
            <Text className="text-[10px] font-medium text-midnight flex-1" numberOfLines={1}>
              Current Location: Apollo Street, Block 4, T-Nagar
            </Text>
            <Text className="text-primary text-[10px] font-bold ml-2">GPS High Precision</Text>
          </View>
        </View>

        {/* Emergency Contacts */}
        <View className="mt-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="font-bold text-midnight">Emergency Contacts</Text>
            <Text className="text-xs text-primary font-semibold">Notify All</Text>
          </View>
          <View className="gap-3">
            {emergencyContacts.map((contact, index) => {
              const IconComp = contact.icon;
              return (
                <View
                  key={index}
                  className="flex-row items-center justify-between p-4 rounded-xl bg-white border border-slate-200"
                  style={Shadows.card}
                >
                  <View className="flex-row items-center gap-3">
                    <View className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center">
                      <IconComp size={20} color="#475569" />
                    </View>
                    <View>
                      <Text className="font-bold text-sm text-midnight">{contact.name}</Text>
                      <Text className="text-xs text-slate-500">{contact.relation}</Text>
                    </View>
                  </View>
                  <Pressable className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center">
                    <Phone size={18} color="#1A73E8" />
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>

        {/* First Responder Info */}
        <View
          className="mt-8 p-5 rounded-xl bg-white border-2 border-primary/20"
          style={{ ...Shadows.card, shadowColor: '#1A73E8', shadowOpacity: 0.05 }}
        >
          <View className="flex-row items-center gap-2 mb-4">
            <AlertCircle size={20} color="#1A73E8" />
            <Text className="font-bold uppercase tracking-wide text-sm text-midnight">
              First Responder Info
            </Text>
          </View>
          <View className="flex-row flex-wrap gap-4">
            <View className="w-[47%] p-3 rounded-lg bg-slate-50 border border-slate-100">
              <Text className="text-[10px] uppercase text-slate-500 font-bold">Blood Type</Text>
              <Text className="text-xl font-black text-primary">O-Positive</Text>
            </View>
            <View className="w-[47%] p-3 rounded-lg bg-slate-50 border border-slate-100">
              <Text className="text-[10px] uppercase text-slate-500 font-bold">Allergies</Text>
              <Text className="text-sm font-bold text-midnight">Penicillin, Latex</Text>
            </View>
            <View className="w-full p-3 rounded-lg bg-slate-50 border border-slate-100">
              <Text className="text-[10px] uppercase text-slate-500 font-bold">Recent History</Text>
              <Text className="text-xs font-medium text-midnight">
                Cardiac Stent Procedure (Mar 2024)
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
