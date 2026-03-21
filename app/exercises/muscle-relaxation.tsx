import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { X } from 'lucide-react-native';
import { insertExerciseSession } from '../../lib/database';
import { MUSCLE_GROUPS, COLORS } from '../../lib/constants';

const TENSE_SECONDS = 5;
const RELAX_SECONDS = 10;

type PhaseType = 'tense' | 'relax';

export default function MuscleRelaxationScreen() {
  const [started, setStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [groupIndex, setGroupIndex] = useState(0);
  const [phase, setPhase] = useState<PhaseType>('tense');
  const [secondsLeft, setSecondsLeft] = useState(TENSE_SECONDS);
  const startTimeRef = useRef<number>(0);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const progressRef = useRef<Animated.CompositeAnimation | null>(null);

  const totalGroups = MUSCLE_GROUPS.length;
  const currentGroup = MUSCLE_GROUPS[groupIndex];

  useEffect(() => {
    activateKeepAwakeAsync();
    return () => { deactivateKeepAwake(); };
  }, []);

  const fadeTransition = (callback: () => void) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      callback();
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  };

  useEffect(() => {
    if (!started || isFinished) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const duration = phase === 'tense' ? TENSE_SECONDS : RELAX_SECONDS;
    let remaining = duration;
    setSecondsLeft(remaining);

    progressAnim.setValue(0);
    if (progressRef.current) progressRef.current.stop();
    progressRef.current = Animated.timing(progressAnim, {
      toValue: 1,
      duration: duration * 1000,
      useNativeDriver: false,
    });
    progressRef.current.start();

    const interval = setInterval(() => {
      remaining -= 1;
      setSecondsLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        if (phase === 'tense') {
          fadeTransition(() => setPhase('relax'));
        } else {
          if (groupIndex >= totalGroups - 1) {
            const dur = Math.floor((Date.now() - startTimeRef.current) / 1000);
            insertExerciseSession({
              type: 'muscle_relaxation',
              duration_seconds: dur,
              completed: true,
              date: new Date().toISOString().split('T')[0],
            }).catch(console.error);
            fadeTransition(() => setIsFinished(true));
          } else {
            fadeTransition(() => {
              setGroupIndex((i) => i + 1);
              setPhase('tense');
            });
          }
        }
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      if (progressRef.current) progressRef.current.stop();
    };
  }, [started, groupIndex, phase, isFinished]);

  const handleStart = () => {
    startTimeRef.current = Date.now();
    setStarted(true);
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const isTense = phase === 'tense';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Progressive Entspannung</Text>
        <Pressable
          onPress={() => router.back()}
          style={styles.closeBtn}
          accessibilityLabel="Schließen"
          accessibilityRole="button"
        >
          <X size={22} color={COLORS.muted} />
        </Pressable>
      </View>

      <View style={styles.container}>
        {isFinished ? (
          <View style={styles.finishedBlock}>
            <Text style={styles.finishedEmoji}>🌊</Text>
            <Text style={styles.finishedTitle}>Wunderbar.</Text>
            <Text style={styles.finishedText}>
              Dein ganzer Körper ist jetzt entspannt.{'\n'}
              Nimm dir einen Moment und spüre nach.
            </Text>
            <Pressable
              onPress={() => router.back()}
              style={styles.doneBtn}
              accessibilityLabel="Fertig"
              accessibilityRole="button"
            >
              <Text style={styles.doneBtnText}>Fertig</Text>
            </Pressable>
          </View>
        ) : !started ? (
          <View style={styles.introBlock}>
            <Text style={styles.introEmoji}>🌊</Text>
            <Text style={styles.introTitle}>Progressive Muskelentspannung</Text>
            <Text style={styles.introText}>
              Du wirst durch {totalGroups} Muskelgruppen geführt.{'\n\n'}
              Jede Gruppe: <Text style={styles.bold}>{TENSE_SECONDS}s anspannen</Text>, dann{' '}
              <Text style={styles.bold}>{RELAX_SECONDS}s loslassen</Text>.{'\n\n'}
              Spüre bewusst den Unterschied zwischen Anspannung und Entspannung.
            </Text>
            <View style={styles.groupList}>
              {MUSCLE_GROUPS.map((g, i) => (
                <Text key={i} style={styles.groupListItem}>
                  {g.emoji} {g.name}
                </Text>
              ))}
            </View>
            <Pressable
              onPress={handleStart}
              style={styles.startBtn}
              accessibilityLabel="Übung starten"
              accessibilityRole="button"
            >
              <Text style={styles.startBtnText}>Starten</Text>
            </Pressable>
          </View>
        ) : (
          <Animated.View style={[styles.exerciseBlock, { opacity: fadeAnim }]}>
            <Text style={styles.groupProgress}>
              {groupIndex + 1} / {totalGroups}
            </Text>

            <Text style={styles.groupEmoji}>{currentGroup.emoji}</Text>

            <Text style={styles.groupName}>{currentGroup.name}</Text>

            <View style={[styles.phaseBadge, isTense ? styles.phaseTense : styles.phaseRelax]}>
              <Text style={styles.phaseText}>
                {isTense ? '⚡ Anspannen' : '🌿 Loslassen'}
              </Text>
            </View>

            <Text style={styles.instruction}>{currentGroup.instruction}</Text>

            <Text style={styles.countdown}>{secondsLeft}s</Text>

            <View style={styles.progressBar}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width: progressWidth,
                    backgroundColor: isTense ? COLORS.danger : COLORS.accent2,
                  },
                ]}
              />
            </View>

            {groupIndex < totalGroups - 1 && (
              <Text style={styles.upcoming}>
                Nächste: {MUSCLE_GROUPS[groupIndex + 1].emoji} {MUSCLE_GROUPS[groupIndex + 1].name}
              </Text>
            )}
          </Animated.View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  closeBtn: {
    padding: 8,
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  introBlock: { alignItems: 'center', gap: 16, width: '100%' },
  introEmoji: { fontSize: 52 },
  introTitle: { color: COLORS.text, fontSize: 22, fontWeight: '700', textAlign: 'center' },
  introText: {
    color: COLORS.muted,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  bold: { color: COLORS.text, fontWeight: '700' },
  groupList: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  groupListItem: { color: COLORS.muted, fontSize: 13 },
  startBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    paddingHorizontal: 48,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 160,
    marginTop: 8,
  },
  startBtnText: { color: COLORS.bg, fontSize: 18, fontWeight: '700' },
  exerciseBlock: { alignItems: 'center', gap: 16, width: '100%' },
  groupProgress: { color: COLORS.muted, fontSize: 14, fontWeight: '600' },
  groupEmoji: { fontSize: 60, marginTop: 4 },
  groupName: { color: COLORS.text, fontSize: 26, fontWeight: '700' },
  phaseBadge: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  phaseTense: { backgroundColor: COLORS.danger + '33' },
  phaseRelax: { backgroundColor: COLORS.accent2 + '33' },
  phaseText: { color: COLORS.text, fontSize: 16, fontWeight: '600' },
  instruction: {
    color: COLORS.muted,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  countdown: {
    color: COLORS.text,
    fontSize: 42,
    fontWeight: '800',
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: COLORS.surface2,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  upcoming: { color: COLORS.muted, fontSize: 13, marginTop: 4 },
  finishedBlock: { alignItems: 'center', gap: 20, paddingHorizontal: 16 },
  finishedEmoji: { fontSize: 64 },
  finishedTitle: { color: COLORS.text, fontSize: 28, fontWeight: '700' },
  finishedText: {
    color: COLORS.muted,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  doneBtn: {
    backgroundColor: COLORS.accent2,
    borderRadius: 16,
    paddingHorizontal: 48,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 160,
  },
  doneBtnText: { color: COLORS.bg, fontSize: 18, fontWeight: '700' },
});
