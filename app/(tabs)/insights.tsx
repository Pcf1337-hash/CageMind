import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { RefreshCw } from 'lucide-react-native';
import MoodChart from '../../components/MoodChart';
import StreakCard from '../../components/StreakCard';
import {
  getMoodEntriesByDateRange,
  getMoodEntries,
  getStreak,
  getMostFrequentExercise,
  getJournalEntries,
  getExerciseSessions,
  getChatMessages,
  getSetting,
  setSetting,
} from '../../lib/database';
import { buildFullProfile } from '../../lib/claude';
import { COLORS, MOOD_EMOJIS, getLocalDateString } from '../../lib/constants';

const EXERCISE_LABELS: Record<string, string> = {
  breathing: 'Atemübung',
  box_breathing: 'Quadrat-Atmung',
  grounding: 'Grounding',
  muscle_relaxation: 'Progressive Entspannung',
  affirmations: 'Affirmationen',
};

const EXERCISE_EMOJIS: Record<string, string> = {
  breathing: '🌬️',
  box_breathing: '🟦',
  grounding: '⚓',
  muscle_relaxation: '🌊',
  affirmations: '✨',
};

const DAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

function getLast7Days(): Array<{ dateStr: string; label: string }> {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = getLocalDateString(d);
    const label = DAY_LABELS[d.getDay() === 0 ? 6 : d.getDay() - 1];
    days.push({ dateStr, label });
  }
  return days;
}

function parseProfileSummary(notes: string): { summary: string; bullets: string[] } {
  const lines = notes.trim().split('\n').filter(Boolean);
  let summary = '';
  const bullets: string[] = [];
  for (const line of lines) {
    if (line.startsWith('ZUSAMMENFASSUNG:')) {
      summary = line.replace('ZUSAMMENFASSUNG:', '').trim();
    } else if (line.startsWith('- ')) {
      bullets.push(line.slice(2).trim());
    }
  }
  // Fallback: if no ZUSAMMENFASSUNG line, treat everything as bullets
  if (!summary && bullets.length === 0) {
    return { summary: '', bullets: lines };
  }
  return { summary, bullets };
}

export default function InsightsScreen() {
  const [chartData, setChartData] = useState<
    Array<{ date: string; score: number | null; label: string }>
  >([]);
  const [avgScore, setAvgScore] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);
  const [topExercise, setTopExercise] = useState<string | null>(null);
  const [profileNotes, setProfileNotes] = useState('');
  const [buildingProfile, setBuildingProfile] = useState(false);
  const [userName, setUserName] = useState('');

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
      setAvgScore(
        scores.length > 0
          ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
          : null
      );

      const s = await getStreak();
      setStreak(s);

      const ex = await getMostFrequentExercise();
      setTopExercise(ex);

      const notes = await getSetting('user_profile_notes');
      setProfileNotes(notes ?? '');

      const name = await getSetting('user_name');
      setUserName(name ?? 'du');
    } catch (e) {
      console.error('Insights load error:', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleBuildProfile = useCallback(async () => {
    setBuildingProfile(true);
    try {
      const [allMoods, journals, exercises, chatMsgs, currentNotes] = await Promise.all([
        getMoodEntries(90),
        getJournalEntries(),
        getExerciseSessions(),
        getChatMessages(60),
        getSetting('user_profile_notes'),
      ]);

      const updated = await buildFullProfile({
        userName,
        currentNotes: currentNotes ?? '',
        chatMessages: chatMsgs.map((m) => ({ role: m.role, content: m.content })),
        moodEntries: allMoods,
        journalEntries: journals.map((j) => ({
          title: j.title,
          content: j.content,
          date: j.date,
        })),
        exerciseSessions: exercises.map((e) => ({
          type: e.type,
          completed: e.completed,
          date: e.date,
        })),
      });

      if (updated !== (currentNotes ?? '')) {
        await setSetting('user_profile_notes', updated);
        setProfileNotes(updated);
        Alert.alert('Profil aktualisiert', 'CageMind hat dein Profil auf Basis aller Daten neu aufgebaut.');
      } else {
        Alert.alert('Kein Update', 'Das Profil ist bereits aktuell oder es gibt noch zu wenig Daten.');
      }
    } catch {
      Alert.alert('Fehler', 'Profil konnte nicht aufgebaut werden. Bitte prüfe deinen API-Schlüssel.');
    } finally {
      setBuildingProfile(false);
    }
  }, [userName]);

  const { summary, bullets } = parseProfileSummary(profileNotes);
  const hasProfile = profileNotes.trim().length > 0;

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

        {/* Stats Row */}
        {(avgScore !== null || topExercise !== null) && (
          <View style={styles.statsRow}>
            {avgScore !== null && (
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{MOOD_EMOJIS[Math.round(avgScore)]}</Text>
                <Text style={styles.statLabel}>Durchschnitt</Text>
                <Text style={styles.statNum}>{avgScore}/5</Text>
              </View>
            )}
            {topExercise !== null && (
              <View style={styles.statCard}>
                <Text style={styles.statValue}>
                  {EXERCISE_EMOJIS[topExercise] ?? '🧘'}
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

        {/* Persönliches Profil */}
        <View style={styles.section}>
          <View style={styles.profileHeader}>
            <Text style={styles.sectionTitle}>Dein persönliches Profil</Text>
            <Pressable
              onPress={handleBuildProfile}
              disabled={buildingProfile}
              style={styles.refreshBtn}
              accessibilityLabel="Profil aufbauen"
              accessibilityRole="button"
            >
              {buildingProfile ? (
                <ActivityIndicator size="small" color={COLORS.accent} />
              ) : (
                <RefreshCw size={16} color={COLORS.accent} />
              )}
            </Pressable>
          </View>

          {!hasProfile ? (
            <View style={styles.profileEmpty}>
              <Text style={styles.profileEmptyEmoji}>🧠</Text>
              <Text style={styles.profileEmptyText}>
                Tippe auf das Symbol oben um CageMind dein persönliches Profil erstellen zu lassen — aus Stimmungen, Tagebuch, Übungen und Chat.
              </Text>
              <Pressable
                onPress={handleBuildProfile}
                disabled={buildingProfile}
                style={styles.buildBtn}
                accessibilityLabel="Profil jetzt aufbauen"
                accessibilityRole="button"
              >
                {buildingProfile ? (
                  <ActivityIndicator size="small" color={COLORS.bg} />
                ) : (
                  <Text style={styles.buildBtnText}>Profil aufbauen</Text>
                )}
              </Pressable>
            </View>
          ) : (
            <View style={styles.profileCard}>
              {summary.length > 0 && (
                <View style={styles.summaryBox}>
                  <Text style={styles.summaryText}>{summary}</Text>
                </View>
              )}
              {bullets.length > 0 && (
                <View style={styles.bulletsBox}>
                  {bullets.map((b, i) => {
                    const colonIdx = b.indexOf(':');
                    const cat = colonIdx > 0 ? b.slice(0, colonIdx).trim() : null;
                    const fact = colonIdx > 0 ? b.slice(colonIdx + 1).trim() : b;
                    return (
                      <View key={i} style={styles.bulletRow}>
                        <Text style={styles.bulletCat}>{cat ?? '•'}</Text>
                        <Text style={styles.bulletFact}>{fact}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}
        </View>

        {chartData.every((d) => d.score === null) && !hasProfile && (
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
    paddingBottom: 40,
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
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.accent + '22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileEmpty: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    gap: 14,
  },
  profileEmptyEmoji: { fontSize: 40 },
  profileEmptyText: {
    color: COLORS.muted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
  },
  buildBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    paddingHorizontal: 32,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  buildBtnText: { color: COLORS.bg, fontSize: 15, fontWeight: '700' },
  profileCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    overflow: 'hidden',
  },
  summaryBox: {
    backgroundColor: COLORS.accent + '22',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
    padding: 16,
  },
  summaryText: {
    color: COLORS.text,
    fontSize: 15,
    lineHeight: 23,
    fontStyle: 'italic',
  },
  bulletsBox: {
    padding: 16,
    gap: 10,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: 8,
  },
  bulletCat: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: '700',
    width: 110,
    paddingTop: 2,
    flexShrink: 0,
  },
  bulletFact: {
    flex: 1,
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 20,
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
