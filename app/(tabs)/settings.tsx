// app/(tabs)/settings.tsx

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { getPreference, setPreference } from '../../database/db';
import { LANGUAGES } from '../../utils/i18n';
import { useLocale } from '../../utils/LocaleContext';
import {
  ADVANCE_OPTIONS,
  getAdvanceMinutes,
  requestNotificationPermissions,
  saveAdvanceMinutes,
} from '../../utils/notifications';
import { SpeechRecognitionModule } from '../../utils/speechRecognition';
import { ONBOARDING_DONE_KEY } from '../onboarding';

export const VOICE_INPUT_KEY = 'voice_input_enabled';

export default function SettingsScreen() {
  const { locale: currentLocale, changeLocale, t } = useLocale();
  const [advanceMinutes, setAdvanceMinutesState] = useState(15);
  const [voiceEnabled, setVoiceEnabled] = useState(false);

  useEffect(() => {
    requestNotificationPermissions();
    setAdvanceMinutesState(getAdvanceMinutes());
    setVoiceEnabled(getPreference(VOICE_INPUT_KEY, 'false') === 'true');
  }, []);

  const handleAdvanceChange = (minutes: number) => {
    saveAdvanceMinutes(minutes);
    setAdvanceMinutesState(minutes);
  };

  const handleVoiceToggle = async () => {
    if (!voiceEnabled) {
      const result = await SpeechRecognitionModule.requestPermissionsAsync();
      if (!result.granted) return;
    }
    const next = !voiceEnabled;
    setPreference(VOICE_INPUT_KEY, String(next));
    setVoiceEnabled(next);
  };

  const handleShowTutorial = () => {
    setPreference(ONBOARDING_DONE_KEY, 'false');
    router.push('/onboarding');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('settings')}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>

        {/* Idioma */}
        <Text style={styles.sectionTitle}>{t('language')}</Text>
        <View style={styles.card}>
          {LANGUAGES.map((lang, index) => (
            <TouchableOpacity
              key={lang.code}
              style={[
                styles.langRow,
                index < LANGUAGES.length - 1 && styles.rowBorder,
              ]}
              onPress={() => changeLocale(lang.code)}
              activeOpacity={0.7}
            >
              <Text style={styles.langFlag}>{lang.flag}</Text>
              <Text style={styles.langLabel}>{lang.label}</Text>
              {currentLocale === lang.code && (
                <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Notificaciones */}
        <Text style={styles.sectionTitle}>{t('notifications')}</Text>
        <View style={styles.card}>
          <View style={[styles.notifHeader, styles.rowBorder]}>
            <Ionicons name="notifications-outline" size={18} color={Colors.textSecondary} />
            <Text style={styles.notifLabel}>{t('notificationAdvance')}</Text>
          </View>
          <View style={styles.advanceRow}>
            {ADVANCE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.advanceBtn,
                  advanceMinutes === opt.value && styles.advanceBtnActive,
                ]}
                onPress={() => handleAdvanceChange(opt.value)}
              >
                <Text style={[
                  styles.advanceBtnText,
                  advanceMinutes === opt.value && styles.advanceBtnTextActive,
                ]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Voz */}
        <Text style={styles.sectionTitle}>{t('voice')}</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.toggleRow}
            onPress={handleVoiceToggle}
            activeOpacity={0.7}
          >
            <Ionicons name="mic-outline" size={18} color={Colors.textSecondary} />
            <Text style={styles.toggleLabel}>{t('voiceInput')}</Text>
            <View style={[styles.toggle, voiceEnabled && styles.toggleActive]}>
              <View style={[styles.toggleThumb, voiceEnabled && styles.toggleThumbActive]} />
            </View>
          </TouchableOpacity>
          <View style={styles.voiceHint}>
            <Text style={styles.voiceHintText}>{t('voiceInputHint')}</Text>
          </View>
        </View>

        {/* Ayuda */}
        <Text style={styles.sectionTitle}>{t('help')}</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.tutorialRow}
            onPress={handleShowTutorial}
            activeOpacity={0.7}
          >
            <Ionicons name="play-circle-outline" size={20} color={Colors.primary} />
            <Text style={styles.tutorialLabel}>{t('viewTutorial')}</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Info app */}
        <Text style={styles.sectionTitle}>{t('appInfo')}</Text>
        <View style={styles.card}>
          <View style={[styles.infoRow, styles.rowBorder]}>
            <Text style={styles.infoLabel}>{t('version')}</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('author')}</Text>
            <Text style={styles.infoValue}>Adán Romero Marrero · 2026</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.text },
  content: { padding: 20, gap: 8 },
  sectionTitle: {
    fontSize: 12, fontWeight: '600', color: Colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginTop: 16, marginBottom: 6, marginLeft: 4,
  },
  card: {
    backgroundColor: Colors.surface, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  langRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  langFlag: { fontSize: 22 },
  langLabel: { flex: 1, fontSize: 16, color: Colors.text, fontWeight: '500' },
  notifHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  notifLabel: { fontSize: 15, color: Colors.text, fontWeight: '500' },
  advanceRow: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  advanceBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.border, alignItems: 'center',
  },
  advanceBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  advanceBtnText: { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  advanceBtnTextActive: { color: '#fff' },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  toggleLabel: { flex: 1, fontSize: 15, color: Colors.text, fontWeight: '500' },
  toggle: {
    width: 44, height: 24, borderRadius: 12,
    backgroundColor: Colors.border, justifyContent: 'center', padding: 2,
  },
  toggleActive: { backgroundColor: Colors.primary },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
  toggleThumbActive: { alignSelf: 'flex-end' },
  voiceHint: { paddingHorizontal: 16, paddingVertical: 10 },
  voiceHintText: { fontSize: 13, color: Colors.textMuted, lineHeight: 18 },
  tutorialRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  tutorialLabel: { flex: 1, fontSize: 15, color: Colors.text, fontWeight: '500' },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  infoLabel: { fontSize: 15, color: Colors.text },
  infoValue: { fontSize: 15, color: Colors.textSecondary },
});