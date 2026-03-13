// app/(tabs)/settings.tsx

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FONT_SCALES, FontScaleKey, THEMES, ThemeColors, ThemeKey } from '../../constants/colors';
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
import { useTheme } from '../../utils/ThemeContext';
import { ONBOARDING_DONE_KEY } from '../onboarding';

export const VOICE_INPUT_KEY = 'voice_input_enabled';

const THEME_OPTIONS: { key: ThemeKey; labelKey: string; preview: string }[] = [
  { key: 'dark',          labelKey: 'themeDark',          preview: '#0f0f0f' },
  { key: 'light',         labelKey: 'themeLight',         preview: '#f5f5f5' },
  { key: 'sepia',         labelKey: 'themeSepia',         preview: '#f4efe6' },
  { key: 'highContrast',  labelKey: 'themeHighContrast',  preview: '#000000' },
];

const FONT_SIZE_OPTIONS: { key: FontScaleKey; labelKey: string }[] = [
  { key: 'small',  labelKey: 'fontSizeSmall'  },
  { key: 'normal', labelKey: 'fontSizeNormal' },
  { key: 'large',  labelKey: 'fontSizeLarge'  },
];

const makeStyles = (c: ThemeColors, scale: number) => {
  const fs = (n: number) => Math.round(n * scale);
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    header: {
      paddingHorizontal: 20, paddingVertical: 14,
      borderBottomWidth: 1, borderBottomColor: c.border,
    },
    headerTitle: { fontSize: fs(22), fontWeight: '700', color: c.text },
    content: { padding: 20, gap: 8 },
    sectionTitle: {
      fontSize: fs(12), fontWeight: '600', color: c.textSecondary,
      textTransform: 'uppercase', letterSpacing: 0.5,
      marginTop: 16, marginBottom: 6, marginLeft: 4,
    },
    card: {
      backgroundColor: c.surface, borderRadius: 14,
      borderWidth: 1, borderColor: c.border, overflow: 'hidden',
    },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: c.border },
    langRow: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 16, paddingVertical: 14, gap: 12,
    },
    langFlag: { fontSize: fs(22) },
    langLabel: { flex: 1, fontSize: fs(16), color: c.text, fontWeight: '500' },
    notifHeader: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      paddingHorizontal: 16, paddingVertical: 12,
    },
    notifLabel: { fontSize: fs(15), color: c.text, fontWeight: '500' },
    advanceRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 14 },
    advanceBtn: {
      flex: 1, paddingVertical: 8, borderRadius: 8,
      borderWidth: 1, borderColor: c.border, alignItems: 'center',
    },
    advanceBtnActive: { backgroundColor: c.primary, borderColor: c.primary },
    advanceBtnText: { fontSize: fs(13), fontWeight: '600', color: c.textMuted },
    advanceBtnTextActive: { color: '#fff' },
    toggleRow: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingHorizontal: 16, paddingVertical: 14,
      borderBottomWidth: 1, borderBottomColor: c.border,
    },
    toggleLabel: { flex: 1, fontSize: fs(15), color: c.text, fontWeight: '500' },
    toggle: {
      width: 44, height: 24, borderRadius: 12,
      backgroundColor: c.border, justifyContent: 'center', padding: 2,
    },
    toggleActive: { backgroundColor: c.primary },
    toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
    toggleThumbActive: { alignSelf: 'flex-end' },
    voiceHint: { paddingHorizontal: 16, paddingVertical: 10 },
    voiceHintText: { fontSize: fs(13), color: c.textMuted, lineHeight: fs(18) },
    // Apariencia — temas
    themeRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
    themeItem: { flex: 1, alignItems: 'center', gap: 6 },
    themeCircle: {
      width: 44, height: 44, borderRadius: 22,
      borderWidth: 2, borderColor: 'transparent',
    },
    themeCircleActive: { borderColor: c.primary },
    themeCircleInner: { flex: 1, borderRadius: 20 },
    themeLabel: { fontSize: fs(11), color: c.textSecondary, fontWeight: '500', textAlign: 'center' },
    themeLabelActive: { color: c.primary, fontWeight: '700' },
    // Apariencia — tamaño fuente
    fontRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 14 },
    fontBtn: {
      flex: 1, paddingVertical: 10, borderRadius: 10,
      borderWidth: 1, borderColor: c.border, alignItems: 'center', gap: 2,
    },
    fontBtnActive: { backgroundColor: c.primary + '18', borderColor: c.primary },
    fontBtnLabel: { fontSize: fs(13), fontWeight: '600', color: c.textSecondary },
    fontBtnLabelActive: { color: c.primary },
    fontBtnSample: { color: c.textMuted },
    // Ayuda e info
    tutorialRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 16, paddingVertical: 14,
    },
    tutorialLabel: { flex: 1, fontSize: fs(15), color: c.text, fontWeight: '500' },
    infoRow: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: 16, paddingVertical: 14,
    },
    infoLabel: { fontSize: fs(15), color: c.text },
    infoValue: { fontSize: fs(15), color: c.textSecondary },
  });
};

export default function SettingsScreen() {
  const { locale: currentLocale, changeLocale, t } = useLocale();
  const { colors, fontScale, theme, fontScaleKey, setTheme, setFontScaleKey } = useTheme();
  const styles = useMemo(() => makeStyles(colors, fontScale), [colors, fontScale]);

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
              style={[styles.langRow, index < LANGUAGES.length - 1 && styles.rowBorder]}
              onPress={() => changeLocale(lang.code)}
              activeOpacity={0.7}
            >
              <Text style={styles.langFlag}>{lang.flag}</Text>
              <Text style={styles.langLabel}>{lang.label}</Text>
              {currentLocale === lang.code && (
                <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Apariencia */}
        <Text style={styles.sectionTitle}>{t('appearance')}</Text>
        <View style={styles.card}>
          {/* Temas */}
          <View style={[styles.notifHeader, styles.rowBorder]}>
            <Ionicons name="color-palette-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.notifLabel}>{t('theme')}</Text>
          </View>
          <View style={styles.themeRow}>
            {THEME_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={styles.themeItem}
                onPress={() => setTheme(opt.key)}
                activeOpacity={0.7}
              >
                <View style={[styles.themeCircle, theme === opt.key && styles.themeCircleActive]}>
                  <View style={[styles.themeCircleInner, { backgroundColor: THEMES[opt.key].background }]}>
                    {/* Punto de color primario del tema */}
                    <View style={{
                      width: 12, height: 12, borderRadius: 6,
                      backgroundColor: THEMES[opt.key].primary,
                      position: 'absolute', bottom: 6, right: 6,
                    }} />
                  </View>
                </View>
                <Text style={[styles.themeLabel, theme === opt.key && styles.themeLabelActive]}>
                  {t(opt.labelKey)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tamaño de fuente */}
          <View style={[styles.notifHeader, styles.rowBorder]}>
            <Ionicons name="text-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.notifLabel}>{t('fontSize')}</Text>
          </View>
          <View style={styles.fontRow}>
            {FONT_SIZE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={[styles.fontBtn, fontScaleKey === opt.key && styles.fontBtnActive]}
                onPress={() => setFontScaleKey(opt.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.fontBtnLabel, fontScaleKey === opt.key && styles.fontBtnLabelActive]}>
                  {t(opt.labelKey)}
                </Text>
                <Text style={[styles.fontBtnSample, { fontSize: Math.round(12 * FONT_SCALES[opt.key]) }]}>
                  Aa
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Notificaciones */}
        <Text style={styles.sectionTitle}>{t('notifications')}</Text>
        <View style={styles.card}>
          <View style={[styles.notifHeader, styles.rowBorder]}>
            <Ionicons name="notifications-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.notifLabel}>{t('notificationAdvance')}</Text>
          </View>
          <View style={styles.advanceRow}>
            {ADVANCE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.advanceBtn, advanceMinutes === opt.value && styles.advanceBtnActive]}
                onPress={() => handleAdvanceChange(opt.value)}
              >
                <Text style={[styles.advanceBtnText, advanceMinutes === opt.value && styles.advanceBtnTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Voz */}
        <Text style={styles.sectionTitle}>{t('voice')}</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.toggleRow} onPress={handleVoiceToggle} activeOpacity={0.7}>
            <Ionicons name="mic-outline" size={18} color={colors.textSecondary} />
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
          <TouchableOpacity style={styles.tutorialRow} onPress={handleShowTutorial} activeOpacity={0.7}>
            <Ionicons name="play-circle-outline" size={20} color={colors.primary} />
            <Text style={styles.tutorialLabel}>{t('viewTutorial')}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
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