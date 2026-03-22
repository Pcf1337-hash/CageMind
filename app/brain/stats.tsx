import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { router } from 'expo-router';
import { ChevronLeft, ChevronDown, ChevronRight } from 'lucide-react-native';
import { COLORS } from '../../lib/constants';
import {
  getDomainProgress,
  getBrainAttempts,
  getBrainStreak,
  getXP,
  getBadges,
  BrainDomain,
  BrainAttempt,
  BrainBadge,
} from '../../lib/database';
import { xpToLevel, DOMAIN_META, BRAIN_BADGES } from '../../lib/brainTraining';

const DOMAINS: BrainDomain[] = ['memory', 'language', 'logic', 'reaction'];

interface DomainStats {
  domain: BrainDomain;
  level: number;
  totalXP: number;
  bestScore: number;
  totalSessions: number;
  avgAccuracy: number | null;
  avgResponseMs: number | null;
  lastPlayed: string | null;
}

async function loadDomainStats(domain: BrainDomain): Promise<DomainStats> {
  const [prog, attempts] = await Promise.all([
    getDomainProgress(domain),
    getBrainAttempts(domain, 100),
  ]);
  const completed = attempts;
  const avgAccuracy = completed.length > 0
    ? Math.round(completed.reduce((s, a) => s + (a.total_count > 0 ? a.correct_count / a.total_count : 0), 0) / completed.length * 100)
    : null;
  const withMs = completed.filter(a => a.avg_response_ms != null);
  const avgResponseMs = withMs.length > 0
    ? Math.round(withMs.reduce((s, a) => s + (a.avg_response_ms ?? 0), 0) / withMs.length)
    : null;
  return {
    domain,
    level: prog.current_level,
    totalXP: prog.total_xp,
    bestScore: prog.best_score,
    totalSessions: attempts.length,
    avgAccuracy,
    avgResponseMs,
    lastPlayed: prog.last_played,
  };
}

export default function BrainStatsScreen() {
  const [totalXP, setTotalXP] = useState(0);
  const [streak, setStreak] = useState(0);
  const [domainStats, setDomainStats] = useState<DomainStats[]>([]);
  const [badges, setBadges] = useState<BrainBadge[]>([]);
  const [expanded, setExpanded] = useState<Set<BrainDomain>>(new Set());

  const loadData = useCallback(async () => {
    const [xp, s, bs, ...stats] = await Promise.all([
      getXP(),
      getBrainStreak(),
      getBadges(),
      ...DOMAINS.map(loadDomainStats),
    ]);
    setTotalXP(xp);
    setStreak(s);
    setBadges(bs);
    setDomainStats(stats);
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const { level, progress, nextLevelXP } = xpToLevel(totalXP);
  const progressPct = nextLevelXP > 0 ? Math.min(100, (progress / nextLevelXP) * 100) : 0;
  const totalSessions = domainStats.reduce((s, d) => s + d.totalSessions, 0);

  const toggle = (d: BrainDomain) => setExpanded(prev => {
    const next = new Set(prev);
    if (next.has(d)) next.delete(d); else next.add(d);
    return next;
  });

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Zurück">
          <ChevronLeft size={24} color={COLORS.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Kognitivstatistiken</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Overall */}
        <View style={styles.overallCard}>
          <View style={styles.overallTop}>
            <View style={styles.levelCircle}>
              <Text style={styles.levelNum}>{level}</Text>
              <Text style={styles.levelLabel}>Level</Text>
            </View>
            <View style={styles.overallStats}>
              <Text style={styles.overallXP}>{totalXP} XP gesamt</Text>
              <View style={styles.xpTrack}>
                <View style={[styles.xpFill, { width: `${progressPct}%` }]} />
              </View>
              <Text style={styles.xpSub}>{progress} / {nextLevelXP} XP bis Level {level + 1}</Text>
            </View>
          </View>
          <View style={styles.overallRow}>
            <View style={styles.overallStat}>
              <Text style={styles.overallStatVal}>{totalSessions}</Text>
              <Text style={styles.overallStatLabel}>Trainings</Text>
            </View>
            <View style={styles.overallDivider} />
            <View style={styles.overallStat}>
              <Text style={styles.overallStatVal}>{streak}</Text>
              <Text style={styles.overallStatLabel}>Tage 🔥</Text>
            </View>
            <View style={styles.overallDivider} />
            <View style={styles.overallStat}>
              <Text style={styles.overallStatVal}>{badges.length}</Text>
              <Text style={styles.overallStatLabel}>Badges</Text>
            </View>
          </View>
        </View>

        {/* Domain Sections */}
        <Text style={styles.sectionTitle}>Kategorien</Text>
        {domainStats.map((ds) => {
          const meta = DOMAIN_META[ds.domain];
          const isOpen = expanded.has(ds.domain);
          const levelPct = ((ds.level - 1) / 9) * 100;
          return (
            <View key={ds.domain} style={[styles.domainCard, { borderLeftColor: meta.color }]}>
              <Pressable
                style={styles.domainHeader}
                onPress={() => toggle(ds.domain)}
                accessibilityRole="button"
                accessibilityLabel={`${meta.label} ${isOpen ? 'einklappen' : 'ausklappen'}`}
              >
                <Text style={styles.domainIcon}>{meta.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.domainName, { color: meta.color }]}>{meta.label}</Text>
                  <View style={styles.domainLevelRow}>
                    <View style={styles.domainLevelTrack}>
                      <View style={[styles.domainLevelFill, { width: `${levelPct}%`, backgroundColor: meta.color }]} />
                    </View>
                    <Text style={[styles.domainLevelLabel, { color: meta.color }]}>Level {ds.level}</Text>
                  </View>
                </View>
                {isOpen ? <ChevronDown size={16} color={COLORS.muted} /> : <ChevronRight size={16} color={COLORS.muted} />}
              </Pressable>

              {isOpen && (
                <View style={styles.domainDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Genauigkeit Ø</Text>
                    <Text style={styles.detailVal}>{ds.avgAccuracy !== null ? `${ds.avgAccuracy}%` : '—'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Reaktion Ø</Text>
                    <Text style={styles.detailVal}>{ds.avgResponseMs !== null ? `${ds.avgResponseMs}ms` : '—'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Bestes Ergebnis</Text>
                    <Text style={styles.detailVal}>{ds.bestScore}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Gesamt-XP</Text>
                    <Text style={styles.detailVal}>{ds.totalXP}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Trainings</Text>
                    <Text style={styles.detailVal}>{ds.totalSessions}</Text>
                  </View>
                  {ds.lastPlayed && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Zuletzt gespielt</Text>
                      <Text style={styles.detailVal}>
                        {new Date(ds.lastPlayed).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        })}

        {/* Badges */}
        <Text style={styles.sectionTitle}>Alle Badges</Text>
        <View style={styles.badgesGrid}>
          {BRAIN_BADGES.map((badge) => {
            const unlocked = badges.find(b => b.id === badge.id);
            return (
              <View key={badge.id} style={[styles.badgeItem, !unlocked && styles.badgeLocked]}>
                <Text style={styles.badgeIcon}>{unlocked ? badge.icon : '🔒'}</Text>
                <Text style={[styles.badgeLabel, !unlocked && { color: COLORS.muted + '88' }]}>{badge.label}</Text>
                {unlocked && (
                  <Text style={styles.badgeDate}>
                    {new Date(unlocked.unlocked_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                  </Text>
                )}
                {!unlocked && (
                  <Text style={styles.badgeDesc} numberOfLines={2}>{badge.description}</Text>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
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
    minWidth: 40,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: COLORS.text, fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center' },
  container: { paddingHorizontal: 20, paddingBottom: 48, gap: 14, paddingTop: 8 },
  overallCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 18,
    gap: 16,
  },
  overallTop: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  levelCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.accent + '22',
    borderWidth: 2,
    borderColor: COLORS.accent + '55',
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelNum: { color: COLORS.accent, fontSize: 26, fontWeight: '900' },
  levelLabel: { color: COLORS.muted, fontSize: 10, fontWeight: '600' },
  overallStats: { flex: 1, gap: 6 },
  overallXP: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  xpTrack: {
    height: 6,
    backgroundColor: COLORS.surface2,
    borderRadius: 3,
    overflow: 'hidden',
  },
  xpFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 3,
  },
  xpSub: { color: COLORS.muted, fontSize: 11 },
  overallRow: { flexDirection: 'row', alignItems: 'center' },
  overallStat: { flex: 1, alignItems: 'center', gap: 2 },
  overallStatVal: { color: COLORS.text, fontSize: 20, fontWeight: '700' },
  overallStatLabel: { color: COLORS.muted, fontSize: 11 },
  overallDivider: { width: 1, height: 32, backgroundColor: COLORS.surface2 },
  sectionTitle: { color: COLORS.text, fontSize: 15, fontWeight: '600', marginBottom: -4 },
  domainCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    overflow: 'hidden',
    borderLeftWidth: 4,
  },
  domainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  domainIcon: { fontSize: 24 },
  domainName: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  domainLevelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  domainLevelTrack: {
    flex: 1,
    height: 4,
    backgroundColor: COLORS.surface2,
    borderRadius: 2,
    overflow: 'hidden',
  },
  domainLevelFill: { height: '100%', borderRadius: 2 },
  domainLevelLabel: { fontSize: 11, fontWeight: '700' },
  domainDetails: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.surface2,
    paddingTop: 12,
  },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailLabel: { color: COLORS.muted, fontSize: 13 },
  detailVal: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  badgeItem: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 12,
    width: '47%',
    gap: 4,
  },
  badgeLocked: { opacity: 0.45 },
  badgeIcon: { fontSize: 28 },
  badgeLabel: { color: COLORS.text, fontSize: 13, fontWeight: '700' },
  badgeDate: { color: COLORS.muted, fontSize: 10 },
  badgeDesc: { color: COLORS.muted, fontSize: 10, lineHeight: 14 },
});
