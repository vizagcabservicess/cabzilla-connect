/**
 * Admin Menu - full native design, no WebView or web URLs.
 * All items open native screens with full functionality (mirrors web app logic).
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import type { RootStackParamList } from '../navigation/types';
import { useAuth } from '../providers/AuthProvider';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminMenu'>;

type MenuItem = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  screen: string;
  params?: Record<string, string>;
  isFullNative?: boolean;
  /** If true, only `super_admin` sees this row (matches web driver dashboard gate). */
  superAdminOnly?: boolean;
};

const MENU_ITEMS: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'grid-outline', screen: 'AdminDashboard', isFullNative: true },
  { id: 'bookings', label: 'Bookings', icon: 'calendar-outline', screen: 'AdminBookingsList', isFullNative: true },
  {
    id: 'upcoming-trips',
    label: 'Upcoming trips',
    icon: 'time-outline',
    screen: 'AdminUpcomingTrips',
    isFullNative: true,
  },
  { id: 'create-booking', label: 'Create Booking', icon: 'add-circle-outline', screen: 'AdminCreateBooking', isFullNative: true },
  { id: 'group-tours', label: 'Group Tours', icon: 'bus-outline', screen: 'AdminGroupTours', isFullNative: true },
  { id: 'vehicles', label: 'Vehicles', icon: 'car-outline', screen: 'AdminVehiclesList', isFullNative: true },
  { id: 'drivers', label: 'Drivers', icon: 'people-outline', screen: 'AdminDriversList', isFullNative: true },
  {
    id: 'driver-ops',
    label: 'Driver ops',
    icon: 'speedometer-outline',
    screen: 'AdminDriverOpsDashboard',
    isFullNative: true,
    superAdminOnly: true,
  },
  { id: 'fleet', label: 'Fleet Management', icon: 'car-sport-outline', screen: 'AdminFleet', isFullNative: true },
  { id: 'fares', label: 'Fares', icon: 'document-text-outline', screen: 'AdminFares', isFullNative: true },
  { id: 'commission', label: 'Commission', icon: 'pricetag-outline', screen: 'AdminCommission', isFullNative: true },
  { id: 'fuel', label: 'Fuel Management', icon: 'water-outline', screen: 'AdminFuel', isFullNative: true },
  { id: 'maintenance', label: 'Vehicle Maintenance', icon: 'construct-outline', screen: 'AdminMaintenance', isFullNative: true },
  { id: 'ledger', label: 'Ledger', icon: 'book-outline', screen: 'AdminLedger', isFullNative: true },
  { id: 'expenses', label: 'Expenses', icon: 'wallet-outline', screen: 'AdminExpenses', isFullNative: true },
  { id: 'payroll', label: 'Payroll', icon: 'card-outline', screen: 'AdminPayroll', isFullNative: true },
  { id: 'payments', label: 'Payments', icon: 'card-outline', screen: 'AdminPayments', isFullNative: true },
  { id: 'payment-tracking', label: 'Payment Tracking', icon: 'bar-chart-outline', screen: 'AdminPaymentTracking', isFullNative: true },
  { id: 'users', label: 'Users', icon: 'people-outline', screen: 'AdminUsers', isFullNative: true },
  { id: 'reports', label: 'Reports', icon: 'stats-chart-outline', screen: 'AdminReports', isFullNative: true },
];

export function AdminMenuScreen({ navigation }: Props) {
  const { user } = useAuth();
  const visibleItems = MENU_ITEMS.filter(
    (item) => !item.superAdminOnly || user?.role === 'super_admin'
  );

  const handlePress = (item: MenuItem) => {
    (navigation.navigate as (name: string, params?: object) => void)(item.screen, item.params ?? {});
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.title}>Admin Menu</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>Vizag Taxi Hub</Text>
        <View style={styles.grid}>
          {visibleItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.gridItem}
              onPress={() => handlePress(item)}
              activeOpacity={0.7}
            >
              <View style={styles.gridIconWrap}>
                <Ionicons name={item.icon} size={24} color={colors.primary} />
              </View>
              <Text style={styles.gridLabel} numberOfLines={2}>
                {item.label}
              </Text>
              {item.isFullNative ? (
                <View style={styles.nativeBadge}>
                  <Text style={styles.nativeBadgeText}>Native</Text>
                </View>
              ) : (
                <View style={styles.soonBadge}>
                  <Text style={styles.soonBadgeText}>Soon</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray50 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  backBtn: { padding: 4, minWidth: 32 },
  title: { fontSize: 18, fontWeight: '700', color: colors.foreground },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  subtitle: {
    fontSize: 14,
    color: colors.gray600,
    marginBottom: 20,
    fontWeight: '500',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridItem: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 3 },
    }),
  },
  gridIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  gridLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.foreground,
  },
  nativeBadge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#dbeafe',
    borderRadius: 4,
  },
  nativeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
  },
  soonBadge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#fef3c7',
    borderRadius: 4,
  },
  soonBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#b45309',
  },
});
