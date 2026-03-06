import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../constants/colors';
import { useLocale } from '../../utils/LocaleContext';

export default function AssistantScreen() {
  const { t } = useLocale();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('assistant')}</Text>
      </View>
      <View style={styles.centered}>
        <Ionicons name="chatbubble-ellipses-outline" size={64} color={Colors.textMuted} />
        <Text style={styles.placeholder}>{t('comingSoon')}</Text>
        <Text style={styles.sub}>{t('assistantSub')}</Text>
      </View>
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
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  placeholder: { fontSize: 20, color: Colors.textSecondary, fontWeight: '600' },
  sub: { fontSize: 14, color: Colors.textMuted },
});