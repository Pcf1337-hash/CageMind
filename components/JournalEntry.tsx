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

export default function JournalEntry({
  entry,
  onPress,
  onDelete,
}: JournalEntryProps) {
  const preview =
    entry.content.length > 100
      ? entry.content.slice(0, 100) + '...'
      : entry.content;

  const dateStr = new Date(entry.date).toLocaleDateString('de-DE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  return (
    <Pressable
      onPress={onPress}
      style={styles.container}
      accessibilityRole="button"
      accessibilityLabel={`Tagebucheintrag vom ${dateStr}`}
    >
      <View style={styles.header}>
        <View style={styles.meta}>
          {entry.mood_score !== null && (
            <Text style={styles.emoji}>{MOOD_EMOJIS[entry.mood_score]}</Text>
          )}
          <Text style={styles.date}>{dateStr}</Text>
        </View>
        {onDelete && (
          <Pressable
            onPress={onDelete}
            style={styles.deleteBtn}
            accessibilityLabel="Eintrag loschen"
            accessibilityRole="button"
          >
            <Trash2 size={16} color={COLORS.muted} />
          </Pressable>
        )}
      </View>

      {entry.title ? (
        <Text style={styles.title} numberOfLines={1}>
          {entry.title}
        </Text>
      ) : null}

      <Text style={styles.preview} numberOfLines={3}>
        {preview}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emoji: {
    fontSize: 16,
  },
  date: {
    color: COLORS.muted,
    fontSize: 12,
  },
  deleteBtn: {
    padding: 8,
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  preview: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 20,
  },
});
