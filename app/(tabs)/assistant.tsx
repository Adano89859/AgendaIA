// app/(tabs)/assistant.tsx

import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import {
  createEvent,
  deleteEvent,
  getEvents,
  toggleEventCompleted,
  updateEvent,
} from '../../database/db';
import {
  AIAction,
  Message,
  ParsedAIResponse,
  parseAIResponse,
  sendMessage,
} from '../../utils/ai/groqService';
import { useLocale } from '../../utils/LocaleContext';

// ─── Tipos internos ───────────────────────────────────────────────────────────

type ChatItem =
  | { kind: 'message'; id: string; msg: Message }
  | { kind: 'action'; id: string; parsed: ParsedAIResponse };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatActionContext(status: 'CONFIRMED' | 'CANCELLED', action: AIAction): string {
  const data = [
    action.title     ? `title: "${action.title}"` : null,
    action.date      ? `date: ${action.date}` : null,
    action.time      ? `time: ${action.time}` : null,
    action.urgency   ? `urgency: ${action.urgency}` : null,
    action.client    ? `client: "${action.client}"` : null,
    action.extraInfo ? `extraInfo: "${action.extraInfo}"` : null,
    action.id        ? `id: ${action.id}` : null,
  ].filter(Boolean).join(', ');

  if (status === 'CONFIRMED') {
    return `[Context] The user confirmed the action "${action.type}". ` +
      `The following event data was involved and the change is now applied: ${data}. ` +
      `If the user asks to undo or restore this, you have all the data needed to recreate or revert it — propose it directly without asking for details again.`;
  } else {
    return `[Context] The user cancelled the action "${action.type}". ` +
      `No changes were made. The event data that was proposed: ${data}. ` +
      `If the user changes their mind, you can propose the same action again immediately.`;
  }
}

// ─── ActionCard ───────────────────────────────────────────────────────────────

function ActionCard({
  action,
  onConfirm,
  onCancel,
}: {
  action: AIAction;
  onConfirm: (updated: AIAction) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<AIAction>({ ...action });

  const isDelete = action.type === 'delete_event';
  const isComplete = action.type === 'complete_event';

  const actionLabel: Record<AIAction['type'], string> = {
    create_event: '➕ Crear evento',
    edit_event: '✏️ Editar evento',
    delete_event: '🗑️ Eliminar evento',
    complete_event: '✅ Completar evento',
  };

  const urgencyOptions: ('low' | 'medium' | 'high')[] = ['low', 'medium', 'high'];
  const urgencyLabel: Record<string, string> = { low: 'Baja', medium: 'Media', high: 'Alta' };

  return (
    <View style={cardStyles.card}>
      <Text style={cardStyles.actionLabel}>{actionLabel[action.type]}</Text>

      {(isDelete || isComplete) ? (
        <Text style={cardStyles.deleteTitle}>"{draft.title}"</Text>
      ) : (
        <ScrollView scrollEnabled={false}>
          <Text style={cardStyles.fieldLabel}>Título *</Text>
          <TextInput
            style={cardStyles.fieldInput}
            value={draft.title ?? ''}
            onChangeText={(v) => setDraft((d) => ({ ...d, title: v }))}
            placeholder="Título del evento"
            placeholderTextColor={Colors.textMuted}
          />

          <Text style={cardStyles.fieldLabel}>Fecha (YYYY-MM-DD)</Text>
          <TextInput
            style={cardStyles.fieldInput}
            value={draft.date ?? ''}
            onChangeText={(v) => setDraft((d) => ({ ...d, date: v }))}
            placeholder="2026-03-15"
            placeholderTextColor={Colors.textMuted}
            keyboardType="numeric"
          />

          <Text style={cardStyles.fieldLabel}>Hora (HH:MM)</Text>
          <TextInput
            style={cardStyles.fieldInput}
            value={draft.time ?? ''}
            onChangeText={(v) => setDraft((d) => ({ ...d, time: v }))}
            placeholder="10:00"
            placeholderTextColor={Colors.textMuted}
            keyboardType="numeric"
          />

          <Text style={cardStyles.fieldLabel}>Cliente</Text>
          <TextInput
            style={cardStyles.fieldInput}
            value={draft.client ?? ''}
            onChangeText={(v) => setDraft((d) => ({ ...d, client: v }))}
            placeholder="Nombre del cliente"
            placeholderTextColor={Colors.textMuted}
          />

          <Text style={cardStyles.fieldLabel}>Urgencia</Text>
          <View style={cardStyles.urgencyRow}>
            {urgencyOptions.map((u) => (
              <TouchableOpacity
                key={u}
                style={[
                  cardStyles.urgencyBtn,
                  draft.urgency === u && cardStyles.urgencyBtnActive,
                ]}
                onPress={() => setDraft((d) => ({ ...d, urgency: u }))}
              >
                <Text
                  style={[
                    cardStyles.urgencyBtnText,
                    draft.urgency === u && cardStyles.urgencyBtnTextActive,
                  ]}
                >
                  {urgencyLabel[u]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={cardStyles.fieldLabel}>Información extra</Text>
          <TextInput
            style={[cardStyles.fieldInput, cardStyles.fieldInputMulti]}
            value={draft.extraInfo ?? ''}
            onChangeText={(v) => setDraft((d) => ({ ...d, extraInfo: v }))}
            placeholder="Notas adicionales"
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={2}
          />
        </ScrollView>
      )}

      <View style={cardStyles.btnRow}>
        <TouchableOpacity style={cardStyles.cancelBtn} onPress={onCancel}>
          <Ionicons name="close" size={16} color={Colors.textMuted} />
          <Text style={cardStyles.cancelBtnText}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            cardStyles.confirmBtn,
            isDelete && cardStyles.confirmBtnDanger,
          ]}
          onPress={() => onConfirm(draft)}
          disabled={!isDelete && !isComplete && !draft.title?.trim()}
        >
          <Ionicons name="checkmark" size={16} color="#fff" />
          <Text style={cardStyles.confirmBtnText}>
            {isDelete ? 'Eliminar' : isComplete ? 'Completar' : 'Confirmar'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Pantalla principal ───────────────────────────────────────────────────────

export default function AssistantScreen() {
  const { t, locale } = useLocale();
  const insets = useSafeAreaInsets();

  const [chatItems, setChatItems] = useState<ChatItem[]>([
    {
      kind: 'message',
      id: 'welcome',
      msg: {
        role: 'assistant',
        content: t('welcomeMessage'),
      },
    },
  ]);

  const [apiMessages, setApiMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const [resolvedActions, setResolvedActions] = useState<Set<string>>(new Set());

  // Actualizar mensaje de bienvenida si cambia el idioma
  useEffect(() => {
    setChatItems((prev) =>
      prev.map((item) =>
        item.id === 'welcome' && item.kind === 'message'
          ? { ...item, msg: { ...item.msg, content: t('welcomeMessage') } }
          : item
      )
    );
  }, [locale]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMessage: Message = { role: 'user', content: text };
    const newApiMessages = [...apiMessages, userMessage];

    setChatItems((prev) => [
      ...prev,
      { kind: 'message', id: `user-${Date.now()}`, msg: userMessage },
    ]);
    setApiMessages(newApiMessages);
    setInput('');
    setLoading(true);

    try {
      const events = await getEvents();
      const raw = await sendMessage(newApiMessages, events, locale);
      const parsed = parseAIResponse(raw);

      const assistantMessage: Message = { role: 'assistant', content: raw };
      setApiMessages((prev) => [...prev, assistantMessage]);

      if (parsed.action) {
        const actionId = `action-${Date.now()}`;
        const items: ChatItem[] = [];

        if (parsed.message) {
          items.push({
            kind: 'message',
            id: `ai-${Date.now()}`,
            msg: { role: 'assistant', content: parsed.message },
          });
        }

        items.push({ kind: 'action', id: actionId, parsed });
        setChatItems((prev) => [...prev, ...items]);
      } else {
        setChatItems((prev) => [
          ...prev,
          {
            kind: 'message',
            id: `ai-${Date.now()}`,
            msg: { role: 'assistant', content: parsed.message },
          },
        ]);
      }
    } catch {
      setChatItems((prev) => [
        ...prev,
        {
          kind: 'message',
          id: `err-${Date.now()}`,
          msg: { role: 'assistant', content: t('errorConnecting') },
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, apiMessages, loading, locale]);

  const handleConfirmAction = useCallback(
    async (itemId: string, action: AIAction) => {
      setResolvedActions((prev) => new Set(prev).add(itemId));

      try {
        let successMsg = '';

        switch (action.type) {
          case 'create_event':
            await createEvent({
              title: action.title ?? 'Sin título',
              date: action.date ?? new Date().toISOString().split('T')[0],
              time: action.time ?? '',
              urgency: action.urgency ?? 'medium',
              client: action.client ?? '',
              extra_info: action.extraInfo ?? '',
            });
            successMsg = `✅ ${t('eventCreated').replace('%{title}', action.title ?? '')}`;
            break;

          case 'edit_event':
            await updateEvent(action.id!, {
              title: action.title ?? '',
              client: action.client ?? '',
              extra_info: action.extraInfo ?? '',
              urgency: action.urgency ?? 'medium',
              time: action.time ?? '',
            });
            successMsg = `✅ ${t('eventUpdated').replace('%{title}', action.title ?? '')}`;
            break;

          case 'delete_event':
            await deleteEvent(action.id!);
            successMsg = `🗑️ ${t('eventDeleted').replace('%{title}', action.title ?? '')}`;
            break;

          case 'complete_event':
            await toggleEventCompleted(action.id!, true);
            successMsg = `✅ ${t('eventCompleted').replace('%{title}', action.title ?? '')}`;
            break;
        }

        // Inyectar contexto en el historial API (invisible en el chat)
        const contextMsg: Message = {
          role: 'user',
          content: formatActionContext('CONFIRMED', action),
        };
        setApiMessages((prev) => [...prev, contextMsg]);

        setChatItems((prev) => [
          ...prev,
          {
            kind: 'message',
            id: `confirm-${Date.now()}`,
            msg: { role: 'assistant', content: successMsg },
          },
        ]);
      } catch {
        Alert.alert('Error', 'No se pudo ejecutar la acción. Inténtalo de nuevo.');
      }
    },
    [t]
  );

  const handleCancelAction = useCallback(
    (itemId: string, action: AIAction) => {
      setResolvedActions((prev) => new Set(prev).add(itemId));

      // Inyectar contexto en el historial API (invisible en el chat)
      const contextMsg: Message = {
        role: 'user',
        content: formatActionContext('CANCELLED', action),
      };
      setApiMessages((prev) => [...prev, contextMsg]);

      setChatItems((prev) => [
        ...prev,
        {
          kind: 'message',
          id: `cancel-${Date.now()}`,
          msg: { role: 'assistant', content: t('actionCancelled') },
        },
      ]);
    },
    [t]
  );

  useEffect(() => {
    if (chatItems.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [chatItems]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('assistant')}</Text>
        <View style={styles.statusDot} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={chatItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          renderItem={({ item }) => {
            if (item.kind === 'message') {
              return (
                <View
                  style={[
                    styles.bubble,
                    item.msg.role === 'user' ? styles.userBubble : styles.assistantBubble,
                  ]}
                >
                  <Text
                    style={[
                      styles.bubbleText,
                      item.msg.role === 'user' ? styles.userText : styles.assistantText,
                    ]}
                  >
                    {item.msg.content}
                  </Text>
                </View>
              );
            }

            const resolved = resolvedActions.has(item.id);
            if (resolved) return null;

            return (
              <ActionCard
                action={item.parsed.action!}
                onConfirm={(updated) => handleConfirmAction(item.id, updated)}
                onCancel={() => handleCancelAction(item.id, item.parsed.action!)}
              />
            );
          }}
          ListFooterComponent={
            loading ? (
              <View style={styles.loadingBubble}>
                <ActivityIndicator size="small" color={Colors.primary} />
              </View>
            ) : null
          }
        />

        <View
          style={[
            styles.inputRow,
            { paddingBottom: insets.bottom > 0 ? insets.bottom : 12 },
          ]}
        >
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder={t('writeMessage')}
            placeholderTextColor={Colors.textMuted}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!input.trim() || loading}
          >
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.text },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4CAF50',
  },
  messageList: { padding: 16, gap: 10, paddingBottom: 24 },
  bubble: {
    maxWidth: '80%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.card,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  userText: { color: '#fff' },
  assistantText: { color: Colors.text },
  loadingBubble: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: Colors.text,
    fontSize: 15,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sendBtn: {
    backgroundColor: Colors.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
});

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    padding: 16,
    marginVertical: 4,
    gap: 10,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  deleteTitle: {
    fontSize: 16,
    color: Colors.text,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  fieldLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '600',
    marginBottom: 4,
    marginTop: 6,
  },
  fieldInput: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: Colors.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  fieldInputMulti: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  urgencyRow: {
    flexDirection: 'row',
    gap: 8,
  },
  urgencyBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  urgencyBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  urgencyBtnText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  urgencyBtnTextActive: {
    color: '#fff',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  cancelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelBtnText: {
    color: Colors.textMuted,
    fontWeight: '600',
    fontSize: 14,
  },
  confirmBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.primary,
  },
  confirmBtnDanger: {
    backgroundColor: '#E53935',
  },
  confirmBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});