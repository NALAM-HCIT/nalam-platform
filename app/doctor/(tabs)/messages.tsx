import { CustomAlert } from '@/components/CustomAlert';
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Shadows } from '@/constants/theme';
import { Search, SquarePen } from 'lucide-react-native';
const tabs = ['All', 'Doctors', 'Staff'] as const;
type TabType = (typeof tabs)[number];
type ConvType = 'doctor' | 'staff';

interface Conversation {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
  avatar: string;
  faded?: boolean;
  type: ConvType;
  recentMessages: string[];
}

const initialConversations: Conversation[] = [
  {
    id: '1',
    name: 'Dr. Aris Thorne',
    lastMessage: 'The lab results are ready for patient #402...',
    time: '10:45 AM',
    unread: 2,
    online: true,
    avatar: 'AT',
    type: 'doctor',
    recentMessages: [
      'Dr. Aris: The lab results are ready for patient #402.',
      'Dr. Aris: Please review the CBC panel when you get a chance.',
      'You: I will take a look shortly. Thanks!',
    ],
  },
  {
    id: '2',
    name: 'Dr. Sarah Jenkins',
    lastMessage: 'Can we reschedule the board meeting?',
    time: '9:12 AM',
    unread: 0,
    online: false,
    avatar: 'SJ',
    type: 'doctor',
    recentMessages: [
      'Dr. Sarah: Can we reschedule the board meeting?',
      'You: Sure, what time works for you?',
      'Dr. Sarah: How about Thursday at 3 PM?',
    ],
  },
  {
    id: '3',
    name: 'Nurse Michael Chen',
    lastMessage: 'Patient in Ward 4 requires immediate review.',
    time: '8:30 AM',
    unread: 5,
    online: true,
    avatar: 'MC',
    type: 'staff',
    recentMessages: [
      'Nurse Chen: Patient in Ward 4 requires immediate review.',
      'Nurse Chen: Vitals are fluctuating - BP 160/95.',
      'Nurse Chen: I have administered the prescribed medication.',
      'Nurse Chen: Please advise on next steps.',
      'Nurse Chen: Patient is now stable but needs check.',
    ],
  },
  {
    id: '4',
    name: 'Lab Admin Elena',
    lastMessage: 'The pathology reports have been uploaded.',
    time: 'Yesterday',
    unread: 0,
    online: false,
    avatar: 'LE',
    faded: true,
    type: 'staff',
    recentMessages: [
      'Elena: The pathology reports have been uploaded.',
      'You: Great, I will review them today.',
      'Elena: Let me know if you need any re-runs.',
    ],
  },
  {
    id: '5',
    name: 'Dr. James Wilson',
    lastMessage: 'Thanks for the referral on the ortho case.',
    time: 'Yesterday',
    unread: 0,
    online: false,
    avatar: 'JW',
    faded: true,
    type: 'doctor',
    recentMessages: [
      'Dr. Wilson: Thanks for the referral on the ortho case.',
      'You: Happy to help. Keep me posted on the outcome.',
      'Dr. Wilson: Will do. The surgery is scheduled for next week.',
    ],
  },
];

const recipientList = [
  'Dr. Aris Thorne',
  'Dr. Sarah Jenkins',
  'Dr. James Wilson',
  'Dr. Priya Sharma',
  'Nurse Michael Chen',
  'Lab Admin Elena',
  'Kavitha Rajan (Head Nurse)',
  'Meera Iyer (Admin)',
];

export default function MessagesScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [conversations, setConversations] = useState(initialConversations);

  const filteredConversations = conversations.filter((conv) => {
    const matchesSearch =
      searchQuery === '' ||
      conv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTab =
      activeTab === 'All' ||
      (activeTab === 'Doctors' && conv.type === 'doctor') ||
      (activeTab === 'Staff' && conv.type === 'staff');

    return matchesSearch && matchesTab;
  });

  const handleComposePress = () => {
    const options = recipientList.map((name) => ({
      text: name,
      onPress: () => {
        CustomAlert.alert(
          `New Message to ${name}`,
          'Type your message below:',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Send "Hello"',
              onPress: () => CustomAlert.alert('Message Sent', `Your message has been sent to ${name}.`),
            },
          ]
        );
      },
    }));

    // Alert can show limited buttons, so show the first few plus cancel
    CustomAlert.alert('New Message', 'Select a recipient:', [
      ...options.slice(0, 5),
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleConversationPress = (conv: Conversation) => {
    // Mark as read
    if (conv.unread > 0) {
      setConversations((prev) =>
        prev.map((c) => (c.id === conv.id ? { ...c, unread: 0, faded: false } : c))
      );
    }

    const messagesText = conv.recentMessages.join('\n\n');
    CustomAlert.alert(
      conv.name,
      `${conv.online ? '(Online)' : '(Offline)'}\n\nRecent Messages:\n\n${messagesText}`,
      [
        { text: 'Close', style: 'cancel' },
        {
          text: 'Reply',
          onPress: () => {
            CustomAlert.alert(
              `Reply to ${conv.name}`,
              'Choose a quick reply:',
              [
                {
                  text: 'Will follow up shortly.',
                  onPress: () => CustomAlert.alert('Sent', `Reply sent to ${conv.name}: "Will follow up shortly."`),
                },
                {
                  text: 'Thanks, noted.',
                  onPress: () => CustomAlert.alert('Sent', `Reply sent to ${conv.name}: "Thanks, noted."`),
                },
                {
                  text: 'Please schedule a meeting.',
                  onPress: () => CustomAlert.alert('Sent', `Reply sent to ${conv.name}: "Please schedule a meeting."`),
                },
                { text: 'Cancel', style: 'cancel' },
              ]
            );
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top']}>
      {/* Header */}
      <View className="px-6 pt-6 pb-2">
        <View className="flex-row justify-between items-center mb-6">
          <View>
            <Text className="text-2xl font-bold text-slate-900">Messages</Text>
            <Text className="text-sm text-slate-500">Nalam Hospital Portal</Text>
          </View>
          <Pressable onPress={handleComposePress} className="bg-primary/10 p-2 rounded-full active:opacity-70">
            <SquarePen size={22} color="#1A73E8" />
          </Pressable>
        </View>

        {/* Search Bar */}
        <View
          className="flex-row items-center bg-white rounded-xl px-4 py-3"
          style={Shadows.card}
        >
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
              className={`flex-1 py-2 rounded-lg items-center ${
                activeTab === tab ? 'bg-white' : ''
              }`}
              style={activeTab === tab ? Shadows.card : undefined}
            >
              <Text
                className={`text-sm font-semibold ${
                  activeTab === tab ? 'text-primary' : 'text-slate-500'
                }`}
              >
                {tab}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Chat List */}
      <ScrollView
        className="flex-1 mt-6 px-2"
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {filteredConversations.length === 0 ? (
          <View className="py-16 items-center">
            <Search size={40} color="#CBD5E1" />
            <Text className="text-slate-400 mt-3 text-sm">No conversations found.</Text>
          </View>
        ) : (
          filteredConversations.map((conv) => (
            <Pressable
              key={conv.id}
              onPress={() => handleConversationPress(conv)}
              className={`flex-row items-center gap-4 p-4 rounded-2xl active:bg-slate-50 ${
                conv.faded ? 'opacity-80' : ''
              }`}
            >
              {/* Avatar */}
              <View className="relative">
                <View className="w-14 h-14 rounded-full bg-slate-200 items-center justify-center">
                  <Text className="text-base font-bold text-slate-600">
                    {conv.avatar}
                  </Text>
                </View>
                {conv.online && (
                  <View className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-[#F8FAFC]" />
                )}
              </View>

              {/* Content */}
              <View className="flex-1 min-w-0">
                <View className="flex-row justify-between items-baseline mb-1">
                  <Text
                    className="font-bold text-slate-900 flex-shrink"
                    numberOfLines={1}
                  >
                    {conv.name}
                  </Text>
                  <Text
                    className={`text-[10px] font-semibold uppercase ml-2 ${
                      conv.unread > 0 ? 'text-primary' : 'text-slate-400'
                    }`}
                  >
                    {conv.time}
                  </Text>
                </View>
                <View className="flex-row justify-between items-center">
                  <Text
                    className={`text-sm flex-1 ${
                      conv.unread > 0
                        ? 'font-medium text-slate-900'
                        : conv.faded
                        ? 'text-slate-400'
                        : 'text-slate-500'
                    }`}
                    numberOfLines={1}
                  >
                    {conv.lastMessage}
                  </Text>
                  {conv.unread > 0 && (
                    <View className="bg-primary rounded-full min-w-[20px] px-1.5 py-0.5 items-center justify-center ml-2">
                      <Text className="text-white text-[10px] font-bold">
                        {conv.unread}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
