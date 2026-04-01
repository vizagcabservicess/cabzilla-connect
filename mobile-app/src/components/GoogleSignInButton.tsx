/**
 * Google Sign-In button - uses expo-auth-session (same backend as web app)
 * Returns null in Expo Go (expo-crypto native module not available).
 */
import React, { useEffect, useMemo } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import Constants from 'expo-constants';
import * as AuthSession from 'expo-auth-session';
import { useIdTokenAuthRequest } from 'expo-auth-session/providers/google';
import {
  GOOGLE_CLIENT_ID,
  GOOGLE_ANDROID_CLIENT_ID,
  GOOGLE_IOS_CLIENT_ID,
  getGoogleNativeRedirectUri,
  isGoogleNativeSignInConfigured,
} from '../config';
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
  /** Google ID token — send to social-login.php for server verification */
  idToken?: string;
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
  const hasClientId =
    Platform.OS === 'web' ? !!GOOGLE_CLIENT_ID : isGoogleNativeSignInConfigured();
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
  // expo-auth-session uses androidClientId / iosClientId on native; webClientId is the Web OAuth client.
  // Native id_token `aud` is often the Android/iOS client id — server must allow it via GOOGLE_OAUTH_CLIENT_IDS.

  // Native Google OAuth requires redirect com.googleusercontent.apps.<clientPrefix>:/oauthredirect
  // (not vizagtaxihub://...) — see Google OAuth 2.0 native app docs.
  const redirectUri = useMemo(() => {
    if (Platform.OS === 'web') {
      return AuthSession.makeRedirectUri({ path: 'oauthredirect' });
    }
    const googleNative = getGoogleNativeRedirectUri();
    if (googleNative) {
      return googleNative;
    }
    return AuthSession.makeRedirectUri({
      scheme: 'vizagtaxihub',
      path: 'oauthredirect',
    });
  }, []);

  const [request, response, promptAsync] = useIdTokenAuthRequest(
    {
      webClientId: GOOGLE_CLIENT_ID,
      androidClientId: GOOGLE_ANDROID_CLIENT_ID || undefined,
      iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
      redirectUri,
    },
    {}
  );

  useEffect(() => {
    if (response?.type === 'success' && response.params?.id_token) {
      const decoded = decodeJwtPayload(response.params.id_token);
      if (!decoded.sub || !decoded.email) {
        onError?.(new Error('Invalid Google response: missing user data'));
        return;
      }
      const displayName = decoded.name?.trim() || decoded.email.split('@')[0] || 'User';
      const socialUser: SocialUser = {
        id: decoded.sub,
        email: decoded.email,
        name: displayName,
        picture: decoded.picture,
        idToken: response.params.id_token,
        provider: 'google',
      };
      onSuccess(socialUser);
    } else if (response?.type === 'error') {
      if (__DEV__) {
        console.warn('[GoogleSignIn]', response.error);
      }
      onError?.(new Error(response.error?.message ?? 'Google sign-in failed'));
    } else if (response?.type === 'dismiss' && __DEV__) {
      console.warn('[GoogleSignIn] Chrome tab dismissed before completing sign-in');
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
