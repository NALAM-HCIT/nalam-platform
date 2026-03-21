import React from 'react';
import { Stack } from 'expo-router';

export default function PatientLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="otp" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="consultation-type" />
      <Stack.Screen name="slot-selection" />
      <Stack.Screen name="booking-review" />
      <Stack.Screen name="booking-confirmation" />
      <Stack.Screen name="edit-booking" />
      <Stack.Screen name="edit-success" />
      <Stack.Screen name="appointment-details" />
      <Stack.Screen name="arrival-confirmed" />
      <Stack.Screen name="join-call" />
      <Stack.Screen name="video-consultation" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="post-consultation" />
      <Stack.Screen name="digital-prescription" />
      <Stack.Screen name="pharmacy-cart" />
      <Stack.Screen name="secure-checkout" />
      <Stack.Screen name="order-confirmation" />
      <Stack.Screen name="document-view" options={{ presentation: 'modal' }} />
      <Stack.Screen name="sos-emergency" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="edit-profile" />
    </Stack>
  );
}
