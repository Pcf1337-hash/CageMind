import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  Alert,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { X, ChevronLeft, ChevronRight } from 'lucide-react-native';
import AffirmationCard from '../../components/AffirmationCard';
import { getSetting, setSetting, insertExerciseSession } from '../../lib/database';
import { AFFIRMATIONS, COLORS } from '../../lib/constants';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;

export default function AffirmationsScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [sessionStarted] = useState(Date.now());

  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);

  const loadFavorites = useCallback(async () => {
    try {
      const raw = await getSetting('affirmation_favorites');
      if (raw) {
        const parsed = JSON.parse(raw) as number[];
        setFavorites(new Set(parsed));
      }
    } catch {
      // Ignore
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFavorites();
      return () => {
        const duration = Math.floor((Date.now() - sessionStarted) / 1000);
        insertExerciseSession({
          type: 'affirmations',
          duration_seconds: duration,
          completed: true,
          date: new Date().toISOString().split('T')[0],
        }).catch(console.error);
      };
    }, [loadFavorites])
  );

  const goTo = useCallback(
    (dir: 'next' | 'prev') => {
      const next = dir === 'next'
        ? Math.min(currentIndex + 1, AFFIRMATIONS.length - 1)
        : Math.max(currentIndex - 1, 0);
      if (next === currentIndex) return;

      opacity.value = withTiming(0, { duration: 150 }, () => {
        runOnJS(setCurrentIndex)(next);
        translateX.value = dir === 'next' ? 60 : -60;
        translateX.value = withSpring(0, { damping: 18, stiffness: 200 });
        opacity.value = withTiming(1, { duration: 200 });
      });
    },
    [currentIndex]
  );

  const pan = Gesture.Pan()
    .onEnd((e) => {
      if (e.translationX < -SWIPE_THRESHOLD) {
        runOnJS(goTo)('next');
      } else if (e.translationX > SWIPE_THRESHOLD) {
        runOnJS(goTo)('prev');
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }));

  const toggleFavorite = async () => {
    const newFavs = new Set(favorites);
    if (newFavs.has(currentIndex)) {
      newFavs.delete(currentIndex);
    } else {
      newFavs.add(currentIndex);
    }
    setFavorites(newFavs);
    await setSetting('affirmation_favorites', JSON.stringify([...newFavs]));
  };

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.title}>Affirmationen</Text>
          <Pressable
            onPress={() => router.back()}
            style={styles.closeBtn}
            accessibilityLabel="Schlieben"
            accessibilityRole="button"
          >
            <X size={22} color={COLORS.muted} />
          </Pressable>
        </View>

        <View style={styles.container}>
          <GestureDetector gesture={pan}>
            <Animated.View style={[styles.cardWrapper, cardStyle]}>
              <AffirmationCard
                text={AFFIRMATIONS[currentIndex]}
                isFavorite={favorites.has(currentIndex)}
                onToggleFavorite={toggleFavorite}
                index={currentIndex}
                total={AFFIRMATIONS.length}
              />
            </Animated.View>
          </GestureDetector>

          <View style={styles.navRow}>
            <Pressable
              onPress={() => goTo('prev')}
              disabled={currentIndex === 0}
              style={[styles.navBtn, currentIndex === 0 && styles.navBtnDisabled]}
              accessibilityLabel="Vorherige Affirmation"
              accessibilityRole="button"
            >
              <ChevronLeft size={24} color={currentIndex === 0 ? COLORS.muted : COLORS.text} />
            </Pressable>

            <Text style={styles.swipeHint}>Wischen zum Blattern</Text>

            <Pressable
              onPress={() => goTo('next')}
              disabled={currentIndex === AFFIRMATIONS.length - 1}
              style={[
                styles.navBtn,
                currentIndex === AFFIRMATIONS.length - 1 && styles.navBtnDisabled,
              ]}
              accessibilityLabel="Nachste Affirmation"
              accessibilityRole="button"
            >
              <ChevronRight
                size={24}
                color={currentIndex === AFFIRMATIONS.length - 1 ? COLORS.muted : COLORS.text}
              />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  safe: { flex: 1 },
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
    paddingHorizontal: 20,
    justifyContent: 'center',
    gap: 32,
  },
  cardWrapper: { width: '100%' },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 24,
  },
  navBtnDisabled: { opacity: 0.3 },
  swipeHint: { color: COLORS.muted, fontSize: 12 },
});
