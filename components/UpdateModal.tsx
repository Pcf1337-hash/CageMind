import React, { useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Modal,
  BackHandler,
} from 'react-native';
import Constants from 'expo-constants';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { ArrowRight } from 'lucide-react-native';
import { COLORS } from '../lib/constants';
import type { ReleaseInfo } from '../lib/updater';

interface UpdateModalProps {
  visible: boolean;
  release: ReleaseInfo;
  onDismiss: () => void;
  onSkip: () => void;
  onUpdate: () => void;
}

function parseChangelog(markdown: string): React.ReactNode[] {
  const lines = markdown
    .split('\n')
    .filter((l) => !l.match(/FORCED_UPDATE:/i));
  const nodes: React.ReactNode[] = [];

  lines.forEach((line, i) => {
    if (line.startsWith('## ') || line.startsWith('### ')) {
      nodes.push(
        <Text key={i} style={styles.changelogHeadline}>
          {line.replace(/^#{2,3}\s/, '')}
        </Text>
      );
    } else if (line.startsWith('- ')) {
      nodes.push(
        <Text key={i} style={styles.changelogBullet}>
          {'  • '}{line.slice(2)}
        </Text>
      );
    } else if (line.trim()) {
      nodes.push(
        <Text key={i} style={styles.changelogText}>
          {line}
        </Text>
      );
    }
  });

  return nodes;
}

export default function UpdateModal({
  visible,
  release,
  onDismiss,
  onSkip,
  onUpdate,
}: UpdateModalProps) {
  const translateY = useSharedValue(300);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 250 });
      translateY.value = withSpring(0, { damping: 18, stiffness: 200 });
    } else {
      opacity.value = withTiming(0, { duration: 200 });
      translateY.value = withTiming(300, { duration: 200 });
    }
  }, [visible]);

  useEffect(() => {
    if (!release.isForced) return;
    const handler = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => handler.remove();
  }, [release.isForced]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      accessibilityViewIsModal
    >
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={release.isForced ? undefined : onDismiss}
          accessibilityLabel="Modal schließen"
        />
      </Animated.View>

      <Animated.View
        style={[styles.sheet, sheetStyle]}
        accessibilityRole="none"
      >
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Update verfügbar</Text>
        </View>

        <View style={styles.versionRow}>
          <Text style={styles.versionOld}>
            {Constants.expoConfig?.version ?? '?'}
          </Text>
          <ArrowRight size={18} color={COLORS.accent} />
          <Text style={styles.versionNew}>{release.version}</Text>
        </View>

        <Text style={styles.releaseTitle}>{release.title}</Text>

        <ScrollView
          style={styles.changelogBox}
          contentContainerStyle={styles.changelogContent}
          showsVerticalScrollIndicator={false}
        >
          {parseChangelog(release.changelog)}
        </ScrollView>

        <Pressable
          onPress={onUpdate}
          style={styles.updateBtn}
          accessibilityLabel="App jetzt updaten"
          accessibilityRole="button"
        >
          <Text style={styles.updateBtnText}>Jetzt updaten</Text>
        </Pressable>

        {!release.isForced && (
          <>
            <Pressable
              onPress={onDismiss}
              style={styles.laterBtn}
              accessibilityLabel="Später erinnern"
              accessibilityRole="button"
            >
              <Text style={styles.laterText}>Später erinnern</Text>
            </Pressable>

            <Pressable
              onPress={onSkip}
              style={styles.skipBtn}
              accessibilityLabel="Diese Version überspringen"
              accessibilityRole="button"
            >
              <Text style={styles.skipText}>Version überspringen</Text>
            </Pressable>
          </>
        )}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    elevation: 10,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.accent + '33',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 16,
  },
  badgeText: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  versionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  versionOld: {
    color: COLORS.muted,
    fontSize: 20,
    fontWeight: '600',
  },
  versionNew: {
    color: COLORS.accent,
    fontSize: 20,
    fontWeight: '700',
  },
  releaseTitle: {
    color: COLORS.text,
    fontSize: 16,
    marginBottom: 16,
  },
  changelogBox: {
    maxHeight: 280,
    backgroundColor: COLORS.surface2,
    borderRadius: 12,
    marginBottom: 20,
  },
  changelogContent: {
    padding: 16,
    gap: 4,
  },
  changelogHeadline: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
  },
  changelogBullet: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 20,
  },
  changelogText: {
    color: COLORS.text,
    fontSize: 13,
    lineHeight: 20,
  },
  updateBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  updateBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  laterBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    minHeight: 48,
  },
  laterText: {
    color: COLORS.muted,
    fontSize: 14,
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 8,
    minHeight: 48,
  },
  skipText: {
    color: COLORS.danger,
    fontSize: 12,
  },
});
