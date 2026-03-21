import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text, Platform } from 'react-native';
import { LayoutGrid, CalendarCheck, Users, User } from 'lucide-react-native';
import { Colors } from '@/constants/theme';

function TabIcon({ icon: Icon, label, focused }: { icon: any; label: string; focused: boolean }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', minWidth: 56, paddingVertical: 8 }}>
      <View
        style={{
          width: 42,
          height: 42,
          borderRadius: 14,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: focused ? `${Colors.primary}15` : 'transparent',
        }}
      >
        <Icon
          size={24}
          color={focused ? Colors.primary : '#94A3B8'}
          strokeWidth={2}
        />
      </View>
      <Text
        style={{
          fontSize: 10,
          marginTop: 3,
          fontWeight: focused ? '700' : '500',
          color: focused ? Colors.primary : '#94A3B8',
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

const tabBarStyle = {
  position: 'absolute' as const,
  bottom: 0,
  left: 16,
  right: 16,
  height: 72,
  borderRadius: 20,
  backgroundColor: '#FFFFFF',
  borderTopWidth: 0,
  shadowColor: '#0B1B3D',
  shadowOffset: { width: 0, height: -4 },
  shadowOpacity: 0.08,
  shadowRadius: 16,
  elevation: 16,
  paddingBottom: 0,
  paddingTop: 0,
};

export default function ReceptionistTabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarStyle, tabBarShowLabel: false }}>
      <Tabs.Screen
        name="index"
        options={{ tabBarIcon: ({ focused }) => <TabIcon icon={LayoutGrid} label="Home" focused={focused} /> }}
      />
      <Tabs.Screen
        name="appointments"
        options={{ tabBarIcon: ({ focused }) => <TabIcon icon={CalendarCheck} label="Bookings" focused={focused} /> }}
      />
      <Tabs.Screen
        name="patients"
        options={{ tabBarIcon: ({ focused }) => <TabIcon icon={Users} label="Patients" focused={focused} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ tabBarIcon: ({ focused }) => <TabIcon icon={User} label="Profile" focused={focused} /> }}
      />
    </Tabs>
  );
}
