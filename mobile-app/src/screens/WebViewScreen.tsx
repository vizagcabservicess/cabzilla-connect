/**
 * WebViewScreen - displays web content in-app (native, stays in-app)
 * Used for admin panels, support links, etc. Keeps user in app with native chrome.
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/core';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { authAPI } from '../services/authAPI';

type Props = NativeStackScreenProps<RootStackParamList, 'WebView'>;

function authBootstrap(token: string, userJson: string | null): string {
  const userLine = userJson ? `localStorage.setItem('user',${JSON.stringify(userJson)});` : '';
  return `try{localStorage.setItem('auth_token',${JSON.stringify(token)});${userLine}}catch(e){}true;`;
}

const OPEN_CHAT_SCRIPT = `(function(){var n=0;var t=setInterval(function(){n+=1;try{window.dispatchEvent(new Event('vth-open-live-chat'));}catch(e){}if(n>20)clearInterval(t);},500);})();true;`;

export function WebViewScreen({ route }: Props) {
  const { url, title, html, auth, openChat } = route.params;
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [beforeLoad, setBeforeLoad] = useState<string | null>(auth ? null : 'true;');

  useEffect(() => {
    if (!auth) {
      setBeforeLoad('true;');
      return;
    }
    let cancelled = false;
    void (async () => {
      const token = await authAPI.getStoredToken();
      const user = await authAPI.getStoredUser();
      const script = token ? authBootstrap(token, user ? JSON.stringify(user) : null) : 'true;';
      if (!cancelled) setBeforeLoad(script);
    })();
    return () => {
      cancelled = true;
    };
  }, [auth]);

  const isValidUrl = url && typeof url === 'string' && url.startsWith('http');
  const source = html ? { html } : isValidUrl ? { uri: url } : null;

  if (!source) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>
            {title ?? 'Web'}
          </Text>
        </View>
        <View style={styles.errorWrap}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.gray600} />
          <Text style={styles.errorText}>Unable to load content</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {title ?? 'Web'}
        </Text>
      </View>
      {beforeLoad ? (
      <WebView
        source={source}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        injectedJavaScriptBeforeContentLoaded={beforeLoad}
        injectedJavaScript={openChat ? OPEN_CHAT_SCRIPT : undefined}
        startInLoadingState
        onLoadStart={() => { setLoading(true); setError(null); }}
        onLoadEnd={() => setLoading(false)}
        onError={(e) => {
          setLoading(false);
          setError(e.nativeEvent?.description ?? 'Failed to load');
        }}
        originWhitelist={['*']}
        mixedContentMode="compatibility"
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}
      />
      ) : null}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  backBtn: {
    padding: 8,
    marginRight: 4,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: colors.foreground,
  },
  webview: {
    flex: 1,
    opacity: 0.99,
  },
  loading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  errorWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: colors.gray600,
    marginTop: 12,
    textAlign: 'center',
  },
  errorBanner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fef2f2',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  errorBannerText: {
    fontSize: 14,
    color: '#dc2626',
    textAlign: 'center',
  },
});
