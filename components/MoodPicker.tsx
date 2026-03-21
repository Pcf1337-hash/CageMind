import React from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { COLORS, MOOD_EMOJIS, MOOD_LABELS } from '../lib/constants';

interface MoodPickerProps {
  selected: number | null;
  onSelect: (score: number) => void;
}

export default function MoodPicker({ selected, onSelect }: MoodPickerProps) {
  return (
    <View style={styles.container}>
      {[1, 2, 3, 4, 5].map((score) => (
        <Pressable
          key={score}
          onPress={() => onSelect(score)}
          style={[styles.option, selected === score && styles.selected]}
          accessibilityLabel={`Stimmung: ${MOOD_LABELS[score]}`}
          accessibilityRole="button"
          accessibilityState={{ selected: selected === score }}
        >
          <Text style={styles.emoji}>{MOOD_EMOJIS[score]}</Text>
          <Text
            style={[
              styles.label,
              selected === score && styles.labelSelected,
            ]}
          >
            {MOOD_LABELS[score]}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  option: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: 'transparent',
    minHeight: 48,
  },
  selected: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.surface2,
  },
  emoji: {
    fontSize: 24,
  },
  label: {
    fontSize: 9,
    color: COLORS.muted,
    marginTop: 4,
    textAlign: 'center',
  },
  labelSelected: {
    color: COLORS.accent,
  },
});
