import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, KeyboardAvoidingView,
  Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Shadows } from '@/constants/theme';
import { ArrowLeft, Send } from 'lucide-react-native';
import { messagesService, MessageItem } from '@/services/messagesService';

const ROLE_COLOR: Record<string, string> = {
  doctor:       '#1A73E8',
  admin:        '#7C3AED',
  pharmacist:   '#059669',
  receptionist: '#D97706',
  nurse:        '#E11D48',
};

function formatMsgTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (msgDay.getTime() === today.getTime())     return 'Today';
  if (msgDay.getTime() === yesterday.getTime()) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'short' });
}

export default function MessageThreadScreen() {
  const router = useRouter();
  const { userId, name } = useLocalSearchParams<{ userId: string; name: string }>();
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [recipient, setRecipient] = useState<{
    id: string; name: string; initials: string; role: string; department: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const loadThread = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await messagesService.getThread(userId);
      setRecipient(data.recipient);
      setMessages(data.messages);
    } catch {
      /* keep existing data */
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { loadThread(); }, [loadThread]);

  // Poll for new messages every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading) loadThread();
    }, 10000);
    return () => clearInterval(interval);
  }, [loading, loadThread]);

  const handleSend = async () => {
    if (!text.trim() || !userId || sending) return;
    const body = text.trim();
    setText('');
    setSending(true);
    try {
      const sent = await messagesService.sendMessage(userId, body);
      setMessages((prev) => [...prev, sent]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      setText(body); // restore on failure
    } finally {
      setSending(false);
    }
  };

  // Group messages by date
  const grouped: { dateLabel: string; msgs: MessageItem[] }[] = [];
  messages.forEach((msg) => {
    const label = formatDateLabel(msg.createdAt);
    const last = grouped[grouped.length - 1];
    if (!last || last.dateLabel !== label) {
      grouped.push({ dateLabel: label, msgs: [msg] });
    } else {
      last.msgs.push(msg);
    }
  });

  const recipientName = recipient?.name ?? name ?? 'Chat';
  const roleColor = ROLE_COLOR[recipient?.role ?? ''] ?? '#64748B';
  const initials = recipient?.initials ?? recipientName.slice(0, 2).toUpperCase();

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top']}>
      {/* Header */}
      <View
        className="flex-row items-center px-4 py-3 bg-white border-b border-slate-100"
        style={Shadows.card}
      >
        <Pressable onPress={() => router.back()} className="p-2 -ml-2 active:opacity-60">
          <ArrowLeft size={22} color="#0B1B3D" />
        </Pressable>
        <View
          className="w-10 h-10 rounded-full items-center justify-center mx-3"
          style={{ backgroundColor: `${roleColor}15` }}
        >
          <Text className="text-sm font-bold" style={{ color: roleColor }}>{initials}</Text>
        </View>
        <View className="flex-1">
          <Text className="font-bold text-sm text-midnight" numberOfLines={1}>{recipientName}</Text>
          {recipient && (
            <Text className="text-[11px] text-slate-400">
              {recipient.role.charAt(0).toUpperCase() + recipient.role.slice(1)}
              {recipient.department ? ` · ${recipient.department}` : ''}
            </Text>
          )}
        </View>
      </View>

      {/* Messages */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1A73E8" />
        </View>
      ) : (
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            ref={scrollRef}
            className="flex-1 px-4"
            contentContainerStyle={{ paddingTop: 16, paddingBottom: 12 }}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          >
            {grouped.length === 0 ? (
              <View className="items-center py-12">
                <View
                  className="w-16 h-16 rounded-full items-center justify-center mb-3"
                  style={{ backgroundColor: `${roleColor}12` }}
                >
                  <Text className="text-2xl font-bold" style={{ color: roleColor }}>{initials}</Text>
                </View>
                <Text className="text-slate-500 text-sm font-medium">{recipientName}</Text>
                <Text className="text-slate-400 text-xs mt-1">No messages yet. Say hello!</Text>
              </View>
            ) : (
              grouped.map((group) => (
                <View key={group.dateLabel}>
                  {/* Date separator */}
                  <View className="items-center my-3">
                    <View className="bg-slate-200/60 px-3 py-1 rounded-full">
                      <Text className="text-[10px] font-semibold text-slate-500">{group.dateLabel}</Text>
                    </View>
                  </View>

                  {group.msgs.map((msg) => (
                    <View
                      key={msg.id}
                      className={`mb-2 max-w-[78%] ${msg.isSentByMe ? 'self-end' : 'self-start'}`}
                    >
                      <View
                        className="rounded-2xl px-4 py-2.5"
                        style={{
                          backgroundColor: msg.isSentByMe ? '#1A73E8' : '#FFFFFF',
                          borderBottomRightRadius: msg.isSentByMe ? 4 : 16,
                          borderBottomLeftRadius:  msg.isSentByMe ? 16 : 4,
                          ...(msg.isSentByMe ? {} : (Shadows.card as object)),
                        }}
                      >
                        <Text
                          className="text-sm leading-5"
                          style={{ color: msg.isSentByMe ? '#FFFFFF' : '#0B1B3D' }}
                        >
                          {msg.body}
                        </Text>
                      </View>
                      <Text
                        className="text-[9px] text-slate-400 mt-0.5"
                        style={{ textAlign: msg.isSentByMe ? 'right' : 'left', paddingHorizontal: 4 }}
                      >
                        {formatMsgTime(msg.createdAt)}
                        {msg.isSentByMe && (msg.isRead ? '  ✓✓' : '  ✓')}
                      </Text>
                    </View>
                  ))}
                </View>
              ))
            )}
          </ScrollView>

          {/* Input Bar */}
          <View
            className="flex-row items-end gap-3 px-4 py-3 bg-white border-t border-slate-100"
            style={Shadows.card}
          >
            <TextInput
              className="flex-1 bg-slate-100 rounded-2xl px-4 py-2.5 text-sm text-slate-900"
              style={{ maxHeight: 100 }}
              placeholder="Type a message..."
              placeholderTextColor="#94A3B8"
              value={text}
              onChangeText={setText}
              multiline
              returnKeyType="default"
            />
            <Pressable
              onPress={handleSend}
              disabled={!text.trim() || sending}
              className="w-10 h-10 rounded-full items-center justify-center active:opacity-70"
              style={{ backgroundColor: text.trim() && !sending ? '#1A73E8' : '#E2E8F0' }}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Send size={18} color={text.trim() ? '#FFFFFF' : '#94A3B8'} />
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}
