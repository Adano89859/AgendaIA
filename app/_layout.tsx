// app/_layout.tsx

import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getPreference, initDatabase } from '../database/db';
import { LocaleProvider, useLocale } from '../utils/LocaleContext';
import { ThemeProvider, useTheme } from '../utils/ThemeContext';

import { ONBOARDING_DONE_KEY } from './onboarding';

// Componente interno que tiene acceso al tema y al idioma
function AppStack() {
  const { colors, theme } = useTheme();
  const { t } = useLocale();

  const isDark = theme === 'dark' || theme === 'highContrast';

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen
          name="event/[id]"
          options={{
            headerShown: true,
            headerTitle: t('eventDetail'),
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
            headerBackTitle: '',
          }}
        />
        <Stack.Screen
          name="event/new"
          options={{
            headerShown: true,
            headerTitle: t('newEvent'),
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
            headerBackTitle: '',
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  useEffect(() => {
    initDatabase();
    setTimeout(() => {
      const seen = getPreference(ONBOARDING_DONE_KEY, 'false');
      if (seen !== 'true') {
        router.replace('/onboarding');
      }
    }, 0);
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <LocaleProvider>
          <AppStack />
        </LocaleProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}