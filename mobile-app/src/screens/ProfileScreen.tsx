/**
 * Profile tab - mirrors web app profile (login, dashboard, support, legal)
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { useAuth } from '../providers/AuthProvider';

const PHONE_NUMBER = '+919966363662';
const WHATSAPP_NUMBER = '919966363662';

interface ProfileLink {
  label: string;
  url?: string;
  screen?: string;
  params?: object;
  onPress?: () => void;
  icon?: string;
}

const SUPPORT_LINKS: { label: string; screen: string; params?: object }[] = [
  { label: 'Contact Us', screen: 'ContactUs' },
  { label: 'Help Center', screen: 'HelpCenter' },
  { label: 'Support', screen: 'ContactUs' },
];

const LEGAL_LINKS: { label: string; screen: string; params?: object }[] = [
  { label: 'Terms & Conditions', screen: 'StaticContent', params: { contentKey: 'terms' as const } },
  { label: 'Privacy Policy', screen: 'StaticContent', params: { contentKey: 'privacy' as const } },
  { label: 'Refund Policy', screen: 'StaticContent', params: { contentKey: 'refund' as const } },
  { label: 'Data Deletion', screen: 'DataDeletion' },
];

const SOCIAL_LINKS: { label: string; url: string; icon: string }[] = [
  { label: 'Facebook', url: 'https://www.facebook.com/vizagtaxihub', icon: 'facebook' },
  { label: 'Instagram', url: 'https://www.instagram.com/vizagtaxihub/', icon: 'instagram' },
  { label: 'YouTube', url: 'https://www.youtube.com/channel/UC2-jFwKuTHB357sBeIY4Urg', icon: 'youtube' },
];

function openUrl(url: string) {
  Linking.openURL(url).catch(() => {});
}

type Props = NativeStackScreenProps<RootStackParamList, 'ProfileHome'>;

export function ProfileScreen({ navigation }: Props) {
  const { user, isAuthenticated, logout } = useAuth();

  const handleCall = () => openUrl(`tel:${PHONE_NUMBER}`);
  const handleWhatsApp = () => openUrl(`https://wa.me/${WHATSAPP_NUMBER}`);

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const accountLinks: ProfileLink[] = isAuthenticated
    ? [
        ...(isAdmin ? [{ label: 'Admin Dashboard', onPress: () => navigation.navigate('AdminDashboard') }] : []),
        { label: 'My Bookings / Dashboard', onPress: () => navigation.navigate('Dashboard') },
        { label: 'Log out', onPress: () => logout() },
      ]
    : [
        { label: 'Log in', onPress: () => navigation.navigate('Login') },
        { label: 'Sign up', onPress: () => navigation.navigate('Signup') },
        { label: 'My Bookings / Dashboard', onPress: () => navigation.navigate('Dashboard') },
      ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Feather name="user" size={40} color={colors.primary} />
          </View>
          <Text style={styles.title}>Profile</Text>
          <Text style={styles.sub}>
            {isAuthenticated && user
              ? `Logged in as ${user.name}`
              : 'Manage your account & bookings'}
          </Text>
        </View>

        {/* Quick actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickBtn} onPress={handleCall}>
            <Feather name="phone" size={20} color="#fff" />
            <Text style={styles.quickBtnText}>Call Now</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickBtn, styles.quickBtnWhatsApp]}
            onPress={handleWhatsApp}
          >
            <Feather name="message-circle" size={20} color="#fff" />
            <Text style={styles.quickBtnText}>WhatsApp</Text>
          </TouchableOpacity>
        </View>

        {/* Account & Bookings */}
        <ProfileSection title="Account & Bookings" links={accountLinks} navigation={navigation} />

        {/* Support */}
        <ProfileSection title="Support" links={SUPPORT_LINKS} navigation={navigation} />

        {/* Legal */}
        <ProfileSection title="Legal" links={LEGAL_LINKS} navigation={navigation} />

        {/* Social */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Follow us</Text>
          <View style={styles.socialRow}>
            {SOCIAL_LINKS.map((s) => (
              <TouchableOpacity
                key={s.label}
                style={styles.socialBtn}
                onPress={() => openUrl(s.url)}
              >
                <Feather name={s.icon as keyof typeof Feather.glyphMap} size={22} color={colors.gray600} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Text style={styles.footer}>
          © Vizag Taxi Hub {new Date().getFullYear()}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function ProfileSection({
  title,
  links,
  navigation,
}: {
  title: string;
  links: ProfileLink[];
  navigation: any;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.linkList}>
        {links.map((link, index) => (
          <TouchableOpacity
            key={link.label}
            style={[styles.linkRow, index === links.length - 1 && styles.linkRowLast]}
            onPress={
              link.onPress ??
              (link.screen
                ? () => navigation.navigate(link.screen as never, link.params)
                : link.url
                  ? () => openUrl(link.url!)
                  : undefined)
            }
            activeOpacity={0.7}
          >
            <Text style={[styles.linkLabel, link.label === 'Log out' && styles.logoutLabel]}>
              {link.label}
            </Text>
            <Feather name="chevron-right" size={20} color={colors.gray600} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray50 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 32, paddingHorizontal: 20 },
  header: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.gray200,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: 6,
  },
  sub: {
    fontSize: 14,
    color: colors.gray600,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  quickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
  },
  quickBtnWhatsApp: {
    backgroundColor: '#25D366',
  },
  quickBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray600,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  linkList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
      android: { elevation: 2 },
    }),
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  linkRowLast: {
    borderBottomWidth: 0,
  },
  linkLabel: {
    fontSize: 16,
    color: colors.foreground,
    fontWeight: '500',
  },
  logoutLabel: { color: '#dc2626' },
  socialRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  socialBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
      android: { elevation: 2 },
    }),
  },
  footer: {
    fontSize: 12,
    color: colors.gray600,
    textAlign: 'center',
  },
});
