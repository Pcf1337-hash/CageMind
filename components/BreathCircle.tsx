import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { COLORS } from '../lib/constants';

interface BreathCircleProps {
  scale: SharedValue<number>;
  phaseLabel: string;
  secondsLeft: number;
  phaseColor: string;
}

export default function BreathCircle({
  scale,
  phaseLabel,
  secondsLeft,
  phaseColor,
}: BreathCircleProps) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.container}>
      <Animated.View
        style={[styles.outerCircle, { backgroundColor: phaseColor + '22' }, animatedStyle]}
      />
      <View style={[styles.innerCircle, { borderColor: phaseColor }]}>
        <Text style={[styles.phaseLabel, { color: phaseColor }]}>{phaseLabel}</Text>
        <Text style={styles.seconds}>{secondsLeft}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 240,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerCircle: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
  },
  innerCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 3,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseLabel: {
    fontSize: 18,
    fontWeight: '600',
  },
  seconds: {
    fontSize: 42,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 4,
  },
});
