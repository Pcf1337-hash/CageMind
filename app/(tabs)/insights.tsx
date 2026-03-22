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
import { useFocusEffect, router } from 'expo-router';
import { RefreshCw, ChevronDown, ChevronRight, FileText } from 'lucide-react-native';
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

const SECTION_COLORS: Record<string, string> = {
  'Anamnese': '#F87171',
  'Psychisches Bild': '#A78BFA',
  'Auslöser & Stressoren': '#FCD34D',
  'Ressourcen & Coping': '#86EFAC',
  'Soziales & Persönliches': '#60A5FA',
  'Verlaufsnotizen': '#34D399',
};

interface ProfileSection {
  title: string;
  lines: string[];
}

function parseProfileFull(notes: string): { summary: string | null; sections: ProfileSection[] } {
  const sections: ProfileSection[] = [];
  let current: ProfileSection | null = null;
  let summary: string | null = null;

  for (const raw of notes.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const summaryMatch = line.match(/^(?:PROFIL|PATIENTENPROFIL|ZUSAMMENFASSUNG):\s*(.+)/);
    if (summaryMatch) { summary = summaryMatch[1]; continue; }
    if (line.startsWith('## ')) {
      if (current) sections.push(current);
      current = { title: line.slice(3).trim(), lines: [] };
    } else if (line.startsWith('- ') && current) {
      current.lines.push(line.slice(2).trim());
    } else if (current && line) {
      current.lines.push(line);
    }
  }
  if (current) sections.push(current);

  if (sections.length === 0 && !summary && notes.trim()) {
    const bullets = notes.trim().split('\n').filter(Boolean).map(l => l.replace(/^[-•]\s*/, ''));
    if (bullets.length > 0) sections.push({ title: 'Notizen', lines: bullets });
  }
  return { summary, sections };
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
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [lastProfileUpdate, setLastProfileUpdate] = useState<string | null>(null);

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

      const lastUpdate = await getSetting('profile_last_updated');
      setLastProfileUpdate(lastUpdate ?? null);

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
        await setSetting('profile_last_updated', new Date().toISOString());
        setProfileNotes(updated);
        Alert.alert('Akte aktualisiert', 'CageMind hat deine Patientenakte auf Basis aller Daten neu erstellt.');
      } else {
        Alert.alert('Kein Update', 'Das Profil ist bereits aktuell oder es gibt noch zu wenig Daten.');
      }
    } catch {
      Alert.alert('Fehler', 'Profil konnte nicht aufgebaut werden. Bitte prüfe deinen API-Schlüssel.');
    } finally {
      setBuildingProfile(false);
    }
  }, [userName]);

  const { summary, sections } = parseProfileFull(profileNotes);
  const hasProfile = profileNotes.trim().length > 0;

  const toggleSection = (title: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  const formattedProfileDate = lastProfileUpdate
    ? new Date(lastProfileUpdate).toLocaleDateString('de-DE', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      })
    : null;

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

        {/* Patientenakte (kompakt) */}
        <View style={styles.section}>
          <View style={styles.profileHeader}>
            <View style={styles.profileHeaderLeft}>
              <FileText size={15} color={COLORS.accent} />
              <Text style={styles.sectionTitle}>Patientenakte</Text>
            </View>
            <View style={styles.profileHeaderRight}>
              <Pressable
                onPress={handleBuildProfile}
                disabled={buildingProfile}
                style={styles.refreshBtn}
                accessibilityLabel="Akte aktualisieren"
                accessibilityRole="button"
              >
                {buildingProfile ? (
                  <ActivityIndicator size="small" color={COLORS.accent} />
                ) : (
                  <RefreshCw size={14} color={COLORS.accent} />
                )}
              </Pressable>
            </View>
          </View>

          {!hasProfile ? (
            <View style={styles.profileEmpty}>
              <Text style={styles.profileEmptyEmoji}>🗂️</Text>
              <Text style={styles.profileEmptyText}>
                CageMind analysiert deine Gespräche, Stimmungen und Tagebucheinträge und erstellt daraus eine persönliche Akte.
              </Text>
              <Pressable
                onPress={handleBuildProfile}
                disabled={buildingProfile}
                style={styles.buildBtn}
                accessibilityLabel="Akte jetzt erstellen"
                accessibilityRole="button"
              >
                {buildingProfile ? (
                  <ActivityIndicator size="small" color={COLORS.bg} />
                ) : (
                  <Text style={styles.buildBtnText}>Akte erstellen</Text>
                )}
              </Pressable>
            </View>
          ) : (
            <View style={styles.profileCard}>
              {summary && (
                <View style={styles.summaryBox}>
                  <Text style={styles.summaryText} numberOfLines={3}>{summary}</Text>
                </View>
              )}

              {sections.map((section) => {
                const color = SECTION_COLORS[section.title] ?? COLORS.accent;
                const expanded = expandedSections.has(section.title);
                return (
                  <View key={section.title}>
                    <Pressable
                      onPress={() => toggleSection(section.title)}
                      style={styles.accordionRow}
                      accessibilityRole="button"
                      accessibilityLabel={`${section.title} ${expanded ? 'einklappen' : 'ausklappen'}`}
                    >
                      <View style={[styles.sectionDot, { backgroundColor: color }]} />
                      <Text style={[styles.accordionTitle, { color }]}>{section.title}</Text>
                      <Text style={styles.accordionCount}>{section.lines.length}</Text>
                      {expanded
                        ? <ChevronDown size={14} color={COLORS.muted} />
                        : <ChevronRight size={14} color={COLORS.muted} />
                      }
                    </Pressable>
                    {expanded && section.lines.map((line, j) => (
                      <View key={j} style={styles.accordionBullet}>
                        <View style={[styles.bulletDotSmall, { backgroundColor: color + '88' }]} />
                        <Text style={styles.bulletTextSmall}>{line}</Text>
                      </View>
                    ))}
                  </View>
                );
              })}

              <Pressable
                onPress={() => router.push('/patient-file')}
                style={styles.fullFileBtn}
                accessibilityRole="button"
                accessibilityLabel="Vollständige Akte öffnen"
              >
                <Text style={styles.fullFileBtnText}>Vollständige Akte öffnen</Text>
                <ChevronRight size={13} color={COLORS.accent} />
              </Pressable>

              {formattedProfileDate && (
                <Text style={styles.profileDateHint}>Aktualisiert: {formattedProfileDate}</Text>
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
  profileHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  profileHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
  profileEmptyEmoji: { fontSize: 36 },
  profileEmptyText: {
    color: COLORS.muted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
  },
  buildBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    paddingHorizontal: 28,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  buildBtnText: { color: COLORS.bg, fontSize: 14, fontWeight: '700' },
  profileCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    overflow: 'hidden',
  },
  summaryBox: {
    backgroundColor: COLORS.accent + '18',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
    padding: 12,
    margin: 12,
    marginBottom: 4,
    borderRadius: 8,
  },
  summaryText: {
    color: COLORS.text,
    fontSize: 13,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  accordionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.surface2,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  accordionTitle: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  accordionCount: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '600',
    marginRight: 4,
  },
  accordionBullet: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingLeft: 30,
    paddingRight: 14,
    paddingVertical: 3,
    gap: 8,
  },
  bulletDotSmall: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 7,
    flexShrink: 0,
  },
  bulletTextSmall: {
    flex: 1,
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  fullFileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: COLORS.surface2,
    marginTop: 4,
  },
  fullFileBtnText: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  profileDateHint: {
    color: COLORS.muted,
    fontSize: 10,
    textAlign: 'center',
    paddingBottom: 10,
    marginTop: -4,
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
