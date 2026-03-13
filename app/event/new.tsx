// app/event/new.tsx

import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert, Platform, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemeColors } from '../../constants/colors';
import { createEvent, saveNotificationId } from '../../database/db';
import { useLocale } from '../../utils/LocaleContext';
import {
  getAdvanceMinutes,
  scheduleEventNotification,
} from '../../utils/notifications';
import { useTheme } from '../../utils/ThemeContext';

// ── CAMBIO: añadir scale y fs() ───────────────────────────────────────────────
const makeStyles = (c: ThemeColors, scale: number) => {
  const fs = (n: number) => Math.round(n * scale);
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    content: { padding: 20, gap: 20 },
    field: { gap: 6 },
    label: {
      fontSize: fs(12), color: c.textSecondary, fontWeight: '600',
      textTransform: 'uppercase', letterSpacing: 0.5,
    },
    input: {
      backgroundColor: c.surface, borderRadius: 10, padding: 12,
      color: c.text, fontSize: fs(15), borderWidth: 1, borderColor: c.border,
    },
    multiline: { minHeight: 80, textAlignVertical: 'top' },
    pickerBtn: {
      backgroundColor: c.surface, borderRadius: 10, padding: 14,
      borderWidth: 1, borderColor: c.border,
    },
    pickerBtnText: { color: c.text, fontSize: fs(15) },
    clearBtn: { marginTop: 6, alignSelf: 'flex-start' },
    clearBtnText: { color: c.textSecondary, fontSize: fs(13) },
    urgencyRow: { flexDirection: 'row', gap: 8 },
    urgencyBtn: {
      paddingHorizontal: 14, paddingVertical: 8,
      borderRadius: 20, borderWidth: 1, borderColor: c.border,
    },
    urgencyBtnText: { fontSize: fs(13), fontWeight: '600' },
    createBtn: {
      backgroundColor: c.primary, padding: 16,
      borderRadius: 14, alignItems: 'center', marginTop: 10,
    },
    createBtnText: { color: '#fff', fontWeight: '700', fontSize: fs(16) },
  });
};

export default function NewEventScreen() {
  const { t } = useLocale();
  // ── CAMBIO: extraer fontScale de useTheme ─────────────────────────────────
  const { colors, fontScale } = useTheme();
  const styles = useMemo(() => makeStyles(colors, fontScale), [colors, fontScale]);
  const today = new Date();

  const [title, setTitle] = useState('');
  const [client, setClient] = useState('');
  const [extraInfo, setExtraInfo] = useState('');
  const [urgency, setUrgency] = useState<string | null>(null);
  const [date, setDate] = useState(today);
  const [time, setTime] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const URGENCY_OPTIONS = [
    { value: 'low', label: t('low'), color: '#4CAF50' },
    { value: 'medium', label: t('medium'), color: '#FF9800' },
    { value: 'high', label: t('high'), color: '#F44336' },
  ];

  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  const formatTime = (d: Date) =>
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

  const handleCreate = async () => {
    if (!title.trim()) { Alert.alert('Error', t('titleRequired')); return; }

    const dateStr = formatDate(date);
    const timeStr = time ? formatTime(time) : '';

    const newId = await createEvent({
      title,
      client,
      extra_info: extraInfo,
      urgency,
      date: dateStr,
      time: timeStr,
    });

    if (newId && timeStr) {
      const advance = getAdvanceMinutes();
      const advanceLabel = advance < 60 ? `${advance} min` : `${advance / 60} h`;
      const notifBody = t('notificationBody', { title, advance: advanceLabel });

      const notificationId = await scheduleEventNotification(
        title, dateStr, timeStr,
        t('notificationTitle'),
        notifBody,
        advance
      );
      if (notificationId) {
        await saveNotificationId(newId, notificationId);
      }
    }

    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>

        <View style={styles.field}>
          <Text style={styles.label}>{t('title')} *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder={t('titlePlaceholder')}
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('date')}</Text>
          <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowDatePicker(true)}>
            <Text style={styles.pickerBtnText}>📅  {formatDate(date)}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, selected) => {
                setShowDatePicker(false);
                if (selected) setDate(selected);
              }}
            />
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('time')}</Text>
          <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowTimePicker(true)}>
            <Text style={styles.pickerBtnText}>
              ⏰  {time ? formatTime(time) : t('timePlaceholder')}
            </Text>
          </TouchableOpacity>
          {time && (
            <TouchableOpacity onPress={() => setTime(null)} style={styles.clearBtn}>
              <Text style={styles.clearBtnText}>✕ {t('cancel')}</Text>
            </TouchableOpacity>
          )}
          {showTimePicker && (
            <DateTimePicker
              value={time ?? today}
              mode="time"
              is24Hour
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, selected) => {
                setShowTimePicker(false);
                if (selected) setTime(selected);
              }}
            />
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('client')}</Text>
          <TextInput
            style={styles.input}
            value={client}
            onChangeText={setClient}
            placeholder={t('clientPlaceholder')}
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('extraInfo')}</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={extraInfo}
            onChangeText={setExtraInfo}
            placeholder={t('extraInfoPlaceholder')}
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('urgency')}</Text>
          <View style={styles.urgencyRow}>
            {URGENCY_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.urgencyBtn,
                  urgency === opt.value && { backgroundColor: opt.color + '33', borderColor: opt.color },
                ]}
                onPress={() => setUrgency(urgency === opt.value ? null : opt.value)}
              >
                <Text style={[styles.urgencyBtnText, { color: opt.color }]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.createBtn} onPress={handleCreate}>
          <Text style={styles.createBtnText}>{t('create')}</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}