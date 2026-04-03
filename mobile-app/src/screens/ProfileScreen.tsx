/**
 * Profile tab - mirrors web app profile (login, dashboard, support, legal, edit profile)
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { resetTabsAfterLogout, type TabParentForReset } from '../navigation/resetTabsAfterLogout';
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
  const { user, isAuthenticated, logout, updateProfile } = useAuth();
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editName, setEditName] = useState(user?.name ?? '');
  const [editPhone, setEditPhone] = useState(user?.phone ?? '');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  useEffect(() => {
    if (showEditProfile && user) {
      setEditName(user.name ?? '');
      setEditPhone(user.phone ?? '');
      setEditError('');
    }
  }, [showEditProfile, user?.name, user?.phone]);

  const handleSaveProfile = async () => {
    const trimmedName = editName.trim();
    const trimmedPhone = editPhone.trim();
    if (trimmedName.length < 2) {
      setEditError('Name must be at least 2 characters');
      return;
    }
    if (trimmedPhone && trimmedPhone.replace(/\D/g, '').length < 10) {
      setEditError('Please enter a valid phone number (at least 10 digits)');
      return;
    }
    setEditLoading(true);
    setEditError('');
    try {
      await updateProfile({ name: trimmedName, phone: trimmedPhone || undefined });
      setShowEditProfile(false);
    } catch (e) {
      setEditError(e instanceof Error ? e.message : 'Failed to update');
    } finally {
      setEditLoading(false);
    }
  };

  const handleCall = () => openUrl(`tel:${PHONE_NUMBER}`);
  const handleWhatsApp = () => openUrl(`https://wa.me/${WHATSAPP_NUMBER}`);

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          const role = user?.role;
          await logout();
          const tabNav = navigation.getParent() as TabParentForReset;
          resetTabsAfterLogout(tabNav, role);
        },
      },
    ]);
  };

  const accountLinks: ProfileLink[] = isAuthenticated
    ? [
        { label: 'Edit Profile', onPress: () => setShowEditProfile(true) },
        ...(isAdmin ? [{ label: 'Admin Dashboard', onPress: () => navigation.navigate('AdminDashboard') }] : []),
        ...(user?.role === 'super_admin'
          ? [{ label: 'Driver ops', onPress: () => navigation.navigate('AdminDriverOpsDashboard') }]
          : []),
        { label: 'My Bookings / Dashboard', onPress: () => navigation.navigate('Dashboard') },
        { label: 'Log out', onPress: handleLogout },
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

      <Modal visible={showEditProfile} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.editModalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity style={styles.editModalBackdrop} activeOpacity={1} onPress={() => setShowEditProfile(false)} />
          <View style={styles.editModalContent}>
            <View style={styles.editModalHeader}>
              <Text style={styles.editModalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setShowEditProfile(false)}>
                <Feather name="x" size={24} color={colors.gray600} />
              </TouchableOpacity>
            </View>
            <Text style={styles.editModalDesc}>Update your name and phone. Email cannot be changed.</Text>
            <Text style={styles.editLabel}>Name</Text>
            <TextInput
              style={styles.editInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Your name"
              placeholderTextColor={colors.gray600}
            />
            <Text style={styles.editLabel}>Phone</Text>
            <TextInput
              style={styles.editInput}
              value={editPhone}
              onChangeText={setEditPhone}
              placeholder="e.g. 9876543210"
              placeholderTextColor={colors.gray600}
              keyboardType="phone-pad"
              maxLength={15}
            />
            {user?.email && (
              <>
                <Text style={[styles.editLabel, { color: colors.gray600 }]}>Email (read-only)</Text>
                <TextInput
                  style={[styles.editInput, styles.editInputDisabled]}
                  value={user.email}
                  editable={false}
                />
              </>
            )}
            {editError ? <Text style={styles.editError}>{editError}</Text> : null}
            <View style={styles.editModalBtns}>
              <TouchableOpacity style={styles.editCancelBtn} onPress={() => setShowEditProfile(false)} disabled={editLoading}>
                <Text style={styles.editCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.editSaveBtn, editLoading && { opacity: 0.7 }]}
                onPress={handleSaveProfile}
                disabled={editLoading}
              >
                {editLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.editSaveText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  editModalOverlay: { flex: 1, justifyContent: 'flex-end' },
  editModalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  editModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 24,
    paddingBottom: 40,
  },
  editModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  editModalTitle: { fontSize: 18, fontWeight: '700', color: colors.foreground },
  editModalDesc: { fontSize: 14, color: colors.gray600, marginBottom: 20 },
  editLabel: { fontSize: 14, fontWeight: '500', color: colors.foreground, marginBottom: 6 },
  editInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.foreground,
    marginBottom: 16,
  },
  editInputDisabled: { backgroundColor: colors.gray100 },
  editError: { fontSize: 14, color: '#dc2626', marginBottom: 12 },
  editModalBtns: { flexDirection: 'row', gap: 12 },
  editCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.gray300,
    alignItems: 'center',
  },
  editCancelText: { fontSize: 16, fontWeight: '600', color: colors.gray600 },
  editSaveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  editSaveText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
