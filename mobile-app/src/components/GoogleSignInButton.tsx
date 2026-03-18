/**
 * Google Sign-In button - uses expo-auth-session (same backend as web app)
 * Returns null in Expo Go (expo-crypto native module not available).
 */
import React, { useEffect } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { useIdTokenAuthRequest } from 'expo-auth-session/providers/google';
import { GOOGLE_CLIENT_ID, GOOGLE_ANDROID_CLIENT_ID } from '../config';
import { colors } from '../theme/colors';

const canUseGoogleSignIn = Platform.OS === 'web' || Constants.appOwnership !== 'expo';

function decodeJwtPayload(token: string): { sub?: string; email?: string; name?: string; picture?: string } {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return {};
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return {};
  }
}

export interface SocialUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
  provider: 'google';
}

interface GoogleSignInButtonProps {
  onSuccess: (user: SocialUser) => void | Promise<void>;
  onError?: (error: Error) => void;
  disabled?: boolean;
  label?: string;
  style?: object;
}

export function GoogleSignInButton(props: GoogleSignInButtonProps) {
  const hasClientId = GOOGLE_CLIENT_ID && (Platform.OS !== 'android' || GOOGLE_ANDROID_CLIENT_ID);
  if (!canUseGoogleSignIn || !hasClientId) return null;
  return <GoogleSignInButtonInner {...props} />;
}

function GoogleSignInButtonInner({
  onSuccess,
  onError,
  disabled = false,
  label = 'Continue with Google',
  style,
}: GoogleSignInButtonProps) {
  // On Android native: use Android client ID (Web client rejects custom scheme redirects).
  // On web/iOS: use Web client ID. webClientId is always Web client (for id_token).
  const clientId = Platform.OS === 'android' && GOOGLE_ANDROID_CLIENT_ID
    ? GOOGLE_ANDROID_CLIENT_ID
    : GOOGLE_CLIENT_ID;
  const [request, response, promptAsync] = useIdTokenAuthRequest(
    {
      clientId,
      webClientId: GOOGLE_CLIENT_ID,
      androidClientId: GOOGLE_ANDROID_CLIENT_ID || undefined,
    },
    { scheme: 'vizagtaxihub', path: 'oauthredirect' }
  );

  useEffect(() => {
    if (response?.type === 'success' && response.params?.id_token) {
      const decoded = decodeJwtPayload(response.params.id_token);
      if (!decoded.sub || !decoded.email || !decoded.name) {
        onError?.(new Error('Invalid Google response: missing user data'));
        return;
      }
      const socialUser: SocialUser = {
        id: decoded.sub,
        email: decoded.email,
        name: decoded.name,
        picture: decoded.picture,
        provider: 'google',
      };
      onSuccess(socialUser);
    } else if (response?.type === 'error') {
      onError?.(new Error(response.error?.message ?? 'Google sign-in failed'));
    }
    // Don't call onError for 'cancel' - user intentionally dismissed
  }, [response, onSuccess, onError]);

  const handlePress = () => {
    if (disabled || !request) return;
    promptAsync();
  };

  const isLoading = response?.type === 'success' || (response?.type !== 'cancel' && response !== null);

  if (!GOOGLE_CLIENT_ID) {
    return null;
  }

  return (
    <TouchableOpacity
      style={[styles.btn, style, (disabled || !request) && styles.btnDisabled]}
      onPress={handlePress}
      disabled={disabled || !request}
      activeOpacity={0.7}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={colors.foreground} />
      ) : (
        <>
          <Text style={styles.googleG}>G</Text>
          <Text style={styles.btnText}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 48,
  },
  btnDisabled: { opacity: 0.6 },
  googleG: {
    marginRight: 10,
    fontSize: 18,
    fontWeight: '700',
    color: '#4285F4',
  },
  btnText: { fontSize: 16, fontWeight: '500', color: colors.foreground },
});
