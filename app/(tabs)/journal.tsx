import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Plus, Search, X, Pencil, BookOpen } from 'lucide-react-native';
import JournalEntryComponent from '../../components/JournalEntry';
import MoodPicker from '../../components/MoodPicker';
import {
  getJournalEntries,
  insertJournalEntry,
  updateJournalEntry,
  deleteJournalEntry,
  type JournalEntry,
} from '../../lib/database';
import { COLORS, MOOD_EMOJIS, getLocalDateString, parseLocalDate } from '../../lib/constants';

type FilterMood = null | 1 | 2 | 3 | 4 | 5;

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function smartDateLabel(dateStr: string): string {
  const today = getLocalDateString();
  const yesterday = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  })();

  if (dateStr === today) return 'Heute';
  if (dateStr === yesterday) return 'Gestern';
  return parseLocalDate(dateStr).toLocaleDateString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function entriesThisWeek(entries: JournalEntry[]): number {
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 6);
  const weekAgoStr = weekAgo.toISOString().slice(0, 10);
  return entries.filter((e) => e.date >= weekAgoStr).length;
}

export default function JournalScreen() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editEntry, setEditEntry] = useState<JournalEntry | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState<number | null>(null);
  const [detailEntry, setDetailEntry] = useState<JournalEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [filterMood, setFilterMood] = useState<FilterMood>(null);

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

  const openNew = () => {
    setEditEntry(null);
    setTitle('');
    setContent('');
    setMood(null);
    setShowForm(true);
  };

  const openEdit = (entry: JournalEntry) => {
    setDetailEntry(null);
    setEditEntry(entry);
    setTitle(entry.title ?? '');
    setContent(entry.content);
    setMood(entry.mood_score);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!content.trim()) {
      Alert.alert('Inhalt fehlt', 'Bitte schreib etwas in deinen Eintrag.');
      return;
    }
    try {
      if (editEntry?.id) {
        await updateJournalEntry({
          ...editEntry,
          title: title.trim(),
          content: content.trim(),
          mood_score: mood,
        });
      } else {
        await insertJournalEntry({
          title: title.trim(),
          content: content.trim(),
          mood_score: mood,
          date: getLocalDateString(),
        });
      }
      setShowForm(false);
      await loadEntries();
    } catch {
      Alert.alert('Fehler', 'Eintrag konnte nicht gespeichert werden.');
    }
  };

  const handleDelete = (entry: JournalEntry) => {
    Alert.alert(
      'Eintrag löschen',
      'Diesen Eintrag wirklich löschen?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: async () => {
            if (entry.id) {
              await deleteJournalEntry(entry.id);
              setDetailEntry(null);
              await loadEntries();
            }
          },
        },
      ]
    );
  };

  const filteredEntries = useMemo(() => {
    let result = entries;
    if (filterMood !== null) {
      result = result.filter((e) => e.mood_score === filterMood);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.content.toLowerCase().includes(q) ||
          (e.title && e.title.toLowerCase().includes(q))
      );
    }
    return result;
  }, [entries, filterMood, searchQuery]);

  // Group by date
  const grouped: Record<string, JournalEntry[]> = {};
  for (const e of filteredEntries) {
    const key = e.date;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(e);
  }

  const totalEntries = entries.length;
  const thisWeek = entriesThisWeek(entries);
  const isEditing = editEntry !== null;
  const editorWords = wordCount(content);
  const editorChars = content.length;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Tagebuch</Text>
          {totalEntries > 0 && (
            <Text style={styles.subtitle}>
              {totalEntries} Einträge · {thisWeek} diese Woche
            </Text>
          )}
        </View>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => {
              setShowSearch(!showSearch);
              if (showSearch) setSearchQuery('');
            }}
            style={styles.iconBtn}
            accessibilityLabel="Suche öffnen"
            accessibilityRole="button"
          >
            <Search size={20} color={showSearch ? COLORS.accent : COLORS.muted} />
          </Pressable>
          <Pressable
            onPress={openNew}
            style={styles.fab}
            accessibilityLabel="Neuen Eintrag erstellen"
            accessibilityRole="button"
          >
            <Plus size={22} color="#fff" />
          </Pressable>
        </View>
      </View>

      {/* Search bar */}
      {showSearch && (
        <View style={styles.searchRow}>
          <Search size={16} color={COLORS.muted} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="In Einträgen suchen..."
            placeholderTextColor={COLORS.muted}
            style={styles.searchInput}
            autoFocus
            returnKeyType="search"
            accessibilityLabel="Suchfeld"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} style={styles.searchClear}>
              <X size={14} color={COLORS.muted} />
            </Pressable>
          )}
        </View>
      )}

      {/* Mood filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        <Pressable
          onPress={() => setFilterMood(null)}
          style={[styles.chip, filterMood === null && styles.chipActive]}
          accessibilityLabel="Alle Einträge"
          accessibilityRole="button"
        >
          <Text style={[styles.chipText, filterMood === null && styles.chipTextActive]}>
            Alle
          </Text>
        </Pressable>
        {([1, 2, 3, 4, 5] as const).map((m) => (
          <Pressable
            key={m}
            onPress={() => setFilterMood(filterMood === m ? null : m)}
            style={[styles.chip, filterMood === m && styles.chipActive]}
            accessibilityLabel={`Filter Stimmung ${m}`}
            accessibilityRole="button"
          >
            <Text style={styles.chipEmoji}>{MOOD_EMOJIS[m]}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {filteredEntries.length === 0 ? (
          <View style={styles.empty}>
            <BookOpen size={48} color={COLORS.surface2} />
            <Text style={styles.emptyText}>
              {searchQuery || filterMood !== null
                ? 'Keine Einträge gefunden.'
                : 'Noch kein Eintrag — fang einfach an.'}
            </Text>
            {!searchQuery && filterMood === null && (
              <Pressable
                onPress={openNew}
                style={styles.emptyBtn}
                accessibilityLabel="Ersten Eintrag erstellen"
                accessibilityRole="button"
              >
                <Text style={styles.emptyBtnText}>Ersten Eintrag schreiben</Text>
              </Pressable>
            )}
          </View>
        ) : (
          Object.keys(grouped)
            .sort((a, b) => b.localeCompare(a))
            .map((date) => (
              <View key={date}>
                <Text style={styles.dateGroup}>{smartDateLabel(date)}</Text>
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

      {/* New / Edit Entry Modal */}
      <Modal visible={showForm} animationType="slide" statusBarTranslucent onRequestClose={() => setShowForm(false)}>
        <SafeAreaView style={styles.modalSafe}>
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isEditing ? 'Eintrag bearbeiten' : 'Neuer Eintrag'}
              </Text>
              <Pressable
                onPress={() => setShowForm(false)}
                style={styles.closeBtn}
                accessibilityLabel="Formular schließen"
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

              <View style={styles.contentLabelRow}>
                <Text style={styles.fieldLabel}>Was bewegt dich heute?</Text>
                {content.length > 0 && (
                  <Text style={styles.counterText}>
                    {editorWords} W · {editorChars} Z
                  </Text>
                )}
              </View>
              <TextInput
                value={content}
                onChangeText={setContent}
                placeholder="Schreib einfach drauflos..."
                placeholderTextColor={COLORS.muted}
                style={[styles.input, styles.textArea]}
                multiline
                numberOfLines={8}
                textAlignVertical="top"
                autoFocus={!isEditing}
                accessibilityLabel="Inhalt des Eintrags"
              />

              <Pressable
                onPress={handleSave}
                disabled={!content.trim()}
                style={[styles.saveBtn, !content.trim() && styles.saveBtnDisabled]}
                accessibilityLabel="Eintrag speichern"
                accessibilityRole="button"
              >
                <Text style={styles.saveBtnText}>
                  {isEditing ? 'Aktualisieren' : 'Speichern'}
                </Text>
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
        onRequestClose={() => setDetailEntry(null)}
      >
        {detailEntry && (
          <SafeAreaView style={styles.modalSafe}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Eintrag</Text>
              <View style={styles.detailHeaderActions}>
                <Pressable
                  onPress={() => openEdit(detailEntry)}
                  style={styles.editBtn}
                  accessibilityLabel="Eintrag bearbeiten"
                  accessibilityRole="button"
                >
                  <Pencil size={18} color={COLORS.accent} />
                </Pressable>
                <Pressable
                  onPress={() => setDetailEntry(null)}
                  style={styles.closeBtn}
                  accessibilityLabel="Eintrag schließen"
                  accessibilityRole="button"
                >
                  <X size={22} color={COLORS.muted} />
                </Pressable>
              </View>
            </View>

            <ScrollView contentContainerStyle={styles.detailContent}>
              {/* Meta row */}
              <View style={styles.detailMeta}>
                <Text style={styles.detailDate}>
                  {parseLocalDate(detailEntry.date).toLocaleDateString('de-DE', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>
                {detailEntry.mood_score !== null && (
                  <View style={styles.detailMoodBadge}>
                    <Text style={styles.detailMoodEmoji}>
                      {MOOD_EMOJIS[detailEntry.mood_score]}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.detailStats}>
                <Text style={styles.detailStatText}>
                  {wordCount(detailEntry.content)} Wörter
                </Text>
                <Text style={styles.detailStatDot}>·</Text>
                <Text style={styles.detailStatText}>
                  {detailEntry.content.length} Zeichen
                </Text>
              </View>

              {detailEntry.title ? (
                <Text style={styles.detailTitle}>{detailEntry.title}</Text>
              ) : null}

              <Text style={styles.detailBody}>{detailEntry.content}</Text>

              <Pressable
                onPress={() => handleDelete(detailEntry)}
                style={styles.detailDeleteBtn}
                accessibilityLabel="Eintrag löschen"
                accessibilityRole="button"
              >
                <Text style={styles.detailDeleteText}>Eintrag löschen</Text>
              </Pressable>
            </ScrollView>
          </SafeAreaView>
        )}
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
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: { color: COLORS.text, fontSize: 26, fontWeight: '700' },
  subtitle: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.surface2,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 15,
    height: 44,
  },
  searchClear: {
    padding: 6,
    minWidth: 30,
    minHeight: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },

  filterRow: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surface2,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: COLORS.accent + '33',
    borderColor: COLORS.accent,
  },
  chipText: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: COLORS.accent,
  },
  chipEmoji: {
    fontSize: 18,
  },

  container: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 16,
  },
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
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // Modal
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
  detailHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editBtn: {
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
  contentLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  counterText: {
    color: COLORS.muted,
    fontSize: 12,
    backgroundColor: COLORS.surface2,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: 'hidden',
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

  // Detail
  detailContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
  },
  detailMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailDate: {
    color: COLORS.muted,
    fontSize: 13,
  },
  detailMoodBadge: {
    backgroundColor: COLORS.surface2,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  detailMoodEmoji: { fontSize: 18 },
  detailStats: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  detailStatText: {
    color: COLORS.muted,
    fontSize: 12,
  },
  detailStatDot: {
    color: COLORS.muted,
    fontSize: 12,
  },
  detailTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 30,
  },
  detailBody: {
    color: COLORS.text,
    fontSize: 16,
    lineHeight: 28,
  },
  detailDeleteBtn: {
    marginTop: 24,
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailDeleteText: {
    color: COLORS.danger,
    fontSize: 14,
  },
});
