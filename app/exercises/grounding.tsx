import React, { useState, useRef } from 'react';
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
import { X, ChevronRight } from 'lucide-react-native';
import { insertExerciseSession } from '../../lib/database';
import { GROUNDING_STEPS, COLORS } from '../../lib/constants';

export default function GroundingScreen() {
  const [stepIndex, setStepIndex] = useState(-1);
  const [isFinished, setIsFinished] = useState(false);
  const startTimeRef = useRef<number>(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const totalSteps = GROUNDING_STEPS.length;
  const currentStep = stepIndex >= 0 && stepIndex < totalSteps ? GROUNDING_STEPS[stepIndex] : null;

  const fadeTransition = (callback: () => void) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
      callback();
      Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    });
  };

  const handleStart = () => {
    startTimeRef.current = Date.now();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    fadeTransition(() => setStepIndex(0));
  };

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (stepIndex >= totalSteps - 1) {
      const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
      insertExerciseSession({
        type: 'grounding',
        duration_seconds: duration,
        completed: true,
        date: new Date().toISOString().split('T')[0],
      }).catch(console.error);
      fadeTransition(() => setIsFinished(true));
    } else {
      fadeTransition(() => setStepIndex((i) => i + 1));
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>5-4-3-2-1 Grounding</Text>
        <Pressable
          onPress={() => router.back()}
          style={styles.closeBtn}
          accessibilityLabel="Schließen"
          accessibilityRole="button"
        >
          <X size={22} color={COLORS.muted} />
        </Pressable>
      </View>

      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        {isFinished ? (
          <View style={styles.finishedBlock}>
            <Text style={styles.finishedEmoji}>⚓</Text>
            <Text style={styles.finishedTitle}>Du bist geerdet.</Text>
            <Text style={styles.finishedText}>
              Gut gemacht. Dein Geist ist wieder im Hier und Jetzt.{'\n'}
              Du bist sicher.
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
        ) : stepIndex === -1 ? (
          <View style={styles.introBlock}>
            <Text style={styles.introEmoji}>⚓</Text>
            <Text style={styles.introTitle}>Grounding-Übung</Text>
            <Text style={styles.introText}>
              Diese Technik holt dich zurück ins Hier und Jetzt.{'\n\n'}
              Du wirst durch deine 5 Sinne geführt und nennst dabei Dinge aus deiner Umgebung —
              innerlich oder laut. Es gibt kein Richtig oder Falsch.
            </Text>
            <View style={styles.stepsPreview}>
              {GROUNDING_STEPS.map((s, i) => (
                <View key={i} style={styles.previewRow}>
                  <Text style={styles.previewNum}>{s.count}</Text>
                  <Text style={styles.previewSense}>{s.sense}</Text>
                  <Text style={styles.previewEmoji}>{s.emoji}</Text>
                </View>
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
        ) : currentStep ? (
          <View style={styles.stepBlock}>
            <View style={styles.progressDots}>
              {GROUNDING_STEPS.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    i === stepIndex && styles.dotActive,
                    i < stepIndex && styles.dotDone,
                  ]}
                />
              ))}
            </View>

            <Text style={styles.stepEmoji}>{currentStep.emoji}</Text>

            <View style={styles.countBubble}>
              <Text style={styles.countNum}>{currentStep.count}</Text>
            </View>

            <Text style={styles.stepSense}>
              Dinge die du <Text style={styles.stepSenseHighlight}>{currentStep.sense}</Text>
            </Text>

            <Text style={styles.stepInstruction}>{currentStep.instruction}</Text>

            <Text style={styles.stepHint}>
              Nimm dir die Zeit die du brauchst.
            </Text>

            <Pressable
              onPress={handleNext}
              style={styles.nextBtn}
              accessibilityLabel={stepIndex >= totalSteps - 1 ? 'Abschließen' : 'Weiter'}
              accessibilityRole="button"
            >
              <Text style={styles.nextBtnText}>
                {stepIndex >= totalSteps - 1 ? 'Abschließen' : 'Weiter'}
              </Text>
              {stepIndex < totalSteps - 1 && (
                <ChevronRight size={20} color={COLORS.bg} />
              )}
            </Pressable>
          </View>
        ) : null}
      </Animated.View>
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
    paddingHorizontal: 28,
  },
  introBlock: { alignItems: 'center', gap: 20, width: '100%' },
  introEmoji: { fontSize: 56 },
  introTitle: { color: COLORS.text, fontSize: 24, fontWeight: '700' },
  introText: {
    color: COLORS.muted,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  stepsPreview: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    width: '100%',
    gap: 10,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  previewNum: {
    color: COLORS.accent,
    fontSize: 22,
    fontWeight: '800',
    width: 28,
    textAlign: 'center',
  },
  previewSense: { color: COLORS.text, fontSize: 15, flex: 1 },
  previewEmoji: { fontSize: 20 },
  stepBlock: { alignItems: 'center', gap: 20, width: '100%' },
  progressDots: { flexDirection: 'row', gap: 8 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.surface2,
  },
  dotActive: { backgroundColor: COLORS.accent, width: 24 },
  dotDone: { backgroundColor: COLORS.accent + '66' },
  stepEmoji: { fontSize: 52, marginTop: 8 },
  countBubble: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.accent + '22',
    borderWidth: 2,
    borderColor: COLORS.accent + '66',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countNum: { color: COLORS.accent, fontSize: 48, fontWeight: '800' },
  stepSense: {
    color: COLORS.muted,
    fontSize: 16,
    textAlign: 'center',
  },
  stepSenseHighlight: { color: COLORS.text, fontWeight: '700' },
  stepInstruction: {
    color: COLORS.text,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 8,
  },
  stepHint: { color: COLORS.muted, fontSize: 13, textAlign: 'center' },
  nextBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    paddingHorizontal: 36,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minWidth: 160,
    marginTop: 8,
  },
  nextBtnText: { color: COLORS.bg, fontSize: 17, fontWeight: '700' },
  startBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    paddingHorizontal: 48,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 160,
  },
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
