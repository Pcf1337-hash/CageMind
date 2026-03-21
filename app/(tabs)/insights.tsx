import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import MoodChart from '../../components/MoodChart';
import StreakCard from '../../components/StreakCard';
import {
  getMoodEntriesByDateRange,
  getStreak,
  getMostFrequentExercise,
} from '../../lib/database';
import { COLORS, MOOD_EMOJIS } from '../../lib/constants';

const EXERCISE_LABELS: Record<string, string> = {
  breathing: 'Atemubung',
  affirmations: 'Affirmationen',
};

const DAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

function getLast7Days(): Array<{ dateStr: string; label: string }> {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const label = DAY_LABELS[d.getDay() === 0 ? 6 : d.getDay() - 1];
    days.push({ dateStr, label });
  }
  return days;
}

export default function InsightsScreen() {
  const [chartData, setChartData] = useState<
    Array<{ date: string; score: number | null; label: string }>
  >([]);
  const [avgScore, setAvgScore] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);
  const [topExercise, setTopExercise] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const days = getLast7Days();
      const from = days[0].dateStr;
      const to = days[days.length - 1].dateStr;

      const entries = await getMoodEntriesByDateRange(from, to);
      const entryByDate: Record<string, number> = {};
      for (const e of entries) {
        entryByDate[e.date] = e.mood_score;
      }

      const data = days.map((d) => ({
        date: d.dateStr,
        score: entryByDate[d.dateStr] ?? null,
        label: d.label,
      }));
      setChartData(data);

      const scores = data.map((d) => d.score).filter((s): s is number => s !== null);
      if (scores.length > 0) {
        setAvgScore(Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10);
      } else {
        setAvgScore(null);
      }

      const s = await getStreak();
      setStreak(s);

      const ex = await getMostFrequentExercise();
      setTopExercise(ex);
    } catch (e) {
      console.error('Insights load error:', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Einblicke</Text>
        <Text style={styles.subtitle}>Deine letzten 7 Tage</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Mood Chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stimmungsverlauf</Text>
          <MoodChart data={chartData} />
        </View>

        {/* Avg Score */}
        {avgScore !== null && (
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {MOOD_EMOJIS[Math.round(avgScore)]}
              </Text>
              <Text style={styles.statLabel}>Durchschnitt</Text>
              <Text style={styles.statNum}>{avgScore}/5</Text>
            </View>

            {topExercise && (
              <View style={styles.statCard}>
                <Text style={styles.statValue}>
                  {topExercise === 'breathing' ? '🌬️' : '✨'}
                </Text>
                <Text style={styles.statLabel}>Meist genutzt</Text>
                <Text style={styles.statNum}>
                  {EXERCISE_LABELS[topExercise] ?? topExercise}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Streak */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Streak</Text>
          <StreakCard streak={streak} />
        </View>

        {chartData.every((d) => d.score === null) && (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📊</Text>
            <Text style={styles.emptyText}>
              Noch keine Daten. Trag deine Stimmung ein und hier erscheinen deine Einblicke.
            </Text>
          </View>
        )}
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
    gap: 20,
  },
  section: { gap: 12 },
  sectionTitle: { color: COLORS.text, fontSize: 16, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  statValue: { fontSize: 32 },
  statLabel: { color: COLORS.muted, fontSize: 12 },
  statNum: { color: COLORS.text, fontSize: 14, fontWeight: '600', textAlign: 'center' },
  empty: {
    alignItems: 'center',
    paddingTop: 40,
    gap: 12,
  },
  emptyEmoji: { fontSize: 40 },
  emptyText: {
    color: COLORS.muted,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});
