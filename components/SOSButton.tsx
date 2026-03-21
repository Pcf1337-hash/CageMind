import React, { useEffect } from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { COLORS } from '../lib/constants';

interface SOSButtonProps {
  onPress: () => void;
}

export default function SOSButton({ onPress }: SOSButtonProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.2, { duration: 800 }),
        withTiming(0.6, { duration: 800 })
      ),
      -1,
      false
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Pressable
      onPress={onPress}
      style={styles.container}
      accessibilityLabel="SOS - Soforthilfe"
      accessibilityRole="button"
    >
      <Animated.View style={[styles.pulse, pulseStyle]} />
      <Animated.View style={styles.button}>
        <Text style={styles.label}>SOS</Text>
        <Text style={styles.sublabel}>Ich brauche Hilfe</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 130,
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulse: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: COLORS.danger,
  },
  button: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: COLORS.danger,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  label: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 2,
  },
  sublabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
});
