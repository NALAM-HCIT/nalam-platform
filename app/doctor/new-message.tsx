import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Shadows } from '@/constants/theme';
import { ArrowLeft, Search, X } from 'lucide-react-native';
import { messagesService, MessageThread, MessageContact } from '@/services/messagesService';

const ROLE_COLOR: Record<string, string> = {
  doctor:       '#1A73E8',
  admin:        '#7C3AED',
  pharmacist:   '#059669',
  receptionist: '#D97706',
  nurse:        '#E11D48',
};

type ContactItem = MessageThread | MessageContact;

export default function NewMessageScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [all, setAll] = useState<ContactItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    messagesService.getThreads()
      .then((data) => {
        // Merge threads + contacts into one flat list, threads first
        const map = new Map<string, ContactItem>();
        data.threads.forEach((t) => map.set(t.userId, t));
        data.contacts.forEach((c) => { if (!map.has(c.userId)) map.set(c.userId, c); });
        setAll(Array.from(map.values()));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = all.filter((item) => {
    const q = search.toLowerCase();
    return (
      q === '' ||
      item.name.toLowerCase().includes(q) ||
      item.role.toLowerCase().includes(q) ||
      (item.department ?? '').toLowerCase().includes(q)
    );
  });

  const handleSelect = useCallback((item: ContactItem) => {
    router.push({
      pathname: '/doctor/message-thread',
      params: { userId: item.userId, name: item.name },
    } as any);
  }, [router]);

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center gap-3 px-4 py-3 bg-white border-b border-slate-100">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center active:bg-slate-200"
        >
          <ArrowLeft size={20} color="#0B1B3D" />
        </Pressable>
        <Text className="text-lg font-bold text-midnight">New Message</Text>
      </View>

      {/* Search */}
      <View className="px-4 py-3 bg-white border-b border-slate-100">
        <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 gap-2">
          <Search size={16} color="#94A3B8" />
          <TextInput
            className="flex-1 text-sm text-midnight"
            placeholder="Search by name, role, department..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
            autoFocus
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <X size={15} color="#94A3B8" />
            </Pressable>
          )}
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1A73E8" />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingVertical: 8, paddingHorizontal: 16, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {filtered.length === 0 ? (
            <View className="items-center py-16">
              <Text className="text-slate-400 text-sm">No contacts found.</Text>
            </View>
          ) : (
            filtered.map((item) => {
              const roleColor = ROLE_COLOR[item.role] ?? '#64748B';
              const hasThread = item.lastMessage !== null;
              return (
                <Pressable
                  key={item.userId}
                  onPress={() => handleSelect(item)}
                  className="flex-row items-center gap-3 py-3 border-b border-slate-50 active:opacity-70"
                >
                  <View
                    className="w-12 h-12 rounded-full items-center justify-center"
                    style={{ backgroundColor: `${roleColor}15` }}
                  >
                    <Text className="font-bold text-sm" style={{ color: roleColor }}>
                      {item.initials}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="font-bold text-midnight text-sm">{item.name}</Text>
                    <View className="flex-row items-center gap-1.5 mt-0.5">
                      <View
                        className="px-1.5 py-0.5 rounded-full"
                        style={{ backgroundColor: `${roleColor}12` }}
                      >
                        <Text style={{ fontSize: 9, fontWeight: '700', color: roleColor }}>
                          {item.role.charAt(0).toUpperCase() + item.role.slice(1)}
                        </Text>
                      </View>
                      {item.department && (
                        <Text className="text-[10px] text-slate-400">{item.department}</Text>
                      )}
                    </View>
                  </View>
                  {hasThread && (
                    <View className="px-2 py-0.5 bg-slate-100 rounded-full">
                      <Text className="text-[10px] font-bold text-slate-400">Existing</Text>
                    </View>
                  )}
                </Pressable>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
