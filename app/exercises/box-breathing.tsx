import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { X } from 'lucide-react-native';
import BreathCircle from '../../components/BreathCircle';
import { insertExerciseSession } from '../../lib/database';
import { BOX_BREATHING_PHASES, BOX_BREATHING_ROUNDS, COLORS } from '../../lib/constants';

type Phase = (typeof BOX_BREATHING_PHASES)[number];

export default function BoxBreathingScreen() {
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState<number>(BOX_BREATHING_PHASES[0].duration);
  const [currentRound, setCurrentRound] = useState(1);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const scale = useSharedValue(1);
  const startTimeRef = useRef<number>(0);

  const currentPhase: Phase = BOX_BREATHING_PHASES[currentPhaseIndex];

  useEffect(() => {
    activateKeepAwakeAsync();
    return () => { deactivateKeepAwake(); };
  }, []);

  const animatePhase = useCallback((phase: Phase) => {
    if (phase.label === 'Einatmen') {
      scale.value = withTiming(1.4, {
        duration: phase.duration * 1000,
        easing: Easing.inOut(Easing.ease),
      });
    } else if (phase.label === 'Ausatmen') {
      scale.value = withTiming(1, {
        duration: phase.duration * 1000,
        easing: Easing.inOut(Easing.ease),
      });
    }
  }, [scale]);

  useEffect(() => {
    if (!isRunning || isFinished) return;

    animatePhase(currentPhase);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    let remaining = currentPhase.duration;
    setSecondsLeft(remaining);

    const interval = setInterval(() => {
      remaining -= 1;
      setSecondsLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        const nextPhaseIndex = (currentPhaseIndex + 1) % BOX_BREATHING_PHASES.length;
        const isEndOfRound = nextPhaseIndex === 0;

        if (isEndOfRound && currentRound >= BOX_BREATHING_ROUNDS) {
          setIsRunning(false);
          setIsFinished(true);
          const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
          insertExerciseSession({
            type: 'box_breathing',
            duration_seconds: duration,
            completed: true,
            date: new Date().toISOString().split('T')[0],
          }).catch(console.error);
        } else {
          if (isEndOfRound) setCurrentRound((r) => r + 1);
          setCurrentPhaseIndex(nextPhaseIndex);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, currentPhaseIndex, currentRound, isFinished, animatePhase, currentPhase]);

  const handleStart = () => {
    startTimeRef.current = Date.now();
    setIsRunning(true);
  };

  const handleStop = () => {
    Alert.alert(
      'Übung beenden?',
      'Möchtest du die Atemübung vorzeitig beenden?',
      [
        { text: 'Weitermachen', style: 'cancel' },
        {
          text: 'Beenden',
          onPress: () => { setIsRunning(false); router.back(); },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Quadrat-Atmung</Text>
        <Pressable
          onPress={isRunning ? handleStop : () => router.back()}
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
            <Text style={styles.finishedEmoji}>🟦</Text>
            <Text style={styles.finishedTitle}>Gut gemacht!</Text>
            <Text style={styles.finishedText}>
              {BOX_BREATHING_ROUNDS} Runden Quadrat-Atmung abgeschlossen.{'\n'}
              Dein Nervensystem dankt es dir.
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
        ) : (
          <>
            <Text style={styles.roundIndicator}>
              Runde {currentRound} / {BOX_BREATHING_ROUNDS}
            </Text>

            <BreathCircle
              scale={scale}
              phaseLabel={isRunning ? currentPhase.label : 'Bereit?'}
              secondsLeft={isRunning ? secondsLeft : 0}
              phaseColor={isRunning ? currentPhase.color : COLORS.muted}
            />

            {!isRunning && (
              <View style={styles.instructions}>
                <Text style={styles.instrTitle}>4 — 4 — 4 — 4</Text>
                <Text style={styles.instrText}>Einatmen · Halten · Ausatmen · Halten</Text>
                <Text style={styles.instrSub}>
                  Jede Phase dauert genau 4 Sekunden.{'\n'}
                  Einfach, gleichmäßig, beruhigend.
                </Text>
              </View>
            )}

            <Pressable
              onPress={isRunning ? handleStop : handleStart}
              style={[styles.startBtn, isRunning && styles.stopBtn]}
              accessibilityLabel={isRunning ? 'Übung stoppen' : 'Übung starten'}
              accessibilityRole="button"
            >
              <Text style={styles.startBtnText}>
                {isRunning ? 'Stoppen' : 'Starten'}
              </Text>
            </Pressable>
          </>
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
  title: { color: COLORS.text, fontSize: 20, fontWeight: '700' },
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
    paddingHorizontal: 32,
    gap: 32,
  },
  roundIndicator: { color: COLORS.muted, fontSize: 14, fontWeight: '600' },
  instructions: { alignItems: 'center', gap: 8 },
  instrTitle: {
    color: COLORS.accent2,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 2,
  },
  instrText: { color: COLORS.text, fontSize: 15 },
  instrSub: {
    color: COLORS.muted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 4,
  },
  startBtn: {
    backgroundColor: COLORS.accent2,
    borderRadius: 16,
    paddingHorizontal: 48,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 160,
  },
  stopBtn: { backgroundColor: COLORS.surface2 },
  startBtnText: { color: COLORS.bg, fontSize: 18, fontWeight: '700' },
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
