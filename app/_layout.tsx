import '../global.css';
import React, { useEffect, useState } from 'react';
import { LogBox, View, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';

// Known Fabric compatibility issue with react-native-svg — suppress the thrown error
LogBox.ignoreLogs(['Unsupported top level event type "topSvgLayout"']);
const originalHandler = ErrorUtils.getGlobalHandler();
ErrorUtils.setGlobalHandler((error, isFatal) => {
  if (error?.message?.includes('topSvgLayout')) return;
  originalHandler(error, isFatal);
});

const queryClient = new QueryClient();

function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, role, checkAuth } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth().finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthFlow = segments[0] === 'care-provider' || segments[0] === 'patient' || segments[0] === '(index)' || !segments[0];

    if (isAuthenticated && role && inAuthFlow) {
      // User is logged in but on login/splash screen — redirect to their dashboard
      router.replace(`/${role}/(tabs)` as any);
    }
  }, [isAuthenticated, role, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
        <ActivityIndicator size="large" color="#1A73E8" />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style="auto" />
        <AuthGate>
          <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="care-provider" />
            <Stack.Screen name="patient" />
            <Stack.Screen name="doctor" />
            <Stack.Screen name="receptionist" />
            <Stack.Screen name="pharmacist" />
            <Stack.Screen name="admin" />
          </Stack>
        </AuthGate>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
