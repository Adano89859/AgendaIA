import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../constants/colors';

export default function SettingsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ajustes</Text>
      </View>
      <View style={styles.centered}>
        <Ionicons name="settings-outline" size={64} color={Colors.textMuted} />
        <Text style={styles.placeholder}>Próximamente</Text>
        <Text style={styles.sub}>Idioma, notificaciones y más</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.text },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  placeholder: { fontSize: 20, color: Colors.textSecondary, fontWeight: '600' },
  sub: { fontSize: 14, color: Colors.textMuted },
});