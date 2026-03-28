/**
 * Registers push permissions + token at app start (native), installs global log listeners,
 * and optionally shows an on-device debug strip (set EXPO_PUBLIC_SHOW_PUSH_DEBUG=1 for closed testing).
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import {
  getExpoPushProjectId,
  getPushToken,
  installGlobalPushNotificationLogger,
} from '../services/pushNotificationService';

const SHOW_DEBUG_UI =
  typeof __DEV__ !== 'undefined' && __DEV__
    ? true
    : process.env.EXPO_PUBLIC_SHOW_PUSH_DEBUG === '1';

export function PushNotificationBootstrap() {
  const { width } = useWindowDimensions();
  const [permissionLabel, setPermissionLabel] = useState<string>('—');
  const [token, setToken] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastPayload, setLastPayload] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    installGlobalPushNotificationLogger();

    const sub = Notifications.addNotificationReceivedListener((n) => {
      const title = n.request.content.title ?? '';
      const body = n.request.content.body ?? '';
      setLastPayload(`${title}: ${body}`.trim() || JSON.stringify(n.request.content.data ?? {}));
    });

    let cancelled = false;
    (async () => {
      const projectId = getExpoPushProjectId();
      if (!projectId) {
        const msg =
          'Missing expo.extra.eas.projectId — set it in app.json and create a new native build.';
        if (!cancelled) setLastError(msg);
        console.error('[PushNotificationBootstrap]', msg);
        return;
      }

      const t = await getPushToken();
      const { status } = await Notifications.getPermissionsAsync();
      if (cancelled) return;

      setPermissionLabel(status);
      if (t) {
        setToken(t);
        setLastError(null);
      } else {
        setLastError(
          'No push token — need physical device, notification permission, and FCM (EAS) / APNs for store builds.'
        );
      }
    })();

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  if (Platform.OS === 'web' || !SHOW_DEBUG_UI) {
    return null;
  }

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { maxWidth: Math.min(width - 16, 420) }]}
    >
      <TouchableOpacity
        style={styles.headerRow}
        onPress={() => setCollapsed((c) => !c)}
        activeOpacity={0.7}
      >
        <Text style={styles.headerTitle}>Push debug</Text>
        <Text style={styles.headerToggle}>{collapsed ? '▼' : '▲'}</Text>
      </TouchableOpacity>
      {!collapsed && (
        <ScrollView style={styles.body} nestedScrollEnabled keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>Platform</Text>
          <Text style={styles.value}>{Platform.OS}</Text>
          <Text style={styles.label}>Permission</Text>
          <Text style={styles.value}>{permissionLabel}</Text>
          <Text style={styles.label}>EAS projectId</Text>
          <Text style={styles.value}>{getExpoPushProjectId() ?? '(missing — rebuild)'}</Text>
          <Text style={styles.label}>Push token</Text>
          <Text style={styles.value}>{token ?? '(null)'}</Text>
          {lastError ? (
            <>
              <Text style={styles.label}>Error</Text>
              <Text style={styles.error}>{lastError}</Text>
            </>
          ) : null}
          {lastPayload ? (
            <>
              <Text style={styles.label}>Last notification (foreground)</Text>
              <Text style={styles.valueSmall}>{lastPayload}</Text>
            </>
          ) : null}
          <Text style={styles.hint}>
            Disable this panel in production: unset EXPO_PUBLIC_SHOW_PUSH_DEBUG (dev builds show it
            automatically).
          </Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    maxHeight: 280,
    backgroundColor: 'rgba(15,23,42,0.92)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.5)',
    zIndex: 99999,
    elevation: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(148,163,184,0.4)',
  },
  headerTitle: { color: '#e2e8f0', fontSize: 12, fontWeight: '700' },
  headerToggle: { color: '#94a3b8', fontSize: 12 },
  body: { paddingHorizontal: 10, paddingBottom: 10, maxHeight: 230 },
  label: { color: '#94a3b8', fontSize: 10, marginTop: 8, textTransform: 'uppercase' },
  value: { color: '#f1f5f9', fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  valueSmall: { color: '#cbd5e1', fontSize: 10 },
  error: { color: '#fca5a5', fontSize: 11, marginTop: 2 },
  hint: { color: '#64748b', fontSize: 9, marginTop: 10, lineHeight: 13 },
});
