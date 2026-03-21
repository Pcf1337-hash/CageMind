import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { CheckCircle, Circle } from 'lucide-react-native';
import { COLORS, CRISIS_PHONE } from '../../lib/constants';

export default function DisclaimerScreen() {
  const [accepted, setAccepted] = useState(false);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Ein kurzer Hinweis</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ich bin kein Arzt und kein Therapeut.</Text>
          <Text style={styles.cardBody}>
            CageMind ersetzt keine professionelle medizinische oder
            psychologische Behandlung. Wenn du dich in einer Krise befindest
            oder dir ernsthafte Sorgen um deine Gesundheit machst, wende dich
            bitte an Fachleute.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Im Notfall:</Text>
          <Text style={styles.cardBody}>
            Telefonseelsorge:{' '}
            <Text style={styles.highlight}>{CRISIS_PHONE}</Text>
            {'\n'}Kostenlos · 24/7 · Anonym
          </Text>
          <Text style={styles.cardBody}>
            Bei akuter Gefahr: Notruf{' '}
            <Text style={styles.highlight}>112</Text>
          </Text>
        </View>

        <Pressable
          onPress={() => setAccepted(!accepted)}
          style={styles.checkRow}
          accessibilityLabel="Ich verstehe, dass CageMind kein Therapeut ist"
          accessibilityRole="checkbox"
          accessibilityState={{ checked: accepted }}
        >
          {accepted ? (
            <CheckCircle size={24} color={COLORS.accent} />
          ) : (
            <Circle size={24} color={COLORS.muted} />
          )}
          <Text style={styles.checkLabel}>
            Ich verstehe, dass CageMind kein Ersatz für professionelle Hilfe ist.
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.push('/onboarding/setup')}
          disabled={!accepted}
          style={[styles.btn, !accepted && styles.btnDisabled]}
          accessibilityLabel="Weiter zur Einrichtung"
          accessibilityRole="button"
          accessibilityState={{ disabled: !accepted }}
        >
          <Text style={styles.btnText}>Verstanden — weiter</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  container: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 48,
    gap: 20,
  },
  title: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    gap: 10,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  cardBody: {
    color: COLORS.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  highlight: {
    color: COLORS.accent,
    fontWeight: '600',
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
  },
  checkLabel: {
    flex: 1,
    color: COLORS.text,
    fontSize: 15,
    lineHeight: 22,
  },
  btn: {
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  btnDisabled: {
    opacity: 0.4,
  },
  btnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
