import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { Wind, Sparkles, ChevronRight } from 'lucide-react-native';
import { COLORS } from '../../lib/constants';

const EXERCISES = [
  {
    id: 'breathing',
    title: '4-7-8 Atemubung',
    description:
      'Eine kraftvolle Atemtechnik die deinen Korper innerhalb von Minuten beruhigt.',
    duration: '5 Min',
    icon: Wind,
    color: COLORS.accent,
    route: '/exercises/breathing',
  },
  {
    id: 'affirmations',
    title: 'Affirmationen',
    description:
      'Kraftige Satze die dir helfen, einen klareren Blick auf dich selbst zu bekommen.',
    duration: 'Beliebig',
    icon: Sparkles,
    color: COLORS.warm,
    route: '/exercises/affirmations',
  },
] as const;

export default function ExercisesScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Ubungen</Text>
        <Text style={styles.subtitle}>
          Kleine Momente fur dich — grobbe Wirkung.
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {EXERCISES.map((ex) => {
          const Icon = ex.icon;
          return (
            <Pressable
              key={ex.id}
              onPress={() => router.push(ex.route as Parameters<typeof router.push>[0])}
              style={styles.card}
              accessibilityLabel={`${ex.title} starten`}
              accessibilityRole="button"
            >
              <View style={[styles.iconBox, { backgroundColor: ex.color + '22' }]}>
                <Icon size={32} color={ex.color} />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>{ex.title}</Text>
                <Text style={styles.cardDesc}>{ex.description}</Text>
                <Text style={[styles.cardDuration, { color: ex.color }]}>
                  {ex.duration}
                </Text>
              </View>
              <ChevronRight size={20} color={COLORS.muted} />
            </Pressable>
          );
        })}

        <View style={styles.tip}>
          <Text style={styles.tipTitle}>Tipp</Text>
          <Text style={styles.tipText}>
            Schon 5 Minuten taglich konnen einen grossen Unterschied machen.
            Fang klein an — das reicht.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 4,
  },
  title: { color: COLORS.text, fontSize: 26, fontWeight: '700' },
  subtitle: { color: COLORS.muted, fontSize: 15 },
  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 16,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconBox: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: { flex: 1, gap: 4 },
  cardTitle: { color: COLORS.text, fontSize: 17, fontWeight: '700' },
  cardDesc: { color: COLORS.muted, fontSize: 13, lineHeight: 18 },
  cardDuration: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  tip: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
    gap: 6,
  },
  tipTitle: { color: COLORS.accent, fontSize: 13, fontWeight: '700' },
  tipText: { color: COLORS.muted, fontSize: 13, lineHeight: 20 },
});
