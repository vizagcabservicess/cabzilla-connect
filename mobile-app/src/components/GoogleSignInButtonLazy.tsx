/**
 * Lazy wrapper - only loads GoogleSignInButton when not in Expo Go.
 * Prevents expo-crypto load in Expo Go (avoids "ExpoCryptoAES" native module error).
 */
import React, { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { ActivityIndicator, Text, View, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import type { SocialUser } from './GoogleSignInButton';

const canUse =
  Platform.OS === 'web' || Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

interface Props {
  onSuccess: (user: SocialUser) => void | Promise<void>;
  onError?: (error: Error) => void;
  disabled?: boolean;
  label?: string;
  style?: object;
}

export function GoogleSignInButtonLazy(props: Props) {
  const [Component, setComponent] = useState<React.ComponentType<Props> | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!canUse) return;
    let cancelled = false;
    import('./GoogleSignInButton')
      .then((mod) => {
        if (!cancelled) setComponent(() => mod.GoogleSignInButton);
      })
      .catch((e: unknown) => {
        console.error('[GoogleSignIn] Failed to load module:', e);
        if (!cancelled) {
          setLoadError('Could not load Google Sign-In. Rebuild the app if this persists.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!canUse) return null;
  if (loadError) {
    return <Text style={styles.warn}>{loadError}</Text>;
  }
  if (!Component) {
    return (
      <View style={styles.loadingRow}>
        <ActivityIndicator size="small" color={colors.foreground} />
        <Text style={styles.loadingHint}> Preparing Google…</Text>
      </View>
    );
  }

  return <Component {...props} />;
}

const styles = StyleSheet.create({
  loadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
  loadingHint: { fontSize: 14, color: colors.mutedForeground },
  warn: { fontSize: 13, color: '#b45309', textAlign: 'center', paddingVertical: 8 },
});
