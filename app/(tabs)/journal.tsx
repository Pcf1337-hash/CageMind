import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Pressable,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Plus, X } from 'lucide-react-native';
import JournalEntryComponent from '../../components/JournalEntry';
import MoodPicker from '../../components/MoodPicker';
import {
  getJournalEntries,
  insertJournalEntry,
  deleteJournalEntry,
  type JournalEntry,
} from '../../lib/database';
import { COLORS } from '../../lib/constants';

export default function JournalScreen() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState<number | null>(null);
  const [detailEntry, setDetailEntry] = useState<JournalEntry | null>(null);

  const loadEntries = useCallback(async () => {
    try {
      const data = await getJournalEntries();
      setEntries(data);
    } catch (e) {
      console.error('Journal load error:', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadEntries();
    }, [loadEntries])
  );

  const handleSave = async () => {
    if (!content.trim()) {
      Alert.alert('Inhalt fehlt', 'Bitte schreib etwas in deinen Eintrag.');
      return;
    }
    try {
      const today = new Date().toISOString().split('T')[0];
      await insertJournalEntry({
        title: title.trim(),
        content: content.trim(),
        mood_score: mood,
        date: today,
      });
      setTitle('');
      setContent('');
      setMood(null);
      setShowForm(false);
      await loadEntries();
    } catch {
      Alert.alert('Fehler', 'Eintrag konnte nicht gespeichert werden.');
    }
  };

  const handleDelete = (entry: JournalEntry) => {
    Alert.alert(
      'Eintrag loschen',
      'Diesen Eintrag wirklich loschen?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Loschen',
          style: 'destructive',
          onPress: async () => {
            if (entry.id) {
              await deleteJournalEntry(entry.id);
              await loadEntries();
            }
          },
        },
      ]
    );
  };

  // Group entries by date
  const grouped: Record<string, JournalEntry[]> = {};
  for (const e of entries) {
    const key = e.date;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(e);
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Tagebuch</Text>
        <Pressable
          onPress={() => setShowForm(true)}
          style={styles.fab}
          accessibilityLabel="Neuen Eintrag erstellen"
          accessibilityRole="button"
        >
          <Plus size={22} color="#fff" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {entries.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📝</Text>
            <Text style={styles.emptyText}>
              Noch kein Eintrag — fang einfach an.
            </Text>
            <Pressable
              onPress={() => setShowForm(true)}
              style={styles.emptyBtn}
              accessibilityLabel="Ersten Eintrag erstellen"
              accessibilityRole="button"
            >
              <Text style={styles.emptyBtnText}>Ersten Eintrag schreiben</Text>
            </Pressable>
          </View>
        ) : (
          Object.keys(grouped)
            .sort((a, b) => b.localeCompare(a))
            .map((date) => (
              <View key={date}>
                <Text style={styles.dateGroup}>
                  {new Date(date).toLocaleDateString('de-DE', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </Text>
                {grouped[date].map((entry) => (
                  <JournalEntryComponent
                    key={entry.id}
                    entry={entry}
                    onPress={() => setDetailEntry(entry)}
                    onDelete={() => handleDelete(entry)}
                  />
                ))}
              </View>
            ))
        )}
      </ScrollView>

      {/* New Entry Modal */}
      <Modal visible={showForm} animationType="slide" statusBarTranslucent>
        <SafeAreaView style={styles.modalSafe}>
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Neuer Eintrag</Text>
              <Pressable
                onPress={() => setShowForm(false)}
                style={styles.closeBtn}
                accessibilityLabel="Formular schlieben"
                accessibilityRole="button"
              >
                <X size={22} color={COLORS.muted} />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.modalContent}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.fieldLabel}>Wie geht's dir?</Text>
              <MoodPicker selected={mood} onSelect={setMood} />

              <Text style={styles.fieldLabel}>Titel (optional)</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Titel..."
                placeholderTextColor={COLORS.muted}
                style={styles.input}
                returnKeyType="next"
                maxLength={100}
                accessibilityLabel="Titel des Eintrags"
              />

              <Text style={styles.fieldLabel}>Was bewegt dich heute?</Text>
              <TextInput
                value={content}
                onChangeText={setContent}
                placeholder="Schreib einfach drauflos..."
                placeholderTextColor={COLORS.muted}
                style={[styles.input, styles.textArea]}
                multiline
                numberOfLines={8}
                textAlignVertical="top"
                autoFocus
                accessibilityLabel="Inhalt des Eintrags"
              />

              <Pressable
                onPress={handleSave}
                disabled={!content.trim()}
                style={[styles.saveBtn, !content.trim() && styles.saveBtnDisabled]}
                accessibilityLabel="Eintrag speichern"
                accessibilityRole="button"
              >
                <Text style={styles.saveBtnText}>Speichern</Text>
              </Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Detail Modal */}
      <Modal
        visible={detailEntry !== null}
        animationType="slide"
        statusBarTranslucent
      >
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Eintrag</Text>
            <Pressable
              onPress={() => setDetailEntry(null)}
              style={styles.closeBtn}
              accessibilityLabel="Eintrag schlieben"
              accessibilityRole="button"
            >
              <X size={22} color={COLORS.muted} />
            </Pressable>
          </View>
          {detailEntry && (
            <ScrollView contentContainerStyle={styles.detailContent}>
              <Text style={styles.detailDate}>
                {new Date(detailEntry.date).toLocaleDateString('de-DE', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>
              {detailEntry.title ? (
                <Text style={styles.detailTitle}>{detailEntry.title}</Text>
              ) : null}
              <Text style={styles.detailContent2}>{detailEntry.content}</Text>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: { color: COLORS.text, fontSize: 26, fontWeight: '700' },
  fab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 8,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 16,
  },
  emptyEmoji: { fontSize: 48 },
  emptyText: {
    color: COLORS.muted,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  emptyBtn: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    minHeight: 48,
  },
  emptyBtnText: { color: COLORS.accent, fontSize: 15, fontWeight: '600' },
  dateGroup: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalSafe: { flex: 1, backgroundColor: COLORS.bg },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface,
  },
  modalTitle: { color: COLORS.text, fontSize: 20, fontWeight: '700' },
  closeBtn: {
    padding: 8,
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
  },
  fieldLabel: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
    marginTop: 4,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: COLORS.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.surface2,
  },
  textArea: {
    minHeight: 160,
    paddingTop: 14,
  },
  saveBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  detailContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
  },
  detailDate: { color: COLORS.muted, fontSize: 13 },
  detailTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '700',
  },
  detailContent2: {
    color: COLORS.text,
    fontSize: 16,
    lineHeight: 26,
  },
});
