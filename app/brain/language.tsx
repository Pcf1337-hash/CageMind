import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ChevronLeft, RefreshCw } from 'lucide-react-native';
import { COLORS } from '../../lib/constants';
import { getLocalDateString } from '../../lib/constants';
import {
  getDomainLevel,
  setDomainProgress,
  insertBrainAttempt,
  incrementMissionProgress,
} from '../../lib/database';
import { calculateNextLevel, calculateXP, ANAGRAM_WORDS } from '../../lib/brainTraining';

const ROUNDS_PER_SESSION = 5;
const TIME_BY_LEVEL = [0, 30, 20, 15, 12, 10];

function getWordsByLevel(level: number): string[] {
  if (level >= 5) return ANAGRAM_WORDS.filter(w => w.length >= 7);
  if (level >= 4) return ANAGRAM_WORDS.filter(w => w.length >= 6);
  if (level >= 3) return ANAGRAM_WORDS.filter(w => w.length >= 5);
  if (level >= 2) return ANAGRAM_WORDS.filter(w => w.length === 5);
  return ANAGRAM_WORDS.filter(w => w.length === 4);
}

function shuffleWord(word: string): string[] {
  const letters = word.split('');
  for (let i = letters.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [letters[i], letters[j]] = [letters[j], letters[i]];
  }
  // Ensure shuffled is different from original
  if (letters.join('') === word && letters.length > 1) {
    [letters[0], letters[1]] = [letters[1], letters[0]];
  }
  return letters;
}

function pickWord(level: number, usedWords: Set<string>): string {
  const pool = getWordsByLevel(level).filter(w => !usedWords.has(w));
  if (pool.length === 0) return ANAGRAM_WORDS[Math.floor(Math.random() * ANAGRAM_WORDS.length)];
  return pool[Math.floor(Math.random() * pool.length)];
}

export default function LanguageScreen() {
  const [level, setLevel] = useState(1);
  const [targetWord, setTargetWord] = useState('');
  const [shuffled, setShuffled] = useState<string[]>([]);
  const [selected, setSelected] = useState<number[]>([]);  // indices into shuffled
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [round, setRound] = useState(1);
  const [correct, setCorrect] = useState(0);
  const [timer, setTimer] = useState(30);
  const [running, setRunning] = useState(true);
  const [finished, setFinished] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const usedWords = useRef(new Set<string>());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const feedbackTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadRound = useCallback(async (lvl?: number) => {
    const currentLevel = lvl ?? (await getDomainLevel('language'));
    setLevel(currentLevel);
    const word = pickWord(currentLevel, usedWords.current);
    usedWords.current.add(word);
    setTargetWord(word);
    setShuffled(shuffleWord(word));
    setSelected([]);
    setFeedback('idle');
    const timeLimit = TIME_BY_LEVEL[Math.min(currentLevel, TIME_BY_LEVEL.length - 1)] ?? 30;
    setTimer(timeLimit);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimer(t => {
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleTimeUp();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    loadRound();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (feedbackTimeout.current) clearTimeout(feedbackTimeout.current);
    };
  }, []);

  const handleTimeUp = () => {
    setFeedback('wrong');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    feedbackTimeout.current = setTimeout(() => advanceRound(false), 1000);
  };

  const advanceRound = (wasCorrect: boolean) => {
    const newCorrect = wasCorrect ? correct + 1 : correct;
    if (round >= ROUNDS_PER_SESSION) {
      finishSession(newCorrect);
    } else {
      setCorrect(newCorrect);
      setRound(r => r + 1);
      loadRound();
    }
  };

  const finishSession = async (finalCorrect: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setRunning(false);
    setFinished(true);
    const today = getLocalDateString(new Date());
    const nextLvl = calculateNextLevel(level, finalCorrect, ROUNDS_PER_SESSION, 8000, 'language');
    const xp = calculateXP(finalCorrect, ROUNDS_PER_SESSION, level, false);
    setXpEarned(xp);
    await Promise.all([
      insertBrainAttempt({
        domain: 'language', exercise_type: 'anagram',
        difficulty_level: level, score: finalCorrect,
        correct_count: finalCorrect, total_count: ROUNDS_PER_SESSION,
        xp_earned: xp, date: today,
      }),
      setDomainProgress('language', nextLvl, xp, finalCorrect),
      incrementMissionProgress(today),
    ]);
  };

  const handleLetterTap = (shuffleIdx: number) => {
    if (!running || feedback !== 'idle') return;
    if (selected.includes(shuffleIdx)) return;
    const newSelected = [...selected, shuffleIdx];
    setSelected(newSelected);

    if (newSelected.length === targetWord.length) {
      const formed = newSelected.map(i => shuffled[i]).join('');
      if (formed === targetWord) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setFeedback('correct');
        feedbackTimeout.current = setTimeout(() => advanceRound(true), 700);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setFeedback('wrong');
        feedbackTimeout.current = setTimeout(() => {
          setSelected([]);
          setFeedback('idle');
        }, 600);
      }
    }
  };

  const handleDeselect = (pos: number) => {
    if (feedback !== 'idle') return;
    const srcIdx = selected[pos];
    setSelected(prev => prev.filter((_, i) => i !== pos));
  };

  const bgFeedback =
    feedback === 'correct' ? COLORS.accent2 + '22' :
    feedback === 'wrong' ? COLORS.danger + '22' :
    COLORS.surface;

  if (finished) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Zurück">
            <ChevronLeft size={24} color={COLORS.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Sprache</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.resultContainer}>
          <Text style={styles.resultEmoji}>{correct >= ROUNDS_PER_SESSION * 0.8 ? '🌟' : '💪'}</Text>
          <Text style={styles.resultTitle}>{correct >= ROUNDS_PER_SESSION * 0.8 ? 'Ausgezeichnet!' : 'Gute Übung!'}</Text>
          <Text style={styles.resultSub}>{correct} / {ROUNDS_PER_SESSION} Anagramme gelöst</Text>
          <View style={styles.xpBadge}>
            <Text style={styles.xpBadgeText}>+{xpEarned} XP</Text>
          </View>
          <Pressable
            onPress={() => { usedWords.current = new Set(); setRound(1); setCorrect(0); setFinished(false); setRunning(true); loadRound(); }}
            style={styles.playAgainBtn}
            accessibilityRole="button"
            accessibilityLabel="Nochmal spielen"
          >
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

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Zurück">
          <ChevronLeft size={24} color={COLORS.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Anagramm 🔤</Text>
        <View style={styles.timerBadge}>
          <Text style={[styles.timerText, timer <= 5 && { color: COLORS.danger }]}>{timer}s</Text>
        </View>
      </View>

      <View style={styles.statsBar}>
        <Text style={styles.statPill}>Level {level}</Text>
        <Text style={styles.statPill}>Runde {round} / {ROUNDS_PER_SESSION}</Text>
        <Text style={styles.statPill}>{correct} richtig</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${(round - 1) / ROUNDS_PER_SESSION * 100}%` }]} />
      </View>

      <View style={[styles.playArea, { backgroundColor: bgFeedback }]}>
        {/* Answer slots */}
        <View style={styles.answerRow}>
          {Array.from({ length: targetWord.length }).map((_, pos) => {
            const letter = pos < selected.length ? shuffled[selected[pos]] : null;
            return (
              <Pressable
                key={pos}
                style={[styles.answerSlot, letter && styles.answerSlotFilled]}
                onPress={() => letter && handleDeselect(pos)}
                accessibilityRole="button"
                accessibilityLabel={letter ?? 'Leeres Feld'}
              >
                <Text style={styles.answerLetter}>{letter ?? ''}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.hintText}>{targetWord.length} Buchstaben</Text>

        {/* Shuffled letters */}
        <View style={styles.lettersRow}>
          {shuffled.map((letter, i) => {
            const isUsed = selected.includes(i);
            return (
              <Pressable
                key={i}
                style={[styles.letterTile, isUsed && styles.letterTileUsed]}
                onPress={() => !isUsed && handleLetterTap(i)}
                disabled={isUsed}
                accessibilityRole="button"
                accessibilityLabel={`Buchstabe ${letter}`}
              >
                <Text style={[styles.letterText, isUsed && styles.letterTextUsed]}>{letter}</Text>
              </Pressable>
            );
          })}
        </View>

        {feedback === 'correct' && <Text style={styles.feedbackText}>✓ Richtig!</Text>}
        {feedback === 'wrong' && <Text style={[styles.feedbackText, { color: COLORS.danger }]}>✗ Falsch!</Text>}
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
    backgroundColor: COLORS.accent2,
    borderRadius: 2,
  },
  playArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 24,
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 24,
  },
  answerRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  answerSlot: {
    width: 44,
    height: 52,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.surface2,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  answerSlotFilled: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accent + '22',
  },
  answerLetter: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '700',
  },
  hintText: {
    color: COLORS.muted,
    fontSize: 13,
  },
  lettersRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  letterTile: {
    width: 50,
    height: 58,
    borderRadius: 10,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.accent + '44',
  },
  letterTileUsed: {
    opacity: 0.3,
    borderColor: 'transparent',
  },
  letterText: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '700',
  },
  letterTextUsed: { color: COLORS.muted },
  feedbackText: {
    color: COLORS.accent2,
    fontSize: 18,
    fontWeight: '700',
  },
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
});
