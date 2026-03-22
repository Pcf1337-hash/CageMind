import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  GiftedChat,
  Bubble,
  IMessage,
  Send,
  InputToolbar,
  Composer,
} from 'react-native-gifted-chat';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect } from 'expo-router';
import { Settings, Plus, Send as SendIcon, Camera, X } from 'lucide-react-native';
import {
  getChatMessages,
  insertChatMessage,
  clearChatMessages,
  getSetting,
  setSetting,
  getStreak,
  getMoodEntriesByDateRange,
  getJournalEntries,
  getExerciseSessions,
} from '../../lib/database';
import {
  sendMessage,
  hasApiKey,
  getErrorMessage,
  buildSystemPrompt,
  extractProfileInsights,
  type Message,
  type ImageAttachment,
  type AppContext,
} from '../../lib/claude';
import { COLORS, getLocalDateString } from '../../lib/constants';

function buildWelcomeMessage(userName: string): IMessage {
  const hour = new Date().getHours();
  const greeting =
    hour >= 5 && hour < 12
      ? `Guten Morgen, ${userName}`
      : hour >= 12 && hour < 17
      ? `Hallo, ${userName}`
      : hour >= 17 && hour < 22
      ? `Guten Abend, ${userName}`
      : `Hey, ${userName}`;

  return {
    _id: 'welcome',
    text: `${greeting} \u{1F49C} Ich bin hier. Wie geht es dir heute?`,
    createdAt: new Date(),
    user: { _id: 2, name: 'CageMind' },
  };
}

function getLast7DaysRange(): { from: string; to: string } {
  const to = getLocalDateString();
  const past = new Date();
  past.setDate(past.getDate() - 6);
  const from = getLocalDateString(past);
  return { from, to };
}

export default function ChatScreen() {
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [userName, setUserName] = useState('');
  const [pendingImage, setPendingImage] = useState<{
    uri: string;
    base64: string;
    mediaType: string;
  } | null>(null);

  const conversationRef = useRef<Message[]>([]);
  const systemPromptRef = useRef<string>('');
  const profileNotesRef = useRef<string>('');
  const streakRef = useRef<number>(0);
  const avgMoodRef = useRef<number | null>(null);
  const userMessageCountRef = useRef<number>(0);
  const userNameRef = useRef<string>('');
  const streamRafRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);
  const appContextRef = useRef<AppContext | null>(null);

  const rebuildSystemPrompt = useCallback(() => {
    systemPromptRef.current = buildSystemPrompt(
      userNameRef.current || 'du',
      streakRef.current,
      avgMoodRef.current,
      profileNotesRef.current,
      appContextRef.current,
    );
  }, []);

  const loadContext = useCallback(async () => {
    try {
      const name = (await getSetting('user_name')) ?? 'du';
      setUserName(name);
      userNameRef.current = name;

      const keyExists = await hasApiKey();
      setHasKey(keyExists);

      // Load streak and mood for enriched system prompt
      const streak = await getStreak();
      streakRef.current = streak;

      const { from, to } = getLast7DaysRange();
      const moodEntries = await getMoodEntriesByDateRange(from, to);
      const scores = moodEntries.map((e) => e.mood_score);
      const avgMood =
        scores.length > 0
          ? scores.reduce((a, b) => a + b, 0) / scores.length
          : null;
      avgMoodRef.current = avgMood;

      // Load persistent psychological profile
      const profileNotes = (await getSetting('user_profile_notes')) ?? '';
      profileNotesRef.current = profileNotes;

      // Build app context: today's journal entries + recent mood + recent exercises
      const todayDate = getLocalDateString();
      const threeDaysAgo = getLocalDateString(new Date(Date.now() - 3 * 86400000));
      const [allJournal, allExercises] = await Promise.all([
        getJournalEntries(),
        getExerciseSessions(),
      ]);
      appContextRef.current = {
        todayJournalEntries: allJournal
          .filter((j) => j.date === todayDate)
          .map((j) => ({ title: j.title, content: j.content, mood_score: j.mood_score })),
        recentMoodEntries: moodEntries.map((m) => ({
          date: m.date,
          mood_score: m.mood_score,
          emoji: m.emoji,
          note: m.note,
        })),
        recentExercises: allExercises
          .filter((e) => e.date >= threeDaysAgo)
          .map((e) => ({ type: e.type, completed: e.completed, date: e.date })),
        todayDate,
      };

      // Build enriched system prompt with profile and app context
      rebuildSystemPrompt();

      // Load full chat history from DB (up to 150 messages for memory)
      const dbMsgs = await getChatMessages(150);

      if (dbMsgs.length === 0) {
        setMessages([buildWelcomeMessage(name)]);
        conversationRef.current = [];
        return;
      }

      // Build gifted-chat message list (newest first for display)
      const giftedMsgs: IMessage[] = dbMsgs
        .slice()
        .reverse()
        .map((m, i) => ({
          _id: m.id ?? i,
          text: m.content,
          createdAt: m.created_at ? new Date(m.created_at) : new Date(),
          user:
            m.role === 'user'
              ? { _id: 1, name }
              : { _id: 2, name: 'CageMind' },
        }));

      // Build full conversation history (for display context)
      conversationRef.current = dbMsgs.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Count existing user messages to continue the extraction cadence
      userMessageCountRef.current = dbMsgs.filter(
        (m) => m.role === 'user',
      ).length;

      setMessages(giftedMsgs);
    } catch (e) {
      console.error('Chat context load error:', e);
    }
  }, [rebuildSystemPrompt]);

  useFocusEffect(
    useCallback(() => {
      loadContext();
    }, [loadContext]),
  );

  // Refresh context whenever screen comes into focus (mood/streak may have changed)
  useEffect(() => {
    const refreshContext = async () => {
      try {
        const name = (await getSetting('user_name')) ?? 'du';
        userNameRef.current = name;
        const streak = await getStreak();
        streakRef.current = streak;
        const { from, to } = getLast7DaysRange();
        const moodEntries = await getMoodEntriesByDateRange(from, to);
        const scores = moodEntries.map((e) => e.mood_score);
        avgMoodRef.current =
          scores.length > 0
            ? scores.reduce((a, b) => a + b, 0) / scores.length
            : null;

        // Refresh app context on focus (user may have added a journal entry or mood)
        const todayDate = getLocalDateString();
        const threeDaysAgo = getLocalDateString(new Date(Date.now() - 3 * 86400000));
        const [allJournal, allExercises] = await Promise.all([
          getJournalEntries(),
          getExerciseSessions(),
        ]);
        appContextRef.current = {
          todayJournalEntries: allJournal
            .filter((j) => j.date === todayDate)
            .map((j) => ({ title: j.title, content: j.content, mood_score: j.mood_score })),
          recentMoodEntries: moodEntries.map((m) => ({
            date: m.date,
            mood_score: m.mood_score,
            emoji: m.emoji,
            note: m.note,
          })),
          recentExercises: allExercises
            .filter((e) => e.date >= threeDaysAgo)
            .map((e) => ({ type: e.type, completed: e.completed, date: e.date })),
          todayDate,
        };
        rebuildSystemPrompt();
      } catch {
        // silent
      }
    };
    refreshContext();
  }, [rebuildSystemPrompt]);

  const handleSend = useCallback(
    async (newMessages: IMessage[]) => {
      const userMsg = newMessages[0];
      const userText = userMsg.text as string;

      // Attach pending image to the message bubble if present
      const imageToSend = pendingImage;
      if (imageToSend) {
        newMessages[0] = { ...newMessages[0], image: imageToSend.uri };
        setPendingImage(null);
      }

      setMessages((prev) => GiftedChat.append(prev, newMessages));
      setIsTyping(true);

      const typingId = `typing_${Date.now()}`;
      const typingMsg: IMessage = {
        _id: typingId,
        text: '',
        createdAt: new Date(),
        user: { _id: 2, name: 'CageMind' },
      };
      setMessages((prev) => GiftedChat.append(prev, [typingMsg]));

      try {
        await insertChatMessage({ role: 'user', content: userText });

        let assistantText = '';
        let firstChunk = true;

        const imageAttachment: ImageAttachment | undefined = imageToSend
          ? { base64: imageToSend.base64, mediaType: imageToSend.mediaType }
          : undefined;

        // Sliding window: first 2 messages (greeting context) + last 38
        // Keeps API context under ~40k tokens while preserving conversational memory
        const MAX_API_MESSAGES = 40;
        const full = conversationRef.current;
        const apiContext: Message[] =
          full.length <= MAX_API_MESSAGES
            ? full
            : [...full.slice(0, 2), ...full.slice(-(MAX_API_MESSAGES - 2))];

        await sendMessage(
          apiContext,
          userText,
          (chunk) => {
            // Turn off typing indicator as soon as real content streams in
            if (firstChunk) {
              firstChunk = false;
              setIsTyping(false);
            }
            assistantText += chunk;
            // Throttle state updates via RAF to avoid "Maximum update depth exceeded"
            if (streamRafRef.current !== null) {
              cancelAnimationFrame(streamRafRef.current);
            }
            const snapshot = assistantText;
            streamRafRef.current = requestAnimationFrame(() => {
              streamRafRef.current = null;
              setMessages((prev) =>
                prev.map((m) =>
                  m._id === typingId ? { ...m, text: snapshot } : m,
                ),
              );
            });
          },
          systemPromptRef.current,
          imageAttachment,
        );

        await insertChatMessage({ role: 'assistant', content: assistantText });

        conversationRef.current = [
          ...conversationRef.current,
          { role: 'user', content: userText },
          { role: 'assistant', content: assistantText },
        ];

        setMessages((prev) =>
          prev.map((m) =>
            m._id === typingId
              ? { ...m, _id: Date.now(), text: assistantText }
              : m,
          ),
        );

        // Profile extraction: every 5 user messages, silently update the profile
        userMessageCountRef.current += 1;
        if (
          userMessageCountRef.current % 5 === 0 &&
          conversationRef.current.length >= 6
        ) {
          const currentConv = [...conversationRef.current];
          const currentNotes = profileNotesRef.current;
          const currentName = userNameRef.current;

          extractProfileInsights(currentConv, currentNotes, currentName)
            .then(async (updated) => {
              if (updated && updated !== currentNotes) {
                profileNotesRef.current = updated;
                await setSetting('user_profile_notes', updated);
                await setSetting('profile_last_updated', new Date().toISOString());
                rebuildSystemPrompt();
              }
            })
            .catch(() => {
              // Silent fail — profile extraction is non-critical
            });
        }
      } catch (error) {
        setMessages((prev) => prev.filter((m) => m._id !== typingId));
        const msg = getErrorMessage(error);
        // Detect network-level failure (no internet) vs API errors
        const isNetworkError =
          error instanceof Error &&
          !['NO_API_KEY', 'INVALID_API_KEY', 'RATE_LIMIT', 'TIMEOUT'].includes(error.message) &&
          !error.message.startsWith('API_ERROR_');
        if (isNetworkError) setIsOffline(true);
        Alert.alert('Verbindungsfehler', msg);
      } finally {
        setIsTyping(false);
      }
    },
    [rebuildSystemPrompt, pendingImage],
  );

  const handlePickImage = useCallback(async (useCamera: boolean) => {
    const perm = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!perm.granted) {
      Alert.alert(
        'Berechtigung benötigt',
        'Bitte erlaube den Zugriff in den Einstellungen deines Geräts.',
      );
      return;
    }

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.7,
          base64: true,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.7,
          base64: true,
        });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setPendingImage({
        uri: asset.uri,
        base64: asset.base64 ?? '',
        mediaType: asset.mimeType ?? 'image/jpeg',
      });
    }
  }, []);

  const handleImageButton = useCallback(() => {
    Alert.alert('Bild senden', 'Woher soll das Bild kommen?', [
      { text: 'Kamera', onPress: () => handlePickImage(true) },
      { text: 'Galerie', onPress: () => handlePickImage(false) },
      { text: 'Abbrechen', style: 'cancel' },
    ]);
  }, [handlePickImage]);

  const handleNewConversation = useCallback(() => {
    Alert.alert(
      'Neue Unterhaltung',
      'Den Chat-Verlauf löschen und neu beginnen?\n\nCageMind behält dabei alles was er über dich gelernt hat — nur die Nachrichten werden gelöscht.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Neu beginnen',
          style: 'destructive',
          onPress: async () => {
            // Extract profile before clearing — saves any insights from this session
            if (conversationRef.current.length >= 4) {
              extractProfileInsights(
                conversationRef.current,
                profileNotesRef.current,
                userNameRef.current || 'du',
              )
                .then(async (updated) => {
                  if (updated && updated !== profileNotesRef.current) {
                    profileNotesRef.current = updated;
                    await setSetting('user_profile_notes', updated);
                    rebuildSystemPrompt();
                  }
                })
                .catch(() => {});
            }
            await clearChatMessages();
            conversationRef.current = [];
            userMessageCountRef.current = 0;
            setMessages([buildWelcomeMessage(userNameRef.current || 'du')]);
          },
        },
      ],
    );
  }, [rebuildSystemPrompt]);

  if (hasKey === null) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={COLORS.accent} style={styles.loader} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>CM</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>CageMind</Text>
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusDot,
                  hasKey ? styles.online : styles.offline,
                ]}
              />
              <Text style={styles.statusText}>
                {hasKey ? 'Immer da' : 'Kein API-Schlüssel'}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            onPress={handleNewConversation}
            style={styles.headerBtn}
            accessibilityLabel="Neue Unterhaltung starten"
            accessibilityRole="button"
          >
            <Plus size={20} color={COLORS.muted} />
          </Pressable>
          <Pressable
            onPress={() => router.push('/settings')}
            style={styles.headerBtn}
            accessibilityLabel="Einstellungen"
            accessibilityRole="button"
          >
            <Settings size={20} color={COLORS.muted} />
          </Pressable>
        </View>
      </View>

      {isOffline && (
        <Pressable
          onPress={() => setIsOffline(false)}
          style={styles.offlineBanner}
          accessibilityLabel="Kein Internet — tippen zum Schließen"
          accessibilityRole="button"
        >
          <Text style={styles.offlineText}>Kein Internet — Chat nicht verfügbar</Text>
        </Pressable>
      )}

      {!hasKey && (
        <Pressable
          onPress={() => router.push('/settings')}
          style={styles.noKeyBanner}
          accessibilityLabel="Zu den Einstellungen"
          accessibilityRole="button"
        >
          <Text style={styles.noKeyText}>
            Kein API-Schlüssel — Chat ist deaktiviert.
          </Text>
          <Text style={styles.noKeyLink}>Jetzt einrichten →</Text>
        </Pressable>
      )}

      {/* Bild-Vorschau über dem Eingabefeld */}
      {pendingImage && (
        <View style={styles.imagePreviewBar}>
          <Image source={{ uri: pendingImage.uri }} style={styles.imagePreviewThumb} />
          <Text style={styles.imagePreviewHint}>Bild wird mit nächster Nachricht gesendet</Text>
          <Pressable
            onPress={() => setPendingImage(null)}
            style={styles.imagePreviewClose}
            accessibilityLabel="Bild entfernen"
            accessibilityRole="button"
          >
            <X size={16} color={COLORS.text} />
          </Pressable>
        </View>
      )}

      <GiftedChat
        messages={messages}
        onSend={handleSend}
        user={{ _id: 1, name: userName }}
        isTyping={isTyping}
        placeholder="Schreib mir etwas..."
        locale="de"
        renderUsernameOnMessage={false}
        alwaysShowSend
        messagesContainerStyle={{ paddingBottom: 12 }}
        renderBubble={(props) => (
          <Bubble
            {...props}
            wrapperStyle={{
              right: { backgroundColor: COLORS.surface2, borderRadius: 16 },
              left: {
                backgroundColor: COLORS.accent + 'DD',
                borderRadius: 16,
              },
            }}
            textStyle={{
              right: { color: COLORS.text },
              left: { color: '#fff' },
            }}
            containerStyle={{
              left: { marginBottom: 2 },
              right: { marginBottom: 2 },
            }}
          />
        )}
        renderInputToolbar={(props) => (
          <InputToolbar
            {...props}
            containerStyle={styles.toolbar}
            primaryStyle={styles.toolbarPrimary}
          />
        )}
        renderActions={() => (
          <Pressable
            onPress={handleImageButton}
            style={styles.cameraBtn}
            disabled={!hasKey}
            accessibilityLabel="Bild senden"
            accessibilityRole="button"
          >
            <Camera size={22} color={hasKey ? COLORS.accent : COLORS.muted} />
          </Pressable>
        )}
        renderComposer={(props) => (
          <Composer
            {...props}
            textInputStyle={styles.composerInput}
            placeholderTextColor={COLORS.muted}
            textInputProps={{ editable: !!hasKey }}
          />
        )}
        renderSend={(props) => (
          <Send {...props} disabled={!hasKey} containerStyle={styles.sendContainer}>
            <View style={styles.sendBtn}>
              <SendIcon
                size={20}
                color={hasKey ? COLORS.accent : COLORS.muted}
              />
            </View>
          </Send>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  loader: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface2,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.accent + '44',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: COLORS.accent, fontWeight: '700', fontSize: 14 },
  headerTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  online: { backgroundColor: COLORS.accent2 },
  offline: { backgroundColor: COLORS.muted },
  statusText: { color: COLORS.muted, fontSize: 12 },
  headerActions: { flexDirection: 'row', gap: 4 },
  headerBtn: {
    padding: 8,
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offlineBanner: {
    backgroundColor: COLORS.surface2,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.muted + '33',
    alignItems: 'center',
  },
  offlineText: { color: COLORS.muted, fontSize: 13 },
  noKeyBanner: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface2,
  },
  noKeyText: { color: COLORS.muted, fontSize: 13, flex: 1 },
  noKeyLink: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
  },
  toolbar: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.surface2,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  toolbarPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface2,
    borderRadius: 24,
    paddingHorizontal: 4,
    minHeight: 48,
  },
  composerInput: {
    color: COLORS.text,
    fontSize: 15,
    backgroundColor: 'transparent',
    marginTop: 0,
    marginBottom: 0,
    paddingTop: 10,
    paddingBottom: 10,
    lineHeight: 20,
  },
  sendContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.accent + '22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  imagePreviewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.surface2,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 10,
  },
  imagePreviewThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: COLORS.surface2,
  },
  imagePreviewHint: {
    flex: 1,
    color: COLORS.muted,
    fontSize: 13,
  },
  imagePreviewClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
