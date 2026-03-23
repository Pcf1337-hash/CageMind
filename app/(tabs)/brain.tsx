import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { ChevronRight, Trophy, Zap, Target } from 'lucide-react-native';
import { COLORS, getLocalDateString } from '../../lib/constants';
import {
  getDomainProgress,
  getBrainStreak,
  getXP,
  getBadges,
  getDailyMission,
  saveDailyMission,
  getWeeklyBrainStats,
  BrainDomain,
  BrainDomainProgress,
  BrainBadge,
  BrainDailyMission,
} from '../../lib/database';
import {
  xpToLevel,
  DOMAIN_META,
  BRAIN_BADGES,
  generateDailyMission,
} from '../../lib/brainTraining';

const DOMAINS: BrainDomain[] = ['memory', 'language', 'logic', 'reaction'];

interface DomainState {
  domain: BrainDomain;
  progress: BrainDomainProgress;
}

export default function BrainScreen() {
  const [loading, setLoading] = useState(true);
  const [totalXP, setTotalXP] = useState(0);
  const [brainStreak, setBrainStreak] = useState(0);
  const [domainStates, setDomainStates] = useState<DomainState[]>([]);
  const [mission, setMission] = useState<BrainDailyMission | null>(null);
  const [unlockedBadges, setUnlockedBadges] = useState<BrainBadge[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<{
    avgAccuracy: number | null;
    avgResponseMs: number | null;
    totalSessions: number;
  }>({ avgAccuracy: null, avgResponseMs: null, totalSessions: 0 });

  const xpBarWidth = useSharedValue(0);
  const xpBarStyle = useAnimatedStyle(() => ({ width: `${xpBarWidth.value}%` as `${number}%` }));

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const today = getLocalDateString(new Date());
      const [xp, streak, badges, weekly, ...domainProgresses] = await Promise.all([
        getXP(),
        getBrainStreak(),
        getBadges(),
        getWeeklyBrainStats(),
        ...DOMAINS.map(d => getDomainProgress(d)),
      ]);

      setTotalXP(xp);
      setBrainStreak(streak);
      setUnlockedBadges(badges);
      setWeeklyStats(weekly);
      setDomainStates(DOMAINS.map((d, i) => ({ domain: d, progress: domainProgresses[i] })));

      // Load or create daily mission
      let m = await getDailyMission(today);
      if (!m) {
        const generated = generateDailyMission(today);
        await saveDailyMission({
          date: generated.date,
          domain: generated.domain,
          exercise_type: generated.exerciseType,
          target_count: generated.targetCount,
          completed_count: 0,
          reward_xp: generated.rewardXP,
          completed: false,
        });
        m = await getDailyMission(today);
      }
      setMission(m);

      // Animate XP bar
      const { progress, nextLevelXP } = xpToLevel(xp);
      const pct = nextLevelXP > 0 ? Math.min(100, (progress / nextLevelXP) * 100) : 0;
      xpBarWidth.value = withSpring(pct, { damping: 15, stiffness: 80 });
    } catch (e) {
      console.error('Brain load error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const { level, progress, nextLevelXP } = xpToLevel(totalXP);
  const hasAnySession = domainStates.some(d => d.progress.last_played);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Gehirn-Zentrale</Text>
            <Text style={styles.subtitle}>Kognitives Training</Text>
          </View>
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>Level {level}</Text>
            <Text style={styles.levelStar}>✦</Text>
          </View>
        </View>

        {/* XP Bar */}
        <View style={styles.xpBarContainer}>
          <View style={styles.xpBarTrack}>
            <Animated.View style={[styles.xpBarFill, xpBarStyle]} />
          </View>
          <Text style={styles.xpLabel}>{totalXP} XP gesamt · {progress} / {nextLevelXP} XP</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={COLORS.accent} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Daily Mission */}
            {mission && (
              <View style={styles.missionCard}>
                <View style={styles.missionHeader}>
                  <Target size={16} color={COLORS.warm} />
                  <Text style={styles.missionTitle}>Tages-Mission</Text>
                  {mission.completed && (
                    <View style={styles.missionDoneBadge}>
                      <Text style={styles.missionDoneText}>Erledigt ✓</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.missionDesc}>
                  {mission.completed_count} / {mission.target_count} {DOMAIN_META[mission.domain].label}-Runden
                </Text>
                <View style={styles.missionProgressTrack}>
                  <View
                    style={[
                      styles.missionProgressFill,
                      {
                        width: `${Math.min(100, (mission.completed_count / mission.target_count) * 100)}%`,
                        backgroundColor: mission.completed ? COLORS.accent2 : COLORS.warm,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.missionReward}>+{mission.reward_xp} XP Belohnung</Text>
              </View>
            )}

            {/* Empty State */}
            {!hasAnySession && (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyEmoji}>🧠</Text>
                <Text style={styles.emptyTitle}>Starte dein erstes Training</Text>
                <Text style={styles.emptyText}>
                  Wähle eine Kategorie und trainiere täglich. Adaptive Schwierigkeit passt sich an dein Level an.
                </Text>
              </View>
            )}

            {/* Domain Grid 2x2 */}
            <Text style={styles.sectionLabel}>Trainings-Kategorien</Text>
            <View style={styles.domainGrid}>
              {domainStates.map(({ domain, progress: prog }) => {
                const meta = DOMAIN_META[domain];
                return (
                  <Pressable
                    key={domain}
                    style={styles.domainCard}
                    onPress={() => router.push(`/brain/${domain}`)}
                    accessibilityRole="button"
                    accessibilityLabel={`${meta.label} trainieren`}
                  >
                    <View style={[styles.domainIconBg, { backgroundColor: meta.color + '22' }]}>
                      <Text style={styles.domainIcon}>{meta.icon}</Text>
                    </View>
                    <Text style={styles.domainLabel}>{meta.label}</Text>
                    <View style={styles.domainLevelRow}>
                      <Text style={[styles.domainLevelText, { color: meta.color }]}>
                        Level {prog.current_level}
                      </Text>
                    </View>
                    <View style={styles.domainLevelBar}>
                      <View
                        style={[
                          styles.domainLevelFill,
                          {
                            backgroundColor: meta.color,
                            width: `${((prog.current_level - 1) / 9) * 100}%`,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.domainDesc}>{meta.description}</Text>
                    <View style={styles.domainPlayRow}>
                      <Text style={[styles.domainPlay, { color: meta.color }]}>Spielen</Text>
                      <ChevronRight size={12} color={meta.color} />
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {/* Weekly Stats */}
            <Pressable
              style={styles.statsCard}
              onPress={() => router.push('/brain/stats')}
              accessibilityRole="button"
              accessibilityLabel="Vollständige Statistiken öffnen"
            >
              <View style={styles.statsHeader}>
                <Text style={styles.statsTitle}>Diese Woche</Text>
                <View style={styles.statsLink}>
                  <Text style={styles.statsLinkText}>Vollständige Stats</Text>
                  <ChevronRight size={12} color={COLORS.accent} />
                </View>
              </View>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statVal}>
                    {weeklyStats.avgAccuracy !== null ? `${weeklyStats.avgAccuracy}%` : '—'}
                  </Text>
                  <Text style={styles.statLbl}>Genauigkeit</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statVal}>
                    {weeklyStats.avgResponseMs !== null ? `${weeklyStats.avgResponseMs}ms` : '—'}
                  </Text>
                  <Text style={styles.statLbl}>Ø Reaktion</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statVal}>{brainStreak}</Text>
                  <Text style={styles.statLbl}>Tage 🔥</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statVal}>{weeklyStats.totalSessions}</Text>
                  <Text style={styles.statLbl}>Trainings</Text>
                </View>
              </View>
            </Pressable>

            {/* Badges */}
            <View style={styles.badgesSection}>
              <View style={styles.badgesHeader}>
                <Trophy size={14} color={COLORS.warm} />
                <Text style={styles.badgesTitle}>Badges</Text>
                <Text style={styles.badgesCount}>
                  {unlockedBadges.length} / {BRAIN_BADGES.length}
                </Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.badgesScroll}
              >
                {BRAIN_BADGES.slice(0, 8).map((badge) => {
                  const unlocked = unlockedBadges.find(b => b.id === badge.id);
                  return (
                    <View
                      key={badge.id}
                      style={[styles.badgeChip, !unlocked && styles.badgeLocked]}
                    >
                      <Text style={[styles.badgeIcon, !unlocked && styles.badgeIconLocked]}>
                        {unlocked ? badge.icon : '🔒'}
                      </Text>
                      <Text style={[styles.badgeLabel, !unlocked && styles.badgeLabelLocked]}>
                        {badge.label}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40, gap: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  title: { color: COLORS.text, fontSize: 26, fontWeight: '700' },
  subtitle: { color: COLORS.muted, fontSize: 14, marginTop: 2 },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent + '22',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
  },
  levelText: { color: COLORS.accent, fontSize: 14, fontWeight: '700' },
  levelStar: { color: COLORS.warm, fontSize: 12 },
  xpBarContainer: { gap: 6 },
  xpBarTrack: {
    height: 8,
    backgroundColor: COLORS.surface2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 4,
  },
  xpLabel: { color: COLORS.muted, fontSize: 11, textAlign: 'right' },
  missionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    gap: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.warm,
  },
  missionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  missionTitle: { color: COLORS.text, fontSize: 14, fontWeight: '700', flex: 1 },
  missionDoneBadge: {
    backgroundColor: COLORS.accent2 + '33',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  missionDoneText: { color: COLORS.accent2, fontSize: 11, fontWeight: '700' },
  missionDesc: { color: COLORS.muted, fontSize: 13 },
  missionProgressTrack: {
    height: 6,
    backgroundColor: COLORS.surface2,
    borderRadius: 3,
    overflow: 'hidden',
  },
  missionProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  missionReward: { color: COLORS.warm, fontSize: 12, fontWeight: '600' },
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  emptyText: { color: COLORS.muted, fontSize: 13, textAlign: 'center', lineHeight: 20 },
  sectionLabel: { color: COLORS.text, fontSize: 15, fontWeight: '600', marginBottom: -4 },
  domainGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  domainCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    gap: 6,
    width: '47.5%',
  },
  domainIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  domainIcon: { fontSize: 22 },
  domainLabel: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  domainLevelRow: { flexDirection: 'row', alignItems: 'center' },
  domainLevelText: { fontSize: 12, fontWeight: '600' },
  domainLevelBar: {
    height: 3,
    backgroundColor: COLORS.surface2,
    borderRadius: 2,
    overflow: 'hidden',
  },
  domainLevelFill: { height: '100%', borderRadius: 2 },
  domainDesc: { color: COLORS.muted, fontSize: 10, lineHeight: 14 },
  domainPlayRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 },
  domainPlay: { fontSize: 12, fontWeight: '700' },
  statsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statsTitle: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  statsLink: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  statsLinkText: { color: COLORS.accent, fontSize: 12 },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statVal: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  statLbl: { color: COLORS.muted, fontSize: 10 },
  statDivider: { width: 1, height: 32, backgroundColor: COLORS.surface2 },
  badgesSection: { gap: 10 },
  badgesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgesTitle: { color: COLORS.text, fontSize: 14, fontWeight: '700', flex: 1 },
  badgesCount: { color: COLORS.muted, fontSize: 12 },
  badgesScroll: { gap: 8, paddingRight: 4 },
  badgeChip: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    gap: 4,
    minWidth: 72,
  },
  badgeLocked: { opacity: 0.4 },
  badgeIcon: { fontSize: 24 },
  badgeIconLocked: { opacity: 0.5 },
  badgeLabel: { color: COLORS.text, fontSize: 10, fontWeight: '600', textAlign: 'center' },
  badgeLabelLocked: { color: COLORS.muted },
});
