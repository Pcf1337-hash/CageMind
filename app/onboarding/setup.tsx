import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { setSetting } from '../../lib/database';
import { requestNotificationPermissions, scheduleDailyReminder } from '../../lib/notifications';
import { COLORS } from '../../lib/constants';

export default function SetupScreen() {
  const [name, setName] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    if (!name.trim()) {
      Alert.alert('Name fehlt', 'Bitte gib deinen Namen ein, damit ich dich ansprechen kann.');
      return;
    }

    setLoading(true);
    try {
      await setSetting('user_name', name.trim());
      await setSetting('onboarding_done', 'true');

      if (notificationsEnabled) {
        const granted = await requestNotificationPermissions();
        if (granted) {
          await scheduleDailyReminder(20, 0);
        }
      }

      router.replace('/(tabs)/home');
    } catch {
      Alert.alert('Fehler', 'Etwas ist schiefgelaufen. Bitte versuche es erneut.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestNotifications = async () => {
    const granted = await requestNotificationPermissions();
    setNotificationsEnabled(granted);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Noch kurz einrichten</Text>
          <Text style={styles.subtitle}>Das war's auch schon — versprochen.</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Wie soll ich dich nennen?</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Dein Name"
              placeholderTextColor={COLORS.muted}
              style={styles.input}
              autoFocus
              returnKeyType="next"
              maxLength={50}
              accessibilityLabel="Name eingeben"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Tägliche Erinnerung</Text>
            <Text style={styles.hint}>
              Ich erinnere dich täglich um 20:00 Uhr — damit du auch an dir denkst.
            </Text>
            <Pressable
              onPress={notificationsEnabled ? undefined : handleRequestNotifications}
              style={[
                styles.notifBtn,
                notificationsEnabled && styles.notifBtnActive,
              ]}
              accessibilityLabel={
                notificationsEnabled
                  ? 'Benachrichtigungen aktiviert'
                  : 'Benachrichtigungen aktivieren'
              }
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.notifBtnText,
                  notificationsEnabled && styles.notifBtnTextActive,
                ]}
              >
                {notificationsEnabled
                  ? 'Erinnerung aktiviert'
                  : 'Erinnerung aktivieren'}
              </Text>
            </Pressable>
          </View>

          <Pressable
            onPress={handleStart}
            disabled={loading || !name.trim()}
            style={[styles.btn, (!name.trim() || loading) && styles.btnDisabled]}
            accessibilityLabel="App starten"
            accessibilityRole="button"
          >
            <Text style={styles.btnText}>
              {loading ? 'Einen Moment...' : 'Loslegen'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  flex: { flex: 1 },
  container: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 48,
    gap: 24,
  },
  title: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 16,
    marginTop: -12,
  },
  field: { gap: 8 },
  label: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  hint: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: COLORS.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.surface2,
  },
  notifBtn: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.surface2,
  },
  notifBtnActive: {
    borderColor: COLORS.accent2,
    backgroundColor: COLORS.accent2 + '22',
  },
  notifBtnText: {
    color: COLORS.muted,
    fontSize: 15,
    fontWeight: '500',
  },
  notifBtnTextActive: {
    color: COLORS.accent2,
  },
  btn: {
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.4 },
  btnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
