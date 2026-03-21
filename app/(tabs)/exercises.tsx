import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Wind, Sparkles, ChevronRight, Square, Anchor, Waves } from 'lucide-react-native';
import { COLORS } from '../../lib/constants';

const EXERCISES = [
  {
    id: 'breathing',
    title: '4-7-8 Atemübung',
    description:
      'Eine kraftvolle Atemtechnik die deinen Körper innerhalb von Minuten beruhigt.',
    duration: '5 Min',
    icon: Wind,
    color: COLORS.accent,
    route: '/exercises/breathing',
  },
  {
    id: 'box_breathing',
    title: 'Quadrat-Atmung',
    description:
      'Gleichmäßiges 4-4-4-4 Atemmuster — einfach, wirksam, überall anwendbar.',
    duration: '3 Min',
    icon: Square,
    color: COLORS.accent2,
    route: '/exercises/box-breathing',
  },
  {
    id: 'grounding',
    title: '5-4-3-2-1 Grounding',
    description:
      'Holt dich mit deinen 5 Sinnen zurück ins Hier und Jetzt — ideal bei Panik.',
    duration: '5 Min',
    icon: Anchor,
    color: COLORS.warm,
    route: '/exercises/grounding',
  },
  {
    id: 'muscle_relaxation',
    title: 'Progressive Entspannung',
    description:
      'Muskelgruppen gezielt an- und entspannen — löst körperliche Anspannung.',
    duration: '10 Min',
    icon: Waves,
    color: '#60A5FA',
    route: '/exercises/muscle-relaxation',
  },
  {
    id: 'affirmations',
    title: 'Affirmationen',
    description:
      'Kräftige Sätze die dir helfen, einen klareren Blick auf dich selbst zu bekommen.',
    duration: 'Beliebig',
    icon: Sparkles,
    color: '#F472B6',
    route: '/exercises/affirmations',
  },
] as const;

const TIPS = [
  'Schon 5 Minuten täglich können einen großen Unterschied machen. Fang klein an — das reicht.',
  'Bei akuter Panik: Grounding zuerst. Bei Schlafproblemen: 4-7-8 Atemübung.',
  'Progressive Entspannung wirkt besonders gut abends vor dem Schlafengehen.',
  'Quadrat-Atmung kannst du unauffällig überall machen — im Bus, vor einem Meeting.',
];

function getDailyTip(): string {
  const day = Math.floor(Date.now() / 86400000);
  return TIPS[day % TIPS.length];
}

export default function ExercisesScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Übungen</Text>
        <Text style={styles.subtitle}>
          Kleine Momente für dich — große Wirkung.
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
                <Icon size={30} color={ex.color} />
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
          <Text style={styles.tipTitle}>💡 Tipp des Tages</Text>
          <Text style={styles.tipText}>{getDailyTip()}</Text>
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
    gap: 12,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: { flex: 1, gap: 3 },
  cardTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  cardDesc: { color: COLORS.muted, fontSize: 12, lineHeight: 17 },
  cardDuration: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  tip: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
    gap: 6,
    marginTop: 4,
  },
  tipTitle: { color: COLORS.accent, fontSize: 13, fontWeight: '700' },
  tipText: { color: COLORS.muted, fontSize: 13, lineHeight: 20 },
});
