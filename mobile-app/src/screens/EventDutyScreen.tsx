import { useCallback, useEffect, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import { EventDriverPortal } from '../components/events/EventDriverPortal';
import { markEventDutyScreenOpen, syncEventDutyTracking } from '../lib/eventDutyLocationTask';
import type { AppRootParamList } from '../navigation/appRootTypes';
import { colors, fonts } from '../theme/colors';

const LOGO = 'https://www.vizagtaxihub.com/uploads/vizagtaxihub-logo.png';

type Props = NativeStackScreenProps<AppRootParamList, 'EventDuty'>;

type EventDutyInput = {
  route?: Props['route'];
  embeddedToken?: string;
  onLogout?: () => void;
};

export function EventDutyScreen({ route, embeddedToken, onLogout }: EventDutyInput) {
  const token = embeddedToken || route?.params.token || '';
  const navigation = useNavigation();
  const [needLocation, setNeedLocation] = useState(false);
  const [openIds, setOpenIds] = useState<number[]>([]);

  const sync = useCallback(async (ids: number[]) => {
    await syncEventDutyTracking(token, ids);
    if (ids.length === 0) {
      setNeedLocation(false);
      return;
    }
    const permission = await Location.getForegroundPermissionsAsync();
    setNeedLocation(permission.status !== 'granted');
  }, [token]);

  const onOpenDuties = useCallback((ids: number[]) => {
    setOpenIds(ids);
    void sync(ids).catch(() => setNeedLocation(false));
  }, [sync]);

  useEffect(() => {
    void markEventDutyScreenOpen(true);
    return () => { void markEventDutyScreenOpen(false); };
  }, []);

  const allowLocation = async () => {
    const permission = await Location.requestForegroundPermissionsAsync();
    setNeedLocation(permission.status !== 'granted' && openIds.length > 0);
    if (permission.status === 'granted') await sync(openIds);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        {onLogout ? null : (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.foreground} />
          </TouchableOpacity>
        )}
        <View style={styles.titleWrap}>
          <Image source={{ uri: LOGO }} style={styles.logo} resizeMode="contain" accessibilityLabel="Vizag Taxi Hub" />
          <Text style={styles.title}>Event duty</Text>
        </View>
        {onLogout ? (
          <TouchableOpacity onPress={onLogout}>
            <Text style={styles.logout}>Log out</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {needLocation ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>Allow location so the trip can be tracked.</Text>
          <TouchableOpacity onPress={() => { void allowLocation(); }}>
            <Text style={styles.allow}>Allow location</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      {token ? <EventDriverPortal token={token} onOpenDuties={onOpenDuties} /> : (
        <Text style={styles.missing}>This duty link is missing.</Text>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f6fb' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backBtn: { width: 32, padding: 4 },
  titleWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { width: 108, height: 36 },
  title: { fontSize: 17, fontFamily: fonts.bold, color: colors.foreground },
  logout: { color: '#b91c1c', fontFamily: fonts.bold, fontSize: 13 },
  banner: { paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff7ed' },
  bannerText: { fontSize: 13, lineHeight: 18, color: '#9a3412', fontFamily: fonts.regular },
  allow: { marginTop: 6, color: '#c2410c', fontFamily: fonts.bold },
  missing: { padding: 24, textAlign: 'center', color: '#b91c1c', fontFamily: fonts.regular },
});
