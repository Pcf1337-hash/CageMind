import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { ChevronLeft, ExternalLink, RefreshCw, Check } from 'lucide-react-native';
import { getSetting, setSetting, clearAllData } from '../lib/database';
import { setApiKey, getApiKey } from '../lib/claude';
import {
  getReminderSettings,
  scheduleDailyReminder,
  cancelDailyReminder,
} from '../lib/notifications';
import {
  checkForUpdate,
  getLastCheckTimestamp,
  formatLastCheckTime,
  openDownloadUrl,
  skipVersion,
  isVersionSkipped,
  getCurrentVersion,
} from '../lib/updater';
import type { ReleaseInfo } from '../lib/updater';
import UpdateModal from '../components/UpdateModal';
import { COLORS } from '../lib/constants';

export default function SettingsScreen() {
  const [userName, setUserName] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [apiKeySaved, setApiKeySaved] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<string>('Noch nie');
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateRelease, setUpdateRelease] = useState<ReleaseInfo | null>(null);
  const [profileNotes, setProfileNotes] = useState<string>('');

  const loadData = useCallback(async () => {
    try {
      const name = await getSetting('user_name');
      if (name) setUserName(name);

      const key = await getApiKey();
      if (key) setApiKeyInput('****' + key.slice(-4));

      const reminder = await getReminderSettings();
      setReminderEnabled(reminder.enabled);

      const ts = await getLastCheckTimestamp();
      setLastCheckTime(formatLastCheckTime(ts));

      const notes = await getSetting('user_profile_notes');
      setProfileNotes(notes ?? '');
    } catch (e) {
      console.error('Settings load error:', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleSaveName = async () => {
    if (!userName.trim()) return;
    await setSetting('user_name', userName.trim());
    Alert.alert('Gespeichert', 'Dein Name wurde gespeichert.');
  };

  const handleSaveApiKey = async () => {
    const rawKey = apiKeyInput.replace(/^\*+/, '');
    if (!rawKey.trim()) return;
    await setApiKey(rawKey.trim());
    setApiKeySaved(true);
    setTimeout(() => setApiKeySaved(false), 2000);
  };

  const handleToggleReminder = async (value: boolean) => {
    setReminderEnabled(value);
    if (value) {
      await scheduleDailyReminder(20, 0);
    } else {
      await cancelDailyReminder();
    }
  };

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    try {
      const { hasUpdate, release } = await checkForUpdate();
      const ts = await getLastCheckTimestamp();
      setLastCheckTime(formatLastCheckTime(ts));

      if (hasUpdate && release) {
        setUpdateRelease(release);
      } else {
        Alert.alert('Alles aktuell', 'Du hast die neueste Version.');
      }
    } catch {
      Alert.alert('Fehler', 'Update-Check fehlgeschlagen.');
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleClearData = () => {
    Alert.alert(
      'Alle Daten löschen?',
      'Stimmungen, Tagebuch, Übungen, Chats und das gespeicherte Persönlichkeitsprofil werden unwiderruflich gelöscht.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Alles löschen',
          style: 'destructive',
          onPress: async () => {
            await clearAllData();
            Alert.alert('Erledigt', 'Alle Daten wurden gelöscht.');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityLabel="Zurück"
          accessibilityRole="button"
        >
          <ChevronLeft size={24} color={COLORS.text} />
        </Pressable>
        <Text style={styles.title}>Einstellungen</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Profil */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profil</Text>
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Dein Name</Text>
            <View style={styles.inputRow}>
              <TextInput
                value={userName}
                onChangeText={setUserName}
                placeholder="Name"
                placeholderTextColor={COLORS.muted}
                style={styles.input}
                returnKeyType="done"
                onSubmitEditing={handleSaveName}
                accessibilityLabel="Namen ändern"
              />
              <Pressable
                onPress={handleSaveName}
                style={styles.saveBtn}
                accessibilityLabel="Namen speichern"
                accessibilityRole="button"
              >
                <Check size={18} color="#fff" />
              </Pressable>
            </View>
          </View>
        </View>

        {/* Claude API */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>KI-Chat</Text>
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Anthropic API-Schlüssel</Text>
            <Text style={styles.fieldHint}>
              Benötigst du für den Chat. Erstelle ihn kostenlos unter console.anthropic.com
            </Text>
            <View style={styles.inputRow}>
              <TextInput
                value={apiKeyInput}
                onChangeText={setApiKeyInput}
                placeholder="sk-ant-..."
                placeholderTextColor={COLORS.muted}
                style={styles.input}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onFocus={() => setApiKeyInput('')}
                onSubmitEditing={handleSaveApiKey}
                accessibilityLabel="API-Schlüssel"
              />
              <Pressable
                onPress={handleSaveApiKey}
                style={[styles.saveBtn, apiKeySaved && styles.saveBtnSuccess]}
                accessibilityLabel="API-Schlüssel speichern"
                accessibilityRole="button"
              >
                <Check size={18} color="#fff" />
              </Pressable>
            </View>
            {apiKeySaved && (
              <Text style={styles.savedText}>Schlüssel gespeichert!</Text>
            )}
          </View>
        </View>

        {/* Erinnerungen */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Erinnerungen</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>Tägliche Erinnerung</Text>
                <Text style={styles.rowSub}>Jeden Tag um 20:00 Uhr</Text>
              </View>
              <Switch
                value={reminderEnabled}
                onValueChange={handleToggleReminder}
                trackColor={{ false: COLORS.surface2, true: COLORS.accent }}
                thumbColor="#fff"
                accessibilityLabel="Tägliche Erinnerung ein/aus"
              />
            </View>
          </View>
        </View>

        {/* Updates */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App & Updates</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Version</Text>
              <Text style={styles.rowValue}>{getCurrentVersion()}</Text>
            </View>

            <View style={styles.divider} />

            <Pressable
              onPress={handleCheckUpdate}
              disabled={checkingUpdate}
              style={styles.row}
              accessibilityLabel="Auf Updates prüfen"
              accessibilityRole="button"
            >
              <Text style={styles.rowLabel}>Auf Updates prüfen</Text>
              <RefreshCw
                size={18}
                color={checkingUpdate ? COLORS.muted : COLORS.accent}
              />
            </Pressable>

            <View style={styles.divider} />

            <View style={styles.row}>
              <Text style={styles.rowLabel}>Zuletzt geprüft</Text>
              <Text style={styles.rowValue}>{lastCheckTime}</Text>
            </View>

            <View style={styles.divider} />

            <Pressable
              onPress={() =>
                Linking.openURL('https://github.com/NosKovsky/CageMind/releases')
              }
              style={styles.row}
              accessibilityLabel="Alle Releases auf GitHub anzeigen"
              accessibilityRole="button"
            >
              <Text style={styles.rowLabel}>Alle Releases auf GitHub</Text>
              <ExternalLink size={16} color={COLORS.muted} />
            </Pressable>
          </View>
        </View>

        {/* Notfall */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notfallkontakte</Text>
          <View style={styles.card}>
            <Text style={styles.crisisText}>
              Telefonseelsorge: <Text style={styles.crisisNumber}>0800 111 0 111</Text>
            </Text>
            <Text style={styles.crisisSubText}>Kostenlos · 24/7 · Anonym</Text>
            <Text style={[styles.crisisText, { marginTop: 8 }]}>
              Telefonseelsorge: <Text style={styles.crisisNumber}>0800 111 0 222</Text>
            </Text>
            <Text style={[styles.crisisText, { marginTop: 8, paddingBottom: 14 }]}>
              Notruf: <Text style={styles.crisisNumber}>112</Text>
            </Text>
          </View>
        </View>

        {/* KI-Gedächtnis */}
        {profileNotes.trim().length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Was CageMind über dich weiß</Text>
            <View style={styles.card}>
              <Text style={styles.profileHint}>
                CageMind speichert aus euren Gesprächen ein anonymes Profil auf deinem Gerät — nur du siehst es.
              </Text>
              <View style={styles.profileBox}>
                {profileNotes.trim().split('\n').filter(Boolean).map((line, i) => (
                  <Text key={i} style={styles.profileLine}>{line}</Text>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Danger Zone */}
        <View style={styles.section}>
          <Pressable
            onPress={handleClearData}
            style={styles.dangerBtn}
            accessibilityLabel="Alle Daten löschen"
            accessibilityRole="button"
          >
            <Text style={styles.dangerBtnText}>Alle Daten löschen</Text>
          </Pressable>
        </View>

        <Text style={styles.disclaimer}>
          CageMind ersetzt keine professionelle Beratung oder Therapie.
          Diese App dient ausschließlich als ergänzende Unterstützung.
        </Text>
      </ScrollView>

      {updateRelease && (
        <UpdateModal
          visible={true}
          release={updateRelease}
          onDismiss={() => setUpdateRelease(null)}
          onSkip={async () => {
            await skipVersion(updateRelease.version);
            setUpdateRelease(null);
          }}
          onUpdate={async () => {
            await openDownloadUrl(updateRelease.downloadUrl);
            setUpdateRelease(null);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  backBtn: {
    padding: 8,
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: { width: 48 },
  title: {
    flex: 1,
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  container: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 20,
  },
  section: { gap: 10 },
  sectionTitle: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    overflow: 'hidden',
  },
  fieldLabel: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
  },
  fieldHint: {
    color: COLORS.muted,
    fontSize: 12,
    paddingHorizontal: 16,
    paddingBottom: 8,
    lineHeight: 16,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    paddingTop: 0,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.surface2,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: COLORS.text,
    fontSize: 15,
  },
  saveBtn: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnSuccess: { backgroundColor: COLORS.accent2 },
  savedText: {
    color: COLORS.accent2,
    fontSize: 13,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 52,
  },
  rowText: { flex: 1 },
  rowLabel: { color: COLORS.text, fontSize: 15 },
  rowSub: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
  rowValue: { color: COLORS.muted, fontSize: 14 },
  divider: {
    height: 1,
    backgroundColor: COLORS.surface2,
    marginHorizontal: 16,
  },
  crisisText: {
    color: COLORS.muted,
    fontSize: 14,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  crisisNumber: {
    color: COLORS.accent,
    fontWeight: '700',
  },
  crisisSubText: {
    color: COLORS.muted,
    fontSize: 12,
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 14,
  },
  profileHint: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 17,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  profileBox: {
    backgroundColor: COLORS.surface2,
    marginHorizontal: 12,
    marginBottom: 14,
    borderRadius: 10,
    padding: 12,
    gap: 4,
  },
  profileLine: {
    color: COLORS.text,
    fontSize: 13,
    lineHeight: 20,
  },
  dangerBtn: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.danger + '66',
  },
  dangerBtnText: { color: COLORS.danger, fontSize: 15, fontWeight: '600' },
  disclaimer: {
    color: COLORS.muted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
});
