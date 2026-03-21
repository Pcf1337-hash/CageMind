import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Flame } from 'lucide-react-native';
import { COLORS } from '../lib/constants';

interface StreakCardProps {
  streak: number;
}

function getMotivationText(streak: number): string {
  if (streak === 0) return 'Fang einfach an';
  if (streak < 3) return 'Gut gemacht! Bleib dabei';
  if (streak < 7) return 'Du bist dabei — weiter so!';
  return `Wow, ${streak} Tage! Du bist amazing`;
}

export default function StreakCard({ streak }: StreakCardProps) {
  const motivation = getMotivationText(streak);

  return (
    <View style={styles.card}>
      <View style={styles.left}>
        <Flame
          size={28}
          color={streak > 0 ? COLORS.warm : COLORS.muted}
          fill={streak > 0 ? COLORS.warm : 'transparent'}
        />
        <View style={styles.textBlock}>
          <Text style={styles.count}>
            {streak} {streak === 1 ? 'Tag' : 'Tage'}
          </Text>
          <Text style={styles.label}>in Folge</Text>
        </View>
      </View>
      <Text style={styles.motivation}>{motivation}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  textBlock: {
    gap: 2,
  },
  count: {
    color: COLORS.warm,
    fontSize: 22,
    fontWeight: '700',
  },
  label: {
    color: COLORS.muted,
    fontSize: 12,
  },
  motivation: {
    color: COLORS.text,
    fontSize: 13,
    maxWidth: 160,
    textAlign: 'right',
    lineHeight: 18,
  },
});
