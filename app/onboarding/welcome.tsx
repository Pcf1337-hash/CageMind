import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { COLORS } from '../../lib/constants';

export default function WelcomeScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.logoBlock}>
          <Text style={styles.logoEmoji}>💜</Text>
          <Text style={styles.appName}>CageMind</Text>
          <Text style={styles.tagline}>Dein digitaler Begleiter</Text>
        </View>

        <View style={styles.textBlock}>
          <Text style={styles.headline}>Hey, ich bin CageMind.</Text>
          <Text style={styles.body}>
            Ich bin hier, um dir zuzuhören — in ruhigen Momenten und in
            schwierigen. Kein Urteil, keine Eile. Nur ein offenes Ohr.
          </Text>
        </View>

        <Pressable
          onPress={() => router.push('/onboarding/disclaimer')}
          style={styles.btn}
          accessibilityLabel="Weiter zur nächsten Seite"
          accessibilityRole="button"
        >
          <Text style={styles.btnText}>Los geht's</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  container: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 48,
  },
  logoBlock: {
    alignItems: 'center',
    gap: 8,
  },
  logoEmoji: {
    fontSize: 72,
  },
  appName: {
    color: COLORS.text,
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 1,
  },
  tagline: {
    color: COLORS.muted,
    fontSize: 16,
  },
  textBlock: {
    gap: 12,
  },
  headline: {
    color: COLORS.text,
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 34,
  },
  body: {
    color: COLORS.muted,
    fontSize: 17,
    lineHeight: 26,
  },
  btn: {
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
