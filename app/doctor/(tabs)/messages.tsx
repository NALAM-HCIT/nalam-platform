import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Shadows } from '@/constants/theme';
import { Search, SquarePen, MessageSquare } from 'lucide-react-native';
import { messagesService, MessageThread, MessageContact } from '@/services/messagesService';

const tabs = ['All', 'Doctors', 'Staff'] as const;
type TabType = (typeof tabs)[number];

type ListItem = MessageThread | MessageContact;

const ROLE_COLOR: Record<string, string> = {
  doctor:       '#1A73E8',
  admin:        '#7C3AED',
  pharmacist:   '#059669',
  receptionist: '#D97706',
  nurse:        '#E11D48',
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

export default function MessagesScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [contacts, setContacts] = useState<MessageContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadThreads = useCallback((isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    messagesService.getThreads()
      .then((data) => {
        setThreads(data.threads);
        setContacts(data.contacts);
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, []);

  useEffect(() => { loadThreads(); }, [loadThreads]);

  const filteredItems: ListItem[] = (() => {
    const isDoctor = (item: ListItem) => item.role === 'doctor';
    const isStaff  = (item: ListItem) => item.role !== 'doctor';
    const q = searchQuery.toLowerCase();

    const matchesSearch = (item: ListItem) =>
      q === '' ||
      item.name.toLowerCase().includes(q) ||
      (item.lastMessage ?? '').toLowerCase().includes(q);

    const matchesTab = (item: ListItem) =>
      activeTab === 'All' ||
      (activeTab === 'Doctors' && isDoctor(item)) ||
      (activeTab === 'Staff'   && isStaff(item));

    const activeThreads = threads.filter(t => matchesSearch(t) && matchesTab(t));
    const activeContacts = contacts.filter(c => matchesSearch(c) && matchesTab(c));

    return [...activeThreads, ...activeContacts];
  })();

  const totalUnread = threads.reduce((sum, t) => sum + t.unreadCount, 0);

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top']}>
      {/* Header */}
      <View className="px-6 pt-6 pb-2">
        <View className="flex-row justify-between items-center mb-6">
          <View>
            <Text className="text-2xl font-bold text-slate-900">Messages</Text>
            <Text className="text-sm text-slate-500">
              {totalUnread > 0 ? `${totalUnread} unread message${totalUnread > 1 ? 's' : ''}` : 'Hospital Portal'}
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/doctor/new-message' as any)}
            className="bg-primary/10 p-2 rounded-full active:opacity-70"
          >
            <SquarePen size={22} color="#1A73E8" />
          </Pressable>
        </View>

        {/* Search Bar */}
        <View className="flex-row items-center bg-white rounded-xl px-4 py-3" style={Shadows.card}>
          <Search size={20} color="#94A3B8" />
          <TextInput
            className="flex-1 ml-3 text-slate-900 text-sm"
            placeholder="Search contacts..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Tabs */}
      <View className="px-6 mt-4">
        <View className="flex-row gap-2 p-1 bg-slate-200/50 rounded-xl">
          {tabs.map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-lg items-center ${activeTab === tab ? 'bg-white' : ''}`}
              style={activeTab === tab ? Shadows.card : undefined}
            >
              <Text className={`text-sm font-semibold ${activeTab === tab ? 'text-primary' : 'text-slate-500'}`}>
                {tab}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Chat List */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1A73E8" />
        </View>
      ) : (
        <ScrollView
          className="flex-1 mt-6 px-2"
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadThreads(true)} tintColor="#1A73E8" />}
        >
          {filteredItems.length === 0 ? (
            <View className="py-16 items-center">
              <MessageSquare size={40} color="#CBD5E1" />
              <Text className="text-slate-400 mt-3 text-sm">No conversations found.</Text>
            </View>
          ) : (
            filteredItems.map((item) => {
              const hasMessages = item.lastMessage !== null;
              const isThread = hasMessages;
              const roleColor = ROLE_COLOR[item.role] ?? '#64748B';

              return (
                <Pressable
                  key={item.userId}
                  onPress={() => router.push({ pathname: '/doctor/message-thread', params: { userId: item.userId, name: item.name } } as any)}
                  className="flex-row items-center gap-4 p-4 rounded-2xl active:bg-slate-50"
                  style={!hasMessages ? { opacity: 0.7 } : undefined}
                >
                  {/* Avatar */}
                  <View className="relative">
                    <View
                      className="w-14 h-14 rounded-full items-center justify-center"
                      style={{ backgroundColor: `${roleColor}15` }}
                    >
                      <Text className="text-base font-bold" style={{ color: roleColor }}>
                        {item.initials}
                      </Text>
                    </View>
                    {(item as MessageThread).unreadCount > 0 && (
                      <View className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full items-center justify-center border-2 border-[#F8FAFC]">
                        <Text className="text-white text-[9px] font-bold">
                          {(item as MessageThread).unreadCount}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Content */}
                  <View className="flex-1 min-w-0">
                    <View className="flex-row justify-between items-baseline mb-0.5">
                      <Text
                        className={`flex-shrink font-bold text-slate-900 ${!hasMessages ? 'text-slate-500' : ''}`}
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                      {item.lastMessageAt && (
                        <Text className="text-[10px] font-semibold uppercase ml-2 text-slate-400">
                          {formatTime(item.lastMessageAt)}
                        </Text>
                      )}
                    </View>

                    <View className="flex-row items-center gap-1.5">
                      {/* Role badge */}
                      <View className="px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${roleColor}12` }}>
                        <Text style={{ fontSize: 9, fontWeight: '700', color: roleColor }}>
                          {item.role.charAt(0).toUpperCase() + item.role.slice(1)}
                        </Text>
                      </View>
                      {item.department && (
                        <Text className="text-[10px] text-slate-400" numberOfLines={1}>
                          {item.department}
                        </Text>
                      )}
                    </View>

                    {item.lastMessage && (
                      <Text
                        className={`text-sm mt-0.5 ${(item as MessageThread).unreadCount > 0 ? 'font-semibold text-slate-800' : 'text-slate-500'}`}
                        numberOfLines={1}
                      >
                        {(item as MessageThread).isSentByMe ? 'You: ' : ''}{item.lastMessage}
                      </Text>
                    )}

                    {!hasMessages && (
                      <Text className="text-[11px] text-slate-400 mt-0.5 italic">Tap to start a conversation</Text>
                    )}
                  </View>
                </Pressable>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
