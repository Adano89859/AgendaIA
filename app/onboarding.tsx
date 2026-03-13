// app/onboarding.tsx

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
    Dimensions,
    FlatList,
    NativeScrollEvent,
    NativeSyntheticEvent,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemeColors } from '../constants/colors';
import { setPreference } from '../database/db';
import { LANGUAGES } from '../utils/i18n';
import { useLocale } from '../utils/LocaleContext';
import { useTheme } from '../utils/ThemeContext';

export const ONBOARDING_DONE_KEY = 'onboarding_done';

const { width } = Dimensions.get('window');

type FeatureSlide = {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  titleKey: string;
  descKey: string;
};

const FEATURE_SLIDES: FeatureSlide[] = [
  {
    key: 'calendar',
    icon: 'calendar',
    iconColor: '#4CAF50',
    titleKey: 'onboardingCalendarTitle',
    descKey: 'onboardingCalendarDesc',
  },
  {
    key: 'assistant',
    icon: 'chatbubble-ellipses',
    iconColor: '#6C63FF',
    titleKey: 'onboardingAssistantTitle',
    descKey: 'onboardingAssistantDesc',
  },
  {
    key: 'notifications',
    icon: 'notifications',
    iconColor: '#FF9800',
    titleKey: 'onboardingNotificationsTitle',
    descKey: 'onboardingNotificationsDesc',
  },
  {
    key: 'voice',
    icon: 'mic',
    iconColor: '#E91E63',
    titleKey: 'onboardingVoiceTitle',
    descKey: 'onboardingVoiceDesc',
  },
];

const TOTAL_SLIDES = 1 + FEATURE_SLIDES.length;

// ── CAMBIO: añadir scale y fs() ───────────────────────────────────────────────
const makeStyles = (c: ThemeColors, scale: number) => {
  const fs = (n: number) => Math.round(n * scale);
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    topBar: {
      alignItems: 'flex-end',
      paddingHorizontal: 20,
      paddingTop: 8,
    },
    skipBtn: { paddingVertical: 8, paddingHorizontal: 4 },
    skipText: { fontSize: fs(15), color: c.textSecondary, fontWeight: '500' },
    slide: {
      width,
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 40,
      gap: 20,
    },
    iconWrapper: {
      width: 140,
      height: 140,
      borderRadius: 70,
      alignItems: 'center',
      justifyContent: 'center',
    },
    slideTitle: {
      fontSize: fs(26),
      fontWeight: '700',
      color: c.text,
      textAlign: 'center',
    },
    slideDesc: {
      fontSize: fs(16),
      color: c.textSecondary,
      textAlign: 'center',
      lineHeight: Math.round(24 * scale),
    },
    langList: {
      width: '100%',
      gap: 10,
      marginTop: 8,
    },
    langBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    langBtnActive: {
      borderColor: c.primary,
      backgroundColor: c.primary + '12',
    },
    langFlag: { fontSize: fs(24) },
    langLabel: {
      flex: 1,
      fontSize: fs(16),
      fontWeight: '500',
      color: c.textSecondary,
    },
    langLabelActive: { color: c.text },
    dotsRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 8,
      paddingBottom: 24,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: c.border,
    },
    dotActive: {
      backgroundColor: c.primary,
      width: 24,
    },
    footer: {
      paddingHorizontal: 24,
      paddingBottom: 24,
    },
    nextBtn: {
      backgroundColor: c.primary,
      borderRadius: 14,
      paddingVertical: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    nextBtnText: {
      color: '#fff',
      fontSize: fs(16),
      fontWeight: '700',
    },
  });
};

export default function OnboardingScreen() {
  const { t, locale, changeLocale } = useLocale();
  // ── CAMBIO: extraer fontScale de useTheme ─────────────────────────────────
  const { colors, fontScale } = useTheme();
  const styles = useMemo(() => makeStyles(colors, fontScale), [colors, fontScale]);
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    setCurrentIndex(index);
  };

  const handleFinish = () => {
    setPreference(ONBOARDING_DONE_KEY, 'true');
    router.replace('/(tabs)');
  };

  const handleNext = () => {
    if (currentIndex < TOTAL_SLIDES - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      handleFinish();
    }
  };

  const handleSkip = () => {
    handleFinish();
  };

  const isFirst = currentIndex === 0;
  const isLast = currentIndex === TOTAL_SLIDES - 1;

  const languageSlide = (
    <View style={styles.slide} key="language">
      <View style={[styles.iconWrapper, { backgroundColor: colors.primary + '20' }]}>
        <Ionicons name="language" size={72} color={colors.primary} />
      </View>
      <Text style={styles.slideTitle}>{t('onboardingLanguageTitle')}</Text>
      <Text style={styles.slideDesc}>{t('onboardingLanguageDesc')}</Text>
      <View style={styles.langList}>
        {LANGUAGES.map((lang) => (
          <TouchableOpacity
            key={lang.code}
            style={[styles.langBtn, locale === lang.code && styles.langBtnActive]}
            onPress={() => changeLocale(lang.code)}
            activeOpacity={0.7}
          >
            <Text style={styles.langFlag}>{lang.flag}</Text>
            <Text style={[styles.langLabel, locale === lang.code && styles.langLabelActive]}>
              {lang.label}
            </Text>
            {locale === lang.code && (
              <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const featureSlides = FEATURE_SLIDES.map((item) => (
    <View style={styles.slide} key={item.key}>
      <View style={[styles.iconWrapper, { backgroundColor: item.iconColor + '20' }]}>
        <Ionicons name={item.icon} size={72} color={item.iconColor} />
      </View>
      <Text style={styles.slideTitle}>{t(item.titleKey)}</Text>
      <Text style={styles.slideDesc}>{t(item.descKey)}</Text>
    </View>
  ));

  const allSlides = [{ key: 'language' }, ...FEATURE_SLIDES];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        {!isLast ? (
          <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
            <Text style={styles.skipText}>{t('skip')}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.skipBtn} />
        )}
      </View>

      <FlatList
        ref={flatListRef}
        data={allSlides}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        renderItem={({ index }) => {
          if (index === 0) return languageSlide;
          return featureSlides[index - 1];
        }}
      />

      <View style={styles.dotsRow}>
        {allSlides.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === currentIndex && styles.dotActive]}
          />
        ))}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
          <Text style={styles.nextBtnText}>
            {isFirst
              ? t('next')
              : isLast
              ? t('onboardingStart')
              : t('next')}
          </Text>
          <Ionicons
            name={isLast ? 'checkmark' : 'arrow-forward'}
            size={18}
            color="#fff"
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}