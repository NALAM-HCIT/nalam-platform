import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Image, TextInput, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Shadows } from '@/constants/theme';
import { ArrowLeft, Bell, Search, Phone, MessageCircle, User } from 'lucide-react-native';
import { useRouter } from 'expo-router';

const departments = ['All', 'Cardiology', 'Oncology', 'Nursing'];

interface StaffMember {
  id: string;
  name: string;
  role: string;
  avatar: string | null;
  phone: string;
  email: string;
  experience: string;
  department: string;
}

interface StaffSection {
  department: string;
  memberCount: number;
  members: StaffMember[];
}

const staffSections: StaffSection[] = [
  {
    department: 'Cardiology',
    memberCount: 12,
    members: [
      {
        id: '1',
        name: 'Dr. Arul Mozhi',
        role: 'Senior Cardiologist',
        avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAGF4vMIOKfP6PWSBL8Syz6X6e2e-uEzJrDB1bjSpwdysgoH80bbCgPPglkbuzBb7nU0qd1wqVkhLl7ChDDAPs-aqmJnp2Ge31FQ9D9KlLV1BQcZNTOWXB8-PBXdq6nbytYRg6P2KchaPhnytawjnwlF8PsKDU12RvFQ_JV7X9u4cnGwOa_nLu63n7oQeIOgrjwzmvSoNdRnwYSnhv6WhFmnbaWI9aNiVE6Zrf_14UXZ5PQd_1Iw0uvQdYOUn7_z-xGhWGWjGlfZTSF',
        phone: '+91 98765 11111',
        email: 'arul.mozhi@nalamhospital.com',
        experience: '18 years',
        department: 'Cardiology',
      },
      {
        id: '2',
        name: 'Dr. Priya Sharma',
        role: 'Interventional Cardiology',
        avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAh9hA-bX7AD9V9tUW7AwIbHthDovqEw2tcZfDgLHzYfZR-ZNeZdQBH1WVmJ-3px501qhpp3x0ehvgi0GhC7qvi2osCNYmFXRu7ZhozIe1PF0kENSEe2mBosowot2V7d-QSSi5NMakpotd96t3WsMOqqdTEsK_4wvtNEVPvdpm4Vwc0NIvWylrKD2fr8Hw4OmrppLPsOCAjQVqYX94FX0pK4ZMglaQnFM_MaMdBz-p3h5gHV_s6qZK58Saotl567OyHtSOCC4rx1sMQ',
        phone: '+91 98765 22222',
        email: 'priya.sharma@nalamhospital.com',
        experience: '12 years',
        department: 'Cardiology',
      },
    ],
  },
  {
    department: 'Nursing Staff',
    memberCount: 48,
    members: [
      {
        id: '3',
        name: 'Kavitha Rajan',
        role: 'Head Nurse - ICU',
        avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAbllyyV2MobWvQ2WBoh2T7VDuqFyT43Y8jImuz1QET7rdsoJFskWlZXMgJHi0e_g6MYKqNGc8pzGRmyBbMlRG64Ad9cSsR9w8qP1kf5hRG-vRwdcUvSehwRn13tdCbdGCFklFDeFePTPlbKY7WwupRS-ULyaBO17vVC70a-NCPaziyCD3IkNy9R5DSl6ye5QweGq74tLbySWcnAZvZ3eLNtXcdh-b0hzBr77Xc62QWUydrT6z2pFdyhnbllNE08oeWW1vWl70BGjw-',
        phone: '+91 98765 33333',
        email: 'kavitha.rajan@nalamhospital.com',
        experience: '15 years',
        department: 'Nursing',
      },
    ],
  },
  {
    department: 'Administration',
    memberCount: 8,
    members: [
      {
        id: '4',
        name: 'Meera Iyer',
        role: 'Hospital Administrator',
        avatar: null,
        phone: '+91 98765 44444',
        email: 'meera.iyer@nalamhospital.com',
        experience: '10 years',
        department: 'Administration',
      },
    ],
  },
];

export default function DirectoryScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDepartment, setActiveDepartment] = useState('All');

  const filteredSections = staffSections
    .map((section) => {
      const filteredMembers = section.members.filter((member) => {
        const matchesSearch =
          searchQuery === '' ||
          member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          member.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
          member.department.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesDept =
          activeDepartment === 'All' ||
          member.department.toLowerCase().includes(activeDepartment.toLowerCase()) ||
          section.department.toLowerCase().includes(activeDepartment.toLowerCase());

        return matchesSearch && matchesDept;
      });

      return { ...section, members: filteredMembers };
    })
    .filter((section) => section.members.length > 0);

  const handleCallPress = (member: StaffMember) => {
    Alert.alert(
      `Call ${member.name}?`,
      `Phone: ${member.phone}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call',
          onPress: () => {
            const phoneUrl = `tel:${member.phone.replace(/\s/g, '')}`;
            Linking.canOpenURL(phoneUrl).then((supported) => {
              if (supported) {
                Linking.openURL(phoneUrl);
              } else {
                Alert.alert('Calling...', `Dialing ${member.name} at ${member.phone}`);
              }
            });
          },
        },
      ]
    );
  };

  const handleMessagePress = (member: StaffMember) => {
    Alert.alert(
      `Send message to ${member.name}?`,
      `This will open a chat with ${member.name} (${member.role}).`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: () =>
            Alert.alert('Message Sent', `Your message has been sent to ${member.name}.`),
        },
      ]
    );
  };

  const handleStaffCardPress = (member: StaffMember) => {
    Alert.alert(
      member.name,
      `Role: ${member.role}\nDepartment: ${member.department}\nExperience: ${member.experience}\n\nContact:\nPhone: ${member.phone}\nEmail: ${member.email}`,
      [
        { text: 'Close' },
        {
          text: 'Call',
          onPress: () => handleCallPress(member),
        },
        {
          text: 'Message',
          onPress: () => handleMessagePress(member),
        },
      ]
    );
  };

  const handleBellPress = () => {
    Alert.alert(
      'Notifications',
      '2 new notifications:\n\n1. Dr. Arul Mozhi updated his availability schedule.\n2. New staff member added to Oncology department.',
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top']}>
      {/* Blocky Header */}
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
          <Pressable
            onPress={handleBellPress}
            className="w-10 h-10 rounded-full bg-white items-center justify-center"
            style={Shadows.card}
          >
            <Bell size={20} color="#64748B" />
            <View className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
          </Pressable>
        </View>

        {/* Search Bar - Nested in Header */}
        <View className="relative">
          <View className="absolute left-4 top-0 bottom-0 justify-center z-10">
            <Search size={18} color="#94A3B8" />
          </View>
          <TextInput
            className="w-full bg-white rounded-2xl py-3.5 pl-12 pr-4 text-sm text-midnight"
            style={Shadows.card}
            placeholder="Search by name or department..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
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
          {/* Department Filter */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mt-6 -mx-6 px-6 max-h-12"
            contentContainerStyle={{ gap: 8, paddingRight: 40 }}
          >
            {departments.map((dept) => (
              <Pressable
                key={dept}
                onPress={() => setActiveDepartment(dept)}
                className={`px-5 py-2 rounded-full ${
                  activeDepartment === dept ? 'bg-primary' : 'bg-white border border-slate-100'
                }`}
                style={activeDepartment === dept ? Shadows.focus : Shadows.card}
              >
                <Text
                  className={`text-sm font-semibold ${
                    activeDepartment === dept ? 'text-white' : 'text-slate-500'
                  }`}
                >
                  {dept}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Staff List */}
          <View className="mt-8">
            {filteredSections.length === 0 ? (
              <View className="py-16 items-center">
                <Search size={40} color="#CBD5E1" />
                <Text className="text-slate-400 mt-3 text-sm">No staff members found.</Text>
              </View>
            ) : (
              filteredSections.map((section) => (
                <View key={section.department} className="mb-6">
                  {/* Section Header */}
                  <View className="flex-row items-center justify-between mb-3 px-1">
                    <Text className="text-sm font-bold uppercase tracking-wider text-slate-400">
                      {section.department}
                    </Text>
                    <Text className="text-xs font-medium text-primary">
                      {section.memberCount} Members
                    </Text>
                  </View>

                  {/* Member Cards */}
                  <View className="gap-3">
                    {section.members.map((member) => (
                      <Pressable
                        key={member.id}
                        onPress={() => handleStaffCardPress(member)}
                        className="bg-white p-3 rounded-2xl border border-slate-100 flex-row items-center gap-3 active:opacity-80"
                        style={Shadows.card}
                      >
                        {/* Avatar */}
                        {member.avatar ? (
                          <Image
                            source={{ uri: member.avatar }}
                            className="w-14 h-14 rounded-xl"
                            resizeMode="cover"
                          />
                        ) : (
                          <View className="w-14 h-14 rounded-xl bg-slate-200 items-center justify-center">
                            <User size={24} color="#94A3B8" />
                          </View>
                        )}

                        {/* Info */}
                        <View className="flex-1">
                          <Text className="font-bold text-slate-900">{member.name}</Text>
                          <Text className="text-xs text-slate-500">{member.role}</Text>
                        </View>

                        {/* Action Buttons */}
                        <View className="flex-row gap-2">
                          <Pressable
                            onPress={(e) => {
                              e.stopPropagation();
                              handleCallPress(member);
                            }}
                            className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center active:opacity-70"
                          >
                            <Phone size={20} color="#1A73E8" />
                          </Pressable>
                          <Pressable
                            onPress={(e) => {
                              e.stopPropagation();
                              handleMessagePress(member);
                            }}
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
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
