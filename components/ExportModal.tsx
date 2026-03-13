// components/ExportModal.tsx

import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { ThemeColors } from '../constants/colors';
import { Event } from '../database/db';
import { useLocale } from '../utils/LocaleContext';
import { mailPDF, sharePDF } from '../utils/pdfExport';
import { useTheme } from '../utils/ThemeContext';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type ExportFilter = 'all' | 'pending' | 'today' | 'week';

interface Props {
  visible: boolean;
  onClose: () => void;
  events: Event[];
}

// ─── Helper: filtrar eventos ──────────────────────────────────────────────────

function applyFilter(events: Event[], filter: ExportFilter): Event[] {
  const today = new Date().toISOString().split('T')[0];

  const weekEnd = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  })();

  switch (filter) {
    case 'pending':
      return events.filter((e) => !e.completed);
    case 'today':
      return events.filter((e) => e.date === today);
    case 'week':
      return events.filter((e) => e.date >= today && e.date <= weekEnd);
    default:
      return events;
  }
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const makeStyles = (c: ThemeColors, scale: number) => {
  const fs = (n: number) => Math.round(n * scale);
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: '#000000aa',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: c.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      gap: 20,
    },
    handle: {
      width: 40, height: 4, borderRadius: 2,
      backgroundColor: c.border,
      alignSelf: 'center',
      marginBottom: 4,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    title: { fontSize: fs(18), fontWeight: '700', color: c.text },
    closeBtn: {
      width: 32, height: 32, borderRadius: 16,
      backgroundColor: c.card,
      alignItems: 'center', justifyContent: 'center',
    },
    sectionLabel: {
      fontSize: fs(11), fontWeight: '600', color: c.textSecondary,
      textTransform: 'uppercase', letterSpacing: 0.5,
      marginBottom: 8,
    },
    filterRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    filterBtn: {
      paddingHorizontal: 14, paddingVertical: 8,
      borderRadius: 20, borderWidth: 1, borderColor: c.border,
      backgroundColor: c.card,
    },
    filterBtnActive: {
      backgroundColor: c.primary + '22',
      borderColor: c.primary,
    },
    filterBtnText: { fontSize: fs(13), fontWeight: '600', color: c.textSecondary },
    filterBtnTextActive: { color: c.primary },
    countBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: c.card, borderRadius: 12,
      paddingHorizontal: 14, paddingVertical: 10,
      borderWidth: 1, borderColor: c.border,
    },
    countText: { fontSize: fs(14), color: c.textSecondary },
    countNumber: { fontWeight: '700', color: c.text },
    actionsRow: { gap: 10 },
    actionBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 10, padding: 15, borderRadius: 14,
      borderWidth: 1,
    },
    shareBtn: {
      backgroundColor: c.primary + '18',
      borderColor: c.primary + '44',
    },
    mailBtn: {
      backgroundColor: c.card,
      borderColor: c.border,
    },
    actionBtnText: { fontSize: fs(15), fontWeight: '600' },
    shareBtnText: { color: c.primary },
    mailBtnText: { color: c.text },
    disabledBtn: { opacity: 0.4 },
  });
};

// ─── Componente ───────────────────────────────────────────────────────────────

const FILTER_OPTIONS: { key: ExportFilter; labelKey: string }[] = [
  { key: 'all',     labelKey: 'exportAll'     },
  { key: 'pending', labelKey: 'exportPending' },
  { key: 'today',   labelKey: 'exportToday'   },
  { key: 'week',    labelKey: 'exportWeek'    },
];

export default function ExportModal({ visible, onClose, events }: Props) {
  const { t, locale } = useLocale();
  const { colors, fontScale } = useTheme();
  const styles = useMemo(() => makeStyles(colors, fontScale), [colors, fontScale]);

  const [filter, setFilter] = useState<ExportFilter>('all');
  const [loadingShare, setLoadingShare] = useState(false);
  const [loadingMail, setLoadingMail] = useState(false);

  const filtered = useMemo(() => applyFilter(events, filter), [events, filter]);
  const isEmpty = filtered.length === 0;

  const handleShare = async () => {
    if (isEmpty) return;
    setLoadingShare(true);
    try {
      await sharePDF(filtered, locale);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? t('errorConnecting'));
    } finally {
      setLoadingShare(false);
    }
  };

  const handleMail = async () => {
    if (isEmpty) return;
    setLoadingMail(true);
    try {
      await mailPDF(filtered, locale);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? t('errorConnecting'));
    } finally {
      setLoadingMail(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.sheet}>

          <View style={styles.handle} />

          {/* Título */}
          <View style={styles.titleRow}>
            <Text style={styles.title}>{t('exportPDF')}</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Filtros */}
          <View>
            <Text style={styles.sectionLabel}>{t('exportFilter')}</Text>
            <View style={styles.filterRow}>
              {FILTER_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.filterBtn, filter === opt.key && styles.filterBtnActive]}
                  onPress={() => setFilter(opt.key)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterBtnText, filter === opt.key && styles.filterBtnTextActive]}>
                    {t(opt.labelKey)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Contador */}
          <View style={styles.countBadge}>
            <Ionicons name="document-text-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.countText}>
              {t('exportCount')}{' '}
              <Text style={styles.countNumber}>{filtered.length}</Text>
            </Text>
          </View>

          {/* Botones de acción */}
          <View style={styles.actionsRow}>
            {/* Compartir */}
            <TouchableOpacity
              style={[styles.actionBtn, styles.shareBtn, (isEmpty || loadingShare) && styles.disabledBtn]}
              onPress={handleShare}
              disabled={isEmpty || loadingShare || loadingMail}
              activeOpacity={0.7}
            >
              {loadingShare
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <Ionicons name="share-outline" size={20} color={colors.primary} />
              }
              <Text style={[styles.actionBtnText, styles.shareBtnText]}>
                {t('exportShare')}
              </Text>
            </TouchableOpacity>

            {/* Correo */}
            <TouchableOpacity
              style={[styles.actionBtn, styles.mailBtn, (isEmpty || loadingMail) && styles.disabledBtn]}
              onPress={handleMail}
              disabled={isEmpty || loadingShare || loadingMail}
              activeOpacity={0.7}
            >
              {loadingMail
                ? <ActivityIndicator size="small" color={colors.textMuted} />
                : <Ionicons name="mail-outline" size={20} color={colors.text} />
              }
              <Text style={[styles.actionBtnText, styles.mailBtnText]}>
                {t('exportMail')}
              </Text>
            </TouchableOpacity>
          </View>

        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}