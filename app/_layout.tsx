import '../global.css';
import React, { useEffect, useState } from 'react';
import { LogBox, View, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { CustomAlertProvider } from '@/components/CustomAlert';

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

    // "Auth flow" = screens where a logged-in user should be redirected to their dashboard
    const isLoginScreen = segments[1] === 'login' || segments[1] === 'otp';
    const inAuthFlow = segments[0] === '(index)' || !segments[0] || isLoginScreen || segments[0] === 'care-provider-select';
    const inProtectedRoute = ['patient', 'doctor', 'receptionist', 'pharmacist', 'admin'].includes(segments[0] as string) && !isLoginScreen;
    // Role select & care-provider OTP are transitional — don't redirect away from them
    const inTransition = segments[0] === 'care-provider-role-select' || segments[0] === 'care-provider-otp';

    if (inTransition) {
      // User is mid-flow (OTP verification or role selection) — leave them alone
    } else if (isAuthenticated && role && inAuthFlow) {
      // User is logged in but on login/splash screen — redirect to their dashboard
      router.replace(`/${role}/(tabs)` as any);
    } else if (!isAuthenticated && inProtectedRoute) {
      // Token expired or user logged out — redirect to login
      router.replace('/');
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
        <CustomAlertProvider />
        <AuthGate>
          <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="care-provider-select" />
            <Stack.Screen name="care-provider-otp" />
            <Stack.Screen name="care-provider-role-select" />
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
