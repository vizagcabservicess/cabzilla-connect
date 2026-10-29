/**
 * DriverTripDetailScreen - Trip detail for driver with Start/End Trip actions
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Linking, Switch, ScrollView, TextInput } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { colors } from '../theme/colors';
import { driverTripsAPI } from '../services/driverTripsAPI';
import type { DriverDutyPayload, DriverTrip } from '../services/driverTripsAPI';
import { OdometerCaptureModal } from '../components/OdometerCaptureModal';
import {
  formatPassengerPhoneForDisplay,
  passengerPhoneE164Digits,
  passengerPhoneToTelHref,
} from '../utils/passengerPhoneDisplay';
import { EndTripPaymentModal } from '../components/EndTripPaymentModal';
import { shareBookingDutySlip } from '../lib/bookingDutySlip';
import {
  readActiveDriverTripTracking,
  startDriverTripTracking,
  stopDriverTripTracking,
} from '../lib/driverTripLocationTask';

const TAB_BAR_HEIGHT = 56;

function formatAmount(n: number) {
  return `₹${n.toLocaleString('en-IN')}`;
}

function shortPlace(raw: string): string {
  return raw
    .replace(/\s*\(-?\d{1,3}\.\d{4,}\s*,\s*-?\d{1,3}\.\d{4,}\)/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function formatPrettyDate(raw: string): string {
  const match = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return raw;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function isoDay(raw: string): string {
  const match = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : '';
}

function addDays(iso: string, days: number): string {
  const match = iso.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return iso;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  date.setDate(date.getDate() + days);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function daysBetween(start: string, end: string): string[] {
  const dates: string[] = [];
  let cursor = start;
  let guard = 0;
  while (cursor <= end && guard < 31) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
    guard += 1;
  }
  return dates.length > 0 ? dates : [start];
}

function packageSpanDays(trip: DriverTrip): number {
  const blob = [
    trip.dropLocation,
    trip.pickupLocation,
    trip.tripCategory,
    trip.hourlyPackage,
    trip.additionalRequirements,
    ...(trip.tripTerms?.notes ?? []),
  ].filter((part) => part && part.trim() !== '').join('\n');
  const range = blob.match(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})\s*(?:to|–|—)\s*(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/i);
  if (range) {
    const start = new Date(Number(range[3]), Number(range[2]) - 1, Number(range[1]));
    const end = new Date(Number(range[6]), Number(range[5]) - 1, Number(range[4]));
    const count = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
    if (count >= 2 && count <= 31) return count;
  }
  const duration = blob.match(/(?:^|[^A-Za-z0-9])(\d{1,2})\s*d(?:ays?)?(?:\s*\/\s*\d{1,2}\s*n(?:ights?)?)?(?![A-Za-z])/i);
  if (duration) {
    const count = Number(duration[1]);
    if (count >= 2 && count <= 31) return count;
  }
  let maxDay = 1;
  for (const match of blob.matchAll(/\bDay\s+(\d{1,2})\b/gi)) {
    const count = Number(match[1]);
    if (count > maxDay && count <= 31) maxDay = count;
  }
  return maxDay;
}

function tripDutyDates(trip: DriverTrip, duty: DriverDutyPayload | null): string[] {
  const fromDuty = (duty?.days ?? [])
    .map((day) => isoDay(day.dutyDate))
    .filter((date, index, all) => date !== '' && all.indexOf(date) === index)
    .sort();
  if (fromDuty.length > 1) return fromDuty;
  const listed = (trip.tripTerms?.duty_dates ?? [])
    .map((date) => isoDay(date))
    .filter((date, index, all) => date !== '' && all.indexOf(date) === index)
    .sort();
  if (listed.length > 1) return listed;
  const start = isoDay(trip.pickupDate);
  const end = isoDay(trip.returnDate || '');
  if (start && end && end > start) return daysBetween(start, end);
  const span = packageSpanDays(trip);
  if (start && span > 1) return daysBetween(start, addDays(start, span - 1));
  if (start) return [start];
  return trip.pickupDate.trim() ? [trip.pickupDate.trim()] : [];
}

function formatClock(raw: string): string {
  const text = raw.trim();
  const ampm = text.match(/^(\d{1,2}):(\d{2})\s*([AP])\.?M?\.?$/i);
  if (ampm) return `${ampm[1].padStart(2, '0')}:${ampm[2]} ${ampm[3].toUpperCase()}M`;
  const h24 = text.match(/^(\d{1,2}):(\d{2})/);
  if (!h24) return text;
  let hour = Number(h24[1]);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  if (hour === 0) hour = 12;
  else if (hour > 12) hour -= 12;
  return `${String(hour).padStart(2, '0')}:${h24[2]} ${suffix}`;
}

function splitDayWindow(window: string | null | undefined): { start: string; end: string } | null {
  if (!window) return null;
  const match = window.match(/(\d{1,2}:\d{2}\s*[AP]\.?M\.?)\s+to\s+(\d{1,2}:\d{2}\s*[AP]\.?M\.?)/i);
  if (!match) return null;
  return { start: formatClock(match[1]), end: formatClock(match[2]) };
}

function whatsappDigits(phone: string | null | undefined, countryCode?: string | null): string | null {
  const international = passengerPhoneE164Digits(phone, countryCode);
  if (international) return international;
  const digits = String(phone ?? '').replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.length >= 11) return digits;
  return null;
}

function guestWhatsAppMessage(trip: DriverTrip, pickupTimeLabel: string): string {
  const pickup = shortPlace(trip.pickupLocation) || '—';
  const destination = shortPlace(trip.dropLocation) || '—';
  const date = formatPrettyDate(trip.pickupDate) || '—';
  const time = pickupTimeLabel || formatClock(trip.pickupTime || '') || '—';
  const vehicle = trip.vehicleType && trip.vehicleType !== '—' ? trip.vehicleType : '—';
  const vehicleNumber = trip.vehicleNumber || '—';
  const driver = (trip.driverName || '').trim() || 'Driver';
  return [
    'Hello Sir/Madam,',
    '',
    'Greetings from Vizag Taxi Hub! 🙏',
    '',
    'I am your assigned driver for your upcoming trip.',
    '',
    '🚘 *Trip Details*',
    `📍 Pickup: ${pickup}`,
    `📅 Date: ${date}`,
    `🕒 Pickup Time: ${time}`,
    `🏁 Destination: ${destination}`,
    `🚗 Vehicle: ${vehicle}`,
    `🔢 Vehicle Number: ${vehicleNumber}`,
    '',
    'I will be available at the scheduled pickup time. Kindly let me know if there are any changes to your pickup location or schedule.',
    '',
    'Looking forward to providing you with a safe and comfortable journey.',
    '',
    'Thank you for choosing Vizag Taxi Hub!',
    '',
    'Regards,',
    driver,
    'Vizag Taxi Hub',
  ].join('\n');
}

function statusLabel(status: string): string {
  if (status === 'in_progress') return 'In progress';
  if (status === 'assigned') return 'Assigned';
  if (status === 'completed') return 'Completed';
  return status.replace('_', ' ');
}

function dutyStatusLabel(status: string): string {
  if (status === 'not_started') return 'Not Started';
  if (status === 'in_progress') return 'In Progress';
  if (status === 'completed') return 'Completed';
  return status.replaceAll('_', ' ');
}

type ExtraCategory = 'extra_hours' | 'extra_km' | 'tolls' | 'other';

const EXTRA_CATEGORIES: ExtraCategory[] = ['extra_hours', 'extra_km', 'tolls', 'other'];

function extraCategoryLabel(category: ExtraCategory): string {
  switch (category) {
    case 'extra_hours':
      return 'Extra hours';
    case 'extra_km':
      return 'Extra km';
    case 'tolls':
      return 'Tolls';
    case 'other':
      return 'Others';
    default: {
      const unknown: never = category;
      return unknown;
    }
  }
}

function isExtraCategory(value: string | null | undefined): value is ExtraCategory {
  return value === 'extra_hours' || value === 'extra_km' || value === 'tolls' || value === 'other';
}

function formatServiceCategory(raw: string): string {
  const s = raw.replace(/[-_]+/g, ' ').trim();
  if (!s) return '—';
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

const TRIP_CATEGORY_LABELS: Record<string, string> = {
  outstation: 'Outstation',
  local: 'Local',
  tour: 'Tour',
  airport: 'Airport transfer',
};

const TRIP_MODE_LABELS: Record<string, string> = {
  'one-way': 'One way',
  one_way: 'One way',
  oneway: 'One way',
  'round-trip': 'Round trip',
  round_trip: 'Round trip',
  roundtrip: 'Round trip',
};

function humanizeTripToken(raw: string): string {
  const k = raw.trim().toLowerCase();
  return TRIP_CATEGORY_LABELS[k] || TRIP_MODE_LABELS[k] || formatServiceCategory(raw);
}

function formatOdometerCapturedAt(raw?: string | null): string {
  if (!raw || typeof raw !== 'string') return '';
  const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
  const d = new Date(normalized);
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });
  }
  return raw.trim();
}

function odometerDisplayLine(km: number | undefined, at?: string | null): string | null {
  if (km == null || Number.isNaN(km)) return null;
  const t = formatOdometerCapturedAt(at ?? undefined);
  const kmStr = km.toLocaleString('en-IN');
  return t ? `${kmStr} km · ${t}` : `${kmStr} km`;
}

/** Tour packages stay Tour. One-way and round trip apply to point-to-point trips. */
function buildTripTypeDisplay(trip: DriverTrip): string {
  const cat = (trip.tripCategory || '').trim();
  const mode = (trip.tripMode || '').trim();
  const drop = (trip.dropLocation || '').trim();
  if (cat.toLowerCase() === 'tour' || /package|\d+\s*d\s*\/\s*\d+\s*n/i.test(drop)) return 'Tour';
  const service = `${cat} ${mode}`;
  if (/round|two.?way/i.test(service)) return 'Round trip';
  if (/one.?way|oneway/i.test(service)) return 'One way';
  if (/local/i.test(cat) || /local/i.test(mode)) return 'Local';
  if (!cat && !mode) return '—';
  const c = cat ? humanizeTripToken(cat) : '';
  const m = mode ? humanizeTripToken(mode) : '';
  if (c && c !== '—' && m && m !== '—' && c.toLowerCase() !== m.toLowerCase()) return `${c} · ${m}`;
  if (c && c !== '—') return c;
  if (m && m !== '—') return m;
  return '—';
}

function readMapPin(text: string): { lat: number; lng: number } | null {
  const match = text.match(/(-?\d{1,3}\.\d{4,})\s*,\s*(-?\d{1,3}\.\d{4,})/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

function exactMapPin(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

function placesForTrip(trip: DriverTrip): string[] {
  const fromTerms = trip.tripTerms?.places?.map((place) => place.trim()).filter((place) => place !== '') ?? [];
  if (fromTerms.length > 0) return fromTerms;
  const extra = trip.additionalRequirements ?? '';
  const numbered = extra
    .split('\n')
    .map((line) => line.match(/^\s*\d+\.\s+(.+)$/)?.[1]?.trim() ?? '')
    .filter((place) => place !== '');
  return numbered;
}

function packageLines(trip: DriverTrip): string[] {
  const terms = trip.tripTerms;
  const notes = terms?.notes?.filter((note) => note.trim() !== '') ?? [];
  const schedule = notes.filter((note) => /^Day \d+\b/i.test(note));
  const otherNotes = notes.filter((note) => !/^Day \d+\b/i.test(note));
  const lines: string[] = [...schedule];
  if (terms?.package_hours && terms.package_km) {
    lines.push(`${terms.package_hours} hrs / ${terms.package_km} km`);
  } else if (trip.hourlyPackage) {
    lines.push(trip.hourlyPackage);
  }
  if (terms?.day_window) lines.push(terms.day_window);
  if (terms?.extra_hour_rate) {
    lines.push(
      `Extra hour ${formatAmount(terms.extra_hour_rate)}${terms.extra_hour_free_km ? ` · ${terms.extra_hour_free_km} km free` : ''}`
    );
  }
  if (terms?.extra_km_rate) lines.push(`Extra km ${formatAmount(terms.extra_km_rate)}`);
  if (terms?.driver_food) lines.push('Driver food');
  if (terms?.garage_to_garage) lines.push('Garage to garage');
  if (terms?.ac_off_standby_ghat) lines.push('AC off on standby and ghat roads');
  if (terms?.exclusions && terms.exclusions.length > 0) {
    lines.push(`Not included: ${terms.exclusions.join(', ')}`);
  }
  if (notes.length > 0) {
    lines.push(...otherNotes);
  }
  const extra = (trip.additionalRequirements || '').trim();
  if (extra && !lines.some((line) => line.includes(extra.slice(0, 48)))) {
    lines.push(extra);
  }
  if (terms?.vehicle_note) lines.push(terms.vehicle_note);
  return lines;
}

export function DriverTripDetailScreen() {
  const { params } = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const paramTrip = params?.trip as DriverTrip | undefined;
  const scrollBottomPadding = insets.bottom + TAB_BAR_HEIGHT + 32;
  const [tripDetail, setTripDetail] = useState<DriverTrip | null>(paramTrip ?? null);
  const [status, setStatus] = useState<'assigned' | 'in_progress' | 'completed'>(
    (paramTrip?.status as 'assigned' | 'in_progress' | 'completed') ?? 'assigned'
  );
  const [loading, setLoading] = useState(false);
  const [odometerModal, setOdometerModal] = useState<'start' | 'end' | null>(null);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [liveTracking, setLiveTracking] = useState(false);
  const [trackingNote, setTrackingNote] = useState('');
  const [slipBusy, setSlipBusy] = useState(false);
  const [placesOpen, setPlacesOpen] = useState(true);
  const [termsOpen, setTermsOpen] = useState(false);
  const trackingWantedRef = useRef(false);
  const locationWatchRef = useRef<Location.LocationSubscription | null>(null);
  const paymentDirtyRef = useRef(false);
  const [extraAmountText, setExtraAmountText] = useState('');
  const [extraCategory, setExtraCategory] = useState<ExtraCategory | null>(null);
  const [paymentReceived, setPaymentReceived] = useState<'company_paid' | 'self_paid' | null>(null);
  const [duty, setDuty] = useState<DriverDutyPayload | null>(null);
  const dutyRef = useRef<DriverDutyPayload | null>(null);
  dutyRef.current = duty;

  const trip = tripDetail ?? paramTrip;

  useFocusEffect(
    useCallback(() => {
      if (!trip?.id) return;
      let cancelled = false;
      (async () => {
        try {
          const t = await driverTripsAPI.getTripById(trip.id);
          if (!cancelled) {
            if (placesForTrip(t).length === 0 && placesForTrip(trip).length > 0) {
              t.tripTerms = { ...(t.tripTerms ?? {}), places: placesForTrip(trip) };
              if (!t.additionalRequirements) t.additionalRequirements = trip.additionalRequirements;
            }
            if (t.driverCollectedAmount == null && trip.driverCollectedAmount != null) {
              t.driverCollectedAmount = trip.driverCollectedAmount;
            }
            if (!t.paymentType && trip.paymentType) t.paymentType = trip.paymentType;
            if (t.extraCollectedAmount == null && trip.extraCollectedAmount != null) {
              t.extraCollectedAmount = trip.extraCollectedAmount;
              t.extraCollectedCategory = t.extraCollectedCategory ?? trip.extraCollectedCategory;
            }
            setTripDetail(t);
            setStatus(t.status);
          }
        } catch {
          /* keep cached trip */
        }
        try {
          const active = await readActiveDriverTripTracking();
          if (!cancelled && active?.bookingId === trip.id) {
            setLiveTracking(true);
          }
        } catch {
          /* leave the switch as the driver set it */
        }
        try {
          const dutyDays = await driverTripsAPI.getDutyDays(trip.id);
          if (!cancelled) {
            setDuty(dutyDays);
            if (dutyDays.canEnd) setStatus('in_progress');
            else if (dutyDays.canStart || dutyDays.needsReceipt) setStatus('assigned');
          }
        } catch {
          if (!cancelled) setDuty(null);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [trip?.id])
  );

  useEffect(() => {
    if (!tripDetail || paymentDirtyRef.current) return;
    const extra = tripDetail.extraCollectedAmount;
    setExtraAmountText(extra != null && extra > 0 ? String(Math.round(extra)) : '');
    setExtraCategory(isExtraCategory(tripDetail.extraCollectedCategory) ? tripDetail.extraCollectedCategory : null);
    if (tripDetail.paymentType === 'company_paid' || tripDetail.paymentType === 'self_paid') {
      setPaymentReceived(tripDetail.paymentType);
    }
  }, [tripDetail]);

  const trackingBookingId = trip?.id ?? 0;
  useEffect(() => {
    const shouldShare = liveTracking && status === 'in_progress' && trackingBookingId > 0;
    if (!shouldShare) {
      locationWatchRef.current?.remove();
      locationWatchRef.current = null;
      if (trackingWantedRef.current) {
        trackingWantedRef.current = false;
        setTrackingNote('');
        void stopDriverTripTracking();
      }
      return;
    }

    let cancelled = false;
    trackingWantedRef.current = true;
    setTrackingNote('Starting live tracking…');
    const bookingId = trackingBookingId;

    const shareFix = (latitude: number, longitude: number, accuracy?: number | null) =>
      driverTripsAPI.submitLocation(bookingId, latitude, longitude, accuracy);

    void (async () => {
      try {
        const mode = await startDriverTripTracking(bookingId);
        if (cancelled) {
          await stopDriverTripTracking();
          return;
        }
        setTrackingNote(
          mode === 'background'
            ? 'Sharing location with the office, including when the phone is locked.'
            : 'Sharing location while this screen stays open. Allow location all the time to keep sharing after the screen locks.',
        );
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          if (!cancelled) {
            await shareFix(loc.coords.latitude, loc.coords.longitude, loc.coords.accuracy);
          }
        } catch (fixError) {
          if (cancelled) return;
          const message = fixError instanceof Error ? fixError.message : '';
          if (/office cannot receive|not in progress|not assigned|Sign in|Invalid or expired/i.test(message)) {
            throw fixError;
          }
        }
        if (cancelled) return;
        if (mode !== 'foreground') return;
        locationWatchRef.current?.remove();
        locationWatchRef.current = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, timeInterval: 20000, distanceInterval: 25 },
          (pos) => {
            void shareFix(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy).catch(() => undefined);
          },
        );
        if (cancelled) {
          locationWatchRef.current?.remove();
          locationWatchRef.current = null;
        }
      } catch (e) {
        if (cancelled) return;
        trackingWantedRef.current = false;
        setLiveTracking(false);
        setTrackingNote('');
        await stopDriverTripTracking();
        Alert.alert('Live tracking', e instanceof Error ? e.message : 'Could not start live tracking');
      }
    })();

    return () => {
      cancelled = true;
      locationWatchRef.current?.remove();
      locationWatchRef.current = null;
    };
  }, [liveTracking, status, trackingBookingId]);

  if (!paramTrip && !tripDetail) {
    return (
      <SafeAreaView style={styles.container}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.error}>Trip not found</Text>
      </SafeAreaView>
    );
  }

  if (!trip) {
    return (
      <SafeAreaView style={styles.container}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.error}>Trip not found</Text>
      </SafeAreaView>
    );
  }

  const currentStatus = status || trip.status;
  const awaitingReceipt = duty ? duty.needsReceipt : currentStatus === 'assigned';

  const handleStartTrip = () => {
    if (dutyRef.current?.needsReceipt || (!dutyRef.current && currentStatus === 'assigned')) {
      void confirmReceipt();
      return;
    }
    setOdometerModal('start');
  };

  const confirmReceipt = async () => {
    setLoading(true);
    try {
      await driverTripsAPI.confirmDutyReceipt(trip.id);
      const dutyDays = await driverTripsAPI.getDutyDays(trip.id);
      setDuty(dutyDays);
    } catch (e) {
      Alert.alert('Confirm receipt', e instanceof Error ? e.message : 'Could not confirm this trip');
    } finally {
      setLoading(false);
    }
  };

  const handleEndTrip = () => {
    setOdometerModal('end');
  };

  const onOdometerSuccess = async () => {
    if (odometerModal === 'start') {
      setLoading(true);
      try {
        try {
          await driverTripsAPI.updateTripStatus(trip.id, 'in_progress');
        } catch (startError) {
          const message = startError instanceof Error ? startError.message : '';
          if (!/confirm receipt/i.test(message)) throw startError;
          await driverTripsAPI.confirmDutyReceipt(trip.id);
          await driverTripsAPI.updateTripStatus(trip.id, 'in_progress');
        }
        setStatus('in_progress');
        try {
          const t = await driverTripsAPI.getTripById(trip.id);
          setTripDetail(t);
        } catch {
          /* ignore */
        }
        try {
          setDuty(await driverTripsAPI.getDutyDays(trip.id));
        } catch {
          /* the trip is already started */
        }
      } catch (e) {
        Alert.alert('Error', e instanceof Error ? e.message : 'Failed to start trip');
      } finally {
        setLoading(false);
      }
    } else if (odometerModal === 'end') {
      setOdometerModal(null);
      try {
        const t = await driverTripsAPI.getTripById(trip.id);
        setTripDetail(t);
      } catch {
        /* ignore */
      }
      if (dutyRef.current && dutyRef.current.isLastOpenDay === false) {
        setLoading(true);
        try {
          const closed = await driverTripsAPI.endDutyDay(trip.id);
          setStatus(closed.tripCompleted ? 'completed' : 'assigned');
          Alert.alert(
            closed.tripCompleted ? 'Trip completed' : 'Day closed',
            closed.tripCompleted
              ? 'The trip has been marked as completed.'
              : 'This day is saved with its own driver, vehicle, and kilometres. The trip stays open for the next day.',
            [{ text: 'OK', onPress: () => navigation.goBack() }],
          );
        } catch (e) {
          Alert.alert('Error', e instanceof Error ? e.message : 'Failed to close this day');
        } finally {
          setLoading(false);
        }
        return;
      }
      if (trip.driverCollectsPayment === false) {
        setLoading(true);
        try {
          const result = await driverTripsAPI.updateTripStatus(trip.id, 'completed', {
            collectedAmount: 0,
            paymentType: 'agent_booking',
          });
          setStatus(result.tripCompleted ? 'completed' : 'assigned');
          Alert.alert(result.tripCompleted ? 'Trip Completed' : 'Day closed', result.tripCompleted ? 'Nothing was collected.' : 'This day is saved. The trip stays open for the next duty day.', [
            { text: 'OK', onPress: () => navigation.goBack() },
          ]);
        } catch (e) {
          Alert.alert('Error', e instanceof Error ? e.message : 'Failed to end trip');
        } finally {
          setLoading(false);
        }
        return;
      }
      if (paymentReceived !== 'company_paid' && paymentReceived !== 'self_paid') {
        Alert.alert('Payment', 'Choose company A/C or self before ending the trip.');
        return;
      }
      const extraBeforeEnd = parseFloat(extraAmountText);
      if (Number.isFinite(extraBeforeEnd) && extraBeforeEnd > 0 && !extraCategory) {
        Alert.alert('Extra amount', 'Choose what the extra amount is for: extra hours, extra km, tolls, or others.');
        return;
      }
      setPaymentModalVisible(true);
    }
  };

  const onEndTripPaymentConfirm = async (collectedAmount: number, paymentType: string) => {
    setPaymentModalVisible(false);
    setLoading(true);
    const extraParsed = parseFloat(extraAmountText);
    const extraCollectedAmount = Number.isFinite(extraParsed) && extraParsed >= 0 ? Math.round(extraParsed * 100) / 100 : 0;
    try {
      const result = await driverTripsAPI.updateTripStatus(trip.id, 'completed', {
        collectedAmount,
        paymentType,
        extraCollectedAmount,
        extraCollectedCategory: extraCollectedAmount > 0 ? extraCategory : null,
      });
      setStatus(result.tripCompleted ? 'completed' : 'assigned');
      Alert.alert(result.tripCompleted ? 'Trip Completed' : 'Day closed', result.tripCompleted
        ? 'The trip has been marked as completed.'
        : 'This day is saved. The trip stays open for the next duty day.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to end trip');
      setPaymentModalVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const callPassenger = () => {
    const href = passengerPhoneToTelHref(trip.passengerPhone, trip.passengerCountryCode);
    if (href) Linking.openURL(href).catch(() => {});
  };

  const openPickup = () => {
    const storedPin = trip.pickupLat != null && trip.pickupLng != null
      && Number.isFinite(trip.pickupLat) && Number.isFinite(trip.pickupLng)
      ? { lat: trip.pickupLat, lng: trip.pickupLng }
      : null;
    const pin = storedPin || readMapPin(trip.pickupMapUrl || '') || readMapPin(trip.pickupLocation || '');
    const url = pin
      ? exactMapPin(pin.lat, pin.lng)
      : (trip.pickupMapUrl || '').trim()
        || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trip.pickupLocation || '')}`;
    if (!url || url.endsWith('query=')) return;
    Linking.openURL(url).catch(() => {});
  };

  const terms = trip.tripTerms;
  const flightLabel = [terms?.flight_number, terms?.flight_time, terms?.flight_direction, terms?.flight_route]
    .filter((part) => part && String(part).trim() !== '')
    .join(' · ');
  const places = placesForTrip(trip);
  const packageItems = packageLines(trip);
  const collects = trip.driverCollectsPayment !== false;
  const dayWindow = splitDayWindow(terms?.day_window);
  const pickupTimeLabel = dayWindow?.start || formatClock(trip.pickupTime || '');
  const dropTimeLabel = dayWindow?.end || '';
  const dutyDates = tripDutyDates(trip, duty);
  const pickupDateLabel = formatPrettyDate(dutyDates[0] || trip.pickupDate);
  const dropDateLabel = formatPrettyDate(dutyDates[dutyDates.length - 1] || trip.pickupDate);
  const routeSpan = terms?.package_hours && terms?.package_km
    ? `${terms.package_hours} hrs · ${terms.package_km} km`
    : terms?.day_window || '';
  const advance = trip.advancePaidAmount ?? 0;
  const packageAmount = trip.totalAmount ?? 0;
  const extraParsedNow = parseFloat(extraAmountText);
  const extraNow = collects && Number.isFinite(extraParsedNow) && extraParsedNow > 0 ? extraParsedNow : 0;
  const tripAmountWithExtra = packageAmount + extraNow;
  const balance = Math.max(0, tripAmountWithExtra - advance);
  const phoneText = formatPassengerPhoneForDisplay(trip.passengerPhone, trip.passengerCountryCode);

  const chatPassenger = () => {
    const digits = whatsappDigits(trip.passengerPhone, trip.passengerCountryCode);
    if (!digits) {
      Alert.alert('WhatsApp', 'This trip has no guest phone number.');
      return;
    }
    const text = encodeURIComponent(guestWhatsAppMessage(trip, pickupTimeLabel));
    Linking.openURL(`https://wa.me/${digits}?text=${text}`).catch(() => {
      Alert.alert('WhatsApp', 'Could not open WhatsApp.');
    });
  };
  const statusTone = currentStatus === 'in_progress' ? styles.statusLive : currentStatus === 'completed' ? styles.statusDone : styles.statusAssigned;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{trip.bookingNumber}</Text>
        <View style={[styles.statusPill, statusTone]}>
          <Text style={[styles.statusText, currentStatus === 'assigned' && styles.statusTextAssigned, currentStatus === 'completed' && styles.statusTextDone]}>{statusLabel(currentStatus)}</Text>
        </View>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: scrollBottomPadding + 72 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.routeCard}>
          <View style={styles.routeBody}>
            <View style={styles.routeStops}>
              <View style={styles.routeStop}>
                <View style={styles.pinCol}>
                  <View style={[styles.pin, styles.pinPickup]} />
                  <View style={styles.pinLine} />
                </View>
                <View style={styles.routeCopy}>
                  <Text style={styles.routePlace}>{shortPlace(trip.pickupLocation) || '—'}</Text>
                  <Text style={styles.routeMeta}>
                    Pickup · {pickupDateLabel}{pickupTimeLabel ? ` · ${pickupTimeLabel}` : ''}
                  </Text>
                </View>
              </View>
              <View style={styles.routeStop}>
                <View style={styles.pinCol}>
                  <View style={[styles.pin, styles.pinDrop]} />
                </View>
                <View style={styles.routeCopy}>
                  <Text style={styles.routePlace}>{shortPlace(trip.dropLocation) || '—'}</Text>
                  <Text style={styles.routeMeta}>
                    Destination · {dropDateLabel}{dropTimeLabel ? ` · ${dropTimeLabel}` : ''}
                  </Text>
                  {routeSpan ? <Text style={styles.routeMeta}>{routeSpan}</Text> : null}
                </View>
              </View>
            </View>
            <TouchableOpacity style={styles.mapSide} onPress={openPickup}>
              <View style={styles.mapArt}>
                <Ionicons name="map" size={26} color="#16a34a" />
              </View>
              <View style={styles.mapBtn}>
                <Ionicons name="navigate" size={12} color="#fff" />
                <Text style={styles.mapBtnText}>Open Map</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.pair}>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Passenger</Text>
            <Text style={styles.infoValue} numberOfLines={2}>{trip.passengerName || '—'}</Text>
            <Text style={styles.infoSub}>{phoneText || '—'}</Text>
            <View style={styles.contactRow}>
              <TouchableOpacity onPress={chatPassenger} style={[styles.contactBtn, styles.whatsappBubble]} accessibilityLabel="WhatsApp guest">
                <Ionicons name="logo-whatsapp" size={18} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={callPassenger} style={[styles.contactBtn, styles.callBtn]} accessibilityLabel="Call guest">
                <Ionicons name="call" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.infoCard}>
            <View style={styles.inlineIcon}>
              <Ionicons name="car" size={16} color={colors.primary} />
            </View>
            <Text style={styles.infoLabel}>Vehicle</Text>
            <Text style={styles.infoValue}>{trip.vehicleNumber || '—'}</Text>
            <Text style={styles.infoSub}>{trip.vehicleType || '—'}</Text>
          </View>
        </View>

        <View style={styles.pair}>
          <View style={styles.infoCard}>
            <View style={[styles.inlineIcon, styles.inlineIconBlue]}>
              <Ionicons name="document-text-outline" size={16} color={colors.primary} />
            </View>
            <Text style={styles.infoLabel}>Trip Type</Text>
            <Text style={styles.infoValue}>{buildTripTypeDisplay(trip)}</Text>
            {flightLabel ? <Text style={styles.infoSub}>{flightLabel}</Text> : null}
          </View>
          <View style={styles.infoCard}>
            <View style={[styles.inlineIcon, styles.inlineIconGreen]}>
              <Ionicons name="cash-outline" size={16} color="#16a34a" />
            </View>
            <Text style={styles.infoLabel}>Trip Amount</Text>
            <Text style={styles.infoValue}>{collects ? formatAmount(tripAmountWithExtra) : 'Do not collect'}</Text>
            {collects && extraNow > 0 ? (
              <Text style={styles.infoSub}>
                {`${formatAmount(packageAmount)} + ${extraCategory ? extraCategoryLabel(extraCategory) : 'extra'} ${formatAmount(extraNow)}`}
              </Text>
            ) : null}
          </View>
        </View>

        {currentStatus !== 'completed' ? (
          <View style={styles.stack}>
            <TouchableOpacity
              style={styles.listRow}
              disabled={slipBusy}
              onPress={() => {
                setSlipBusy(true);
                void shareBookingDutySlip(trip.id, trip.bookingNumber).finally(() => setSlipBusy(false));
              }}
            >
              <View style={[styles.inlineIcon, styles.inlineIconGreen]}>
                <Ionicons name="document-text-outline" size={16} color="#16a34a" />
              </View>
              <View style={styles.listCopy}>
                <Text style={styles.listTitle}>{slipBusy ? 'Opening…' : 'Duty Slip'}</Text>
                <Text style={styles.listSub}>View full details & photos</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.gray400} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.listRow} onPress={() => navigation.navigate('FuelEntry', { bookingId: trip.id })}>
              <View style={[styles.inlineIcon, styles.inlineIconAmber]}>
                <Ionicons name="flame-outline" size={16} color="#ea580c" />
              </View>
              <View style={styles.listCopy}>
                <Text style={styles.listTitle}>Add Fuel</Text>
                <Text style={styles.listSub}>Record fuel purchase</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.gray400} />
            </TouchableOpacity>
          </View>
        ) : null}

        {places.length > 0 ? (
          <View style={styles.section}>
            <TouchableOpacity style={styles.sectionHead} onPress={() => setPlacesOpen((open) => !open)}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="location" size={18} color={colors.primary} />
                <Text style={styles.sectionTitle}>Places to Visit ({places.length})</Text>
              </View>
              <Ionicons name={placesOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.gray500} />
            </TouchableOpacity>
            {placesOpen ? (
              <View style={styles.placeGrid}>
                {places.map((place, index) => (
                  <View key={`${index}-${place}`} style={styles.placeCell}>
                    <Text style={styles.placeIndex}>{index + 1}</Text>
                    <Text style={styles.placeName}>{place}</Text>
                    <Ionicons name="chevron-forward" size={14} color={colors.gray400} />
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        {packageItems.length > 0 ? (
          <View style={styles.section}>
            <TouchableOpacity style={styles.sectionHead} onPress={() => setTermsOpen((open) => !open)}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="document-text-outline" size={18} color={colors.primary} />
                <Text style={styles.sectionTitle}>Package Details & Terms</Text>
              </View>
              <Ionicons name={termsOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.gray500} />
            </TouchableOpacity>
            {termsOpen ? packageItems.map((line) => {
              const isTime = /\d{1,2}:\d{2}\s*(am|pm)/i.test(line);
              return (
                <View key={line} style={styles.termRow}>
                  <View style={styles.termMark}>
                    {isTime ? (
                      <Ionicons name="time" size={15} color={colors.primary} />
                    ) : (
                      <Text style={styles.termBullet}>•</Text>
                    )}
                  </View>
                  <Text style={styles.termText}>{line}</Text>
                </View>
              );
            }) : null}
          </View>
        ) : null}

        {collects && currentStatus === 'completed' ? (
          <View style={styles.moneyCard}>
            <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
            <Text style={styles.infoLabel}>Collected</Text>
            <Text style={styles.moneyValue}>
              {trip.driverCollectedAmount != null ? formatAmount(trip.driverCollectedAmount) : '—'}
            </Text>
            <Text style={styles.infoSub}>
              {paymentReceived === 'company_paid'
                ? 'Payment received to company A/C'
                : paymentReceived === 'self_paid'
                  ? 'Payment received to self'
                  : trip.paymentType === 'company_phonepe'
                    ? 'Company PhonePe'
                    : 'Recorded when the trip was completed'}
            </Text>
          </View>
        ) : null}

        {collects && advance > 0 ? (
          <View style={styles.pair}>
            <View style={[styles.moneyCard, styles.moneyAdvance]}>
              <Ionicons name="cash-outline" size={18} color="#16a34a" />
              <Text style={styles.moneyLabel}>Advance Received</Text>
              <View style={styles.moneyValueRow}>
                <Text style={[styles.moneyValue, styles.moneyValueGreen]}>{formatAmount(advance)}</Text>
                <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
              </View>
            </View>
            {currentStatus !== 'completed' ? (
              <View style={[styles.moneyCard, styles.moneyBalance]}>
                <Ionicons name="hourglass-outline" size={18} color="#ea580c" />
                <Text style={styles.moneyLabel}>Balance to Collect</Text>
                <Text style={[styles.moneyValue, styles.moneyValueOrange]}>{formatAmount(balance)}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {collects ? (
          <View pointerEvents={currentStatus === 'completed' ? 'none' : 'auto'}>
            <View style={[styles.section, currentStatus === 'completed' && styles.lockedSection]}>
              <Text style={styles.sectionTitle}>Extra Amount Collected (if any)</Text>
              <View style={[styles.amountField, currentStatus === 'completed' && styles.amountInputLocked]}>
                <Text style={styles.amountPrefix}>₹</Text>
                <TextInput
                  style={styles.amountInput}
                  value={extraAmountText}
                  onChangeText={(value) => {
                    paymentDirtyRef.current = true;
                    setExtraAmountText(value.replace(/[^\d.]/g, ''));
                  }}
                  editable={currentStatus !== 'completed'}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={colors.gray500}
                />
              </View>
              <View style={styles.categoryRow}>
                {EXTRA_CATEGORIES.map((category) => {
                  const selected = extraCategory === category;
                  return (
                    <TouchableOpacity
                      key={category}
                      style={[styles.categoryChip, selected && styles.categoryChipOn, currentStatus === 'completed' && !selected && styles.categoryChipLocked]}
                      disabled={currentStatus === 'completed'}
                      onPress={() => {
                        paymentDirtyRef.current = true;
                        setExtraCategory(category);
                      }}
                    >
                      <Text style={[styles.categoryChipText, selected && styles.categoryChipTextOn]}>
                        {extraCategoryLabel(category)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            <View style={[styles.section, currentStatus === 'completed' && styles.lockedSection]}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="card-outline" size={18} color={colors.primary} />
                <Text style={styles.sectionTitle}>Payment Collection Method</Text>
              </View>
              <View style={styles.payRow}>
                <TouchableOpacity
                  style={[styles.payCard, paymentReceived === 'company_paid' && styles.payCardCompany, currentStatus === 'completed' && paymentReceived !== 'company_paid' && styles.categoryChipLocked]}
                  disabled={currentStatus === 'completed'}
                  onPress={() => {
                    paymentDirtyRef.current = true;
                    setPaymentReceived('company_paid');
                  }}
                >
                  <View style={[styles.payIcon, styles.inlineIconBlue]}>
                    <Ionicons name="business-outline" size={14} color={colors.primary} />
                  </View>
                  <View style={styles.listCopy}>
                    <Text style={styles.payTitle}>Company A/C</Text>
                    <Text style={styles.paySub}>Payment received by company</Text>
                  </View>
                  <View style={[styles.radio, paymentReceived === 'company_paid' && styles.radioOn]} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.payCard, paymentReceived === 'self_paid' && styles.payCardSelf, currentStatus === 'completed' && paymentReceived !== 'self_paid' && styles.categoryChipLocked]}
                  disabled={currentStatus === 'completed'}
                  onPress={() => {
                    paymentDirtyRef.current = true;
                    setPaymentReceived('self_paid');
                  }}
                >
                  <View style={[styles.payIcon, styles.inlineIconBlue]}>
                    <Ionicons name="person-outline" size={14} color={colors.primary} />
                  </View>
                  <View style={styles.listCopy}>
                    <Text style={styles.payTitle}>Self</Text>
                    <Text style={styles.paySub}>Payment received by driver</Text>
                  </View>
                  <View style={[styles.radio, paymentReceived === 'self_paid' && styles.radioOnGreen]} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.agentBanner}>
            <Text style={styles.agentBannerText}>Do not collect payment</Text>
          </View>
        )}

        {odometerDisplayLine(trip.startOdometer, trip.startOdometerAt) != null ? (
          <InfoRow
            icon="speedometer-outline"
            label="Odometer (start)"
            value={odometerDisplayLine(trip.startOdometer, trip.startOdometerAt) ?? '—'}
            onPress={
              trip.startOdometerImageUrl && /^https?:\/\//i.test(trip.startOdometerImageUrl)
                ? () => Linking.openURL(trip.startOdometerImageUrl!).catch(() => {})
                : undefined
            }
          />
        ) : null}
        {odometerDisplayLine(trip.endOdometer, trip.endOdometerAt) != null ? (
          <InfoRow
            icon="speedometer-outline"
            label="Odometer (end)"
            value={odometerDisplayLine(trip.endOdometer, trip.endOdometerAt) ?? '—'}
            onPress={
              trip.endOdometerImageUrl && /^https?:\/\//i.test(trip.endOdometerImageUrl)
                ? () => Linking.openURL(trip.endOdometerImageUrl!).catch(() => {})
                : undefined
            }
          />
        ) : null}

        {currentStatus === 'in_progress' ? (
          <View style={styles.trackingCard}>
            <View style={styles.trackingCopy}>
              <Ionicons name="navigate" size={18} color={colors.primary} />
              <View>
                <Text style={styles.trackingLabel}>Live Tracking</Text>
                <Text style={styles.trackingHint}>
                  {trackingNote || 'Allow the office to follow this trip on the map'}
                </Text>
              </View>
            </View>
            <Switch
              value={liveTracking}
              onValueChange={(next) => {
                if (!next) {
                  trackingWantedRef.current = false;
                  setTrackingNote('');
                  setLiveTracking(false);
                  void stopDriverTripTracking();
                  return;
                }
                setLiveTracking(true);
              }}
              trackColor={{ false: colors.gray300, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
        ) : null}
        {duty && duty.days.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              <Text style={styles.sectionTitle}>Duty Days ({duty.days.length})</Text>
            </View>
            {duty.currentDutyDate ? (
              <Text style={styles.trackingHint}>
                {`Today's duty is day ${duty.currentDayIndex} · ${formatPrettyDate(duty.currentDutyDate)}. Earlier days stay as they were driven.`}
              </Text>
            ) : null}
            {duty.days.map((day) => (
              <View key={day.id} style={styles.dutyDay}>
                <View style={styles.dutyMain}>
                  <View style={styles.dutyCopy}>
                    <Text style={styles.dutyDayTitle}>Day {day.dayIndex}</Text>
                    <Text style={styles.dutyDate}>{formatPrettyDate(day.dutyDate)}</Text>
                  </View>
                  <View style={styles.dutyStatus}>
                    <View style={[styles.dutyDot, day.status === 'completed' ? styles.dutyDotDone : day.status === 'in_progress' ? styles.dutyDotLive : styles.dutyDotWait]} />
                    <View style={[styles.dutyPill, day.status === 'completed' ? styles.dutyPillDone : day.status === 'in_progress' ? styles.dutyPillLive : styles.dutyPillWait]}>
                      <Text style={[styles.dutyPillText, day.status === 'completed' ? styles.dutyPillTextDone : day.status === 'in_progress' ? styles.dutyPillTextLive : styles.dutyPillTextWait]}>
                        {dutyStatusLabel(day.status)}
                      </Text>
                    </View>
                  </View>
                </View>
                {day.segments.map((segment) => (
                  <Text key={segment.id} style={styles.dutyLine}>
                    {segment.driverName || 'Driver not set'} · {segment.vehicleNumber || 'Vehicle not set'}
                    {segment.vehicleModel ? ` · ${segment.vehicleModel}` : ''}
                    {segment.openingKm != null ? ` · Open ${segment.openingKm}` : ''}
                    {segment.closingKm != null ? ` · Close ${segment.closingKm}` : ''}
                    {segment.kilometers != null ? ` · ${segment.kilometers} km` : ''}
                  </Text>
                ))}
                {day.status === 'completed' ? (
                  <TouchableOpacity onPress={() => { void shareBookingDutySlip(trip.id, trip.bookingNumber, day.id); }}>
                    <Text style={styles.dutySlipLink}>Duty slip for this day</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
      {currentStatus === 'assigned' || currentStatus === 'in_progress' ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TouchableOpacity
            style={[styles.actionBtn, awaitingReceipt || currentStatus === 'assigned' ? styles.startBtn : styles.endBtn, loading && styles.btnDisabled]}
            onPress={awaitingReceipt ? confirmReceipt : currentStatus === 'assigned' ? handleStartTrip : handleEndTrip}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name={awaitingReceipt ? 'checkmark-circle' : currentStatus === 'assigned' ? 'play' : 'stop'} size={18} color="#fff" />
                <Text style={styles.actionBtnText}>
                  {awaitingReceipt
                    ? 'Confirm Receipt'
                    : currentStatus === 'assigned'
                      ? (duty && duty.days.length > 1 ? 'Start Day' : 'Start Trip')
                      : (duty && duty.isLastOpenDay === false ? 'End Day' : 'End Trip')}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : null}

      <OdometerCaptureModal
        visible={odometerModal !== null}
        onClose={() => setOdometerModal(null)}
        mode="trip"
        bookingId={trip.id}
        readingType={odometerModal === 'start' ? 'start' : 'end'}
        onSuccess={onOdometerSuccess}
      />
      <EndTripPaymentModal
        visible={paymentModalVisible}
        suggestedAmount={balance}
        initialPaymentType={paymentReceived ?? 'self_paid'}
        onConfirm={onEndTripPaymentConfirm}
        onCancel={() => setPaymentModalVisible(false)}
      />
    </SafeAreaView>
  );
}

function InfoRow({
  icon,
  label,
  value,
  onPress,
  hint,
}: {
  icon: string;
  label: string;
  value: string;
  onPress?: () => void;
  hint?: string;
}) {
  const body = (
    <>
      <Ionicons name={icon as any} size={20} color={colors.gray500} style={styles.rowIcon} />
      <View style={styles.rowContent}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={[styles.rowValue, onPress && styles.link]}>{value}</Text>
        {onPress ? (
          <Text style={[styles.rowHint, styles.link]}>{hint ?? 'Open photo'}</Text>
        ) : null}
      </View>
    </>
  );
  if (onPress) {
    return (
      <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
        {body}
      </TouchableOpacity>
    );
  }
  return <View style={styles.row}>{body}</View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f6fb' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff', gap: 8 },
  backBtn: { padding: 4 },
  title: { flex: 1, fontSize: 18, fontWeight: '800', color: colors.foreground },
  statusPill: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  statusLive: { backgroundColor: '#dcfce7' },
  statusAssigned: { backgroundColor: '#dbeafe' },
  statusDone: { backgroundColor: colors.gray200 },
  statusText: { fontSize: 12, fontWeight: '700', color: '#166534' },
  statusTextAssigned: { color: '#1d4ed8' },
  statusTextDone: { color: colors.gray700 },
  scroll: { flex: 1 },
  content: { padding: 12, gap: 12 },
  error: { fontSize: 16, color: colors.gray600, textAlign: 'center', marginTop: 32 },
  routeCard: { backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#e8edf5' },
  routeBody: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  routeStops: { flex: 1, gap: 4 },
  routeStop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  pinCol: { width: 14, alignItems: 'center' },
  pin: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  pinPickup: { backgroundColor: '#2563eb' },
  pinDrop: { backgroundColor: '#dc2626' },
  pinLine: { width: 0, flex: 1, minHeight: 22, borderLeftWidth: 1, borderStyle: 'dashed', borderColor: '#cbd5e1', marginTop: 2 },
  routeCopy: { flex: 1, paddingBottom: 8 },
  routePlace: { fontSize: 15, fontWeight: '800', color: colors.foreground, lineHeight: 20 },
  routeMeta: { fontSize: 12, color: colors.gray500, marginTop: 2, lineHeight: 16 },
  mapSide: { width: 108, alignItems: 'center', gap: 8 },
  mapArt: { width: 88, height: 64, borderRadius: 12, backgroundColor: '#e8f7ee', alignItems: 'center', justifyContent: 'center' },
  mapBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  mapBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  pair: { flexDirection: 'row', gap: 10 },
  stack: { gap: 10 },
  infoCard: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#e8edf5', gap: 2 },
  contactRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  contactBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  whatsappBubble: { backgroundColor: '#25D366' },
  callBtn: { backgroundColor: colors.primary },
  inlineIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e8eefc', marginBottom: 4 },
  inlineIconBlue: { backgroundColor: '#e8eefc' },
  inlineIconGreen: { backgroundColor: '#ecfdf3' },
  inlineIconAmber: { backgroundColor: '#fff7ed' },
  infoLabel: { fontSize: 12, color: colors.gray500 },
  infoValue: { fontSize: 15, fontWeight: '800', color: colors.foreground },
  infoSub: { fontSize: 12, color: colors.gray600 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#e8edf5' },
  listCopy: { flex: 1 },
  listTitle: { fontSize: 15, fontWeight: '800', color: colors.foreground },
  listSub: { fontSize: 12, color: colors.gray500, marginTop: 2 },
  section: { backgroundColor: '#fff', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#e8edf5' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.foreground },
  dutyDay: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#eef2f7' },
  dutyMain: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  dutyCopy: { flex: 1 },
  dutyDayTitle: { fontSize: 14, fontWeight: '800', color: colors.foreground },
  dutyDate: { fontSize: 12, color: colors.gray500, marginTop: 2 },
  dutyStatus: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dutyDot: { width: 8, height: 8, borderRadius: 4 },
  dutyDotWait: { backgroundColor: '#d1d5db' },
  dutyDotLive: { backgroundColor: '#f59e0b' },
  dutyDotDone: { backgroundColor: '#16a34a' },
  dutyPill: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  dutyPillWait: { backgroundColor: '#fff7ed' },
  dutyPillLive: { backgroundColor: '#eff6ff' },
  dutyPillDone: { backgroundColor: '#ecfdf3' },
  dutyPillText: { fontSize: 11, fontWeight: '700' },
  dutyPillTextWait: { color: '#c2410c' },
  dutyPillTextLive: { color: '#1d4ed8' },
  dutyPillTextDone: { color: '#166534' },
  dutyLine: { fontSize: 12, color: colors.gray600, marginTop: 4 },
  dutySlipLink: { fontSize: 12, color: colors.primary, fontWeight: '700', marginTop: 6 },
  placeGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  placeCell: { width: '50%', flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 8, paddingVertical: 8 },
  placeIndex: { width: 18, fontSize: 13, fontWeight: '700', color: colors.gray500 },
  placeName: { flex: 1, fontSize: 13, color: colors.foreground, fontWeight: '600', lineHeight: 18 },
  termRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 10 },
  termMark: { width: 22, height: 20, alignItems: 'center', justifyContent: 'center', marginRight: 6 },
  termBullet: { fontSize: 16, lineHeight: 20, color: colors.primary, fontWeight: '700' },
  termText: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.gray700 },
  moneyCard: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 12, gap: 4, borderWidth: 1, borderColor: '#e8edf5' },
  moneyAdvance: { backgroundColor: '#ecfdf3' },
  moneyBalance: { backgroundColor: '#fff7ed' },
  moneyLabel: { fontSize: 12, color: colors.gray600, fontWeight: '600' },
  moneyValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  moneyValue: { fontSize: 20, fontWeight: '800', color: colors.foreground },
  moneyValueGreen: { color: '#16a34a' },
  moneyValueOrange: { color: '#ea580c' },
  lockedSection: { opacity: 0.72 },
  amountInputLocked: { backgroundColor: colors.gray100 },
  categoryChipLocked: { opacity: 0.45 },
  amountField: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.gray50,
  },
  amountPrefix: { fontSize: 18, fontWeight: '800', color: colors.gray500 },
  amountInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: '800',
    color: colors.foreground,
  },
  categoryRow: { flexDirection: 'row', flexWrap: 'nowrap', gap: 6, marginTop: 10 },
  categoryChip: { flex: 1, alignItems: 'center', borderRadius: 16, paddingHorizontal: 2, paddingVertical: 7, backgroundColor: colors.gray50, borderWidth: 1, borderColor: colors.gray200 },
  categoryChipOn: { backgroundColor: '#eff6ff', borderColor: colors.primary },
  categoryChipText: { fontSize: 11, fontWeight: '700', color: colors.gray600, textAlign: 'center' },
  categoryChipTextOn: { color: colors.primary },
  payRow: { gap: 8, marginTop: 10 },
  payCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1.5,
    borderColor: colors.gray200,
  },
  payIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  payTitle: { fontSize: 14, fontWeight: '800', color: colors.foreground },
  paySub: { fontSize: 11, color: colors.gray500, marginTop: 1 },
  payCardCompany: { borderColor: colors.primary, backgroundColor: '#eff6ff' },
  payCardSelf: { borderColor: '#16a34a', backgroundColor: '#ecfdf3' },
  radio: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: '#cbd5e1' },
  radioOn: { borderColor: colors.primary, backgroundColor: colors.primary },
  radioOnGreen: { borderColor: '#16a34a', backgroundColor: '#16a34a' },
  agentBanner: { backgroundColor: '#FEF3C7', borderRadius: 16, padding: 12 },
  agentBannerText: { fontSize: 16, fontWeight: '700', color: '#92400E' },
  trackingCard: { backgroundColor: '#fff', borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  trackingCopy: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  trackingLabel: { fontSize: 15, fontWeight: '800', color: colors.foreground },
  trackingHint: { fontSize: 12, color: colors.gray500, marginTop: 2 },
  footer: { paddingHorizontal: 12, paddingTop: 8, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: colors.gray200 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14 },
  startBtn: { backgroundColor: '#16a34a' },
  endBtn: { backgroundColor: colors.primary },
  btnDisabled: { opacity: 0.7 },
  actionBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  row: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#fff', padding: 12, borderRadius: 16 },
  rowIcon: { marginRight: 12 },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 12, color: colors.gray600, marginBottom: 2 },
  rowValue: { fontSize: 15, color: colors.foreground },
  rowHint: { fontSize: 12, marginTop: 4 },
  link: { color: colors.primary, textDecorationLine: 'underline' },
});
