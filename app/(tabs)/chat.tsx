import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { GiftedChat, Bubble, IMessage, Send } from 'react-native-gifted-chat';
import { router, useFocusEffect } from 'expo-router';
import { Settings, Plus, Send as SendIcon } from 'lucide-react-native';
import {
  getChatMessages,
  insertChatMessage,
  clearChatMessages,
} from '../../lib/database';
import {
  sendMessage,
  hasApiKey,
  getErrorMessage,
  type Message,
} from '../../lib/claude';
import { COLORS } from '../../lib/constants';

const WELCOME_MESSAGE: IMessage = {
  _id: 'welcome',
  text: 'Hallo! Wie geht es dir heute? Ich bin hier und hore zu. Du kannst mir alles erzahlen — ich urteile nicht.',
  createdAt: new Date(),
  user: { _id: 2, name: 'CageMind' },
};

export default function ChatScreen() {
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const conversationRef = useRef<Message[]>([]);

  const loadMessages = useCallback(async () => {
    try {
      const keyExists = await hasApiKey();
      setHasKey(keyExists);

      const dbMsgs = await getChatMessages(50);
      if (dbMsgs.length === 0) {
        setMessages([WELCOME_MESSAGE]);
        return;
      }

      const giftedMsgs: IMessage[] = dbMsgs.reverse().map((m, i) => ({
        _id: m.id ?? i,
        text: m.content,
        createdAt: m.created_at ? new Date(m.created_at) : new Date(),
        user: m.role === 'user' ? { _id: 1 } : { _id: 2, name: 'CageMind' },
      }));

      conversationRef.current = dbMsgs.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      setMessages(giftedMsgs);
    } catch (e) {
      console.error('Chat load error:', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadMessages();
    }, [loadMessages])
  );

  const handleSend = useCallback(
    async (newMessages: IMessage[]) => {
      const userMsg = newMessages[0];
      const userText = userMsg.text as string;

      setMessages((prev) => GiftedChat.append(prev, newMessages));
      setIsTyping(true);

      try {
        await insertChatMessage({ role: 'user', content: userText });

        let assistantText = '';
        const typingId = `typing_${Date.now()}`;

        const typingMsg: IMessage = {
          _id: typingId,
          text: '',
          createdAt: new Date(),
          user: { _id: 2, name: 'CageMind' },
        };
        setMessages((prev) => GiftedChat.append(prev, [typingMsg]));

        await sendMessage(
          conversationRef.current,
          userText,
          (chunk) => {
            assistantText += chunk;
            setMessages((prev) =>
              prev.map((m) =>
                m._id === typingId ? { ...m, text: assistantText } : m
              )
            );
          }
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
              : m
          )
        );
      } catch (error) {
        const msg = getErrorMessage(error);
        Alert.alert('Verbindungsfehler', msg);
        setMessages((prev) => prev.filter((m) => m._id !== 'typing_' + Date.now()));
      } finally {
        setIsTyping(false);
      }
    },
    []
  );

  const handleNewConversation = () => {
    Alert.alert(
      'Neue Unterhaltung',
      'Mochtest du den Chat-Verlauf loschen und neu beginnen?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Neu beginnen',
          style: 'destructive',
          onPress: async () => {
            await clearChatMessages();
            conversationRef.current = [];
            setMessages([WELCOME_MESSAGE]);
          },
        },
      ]
    );
  };

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
              <View style={[styles.statusDot, hasKey ? styles.online : styles.offline]} />
              <Text style={styles.statusText}>
                {hasKey ? 'Immer da' : 'Kein API-Schlussel'}
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

      {!hasKey && (
        <View style={styles.noKeyBanner}>
          <Text style={styles.noKeyText}>
            Kein API-Schlussel hinterlegt. Der Chat ist deaktiviert.
          </Text>
          <Pressable
            onPress={() => router.push('/settings')}
            accessibilityLabel="Zu den Einstellungen"
            accessibilityRole="button"
          >
            <Text style={styles.noKeyLink}>Jetzt einrichten →</Text>
          </Pressable>
        </View>
      )}

      <GiftedChat
        messages={messages}
        onSend={handleSend}
        user={{ _id: 1 }}
        isTyping={isTyping}
        placeholder="Schreib mir etwas..."
        locale="de"
        renderUsernameOnMessage={false}
        alwaysShowSend
        renderBubble={(props) => (
          <Bubble
            {...props}
            wrapperStyle={{
              right: { backgroundColor: COLORS.surface2, borderRadius: 16 },
              left: { backgroundColor: COLORS.accent + 'DD', borderRadius: 16 },
            }}
            textStyle={{
              right: { color: COLORS.text },
              left: { color: '#fff' },
            }}
          />
        )}
        renderSend={(props) => (
          <Send {...props} disabled={!hasKey}>
            <View style={styles.sendBtn}>
              <SendIcon
                size={20}
                color={hasKey ? COLORS.accent : COLORS.muted}
              />
            </View>
          </Send>
        )}
        textInputProps={{
          editable: !!hasKey,
          style: styles.textInput,
        }}
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
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
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
  noKeyLink: { color: COLORS.accent, fontSize: 13, fontWeight: '600', marginLeft: 8 },
  sendBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    color: COLORS.text,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
  },
});
