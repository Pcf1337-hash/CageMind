import React from 'react';
import { View, Text, Pressable, StyleSheet, Linking } from 'react-native';
import { Phone } from 'lucide-react-native';
import { COLORS, CRISIS_PHONE } from '../lib/constants';

export default function CrisisBanner() {
  const handleCall = () => {
    Linking.openURL(`tel:${CRISIS_PHONE.replace(/\s/g, '')}`).catch(() => {
      // Fallback: ignore error
    });
  };

  return (
    <View style={styles.banner}>
      <View style={styles.textBlock}>
        <Text style={styles.title}>Telefonseelsorge</Text>
        <Text style={styles.subtitle}>
          Kostenlos · 24/7 · Anonym
        </Text>
      </View>
      <Pressable
        onPress={handleCall}
        style={styles.callBtn}
        accessibilityLabel={`Telefonseelsorge anrufen: ${CRISIS_PHONE}`}
        accessibilityRole="button"
      >
        <Phone size={16} color={COLORS.danger} />
        <Text style={styles.phone}>{CRISIS_PHONE}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.danger,
  },
  textBlock: {
    gap: 2,
  },
  title: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 11,
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minHeight: 48,
    backgroundColor: COLORS.surface2,
    borderRadius: 8,
  },
  phone: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: '600',
  },
});
