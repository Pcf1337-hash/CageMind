import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { initDatabase } from '../lib/database';
import {
  checkForUpdate,
  shouldCheckForUpdate,
  isVersionSkipped,
  skipVersion,
  openDownloadUrl,
} from '../lib/updater';
import type { ReleaseInfo } from '../lib/updater';
import UpdateModal from '../components/UpdateModal';
import { COLORS } from '../lib/constants';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);
  const [updateRelease, setUpdateRelease] = useState<ReleaseInfo | null>(null);

  useEffect(() => {
    const setup = async () => {
      try {
        await initDatabase();
      } catch (e) {
        console.error('DB init error:', e);
      } finally {
        setDbReady(true);
        await SplashScreen.hideAsync();
      }
    };
    setup();
  }, []);

  useEffect(() => {
    if (!dbReady) return;
    const runUpdateCheck = async () => {
      await new Promise((r) => setTimeout(r, 3000));
      const should = await shouldCheckForUpdate();
      if (!should) return;
      const { hasUpdate, release } = await checkForUpdate();
      if (!hasUpdate || !release) return;
      const skipped = await isVersionSkipped(release.version);
      if (skipped) return;
      setUpdateRelease(release);
    };
    runUpdateCheck();
  }, [dbReady]);

  if (!dbReady) return null;

  return (
    <SafeAreaProvider>
    <View style={styles.root}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COLORS.bg },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="sos"
          options={{ presentation: 'fullScreenModal', animation: 'fade' }}
        />
        <Stack.Screen
          name="settings"
          options={{ presentation: 'card', animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="exercises/breathing"
          options={{ presentation: 'card', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="exercises/box-breathing"
          options={{ presentation: 'card', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="exercises/grounding"
          options={{ presentation: 'card', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="exercises/muscle-relaxation"
          options={{ presentation: 'card', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="exercises/affirmations"
          options={{ presentation: 'card', animation: 'slide_from_bottom' }}
        />
      </Stack>

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
    </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
});
