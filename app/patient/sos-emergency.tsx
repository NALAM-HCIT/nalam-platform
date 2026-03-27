import { CustomAlert } from '@/components/CustomAlert';
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, Linking, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Shadows, Colors } from '@/constants/theme';
import { patientService, PatientProfile } from '@/services/patientService';
import {
  ArrowLeft, Info, Phone, MapPin, User, Users, Heart, AlertCircle,
} from 'lucide-react-native';

export default function SOSEmergencyScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    patientService.getProfile()
      .then(setProfile)
      .catch(() => {}) // silently fail — SOS must still show
      .finally(() => setLoading(false));
  }, []);

  const emergencyName = profile?.emergencyContactName;
  const emergencyPhone = profile?.emergencyContactPhone;
  const emergencyRelation = profile?.emergencyContactRelation;
  const bloodGroup = profile?.bloodGroup;

  const handleSOSCall = useCallback(() => {
    CustomAlert.alert(
      'Call Emergency Services?',
      'This will call 108 (Ambulance / Emergency Services).',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call 108', style: 'destructive', onPress: () => Linking.openURL('tel:108') },
      ],
    );
  }, []);

  const handleCallContact = useCallback((phone: string | null | undefined, name: string) => {
    if (!phone) {
      CustomAlert.alert('No Phone Number', `No phone number saved for ${name}.\n\nUpdate your emergency contact from Edit Profile.`);
      return;
    }
    Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`);
  }, []);

  const handleNotifyAll = useCallback(() => {
    if (!emergencyPhone) {
      CustomAlert.alert('No Emergency Contact', 'Add an emergency contact from your Profile > Edit Profile.');
      return;
    }
    Linking.openURL(`tel:${emergencyPhone.replace(/\s+/g, '')}`);
  }, [emergencyPhone]);

  const contacts = emergencyName
    ? [{ name: emergencyName, relation: emergencyRelation || 'Emergency Contact', phone: emergencyPhone, icon: Users }]
    : [];

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
        <Pressable
          className="w-10 h-10 rounded-full bg-white items-center justify-center border border-slate-200"
          onPress={() => CustomAlert.alert('SOS Info', 'Press the SOS button to call 108 (ambulance). Your emergency contact will be notified automatically.')}
        >
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
            Nalam Emergency Dispatch
          </Text>
          <Text className="text-slate-500 text-sm mt-1 text-center">
            Help is available 24/7. Press SOS to call ambulance services.
          </Text>
        </View>

        {/* Main SOS Button */}
        <View className="items-center justify-center py-8">
          <View className="items-center justify-center w-64 h-64">
            <View className="absolute w-64 h-64 rounded-full bg-red-500/5" />
            <View className="absolute w-56 h-56 rounded-full bg-red-500/10" />
            <View className="absolute w-48 h-48 rounded-full bg-red-500/20" />
            <Pressable
              onPress={handleSOSCall}
              className="w-40 h-40 rounded-full bg-red-600 items-center justify-center border-8 border-white active:opacity-80"
              style={{
                shadowColor: '#DC2626',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.4,
                shadowRadius: 16,
                elevation: 10,
              }}
            >
              <Phone size={42} color="#FFFFFF" />
              <Text className="text-[10px] font-black uppercase tracking-tighter text-white text-center mt-1 px-4 leading-tight">
                Tap to Call{'\n'}Emergency
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Quick Call Buttons */}
        <View className="flex-row gap-3 mb-6">
          <Pressable
            onPress={() => Linking.openURL('tel:108')}
            className="flex-1 py-4 rounded-2xl bg-red-600 items-center active:opacity-80"
            style={Shadows.focus}
          >
            <Text className="text-white font-bold text-sm">108</Text>
            <Text className="text-white/80 text-[10px]">Ambulance</Text>
          </Pressable>
          <Pressable
            onPress={() => Linking.openURL('tel:112')}
            className="flex-1 py-4 rounded-2xl bg-orange-500 items-center active:opacity-80"
            style={Shadows.focus}
          >
            <Text className="text-white font-bold text-sm">112</Text>
            <Text className="text-white/80 text-[10px]">Police / Fire</Text>
          </Pressable>
          <Pressable
            onPress={() => Linking.openURL('tel:1066')}
            className="flex-1 py-4 rounded-2xl bg-primary items-center active:opacity-80"
            style={Shadows.focus}
          >
            <Text className="text-white font-bold text-sm">1066</Text>
            <Text className="text-white/80 text-[10px]">Poison Help</Text>
          </Pressable>
        </View>

        {/* Emergency Contacts */}
        <View className="mt-2">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="font-bold text-midnight">Emergency Contacts</Text>
            {contacts.length > 0 && (
              <Pressable onPress={handleNotifyAll}>
                <Text className="text-xs text-primary font-semibold">Notify All</Text>
              </Pressable>
            )}
          </View>

          {loading ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : contacts.length > 0 ? (
            <View className="gap-3">
              {contacts.map((contact, index) => {
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
                    <Pressable
                      onPress={() => handleCallContact(contact.phone, contact.name)}
                      className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center active:opacity-70"
                    >
                      <Phone size={18} color={Colors.primary} />
                    </Pressable>
                  </View>
                );
              })}
            </View>
          ) : (
            <Pressable
              onPress={() => router.push('/patient/edit-profile')}
              className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex-row items-center gap-3"
            >
              <AlertCircle size={18} color="#D97706" />
              <View className="flex-1">
                <Text className="text-amber-800 font-semibold text-sm">No emergency contact saved</Text>
                <Text className="text-amber-600 text-xs mt-0.5">Tap to add one in Edit Profile</Text>
              </View>
            </Pressable>
          )}
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

          {loading ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <View className="flex-row flex-wrap gap-4">
              <View className="w-[47%] p-3 rounded-lg bg-slate-50 border border-slate-100">
                <Text className="text-[10px] uppercase text-slate-500 font-bold">Blood Type</Text>
                <Text className={`font-black ${bloodGroup ? 'text-xl text-primary' : 'text-base text-slate-400 italic'}`}>
                  {bloodGroup || 'Not set'}
                </Text>
              </View>
              <View className="w-[47%] p-3 rounded-lg bg-slate-50 border border-slate-100">
                <Text className="text-[10px] uppercase text-slate-500 font-bold">Hospital</Text>
                <Text className="text-sm font-bold text-midnight" numberOfLines={2}>
                  {profile?.hospitalName || '—'}
                </Text>
              </View>
              <View className="w-full p-3 rounded-lg bg-amber-50 border border-amber-100">
                <Text className="text-[10px] uppercase text-amber-600 font-bold mb-1">Important</Text>
                <Text className="text-xs font-medium text-midnight">
                  Update your blood group and medical conditions in Edit Profile so first responders have accurate information.
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
