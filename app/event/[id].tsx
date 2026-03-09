import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert, Platform, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { deleteEvent, Event, getEventById, updateEvent } from '../../database/db';
import { useLocale } from '../../utils/LocaleContext';

export default function EventDetailScreen() {
  const { t } = useLocale();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [title, setTitle] = useState('');
  const [client, setClient] = useState('');
  const [extraInfo, setExtraInfo] = useState('');
  const [urgency, setUrgency] = useState<string | null>(null);
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState<Date | null>(null);
  const [editing, setEditing] = useState(false);
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

  const parseTime = (timeStr: string): Date | null => {
    if (!timeStr) return null;
    const [h, m] = timeStr.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  };

  useEffect(() => {
    if (id) getEventById(Number(id)).then((evt) => {
      if (evt) {
        setEvent(evt);
        setTitle(evt.title);
        setClient(evt.client ?? '');
        setExtraInfo(evt.extra_info ?? '');
        setUrgency(evt.urgency ?? null);
        setDate(new Date(evt.date + 'T00:00:00'));
        setTime(parseTime(evt.time ?? ''));
      }
    });
  }, [id]);

  const handleSave = async () => {
    if (!title.trim()) { Alert.alert('Error', t('titleRequired')); return; }
    await updateEvent(Number(id), {
      title, client,
      extra_info: extraInfo,
      urgency,
      time: time ? formatTime(time) : '',
    });
    setEditing(false);
  };

  const handleDelete = () => {
    Alert.alert(t('delete'), t('deleteConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: async () => { await deleteEvent(Number(id)); router.back(); } },
    ]);
  };

  if (!event) return null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>

        {/* Título */}
        <View style={styles.row}>
          <Text style={styles.label}>{t('title')} *</Text>
          {editing
            ? <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholderTextColor={Colors.textMuted} />
            : <Text style={styles.value}>{title || '—'}</Text>}
        </View>

        {/* Fecha */}
        <View style={styles.row}>
          <Text style={styles.label}>{t('date')}</Text>
          {editing ? (
            <>
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
            </>
          ) : <Text style={styles.value}>{formatDate(date)}</Text>}
        </View>

        {/* Hora */}
        <View style={styles.row}>
          <Text style={styles.label}>{t('time')}</Text>
          {editing ? (
            <>
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
                  value={time ?? new Date()}
                  mode="time"
                  is24Hour
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(_, selected) => {
                    setShowTimePicker(false);
                    if (selected) setTime(selected);
                  }}
                />
              )}
            </>
          ) : <Text style={styles.value}>{time ? formatTime(time) : '—'}</Text>}
        </View>

        {/* Cliente */}
        <View style={styles.row}>
          <Text style={styles.label}>{t('client')}</Text>
          {editing
            ? <TextInput style={styles.input} value={client} onChangeText={setClient} placeholderTextColor={Colors.textMuted} />
            : <Text style={styles.value}>{client || '—'}</Text>}
        </View>

        {/* Info extra */}
        <View style={styles.row}>
          <Text style={styles.label}>{t('extraInfo')}</Text>
          {editing
            ? <TextInput style={[styles.input, styles.multiline]} value={extraInfo} onChangeText={setExtraInfo} multiline placeholderTextColor={Colors.textMuted} />
            : <Text style={styles.value}>{extraInfo || '—'}</Text>}
        </View>

        {/* Urgencia */}
        <View style={styles.row}>
          <Text style={styles.label}>{t('urgency')}</Text>
          {editing ? (
            <View style={styles.urgencyRow}>
              {URGENCY_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.urgencyBtn, urgency === opt.value && { backgroundColor: opt.color + '33', borderColor: opt.color }]}
                  onPress={() => setUrgency(urgency === opt.value ? null : opt.value)}
                >
                  <Text style={[styles.urgencyBtnText, { color: opt.color }]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={styles.value}>
              {URGENCY_OPTIONS.find(o => o.value === urgency)?.label ?? '—'}
            </Text>
          )}
        </View>

        {/* Acciones */}
        <View style={styles.actions}>
          {editing ? (
            <>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>{t('save')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(false)}>
                <Text style={styles.cancelBtnText}>{t('cancel')}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)}>
                <Ionicons name="pencil" size={16} color={Colors.primary} />
                <Text style={styles.editBtnText}>{t('edit')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
                <Ionicons name="trash" size={16} color="#F44336" />
                <Text style={styles.deleteBtnText}>{t('delete')}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, gap: 20 },
  row: { gap: 6 },
  label: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { fontSize: 16, color: Colors.text },
  input: { backgroundColor: Colors.surface, borderRadius: 10, padding: 12, color: Colors.text, fontSize: 15, borderWidth: 1, borderColor: Colors.border },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  pickerBtn: { backgroundColor: Colors.surface, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: Colors.border },
  pickerBtnText: { color: Colors.text, fontSize: 15 },
  clearBtn: { marginTop: 6, alignSelf: 'flex-start' },
  clearBtnText: { color: Colors.textSecondary, fontSize: 13 },
  urgencyRow: { flexDirection: 'row', gap: 8 },
  urgencyBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: Colors.border },
  urgencyBtnText: { fontSize: 13, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 10 },
  editBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.primary + '22', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: Colors.primary + '44' },
  editBtnText: { color: Colors.primary, fontWeight: '600' },
  deleteBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#F4433622', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#F4433644' },
  deleteBtnText: { color: '#F44336', fontWeight: '600' },
  saveBtn: { flex: 1, alignItems: 'center', padding: 14, borderRadius: 12, backgroundColor: Colors.primary },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  cancelBtn: { flex: 1, alignItems: 'center', padding: 14, borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  cancelBtnText: { color: Colors.textSecondary, fontWeight: '600', fontSize: 15 },
});