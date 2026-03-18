/**
 * ContactUsScreen - native contact page
 */
import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/core';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme/colors';

const PHONE = '+919966363662';
const WHATSAPP = '919966363662';
const EMAIL = 'support@vizagtaxihub.com';

function openUrl(url: string) {
  Linking.openURL(url).catch(() => {});
}

export function ContactUsScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.title}>Contact Us</Text>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>Have questions? We're here to help 24/7.</Text>

        <View style={styles.card}>
          <View style={styles.cardIcon}>
            <Feather name="phone" size={24} color="#fff" />
          </View>
          <Text style={styles.cardTitle}>Phone Support</Text>
          <Text style={styles.cardDetail}>+91-9966363662</Text>
          <Text style={styles.cardSub}>24/7 Available</Text>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => openUrl(`tel:${PHONE}`)}
          >
            <Text style={styles.actionBtnText}>Call Now</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={[styles.cardIcon, { backgroundColor: '#25D366' }]}>
            <Feather name="message-circle" size={24} color="#fff" />
          </View>
          <Text style={styles.cardTitle}>WhatsApp Chat</Text>
          <Text style={styles.cardDetail}>+91-9966363662</Text>
          <Text style={styles.cardSub}>Quick responses</Text>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#25D366' }]}
            onPress={() => openUrl(`https://wa.me/${WHATSAPP}`)}
          >
            <Text style={styles.actionBtnText}>Chat on WhatsApp</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={[styles.cardIcon, { backgroundColor: '#2563eb' }]}>
            <Feather name="mail" size={24} color="#fff" />
          </View>
          <Text style={styles.cardTitle}>Email Support</Text>
          <Text style={styles.cardDetail}>{EMAIL}</Text>
          <Text style={styles.cardSub}>Response within 2 hours</Text>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnOutline]}
            onPress={() => openUrl(`mailto:${EMAIL}`)}
          >
            <Text style={[styles.actionBtnText, { color: colors.primary }]}>Send Email</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={[styles.cardIcon, { backgroundColor: '#7c3aed' }]}>
            <Feather name="map-pin" size={24} color="#fff" />
          </View>
          <Text style={styles.cardTitle}>Office Location</Text>
          <Text style={styles.cardDetail}>Visakhapatnam</Text>
          <Text style={styles.cardSub}>Andhra Pradesh, India</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray50 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { padding: 8, marginRight: 4 },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: colors.foreground,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 32 },
  subtitle: {
    fontSize: 15,
    color: colors.gray600,
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: 4,
  },
  cardDetail: {
    fontSize: 15,
    color: colors.gray600,
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 13,
    color: colors.mutedForeground,
    marginBottom: 12,
  },
  actionBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignSelf: 'stretch',
  },
  actionBtnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
});
