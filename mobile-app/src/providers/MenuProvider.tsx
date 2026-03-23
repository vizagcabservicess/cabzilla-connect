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
  Platform,
  Linking,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/core';
import { CommonActions } from '@react-navigation/native';
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
          closeMenu();
          await logout();
          const tabNav = navigation.getParent();
          tabNav?.dispatch(CommonActions.reset({
            index: 0,
            routes: [
              { name: 'Main', state: { routes: [{ name: 'Home', params: { showAuthSheet: true } }] } },
              { name: 'FleetVehicles' },
              { name: 'HireDriver' },
              { name: 'Profile' },
            ],
          }));
        },
      },
    ]);
  };

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
          <View style={styles.drawer}>
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>Menu</Text>
              <TouchableOpacity onPress={closeMenu} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
              {/* Home */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => navAndClose(() => navigation.navigate('Main', { screen: 'Home' }))}
                activeOpacity={0.7}
              >
                <Ionicons name="home" size={20} color={colors.foreground} />
                <Text style={styles.menuLabel}>Home</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.gray600} />
              </TouchableOpacity>

              {/* Hire Driver */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => navAndClose(() => navigateToWeb(navigation, '/hire-driver', 'Hire Driver'))}
                activeOpacity={0.7}
              >
                <Ionicons name="person" size={20} color={colors.foreground} />
                <Text style={styles.menuLabel}>Hire Driver</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.gray600} />
              </TouchableOpacity>

              {/* Services */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => toggleExpand('services')}
                activeOpacity={0.7}
              >
                <Ionicons name="car" size={20} color={colors.foreground} />
                <Text style={styles.menuLabel}>Services</Text>
                <Ionicons
                  name={expanded.services ? 'chevron-down' : 'chevron-forward'}
                  size={18}
                  color={colors.gray600}
                />
              </TouchableOpacity>
              {expanded.services &&
                SERVICES_LINKS.map((item) => (
                  <TouchableOpacity
                    key={item.path}
                    style={styles.subItem}
                    onPress={() => navAndClose(() => navigateToWeb(navigation, item.path, item.label))}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.subLabel}>{item.label}</Text>
                  </TouchableOpacity>
                ))}

              {/* Company */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => toggleExpand('company')}
                activeOpacity={0.7}
              >
                <Ionicons name="information-circle" size={20} color={colors.foreground} />
                <Text style={styles.menuLabel}>Company</Text>
                <Ionicons
                  name={expanded.company ? 'chevron-down' : 'chevron-forward'}
                  size={18}
                  color={colors.gray600}
                />
              </TouchableOpacity>
              {expanded.company &&
                COMPANY_LINKS.map((item) => (
                  <TouchableOpacity
                    key={item.path}
                    style={styles.subItem}
                    onPress={() => navAndClose(() => navigateToWeb(navigation, item.path, item.label))}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.subLabel}>{item.label}</Text>
                  </TouchableOpacity>
                ))}

              {/* Support */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => toggleExpand('support')}
                activeOpacity={0.7}
              >
                <Ionicons name="call" size={20} color={colors.foreground} />
                <Text style={styles.menuLabel}>Support</Text>
                <Ionicons
                  name={expanded.support ? 'chevron-down' : 'chevron-forward'}
                  size={18}
                  color={colors.gray600}
                />
              </TouchableOpacity>
              {expanded.support &&
                SUPPORT_LINKS.map((item) => (
                  <TouchableOpacity
                    key={item.label}
                    style={styles.subItem}
                    onPress={() => navAndClose(() => navigateToNative(navigation, item.nativeScreen, item.params))}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.subLabel}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              {expanded.support && (
                <TouchableOpacity
                  style={styles.callButton}
                  onPress={() => navAndClose(handleCall)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="call" size={20} color="#fff" />
                  <Text style={styles.callButtonText}>9966363662</Text>
                </TouchableOpacity>
              )}

              {/* Admin Dashboard - only for admin/super_admin */}
              {isAdmin && (
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() =>
                    navAndClose(() => navigation.navigate('Profile', { screen: 'AdminDashboard' }))
                  }
                  activeOpacity={0.7}
                >
                  <Ionicons name="settings" size={20} color={colors.foreground} />
                  <Text style={styles.menuLabel}>Admin Dashboard</Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.gray600} />
                </TouchableOpacity>
              )}

              {/* Dashboard */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() =>
                  navAndClose(() =>
                    navigation.navigate('Profile', { screen: 'Dashboard' })
                  )
                }
                activeOpacity={0.7}
              >
                <Ionicons name="calendar" size={20} color={colors.foreground} />
                <Text style={styles.menuLabel}>Dashboard</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.gray600} />
              </TouchableOpacity>

              {/* Logout */}
              {isAuthenticated && (
                <TouchableOpacity
                  style={[styles.menuItem, styles.logoutItem]}
                  onPress={handleLogout}
                  activeOpacity={0.7}
                >
                  <Ionicons name="log-out-outline" size={20} color="#dc2626" />
                  <Text style={styles.logoutLabel}>Logout</Text>
                </TouchableOpacity>
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
    backgroundColor: 'rgba(0,0,0,0.4)',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  drawer: {
    width: 280,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 50 : 24,
    paddingBottom: 24,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  drawerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.foreground,
  },
  closeBtn: { padding: 4 },
  scroll: {
    maxHeight: '85%',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: colors.foreground,
  },
  subItem: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    paddingLeft: 48,
  },
  subLabel: {
    fontSize: 15,
    color: colors.gray600,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 12,
    borderRadius: 8,
  },
  callButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  logoutItem: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  logoutLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#dc2626',
  },
});
