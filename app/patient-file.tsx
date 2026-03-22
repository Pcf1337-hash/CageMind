import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { ChevronLeft, FileText, Shield } from 'lucide-react-native';
import {
  getSetting,
  getMoodEntries,
  getJournalEntries,
  getExerciseSessions,
  getStreak,
} from '../lib/database';
import { COLORS } from '../lib/constants';

const SECTION_COLORS: Record<string, string> = {
  'Anamnese': '#F87171',
  'Psychisches Bild': '#A78BFA',
  'Auslöser & Stressoren': '#FCD34D',
  'Ressourcen & Coping': '#86EFAC',
  'Soziales & Persönliches': '#60A5FA',
  'Verlaufsnotizen': '#34D399',
};

function getSectionColor(title: string): string {
  return SECTION_COLORS[title] ?? COLORS.accent;
}

interface ProfileSection {
  title: string;
  lines: string[];
}

function parseProfile(notes: string): { summary: string | null; sections: ProfileSection[] } {
  const sections: ProfileSection[] = [];
  let current: ProfileSection | null = null;
  let summary: string | null = null;

  for (const raw of notes.split('\n')) {
    const line = raw.trim();
    if (!line) continue;

    const summaryMatch = line.match(/^(?:PROFIL|PATIENTENPROFIL|ZUSAMMENFASSUNG):\s*(.+)/);
    if (summaryMatch) {
      summary = summaryMatch[1];
      continue;
    }

    if (line.startsWith('## ')) {
      if (current) sections.push(current);
      current = { title: line.slice(3).trim(), lines: [] };
    } else if (line.startsWith('- ')) {
      current?.lines.push(line.slice(2).trim());
    } else if (current) {
      current.lines.push(line);
    }
  }

  if (current) sections.push(current);
  return { summary, sections };
}

export default function PatientFileScreen() {
  const [userName, setUserName] = useState('Patient');
  const [profileNotes, setProfileNotes] = useState('');
  const [streak, setStreak] = useState(0);
  const [avgMood, setAvgMood] = useState<number | null>(null);
  const [journalCount, setJournalCount] = useState(0);
  const [exerciseCount, setExerciseCount] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [name, notes, lastUpdate, streakVal, moods, journals, exercises] = await Promise.all([
        getSetting('user_name'),
        getSetting('user_profile_notes'),
        getSetting('profile_last_updated'),
        getStreak(),
        getMoodEntries(30),
        getJournalEntries(),
        getExerciseSessions(),
      ]);

      if (name) setUserName(name);
      setProfileNotes(notes ?? '');
      setLastUpdated(lastUpdate ?? null);
      setStreak(streakVal);

      if (moods.length > 0) {
        const avg = moods.reduce((s, e) => s + e.mood_score, 0) / moods.length;
        setAvgMood(avg);
      }

      setJournalCount(journals.length);
      setExerciseCount(exercises.filter((e) => e.completed).length);
    } catch (e) {
      console.error('PatientFile load error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const { summary, sections } = parseProfile(profileNotes);

  const moodEmoji =
    avgMood === null ? '—'
    : avgMood >= 4.2 ? '😊'
    : avgMood >= 3 ? '😐'
    : '😔';

  const formattedDate = lastUpdated
    ? new Date(lastUpdated).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  const initial = userName.charAt(0).toUpperCase();

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityLabel="Zurück"
          accessibilityRole="button"
        >
          <ChevronLeft size={24} color={COLORS.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Patientenakte</Text>
          <View style={styles.confidentialBadge}>
            <Shield size={10} color={COLORS.accent} />
            <Text style={styles.confidentialText}>Vertraulich · Nur lokal</Text>
          </View>
        </View>
        <FileText size={20} color={COLORS.accent} />
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.accent} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          {/* Patient header card */}
          <View style={styles.patientCard}>
            <View style={styles.patientRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initial}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.patientName}>{userName}</Text>
                <Text style={styles.patientMeta}>
                  {formattedDate
                    ? `Zuletzt aktualisiert: ${formattedDate}`
                    : 'Akte noch nicht erstellt'}
                </Text>
              </View>
            </View>

            {summary ? (
              <View style={styles.summaryBox}>
                <Text style={styles.summaryText}>{summary}</Text>
              </View>
            ) : null}

            {!profileNotes.trim() && (
              <Text style={styles.emptyHint}>
                Noch keine Akte vorhanden. Starte Gespräche mit CageMind — er baut das Profil
                automatisch auf. Unter "Einblicke" kannst du auch manuell eine vollständige
                Analyse starten.
              </Text>
            )}
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statIcon}>{moodEmoji}</Text>
              <Text style={styles.statValue}>
                {avgMood !== null ? avgMood.toFixed(1) : '—'}
              </Text>
              <Text style={styles.statLabel}>Stimmung</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statIcon}>🔥</Text>
              <Text style={styles.statValue}>{streak}</Text>
              <Text style={styles.statLabel}>Streak</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statIcon}>📖</Text>
              <Text style={styles.statValue}>{journalCount}</Text>
              <Text style={styles.statLabel}>Einträge</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statIcon}>🧘</Text>
              <Text style={styles.statValue}>{exerciseCount}</Text>
              <Text style={styles.statLabel}>Übungen</Text>
            </View>
          </View>

          {/* Section cards */}
          {sections.map((section, i) => {
            const color = getSectionColor(section.title);
            return (
              <View key={i} style={[styles.sectionCard, { borderLeftColor: color }]}>
                <Text style={[styles.sectionTitle, { color }]}>{section.title}</Text>
                {section.lines.map((line, j) => (
                  <View key={j} style={styles.bulletRow}>
                    <View style={[styles.bulletDot, { backgroundColor: color }]} />
                    <Text style={styles.bulletText}>{line}</Text>
                  </View>
                ))}
                {section.lines.length === 0 && (
                  <Text style={styles.emptySectionText}>Keine Einträge</Text>
                )}
              </View>
            );
          })}

          {/* Fallback: raw notes when no ## sections were parsed */}
          {sections.length === 0 && profileNotes.trim().length > 0 && (
            <View style={[styles.sectionCard, { borderLeftColor: COLORS.accent }]}>
              <Text style={[styles.sectionTitle, { color: COLORS.accent }]}>Notizen</Text>
              {profileNotes
                .trim()
                .split('\n')
                .filter(Boolean)
                .map((line, i) => (
                  <View key={i} style={styles.bulletRow}>
                    <View style={[styles.bulletDot, { backgroundColor: COLORS.accent }]} />
                    <Text style={styles.bulletText}>{line.replace(/^[-•]\s*/, '')}</Text>
                  </View>
                ))}
            </View>
          )}

          {/* Footer disclaimer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Diese Akte wird automatisch aus deinen Gesprächen mit CageMind erstellt und
              verbleibt ausschließlich auf deinem Gerät. Sie ersetzt keine professionelle
              psychologische oder psychiatrische Dokumentation.
            </Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  backBtn: {
    padding: 8,
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1 },
  headerTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '700',
  },
  confidentialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  confidentialText: {
    color: COLORS.accent,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  container: {
    paddingHorizontal: 20,
    paddingBottom: 48,
    gap: 14,
  },
  patientCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  patientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: COLORS.accent + '22',
    borderWidth: 2,
    borderColor: COLORS.accent + '55',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: COLORS.accent,
    fontSize: 24,
    fontWeight: '700',
  },
  patientName: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '700',
  },
  patientMeta: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 3,
  },
  summaryBox: {
    backgroundColor: COLORS.surface2,
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
  },
  summaryText: {
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  emptyHint: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    paddingVertical: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 4,
  },
  statIcon: { fontSize: 18 },
  statValue: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '500',
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
    flexShrink: 0,
  },
  bulletText: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 22,
  },
  emptySectionText: {
    color: COLORS.muted,
    fontSize: 13,
    fontStyle: 'italic',
  },
  footer: {
    paddingHorizontal: 4,
    paddingTop: 8,
  },
  footerText: {
    color: COLORS.muted,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
  },
});
