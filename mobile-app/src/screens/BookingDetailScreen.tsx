/**
 * BookingDetailScreen - full booking details with admin/customer actions
 * Admin: Confirm, Cancel, Delete, progress tracker, Open full admin
 * Customer: Cancel (if allowed), Call Support, WhatsApp
 */
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  ActivityIndicator,
  Share,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/core';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/core';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import type { UserBooking } from '../services/userBookingsAPI';
import type { RootStackParamList } from '../navigation/types';
import { adminAPI } from '../services/adminAPI';
import { tourAPI } from '../services/tourAPI';
import { useAuth } from '../providers/AuthProvider';

type BookingDetailRoute = RouteProp<RootStackParamList, 'BookingDetail'>;

const STEPS = ['Pending', 'Confirmed', 'Assigned', 'Completed'] as const;

function formatDate(dateStr: string, timeStr?: string): string {
  if (!dateStr) return '';
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return dateStr;
  const [, y, mo, d] = m;
  return timeStr ? `${d}-${mo}-${y} • ${timeStr}` : `${d}-${mo}-${y}`;
}

/** Format trip type with mode for display (e.g. "Tour - Round Trip", "Outstation - One Way") */
function formatTripTypeDisplay(
  tripType?: string,
  tripMode?: string,
  tourName?: string
): string {
  const type = (tripType ?? '').toLowerCase();
  const mode = (tripMode ?? 'one-way').toLowerCase();
  const modeLabel = mode === 'round-trip' ? 'Round Trip' : 'One Way';
  if (type === 'tour' || tourName) {
    return tourName ? `Tour: ${tourName} (${modeLabel})` : `Tour (${modeLabel})`;
  }
  if (type === 'local') return `Local - ${modeLabel}`;
  if (type === 'outstation') return `Outstation - ${modeLabel}`;
  if (type === 'airport') return `Airport Transfer - ${modeLabel}`;
  if (type) return `${type.charAt(0).toUpperCase() + type.slice(1)}${mode !== 'one-way' ? ` (${modeLabel})` : ''}`;
  return '';
}

function DetailRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: string;
  label: string;
  value?: string | null;
  onPress?: () => void;
}) {
  if (!value || value.trim() === '') return null;
  const content = (
    <View style={styles.detailRow}>
      <Feather name={icon as keyof typeof Feather.glyphMap} size={18} color={colors.gray600} />
      <View style={styles.detailContent}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={[styles.detailValue, onPress && styles.detailValueLink]} numberOfLines={onPress ? 1 : 3}>
          {value}
        </Text>
      </View>
      {onPress && <Feather name="chevron-right" size={18} color={colors.gray600} />}
    </View>
  );
  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

function StatusBadge({
  status,
  label,
  type = 'status',
}: {
  status: string;
  label?: string;
  type?: 'status' | 'payment';
}) {
  const s = (status || '').toLowerCase();
  let bg = colors.gray200;
  if (type === 'payment') {
    if (s === 'paid') bg = '#dcfce7';
    else if (s === 'partial') bg = '#fef3c7';
    else if (s === 'pending') bg = '#fef3c7';
    else if (s === 'cancelled') bg = '#fee2e2';
  } else {
    if (s === 'confirmed' || s === 'assigned') bg = '#dcfce7';
    else if (s === 'completed') bg = '#dbeafe';
    else if (s === 'pending') bg = '#fef3c7';
    else if (s === 'cancelled') bg = '#fee2e2';
  }
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={styles.badgeText}>{label || status || '—'}</Text>
    </View>
  );
}

export function BookingDetailScreen() {
  const navigation = useNavigation<any>();
  const { params } = useRoute<BookingDetailRoute>();
  const { user } = useAuth();
  const booking = params?.booking;
  const source = params?.source ?? 'user';
  const isAdmin = source === 'admin' && (user?.role === 'admin' || user?.role === 'super_admin');

  const [localStatus, setLocalStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [localBooking, setLocalBooking] = useState<typeof booking>(booking);
  const [resolvedTourName, setResolvedTourName] = useState<string | null>(null);

  const paramBooking = params?.booking as Record<string, unknown> | undefined;
  const paramBookingId = (params?.bookingId as number | undefined) ?? (typeof paramBooking?.id === 'number' ? paramBooking.id : parseInt(String(paramBooking?.id ?? 0), 10));

  // Refetch when screen focuses (e.g. returning from Edit) so changes reflect instantly
  useFocusEffect(
    useCallback(() => {
      setLocalBooking(booking);
      if (!paramBookingId || !isAdmin) return;
      adminAPI.getBookingById(paramBookingId).then((b) => {
        setLocalBooking(b as typeof booking);
        const st = (b as { status?: string }).status;
        if (st) setLocalStatus(st);
      }).catch(() => {});
    }, [paramBookingId, isAdmin, booking])
  );

  // Fetch tour name when booking is a tour with tour_id but missing tour_name (e.g. backend join failed)
  useEffect(() => {
    const tripType = ((localBooking ?? booking) as any)?.tripType ?? ((localBooking ?? booking) as any)?.trip_type ?? '';
    const tourId = ((localBooking ?? booking) as any)?.tourId ?? ((localBooking ?? booking) as any)?.tour_id;
    const tourName = ((localBooking ?? booking) as any)?.tourName ?? ((localBooking ?? booking) as any)?.tour_name;
    if ((tripType || '').toLowerCase() === 'tour' && tourId && !tourName) {
      setResolvedTourName(null);
      tourAPI.getTourDetail(String(tourId))
        .then((detail) => { if (detail?.tourName) setResolvedTourName(detail.tourName); })
        .catch(() => {});
    } else {
      setResolvedTourName(null);
    }
  }, [localBooking, booking]);

  const displayBooking = localBooking ?? booking;

  const b = (displayBooking ?? booking) as (UserBooking & Record<string, unknown>) | undefined;
  const status = localStatus ?? b?.status ?? '';
  const bookingId = typeof b?.id === 'number' ? b.id : parseInt(String(b?.id ?? 0), 10);
  const bookingNumber = (b?.bookingNumber ?? b?.booking_number) as string | undefined;
  const passengerName = (b?.passengerName ?? b?.passenger_name) as string | undefined;
  const passengerPhone = (b?.passengerPhone ?? b?.passenger_phone) as string | undefined;
  const passengerEmail = (b?.passengerEmail ?? b?.passenger_email) as string | undefined;
  const driverName = (b?.driverName ?? b?.driver_name) as string | undefined;
  const driverPhone = (b?.driverPhone ?? b?.driver_phone) as string | undefined;
  const vehicleNumber = (b?.vehicleNumber ?? b?.vehicle_number) as string | undefined;
  const additionalReq = (b?.additionalRequirements ?? b?.additional_requirements) as string | undefined;
  const paymentStatus = (b?.payment_status ?? (b as any)?.calculated_payment_status) as string | undefined;

  const tripType = (b?.tripType ?? b?.trip_type) as string | undefined;
  const isTour = (tripType ?? '').toLowerCase() === 'tour';
  const tourDisplayName =
    (b?.tourName ?? b?.tour_name ?? resolvedTourName ?? '') as string;

  const handleCall = (phone?: string) => {
    if (phone) {
      const num = phone.replace(/\D/g, '');
      Linking.openURL(`tel:${num}`).catch(() => {});
    }
  };

  const goBack = () => navigation.goBack();

  const handleConfirm = async () => {
    if (!bookingId || !isAdmin) return;
    setLoading(true);
    try {
      await adminAPI.updateBookingStatus(bookingId, 'confirmed');
      setLocalStatus('confirmed');
      Alert.alert('Success', 'Booking confirmed', [{ text: 'OK', onPress: goBack }]);
    } catch (e) {
      Alert.alert(
        'Error',
        e instanceof Error ? e.message : 'Failed to confirm booking'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!bookingId) return;
    Alert.alert(
      'Cancel Booking',
      `Are you sure you want to cancel booking #${bookingNumber || bookingId}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await adminAPI.cancelBooking(bookingId);
              Alert.alert('Cancelled', 'Booking has been cancelled', [{ text: 'OK', onPress: goBack }]);
            } catch (e) {
              Alert.alert(
                'Error',
                e instanceof Error ? e.message : 'Failed to cancel booking'
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleDelete = async () => {
    if (!bookingId || !isAdmin) return;
    Alert.alert(
      'Delete Booking',
      `Are you sure you want to permanently delete booking #${bookingNumber || bookingId}?\n\nThis cannot be undone.`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await adminAPI.deleteBooking(bookingId);
              Alert.alert('Deleted', 'Booking has been deleted', [{ text: 'OK', onPress: goBack }]);
            } catch (e) {
              Alert.alert(
                'Error',
                e instanceof Error ? e.message : 'Failed to delete booking'
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  /** Build full booking + invoice details for customer (matches website details) */
  const buildCustomerMessage = (): string => {
    const pickup = typeof b?.pickup_location === 'string'
      ? b.pickup_location
      : (b?.pickup_location as { name?: string } | undefined)?.name ?? '';
    const drop = typeof b?.drop_location === 'string'
      ? b.drop_location
      : (b?.drop_location as { name?: string } | undefined)?.name ?? '';
    const dateTime = formatDate(String(b?.pickup_date ?? ''), (b?.pickup_time ?? '') as string);
    const vehicle = (b?.vehicle_type ?? b?.trip_type ?? '') as string;
    const amount = b?.total_amount != null ? `₹${Number(b.total_amount).toLocaleString('en-IN')}` : '';
    const advanceAmount = (b?.advancePaidAmount ?? b?.advance_paid_amount) as number | undefined;
    const advancePaid = advanceAmount != null && advanceAmount > 0 ? `₹${Number(advanceAmount).toLocaleString('en-IN')}` : null;
    const remaining = advancePaid && b?.total_amount != null
      ? `₹${Number(Math.max(0, Number(b.total_amount) - Number(advanceAmount))).toLocaleString('en-IN')}`
      : null;
    const name = passengerName || 'Customer';
    const tripTypeDisplay = formatTripTypeDisplay(
      (b?.tripType ?? b?.trip_type) as string | undefined,
      (b?.tripMode ?? b?.trip_mode) as string | undefined,
      ((b?.tourName ?? b?.tour_name) as string) || resolvedTourName || undefined
    );
    const returnDateRaw = (b?.return_date ?? b?.returnDate) as string | undefined;
    const returnDate = returnDateRaw ? formatDate(returnDateRaw, (b?.return_time ?? b?.returnTime) as string | undefined) : undefined;
    const extraCharges = (b?.extraCharges ?? b?.extra_charges) as Array<{ description?: string; amount?: number }> | undefined;

    let msg = `*Booking Confirmation - Vizag Taxi Hub*\n\nHello ${name}!\n\nYour cab booking has been confirmed:\n\n*Trip Details*\n`;
    if (tripTypeDisplay) msg += `📋 *Trip Type:* ${tripTypeDisplay}\n`;
    msg += `📍 *Pickup:* ${pickup || '—'}\n📍 *Drop:* ${drop || '—'}\n📅 *Date & Time:* ${dateTime || '—'}\n`;
    if (returnDate) msg += `📅 *Return Date:* ${returnDate}\n`;
    // Distance for outstation, airport, tour
    const tripTypeForDist = ((b?.tripType ?? b?.trip_type) as string)?.toLowerCase() ?? '';
    const isOutstationOrAirportOrTour =
      tripTypeForDist === 'outstation' ||
      tripTypeForDist === 'airport' ||
      tripTypeForDist === 'tour' ||
      !!(b?.tourName ?? b?.tour_name ?? (b as any)?.tour_id);
    if (isOutstationOrAirportOrTour) {
      const oneWayKm = (b?.distance ?? (b as any)?.distance_km ?? (b as any)?.tour_distance) ?? 0;
      const isRound = ((b?.tripMode ?? b?.trip_mode) as string)?.toLowerCase() === 'round-trip';
      const totalKm = isRound ? Number(oneWayKm) * 2 : Number(oneWayKm);
      if (totalKm > 0) {
        msg += `📏 *Distance:* ${totalKm} km${isRound ? ' (round-trip)' : ''}\n`;
      }
    }
    msg += `🚗 *Vehicle:* ${vehicle || '—'}`;
    if (extraCharges && Array.isArray(extraCharges) && extraCharges.length > 0) {
      msg += `\n\n*Extra Charges:*`;
      extraCharges.forEach((c) => {
        const desc = c?.description || 'Additional charge';
        const amt = c?.amount != null ? `₹${Number(c.amount).toLocaleString('en-IN')}` : '';
        msg += `\n• ${desc}${amt ? `: ${amt}` : ''}`;
      });
    }
    // Local trip: package limits (hours, km, extra per hour/km)
    const tripTypeForLocal = ((b?.tripType ?? b?.trip_type) as string)?.toLowerCase() ?? '';
    if (tripTypeForLocal === 'local') {
      const hoursIncl = (b?.hours_included ?? (b as any)?.hoursIncluded) ?? '—';
      const kmIncl = (b?.km_included ?? (b as any)?.kmIncluded) ?? '—';
      const extraHr = (b?.extra_per_hour ?? (b as any)?.extraPerHour) ?? '—';
      const extraKm = (b?.extra_per_km ?? (b as any)?.extraPerKm) ?? '—';
      msg += `\n\n*Package Limits (Local)*\n⏰ *Hours included:* ${hoursIncl}\n🛣️ *Kilometers limit:* ${kmIncl} km\n📈 *Extra charges:* ₹${extraHr}/hour beyond hours; ₹${extraKm}/km beyond km (pro rate basis)`;
    }
    msg += `\n\n*Passenger*\n👤 Name: ${passengerName || '—'}\n📞 Phone: ${passengerPhone || '—'}\n📧 Email: ${passengerEmail || '—'}`;
    if (additionalReq && additionalReq.trim()) {
      msg += `\n\n*Additional Info*\n${additionalReq}`;
    }
    if (driverName || driverPhone || vehicleNumber) {
      msg += `\n\n*Driver & Vehicle*\n👤 Driver: ${driverName || '—'}\n📞 Driver Phone: ${driverPhone || '—'}\n🚙 Vehicle No: ${vehicleNumber || '—'}`;
    }
    msg += `\n\n*Amount:* ${amount || '—'}`;
    if (advancePaid) {
      msg += `\n*Advance Paid:* ${advancePaid}`;
      if (remaining) msg += `\n*Remaining:* ${remaining}`;
    }
    const payStatus = (paymentStatus ?? '').toLowerCase();
    if (payStatus === 'paid') msg += `\n*Payment Status:* Paid ✓`;
    else if (payStatus === 'partial' || payStatus === 'partial_payment') msg += `\n*Payment Status:* Partial`;
    else if (payStatus) msg += `\n*Payment Status:* ${paymentStatus}`;
    msg += `\n\n*Booking #:* ${bookingNumber || bookingId}`;

    // Inclusions (kept separate; exclusions merged into Terms & Conditions)
    const inclRaw = (b?.inclusions ?? (b as any)?.vehicle_inclusions) as string | string[] | undefined;
    const inclusions = inclRaw
      ? Array.isArray(inclRaw)
        ? inclRaw.join(', ')
        : String(inclRaw)
      : 'Driver, Car, AC, Fuel';
    msg += `\n\n*Inclusions*\n✅ ${inclusions}`;

    // Cancellation policy - link to policy page
    msg += `\n\n*Cancellation*\nFor cancellation and refund terms, please refer to our policy:\nhttps://vizagtaxihub.com/cancellation-refund-policy`;

    // Terms & Conditions (single section: exclusions + trip-type-specific, no duplication)
    const tripType = ((b?.tripType ?? b?.trip_type) as string)?.toLowerCase() ?? '';
    const isTour = tripType === 'tour' || !!(b?.tourName ?? b?.tour_name ?? (b as any)?.tour_id);
    const isOutstation = tripType === 'outstation';
    msg += `\n\n*Terms & Conditions*\n`;
    msg += `• Toll gates, parking fees, entry fees excluded\n`;
    msg += `• State & Route permits excluded (if applicable)\n`;
    msg += `• AC turned off during standby and ghat roads\n`;
    if (isTour) {
      msg += `• Prices exclude driver's food\n• Exceeding time limit incurs extra charges`;
    } else if (isOutstation) {
      msg += `• Please provide food for the driver\n• Km from garage to garage`;
    }
    msg += `\n\n📞 Support: +91 9966363662`;

    return msg;
  };

  const handleSendToCustomer = () => {
    const phone = passengerPhone?.replace(/\D/g, '');
    if (!phone) {
      Alert.alert('Missing Phone', 'Customer phone number is required to send details.');
      return;
    }
    const msg = buildCustomerMessage();
    const url = `https://wa.me/${phone.startsWith('91') ? phone : `91${phone}`}?text=${encodeURIComponent(msg)}`;
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open WhatsApp.'));
  };

  const handleShareDetails = async () => {
    try {
      await Share.share({
        message: buildCustomerMessage(),
        title: `Booking #${bookingNumber || bookingId}`,
      });
    } catch {
      // User cancelled - no action needed
    }
  };

  const navToEdit = () =>
    bookingId && navigation.navigate('BookingEdit', { bookingId, booking });
  const navToAssignDriver = () =>
    bookingId && navigation.navigate('AssignDriver', { bookingId, booking });
  const navToAssignVehicle = () =>
    bookingId && navigation.navigate('AssignVehicle', { bookingId, booking });
  const navToInvoice = () =>
    bookingId && navigation.navigate('BookingInvoice', { bookingId, booking });

  const stepIndex = STEPS.findIndex(
    (s) => s.toLowerCase() === (status || '').toLowerCase()
  );
  const currentStep = stepIndex >= 0 ? stepIndex : 0;
  const canConfirm = isAdmin && (status || '').toLowerCase() === 'pending';
  const canCancel = (status || '').toLowerCase() !== 'cancelled' && (status || '').toLowerCase() !== 'completed';
  const canDelete = isAdmin && canCancel;

  if (!booking || !b) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={goBack} style={styles.backBtn}>
            <Feather name="arrow-left" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={styles.title}>Booking Details</Text>
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Booking not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn} disabled={loading}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.title}>Booking Details</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {bookingNumber && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Booking # {bookingNumber}</Text>
            <View style={styles.badgeRow}>
              <StatusBadge status={status} type="status" />
              {paymentStatus && (
                <StatusBadge status={paymentStatus} label={`Payment: ${paymentStatus}`} type="payment" />
              )}
            </View>
          </View>
        )}

        {/* Progress tracker - admin only, hide when cancelled */}
        {isAdmin && (status || '').toLowerCase() !== 'cancelled' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Progress</Text>
            <View style={styles.stepsRow}>
              {STEPS.map((step, i) => (
                <View key={step} style={styles.stepItem}>
                  <View
                    style={[
                      styles.stepDot,
                      i <= currentStep && styles.stepDotActive,
                      i < currentStep && styles.stepDotDone,
                    ]}
                  />
                  <Text
                    style={[
                      styles.stepText,
                      i <= currentStep && styles.stepTextActive,
                    ]}
                  >
                    {step}
                  </Text>
                  {i < STEPS.length - 1 && <View style={styles.stepLine} />}
                </View>
              ))}
            </View>
            {canConfirm && (
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleConfirm}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Feather name="check-circle" size={18} color="#fff" />
                    <Text style={styles.confirmBtnText}>Mark as Confirmed</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Trip Details</Text>
          <DetailRow icon="map-pin" label="Pickup" value={b.pickup_location} />
          <DetailRow icon="map-pin" label="Drop" value={b.drop_location} />
          <DetailRow icon="calendar" label="Date & Time" value={formatDate(b.pickup_date, b.pickup_time)} />
          <DetailRow
            icon="navigation"
            label="Trip Type"
            value={formatTripTypeDisplay(
              (b?.tripType ?? b?.trip_type) as string | undefined,
              (b?.tripMode ?? b?.trip_mode) as string | undefined,
              ((b?.tourName ?? b?.tour_name) as string) || resolvedTourName || undefined
            ) || undefined}
          />
          {((b?.tripType ?? b?.trip_type) as string)?.toLowerCase() === 'tour' && (
            <DetailRow
              icon="map"
              label="Tour"
              value={((b?.tourName ?? b?.tour_name) as string) || resolvedTourName || '—'}
            />
          )}
          <DetailRow icon="truck" label="Vehicle" value={b.vehicle_type || b.trip_type} />
          <DetailRow icon="dollar-sign" label="Fare" value={b.total_amount != null ? `₹${Number(b.total_amount).toLocaleString('en-IN')}` : undefined} />
          {((b?.advancePaidAmount ?? b?.advance_paid_amount) as number) > 0 && (
            <DetailRow
              icon="credit-card"
              label="Advance Paid"
              value={`₹${Number(b?.advancePaidAmount ?? b?.advance_paid_amount).toLocaleString('en-IN')}`}
            />
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Passenger</Text>
          <DetailRow icon="user" label="Name" value={passengerName} />
          <DetailRow
            icon="phone"
            label="Phone"
            value={passengerPhone}
            onPress={passengerPhone ? () => handleCall(passengerPhone) : undefined}
          />
          <DetailRow icon="mail" label="Email" value={passengerEmail} />
        </View>

        {(driverName || driverPhone || vehicleNumber) && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Driver & Vehicle</Text>
            <DetailRow icon="user" label="Driver" value={driverName} />
            <DetailRow
              icon="phone"
              label="Driver Phone"
              value={driverPhone}
              onPress={driverPhone ? () => handleCall(driverPhone) : undefined}
            />
            <DetailRow icon="hash" label="Vehicle No" value={vehicleNumber} />
          </View>
        )}

        {additionalReq && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Additional Info</Text>
            <DetailRow icon="info" label="Requirements" value={additionalReq} />
          </View>
        )}

        {/* Admin actions */}
        {isAdmin && canCancel && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Actions</Text>
            <View style={styles.adminActions}>
              {canConfirm && (
                <TouchableOpacity
                  style={[styles.adminBtn, styles.adminBtnPrimary]}
                  onPress={handleConfirm}
                  disabled={loading}
                >
                  <Feather name="check-circle" size={18} color="#fff" />
                  <Text style={styles.adminBtnTextPrimary}>Confirm</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.adminBtn, styles.adminBtnWarning]}
                onPress={handleCancel}
                disabled={loading}
              >
                <Feather name="x-circle" size={18} color="#fff" />
                <Text style={styles.adminBtnTextWarning}>Cancel</Text>
              </TouchableOpacity>
              {canDelete && (
                <TouchableOpacity
                  style={[styles.adminBtn, styles.adminBtnDanger]}
                  onPress={handleDelete}
                  disabled={loading}
                >
                  <Feather name="trash-2" size={18} color="#fff" />
                  <Text style={styles.adminBtnTextDanger}>Delete</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Native admin flows: Edit, Assign Driver, Assign Vehicle, Invoice */}
        {isAdmin && (
          <View style={styles.adminFlows}>
            <TouchableOpacity
              style={styles.adminFlowBtn}
              onPress={() => navigation.navigate('BookingEdit', { bookingId, booking })}
            >
              <Feather name="edit-2" size={18} color={colors.primary} />
              <Text style={styles.adminFlowText}>Edit Booking</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.adminFlowBtn}
              onPress={() => navigation.navigate('AssignDriver', { bookingId, booking })}
            >
              <Feather name="user" size={18} color={colors.primary} />
              <Text style={styles.adminFlowText}>Assign Driver</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.adminFlowBtn}
              onPress={() => navigation.navigate('AssignVehicle', { bookingId, booking })}
            >
              <Feather name="truck" size={18} color={colors.primary} />
              <Text style={styles.adminFlowText}>Assign Vehicle</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.adminFlowBtn}
              onPress={() => navigation.navigate('BookingInvoice', { bookingId, booking })}
            >
              <Feather name="file-text" size={18} color={colors.primary} />
              <Text style={styles.adminFlowText}>View Invoice</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Customer Cancel - only when from user dashboard, not cancelled/completed */}
        {!isAdmin && canCancel && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnCancel]}
            onPress={handleCancel}
            disabled={loading}
          >
            <Feather name="x-circle" size={20} color="#fff" />
            <Text style={styles.actionBtnText}>Cancel Booking</Text>
          </TouchableOpacity>
        )}

        {/* Send to Customer - booking + invoice details via WhatsApp */}
        {passengerPhone && (
          <View style={styles.sendToCustomerCard}>
            <Text style={styles.cardTitle}>Send to Customer</Text>
            <Text style={styles.sendToCustomerSub}>
              Send booking confirmation & invoice to {passengerName || 'customer'}
            </Text>
            <View style={styles.sendToCustomerActions}>
              <TouchableOpacity
                style={[styles.sendToCustomerBtn, styles.sendToCustomerBtnShare]}
                onPress={handleSendToCustomer}
              >
                <Feather name="message-circle" size={20} color="#fff" />
                <Text style={styles.sendToCustomerBtnText}>Send via WhatsApp</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sendToCustomerBtn, styles.sendToCustomerBtnCopy]}
                onPress={handleShareDetails}
              >
                <Feather name="share" size={20} color={colors.primary} />
                <Text style={[styles.sendToCustomerBtnText, styles.sendToCustomerBtnTextOutline]}>Share / Copy</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => Linking.openURL(`tel:+919966363662`)}
          >
            <Feather name="phone" size={20} color="#fff" />
            <Text style={styles.actionBtnText}>Call Support</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnWhatsApp]}
            onPress={() => Linking.openURL('https://wa.me/919966363662')}
          >
            <Feather name="message-circle" size={20} color="#fff" />
            <Text style={styles.actionBtnText}>WhatsApp</Text>
          </TouchableOpacity>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  backBtn: { marginRight: 12, padding: 4 },
  title: { fontSize: 18, fontWeight: '600', color: colors.foreground },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { fontSize: 16, color: colors.gray600 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.foreground },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: '600', color: colors.gray600 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray600,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  stepsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  stepItem: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.gray200,
  },
  stepDotActive: { backgroundColor: colors.primary },
  stepDotDone: { backgroundColor: '#22c55e' },
  stepText: { fontSize: 10, color: colors.gray600, marginLeft: 4 },
  stepTextActive: { fontWeight: '600', color: colors.foreground },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: colors.gray200,
    marginHorizontal: 4,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
  },
  confirmBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  detailContent: { flex: 1 },
  detailLabel: { fontSize: 12, color: colors.gray600, marginBottom: 2 },
  detailValue: { fontSize: 15, color: colors.foreground, fontWeight: '500' },
  detailValueLink: { color: colors.primary },
  adminActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  adminBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  adminBtnPrimary: { backgroundColor: colors.primary },
  adminBtnTextPrimary: { fontSize: 14, fontWeight: '600', color: '#fff' },
  adminBtnWarning: { backgroundColor: '#f59e0b' },
  adminBtnTextWarning: { fontSize: 14, fontWeight: '600', color: '#fff' },
  adminBtnDanger: { backgroundColor: '#dc2626' },
  adminBtnTextDanger: { fontSize: 14, fontWeight: '600', color: '#fff' },
  adminFlows: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  adminFlowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: colors.gray50,
    marginBottom: 8,
  },
  adminFlowText: { fontSize: 15, fontWeight: '600', color: colors.foreground },
  sendToCustomerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  sendToCustomerSub: {
    fontSize: 14,
    color: colors.gray600,
    marginBottom: 12,
    lineHeight: 20,
  },
  sendToCustomerActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  sendToCustomerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  sendToCustomerBtnShare: { backgroundColor: '#25D366' },
  sendToCustomerBtnCopy: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  sendToCustomerBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  sendToCustomerBtnTextOutline: { color: colors.primary },
  fullAdminBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
    paddingVertical: 14,
    backgroundColor: '#eff6ff',
    borderRadius: 10,
  },
  fullAdminText: { fontSize: 15, fontWeight: '600', color: colors.primary },
  actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
  },
  actionBtnCancel: { backgroundColor: '#f59e0b' },
  actionBtnWhatsApp: { backgroundColor: '#25D366' },
  actionBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
});
