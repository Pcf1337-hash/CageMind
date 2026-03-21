import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Heart } from 'lucide-react-native';
import { COLORS } from '../lib/constants';

interface AffirmationCardProps {
  text: string;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  index?: number;
  total?: number;
}

export default function AffirmationCard({
  text,
  isFavorite = false,
  onToggleFavorite,
  index,
  total,
}: AffirmationCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.text}>{text}</Text>

      <View style={styles.footer}>
        {index !== undefined && total !== undefined && (
          <Text style={styles.counter}>
            {index + 1} / {total}
          </Text>
        )}
        {onToggleFavorite && (
          <Pressable
            onPress={onToggleFavorite}
            style={styles.favoriteBtn}
            accessibilityLabel={isFavorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufugen'}
            accessibilityRole="button"
          >
            <Heart
              size={22}
              color={isFavorite ? COLORS.danger : COLORS.muted}
              fill={isFavorite ? COLORS.danger : 'transparent'}
            />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface2,
    borderRadius: 20,
    padding: 32,
    minHeight: 200,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  text: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '500',
    lineHeight: 32,
    textAlign: 'center',
    flex: 1,
    textAlignVertical: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  counter: {
    color: COLORS.muted,
    fontSize: 13,
  },
  favoriteBtn: {
    padding: 8,
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
