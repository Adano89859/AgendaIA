import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Calendar, CalendarUtils } from 'react-native-calendars';
import { Colors } from '../../constants/colors';
import { Event, getEvents } from '../../database/db';
import { i18n, loadSavedLocale } from '../../utils/i18n';

const URGENCY_COLORS = {
  low: '#4CAF50',
  medium: '#FF9800',
  high: '#F44336',
  default: Colors.primary,
};

function getUrgencyColor(urgency: string | null) {
  if (!urgency) return URGENCY_COLORS.default;
  return URGENCY_COLORS[urgency as keyof typeof URGENCY_COLORS] ?? URGENCY_COLORS.default;
}

function buildMarkedDates(events: Event[], selected: string) {
  const marks: Record<string, any> = {};
  events.forEach((evt) => {
    const color = getUrgencyColor(evt.urgency);
    if (!marks[evt.date]) marks[evt.date] = { dots: [] };
    marks[evt.date].dots.push({ key: String(evt.id), color });
  });
  if (selected) {
    marks[selected] = {
      ...(marks[selected] ?? {}),
      selected: true,
      selectedColor: Colors.primary + '55',
    };
  }
  return marks;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString(i18n.locale === 'pl' ? 'pl-PL' : i18n.locale === 'en' ? 'en-GB' : 'es-ES', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

export default function CalendarScreen() {
  const today = CalendarUtils.getCalendarDateString(new Date());
  const [selectedDate, setSelectedDate] = useState(today);
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    loadSavedLocale().then(() => forceUpdate(n => n + 1));
  }, []);

  const loadEvents = useCallback(async () => {
    const evts = await getEvents();
    setAllEvents(evts);
  }, []);

  useFocusEffect(useCallback(() => { loadEvents(); }, [loadEvents]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  }, [loadEvents]);

  const dayEvents = allEvents
    .filter((e) => e.date === selectedDate)
    .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>MRP Agenda</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => router.push('/event/new')}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <Calendar
        current={today}
        onDayPress={(day) => setSelectedDate(day.dateString)}
        markingType="multi-dot"
        markedDates={buildMarkedDates(allEvents, selectedDate)}
        theme={{
          backgroundColor: Colors.background,
          calendarBackground: Colors.background,
          textSectionTitleColor: Colors.textSecondary,
          selectedDayBackgroundColor: Colors.primary,
          selectedDayTextColor: '#ffffff',
          todayTextColor: Colors.primary,
          dayTextColor: Colors.text,
          textDisabledColor: Colors.textMuted,
          arrowColor: Colors.primary,
          monthTextColor: Colors.text,
        }}
      />

      <View style={styles.listContainer}>
        <View style={styles.dayHeader}>
          <Text style={styles.dayTitle}>{formatDate(selectedDate)}</Text>
          <Text style={styles.eventCount}>
            {dayEvents.length} {i18n.t(dayEvents.length !== 1 ? 'events' : 'event')}
          </Text>
        </View>

        <FlatList
          data={dayEvents}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>{i18n.t('noEvents')}</Text>
              <TouchableOpacity style={styles.emptyAddButton} onPress={() => router.push('/event/new')}>
                <Text style={styles.emptyAddText}>{i18n.t('addEvent')}</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.eventCard} onPress={() => router.push(`/event/${item.id}`)} activeOpacity={0.7}>
              <View style={[styles.urgencyBar, { backgroundColor: getUrgencyColor(item.urgency) }]} />
              <View style={styles.eventContent}>
                <View style={styles.eventTop}>
                  <Text style={styles.eventTitle} numberOfLines={1}>{item.title}</Text>
                  {item.time ? <Text style={styles.eventTime}>{item.time}</Text> : null}
                </View>
                {item.client ? (
                  <Text style={styles.eventClient}>
                    <Ionicons name="person-outline" size={12} color={Colors.textSecondary} /> {item.client}
                  </Text>
                ) : null}
                {item.urgency ? (
                  <View style={[styles.urgencyBadge, { backgroundColor: getUrgencyColor(item.urgency) + '22' }]}>
                    <Text style={[styles.urgencyText, { color: getUrgencyColor(item.urgency) }]}>
                      {i18n.t(item.urgency)}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.text, letterSpacing: 0.5 },
  addButton: {
    backgroundColor: Colors.primary, width: 36, height: 36,
    borderRadius: 18, alignItems: 'center', justifyContent: 'center',
  },
  listContainer: {
    flex: 1, backgroundColor: Colors.surface,
    borderTopLeftRadius: 20, borderTopRightRadius: 20, marginTop: 8,
  },
  dayHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10,
  },
  dayTitle: { fontSize: 15, fontWeight: '600', color: Colors.text, textTransform: 'capitalize' },
  eventCount: { fontSize: 12, color: Colors.textSecondary },
  listContent: { paddingHorizontal: 16, paddingBottom: 24, flexGrow: 1 },
  eventCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card,
    borderRadius: 12, marginBottom: 10, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.border,
  },
  urgencyBar: { width: 4, alignSelf: 'stretch' },
  eventContent: { flex: 1, paddingHorizontal: 12, paddingVertical: 12, gap: 4 },
  eventTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eventTitle: { fontSize: 15, fontWeight: '600', color: Colors.text, flex: 1 },
  eventTime: { fontSize: 13, color: Colors.primary, fontWeight: '500', marginLeft: 8 },
  eventClient: { fontSize: 13, color: Colors.textSecondary },
  urgencyBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginTop: 2 },
  urgencyText: { fontSize: 11, fontWeight: '600' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 16, color: Colors.textMuted },
  emptyAddButton: {
    marginTop: 8, paddingHorizontal: 20, paddingVertical: 10,
    backgroundColor: Colors.primary + '22', borderRadius: 20,
    borderWidth: 1, borderColor: Colors.primary + '44',
  },
  emptyAddText: { color: Colors.primary, fontWeight: '600', fontSize: 14 },
});