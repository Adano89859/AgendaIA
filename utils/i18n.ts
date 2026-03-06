import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { I18n } from 'i18n-js';
import en from '../locales/en';
import es from '../locales/es';
import pl from '../locales/pl';

export const i18n = new I18n({ es, en, pl });

i18n.enableFallback = true;
i18n.defaultLocale = 'es';

const systemLocale = Localization.getLocales()[0]?.languageCode ?? 'es';
i18n.locale = ['es', 'en', 'pl'].includes(systemLocale) ? systemLocale : 'es';

export const LANGUAGES = [
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'pl', label: 'Polski', flag: '🇵🇱' },
];

export async function loadSavedLocale() {
  try {
    const saved = await AsyncStorage.getItem('app_locale');
    if (saved && ['es', 'en', 'pl'].includes(saved)) {
      i18n.locale = saved;
    }
  } catch {}
}

export async function setLocale(code: string) {
  i18n.locale = code;
  try {
    await AsyncStorage.setItem('app_locale', code);
  } catch {}
}