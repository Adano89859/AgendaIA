import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert, Platform, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { createEvent } from '../../database/db';
import { useLocale } from '../../utils/LocaleContext';

export default function NewEventScreen() {
  const { t } = useLocale();
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
    await createEvent({
      title,
      client,
      extra_info: extraInfo,
      urgency,
      date: formatDate(date),
      time: time ? formatTime(time) : '',
    });
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
            placeholderTextColor={Colors.textMuted}
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
            placeholderTextColor={Colors.textMuted}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('extraInfo')}</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={extraInfo}
            onChangeText={setExtraInfo}
            placeholder={t('extraInfoPlaceholder')}
            placeholderTextColor={Colors.textMuted}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, gap: 20 },
  field: { gap: 6 },
  label: {
    fontSize: 12, color: Colors.textSecondary, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Colors.surface, borderRadius: 10, padding: 12,
    color: Colors.text, fontSize: 15, borderWidth: 1, borderColor: Colors.border,
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  pickerBtn: {
    backgroundColor: Colors.surface, borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: Colors.border,
  },
  pickerBtnText: { color: Colors.text, fontSize: 15 },
  clearBtn: { marginTop: 6, alignSelf: 'flex-start' },
  clearBtnText: { color: Colors.textSecondary, fontSize: 13 },
  urgencyRow: { flexDirection: 'row', gap: 8 },
  urgencyBtn: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: Colors.border,
  },
  urgencyBtnText: { fontSize: 13, fontWeight: '600' },
  createBtn: {
    backgroundColor: Colors.primary, padding: 16,
    borderRadius: 14, alignItems: 'center', marginTop: 10,
  },
  createBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});