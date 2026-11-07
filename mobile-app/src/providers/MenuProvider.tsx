/**
 * MenuProvider - hamburger menu that slides out with nav items
 * Matches web app structure: Home, Hire Driver, Services, Company, Support, Dashboard, Logout
 */
import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Linking,
  ScrollView,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/core';
import { resetTabsAfterLogout, type TabParentForReset } from '../navigation/resetTabsAfterLogout';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useAuth } from './AuthProvider';
import { WEB_APP_BASE_URL } from '../config';

const PHONE = '+919966363662';

function getWebUrl(path: string): string {
  return `${WEB_APP_BASE_URL}${path}`;
}

interface MenuContextType {
  openMenu: () => void;
  closeMenu: () => void;
}

const MenuContext = createContext<MenuContextType | undefined>(undefined);

export function useMenu() {
  const ctx = useContext(MenuContext);
  if (!ctx) throw new Error('useMenu must be used within MenuProvider');
  return ctx;
}

type ExpandableKey = 'services' | 'company' | 'support';
type IonName = React.ComponentProps<typeof Ionicons>['name'];

const SERVICES_LINKS = [
  { label: 'Local Taxi', path: '/local-taxi' },
  { label: 'Outstation', path: '/outstation-taxi' },
  { label: 'Airport Transfer', path: '/airport-taxi' },
  { label: 'Tour Packages', path: '/tours' },
  { label: 'Tempo Traveller Rental', path: '/tempo-traveller-rental-vizag' },
];

const COMPANY_LINKS = [
  { label: 'Our Story', path: '/our-story' },
  { label: 'Vision & Mission', path: '/vision-mission' },
  { label: 'Fleet', path: '/fleet' },
  { label: 'Careers', path: '/careers' },
];

const SUPPORT_LINKS: { label: string; nativeScreen: string; params?: object }[] = [
  { label: 'Support', nativeScreen: 'ContactUs' },
  { label: 'Help Center', nativeScreen: 'HelpCenter' },
  { label: 'Contact Us', nativeScreen: 'ContactUs' },
  { label: 'Terms & Conditions', nativeScreen: 'StaticContent', params: { contentKey: 'terms' } },
  { label: 'Privacy Policy', nativeScreen: 'StaticContent', params: { contentKey: 'privacy' } },
  { label: 'Cancellation & Refund Policy', nativeScreen: 'StaticContent', params: { contentKey: 'refund' } },
];

function navigateToWeb(navigation: any, path: string, title: string) {
  navigation.navigate('Main', {
    screen: 'WebView',
    params: { url: getWebUrl(path), title },
  });
}

function navigateToNative(navigation: any, screen: string, params?: object) {
  navigation.navigate('Profile', { screen, params });
}

function MenuTile({
  icon,
  label,
  onPress,
}: {
  icon: IonName;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.tile} onPress={onPress} activeOpacity={0.75}>
      <Ionicons name={icon} size={22} color={colors.foreground} />
      <Text style={styles.tileLabel} numberOfLines={2}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function MenuRow({
  icon,
  label,
  onPress,
  expanded,
  danger,
  last,
}: {
  icon: IonName;
  label: string;
  onPress: () => void;
  expanded?: boolean;
  danger?: boolean;
  last?: boolean;
}) {
  const color = danger ? '#dc2626' : colors.foreground;
  const chevron: IonName =
    expanded === undefined ? 'chevron-forward' : expanded ? 'chevron-down' : 'chevron-forward';
  return (
    <TouchableOpacity
      style={[styles.row, !last && styles.rowDivider]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons name={icon} size={22} color={color} />
      <Text style={[styles.rowLabel, danger && styles.rowLabelDanger]}>{label}</Text>
      {!danger && <Ionicons name={chevron} size={18} color="#9ca3af" />}
    </TouchableOpacity>
  );
}

function SubRow({ label, onPress, last }: { label: string; onPress: () => void; last?: boolean }) {
  return (
    <TouchableOpacity
      style={[styles.subRow, !last && styles.rowDivider]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.subLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color="#c5cad3" />
    </TouchableOpacity>
  );
}

export function MenuProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState<Record<ExpandableKey, boolean>>({
    services: false,
    company: false,
    support: false,
  });
  const navigation = useNavigation<any>();
  const { user, isAuthenticated, logout } = useAuth();
  const isAdmin = !!(user?.role === 'admin' || user?.role === 'super_admin');
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const drawerWidth = Math.min(Math.round(width * 0.86), 420);

  const openMenu = useCallback(() => setVisible(true), []);
  const closeMenu = useCallback(() => {
    setVisible(false);
    setExpanded({ services: false, company: false, support: false });
  }, []);

  const navAndClose = (fn: () => void) => {
    closeMenu();
    setTimeout(fn, 100);
  };

  const toggleExpand = (key: ExpandableKey) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCall = () => {
    Linking.openURL(`tel:${PHONE}`).catch(() => {});
  };

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          const role = user?.role;
          closeMenu();
          await logout();
          const tabNav = navigation.getParent() as TabParentForReset;
          resetTabsAfterLogout(tabNav, role);
        },
      },
    ]);
  };

  const accountTitle = isAuthenticated ? user?.name || 'Account' : 'Login / Sign-up now';
  const accountSubtitle = isAuthenticated
    ? user?.phone || user?.email || 'View your profile'
    : 'Login to book and manage trips';

  return (
    <MenuContext.Provider value={{ openMenu, closeMenu }}>
      {children}
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={closeMenu}
      >
        <View style={styles.overlay}>
          <Pressable style={styles.backdrop} onPress={closeMenu} />
          <View style={[styles.drawer, { width: drawerWidth, paddingTop: insets.top + 8 }]}>
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
              showsVerticalScrollIndicator={false}
            >
              <TouchableOpacity
                style={styles.accountCard}
                onPress={() =>
                  navAndClose(() =>
                    navigation.navigate('Profile', {
                      screen: isAuthenticated ? 'ProfileHome' : 'Login',
                    })
                  )
                }
                activeOpacity={0.8}
              >
                <View style={styles.accountText}>
                  <Text style={styles.accountTitle} numberOfLines={1}>
                    {accountTitle}
                  </Text>
                  <Text style={styles.accountSubtitle} numberOfLines={1}>
                    {accountSubtitle}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
              </TouchableOpacity>

              <View style={styles.tileRow}>
                <MenuTile
                  icon="home-outline"
                  label="Home"
                  onPress={() => navAndClose(() => navigation.navigate('Main', { screen: 'Home' }))}
                />
                <MenuTile
                  icon="map-outline"
                  label="Build Your Trip"
                  onPress={() => navAndClose(() => navigation.navigate('BuildMyTrip'))}
                />
                <MenuTile
                  icon="calendar-outline"
                  label="Dashboard"
                  onPress={() =>
                    navAndClose(() => navigation.navigate('Profile', { screen: 'Dashboard' }))
                  }
                />
              </View>

              <View style={styles.card}>
                <MenuRow
                  icon="person-outline"
                  label="Hire Driver"
                  onPress={() => navAndClose(() => navigateToWeb(navigation, '/hire-driver', 'Hire Driver'))}
                />
                <MenuRow
                  icon="car-outline"
                  label="Services"
                  expanded={expanded.services}
                  onPress={() => toggleExpand('services')}
                />
                {expanded.services &&
                  SERVICES_LINKS.map((item) => (
                    <SubRow
                      key={item.path}
                      label={item.label}
                      onPress={() => navAndClose(() => navigateToWeb(navigation, item.path, item.label))}
                    />
                  ))}
                <MenuRow
                  icon="information-circle-outline"
                  label="Company"
                  expanded={expanded.company}
                  onPress={() => toggleExpand('company')}
                />
                {expanded.company &&
                  COMPANY_LINKS.map((item) => (
                    <SubRow
                      key={item.path}
                      label={item.label}
                      onPress={() => navAndClose(() => navigateToWeb(navigation, item.path, item.label))}
                    />
                  ))}
                <MenuRow
                  icon="call-outline"
                  label="Support"
                  expanded={expanded.support}
                  last={!expanded.support}
                  onPress={() => toggleExpand('support')}
                />
                {expanded.support &&
                  SUPPORT_LINKS.map((item) => (
                    <SubRow
                      key={item.label}
                      label={item.label}
                      onPress={() =>
                        navAndClose(() => navigateToNative(navigation, item.nativeScreen, item.params))
                      }
                    />
                  ))}
                {expanded.support && (
                  <TouchableOpacity
                    style={styles.callRow}
                    onPress={() => navAndClose(handleCall)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="call" size={18} color={colors.primary} />
                    <Text style={styles.callLabel}>9966363662</Text>
                  </TouchableOpacity>
                )}
              </View>

              {isAdmin && (
                <View style={styles.card}>
                  <MenuRow
                    icon="settings-outline"
                    label="Admin Dashboard"
                    last
                    onPress={() =>
                      navAndClose(() => navigation.navigate('Profile', { screen: 'AdminDashboard' }))
                    }
                  />
                </View>
              )}

              {isAuthenticated && (
                <View style={styles.card}>
                  <MenuRow
                    icon="log-out-outline"
                    label="Logout"
                    danger
                    last
                    onPress={handleLogout}
                  />
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </MenuContext.Provider>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.45)',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  drawer: {
    backgroundColor: '#F3F4F6',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F2FF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  accountText: {
    flex: 1,
    gap: 2,
  },
  accountTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  accountSubtitle: {
    fontSize: 13,
    color: '#6b7280',
  },
  tileRow: {
    flexDirection: 'row',
    gap: 10,
  },
  tile: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    minHeight: 84,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#EEF0F3',
  },
  tileLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.foreground,
    textAlign: 'center',
    lineHeight: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EEF0F3',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 16,
    gap: 14,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8EAEE',
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.foreground,
  },
  rowLabelDanger: {
    color: '#dc2626',
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingRight: 16,
    paddingLeft: 52,
    backgroundColor: '#F8FAFC',
    gap: 8,
  },
  subLabel: {
    flex: 1,
    fontSize: 14,
    color: colors.gray700,
  },
  callRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: '#F8FAFC',
  },
  callLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
});
