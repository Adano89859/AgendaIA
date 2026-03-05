import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { initDatabase } from '../database/db';

export default function RootLayout() {
  useEffect(() => {
    initDatabase();
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="event/[id]"
          options={{
            headerShown: true,
            headerTitle: 'Evento',
            headerStyle: { backgroundColor: '#0f0f0f' },
            headerTintColor: '#ffffff',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="event/new"
          options={{
            headerShown: true,
            headerTitle: 'Nuevo Evento',
            headerStyle: { backgroundColor: '#0f0f0f' },
            headerTintColor: '#ffffff',
            presentation: 'modal',
          }}
        />
      </Stack>
    </>
  );
}