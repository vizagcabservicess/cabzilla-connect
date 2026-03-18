/**
 * WhatsApp tab - opens contact on WhatsApp
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

const WHATSAPP_NUMBER = '919966363662';

export function WhatsAppScreen() {
  const handleOpen = () => {
    Linking.openURL(`https://wa.me/${WHATSAPP_NUMBER}`).catch(() => {});
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <Text style={styles.icon}>💬</Text>
        <Text style={styles.title}>Chat with us</Text>
        <Text style={styles.sub}>Get instant support on WhatsApp</Text>
        <TouchableOpacity style={styles.btn} onPress={handleOpen}>
          <Text style={styles.btnText}>Open WhatsApp</Text>
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
  sub: { fontSize: 14, color: colors.gray600, marginBottom: 24 },
  btn: {
    backgroundColor: '#25D366',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  btnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
