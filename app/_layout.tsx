import '../global.css';
import React from 'react';
import { LogBox } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Known Fabric compatibility issue with react-native-svg — suppress the thrown error
LogBox.ignoreLogs(['Unsupported top level event type "topSvgLayout"']);
const originalHandler = ErrorUtils.getGlobalHandler();
ErrorUtils.setGlobalHandler((error, isFatal) => {
  if (error?.message?.includes('topSvgLayout')) return;
  originalHandler(error, isFatal);
});

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="care-provider" />
          <Stack.Screen name="patient" />
          <Stack.Screen name="doctor" />
          <Stack.Screen name="receptionist" />
          <Stack.Screen name="pharmacist" />
          <Stack.Screen name="admin" />
        </Stack>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
