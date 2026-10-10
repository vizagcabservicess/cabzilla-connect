import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getResolvedApiOrigin, WEB_APP_BASE_URL } from '../config';
import { syncEventDutyTracking } from '../lib/eventDutyLocationTask';
import type { AppRootParamList } from '../navigation/appRootTypes';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<AppRootParamList, 'EventDuty'>;

type DutyRow = {
  id: number;
  status?: string;
  openingAt?: string | null;
  closingAt?: string | null;
};

export function EventDutyScreen({ route }: Props) {
  const { token } = route.params;
  const navigation = useNavigation();
  const [trackingOn, setTrackingOn] = useState(false);
  const portalUrl = useMemo(
    () => `${(WEB_APP_BASE_URL || 'https://www.vizagtaxihub.com').replace(/\/$/, '')}/driver/register/${token}?inApp=1`,
    [token],
  );

  const sync = useCallback(async () => {
    const origin = getResolvedApiOrigin() || 'https://www.vizagtaxihub.com';
    const res = await fetch(`${origin}/api/events/driver-public.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Event-Driver-Token': token,
      },
      body: JSON.stringify({ token, action: 'bootstrap' }),
    });
    const data = (await res.json()) as { duties?: DutyRow[]; data?: { duties?: DutyRow[] } };
    const duties = data.duties || data.data?.duties || [];
    const openIds = duties
      .filter((duty) => duty.openingAt && !duty.closingAt && duty.status === 'in_progress')
      .map((duty) => duty.id);
    await syncEventDutyTracking(token, openIds);
    return openIds.length > 0;
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const on = await sync();
        if (!cancelled) setTrackingOn(on);
      } catch {
        if (!cancelled) setTrackingOn(false);
      }
    };
    void run();
    const id = setInterval(() => { void run(); }, 15000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [sync]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.title}>Event duty</Text>
      </View>
      <View style={[styles.banner, trackingOn ? styles.bannerOn : styles.bannerOff]}>
        <Text style={styles.bannerText}>
          {trackingOn
            ? 'Live tracking is on. Lock the screen if you want — a small notification stays until you end duty.'
            : 'Start duty here. Tracking then continues with the screen locked, using the VTH app — not Chrome.'}
        </Text>
      </View>
      <WebView
        source={{ uri: portalUrl }}
        startInLoadingState
        onMessage={(event) => {
          try {
            const msg = JSON.parse(event.nativeEvent.data) as { type?: string };
            if (msg.type === 'event-duty-sync') {
              void sync().then(setTrackingOn).catch(() => setTrackingOn(false));
            }
          } catch {
            /* ignore non-JSON pages */
          }
        }}
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        )}
        style={styles.web}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backBtn: { padding: 4, marginRight: 8 },
  title: { fontSize: 17, fontWeight: '700', color: colors.foreground },
  banner: { paddingHorizontal: 12, paddingVertical: 10 },
  bannerOn: { backgroundColor: '#ecfdf5' },
  bannerOff: { backgroundColor: '#eff6ff' },
  bannerText: { fontSize: 13, lineHeight: 18, color: '#1e3a5f' },
  web: { flex: 1 },
  loading: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
});
