/**
 * Lazy wrapper - only loads GoogleSignInButton when not in Expo Go.
 * Prevents expo-crypto load in Expo Go (avoids "ExpoCryptoAES" native module error).
 */
import React, { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import type { SocialUser } from './GoogleSignInButton';

const canUse = Platform.OS === 'web' || Constants.appOwnership !== 'expo';

interface Props {
  onSuccess: (user: SocialUser) => void | Promise<void>;
  onError?: (error: Error) => void;
  disabled?: boolean;
  label?: string;
  style?: object;
}

export function GoogleSignInButtonLazy(props: Props) {
  const [Component, setComponent] = useState<React.ComponentType<Props> | null>(null);

  useEffect(() => {
    if (!canUse) return;
    import('./GoogleSignInButton').then((mod) => setComponent(() => mod.GoogleSignInButton));
  }, []);

  if (!canUse || !Component) return null;

  return <Component {...props} />;
}
