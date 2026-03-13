import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Calendar, CalendarUtils } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemeColors } from '../../constants/colors';
import { Event, SortOption, getEvents, toggleEventCompleted } from '../../database/db';
import { useLocale } from '../../utils/LocaleContext';
import { useTheme } from '../../utils/ThemeContext';

const URGENCY_COLORS = {
  low: '#4CAF50',
  medium: '#FF9800',
  high: '#F44336',
};

const COMPLETED_COLOR = '#444444';

function getUrgencyColor(urgency: string | null, completed: number, primary: string) {
  if (completed) return COMPLETED_COLOR;
  if (!urgency) return primary;
  return URGENCY_COLORS[urgency as keyof typeof URGENCY_COLORS] ?? primary;
}

function buildMarkedDates(events: Event[], selected: string, primary: string) {
  const marks: Record<string, any> = {};
  events.forEach((evt) => {
    const color = evt.completed ? COMPLETED_COLOR : getUrgencyColor(evt.urgency, 0, primary);
    if (!marks[evt.date]) marks[evt.date] = { dots: [] };
    marks[evt.date].dots.push({ key: String(evt.id), color });
  });
  if (selected) {
    marks[selected] = {
      ...(marks[selected] ?? {}),
      selected: true,
      selectedColor: primary + '55',
    };
  }
  return marks;
}

const SORT_OPTIONS: { value: SortOption; icon: string }[] = [
  { value: 'date_asc',     icon: 'calendar-outline' },
  { value: 'date_desc',    icon: 'calendar' },
  { value: 'urgency_desc', icon: 'alert-circle-outline' },
];

// ── CAMBIO 1: añadir parámetro scale y helper fs ──────────────────────────────
const makeStyles = (c: ThemeColors, scale: number) => {
  const fs = (n: number) => Math.round(n * scale);
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 20, paddingVertical: 14,
      borderBottomWidth: 1, borderBottomColor: c.border,
    },
    // ── CAMBIO 2: fontSize fijos → fs() ───────────────────────────────────────
    headerTitle: { fontSize: fs(22), fontWeight: '700', color: c.text, letterSpacing: 0.5 },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    iconButton: {
      width: 36, height: 36, borderRadius: 18,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: c.primary + '22',
      borderWidth: 1, borderColor: c.primary + '44',
    },
    addButton: {
      backgroundColor: c.primary, width: 36, height: 36,
      borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    },
    sortBar: {
      paddingHorizontal: 20, paddingVertical: 6,
      backgroundColor: c.background,
    },
    sortLabel: { fontSize: fs(11), color: c.primary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
    listContainer: {
      flex: 1, backgroundColor: c.surface,
      borderTopLeftRadius: 20, borderTopRightRadius: 20, marginTop: 8,
    },
    dayHeader: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10, gap: 8,
    },
    dayTitle: { fontSize: fs(15), fontWeight: '600', color: c.text, textTransform: 'capitalize', flex: 1 },
    dayHeaderRight: { alignItems: 'flex-end', gap: 6 },
    eventCount: { fontSize: fs(12), color: c.textSecondary },
    toggleRow: { flexDirection: 'row', gap: 4 },
    toggleBtn: {
      paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12,
      borderWidth: 1, borderColor: c.border,
      backgroundColor: c.card,
    },
    toggleBtnActive: {
      backgroundColor: c.primary + '22',
      borderColor: c.primary,
    },
    toggleBtnText: { fontSize: fs(12), fontWeight: '600', color: c.textSecondary },
    toggleBtnTextActive: { color: c.primary },
    listContent: { paddingHorizontal: 16, paddingBottom: 24, flexGrow: 1 },
    eventCard: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: c.card,
      borderRadius: 12, marginBottom: 10, overflow: 'hidden',
      borderWidth: 1, borderColor: c.border,
    },
    eventCardCompleted: { opacity: 0.6, borderColor: COMPLETED_COLOR + '44' },
    urgencyBar: { width: 4, alignSelf: 'stretch' },
    eventContent: { flex: 1, paddingHorizontal: 12, paddingVertical: 12, gap: 4 },
    eventDate: { fontSize: fs(11), color: c.textSecondary, fontWeight: '500', marginBottom: 2 },
    eventTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    eventTitle: { fontSize: fs(15), fontWeight: '600', color: c.text, flex: 1 },
    completedText: { color: COMPLETED_COLOR, textDecorationLine: 'line-through' },
    completedMuted: { color: COMPLETED_COLOR },
    eventTime: { fontSize: fs(13), color: c.primary, fontWeight: '500', marginLeft: 8 },
    eventClient: { fontSize: fs(13), color: c.textSecondary },
    urgencyBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginTop: 2 },
    urgencyText: { fontSize: fs(11), fontWeight: '600' },
    completedBadge: {
      alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2,
      borderRadius: 10, marginTop: 2, backgroundColor: '#4CAF5022',
    },
    completedBadgeText: { fontSize: fs(11), fontWeight: '600', color: '#4CAF50' },
    checkButton: { paddingHorizontal: 12 },
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 12 },
    emptyText: { fontSize: fs(16), color: c.textMuted },
    emptyAddButton: {
      marginTop: 8, paddingHorizontal: 20, paddingVertical: 10,
      backgroundColor: c.primary + '22', borderRadius: 20,
      borderWidth: 1, borderColor: c.primary + '44',
    },
    emptyAddText: { color: c.primary, fontWeight: '600', fontSize: fs(14) },
  });
};

export default function CalendarScreen() {
  const { t, locale } = useLocale();
  // ── CAMBIO 3: extraer fontScale de useTheme ───────────────────────────────
  const { colors, fontScale } = useTheme();
  // ── CAMBIO 4: pasar fontScale al useMemo ─────────────────────────────────
  const styles = useMemo(() => makeStyles(colors, fontScale), [colors, fontScale]);

  const today = CalendarUtils.getCalendarDateString(new Date());
  const [selectedDate, setSelectedDate] = useState(today);
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [sort, setSort] = useState<SortOption>('date_asc');
  const [viewMode, setViewMode] = useState<'day' | 'all'>('day');

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString(
      locale === 'pl' ? 'pl-PL' : locale === 'en' ? 'en-GB' : 'es-ES',
      { weekday: 'long', day: 'numeric', month: 'long' }
    );
  };

  const loadEvents = useCallback(async () => {
    const evts = await getEvents(sort);
    setAllEvents(evts);
  }, [sort]);

  useFocusEffect(useCallback(() => { loadEvents(); }, [loadEvents]));
  useEffect(() => { loadEvents(); }, [sort]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  }, [loadEvents]);

  const handleToggleCompleted = useCallback(async (item: Event) => {
    await toggleEventCompleted(item.id, !item.completed);
    await loadEvents();
  }, [loadEvents]);

  const cycleSort = () => {
    const idx = SORT_OPTIONS.findIndex(o => o.value === sort);
    const next = SORT_OPTIONS[(idx + 1) % SORT_OPTIONS.length];
    setSort(next.value);
  };

  const currentSortIcon = SORT_OPTIONS.find(o => o.value === sort)?.icon ?? 'calendar-outline';

  const displayedEvents = viewMode === 'day'
    ? allEvents.filter((e) => e.date === selectedDate)
    : allEvents;

  const renderEvent = ({ item }: { item: Event }) => {
    const isCompleted = Boolean(item.completed);
    const barColor = getUrgencyColor(item.urgency, item.completed, colors.primary);
    return (
      <View style={[styles.eventCard, isCompleted && styles.eventCardCompleted]}>
        <View style={[styles.urgencyBar, { backgroundColor: barColor }]} />

        <TouchableOpacity
          style={styles.eventContent}
          onPress={() => router.push(`/event/${item.id}`)}
          activeOpacity={0.7}
        >
          {viewMode === 'all' && (
            <Text style={styles.eventDate}>{item.date}</Text>
          )}
          <View style={styles.eventTop}>
            <Text
              style={[styles.eventTitle, isCompleted && styles.completedText]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            {item.time ? (
              <Text style={[styles.eventTime, isCompleted && styles.completedMuted]}>
                {item.time}
              </Text>
            ) : null}
          </View>
          {item.client ? (
            <Text style={[styles.eventClient, isCompleted && styles.completedMuted]}>
              <Ionicons name="person-outline" size={12} color={isCompleted ? COMPLETED_COLOR : colors.textSecondary} /> {item.client}
            </Text>
          ) : null}
          {item.urgency && !isCompleted ? (
            <View style={[styles.urgencyBadge, { backgroundColor: barColor + '22' }]}>
              <Text style={[styles.urgencyText, { color: barColor }]}>
                {t(item.urgency)}
              </Text>
            </View>
          ) : null}
          {isCompleted ? (
            <View style={styles.completedBadge}>
              <Text style={styles.completedBadgeText}>{t('completed')}</Text>
            </View>
          ) : null}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.checkButton}
          onPress={() => handleToggleCompleted(item)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name={isCompleted ? 'checkmark-circle' : 'ellipse-outline'}
            size={24}
            color={isCompleted ? '#4CAF50' : colors.textMuted}
          />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>MRP Agenda</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconButton} onPress={cycleSort}>
            <Ionicons name={currentSortIcon as any} size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.addButton} onPress={() => router.push('/event/new')}>
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.sortBar}>
        <Text style={styles.sortLabel}>{t(sort)}</Text>
      </View>

      <Calendar
        current={today}
        onDayPress={(day) => {
          setSelectedDate(day.dateString);
          setViewMode('day');
        }}
        markingType="multi-dot"
        markedDates={buildMarkedDates(allEvents, selectedDate, colors.primary)}
        theme={{
          backgroundColor: colors.background,
          calendarBackground: colors.background,
          textSectionTitleColor: colors.textSecondary,
          selectedDayBackgroundColor: colors.primary,
          selectedDayTextColor: '#ffffff',
          todayTextColor: colors.primary,
          dayTextColor: colors.text,
          textDisabledColor: colors.textMuted,
          arrowColor: colors.primary,
          monthTextColor: colors.text,
        }}
      />

      <View style={styles.listContainer}>
        <View style={styles.dayHeader}>
          <Text style={styles.dayTitle} numberOfLines={1}>
            {viewMode === 'day' ? formatDate(selectedDate) : t('allEvents')}
          </Text>

          <View style={styles.dayHeaderRight}>
            <Text style={styles.eventCount}>
              {displayedEvents.length} {t(displayedEvents.length !== 1 ? 'events' : 'event')}
            </Text>
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[styles.toggleBtn, viewMode === 'day' && styles.toggleBtnActive]}
                onPress={() => setViewMode('day')}
              >
                <Text style={[styles.toggleBtnText, viewMode === 'day' && styles.toggleBtnTextActive]}>
                  {t('day')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, viewMode === 'all' && styles.toggleBtnActive]}
                onPress={() => setViewMode('all')}
              >
                <Text style={[styles.toggleBtnText, viewMode === 'all' && styles.toggleBtnTextActive]}>
                  {t('all')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <FlatList
          data={displayedEvents}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>{t('noEvents')}</Text>
              <TouchableOpacity style={styles.emptyAddButton} onPress={() => router.push('/event/new')}>
                <Text style={styles.emptyAddText}>{t('addEvent')}</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={renderEvent}
        />
      </View>
    </SafeAreaView>
  );
}