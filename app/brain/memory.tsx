import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { ChevronLeft, RefreshCw } from 'lucide-react-native';
import { COLORS } from '../../lib/constants';
import { getLocalDateString } from '../../lib/constants';
import {
  getDomainProgress,
  getDomainLevel,
  setDomainProgress,
  insertBrainAttempt,
  incrementMissionProgress,
  getPersonalBest,
} from '../../lib/database';
import { calculateNextLevel, calculateXP, DOMAIN_META, runBadgeChecksAfterSession } from '../../lib/brainTraining';

// ─── Time Limit per Level ──────────────────────────────────────────
function getTimeLimit(level: number): number {
  if (level >= 9) return 60;
  if (level >= 7) return 90;
  if (level >= 5) return 120;
  return 0; // no limit = count up
}

// ─── Card Data ─────────────────────────────────────────────────────
const CARD_SETS: string[][] = [
  ['🐶', '🐱', '🐸', '🦋', '🦁', '🐻', '🦊', '🐨'],
  ['🍎', '🍌', '🍓', '🍇', '🍊', '🍋', '🥝', '🍉'],
  ['⭐', '🌙', '☀️', '⚡', '🌈', '❄️', '🔥', '💧'],
  ['🎵', '🎸', '🎹', '🥁', '🎺', '🎻', '🎷', '🎵'],
];

function getPairsForLevel(level: number): number {
  if (level >= 5) return 8;
  if (level >= 4) return 7;
  if (level >= 3) return 6;
  if (level >= 2) return 5;
  return 4;
}

function buildCards(pairs: number, setIdx: number): { id: number; emoji: string; matched: boolean }[] {
  const emojis = CARD_SETS[setIdx % CARD_SETS.length].slice(0, pairs);
  const all = [...emojis, ...emojis].map((emoji, i) => ({ id: i, emoji, matched: false }));
  // Shuffle
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all;
}

interface FlipCardProps {
  emoji: string;
  flipped: boolean;
  matched: boolean;
  onPress: () => void;
  cardSize: number;
}

function FlipCard({ emoji, flipped, matched, onPress, cardSize }: FlipCardProps) {
  const rot = useSharedValue(flipped || matched ? 1 : 0);

  useEffect(() => {
    rot.value = withTiming(flipped || matched ? 1 : 0, { duration: 300 });
  }, [flipped, matched]);

  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${interpolate(rot.value, [0, 1], [0, 180])}deg` }],
    backfaceVisibility: 'hidden',
    position: 'absolute',
    width: cardSize,
    height: cardSize,
  }));

  const backStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${interpolate(rot.value, [0, 1], [180, 360])}deg` }],
    backfaceVisibility: 'hidden',
    position: 'absolute',
    width: cardSize,
    height: cardSize,
  }));

  const bg = matched ? COLORS.accent2 + '33' : flipped ? COLORS.surface2 : COLORS.surface;
  const border = matched ? COLORS.accent2 : flipped ? COLORS.accent : COLORS.surface2;

  return (
    <Pressable
      onPress={onPress}
      style={{ width: cardSize, height: cardSize }}
      accessibilityRole="button"
      accessibilityLabel={flipped || matched ? emoji : 'Karte umdrehen'}
    >
      <View style={{ width: cardSize, height: cardSize }}>
        <Animated.View style={[styles.cardFace, { backgroundColor: bg, borderColor: border, width: cardSize, height: cardSize, borderRadius: 12 }, frontStyle]}>
          <Text style={styles.cardQuestion}>?</Text>
        </Animated.View>
        <Animated.View style={[styles.cardFace, { backgroundColor: bg, borderColor: border, width: cardSize, height: cardSize, borderRadius: 12 }, backStyle]}>
          <Text style={{ fontSize: cardSize * 0.45 }}>{emoji}</Text>
        </Animated.View>
      </View>
    </Pressable>
  );
}

export default function MemoryScreen() {
  const [level, setLevel] = useState(1);
  const [cards, setCards] = useState<{ id: number; emoji: string; matched: boolean }[]>([]);
  const [flippedIds, setFlippedIds] = useState<number[]>([]);
  const [matchedIds, setMatchedIds] = useState<Set<number>>(new Set());
  const [moves, setMoves] = useState(0);
  const [timer, setTimer] = useState(0);
  const [timeLimit, setTimeLimit] = useState(0);
  const [timedOut, setTimedOut] = useState(false);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [setIdx, setSetIdx] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [correctPairs, setCorrectPairs] = useState(0);
  // Combo & extras
  const [combo, setCombo] = useState(0);
  const [sessionMaxCombo, setSessionMaxCombo] = useState(0);
  const [sessionIsPerfect, setSessionIsPerfect] = useState(false);
  const [isNewPB, setIsNewPB] = useState(false);
  const [prevPBAccuracy, setPrevPBAccuracy] = useState<number | null>(null);
  const [newBadgesCount, setNewBadgesCount] = useState(0);
  const maxComboRef = useRef(0);
  const comboRef = useRef(0);
  const pbRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pairs = getPairsForLevel(level);

  const startGame = useCallback(async () => {
    const lvl = await getDomainLevel('memory');
    setLevel(lvl);
    const limit = getTimeLimit(lvl);
    setTimeLimit(limit);
    const newCards = buildCards(pairs, setIdx);
    setCards(newCards);
    setFlippedIds([]);
    setMatchedIds(new Set());
    setMoves(0);
    setTimer(limit > 0 ? limit : 0);
    setTimedOut(false);
    setRunning(true);
    setFinished(false);
    setCorrectPairs(0);
    setCombo(0);
    comboRef.current = 0;
    maxComboRef.current = 0;
    setNewBadgesCount(0);
    // Load PB
    const pb = await getPersonalBest('memory', 'memory_cards');
    pbRef.current = pb?.bestAccuracy ?? null;
    setPrevPBAccuracy(pb?.bestAccuracy ?? null);
    if (timerRef.current) clearInterval(timerRef.current);
    if (limit > 0) {
      timerRef.current = setInterval(() => {
        setTimer(t => {
          if (t <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            setTimedOut(true);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    } else {
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    }
  }, [pairs, setIdx]);

  useEffect(() => {
    startGame();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  useEffect(() => {
    if (timedOut && running) {
      finishGame(false);
    }
  }, [timedOut, running]);

  useEffect(() => {
    if (matchedIds.size === pairs * 2 && pairs > 0) {
      finishGame(true);
    }
  }, [matchedIds]);

  const finishGame = useCallback(async (won: boolean) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setRunning(false);
    setFinished(true);
    const today = getLocalDateString(new Date());
    const correct = won ? pairs : Math.round(matchedIds.size / 2);
    const total = pairs;
    const perfect = correct === total;
    const mc = maxComboRef.current;
    const currentAccuracy = total > 0 ? correct / total : 0;
    const elapsedOrTimer = timer;
    const avgMs = moves > 0 ? (elapsedOrTimer * 1000) / moves : 3000;
    const currentLevel = await getDomainLevel('memory');
    const nextLvl = calculateNextLevel(currentLevel, correct, total, avgMs, 'memory');
    const xp = calculateXP(correct, total, currentLevel, false, mc, perfect);
    const newPB = pbRef.current === null || currentAccuracy > pbRef.current;
    setXpEarned(xp);
    setCorrectPairs(correct);
    setSessionMaxCombo(mc);
    setSessionIsPerfect(perfect);
    setIsNewPB(newPB);
    const attempt = {
      domain: 'memory' as const, exercise_type: 'memory_cards',
      difficulty_level: currentLevel, score: correct,
      correct_count: correct, total_count: total,
      avg_response_ms: Math.round(avgMs), xp_earned: xp,
      max_combo: mc, is_perfect: perfect ? 1 : 0, date: today,
    };
    await Promise.all([
      insertBrainAttempt(attempt),
      setDomainProgress('memory', nextLvl, xp, correct),
      incrementMissionProgress(today),
    ]);
    const nb = await runBadgeChecksAfterSession(attempt);
    setNewBadgesCount(nb.length);
  }, [moves, timer, matchedIds, pairs]);

  const handleCardPress = (id: number) => {
    if (!running || finished) return;
    const card = cards[id];
    if (!card || matchedIds.has(id) || flippedIds.includes(id)) return;
    if (flippedIds.length >= 2) return;

    const newFlipped = [...flippedIds, id];
    setFlippedIds(newFlipped);
    setMoves(m => m + 1);

    if (newFlipped.length === 2) {
      const [a, b] = newFlipped;
      if (cards[a].emoji === cards[b].emoji) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        comboRef.current += 1;
        if (comboRef.current > maxComboRef.current) maxComboRef.current = comboRef.current;
        setCombo(comboRef.current);
        setTimeout(() => {
          setMatchedIds(prev => new Set([...prev, a, b]));
          setFlippedIds([]);
        }, 400);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        comboRef.current = 0;
        setCombo(0);
        setTimeout(() => setFlippedIds([]), 900);
      }
    }
  };

  const numCols = pairs <= 4 ? 4 : pairs <= 6 ? 4 : 4;
  const cardSize = Math.min(70, (320 - numCols * 8) / numCols);

  if (finished) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Zurück">
            <ChevronLeft size={24} color={COLORS.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Gedächtnis</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.resultContainer}>
          <Text style={styles.resultEmoji}>{sessionIsPerfect ? '🏆' : correctPairs === pairs ? '🎯' : '💪'}</Text>
          <Text style={styles.resultTitle}>
            {sessionIsPerfect ? 'Perfekt!' : correctPairs === pairs ? 'Geschafft!' : 'Zeit abgelaufen!'}
          </Text>
          <Text style={styles.resultSub}>
            {correctPairs} / {pairs} Paare · {moves} Züge
          </Text>
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
          ) : prevPBAccuracy !== null && prevPBAccuracy < 1 && (
            <Text style={styles.pbText}>Dein Rekord: {Math.round(prevPBAccuracy * 100)}%</Text>
          )}
          {newBadgesCount > 0 && (
            <Text style={styles.badgeUnlock}>🎉 {newBadgesCount} neue{newBadgesCount > 1 ? ' Badges' : 's Badge'} freigeschaltet!</Text>
          )}
          <Pressable
            onPress={() => { setSetIdx(i => i + 1); startGame(); }}
            style={styles.playAgainBtn}
            accessibilityRole="button"
            accessibilityLabel="Nochmal spielen"
          >
            <RefreshCw size={16} color={COLORS.bg} />
            <Text style={styles.playAgainText}>Nochmal spielen</Text>
          </Pressable>
          <Pressable onPress={() => router.back()} style={styles.backLink} accessibilityRole="button" accessibilityLabel="Zurück zur Übersicht">
            <Text style={styles.backLinkText}>Zurück zur Übersicht</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Zurück">
          <ChevronLeft size={24} color={COLORS.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Gedächtnis 🃏</Text>
        <View style={[styles.timerBadge, timeLimit > 0 && timer <= 20 && { backgroundColor: COLORS.danger + '22' }]}>
          <Text style={[styles.timerText, timeLimit > 0 && timer <= 20 && { color: COLORS.danger }]}>
            {timeLimit > 0 ? `${timer}s ⏱` : `${timer}s`}
          </Text>
        </View>
      </View>

      <View style={styles.statsBar}>
        <Text style={styles.statPill}>Level {level}</Text>
        <Text style={styles.statPill}>{matchedIds.size / 2} / {pairs} Paare</Text>
        <Text style={styles.statPill}>{moves} Züge</Text>
        {combo >= 3
          ? <Text style={[styles.statPill, { backgroundColor: COLORS.warm + '33', color: COLORS.warm }]}>🔥 x{combo}</Text>
          : combo >= 2
          ? <Text style={[styles.statPill, { backgroundColor: COLORS.warm + '22', color: COLORS.warm }]}>x{combo}</Text>
          : null
        }
      </View>

      <View style={styles.grid}>
        {cards.map((card, i) => (
          <FlipCard
            key={`${card.id}-${i}`}
            emoji={card.emoji}
            flipped={flippedIds.includes(i)}
            matched={matchedIds.has(i)}
            onPress={() => handleCardPress(i)}
            cardSize={cardSize}
          />
        ))}
      </View>
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
    paddingBottom: 16,
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  cardFace: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  cardQuestion: { color: COLORS.muted, fontSize: 24, fontWeight: '700' },
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
