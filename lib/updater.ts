import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import semver from 'semver';

const GITHUB_RELEASES_URL =
  'https://api.github.com/repos/NosKovsky/CageMind/releases/latest';
const LAST_CHECK_KEY = 'last_update_check';
const SKIPPED_VERSION_KEY = 'skipped_version';
const CHECK_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 Stunden

export interface ReleaseInfo {
  version: string;
  tagName: string;
  title: string;
  changelog: string;
  publishedAt: string;
  downloadUrl: string;
  isForced: boolean;
}

export function getCurrentVersion(): string {
  return Constants.expoConfig?.version ?? '0.0.0';
}

export function isNewerVersion(remote: string, local: string): boolean {
  try {
    return semver.gt(remote, local);
  } catch {
    return false;
  }
}

export async function shouldCheckForUpdate(): Promise<boolean> {
  try {
    const lastCheck = await AsyncStorage.getItem(LAST_CHECK_KEY);
    if (!lastCheck) return true;
    const elapsed = Date.now() - parseInt(lastCheck, 10);
    return elapsed > CHECK_COOLDOWN_MS;
  } catch {
    return true;
  }
}

export async function getLatestRelease(): Promise<ReleaseInfo | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(GITHUB_RELEASES_URL, {
      signal: controller.signal,
      headers: { Accept: 'application/vnd.github.v3+json' },
    });
    clearTimeout(timeoutId);

    if (!response.ok) return null;

    const data = (await response.json()) as {
      tag_name: string;
      name: string;
      body: string;
      published_at: string;
      assets: Array<{ name: string; browser_download_url: string }>;
    };

    const tagName = data.tag_name ?? 'v0.0.0';
    const version = tagName.replace(/^v/, '');
    const changelog = data.body ?? '';
    const isForced = /FORCED_UPDATE:\s*true/i.test(changelog);

    const apkAsset = data.assets?.find((a) => a.name.endsWith('.apk'));
    const downloadUrl = apkAsset?.browser_download_url ?? '';

    await AsyncStorage.setItem(LAST_CHECK_KEY, String(Date.now()));

    return {
      version,
      tagName,
      title: data.name ?? tagName,
      changelog,
      publishedAt: data.published_at ?? '',
      downloadUrl,
      isForced,
    };
  } catch {
    return null;
  }
}

export async function checkForUpdate(): Promise<{
  hasUpdate: boolean;
  release: ReleaseInfo | null;
  currentVersion: string;
}> {
  const currentVersion = getCurrentVersion();
  const release = await getLatestRelease();

  if (!release) {
    return { hasUpdate: false, release: null, currentVersion };
  }

  const hasUpdate = isNewerVersion(release.version, currentVersion);
  return { hasUpdate, release: hasUpdate ? release : null, currentVersion };
}

export async function openDownloadUrl(url: string): Promise<void> {
  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    }
  } catch (error) {
    console.error('Fehler beim Offnen der Download-URL:', error);
  }
}

export async function skipVersion(version: string): Promise<void> {
  try {
    await AsyncStorage.setItem(SKIPPED_VERSION_KEY, version);
  } catch {
    // Silent fail
  }
}

export async function isVersionSkipped(version: string): Promise<boolean> {
  try {
    const skipped = await AsyncStorage.getItem(SKIPPED_VERSION_KEY);
    return skipped === version;
  } catch {
    return false;
  }
}

export async function getLastCheckTimestamp(): Promise<number | null> {
  try {
    const ts = await AsyncStorage.getItem(LAST_CHECK_KEY);
    return ts ? parseInt(ts, 10) : null;
  } catch {
    return null;
  }
}

export function formatLastCheckTime(timestamp: number | null): string {
  if (!timestamp) return 'Noch nie';
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Gerade eben';
  if (minutes < 60) return `vor ${minutes} Minute${minutes !== 1 ? 'n' : ''}`;
  if (hours < 24) return `vor ${hours} Stunde${hours !== 1 ? 'n' : ''}`;
  return `vor ${days} Tag${days !== 1 ? 'en' : ''}`;
}
