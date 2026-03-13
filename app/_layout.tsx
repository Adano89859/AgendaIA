// app/_layout.tsx

import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getPreference, initDatabase } from '../database/db';
import { LocaleProvider } from '../utils/LocaleContext';
import { ONBOARDING_DONE_KEY } from './onboarding';

export default function RootLayout() {
  useEffect(() => {
    initDatabase();
    // setTimeout 0 → espera a que el navegador esté montado antes de redirigir
    setTimeout(() => {
      const seen = getPreference(ONBOARDING_DONE_KEY, 'false');
      if (seen !== 'true') {
        router.replace('/onboarding');
      }
    }, 0);
  }, []);

  return (
    <SafeAreaProvider>
      <LocaleProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen
            name="event/[id]"
            options={{
              headerShown: true,
              headerTitle: 'Evento',
              headerStyle: { backgroundColor: '#0f0f0f' },
              headerTintColor: '#ffffff',
              headerBackTitle: '',
            }}
          />
          <Stack.Screen
            name="event/new"
            options={{
              headerShown: true,
              headerTitle: 'Nuevo Evento',
              headerStyle: { backgroundColor: '#0f0f0f' },
              headerTintColor: '#ffffff',
              headerBackTitle: '',
            }}
          />
        </Stack>
      </LocaleProvider>
    </SafeAreaProvider>
  );
}