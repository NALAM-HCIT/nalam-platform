import { CustomAlert } from '@/components/CustomAlert';
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Linking, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Shadows, Colors } from '@/constants/theme';
import { ArrowLeft, Bell, Search, Phone, MessageCircle, User } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { doctorPortalService, DirectoryGroup, DirectoryMember } from '@/services/doctorPortalService';

export default function DirectoryScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [staffGroups, setStaffGroups] = useState<DirectoryGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDirectory = useCallback(async (search?: string) => {
    try {
      const data = await doctorPortalService.getDirectory(search || undefined);
      setStaffGroups(data);
    } catch (err) {
      console.error('Failed to load directory:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDirectory();
  }, [fetchDirectory]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDirectory(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, fetchDirectory]);

  const handleCallPress = (member: DirectoryMember) => {
    CustomAlert.alert(
      `Call ${member.name}?`,
      `Phone: ${member.phone}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call',
          onPress: () => {
            const phoneUrl = `tel:${member.phone.replace(/\s/g, '')}`;
            Linking.canOpenURL(phoneUrl).then((supported) => {
              if (supported) Linking.openURL(phoneUrl);
              else CustomAlert.alert('Calling...', `Dialing ${member.name} at ${member.phone}`);
            });
          },
        },
      ]
    );
  };

  const handleMessagePress = (member: DirectoryMember) => {
    CustomAlert.alert(
      `Send message to ${member.name}?`,
      `This will open a chat with ${member.name} (${member.role}).`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send', onPress: () => CustomAlert.alert('Message Sent', `Your message has been sent to ${member.name}.`) },
      ]
    );
  };

  const handleStaffCardPress = (member: DirectoryMember) => {
    CustomAlert.alert(
      member.name,
      `Role: ${member.role}${member.department ? `\nDepartment: ${member.department}` : ''}${member.email ? `\nEmail: ${member.email}` : ''}\nPhone: ${member.phone}`,
      [
        { text: 'Close' },
        { text: 'Call', onPress: () => handleCallPress(member) },
        { text: 'Message', onPress: () => handleMessagePress(member) },
      ]
    );
  };

  const roleLabel = (role: string) => {
    switch (role) {
      case 'doctor': return 'Doctors';
      case 'receptionist': return 'Reception Staff';
      case 'pharmacist': return 'Pharmacy Staff';
      case 'admin': return 'Administration';
      default: return role.charAt(0).toUpperCase() + role.slice(1);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top']}>
      {/* Header */}
      <View className="bg-primary/10 pt-6 pb-8 px-6 rounded-b-xl border-b border-primary/10">
        <View className="flex-row items-center justify-between mb-6">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-white items-center justify-center"
            style={Shadows.card}
          >
            <ArrowLeft size={20} color="#1A73E8" />
          </Pressable>
          <Text className="text-xl font-bold text-midnight">Staff Directory</Text>
          <View className="w-10" />
        </View>

        {/* Search Bar */}
        <View className="relative">
          <View className="absolute left-4 top-0 bottom-0 justify-center z-10">
            <Search size={18} color="#94A3B8" />
          </View>
          <TextInput
            className="w-full bg-white rounded-2xl py-3.5 pl-12 pr-4 text-sm text-midnight"
            style={Shadows.card}
            placeholder="Search by name or role..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Content */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-6 mt-6">
          {loading ? (
            <View className="py-16 items-center">
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text className="text-slate-400 text-sm mt-4">Loading directory...</Text>
            </View>
          ) : staffGroups.length === 0 ? (
            <View className="py-16 items-center">
              <Search size={40} color="#CBD5E1" />
              <Text className="text-slate-400 mt-3 text-sm">No staff members found.</Text>
            </View>
          ) : (
            staffGroups.map((group) => (
              <View key={group.role} className="mb-6">
                {/* Section Header */}
                <View className="flex-row items-center justify-between mb-3 px-1">
                  <Text className="text-sm font-bold uppercase tracking-wider text-slate-400">
                    {roleLabel(group.role)}
                  </Text>
                  <Text className="text-xs font-medium text-primary">
                    {group.memberCount} {group.memberCount === 1 ? 'Member' : 'Members'}
                  </Text>
                </View>

                {/* Member Cards */}
                <View className="gap-3">
                  {group.members.map((member) => (
                    <Pressable
                      key={member.id}
                      onPress={() => handleStaffCardPress(member)}
                      className="bg-white p-3 rounded-2xl border border-slate-100 flex-row items-center gap-3 active:opacity-80"
                      style={Shadows.card}
                    >
                      {/* Avatar */}
                      <View className="w-14 h-14 rounded-xl bg-primary/10 items-center justify-center">
                        <Text className="text-base font-bold text-primary">{member.initials}</Text>
                      </View>

                      {/* Info */}
                      <View className="flex-1">
                        <Text className="font-bold text-slate-900">{member.name}</Text>
                        <Text className="text-xs text-slate-500">
                          {member.role}{member.department ? ` • ${member.department}` : ''}
                        </Text>
                      </View>

                      {/* Action Buttons */}
                      <View className="flex-row gap-2">
                        <Pressable
                          onPress={(e) => { e.stopPropagation(); handleCallPress(member); }}
                          className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center active:opacity-70"
                        >
                          <Phone size={20} color="#1A73E8" />
                        </Pressable>
                        <Pressable
                          onPress={(e) => { e.stopPropagation(); handleMessagePress(member); }}
                          className="w-10 h-10 rounded-full bg-emerald-50 items-center justify-center active:opacity-70"
                        >
                          <MessageCircle size={20} color="#059669" />
                        </Pressable>
                      </View>
                    </Pressable>
                  ))}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
