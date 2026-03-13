// app/(tabs)/assistant.tsx

import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { ThemeColors } from '../../constants/colors';
import {
  createEvent,
  deleteEvent,
  getEvents,
  getPreference,
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
import {
  SpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from '../../utils/speechRecognition';
import { useTheme } from '../../utils/ThemeContext';
import { VOICE_INPUT_KEY } from './settings';

// ─── Tipos internos ───────────────────────────────────────────────────────────

type ChatItem =
  | { kind: 'message'; id: string; msg: Message }
  | { kind: 'action'; id: string; parsed: ParsedAIResponse };

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LOCALE_TO_SPEECH: Record<string, string> = {
  es: 'es-ES',
  en: 'en-US',
  pl: 'pl-PL',
};

function speak(
  text: string,
  locale: string,
  callbacks?: {
    onDone?: () => void;
    onStopped?: () => void;
    onError?: () => void;
  }
) {
  Speech.stop();
  const clean = text.replace(/[\u{1F000}-\u{1FFFF}]/gu, '').replace(/[✅🗑️➕✏️⏰📅]/g, '').trim();
  Speech.speak(clean, {
    language: LOCALE_TO_SPEECH[locale] ?? 'es-ES',
    pitch: 1.0,
    rate: 1.0,
    ...callbacks,
  });
}

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
  t,
}: {
  action: AIAction;
  onConfirm: (updated: AIAction) => void;
  onCancel: () => void;
  t: (key: string, params?: Record<string, unknown>) => string;
}) {
  // ── CAMBIO: extraer fontScale en ActionCard también ───────────────────────
  const { colors, fontScale } = useTheme();
  const cardStyles = useMemo(() => makeCardStyles(colors, fontScale), [colors, fontScale]);
  const [draft, setDraft] = useState<AIAction>({ ...action });

  const isDelete = action.type === 'delete_event';
  const isComplete = action.type === 'complete_event';

  const actionLabel: Record<AIAction['type'], string> = {
    create_event: `➕ ${t('createEvent')}`,
    edit_event: `✏️ ${t('editEvent')}`,
    delete_event: `🗑️ ${t('deleteEvent')}`,
    complete_event: `✅ ${t('completeEvent')}`,
  };

  const urgencyOptions: ('low' | 'medium' | 'high')[] = ['low', 'medium', 'high'];

  return (
    <View style={cardStyles.card}>
      <Text style={cardStyles.actionLabel}>{actionLabel[action.type]}</Text>

      {(isDelete || isComplete) ? (
        <Text style={cardStyles.deleteTitle}>"{draft.title}"</Text>
      ) : (
        <ScrollView scrollEnabled={false}>
          <Text style={cardStyles.fieldLabel}>{t('title')} *</Text>
          <TextInput
            style={cardStyles.fieldInput}
            value={draft.title ?? ''}
            onChangeText={(v) => setDraft((d) => ({ ...d, title: v }))}
            placeholder={t('titlePlaceholder')}
            placeholderTextColor={colors.textMuted}
          />

          <Text style={cardStyles.fieldLabel}>{t('date')} (YYYY-MM-DD)</Text>
          <TextInput
            style={cardStyles.fieldInput}
            value={draft.date ?? ''}
            onChangeText={(v) => setDraft((d) => ({ ...d, date: v }))}
            placeholder="2026-03-15"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
          />

          <Text style={cardStyles.fieldLabel}>{t('time')} (HH:MM)</Text>
          <TextInput
            style={cardStyles.fieldInput}
            value={draft.time ?? ''}
            onChangeText={(v) => setDraft((d) => ({ ...d, time: v }))}
            placeholder="10:00"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
          />

          <Text style={cardStyles.fieldLabel}>{t('client')}</Text>
          <TextInput
            style={cardStyles.fieldInput}
            value={draft.client ?? ''}
            onChangeText={(v) => setDraft((d) => ({ ...d, client: v }))}
            placeholder={t('clientPlaceholder')}
            placeholderTextColor={colors.textMuted}
          />

          <Text style={cardStyles.fieldLabel}>{t('urgency')}</Text>
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
                  {t(u)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={cardStyles.fieldLabel}>{t('extraInfo')}</Text>
          <TextInput
            style={[cardStyles.fieldInput, cardStyles.fieldInputMulti]}
            value={draft.extraInfo ?? ''}
            onChangeText={(v) => setDraft((d) => ({ ...d, extraInfo: v }))}
            placeholder={t('extraInfoPlaceholder')}
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={2}
          />
        </ScrollView>
      )}

      <View style={cardStyles.btnRow}>
        <TouchableOpacity style={cardStyles.cancelBtn} onPress={onCancel}>
          <Ionicons name="close" size={16} color={colors.textMuted} />
          <Text style={cardStyles.cancelBtnText}>{t('cancel')}</Text>
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
            {isDelete ? t('delete') : isComplete ? t('completed') : t('confirm')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Pantalla principal ───────────────────────────────────────────────────────

export default function AssistantScreen() {
  const { t, locale } = useLocale();
  // ── CAMBIO: extraer fontScale de useTheme ─────────────────────────────────
  const { colors, fontScale } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors, fontScale), [colors, fontScale]);

  const [chatItems, setChatItems] = useState<ChatItem[]>([
    {
      kind: 'message',
      id: 'welcome',
      msg: { role: 'assistant', content: t('welcomeMessage') },
    },
  ]);

  const [apiMessages, setApiMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [listening, setListening] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const [resolvedActions, setResolvedActions] = useState<Set<string>>(new Set());

  useEffect(() => () => { Speech.stop(); }, []);

  useEffect(() => {
    setVoiceEnabled(getPreference(VOICE_INPUT_KEY, 'false') === 'true');
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setVoiceEnabled(getPreference(VOICE_INPUT_KEY, 'false') === 'true');
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setChatItems((prev) =>
      prev.map((item) =>
        item.id === 'welcome' && item.kind === 'message'
          ? { ...item, msg: { ...item.msg, content: t('welcomeMessage') } }
          : item
      )
    );
  }, [locale]);

  useSpeechRecognitionEvent('result', (event) => {
    if (event.results?.[0]?.transcript) {
      setInput(event.results[0].transcript);
    }
  });

  useSpeechRecognitionEvent('end', () => {
    setListening(false);
  });

  useSpeechRecognitionEvent('error', () => {
    setListening(false);
  });

  const handleMicPress = useCallback(async () => {
    if (listening) {
      SpeechRecognitionModule.stop();
      setListening(false);
      return;
    }
    try {
      const { granted } = await SpeechRecognitionModule.requestPermissionsAsync();
      if (!granted) {
        Alert.alert(t('micPermissionTitle'), t('micPermissionMessage'));
        return;
      }
      setInput('');
      setListening(true);
      SpeechRecognitionModule.start({
        lang: LOCALE_TO_SPEECH[locale] ?? 'es-ES',
        interimResults: true,
        continuous: false,
      });
    } catch {
      setListening(false);
    }
  }, [listening, locale, t]);

  const handleSpeak = useCallback((text: string) => {
    if (speaking) {
      Speech.stop();
      setSpeaking(false);
    } else {
      setSpeaking(true);
      speak(text, locale, {
        onDone: () => setSpeaking(false),
        onStopped: () => setSpeaking(false),
        onError: () => setSpeaking(false),
      });
    }
  }, [speaking, locale]);

  const toggleTts = useCallback(() => {
    if (ttsEnabled) Speech.stop();
    setTtsEnabled((prev) => !prev);
    setSpeaking(false);
  }, [ttsEnabled]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    if (listening) {
      SpeechRecognitionModule.stop();
      setListening(false);
    }

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
          if (ttsEnabled) speak(parsed.message, locale);
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
        if (ttsEnabled) speak(parsed.message, locale);
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
  }, [input, apiMessages, loading, locale, ttsEnabled, listening]);

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
            successMsg = `✅ ${t('eventCreated', { title: action.title ?? '' })}`;
            break;

          case 'edit_event':
            await updateEvent(action.id!, {
              title: action.title ?? '',
              client: action.client ?? '',
              extra_info: action.extraInfo ?? '',
              urgency: action.urgency ?? 'medium',
              time: action.time ?? '',
            });
            successMsg = `✅ ${t('eventUpdated', { title: action.title ?? '' })}`;
            break;

          case 'delete_event':
            await deleteEvent(action.id!);
            successMsg = `🗑️ ${t('eventDeleted', { title: action.title ?? '' })}`;
            break;

          case 'complete_event':
            await toggleEventCompleted(action.id!, true);
            successMsg = `✅ ${t('eventCompleted', { title: action.title ?? '' })}`;
            break;
        }

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
        if (ttsEnabled) speak(successMsg, locale);
      } catch {
        Alert.alert('Error', 'No se pudo ejecutar la acción. Inténtalo de nuevo.');
      }
    },
    [t, ttsEnabled, locale]
  );

  const handleCancelAction = useCallback(
    (itemId: string, action: AIAction) => {
      setResolvedActions((prev) => new Set(prev).add(itemId));

      const contextMsg: Message = {
        role: 'user',
        content: formatActionContext('CANCELLED', action),
      };
      setApiMessages((prev) => [...prev, contextMsg]);

      const msg = t('actionCancelled');
      setChatItems((prev) => [
        ...prev,
        {
          kind: 'message',
          id: `cancel-${Date.now()}`,
          msg: { role: 'assistant', content: msg },
        },
      ]);
      if (ttsEnabled) speak(msg, locale);
    },
    [t, ttsEnabled, locale]
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
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.ttsBtn, ttsEnabled && styles.ttsBtnActive]}
            onPress={toggleTts}
          >
            <Ionicons
              name={ttsEnabled ? 'volume-high' : 'volume-mute'}
              size={20}
              color={ttsEnabled ? colors.primary : colors.textMuted}
            />
          </TouchableOpacity>
          <View style={styles.statusDot} />
        </View>
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
              const isAssistant = item.msg.role === 'assistant';
              return (
                <View style={styles.bubbleWrapper}>
                  <View
                    style={[
                      styles.bubble,
                      isAssistant ? styles.assistantBubble : styles.userBubble,
                    ]}
                  >
                    <Text
                      style={[
                        styles.bubbleText,
                        isAssistant ? styles.assistantText : styles.userText,
                      ]}
                    >
                      {item.msg.content}
                    </Text>
                  </View>
                  {isAssistant && (
                    <TouchableOpacity
                      style={styles.speakBtn}
                      onPress={() => handleSpeak(item.msg.content)}
                    >
                      <Ionicons
                        name="volume-medium-outline"
                        size={14}
                        color={colors.textMuted}
                      />
                    </TouchableOpacity>
                  )}
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
                t={t}
              />
            );
          }}
          ListFooterComponent={
            loading ? (
              <View style={styles.loadingBubble}>
                <ActivityIndicator size="small" color={colors.primary} />
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
            placeholder={listening ? t('listening') : t('writeMessage')}
            placeholderTextColor={listening ? colors.primary : colors.textMuted}
            multiline
            maxLength={500}
            editable={!listening}
          />

          {voiceEnabled && (
            <TouchableOpacity
              style={[styles.micBtn, listening && styles.micBtnActive]}
              onPress={handleMicPress}
            >
              <Ionicons
                name={listening ? 'stop' : 'mic'}
                size={20}
                color="#fff"
              />
            </TouchableOpacity>
          )}

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

// ── CAMBIO: añadir scale y fs() a makeStyles ─────────────────────────────────
const makeStyles = (c: ThemeColors, scale: number) => {
  const fs = (n: number) => Math.round(n * scale);
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    flex: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    headerTitle: { fontSize: fs(22), fontWeight: '700', color: c.text },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    ttsBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ttsBtnActive: {
      borderColor: c.primary,
      backgroundColor: c.primary + '18',
    },
    statusDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: '#4CAF50',
    },
    messageList: { padding: 16, gap: 10, paddingBottom: 24 },
    bubbleWrapper: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 6,
    },
    bubble: {
      maxWidth: '80%',
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    userBubble: {
      alignSelf: 'flex-end',
      marginLeft: 'auto',
      backgroundColor: c.primary,
      borderBottomRightRadius: 4,
    },
    assistantBubble: {
      alignSelf: 'flex-start',
      backgroundColor: c.card,
      borderBottomLeftRadius: 4,
      borderWidth: 1,
      borderColor: c.border,
    },
    bubbleText: { fontSize: fs(15), lineHeight: Math.round(22 * scale) },
    userText: { color: '#fff' },
    assistantText: { color: c.text },
    speakBtn: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: c.surface,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 2,
    },
    loadingBubble: {
      alignSelf: 'flex-start',
      backgroundColor: c.card,
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: c.border,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 10,
      paddingHorizontal: 16,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: c.border,
      backgroundColor: c.surface,
    },
    input: {
      flex: 1,
      backgroundColor: c.card,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 10,
      color: c.text,
      fontSize: fs(15),
      maxHeight: 100,
      borderWidth: 1,
      borderColor: c.border,
    },
    micBtn: {
      backgroundColor: c.textMuted,
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    micBtnActive: { backgroundColor: '#E53935' },
    sendBtn: {
      backgroundColor: c.primary,
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendBtnDisabled: { opacity: 0.4 },
  });
};

// ── CAMBIO: añadir scale y fs() a makeCardStyles ─────────────────────────────
const makeCardStyles = (c: ThemeColors, scale: number) => {
  const fs = (n: number) => Math.round(n * scale);
  return StyleSheet.create({
    card: {
      backgroundColor: c.card,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: c.primary,
      padding: 16,
      marginVertical: 4,
      gap: 10,
    },
    actionLabel: {
      fontSize: fs(13),
      fontWeight: '700',
      color: c.primary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    deleteTitle: {
      fontSize: fs(16),
      color: c.text,
      fontStyle: 'italic',
      paddingVertical: 8,
    },
    fieldLabel: {
      fontSize: fs(12),
      color: c.textMuted,
      fontWeight: '600',
      marginBottom: 4,
      marginTop: 6,
    },
    fieldInput: {
      backgroundColor: c.background,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      color: c.text,
      fontSize: fs(15),
      borderWidth: 1,
      borderColor: c.border,
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
      borderColor: c.border,
      alignItems: 'center',
    },
    urgencyBtnActive: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    urgencyBtnText: {
      fontSize: fs(13),
      color: c.textMuted,
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
      borderColor: c.border,
    },
    cancelBtnText: {
      color: c.textMuted,
      fontWeight: '600',
      fontSize: fs(14),
    },
    confirmBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: c.primary,
    },
    confirmBtnDanger: {
      backgroundColor: '#E53935',
    },
    confirmBtnText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: fs(14),
    },
  });
};