/**
 * Admin Upcoming Trips — parity with web UpcomingTripsList (filters, badges, WhatsApp, actions).
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import type { RootStackParamList } from '../navigation/types';
import { adminAPI } from '../services/adminAPI';
import {
  formatPassengerPhoneForDisplay,
  passengerPhoneE164Digits,
  passengerPhoneToTelHref,
} from '../utils/passengerPhoneDisplay';
import type { UserBooking } from '../services/userBookingsAPI';
import {
  generateBookingConfirmationMessage,
  generateDriverAssignmentMessage,
  generateUpcomingTripReminderMessage,
} from '../services/adminWhatsAppMessages';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminUpcomingTrips'>;

const TRIP_CHIPS: { label: string; value: string }[] = [
  { label: 'All types', value: 'all' },
  { label: 'Airport', value: 'airport' },
  { label: 'Local', value: 'local' },
  { label: 'Outstation', value: 'outstation' },
  { label: 'Tour', value: 'tour' },
];

const PAY_CHIPS: { label: string; value: string }[] = [
  { label: 'All', value: 'all' },
  { label: 'Paid', value: 'paid' },
  { label: 'Partial', value: 'partial' },
  { label: 'Pending', value: 'pending' },
];

/** Parse API pickup into an ISO string Date() understands (handles MySQL "YYYY-MM-DD HH:mm:ss" on pickups). */
function buildPickupIso(booking: UserBooking): string {
  const camel = booking.pickupDate;
  const snake = booking.pickup_date;
  const raw = String(camel ?? snake ?? '').trim();
  const timeOnly = booking.pickup_time ? String(booking.pickup_time).trim() : '';

  if (!raw) return '';

  // Already ISO: 2026-03-21T07:39:00 or with Z
  if (raw.includes('T')) {
    return raw;
  }

  // MySQL datetime: "2026-03-21 07:39:00" — must not append another T+time (breaks Date parsing).
  const mysqlDt = raw.match(
    /^(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2}(?::\d{2})?)/,
  );
  if (mysqlDt) {
    const [, d, tm] = mysqlDt;
    const parts = tm.split(':');
    const hh = parts[0].padStart(2, '0');
    const mm = (parts[1] ?? '00').padStart(2, '0');
    const ss = parts[2] != null ? parts[2].padStart(2, '0') : '00';
    return `${d}T${hh}:${mm}:${ss}`;
  }

  // Date only YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const t =
      timeOnly && /^\d{1,2}:\d{2}/.test(timeOnly) ? timeOnly.slice(0, 5) : '12:00';
    const [th, tm] = t.split(':');
    return `${raw}T${th.padStart(2, '0')}:${tm.padStart(2, '0')}:00`;
  }

  return raw;
}

function isWithinNext24Hours(pickupIso: string): boolean {
  const t = new Date(pickupIso).getTime();
  if (Number.isNaN(t)) return false;
  const now = Date.now();
  return t >= now && t <= now + 24 * 60 * 60 * 1000;
}

function formatPickupDisplay(dateString: string): string {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '—';
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleString('en-US', { month: 'short' });
    const year = date.getFullYear();
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${day} ${month} ${year} at ${displayHours}:${minutes} ${ampm}`;
  } catch {
    return '—';
  }
}

function tripTypeKey(booking: UserBooking): string {
  return String(booking.tripType ?? booking.trip_type ?? '').toLowerCase();
}

function paymentLabel(booking: UserBooking): string {
  const ps = String(
    booking.payment_status ?? booking.paymentStatus ?? ''
  ).toLowerCase();
  if (ps === 'paid') return 'Paid';
  if (ps === 'partial') return 'Partial';
  return 'Pending';
}

function locName(loc: unknown): string {
  if (typeof loc === 'string') return loc;
  if (loc && typeof loc === 'object' && 'name' in loc) return String((loc as { name?: string }).name ?? '');
  return String(loc ?? '');
}

export function AdminUpcomingTripsScreen({ navigation }: Props) {
  const [bookings, setBookings] = useState<UserBooking[]>([]);
  const [driverOptions, setDriverOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [tripFilter, setTripFilter] = useState('all');
  const [driverFilter, setDriverFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [driverPickerOpen, setDriverPickerOpen] = useState(false);

  const [actionBooking, setActionBooking] = useState<UserBooking | null>(null);
  const [whatsappSendingId, setWhatsappSendingId] = useState<number | null>(null);
  const [bulkSending, setBulkSending] = useState(false);

  const fetchUpcoming = useCallback(async () => {
    try {
      setError(null);
      const params: Record<string, string> = {};
      if (dateFrom.trim()) params.date_from = dateFrom.trim();
      if (dateTo.trim()) params.date_to = dateTo.trim();
      if (tripFilter !== 'all') params.trip_type = tripFilter;
      if (paymentFilter !== 'all') params.payment_status = paymentFilter;
      if (driverFilter === 'unassigned') params.driver = 'unassigned';
      else if (driverFilter !== 'all') params.driver = driverFilter;

      const data = await adminAPI.getUpcomingBookings(params);
      setBookings(data.bookings);
      setDriverOptions(data.drivers);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load upcoming trips';
      setError(msg);
      setBookings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateFrom, dateTo, tripFilter, driverFilter, paymentFilter]);

  useEffect(() => {
    setLoading(true);
    fetchUpcoming();
  }, [fetchUpcoming]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUpcoming();
  };

  const openDetails = (b: UserBooking) => {
    navigation.navigate('BookingDetail', { booking: b as Record<string, unknown>, source: 'admin' });
  };

  const openAssignDriver = (b: UserBooking) => {
    navigation.navigate('AssignDriver', {
      bookingId: b.id,
      booking: b as Record<string, unknown>,
    });
  };

  const sendCustomerWhatsApp = async (
    kind: 'confirmation' | 'driver' | 'reminder',
    row: UserBooking
  ) => {
    const phoneRaw = String(
      row.passengerPhone ?? row.passenger_phone ?? row.guest_phone ?? ''
    ).trim();
    if (!phoneRaw) {
      Alert.alert('WhatsApp', 'No customer phone on this booking');
      return;
    }
    const rowCc = (row as Record<string, unknown>).passengerCountryCode ??
      (row as Record<string, unknown>).passenger_country_code;
    setWhatsappSendingId(row.id);
    setActionBooking(null);
    try {
      const full = await adminAPI.getBookingById(row.id);
      if (kind === 'driver') {
        const dn = String(full.driverName ?? full.driver_name ?? '').trim();
        if (!dn) {
          Alert.alert('WhatsApp', 'Assign a driver first, then send driver details');
          setWhatsappSendingId(null);
          return;
        }
      }
      let text: string;
      if (kind === 'confirmation') {
        text = generateBookingConfirmationMessage(full as any);
      } else if (kind === 'driver') {
        text = generateDriverAssignmentMessage(full as any);
      } else {
        text = generateUpcomingTripReminderMessage(full as any);
      }
      const fullRecord = full as Record<string, unknown>;
      const cc =
        (fullRecord.passengerCountryCode ?? fullRecord.passenger_country_code ?? rowCc) as
          | string
          | undefined;
      const waPhone = passengerPhoneE164Digits(phoneRaw, cc);
      if (!waPhone) {
        Alert.alert(
          'WhatsApp',
          'Need full international number (+…) or passenger country code on the booking to send.',
        );
        return;
      }
      await adminAPI.sendAdminTripWhatsApp(waPhone, text, 'trip');
      Alert.alert('WhatsApp', 'Message sent to customer (trip line)');
    } catch (e) {
      Alert.alert('WhatsApp', e instanceof Error ? e.message : 'Send failed');
    } finally {
      setWhatsappSendingId(null);
    }
  };

  const handleBulkTomorrowAdmin = () => {
    Alert.alert(
      'WhatsApp admins (tomorrow)',
      'Send the same grouped summary as the daily cron to WHATSAPP_ADMIN_PHONE(S)? Only confirmed pickups for tomorrow.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send now',
          onPress: async () => {
            setBulkSending(true);
            try {
              const res = await adminAPI.sendTomorrowAdminWhatsAppBulk();
              const d = res.data;
              const line = d
                ? `${d.booking_count} booking(s), ${d.whatsapp_parts} part(s) × ${d.admin_recipients} admin number(s)`
                : 'Done';
              if (res.status === 'warning' && res.message) {
                Alert.alert('WhatsApp', `${line}\n${res.message}`);
              } else {
                Alert.alert('WhatsApp', line);
              }
              await fetchUpcoming();
            } catch (e) {
              Alert.alert('Error', e instanceof Error ? e.message : 'Bulk send failed');
            } finally {
              setBulkSending(false);
            }
          },
        },
      ]
    );
  };

  const callCustomer = (b: UserBooking) => {
    const raw = String(b.passengerPhone ?? b.passenger_phone ?? '').trim();
    if (!raw) {
      Alert.alert('Call', 'No phone number');
      return;
    }
    const br = b as Record<string, unknown>;
    const cc = br.passengerCountryCode ?? br.passenger_country_code;
    const href = passengerPhoneToTelHref(raw, cc as string | undefined);
    if (href) Linking.openURL(href).catch(() => {});
    else {
      const digits = raw.replace(/\D/g, '');
      if (digits) Linking.openURL(`tel:${digits}`).catch(() => {});
    }
  };

  const driverChipLabel =
    driverFilter === 'all'
      ? 'All drivers'
      : driverFilter === 'unassigned'
        ? 'Unassigned only'
        : driverFilter;

  if (loading && bookings.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={styles.title}>Upcoming trips</Text>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.title}>Upcoming trips</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        keyboardShouldPersistTaps="handled"
      >
        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={20} color="#dc2626" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.dateRow}>
          <View style={styles.dateField}>
            <Text style={styles.fieldLabel}>From (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={dateFrom}
              onChangeText={setDateFrom}
              placeholder="Optional"
              placeholderTextColor={colors.gray600}
            />
          </View>
          <View style={styles.dateField}>
            <Text style={styles.fieldLabel}>To (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={dateTo}
              onChangeText={setDateTo}
              placeholder="Optional"
              placeholderTextColor={colors.gray600}
            />
          </View>
        </View>

        <Text style={styles.sectionLabel}>Trip type</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {TRIP_CHIPS.map((c) => (
            <TouchableOpacity
              key={c.value}
              style={[styles.chip, tripFilter === c.value && styles.chipActive]}
              onPress={() => setTripFilter(c.value)}
            >
              <Text style={[styles.chipText, tripFilter === c.value && styles.chipTextActive]}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.sectionLabel}>Payment</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {PAY_CHIPS.map((c) => (
            <TouchableOpacity
              key={c.value}
              style={[styles.chip, paymentFilter === c.value && styles.chipActive]}
              onPress={() => setPaymentFilter(c.value)}
            >
              <Text style={[styles.chipText, paymentFilter === c.value && styles.chipTextActive]}>
                {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.sectionLabel}>Driver</Text>
        <TouchableOpacity style={styles.driverPickBtn} onPress={() => setDriverPickerOpen(true)}>
          <Text style={styles.driverPickText}>{driverChipLabel}</Text>
          <Ionicons name="chevron-down" size={20} color={colors.gray600} />
        </TouchableOpacity>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh} disabled={refreshing}>
            <Ionicons name="refresh" size={20} color={colors.primary} />
            <Text style={styles.refreshText}>{refreshing ? 'Refreshing…' : 'Refresh'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.waAdminBtn, bulkSending && styles.btnDisabled]}
            onPress={handleBulkTomorrowAdmin}
            disabled={bulkSending}
          >
            <Ionicons name="logo-whatsapp" size={20} color="#fff" />
            <Text style={styles.waAdminText}>{bulkSending ? 'Sending…' : 'WhatsApp admins (tomorrow)'}</Text>
          </TouchableOpacity>
        </View>

        {bookings.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color={colors.gray200} />
            <Text style={styles.emptyText}>No upcoming trips match your filters.</Text>
          </View>
        ) : (
          bookings.map((booking) => {
            const pickupStr = buildPickupIso(booking);
            const urgent = pickupStr ? isWithinNext24Hours(pickupStr) : false;
            const tt = tripTypeKey(booking);
            const ps = paymentLabel(booking);
            const driverNm = String(booking.driverName ?? booking.driver_name ?? '').trim();
            const driverAssigned = driverNm.length > 0;

            return (
              <View
                key={booking.id}
                style={[styles.card, urgent && styles.cardUrgent]}
              >
                <TouchableOpacity onPress={() => openDetails(booking)} activeOpacity={0.75}>
                  <Text style={styles.bookingRef}>
                    {String(booking.bookingNumber ?? booking.booking_number ?? booking.id)}
                  </Text>
                  <Text style={styles.customer}>
                    {String(booking.passengerName ?? booking.guest_name ?? '—')}
                  </Text>
                  <View style={styles.phoneRow}>
                    <Ionicons name="call-outline" size={12} color={colors.gray600} />
                    <Text style={styles.phone}>
                      {formatPassengerPhoneForDisplay(
                        String(booking.passengerPhone ?? booking.passenger_phone ?? booking.guest_phone ?? ''),
                        (booking as Record<string, unknown>).passengerCountryCode ??
                          (booking as Record<string, unknown>).passenger_country_code
                      ) ||
                        String(booking.passengerPhone ?? booking.passenger_phone ?? booking.guest_phone ?? '—')}
                    </Text>
                  </View>
                  <View style={styles.route}>
                    <Text style={styles.routeText} numberOfLines={2}>
                      {locName(booking.pickupLocation ?? booking.pickup_location)} →{' '}
                      {locName(booking.dropLocation ?? booking.drop_location)}
                    </Text>
                  </View>
                  <View style={styles.pickupRow}>
                    <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                    <Text style={styles.pickupText}>{formatPickupDisplay(pickupStr)}</Text>
                  </View>
                  {urgent && (
                    <View style={styles.badge24}>
                      <Text style={styles.badge24Text}>Next 24h</Text>
                    </View>
                  )}
                  <View style={styles.badgeRow}>
                    {tt === 'tour' ? (
                      <View style={[styles.badge, styles.badgeTour]}>
                        <Text style={styles.badgeTextLight}>Tour</Text>
                      </View>
                    ) : (
                      <View style={styles.badgeMuted}>
                        <Text style={styles.badgeMutedText}>
                          {String(booking.tripTypeDisplay ?? booking.trip_type ?? '—')}
                        </Text>
                      </View>
                    )}
                    <Text style={styles.tourDur}>
                      {String(booking.tourDurationLabel ?? '').trim() || '—'}
                    </Text>
                  </View>
                  <View style={styles.vehRow}>
                    <Ionicons name="car-outline" size={16} color="#ea580c" />
                    <Text style={styles.vehText}>
                      {String(booking.cabType ?? booking.vehicle_type ?? '—')}
                    </Text>
                  </View>
                  <View style={styles.driverPayRow}>
                    <View style={styles.driverCol}>
                      <Text style={styles.driverNameText} numberOfLines={1}>
                        {driverAssigned ? driverNm : '—'}
                      </Text>
                      {!driverAssigned && (
                        <View style={styles.notAssigned}>
                          <Text style={styles.notAssignedText}>Driver not assigned</Text>
                        </View>
                      )}
                    </View>
                    <View
                      style={[
                        styles.payBadge,
                        ps === 'Paid'
                          ? styles.payPaid
                          : ps === 'Partial'
                            ? styles.payPartial
                            : styles.payPending,
                      ]}
                    >
                      <Text style={styles.payBadgeText}>{ps}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.moreBtn}
                    onPress={() => setActionBooking(booking)}
                    disabled={whatsappSendingId === booking.id}
                  >
                    <Ionicons name="ellipsis-horizontal" size={22} color={colors.foreground} />
                    <Text style={styles.moreBtnLabel}>Actions</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      <Modal visible={driverPickerOpen} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setDriverPickerOpen(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Filter by driver</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              <TouchableOpacity
                style={styles.modalRow}
                onPress={() => {
                  setDriverFilter('all');
                  setDriverPickerOpen(false);
                }}
              >
                <Text>All drivers</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalRow}
                onPress={() => {
                  setDriverFilter('unassigned');
                  setDriverPickerOpen(false);
                }}
              >
                <Text>Unassigned only</Text>
              </TouchableOpacity>
              {driverOptions.map((d) => (
                <TouchableOpacity
                  key={d}
                  style={styles.modalRow}
                  onPress={() => {
                    setDriverFilter(d);
                    setDriverPickerOpen(false);
                  }}
                >
                  <Text>{d}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={!!actionBooking} transparent animationType="slide">
        <View style={styles.actionModalBg}>
          <View style={styles.actionSheet}>
            <Text style={styles.actionTitle}>Actions</Text>
            {actionBooking && (
              <>
                <TouchableOpacity
                  style={styles.actionRow}
                  onPress={() => {
                    const b = actionBooking;
                    setActionBooking(null);
                    openDetails(b);
                  }}
                >
                  <Ionicons name="eye-outline" size={22} color={colors.primary} />
                  <Text style={styles.actionRowText}>View details</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionRow}
                  onPress={() => {
                    const b = actionBooking;
                    setActionBooking(null);
                    openAssignDriver(b);
                  }}
                >
                  <Ionicons name="person-add-outline" size={22} color={colors.primary} />
                  <Text style={styles.actionRowText}>Assign driver</Text>
                </TouchableOpacity>
                <Text style={styles.actionSub}>WhatsApp (trip line)</Text>
                <TouchableOpacity
                  style={styles.actionRow}
                  disabled={whatsappSendingId === actionBooking.id}
                  onPress={() => sendCustomerWhatsApp('confirmation', actionBooking)}
                >
                  <Ionicons name="logo-whatsapp" size={22} color="#16a34a" />
                  <Text style={styles.actionRowText}>Full booking summary</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.actionRow,
                    (!String(actionBooking.driverName ?? actionBooking.driver_name ?? '').trim() ||
                      whatsappSendingId === actionBooking.id) && { opacity: 0.45 },
                  ]}
                  disabled={
                    !String(actionBooking.driverName ?? actionBooking.driver_name ?? '').trim() ||
                    whatsappSendingId === actionBooking.id
                  }
                  onPress={() => sendCustomerWhatsApp('driver', actionBooking)}
                >
                  <Ionicons name="logo-whatsapp" size={22} color="#2563eb" />
                  <Text style={styles.actionRowText}>Driver details</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionRow}
                  disabled={whatsappSendingId === actionBooking.id}
                  onPress={() => sendCustomerWhatsApp('reminder', actionBooking)}
                >
                  <Ionicons name="logo-whatsapp" size={22} color="#d97706" />
                  <Text style={styles.actionRowText}>Short trip reminder</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionRow}
                  onPress={() => {
                    const b = actionBooking;
                    setActionBooking(null);
                    callCustomer(b);
                  }}
                >
                  <Ionicons name="call-outline" size={22} color={colors.foreground} />
                  <Text style={styles.actionRowText}>Call customer</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity style={styles.actionCancel} onPress={() => setActionBooking(null)}>
              <Text style={styles.actionCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray50 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  backBtn: { padding: 4, marginRight: 8 },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.foreground },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: { flex: 1, color: '#b91c1c', fontSize: 14 },
  dateRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  dateField: { flex: 1 },
  fieldLabel: { fontSize: 12, color: colors.gray600, marginBottom: 4 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 14,
    color: colors.foreground,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gray600,
    marginBottom: 8,
    marginTop: 4,
  },
  chipScroll: { marginBottom: 10 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.gray200,
    marginRight: 8,
  },
  chipActive: { backgroundColor: '#eff6ff', borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.gray600 },
  chipTextActive: { color: colors.primary, fontWeight: '600' },
  driverPickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  driverPickText: { fontSize: 14, color: colors.foreground },
  actionsRow: { gap: 10, marginBottom: 16 },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 10,
    paddingVertical: 12,
  },
  refreshText: { fontSize: 15, fontWeight: '600', color: colors.primary },
  waAdminBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#25D366',
    borderRadius: 10,
    paddingVertical: 12,
  },
  waAdminText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  btnDisabled: { opacity: 0.6 },
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { marginTop: 12, color: colors.gray600, fontSize: 15 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  cardUrgent: {
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
    backgroundColor: '#fffbeb',
  },
  bookingRef: { fontSize: 15, fontWeight: '700', color: colors.primary },
  customer: { fontSize: 16, fontWeight: '600', marginTop: 4 },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  phone: { fontSize: 12, color: colors.gray600, flex: 1 },
  route: { marginTop: 8 },
  routeText: { fontSize: 14, color: colors.foreground },
  pickupRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  pickupText: { fontSize: 14, color: colors.foreground },
  badge24: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#fde68a',
    borderWidth: 1,
    borderColor: '#d97706',
  },
  badge24Text: { fontSize: 11, fontWeight: '700', color: '#92400e' },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  badgeTour: { backgroundColor: '#7c3aed' },
  badgeTextLight: { color: '#fff', fontSize: 12, fontWeight: '600' },
  badgeMuted: {
    backgroundColor: colors.gray200,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeMutedText: { fontSize: 12, color: colors.foreground },
  tourDur: { fontSize: 13, color: colors.gray600 },
  vehRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  vehText: { fontSize: 14 },
  driverPayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 10,
    gap: 8,
  },
  driverCol: { flex: 1 },
  driverNameText: { fontSize: 14 },
  notAssigned: {
    marginTop: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#fb7185',
    backgroundColor: '#fff1f2',
  },
  notAssignedText: { fontSize: 11, color: '#be123c', fontWeight: '600' },
  payBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  payPaid: { backgroundColor: '#dcfce7' },
  payPartial: { backgroundColor: '#ffedd5' },
  payPending: { backgroundColor: '#fef9c3' },
  payBadgeText: { fontSize: 12, fontWeight: '700', color: '#1f2937' },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  moreBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 6 },
  moreBtnLabel: { fontSize: 14, fontWeight: '600', color: colors.primary },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    maxHeight: '80%',
  },
  modalTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
  modalRow: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.gray200 },
  actionModalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  actionSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
  },
  actionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  actionSub: {
    fontSize: 12,
    color: colors.gray600,
    marginTop: 8,
    marginBottom: 4,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  actionRowText: { fontSize: 16, color: colors.foreground },
  actionCancel: { marginTop: 16, alignItems: 'center', paddingVertical: 12 },
  actionCancelText: { fontSize: 16, fontWeight: '600', color: colors.primary },
});
