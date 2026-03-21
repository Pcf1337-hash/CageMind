import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import {
  useSharedValue,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { X } from 'lucide-react-native';
import BreathCircle from '../../components/BreathCircle';
import { insertExerciseSession } from '../../lib/database';
import { BREATHING_PHASES, BREATHING_ROUNDS, COLORS } from '../../lib/constants';

type Phase = (typeof BREATHING_PHASES)[number];

export default function BreathingScreen() {
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState<number>(BREATHING_PHASES[0].duration);
  const [currentRound, setCurrentRound] = useState(1);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const scale = useSharedValue(1);
  const startTimeRef = useRef<number>(0);

  const currentPhase: Phase = BREATHING_PHASES[currentPhaseIndex];

  useEffect(() => {
    activateKeepAwakeAsync();
    return () => {
      deactivateKeepAwake();
    };
  }, []);

  const animatePhase = useCallback((phase: Phase) => {
    if (phase.label === 'Einatmen') {
      scale.value = withTiming(1.4, {
        duration: phase.duration * 1000,
        easing: Easing.inOut(Easing.ease),
      });
    } else if (phase.label === 'Halten') {
      // No change
    } else {
      scale.value = withTiming(1, {
        duration: phase.duration * 1000,
        easing: Easing.inOut(Easing.ease),
      });
    }
  }, []);

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

        const nextPhaseIndex = (currentPhaseIndex + 1) % BREATHING_PHASES.length;
        const isEndOfRound = nextPhaseIndex === 0;

        if (isEndOfRound && currentRound >= BREATHING_ROUNDS) {
          setIsRunning(false);
          setIsFinished(true);
          const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
          insertExerciseSession({
            type: 'breathing',
            duration_seconds: duration,
            completed: true,
            date: new Date().toISOString().split('T')[0],
          }).catch(console.error);
        } else {
          if (isEndOfRound) {
            setCurrentRound((r) => r + 1);
          }
          setCurrentPhaseIndex(nextPhaseIndex);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, currentPhaseIndex, currentRound, isFinished]);

  const handleStart = () => {
    startTimeRef.current = Date.now();
    setIsRunning(true);
  };

  const handleStop = () => {
    Alert.alert(
      'Ubung beenden?',
      'Mochtest du die Atemubung vorzeitig beenden?',
      [
        { text: 'Weitermachen', style: 'cancel' },
        {
          text: 'Beenden',
          onPress: () => {
            setIsRunning(false);
            router.back();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>4-7-8 Atemubung</Text>
        <Pressable
          onPress={isRunning ? handleStop : () => router.back()}
          style={styles.closeBtn}
          accessibilityLabel="Schlieben"
          accessibilityRole="button"
        >
          <X size={22} color={COLORS.muted} />
        </Pressable>
      </View>

      <View style={styles.container}>
        {isFinished ? (
          <View style={styles.finishedBlock}>
            <Text style={styles.finishedEmoji}>🌿</Text>
            <Text style={styles.finishedTitle}>Gut gemacht!</Text>
            <Text style={styles.finishedText}>
              Du hast {BREATHING_ROUNDS} Runden abgeschlossen.
              Dein Korper wird es dir danken.
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
              Runde {currentRound} / {BREATHING_ROUNDS}
            </Text>

            <BreathCircle
              scale={scale}
              phaseLabel={isRunning ? currentPhase.label : 'Bereit?'}
              secondsLeft={isRunning ? secondsLeft : 0}
              phaseColor={isRunning ? currentPhase.color : COLORS.muted}
            />

            {!isRunning && (
              <View style={styles.instructions}>
                <Text style={styles.instrText}>
                  Einatmen: 4 Sekunden
                </Text>
                <Text style={styles.instrText}>
                  Halten: 7 Sekunden
                </Text>
                <Text style={styles.instrText}>
                  Ausatmen: 8 Sekunden
                </Text>
              </View>
            )}

            <Pressable
              onPress={isRunning ? handleStop : handleStart}
              style={[styles.startBtn, isRunning && styles.stopBtn]}
              accessibilityLabel={isRunning ? 'Ubung stoppen' : 'Ubung starten'}
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
  roundIndicator: {
    color: COLORS.muted,
    fontSize: 14,
    fontWeight: '600',
  },
  instructions: {
    gap: 6,
    alignItems: 'center',
  },
  instrText: {
    color: COLORS.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  startBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    paddingHorizontal: 48,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 160,
  },
  stopBtn: {
    backgroundColor: COLORS.surface2,
  },
  startBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  finishedBlock: {
    alignItems: 'center',
    gap: 20,
    paddingHorizontal: 16,
  },
  finishedEmoji: { fontSize: 64 },
  finishedTitle: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: '700',
  },
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
  doneBtnText: {
    color: COLORS.bg,
    fontSize: 18,
    fontWeight: '700',
  },
});
