/**
 * Call Now tab - opens phone dialer
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

const PHONE_NUMBER = '+919966363662';

export function CallScreen() {
  const handleCall = () => {
    Linking.openURL(`tel:${PHONE_NUMBER}`).catch(() => {});
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <Text style={styles.icon}>📞</Text>
        <Text style={styles.title}>Call Now</Text>
        <Text style={styles.sub}>Reach us anytime for booking support</Text>
        <Text style={styles.phone}>{PHONE_NUMBER}</Text>
        <TouchableOpacity style={styles.btn} onPress={handleCall}>
          <Text style={styles.btnText}>Call +91 9966363662</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray50 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  icon: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '700', color: colors.foreground, marginBottom: 8 },
  sub: { fontSize: 14, color: colors.gray600, marginBottom: 8 },
  phone: { fontSize: 18, fontWeight: '600', color: colors.primary, marginBottom: 24 },
  btn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  btnText: { fontSize: 16, fontWeight: '600', color: colors.primaryForeground },
});
