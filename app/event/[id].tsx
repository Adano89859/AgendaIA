import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../constants/colors';
import { deleteEvent, Event, getEventById, updateEvent } from '../../database/db';

const URGENCY_OPTIONS = [
  { value: 'low', label: 'Baja', color: '#4CAF50' },
  { value: 'medium', label: 'Media', color: '#FF9800' },
  { value: 'high', label: 'Alta', color: '#F44336' },
];

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [title, setTitle] = useState('');
  const [client, setClient] = useState('');
  const [extraInfo, setExtraInfo] = useState('');
  const [urgency, setUrgency] = useState<string | null>(null);
  const [time, setTime] = useState('');
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (id) getEventById(Number(id)).then((evt) => {
      if (evt) { setEvent(evt); setTitle(evt.title); setClient(evt.client ?? ''); setExtraInfo(evt.extra_info ?? ''); setUrgency(evt.urgency ?? null); setTime(evt.time ?? ''); }
    });
  }, [id]);

  const handleSave = async () => {
    if (!title.trim()) { Alert.alert('Error', 'El título es obligatorio'); return; }
    await updateEvent(Number(id), { title, client, extra_info: extraInfo, urgency, time });
    setEditing(false);
  };

  const handleDelete = () => {
    Alert.alert('Eliminar evento', '¿Seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => { await deleteEvent(Number(id)); router.back(); } },
    ]);
  };

  if (!event) return null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {[
          { label: 'Título *', value: title, setter: setTitle },
          { label: 'Hora', value: time, setter: setTime, placeholder: 'HH:MM' },
          { label: 'Cliente', value: client, setter: setClient },
        ].map(({ label, value, setter, placeholder }) => (
          <View key={label} style={styles.row}>
            <Text style={styles.label}>{label}</Text>
            {editing ? <TextInput style={styles.input} value={value} onChangeText={setter} placeholder={placeholder} placeholderTextColor={Colors.textMuted} /> : <Text style={styles.value}>{value || '—'}</Text>}
          </View>
        ))}
        <View style={styles.row}>
          <Text style={styles.label}>Fecha</Text>
          <Text style={styles.value}>{event.date}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Información extra</Text>
          {editing ? <TextInput style={[styles.input, styles.multiline]} value={extraInfo} onChangeText={setExtraInfo} multiline placeholderTextColor={Colors.textMuted} /> : <Text style={styles.value}>{extraInfo || '—'}</Text>}
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Urgencia</Text>
          {editing ? (
            <View style={styles.urgencyRow}>
              {URGENCY_OPTIONS.map((opt) => (
                <TouchableOpacity key={opt.value} style={[styles.urgencyBtn, urgency === opt.value && { backgroundColor: opt.color + '33', borderColor: opt.color }]} onPress={() => setUrgency(urgency === opt.value ? null : opt.value)}>
                  <Text style={[styles.urgencyBtnText, { color: opt.color }]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : <Text style={styles.value}>{URGENCY_OPTIONS.find(o => o.value === urgency)?.label ?? '—'}</Text>}
        </View>
        <View style={styles.actions}>
          {editing ? (
            <>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}><Text style={styles.saveBtnText}>Guardar</Text></TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(false)}><Text style={styles.cancelBtnText}>Cancelar</Text></TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)}><Ionicons name="pencil" size={16} color={Colors.primary} /><Text style={styles.editBtnText}>Editar</Text></TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}><Ionicons name="trash" size={16} color="#F44336" /><Text style={styles.deleteBtnText}>Eliminar</Text></TouchableOpacity>
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