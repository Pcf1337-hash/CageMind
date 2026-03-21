import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Pressable,
  Alert,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Settings, Wind, MessageCircle, BookOpen } from 'lucide-react-native';
import SOSButton from '../../components/SOSButton';
import MoodPicker from '../../components/MoodPicker';
import StreakCard from '../../components/StreakCard';
import AffirmationCard from '../../components/AffirmationCard';
import {
  getSetting,
  insertMoodEntry,
  getStreak,
} from '../../lib/database';
import {
  getGreeting,
  getDailyAffirmation,
  MOOD_EMOJIS,
  COLORS,
} from '../../lib/constants';

export default function HomeScreen() {
  const [userName, setUserName] = useState('');
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [moodSaved, setMoodSaved] = useState(false);
  const [streak, setStreak] = useState(0);
  const affirmation = getDailyAffirmation();

  const loadData = useCallback(async () => {
    try {
      const name = await getSetting('user_name');
      if (name) setUserName(name);
      const s = await getStreak();
      setStreak(s);
    } catch (e) {
      console.error('HomeScreen load error:', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleMoodSelect = async (score: number) => {
    setSelectedMood(score);
    try {
      const today = new Date().toISOString().split('T')[0];
      await insertMoodEntry({
        date: today,
        mood_score: score,
        emoji: MOOD_EMOJIS[score],
        note: '',
      });
      setMoodSaved(true);
      const s = await getStreak();
      setStreak(s);
    } catch {
      Alert.alert('Fehler', 'Stimmung konnte nicht gespeichert werden.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              {getGreeting()}{userName ? `, ${userName}` : ''}
            </Text>
            <Text style={styles.date}>
              {new Date().toLocaleDateString('de-DE', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/settings')}
            style={styles.settingsBtn}
            accessibilityLabel="Einstellungen offnen"
            accessibilityRole="button"
          >
            <Settings size={22} color={COLORS.muted} />
          </Pressable>
        </View>

        {/* Affirmation */}
        <AffirmationCard text={affirmation} />

        {/* Mood */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {moodSaved ? 'Stimmung gespeichert' : 'Wie geht es dir gerade?'}
          </Text>
          {moodSaved ? (
            <Text style={styles.moodSaved}>
              {MOOD_EMOJIS[selectedMood!]}{'  '}Super, dass du eincheckst.
            </Text>
          ) : (
            <MoodPicker selected={selectedMood} onSelect={handleMoodSelect} />
          )}
        </View>

        {/* SOS */}
        <View style={styles.sosSection}>
          <SOSButton onPress={() => router.push('/sos')} />
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Schnellzugriff</Text>
          <View style={styles.quickActions}>
            <Pressable
              onPress={() => router.push('/(tabs)/chat')}
              style={styles.quickCard}
              accessibilityLabel="Chat offnen"
              accessibilityRole="button"
            >
              <MessageCircle size={28} color={COLORS.accent} />
              <Text style={styles.quickLabel}>Chat</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/exercises/breathing')}
              style={styles.quickCard}
              accessibilityLabel="Atemubung starten"
              accessibilityRole="button"
            >
              <Wind size={28} color={COLORS.accent2} />
              <Text style={styles.quickLabel}>Atemubung</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/(tabs)/journal')}
              style={styles.quickCard}
              accessibilityLabel="Tagebuch offnen"
              accessibilityRole="button"
            >
              <BookOpen size={28} color={COLORS.warm} />
              <Text style={styles.quickLabel}>Tagebuch</Text>
            </Pressable>
          </View>
        </View>

        {/* Streak */}
        <StreakCard streak={streak} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '700',
  },
  date: {
    color: COLORS.muted,
    fontSize: 13,
    marginTop: 2,
  },
  settingsBtn: {
    padding: 8,
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: { gap: 12 },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  moodSaved: {
    color: COLORS.accent2,
    fontSize: 18,
    textAlign: 'center',
    paddingVertical: 12,
  },
  sosSection: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 10,
    minHeight: 90,
  },
  quickLabel: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '500',
  },
});
