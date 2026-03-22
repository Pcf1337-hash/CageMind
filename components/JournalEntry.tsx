import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { COLORS, MOOD_EMOJIS } from '../lib/constants';
import type { JournalEntry as JournalEntryType } from '../lib/database';

interface JournalEntryProps {
  entry: JournalEntryType;
  onPress?: () => void;
  onDelete?: () => void;
}

const MOOD_COLORS: Record<number, string> = {
  1: '#F87171', // rot — traurig
  2: '#FB923C', // orange — niedergeschlagen
  3: '#94A3B8', // grau — neutral
  4: '#34D399', // grün-hell — gut
  5: '#86EFAC', // grün — sehr gut
};

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export default function JournalEntry({
  entry,
  onPress,
  onDelete,
}: JournalEntryProps) {
  const preview =
    entry.content.length > 130
      ? entry.content.slice(0, 130) + '...'
      : entry.content;

  const words = wordCount(entry.content);
  const moodColor =
    entry.mood_score !== null ? MOOD_COLORS[entry.mood_score] : COLORS.accent;

  const timeStr = entry.created_at
    ? new Date(entry.created_at).toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Tagebucheintrag${entry.title ? ': ' + entry.title : ''}`}
    >
      {/* Mood color bar */}
      <View style={[styles.colorBar, { backgroundColor: moodColor }]} />

      <View style={styles.inner}>
        <View style={styles.topRow}>
          <View style={styles.metaLeft}>
            {entry.mood_score !== null && (
              <Text style={styles.emoji}>{MOOD_EMOJIS[entry.mood_score]}</Text>
            )}
            {timeStr && <Text style={styles.time}>{timeStr}</Text>}
          </View>

          <View style={styles.metaRight}>
            <Text style={styles.wordCount}>{words} Wörter</Text>
            {onDelete && (
              <Pressable
                onPress={onDelete}
                style={styles.deleteBtn}
                accessibilityLabel="Eintrag löschen"
                accessibilityRole="button"
              >
                <Trash2 size={15} color={COLORS.muted} />
              </Pressable>
            )}
          </View>
        </View>

        {entry.title ? (
          <Text style={styles.title} numberOfLines={1}>
            {entry.title}
          </Text>
        ) : null}

        <Text style={styles.preview} numberOfLines={3}>
          {preview}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    marginBottom: 10,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.surface2,
  },
  pressed: {
    opacity: 0.85,
  },
  colorBar: {
    width: 4,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  inner: {
    flex: 1,
    padding: 14,
    gap: 6,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  emoji: {
    fontSize: 16,
  },
  time: {
    color: COLORS.muted,
    fontSize: 12,
  },
  wordCount: {
    color: COLORS.muted,
    fontSize: 11,
    backgroundColor: COLORS.surface2,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  deleteBtn: {
    padding: 6,
    minWidth: 32,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
  preview: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 19,
  },
});
