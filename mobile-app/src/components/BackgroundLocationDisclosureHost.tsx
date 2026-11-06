import { useEffect, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  settleBackgroundLocationDisclosure,
  subscribeBackgroundLocationDisclosure,
  whenBackgroundLocationDisclosureSettled,
} from '../lib/backgroundLocationDisclosure';
import { colors, fonts } from '../theme/colors';

const REASONS: { icon: 'location' | 'car-sport' | 'phone-portrait'; tint: string; color: string; title: string; body: string }[] = [
  {
    icon: 'location',
    tint: '#dbeafe',
    color: '#1d4ed8',
    title: 'Pickup for your booking',
    body: 'Guests use location so the cab arrives at the right place.',
  },
  {
    icon: 'car-sport',
    tint: '#dcfce7',
    color: '#15803d',
    title: 'Live trip for drivers',
    body: 'The office sees the vehicle during an active trip or event duty.',
  },
  {
    icon: 'phone-portrait',
    tint: '#ffedd5',
    color: '#c2410c',
    title: 'Even when the app is closed',
    body: 'You can lock the phone. Sharing stops when the trip or duty ends.',
  },
];

export function BackgroundLocationDisclosureHost() {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const unsubscribe = subscribeBackgroundLocationDisclosure(setVisible);
    void whenBackgroundLocationDisclosureSettled();
    return unsubscribe;
  }, []);

  const choose = (accepted: boolean) => {
    if (busy) return;
    setBusy(true);
    void settleBackgroundLocationDisclosure(accepted).finally(() => setBusy(false));
  };

  if (Platform.OS === 'web') return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={() => {
        // Back and tapping outside are not consent.
      }}
    >
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.handle} />
          <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
            <View style={styles.art}>
              <View style={styles.roadAcross} />
              <View style={styles.roadDown} />
              <View style={[styles.block, styles.blockLeft]} />
              <View style={[styles.block, styles.blockRight]} />
              <View style={styles.pin}>
                <Ionicons name="navigate" size={26} color="#ffffff" />
              </View>
              <View style={styles.car}>
                <Ionicons name="car-sport" size={18} color={colors.primary} />
              </View>
            </View>

            <Text style={styles.title}>Allow location access</Text>
            <Text style={styles.subtitle}>
              Vizag Taxi Hub collects location data to enable pickup and live trip tracking even when the app is closed or not in use, and shares driver location with the Vizag Taxi Hub office during an active trip or duty.
            </Text>

            <View style={styles.reasons}>
              {REASONS.map((reason) => (
                <View key={reason.title} style={styles.reason}>
                  <View style={[styles.reasonIcon, { backgroundColor: reason.tint }]}>
                    <Ionicons name={reason.icon} size={18} color={reason.color} />
                  </View>
                  <View style={styles.reasonCopy}>
                    <Text style={styles.reasonTitle}>{reason.title}</Text>
                    <Text style={styles.reasonBody}>{reason.body}</Text>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Allow location access"
            disabled={busy}
            onPress={() => choose(true)}
            style={({ pressed }) => [styles.allow, pressed && styles.pressed, busy && styles.disabled]}
          >
            <Text style={styles.allowText}>Allow</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Do not allow location access"
            disabled={busy}
            onPress={() => choose(false)}
            style={({ pressed }) => [styles.decline, pressed && styles.pressed, busy && styles.disabled]}
          >
            <Text style={styles.declineText}>No thanks</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(17, 24, 39, 0.48)',
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    maxHeight: '92%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e5e7eb',
    marginTop: 10,
    marginBottom: 16,
  },
  art: {
    height: 148,
    borderRadius: 20,
    backgroundColor: '#eef4ff',
    overflow: 'hidden',
    marginBottom: 20,
  },
  roadAcross: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 70,
    height: 12,
    backgroundColor: '#d9e4f7',
  },
  roadDown: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '42%',
    width: 12,
    backgroundColor: '#d9e4f7',
  },
  block: {
    position: 'absolute',
    width: 54,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  blockLeft: { left: 18, top: 18 },
  blockRight: { right: 22, top: 22 },
  pin: {
    position: 'absolute',
    left: '42%',
    marginLeft: -22,
    top: 40,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#ffffff',
  },
  car: {
    position: 'absolute',
    right: 28,
    bottom: 18,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 22,
    lineHeight: 28,
    color: colors.foreground,
  },
  subtitle: {
    marginTop: 8,
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 22,
    color: colors.gray700,
  },
  reasons: {
    marginTop: 18,
    marginBottom: 8,
    gap: 16,
  },
  reason: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  reasonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reasonCopy: { flex: 1 },
  reasonTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.foreground,
  },
  reasonBody: {
    marginTop: 2,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.gray600,
  },
  allow: {
    marginTop: 8,
    backgroundColor: colors.primary,
    borderRadius: 14,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  allowText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: '#ffffff',
  },
  decline: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineText: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: colors.gray700,
  },
  pressed: { opacity: 0.86 },
  disabled: { opacity: 0.6 },
});
