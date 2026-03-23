import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { ChevronLeft, RefreshCw } from 'lucide-react-native';
import { COLORS } from '../../lib/constants';
import { getLocalDateString } from '../../lib/constants';
import {
  getDomainLevel,
  setDomainProgress,
  insertBrainAttempt,
  incrementMissionProgress,
  getPersonalBest,
} from '../../lib/database';
import {
  calculateNextLevel,
  calculateXP,
  generateStroopRound,
  STROOP_COLORS,
  StroopRound,
  runBadgeChecksAfterSession,
} from '../../lib/brainTraining';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const TARGET_AREA = { top: 140, bottom: SCREEN_H - 180, left: 20, right: SCREEN_W - 20 };
const TARGET_RADIUS = 36;
const TAP_TARGETS = 10;
const STROOP_ROUNDS = 12;

type Mode = 'tap' | 'stroop';
type TargetState = { x: number; y: number; isDecoy: boolean; id: number } | null;

function randomPos(): { x: number; y: number } {
  return {
    x: TARGET_AREA.left + Math.random() * (TARGET_AREA.right - TARGET_AREA.left - TARGET_RADIUS * 2) + TARGET_RADIUS,
    y: TARGET_AREA.top + Math.random() * (TARGET_AREA.bottom - TARGET_AREA.top - TARGET_RADIUS * 2) + TARGET_RADIUS,
  };
}

export default function ReactionScreen() {
  const [mode, setMode] = useState<Mode | null>(null);
  const [level, setLevel] = useState(1);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  // Extras
  const [sessionMaxCombo, setSessionMaxCombo] = useState(0);
  const [sessionIsPerfect, setSessionIsPerfect] = useState(false);
  const [isNewPB, setIsNewPB] = useState(false);
  const [prevPBAccuracy, setPrevPBAccuracy] = useState<number | null>(null);
  const [newBadgesCount, setNewBadgesCount] = useState(0);
  const tapComboRef = useRef(0);
  const tapMaxComboRef = useRef(0);
  const stroopComboRef = useRef(0);
  const stroopMaxComboRef = useRef(0);
  const pbRef = useRef<number | null>(null);

  // Tap target state
  const [target, setTarget] = useState<TargetState>(null);
  const [tapsLeft, setTapsLeft] = useState(TAP_TARGETS);
  const [tapHits, setTapHits] = useState(0);
  const [tapMisses, setTapMisses] = useState(0);
  const [responseTimes, setResponseTimes] = useState<number[]>([]);
  const targetShownAt = useRef<number>(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const targetIdRef = useRef(0);

  // Stroop state
  const [stroopRound, setStroopRound] = useState<StroopRound | null>(null);
  const [stroopLeft, setStroopLeft] = useState(STROOP_ROUNDS);
  const [stroopHits, setStroopHits] = useState(0);
  const [stroopTimer, setStroopTimer] = useState(4);
  const [stroopFeedback, setStroopFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const stroopTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stroopFeedbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stroopHitsRef = useRef(0);
  const stroopResponseTimes = useRef<number[]>([]);
  const stroopRoundStart = useRef(0);

  const scale = useSharedValue(0);
  const targetStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: scale.value,
  }));

  // ─── TAP MODE ─────────────────────────────────────────────────────
  const showNextTarget = useCallback((lvl: number, remaining: number, hits: number, misses: number, times: number[]) => {
    if (remaining <= 0) {
      finishTap(hits, misses, times, lvl);
      return;
    }
    const appearTime = lvl >= 5 ? 700 : lvl >= 3 ? 1200 : 1500;
    const useDecoy = lvl >= 3 && Math.random() < 0.3;
    const pos = randomPos();
    targetIdRef.current += 1;
    const myId = targetIdRef.current;
    setTarget({ ...pos, isDecoy: useDecoy, id: myId });
    targetShownAt.current = Date.now();
    scale.value = withSpring(1, { damping: 10, stiffness: 200 });

    tapTimerRef.current = setTimeout(() => {
      if (targetIdRef.current === myId) {
        // Missed
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        scale.value = withTiming(0, { duration: 200 });
        setTarget(null);
        const newMisses = misses + 1;
        setTapMisses(newMisses);
        setTimeout(() => showNextTarget(lvl, remaining - 1, hits, newMisses, times), 300);
      }
    }, appearTime);
  }, []);

  const handleTargetTap = (isDecoy: boolean) => {
    if (!running || !target) return;
    const rt = Date.now() - targetShownAt.current;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    scale.value = withTiming(0, { duration: 150 });
    setTarget(null);

    if (isDecoy) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      tapComboRef.current = 0;
      const newMisses = tapMisses + 1;
      setTapMisses(newMisses);
      const newLeft = tapsLeft - 1;
      setTapsLeft(newLeft);
      setTimeout(() => showNextTarget(level, newLeft, tapHits, newMisses, responseTimes), 400);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      tapComboRef.current += 1;
      if (tapComboRef.current > tapMaxComboRef.current) tapMaxComboRef.current = tapComboRef.current;
      const newTimes = [...responseTimes, rt];
      setResponseTimes(newTimes);
      const newHits = tapHits + 1;
      setTapHits(newHits);
      const newLeft = tapsLeft - 1;
      setTapsLeft(newLeft);
      setTimeout(() => showNextTarget(level, newLeft, newHits, tapMisses, newTimes), 300);
    }
  };

  const finishTap = async (hits: number, misses: number, times: number[], lvl: number) => {
    setRunning(false);
    setFinished(true);
    const today = getLocalDateString(new Date());
    const mc = tapMaxComboRef.current;
    const perfect = hits === TAP_TARGETS && misses === 0;
    const currentAccuracy = hits / TAP_TARGETS;
    const avgMs = times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 1000;
    const nextLvl = calculateNextLevel(lvl, hits, TAP_TARGETS, avgMs, 'reaction');
    const xp = calculateXP(hits, TAP_TARGETS, lvl, false, mc, perfect);
    setXpEarned(xp);
    setSessionMaxCombo(mc);
    setSessionIsPerfect(perfect);
    const newPB = pbRef.current === null || currentAccuracy > pbRef.current;
    setIsNewPB(newPB);
    const attempt = {
      domain: 'reaction' as const, exercise_type: 'tap_target',
      difficulty_level: lvl, score: hits,
      correct_count: hits, total_count: TAP_TARGETS,
      avg_response_ms: avgMs, xp_earned: xp,
      max_combo: mc, is_perfect: perfect ? 1 : 0, date: today,
    };
    await Promise.all([
      insertBrainAttempt(attempt),
      setDomainProgress('reaction', nextLvl, xp, hits),
      incrementMissionProgress(today),
    ]);
    const nb = await runBadgeChecksAfterSession(attempt);
    setNewBadgesCount(nb.length);
  };

  // ─── STROOP MODE ───────────────────────────────────────────────────
  const loadStroopRound = useCallback((lvl: number, remaining: number) => {
    if (remaining <= 0) return;
    const timeLimit = lvl >= 3 ? 2 : lvl >= 2 ? 3 : 4;
    setStroopTimer(timeLimit);
    setStroopFeedback('idle');
    setStroopRound(generateStroopRound());
    stroopRoundStart.current = Date.now();

    if (stroopTimerRef.current) clearInterval(stroopTimerRef.current);
    stroopTimerRef.current = setInterval(() => {
      setStroopTimer(t => {
        if (t <= 1) {
          if (stroopTimerRef.current) clearInterval(stroopTimerRef.current);
          onStroopTimeUp(lvl, remaining);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }, []);

  const onStroopTimeUp = (lvl: number, remaining: number) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    setStroopFeedback('wrong');
    stroopFeedbackRef.current = setTimeout(() => {
      const newLeft = remaining - 1;
      setStroopLeft(newLeft);
      if (newLeft <= 0) finishStroop(stroopHitsRef.current, lvl);
      else loadStroopRound(lvl, newLeft);
    }, 600);
  };

  const handleStroopAnswer = (colorName: string) => {
    if (stroopFeedback !== 'idle' || !stroopRound) return;
    if (stroopTimerRef.current) clearInterval(stroopTimerRef.current);
    const rt = Date.now() - stroopRoundStart.current;
    const isCorrect = colorName === stroopRound.answer;
    setStroopFeedback(isCorrect ? 'correct' : 'wrong');
    if (isCorrect) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      stroopComboRef.current += 1;
      if (stroopComboRef.current > stroopMaxComboRef.current) stroopMaxComboRef.current = stroopComboRef.current;
      stroopHitsRef.current += 1;
      stroopResponseTimes.current.push(rt);
      setStroopHits(h => h + 1);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      stroopComboRef.current = 0;
    }
    stroopFeedbackRef.current = setTimeout(() => {
      const newLeft = stroopLeft - 1;
      setStroopLeft(newLeft);
      if (newLeft <= 0) finishStroop(stroopHitsRef.current, level);
      else loadStroopRound(level, newLeft);
    }, 500);
  };

  const finishStroop = async (hits: number, lvl: number) => {
    if (stroopTimerRef.current) clearInterval(stroopTimerRef.current);
    setRunning(false);
    setFinished(true);
    const times = stroopResponseTimes.current;
    const mc = stroopMaxComboRef.current;
    const perfect = hits === STROOP_ROUNDS;
    const currentAccuracy = hits / STROOP_ROUNDS;
    const avgMs = times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 2000;
    const today = getLocalDateString(new Date());
    const nextLvl = calculateNextLevel(lvl, hits, STROOP_ROUNDS, avgMs, 'reaction');
    const xp = calculateXP(hits, STROOP_ROUNDS, lvl, false, mc, perfect);
    setXpEarned(xp);
    setSessionMaxCombo(mc);
    setSessionIsPerfect(perfect);
    const newPB = pbRef.current === null || currentAccuracy > pbRef.current;
    setIsNewPB(newPB);
    const attempt = {
      domain: 'reaction' as const, exercise_type: 'stroop',
      difficulty_level: lvl, score: hits,
      correct_count: hits, total_count: STROOP_ROUNDS,
      avg_response_ms: avgMs, xp_earned: xp,
      max_combo: mc, is_perfect: perfect ? 1 : 0, date: today,
    };
    await Promise.all([
      insertBrainAttempt(attempt),
      setDomainProgress('reaction', nextLvl, xp, hits),
      incrementMissionProgress(today),
    ]);
    const nb = await runBadgeChecksAfterSession(attempt);
    setNewBadgesCount(nb.length);
  };

  const startMode = async (m: Mode) => {
    const lvl = await getDomainLevel('reaction');
    setLevel(lvl);
    setMode(m);
    setRunning(true);
    setFinished(false);
    setXpEarned(0);
    setSessionMaxCombo(0);
    setSessionIsPerfect(false);
    setIsNewPB(false);
    setNewBadgesCount(0);
    // Load PB for this exercise type
    const exType = m === 'tap' ? 'tap_target' : 'stroop';
    const pb = await getPersonalBest('reaction', exType);
    pbRef.current = pb?.bestAccuracy ?? null;
    setPrevPBAccuracy(pb?.bestAccuracy ?? null);
    if (m === 'tap') {
      tapComboRef.current = 0; tapMaxComboRef.current = 0;
      setTapsLeft(TAP_TARGETS);
      setTapHits(0);
      setTapMisses(0);
      setResponseTimes([]);
      setTarget(null);
      setTimeout(() => showNextTarget(lvl, TAP_TARGETS, 0, 0, []), 500);
    } else {
      stroopComboRef.current = 0; stroopMaxComboRef.current = 0;
      setStroopLeft(STROOP_ROUNDS);
      setStroopHits(0);
      stroopHitsRef.current = 0;
      stroopResponseTimes.current = [];
      loadStroopRound(lvl, STROOP_ROUNDS);
    }
  };

  useEffect(() => {
    return () => {
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      if (stroopTimerRef.current) clearInterval(stroopTimerRef.current);
      if (stroopFeedbackRef.current) clearTimeout(stroopFeedbackRef.current);
    };
  }, []);

  const avgResponseMs = responseTimes.length > 0
    ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
    : null;

  // Mode selection
  if (!mode) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Zurück">
            <ChevronLeft size={24} color={COLORS.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Reaktion ⚡</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.modeContainer}>
          <Text style={styles.modeTitle}>Wähle deinen Modus</Text>
          <Pressable style={styles.modeCard} onPress={() => startMode('tap')} accessibilityRole="button" accessibilityLabel="Tap-Target spielen">
            <Text style={styles.modeIcon}>🎯</Text>
            <Text style={styles.modeName}>Tap-Target</Text>
            <Text style={styles.modeDesc}>Tippe so schnell wie möglich auf die grünen Kreise. Meide die roten!</Text>
          </Pressable>
          <Pressable style={styles.modeCard} onPress={() => startMode('stroop')} accessibilityRole="button" accessibilityLabel="Stroop-Test spielen">
            <Text style={styles.modeIcon}>🎨</Text>
            <Text style={styles.modeName}>Stroop-Test</Text>
            <Text style={styles.modeDesc}>Benenne die FARBE des Textes — nicht das geschriebene Wort. Trainiert kognitive Kontrolle.</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (finished) {
    const finalHits = mode === 'tap' ? tapHits : stroopHits;
    const total = mode === 'tap' ? TAP_TARGETS : STROOP_ROUNDS;
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Zurück">
            <ChevronLeft size={24} color={COLORS.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Reaktion</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.resultContainer}>
          <Text style={styles.resultEmoji}>{sessionIsPerfect ? '🏆' : finalHits / total >= 0.8 ? '⚡' : '💪'}</Text>
          <Text style={styles.resultTitle}>{sessionIsPerfect ? 'Perfekt!' : finalHits / total >= 0.8 ? 'Blitzschnell!' : 'Gut gemacht!'}</Text>
          <Text style={styles.resultSub}>{finalHits} / {total} richtig</Text>
          {avgResponseMs != null && <Text style={styles.resultSub}>Ø Reaktion: {avgResponseMs}ms</Text>}
          <View style={styles.xpBadge}>
            <Text style={styles.xpBadgeText}>+{xpEarned} XP</Text>
          </View>
          {sessionIsPerfect && (
            <View style={[styles.bonusBadge, { backgroundColor: COLORS.accent2 + '33' }]}>
              <Text style={[styles.bonusText, { color: COLORS.accent2 }]}>💯 Perfekte Runde! +25 XP</Text>
            </View>
          )}
          {sessionMaxCombo >= 3 && (
            <View style={[styles.bonusBadge, { backgroundColor: COLORS.warm + '22' }]}>
              <Text style={[styles.bonusText, { color: COLORS.warm }]}>
                🔥 Bester Combo: x{sessionMaxCombo}{sessionMaxCombo >= 10 ? ' +20 XP' : sessionMaxCombo >= 5 ? ' +10 XP' : ' +5 XP'}
              </Text>
            </View>
          )}
          {isNewPB ? (
            <View style={[styles.bonusBadge, { backgroundColor: COLORS.accent + '22' }]}>
              <Text style={[styles.bonusText, { color: COLORS.accent }]}>🏆 Neuer Persönlicher Rekord!</Text>
            </View>
          ) : prevPBAccuracy !== null && (
            <Text style={styles.pbText}>Dein Rekord: {Math.round(prevPBAccuracy * 100)}%</Text>
          )}
          {newBadgesCount > 0 && (
            <Text style={styles.badgeUnlock}>🎉 {newBadgesCount} neue{newBadgesCount > 1 ? ' Badges' : 's Badge'} freigeschaltet!</Text>
          )}
          <Pressable onPress={() => { setMode(null); setFinished(false); setRunning(false); }} style={styles.playAgainBtn} accessibilityRole="button" accessibilityLabel="Nochmal spielen">
            <RefreshCw size={16} color={COLORS.bg} />
            <Text style={styles.playAgainText}>Nochmal spielen</Text>
          </Pressable>
          <Pressable onPress={() => router.back()} style={styles.backLink} accessibilityRole="button" accessibilityLabel="Zurück">
            <Text style={styles.backLinkText}>Zurück zur Übersicht</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Tap target game
  if (mode === 'tap') {
    return (
      <View style={styles.tapPlayfield}>
        <SafeAreaView style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Zurück">
              <ChevronLeft size={24} color={COLORS.text} />
            </Pressable>
            <Text style={styles.headerTitle}>Tap-Target</Text>
            <Text style={styles.tapCounter}>{tapsLeft} übrig</Text>
          </View>
        </SafeAreaView>

        {target && (
          <Animated.View
            style={[
              styles.tapTarget,
              {
                left: target.x - TARGET_RADIUS,
                top: target.y - TARGET_RADIUS,
                backgroundColor: target.isDecoy ? COLORS.danger : COLORS.accent2,
              },
              targetStyle,
            ]}
          >
            <Pressable
              style={{ width: TARGET_RADIUS * 2, height: TARGET_RADIUS * 2, borderRadius: TARGET_RADIUS, alignItems: 'center', justifyContent: 'center' }}
              onPress={() => handleTargetTap(target.isDecoy)}
              accessibilityRole="button"
              accessibilityLabel={target.isDecoy ? 'Falsches Ziel' : 'Ziel antippen'}
            />
          </Animated.View>
        )}

        {tapHits > 0 && (
          <View style={styles.tapStatsOverlay}>
            <Text style={styles.tapHits}>{tapHits} ✓</Text>
          </View>
        )}
      </View>
    );
  }

  // Stroop game
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Zurück">
          <ChevronLeft size={24} color={COLORS.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Stroop-Test</Text>
        <View style={styles.timerBadge}>
          <Text style={[styles.timerText, stroopTimer <= 1 && { color: COLORS.danger }]}>{stroopTimer}s</Text>
        </View>
      </View>

      <View style={styles.statsBar}>
        <Text style={styles.statPill}>{STROOP_ROUNDS - stroopLeft + 1} / {STROOP_ROUNDS}</Text>
        <Text style={styles.statPill}>{stroopHits} ✓</Text>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${((STROOP_ROUNDS - stroopLeft) / STROOP_ROUNDS) * 100}%` }]} />
      </View>

      {stroopRound && (
        <View style={styles.stroopContainer}>
          <View style={[
            styles.stroopWordBox,
            stroopFeedback === 'correct' && { backgroundColor: COLORS.accent2 + '22' },
            stroopFeedback === 'wrong' && { backgroundColor: COLORS.danger + '22' },
          ]}>
            <Text style={[styles.stroopWord, { color: stroopRound.wordColor }]}>
              {stroopRound.word}
            </Text>
          </View>

          <Text style={styles.stroopHint}>Welche FARBE siehst du?</Text>

          {stroopFeedback !== 'idle' && (
            <Text style={[styles.feedbackLabel, stroopFeedback === 'correct' ? { color: COLORS.accent2 } : { color: COLORS.danger }]}>
              {stroopFeedback === 'correct' ? '✓ Richtig!' : `✗ Richtig: ${stroopRound.answer}`}
            </Text>
          )}

          <View style={styles.stroopButtons}>
            {STROOP_COLORS.map(c => (
              <Pressable
                key={c.name}
                style={[styles.stroopBtn, { borderColor: c.hex + '88' }]}
                onPress={() => handleStroopAnswer(c.name)}
                disabled={stroopFeedback !== 'idle'}
                accessibilityRole="button"
                accessibilityLabel={c.name}
              >
                <View style={[styles.stroopBtnDot, { backgroundColor: c.hex }]} />
                <Text style={styles.stroopBtnText}>{c.name}</Text>
              </Pressable>
            ))}
          </View>
        </View>
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
    minWidth: 40,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: COLORS.text, fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center' },
  timerBadge: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 40,
    alignItems: 'center',
  },
  timerText: { color: COLORS.accent, fontSize: 14, fontWeight: '700' },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  statPill: {
    backgroundColor: COLORS.surface,
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  progressTrack: {
    height: 3,
    backgroundColor: COLORS.surface2,
    marginHorizontal: 20,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.danger,
    borderRadius: 2,
  },
  modeContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    gap: 16,
  },
  modeTitle: { color: COLORS.text, fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  modeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 20,
    gap: 8,
  },
  modeIcon: { fontSize: 32 },
  modeName: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  modeDesc: { color: COLORS.muted, fontSize: 14, lineHeight: 21 },
  tapPlayfield: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  tapTarget: {
    position: 'absolute',
    width: TARGET_RADIUS * 2,
    height: TARGET_RADIUS * 2,
    borderRadius: TARGET_RADIUS,
  },
  tapCounter: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: '700',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  tapStatsOverlay: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
  },
  tapHits: {
    color: COLORS.accent2,
    fontSize: 22,
    fontWeight: '700',
  },
  stroopContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 24,
  },
  stroopWordBox: {
    paddingHorizontal: 40,
    paddingVertical: 32,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    minWidth: 200,
    alignItems: 'center',
  },
  stroopWord: {
    fontSize: 48,
    fontWeight: '900',
  },
  stroopHint: { color: COLORS.muted, fontSize: 14 },
  feedbackLabel: { fontSize: 16, fontWeight: '700' },
  stroopButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  stroopBtn: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingHorizontal: 18,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    minWidth: 120,
  },
  stroopBtnDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  stroopBtnText: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  resultContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  resultEmoji: { fontSize: 64 },
  resultTitle: { color: COLORS.text, fontSize: 28, fontWeight: '700' },
  resultSub: { color: COLORS.muted, fontSize: 15 },
  xpBadge: {
    backgroundColor: COLORS.accent + '33',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  xpBadgeText: { color: COLORS.accent, fontSize: 18, fontWeight: '700' },
  playAgainBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    paddingHorizontal: 28,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    width: '100%',
  },
  playAgainText: { color: COLORS.bg, fontSize: 16, fontWeight: '700' },
  backLink: { paddingVertical: 8 },
  backLinkText: { color: COLORS.muted, fontSize: 14 },
  bonusBadge: { borderRadius: 14, paddingHorizontal: 16, paddingVertical: 8, alignItems: 'center' },
  bonusText: { fontSize: 14, fontWeight: '700' },
  pbText: { color: COLORS.muted, fontSize: 13 },
  badgeUnlock: { color: COLORS.accent, fontSize: 13, fontWeight: '600' },
});
