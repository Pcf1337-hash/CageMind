import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
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
  getPersonalBest,
} from '../../lib/database';
import {
  calculateNextLevel,
  calculateXP,
  getXPBreakdown,
  generateNumberSequence,
  generateWrongAnswers,
  NumberSequence,
  runBadgeChecksAfterSession,
} from '../../lib/brainTraining';

const ROUNDS = 8;
const TIME_LIMITS = [0, 20, 17, 14, 11, 9, 8];

type Mode = 'sequence' | 'math';

function generateMathProblem(level: number): { question: string; answer: number } {
  const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
  if (level <= 1) {
    const a = rand(1, 9); const b = rand(1, 9);
    return Math.random() < 0.5
      ? { question: `${a} + ${b} = ?`, answer: a + b }
      : { question: `${Math.max(a, b)} - ${Math.min(a, b)} = ?`, answer: Math.abs(a - b) };
  }
  if (level <= 2) {
    const a = rand(10, 50); const b = rand(1, 20);
    return Math.random() < 0.5
      ? { question: `${a} + ${b} = ?`, answer: a + b }
      : { question: `${a} - ${b} = ?`, answer: a - b };
  }
  if (level <= 3) {
    const a = rand(2, 9); const b = rand(2, 9);
    return { question: `${a} × ${b} = ?`, answer: a * b };
  }
  if (level <= 4) {
    const ops = ['+', '-', '×'];
    const op = ops[rand(0, 2)];
    const a = rand(10, 30); const b = rand(2, 9);
    if (op === '×') return { question: `${a} × ${b} = ?`, answer: a * b };
    if (op === '+') return { question: `${a} + ${b} = ?`, answer: a + b };
    return { question: `${a} - ${b} = ?`, answer: a - b };
  }
  const a = rand(10, 20); const b = rand(2, 5);
  return Math.random() < 0.5
    ? { question: `${a * b} ÷ ${b} = ?`, answer: a }
    : { question: `${a} × ${b} = ?`, answer: a * b };
}

export default function LogicScreen() {
  const [mode, setMode] = useState<Mode | null>(null);
  const [level, setLevel] = useState(1);
  const [round, setRound] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [timer, setTimer] = useState(20);
  const [finished, setFinished] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [combo, setCombo] = useState(0);

  // Result extras
  const [sessionMaxCombo, setSessionMaxCombo] = useState(0);
  const [sessionIsPerfect, setSessionIsPerfect] = useState(false);
  const [isNewPB, setIsNewPB] = useState(false);
  const [prevPBAccuracy, setPrevPBAccuracy] = useState<number | null>(null);
  const [newBadgesCount, setNewBadgesCount] = useState(0);
  const maxComboRef = useRef(0);
  const pbRef = useRef<number | null>(null);

  // Sequence mode
  const [sequence, setSequence] = useState<NumberSequence | null>(null);
  const [options, setOptions] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');

  // Math mode
  const [mathProblem, setMathProblem] = useState<{ question: string; answer: number } | null>(null);
  const [mathInput, setMathInput] = useState('');
  const [mathFeedback, setMathFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const feedbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const correctRef = useRef(0);

  const startMode = useCallback(async (m: Mode) => {
    const lvl = await getDomainLevel('logic');
    setLevel(lvl);
    setMode(m);
    setRound(1);
    setCorrect(0);
    correctRef.current = 0;
    setCombo(0);
    maxComboRef.current = 0;
    setFinished(false);
    setIsNewPB(false);
    setNewBadgesCount(0);
    // Load PB before session starts
    const exType = m === 'sequence' ? 'number_sequence' : 'math_sprint';
    const pb = await getPersonalBest('logic', exType);
    pbRef.current = pb?.bestAccuracy ?? null;
    setPrevPBAccuracy(pb?.bestAccuracy ?? null);
    loadRound(m, lvl, 1);
  }, []);

  const loadRound = (m: Mode, lvl: number, r: number) => {
    const timeLimit = TIME_LIMITS[Math.min(lvl, TIME_LIMITS.length - 1)] ?? 20;
    setTimer(timeLimit);
    setFeedback('idle');
    setMathFeedback('idle');
    setMathInput('');

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimer(t => {
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          onTimeUp(m, lvl, r);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    if (m === 'sequence') {
      const seq = generateNumberSequence(lvl);
      const wrongs = generateWrongAnswers(seq.answer);
      const allOptions = [seq.answer, ...wrongs].sort(() => Math.random() - 0.5);
      setSequence(seq);
      setOptions(allOptions);
    } else {
      setMathProblem(generateMathProblem(lvl));
    }
  };

  const onTimeUp = (m: Mode, lvl: number, r: number) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    setFeedback('wrong');
    setMathFeedback('wrong');
    setCombo(0);
    feedbackRef.current = setTimeout(() => advance(false, m, lvl, r), 700);
  };

  const advance = (wasCorrect: boolean, m: Mode, lvl: number, r: number) => {
    const newCorrect = wasCorrect ? correctRef.current + 1 : correctRef.current;
    correctRef.current = newCorrect;
    setCorrect(newCorrect);
    if (r >= ROUNDS) {
      finishSession(newCorrect, lvl, m);
    } else {
      setRound(r + 1);
      loadRound(m, lvl, r + 1);
    }
  };

  const finishSession = async (finalCorrect: number, lvl: number, m: Mode) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setFinished(true);
    const today = getLocalDateString(new Date());
    const mc = maxComboRef.current;
    const perfect = finalCorrect === ROUNDS;
    const currentAccuracy = finalCorrect / ROUNDS;
    const nextLvl = calculateNextLevel(lvl, finalCorrect, ROUNDS, 10000, 'logic');
    const xp = calculateXP(finalCorrect, ROUNDS, lvl, false, mc, perfect);
    const exType = m === 'sequence' ? 'number_sequence' : 'math_sprint';
    setXpEarned(xp);
    setSessionMaxCombo(mc);
    setSessionIsPerfect(perfect);
    const newPB = pbRef.current === null || currentAccuracy > pbRef.current;
    setIsNewPB(newPB);
    const attempt = {
      domain: 'logic' as const, exercise_type: exType,
      difficulty_level: lvl, score: finalCorrect,
      correct_count: finalCorrect, total_count: ROUNDS,
      xp_earned: xp, max_combo: mc, is_perfect: perfect ? 1 : 0, date: today,
    };
    await Promise.all([
      insertBrainAttempt(attempt),
      setDomainProgress('logic', nextLvl, xp, finalCorrect),
      incrementMissionProgress(today),
    ]);
    const nb = await runBadgeChecksAfterSession(attempt);
    setNewBadgesCount(nb.length);
  };

  const handleSequenceAnswer = (answer: number) => {
    if (feedback !== 'idle' || !sequence) return;
    if (timerRef.current) clearInterval(timerRef.current);
    const isCorrect = answer === sequence.answer;
    setFeedback(isCorrect ? 'correct' : 'wrong');
    if (isCorrect) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCombo(c => {
        const newC = c + 1;
        if (newC > maxComboRef.current) maxComboRef.current = newC;
        return newC;
      });
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setCombo(0);
    }
    feedbackRef.current = setTimeout(() => advance(isCorrect, mode!, level, round), 600);
  };

  const handleMathSubmit = () => {
    if (mathFeedback !== 'idle' || !mathProblem) return;
    if (timerRef.current) clearInterval(timerRef.current);
    const userAnswer = parseInt(mathInput.trim(), 10);
    const isCorrect = userAnswer === mathProblem.answer;
    setMathFeedback(isCorrect ? 'correct' : 'wrong');
    setMathInput('');
    if (isCorrect) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCombo(c => {
        const newC = c + 1;
        if (newC > maxComboRef.current) maxComboRef.current = newC;
        return newC;
      });
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setCombo(0);
    }
    feedbackRef.current = setTimeout(() => advance(isCorrect, mode!, level, round), 600);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (feedbackRef.current) clearTimeout(feedbackRef.current);
    };
  }, []);

  // Mode selection
  if (!mode) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Zurück">
            <ChevronLeft size={24} color={COLORS.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Logik 🔢</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.modeContainer}>
          <Text style={styles.modeTitle}>Wähle deinen Modus</Text>
          <Pressable style={styles.modeCard} onPress={() => startMode('sequence')} accessibilityRole="button" accessibilityLabel="Zahlenreihen spielen">
            <Text style={styles.modeIcon}>🔢</Text>
            <Text style={styles.modeName}>Zahlenreihen</Text>
            <Text style={styles.modeDesc}>Finde die fehlende Zahl in der Sequenz. Multiple-Choice mit Zeitlimit.</Text>
          </Pressable>
          <Pressable style={styles.modeCard} onPress={() => startMode('math')} accessibilityRole="button" accessibilityLabel="Mathe-Sprint spielen">
            <Text style={styles.modeIcon}>⚡</Text>
            <Text style={styles.modeName}>Mathe-Sprint</Text>
            <Text style={styles.modeDesc}>Löse Rechenaufgaben so schnell wie möglich. Combo-Bonus für Treffer in Folge!</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (finished) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Zurück">
            <ChevronLeft size={24} color={COLORS.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Logik</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.resultContainer}>
          <Text style={styles.resultEmoji}>{sessionIsPerfect ? '🏆' : correct >= ROUNDS * 0.8 ? '🎯' : '💡'}</Text>
          <Text style={styles.resultTitle}>{sessionIsPerfect ? 'Perfekt!' : correct >= ROUNDS * 0.8 ? 'Stark!' : 'Gute Übung!'}</Text>
          <Text style={styles.resultSub}>{correct} / {ROUNDS} richtig</Text>
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
          <Pressable onPress={() => { setMode(null); setFinished(false); maxComboRef.current = 0; }} style={styles.playAgainBtn} accessibilityRole="button" accessibilityLabel="Nochmal spielen">
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
        <Text style={styles.headerTitle}>{mode === 'sequence' ? 'Zahlenreihen' : 'Mathe-Sprint'}</Text>
        <View style={styles.timerBadge}>
          <Text style={[styles.timerText, timer <= 5 && { color: COLORS.danger }]}>{timer}s</Text>
        </View>
      </View>

      <View style={styles.statsBar}>
        <Text style={styles.statPill}>Level {level}</Text>
        <Text style={styles.statPill}>{round} / {ROUNDS}</Text>
        <Text style={styles.statPill}>{correct} ✓</Text>
        {combo >= 3
          ? <Text style={[styles.statPill, { backgroundColor: COLORS.warm + '33', color: COLORS.warm }]}>🔥 x{combo}</Text>
          : combo >= 2
          ? <Text style={[styles.statPill, { backgroundColor: COLORS.warm + '22', color: COLORS.warm }]}>x{combo}</Text>
          : null
        }
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${(round - 1) / ROUNDS * 100}%` }]} />
      </View>

      {mode === 'sequence' && sequence && (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.sequenceContainer}>
            <View style={styles.sequenceRow}>
              {sequence.sequence.map((n, i) => (
                <View key={i} style={[styles.seqChip, n === null && styles.seqChipEmpty]}>
                  <Text style={[styles.seqNum, n === null && styles.seqNumEmpty]}>{n ?? '?'}</Text>
                </View>
              ))}
            </View>
            {feedback !== 'idle' && (
              <Text style={[styles.feedbackLabel, feedback === 'correct' ? { color: COLORS.accent2 } : { color: COLORS.danger }]}>
                {feedback === 'correct' ? '✓ Richtig!' : `✗ Richtig wäre: ${sequence.answer}`}
              </Text>
            )}
            <View style={styles.optionsGrid}>
              {options.map((opt) => (
                <Pressable
                  key={opt}
                  style={[
                    styles.optionBtn,
                    feedback !== 'idle' && opt === sequence.answer && styles.optionCorrect,
                    feedback === 'wrong' && opt !== sequence.answer && styles.optionWrong,
                  ]}
                  onPress={() => handleSequenceAnswer(opt)}
                  disabled={feedback !== 'idle'}
                  accessibilityRole="button"
                  accessibilityLabel={`Antwort ${opt}`}
                >
                  <Text style={styles.optionText}>{opt}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </KeyboardAvoidingView>
      )}

      {mode === 'math' && mathProblem && (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.mathContainer}>
            <Text style={styles.mathQuestion}>{mathProblem.question}</Text>
            {mathFeedback !== 'idle' && (
              <Text style={[styles.feedbackLabel, mathFeedback === 'correct' ? { color: COLORS.accent2 } : { color: COLORS.danger }]}>
                {mathFeedback === 'correct' ? '✓ Richtig!' : `✗ Richtig: ${mathProblem.answer}`}
              </Text>
            )}
            <View style={styles.mathInputRow}>
              <TextInput
                style={styles.mathInput}
                value={mathInput}
                onChangeText={setMathInput}
                keyboardType="numeric"
                returnKeyType="done"
                onSubmitEditing={handleMathSubmit}
                placeholder="?"
                placeholderTextColor={COLORS.muted}
                editable={mathFeedback === 'idle'}
                autoFocus
                accessibilityLabel="Antwort eingeben"
              />
              <Pressable
                style={styles.mathSubmitBtn}
                onPress={handleMathSubmit}
                disabled={mathFeedback !== 'idle'}
                accessibilityRole="button"
                accessibilityLabel="Antwort bestätigen"
              >
                <Text style={styles.mathSubmitText}>OK</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
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
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 8,
    flexWrap: 'wrap',
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
    backgroundColor: COLORS.accent,
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
  sequenceContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 28,
  },
  sequenceRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  seqChip: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.surface2,
  },
  seqChipEmpty: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accent + '22',
  },
  seqNum: { color: COLORS.text, fontSize: 20, fontWeight: '700' },
  seqNumEmpty: { color: COLORS.accent, fontSize: 22 },
  feedbackLabel: { fontSize: 16, fontWeight: '700' },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  optionBtn: {
    backgroundColor: COLORS.surface2,
    borderRadius: 14,
    width: 130,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionCorrect: { borderColor: COLORS.accent2, backgroundColor: COLORS.accent2 + '22' },
  optionWrong: { opacity: 0.4 },
  optionText: { color: COLORS.text, fontSize: 22, fontWeight: '700' },
  mathContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 28,
  },
  mathQuestion: { color: COLORS.text, fontSize: 36, fontWeight: '700', textAlign: 'center' },
  mathInputRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  mathInput: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingHorizontal: 20,
    height: 60,
    color: COLORS.text,
    fontSize: 28,
    fontWeight: '700',
    minWidth: 120,
    textAlign: 'center',
    borderWidth: 2,
    borderColor: COLORS.accent + '44',
  },
  mathSubmitBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    width: 70,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mathSubmitText: { color: COLORS.bg, fontSize: 18, fontWeight: '700' },
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
  bonusBadge: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
  },
  bonusText: { fontSize: 14, fontWeight: '700' },
  pbText: { color: COLORS.muted, fontSize: 13 },
  badgeUnlock: { color: COLORS.accent, fontSize: 13, fontWeight: '600' },
});
