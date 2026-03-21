import React from 'react';
import { Stack } from 'expo-router';

export default function DoctorLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="otp" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="active-consultation" />
      <Stack.Screen name="consultation-summary" />
      <Stack.Screen name="consultation-success" />
      <Stack.Screen name="patient-clinical-summary" />
      <Stack.Screen name="edit-profile" />
    </Stack>
  );
}
