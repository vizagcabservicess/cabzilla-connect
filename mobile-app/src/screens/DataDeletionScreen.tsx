/**
 * DataDeletionScreen - native data deletion request
 */
import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking, Share, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/core';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme/colors';

const EMAIL = 'support@vizagtaxihub.com';
const PHONE = '+919966363662';

function openUrl(url: string) {
  Linking.openURL(url).catch(() => {});
}

export function DataDeletionScreen() {
  const navigation = useNavigation();

  const handleEmailDeletion = () => {
    const subject = encodeURIComponent('Delete My Account');
    const body = encodeURIComponent(`Hello VizagTaxiHub Support Team,

I would like to request the deletion of my account and all associated data from VizagTaxiHub.

Please include the following information in your request:
- Your registered email address
- Your name (if different from email)
- Reason for deletion (optional)

Thank you.`);
    openUrl(`mailto:${EMAIL}?subject=${subject}&body=${body}`);
  };

  const copyEmail = () => {
    Share.share({ message: EMAIL, title: 'Support email' }).catch(() => {
      Alert.alert('Email', EMAIL, [{ text: 'OK' }]);
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.title}>Data Deletion</Text>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>
          We respect your privacy and provide easy ways to delete your account data from VizagTaxiHub.
        </Text>

        <View style={[styles.card, styles.cardPrimary]}>
          <View style={styles.cardHeader}>
            <Feather name="mail" size={22} color={colors.primary} />
            <View>
              <Text style={styles.cardTitle}>Email Deletion Request</Text>
              <Text style={styles.cardSub}>Recommended method for account deletion</Text>
            </View>
          </View>
          <View style={styles.steps}>
            <Text style={styles.stepTitle}>How to request deletion:</Text>
            <Text style={styles.stepItem}>1. Send an email to {EMAIL}</Text>
            <Text style={styles.stepItem}>2. Use the subject line: "Delete My Account"</Text>
            <Text style={styles.stepItem}>3. Include your registered email address</Text>
            <Text style={styles.stepItem}>4. We will process your request within 7 days</Text>
          </View>
          <TouchableOpacity style={styles.actionBtn} onPress={handleEmailDeletion}>
            <Feather name="mail" size={18} color="#fff" />
            <Text style={styles.actionBtnText}>Send Deletion Email</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.copyBtn} onPress={copyEmail}>
            <Text style={styles.copyBtnText}>Copy Email Address</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Feather name="phone" size={22} color={colors.foreground} />
            <View>
              <Text style={styles.cardTitle}>Alternative: Phone Support</Text>
              <Text style={styles.cardSub}>Call our customer support team</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnOutline]}
            onPress={() => openUrl(`tel:${PHONE}`)}
          >
            <Feather name="phone" size={18} color={colors.primary} />
            <Text style={[styles.actionBtnText, { color: colors.primary }]}>Call Now</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Feather name="alert-triangle" size={22} color="#b45309" />
            <View>
              <Text style={styles.cardTitle}>Important Information</Text>
            </View>
          </View>
          <Text style={styles.infoText}>
            • Processing takes up to 7 business days{'\n'}
            • Deletion is permanent and cannot be undone{'\n'}
            • We may need to verify your identity
          </Text>
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
    lineHeight: 22,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardPrimary: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(37, 99, 235, 0.05)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.foreground,
  },
  cardSub: {
    fontSize: 13,
    color: colors.gray600,
    marginTop: 4,
  },
  steps: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: 8,
  },
  stepItem: {
    fontSize: 14,
    color: colors.gray600,
    lineHeight: 24,
    marginBottom: 2,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 10,
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
  },
  copyBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  copyBtnText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  infoText: {
    fontSize: 14,
    color: colors.gray600,
    lineHeight: 24,
  },
});
