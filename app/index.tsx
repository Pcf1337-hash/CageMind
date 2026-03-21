import { useEffect } from 'react';
import { router } from 'expo-router';
import { getSetting } from '../lib/database';

export default function Index() {
  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const onboardingDone = await getSetting('onboarding_done');
        if (onboardingDone === 'true') {
          router.replace('/(tabs)/home');
        } else {
          router.replace('/onboarding/welcome');
        }
      } catch {
        router.replace('/onboarding/welcome');
      }
    };
    checkOnboarding();
  }, []);

  return null;
}
