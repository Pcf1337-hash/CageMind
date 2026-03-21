import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { X, MessageCircle, Wind } from 'lucide-react-native';
import CrisisBanner from '../components/CrisisBanner';
import { COLORS } from '../lib/constants';

const STEPS = [
  {
    num: '1',
    title: 'Einmal tief einatmen',
    desc: 'Atme langsam ein... und langsam aus. Nur dieser Moment.',
    emoji: '🌬️',
  },
  {
    num: '2',
    title: '3 Dinge die du siehst',
    desc: 'Schau dich um. Nenn 3 Dinge, die du gerade siehst. Das bringt dich ins Hier und Jetzt.',
    emoji: '👁️',
  },
  {
    num: '3',
    title: 'Du bist sicher',
    desc: 'Dieser Moment geht vorbei. Du hast schwierige Momente schon uberstanden. Auch diesen.',
    emoji: '💜',
  },
] as const;

export default function SOSScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View />
        <Pressable
          onPress={() => router.back()}
          style={styles.closeBtn}
          accessibilityLabel="SOS-Screen schlieben"
          accessibilityRole="button"
        >
          <X size={24} color={COLORS.muted} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.headline}>Hey.{'\n'}Ich bin hier.</Text>
        <Text style={styles.subline}>Lass uns das zusammen angehen.</Text>

        <View style={styles.steps}>
          {STEPS.map((step) => (
            <View key={step.num} style={styles.stepCard}>
              <View style={styles.stepHeader}>
                <View style={styles.stepNumBox}>
                  <Text style={styles.stepNum}>{step.num}</Text>
                </View>
                <Text style={styles.stepEmoji}>{step.emoji}</Text>
              </View>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepDesc}>{step.desc}</Text>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={() => {
              router.back();
              router.push('/(tabs)/chat');
            }}
            style={styles.actionBtn}
            accessibilityLabel="Mit CageMind sprechen"
            accessibilityRole="button"
          >
            <MessageCircle size={20} color="#fff" />
            <Text style={styles.actionBtnText}>Mit CageMind sprechen</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              router.back();
              router.push('/exercises/breathing');
            }}
            style={[styles.actionBtn, styles.actionBtnSecondary]}
            accessibilityLabel="Atemubung starten"
            accessibilityRole="button"
          >
            <Wind size={20} color={COLORS.accent} />
            <Text style={[styles.actionBtnText, styles.actionBtnTextSecondary]}>
              Atemubung starten
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <View style={styles.crisisBannerWrapper}>
        <CrisisBanner />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  closeBtn: {
    padding: 8,
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    paddingHorizontal: 24,
    paddingBottom: 120,
    gap: 24,
  },
  headline: {
    color: COLORS.text,
    fontSize: 42,
    fontWeight: '800',
    lineHeight: 52,
  },
  subline: {
    color: COLORS.muted,
    fontSize: 18,
    marginTop: -12,
  },
  steps: { gap: 14 },
  stepCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 20,
    gap: 8,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepNumBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.danger + '33',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNum: {
    color: COLORS.danger,
    fontSize: 16,
    fontWeight: '700',
  },
  stepEmoji: { fontSize: 24 },
  stepTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '700',
  },
  stepDesc: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  actions: { gap: 12 },
  actionBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  actionBtnSecondary: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  actionBtnTextSecondary: {
    color: COLORS.accent,
  },
  crisisBannerWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 24,
    backgroundColor: COLORS.bg,
    borderTopWidth: 1,
    borderTopColor: COLORS.surface,
  },
});
