import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { format } from 'date-fns';
import { colors } from '../theme/colors';
import { useAuth } from '../providers/AuthProvider';
import { shareBuildTripLink, sharePackagePdf } from '../lib/tripQuoteShare';
import { DateTimePickerComponent } from '../components/DateTimePicker';
import { tourAPI, type TourItineraryDay } from '../services/tourAPI';
import type { QuotationRouteParams } from '../navigation/types';

type ItineraryDay = {
  day: number;
  heading: string;
  section: string;
  activities: string[];
};

type Props = { route: { params: QuotationRouteParams } };
type Step = 1 | 2 | 3;

const STEPS: Array<{ id: Step; label: string }> = [
  { id: 1, label: 'Customer' },
  { id: 2, label: 'Trip Details' },
  { id: 3, label: 'Fare & Extras' },
];

const EXTRAS: Array<{ key: string; label: string }> = [
  { key: 'parking', label: 'Parking fees' },
  { key: 'tolls', label: 'Tolls' },
  { key: 'driverAllowance', label: "Driver's allowance" },
  { key: 'permits', label: 'Permits' },
  { key: 'entryFees', label: 'Entry fees' },
  { key: 'hotels', label: 'Hotels' },
];

const GST_NOTE = 'GST 18% is applicable only when a GST invoice is raised.';

function money(raw: string): number {
  const amount = Number(String(raw).replace(/[^\d.]/g, ''));
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function rupees(amount: number): string {
  return `Rs ${Math.round(amount).toLocaleString('en-IN')}`;
}

function sourceDays(tour: QuotationRouteParams['tours'][number], itinerary?: TourItineraryDay[]): TourItineraryDay[] {
  if (itinerary && itinerary.length > 0) return itinerary;
  return Array.from({ length: Math.max(1, Number(tour.days) || 1) }, (_, index) => ({
    day: index + 1,
    title: tour.name,
    description: '',
    activities: [],
  }));
}

export function QuotationScreen({ route }: Props) {
  const navigation = useNavigation();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  const params = route.params;
  const tours = params.tours;
  const [step, setStep] = useState<Step>(1);
  const [guest, setGuest] = useState('');
  const [phone, setPhone] = useState('');
  const [pickup, setPickup] = useState(params.pickup || '');
  const [when, setWhen] = useState(() => new Date(params.pickupDate || Date.now()));
  const [duration, setDuration] = useState(params.duration || '');
  const [lastDrop, setLastDrop] = useState('');
  const [placesByDay, setPlacesByDay] = useState<string[][]>([]);
  const placesSeeded = useRef(false);
  const [nightStays, setNightStays] = useState<string[]>([]);
  const [carrierOn, setCarrierOn] = useState(false);
  const [carrierAmount, setCarrierAmount] = useState('');
  const [extraLabel, setExtraLabel] = useState('');
  const [extraAmount, setExtraAmount] = useState('');
  const [discount, setDiscount] = useState('');
  const [seats, setSeats] = useState('');
  const [notes, setNotes] = useState('');
  const [included, setIncluded] = useState<Record<string, boolean>>({});
  const [itineraries, setItineraries] = useState<Array<TourItineraryDay[] | undefined>>([]);

  useEffect(() => {
    let cancelled = false;
    void Promise.all(tours.map((tour) => tourAPI.getTourDetail(tour.id))).then((details) => {
      if (!cancelled) setItineraries(details.map((detail) => detail?.itinerary));
    });
    return () => {
      cancelled = true;
    };
  }, [tours]);

  const plans = useMemo<ItineraryDay[]>(() => {
    const out: ItineraryDay[] = [];
    let day = 1;
    tours.forEach((tour, tourIndex) => {
      sourceDays(tour, itineraries[tourIndex]).forEach((item) => {
        const date = new Date(when);
        date.setDate(when.getDate() + day - 1);
        const title = String(item.title || tour.name).replace(/\s+/g, ' ').trim();
        out.push({
          day,
          heading: `${format(date, 'd MMM yyyy')} | ${title}`,
          section: item.description && item.description.length < 80 ? item.description : '',
          activities: (item.activities || []).map((activity) => String(activity).trim()).filter(Boolean),
        });
        day += 1;
      });
    });
    return out.length > 0
      ? out
      : [{ day: 1, heading: format(when, 'd MMM yyyy'), section: '', activities: [] }];
  }, [tours, itineraries, when]);

  useEffect(() => {
    if (placesSeeded.current || itineraries.length !== tours.length || plans.length === 0) return;
    placesSeeded.current = true;
    setPlacesByDay(plans.map((plan) => (plan.activities.length > 0 ? [...plan.activities] : [''])));
  }, [itineraries.length, plans, tours.length]);

  const placeRows = () => (
    placesByDay.length === plans.length
      ? placesByDay
      : plans.map((plan) => (plan.activities.length > 0 ? [...plan.activities] : ['']))
  );

  const editPlace = (dayIndex: number, placeIndex: number, value: string) => {
    setPlacesByDay(placeRows().map((row, index) => {
      if (index !== dayIndex) return row;
      const next = [...row];
      next[placeIndex] = value;
      return next;
    }));
  };

  const movePlace = (dayIndex: number, from: number, to: number) => {
    setPlacesByDay(placeRows().map((row, index) => {
      if (index !== dayIndex || to < 0 || to >= row.length) return row;
      const next = [...row];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    }));
  };

  const removePlace = (dayIndex: number, placeIndex: number) => {
    setPlacesByDay(placeRows().map((row, index) => {
      if (index !== dayIndex) return row;
      const next = row.filter((_, itemIndex) => itemIndex !== placeIndex);
      return next.length > 0 ? next : [''];
    }));
  };

  const addPlace = (dayIndex: number) => {
    setPlacesByDay(placeRows().map((row, index) => (index === dayIndex ? [...row, ''] : row)));
  };
  const nights = Math.max(0, plans.length - 1);
  const packageAmount = params.packageAmount && params.packageAmount > 0
    ? params.packageAmount
    : tours.reduce((sum, tour) => sum + (Number(tour.price) || 0), 0);
  const carrier = carrierOn ? money(carrierAmount) : 0;
  const extra = money(extraAmount);
  const discountAmount = money(discount);
  const payable = Math.max(0, packageAmount + carrier + extra - discountAmount);
  const allowsSeats = /urbania|tempo\s*traveller/i.test(params.vehicleName || '');
  const includedLabels = EXTRAS.filter((item) => included[item.key]).map((item) => item.label);
  const excludedLabels = EXTRAS.filter((item) => !included[item.key]).map((item) => item.label);
  const includedText = ['Private cab', 'Driver', 'Fuel as per package', ...includedLabels].join(' · ');
  const excludedText = excludedLabels.join(' · ');

  const quoteMessage = () => {
    const whenLabel = format(when, 'd MMM yyyy, h:mm a');
    return [
      `Vizag Taxi Hub quotation for ${guest.trim()}`,
      '',
      ...tours.map((tour) => `• ${tour.name}${tour.price ? ` — ${rupees(tour.price)}` : ''}`),
      '',
      `Vehicle: ${params.vehicleName || 'Cab'}${seats.trim() ? ` (${seats.trim()} Seater)` : ''}${carrierOn ? ' + carrier' : ''}`,
      `Package total: ${rupees(packageAmount)}`,
      carrierOn ? (carrier > 0 ? `Carrier: + ${rupees(carrier)}` : 'Carrier: included') : '',
      extra > 0 ? `${extraLabel.trim() || 'Extra'}: + ${rupees(extra)}` : '',
      discountAmount > 0 ? `Discount: - ${rupees(discountAmount)}` : '',
      `Payable total: ${rupees(payable)}`,
      '',
      `Included: ${includedText}`,
      excludedText ? `Not included: ${excludedText}` : '',
      GST_NOTE,
      `Pickup: ${pickup.trim() || 'To be confirmed'}`,
      lastDrop.trim() ? `Last drop: ${lastDrop.trim()}` : '',
      ...nightStays.map((stay, index) => (stay.trim() ? `Night ${index + 1} stay: ${stay.trim()}` : '')),
      notes.trim() ? `Notes: ${notes.trim()}` : '',
      `Date and time: ${whenLabel}`,
      ...(params.transfers || []).map((transfer) => {
        const airport = 'Alluri Sitarama Raju International Airport';
        return transfer.direction === 'from-airport'
          ? `Airport transfer: From ${airport} to ${transfer.placeName}`
          : `Airport transfer: From ${transfer.placeName} to ${airport}`;
      }),
      `Tour duration: ${duration.trim() || `${plans.length} day${plans.length === 1 ? '' : 's'}`}`,
      'Book: +91 9966363662 | www.vizagtaxihub.com',
    ].filter(Boolean).join('\n');
  };

  const pdfInput = () => ({
    tours: tours.map((tour) => ({ name: tour.name, days: tour.days, price: tour.price })),
    guest: guest.trim(),
    phone: phone.trim(),
    pickup: pickup.trim(),
    whenLabel: format(when, 'd MMM yyyy, h:mm a'),
    duration: duration.trim() || `${plans.length} day${plans.length === 1 ? '' : 's'}`,
    vehicle: params.vehicleName,
    seats: seats.trim() ? `${seats.trim()} Seater` : '',
    lastDrop: lastDrop.trim(),
    nightStays,
    itinerary: plans.map((plan, index) => {
      const edited = (placesByDay[index] || plan.activities).map((place) => place.trim()).filter(Boolean);
      const pickupLine = index === 0 && pickup.trim() && !edited.some((line) => /^pickup from/i.test(line))
        ? `Pickup from ${pickup.trim()} at ${format(when, 'h:mm a')}`
        : '';
      return {
        day: plan.day,
        heading: plan.heading,
        section: plan.section,
        activities: [pickupLine, ...edited].filter(Boolean),
        halt: (nightStays[index] || '').trim(),
      };
    }),
    transfers: params.transfers,
    packageAmount,
    carrierIncluded: carrierOn,
    carrierAmount: carrier,
    extraLabel,
    extraAmount: extra,
    discountAmount,
    payable,
    included: includedText,
    excluded: excludedText,
    notes: notes.trim(),
  });

  const validateCustomer = () => {
    if (guest.trim().length < 2 || phone.replace(/\D/g, '').length < 10) {
      Alert.alert('Customer details', 'Enter the guest name and a 10-digit WhatsApp number.');
      return false;
    }
    return true;
  };

  const validateTrip = () => {
    if (!pickup.trim()) {
      Alert.alert('Pickup location', 'Enter the pickup location for this quotation.');
      return false;
    }
    return true;
  };

  const goNext = () => {
    if (step === 1) {
      if (!validateCustomer()) return;
      setStep(2);
      return;
    }
    if (!validateTrip()) return;
    setStep(3);
  };

  const shareQuote = async () => {
    if (!validateCustomer() || !validateTrip()) return;
    const message = quoteMessage();
    const digits = phone.replace(/\D/g, '');
    const wa = digits.length > 10 ? digits : `91${digits}`;
    try {
      await Linking.openURL(`https://wa.me/${wa}?text=${encodeURIComponent(message)}`);
    } catch {
      await Share.share({ title: `Quotation for ${guest.trim()}`, message });
    }
  };

  const sharePdf = async () => {
    if (!validateCustomer() || !validateTrip()) return;
    try {
      await sharePackagePdf(pdfInput());
    } catch {
      Alert.alert('PDF', 'The quotation PDF could not be created.');
    }
  };

  const shareLink = async () => {
    try {
      await shareBuildTripLink(tours);
    } catch {
      Alert.alert('Share link', 'The Build Your Trip link could not be opened.');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Quotation</Text>
          <Text style={styles.headerSub}>
            {step === 1 ? 'Customer details' : step === 2 ? 'Add the travel plan' : 'Review fare and extras'}
          </Text>
        </View>
      </View>
      <View style={styles.steps}>
        {STEPS.map((item) => {
          const on = step >= item.id;
          return (
            <View key={item.id} style={styles.step}>
              <View style={[styles.stepDot, on && styles.stepDotOn]}>
                <Text style={[styles.stepNum, on && styles.stepNumOn]}>{item.id}</Text>
              </View>
              <Text style={[styles.stepLabel, on && styles.stepLabelOn]}>{item.label}</Text>
            </View>
          );
        })}
      </View>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {step === 1 ? (
          <>
            <Text style={styles.section}>Customer details</Text>
            <Text style={styles.label}>Customer name *</Text>
            <TextInput style={styles.input} placeholder="Guest full name" value={guest} onChangeText={setGuest} />
            <Text style={styles.label}>WhatsApp number *</Text>
            <TextInput style={styles.input} placeholder="10-digit mobile number" keyboardType="phone-pad" value={phone} onChangeText={setPhone} maxLength={15} />
            <Text style={styles.help}>We will use this number to share the itinerary and fare on WhatsApp.</Text>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <Text style={styles.section}>Trip details</Text>
            <Text style={styles.label}>Pickup location *</Text>
            <TextInput style={styles.input} placeholder="Pickup place" value={pickup} onChangeText={setPickup} />
            <DateTimePickerComponent label="Travel date & time" date={when} onDateChange={setWhen} />
            <Text style={styles.label}>Tour duration</Text>
            <TextInput style={styles.input} placeholder="e.g. 3 Days / 2 Nights" value={duration} onChangeText={setDuration} />
            <Text style={styles.label}>Last drop location (optional)</Text>
            <TextInput style={styles.input} placeholder="Search last drop location" value={lastDrop} onChangeText={setLastDrop} />
            {(params.transfers || []).length > 0 ? (
              <View style={styles.noteCard}>
                <Text style={styles.noteTitle}>Airport transfers</Text>
                {params.transfers?.map((transfer) => (
                  <Text key={`${transfer.direction}-${transfer.placeName}`} style={styles.noteLine}>
                    {transfer.direction === 'from-airport' ? 'From airport to' : 'To airport from'} {transfer.placeName}
                  </Text>
                ))}
              </View>
            ) : null}
            <Text style={styles.section}>Day-wise itinerary</Text>
            {plans.map((plan, index) => (
              <View key={plan.day} style={styles.dayCard}>
                <View style={styles.dayHead}>
                  <Text style={styles.dayBadge}>DAY {plan.day}</Text>
                  <Text style={styles.dayMeta}>{plan.heading}</Text>
                </View>
                {plan.section ? <Text style={styles.activity}>{plan.section}</Text> : null}
                {(placesByDay[index] || plan.activities).map((place, placeIndex, row) => (
                  <View key={`${plan.day}-${placeIndex}`} style={styles.placeRow}>
                    <TextInput
                      style={styles.placeInput}
                      placeholder="Place or activity"
                      value={place}
                      onChangeText={(value) => editPlace(index, placeIndex, value)}
                    />
                    <View style={styles.moveCol}>
                      <TouchableOpacity
                        style={styles.moveBtn}
                        disabled={placeIndex === 0}
                        onPress={() => movePlace(index, placeIndex, placeIndex - 1)}
                      >
                        <Feather name="chevron-up" size={14} color={placeIndex === 0 ? '#e2e8f0' : '#64748b'} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.moveBtn}
                        disabled={placeIndex === row.length - 1}
                        onPress={() => movePlace(index, placeIndex, placeIndex + 1)}
                      >
                        <Feather name="chevron-down" size={14} color={placeIndex === row.length - 1 ? '#e2e8f0' : '#64748b'} />
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => removePlace(index, placeIndex)}>
                      <Feather name="trash-2" size={14} color="#e11d48" />
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity style={styles.addPlace} onPress={() => addPlace(index)}>
                  <Feather name="plus" size={14} color="#2563eb" />
                  <Text style={styles.addPlaceText}>Add place</Text>
                </TouchableOpacity>
                {index < nights ? (
                  <>
                    <Text style={styles.label}>Night {index + 1} stay</Text>
                    <TextInput
                      style={styles.input}
                      placeholder={`City or hotel for night ${index + 1}`}
                      value={nightStays[index] || ''}
                      onChangeText={(value) => setNightStays((current) => {
                        const next = Array.from({ length: nights }, (_, stayIndex) => current[stayIndex] || '');
                        next[index] = value;
                        return next;
                      })}
                    />
                  </>
                ) : null}
              </View>
            ))}
          </>
        ) : null}

        {step === 3 ? (
          <>
            <View style={styles.fareCard}>
              <View style={styles.fareCopy}>
                <Text style={styles.fareVehicle}>{params.vehicleName || 'Selected vehicle'}</Text>
                <Text style={styles.fareHint}>Package {rupees(packageAmount)}</Text>
              </View>
              <View>
                <Text style={styles.fareLabel}>Total fare</Text>
                <Text style={styles.fareValue}>{rupees(payable)}</Text>
              </View>
            </View>
            <Text style={styles.section}>Adjustments (optional)</Text>
            {allowsSeats ? (
              <>
                <Text style={styles.label}>Custom seating</Text>
                <TextInput style={styles.input} placeholder="Seats" keyboardType="number-pad" value={seats} onChangeText={setSeats} maxLength={2} />
              </>
            ) : null}
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Add carrier to vehicle</Text>
              <Switch value={carrierOn} onValueChange={setCarrierOn} />
            </View>
            <TextInput style={styles.input} placeholder="Carrier amount" keyboardType="number-pad" value={carrierAmount} onChangeText={setCarrierAmount} editable={carrierOn} />
            <Text style={styles.label}>Other extra</Text>
            <TextInput style={styles.input} placeholder="Child seat, extra km…" value={extraLabel} onChangeText={setExtraLabel} />
            <TextInput style={styles.input} placeholder="Extra amount" keyboardType="number-pad" value={extraAmount} onChangeText={setExtraAmount} />
            <Text style={styles.label}>Discount</Text>
            <TextInput style={styles.input} placeholder="Discount amount" keyboardType="number-pad" value={discount} onChangeText={setDiscount} />
            <Text style={styles.label}>Notes (optional)</Text>
            <TextInput style={[styles.input, styles.notes]} placeholder="Special requests for this quotation" value={notes} onChangeText={setNotes} multiline />
            <View style={styles.noteCard}>
              <Text style={styles.noteTitle}>Included in this fare</Text>
              <Text style={styles.help}>Checked items are included. Unchecked items are not included.</Text>
              {EXTRAS.map((item) => (
                <View key={item.key} style={styles.switchRow}>
                  <Text style={styles.switchLabel}>{item.label}</Text>
                  <Switch
                    value={Boolean(included[item.key])}
                    onValueChange={(value) => setIncluded((current) => ({ ...current, [item.key]: value }))}
                  />
                </View>
              ))}
              <Text style={styles.help}>{GST_NOTE}</Text>
            </View>
          </>
        ) : null}
      </ScrollView>
      <View style={styles.footer}>
        {step < 3 ? (
          <View style={styles.footerRow}>
            {step > 1 ? (
              <TouchableOpacity style={[styles.backButton, styles.rowButton]} onPress={() => setStep(1)}>
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={[styles.button, styles.rowButton]} onPress={goNext}>
              <Text style={styles.buttonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <TouchableOpacity style={styles.button} onPress={() => { void sharePdf(); }}>
              <Text style={styles.buttonText}>Create / share quotation PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareBtn} onPress={() => { void shareQuote(); }}>
              <Text style={styles.shareBtnText}>Share on WhatsApp</Text>
            </TouchableOpacity>
            {isSuperAdmin ? (
              <TouchableOpacity style={styles.linkBtn} onPress={() => { void shareLink(); }}>
                <Text style={styles.linkBtnText}>Share Build Your Trip link</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={styles.backButton} onPress={() => setStep(2)}>
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  backBtn: { padding: 4, marginRight: 8 },
  headerCopy: { flex: 1 },
  title: { fontSize: 18, fontWeight: '700', color: colors.foreground },
  headerSub: { marginTop: 2, fontSize: 12, color: '#64748b' },
  steps: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#fff' },
  step: { alignItems: 'center', flex: 1 },
  stepDot: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  stepDotOn: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  stepNum: { fontSize: 11, fontWeight: '700', color: '#94a3b8' },
  stepNumOn: { color: '#fff' },
  stepLabel: { marginTop: 4, fontSize: 10, fontWeight: '600', color: '#94a3b8', textAlign: 'center' },
  stepLabelOn: { color: '#0f172a' },
  body: { padding: 16, paddingBottom: 24 },
  section: { marginTop: 4, marginBottom: 8, fontWeight: '700', color: '#0f172a', fontSize: 15 },
  label: { marginBottom: 6, fontSize: 13, fontWeight: '600', color: '#1e293b' },
  help: { color: '#047857', fontSize: 12, lineHeight: 18, marginBottom: 8 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 8, color: '#0f172a' },
  notes: { minHeight: 72, textAlignVertical: 'top' },
  dayCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#dbe7df', borderRadius: 12, padding: 12, marginBottom: 10 },
  dayHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  dayBadge: { backgroundColor: '#1A3A2A', color: '#fff', overflow: 'hidden', fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  dayMeta: { flex: 1, color: '#1A3A2A', fontSize: 13, fontWeight: '700' },
  activity: { color: '#353535', fontSize: 13, lineHeight: 18, marginBottom: 4 },
  placeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  placeInput: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, color: '#0f172a', fontSize: 13 },
  moveCol: { width: 28, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, overflow: 'hidden' },
  moveBtn: { height: 18, alignItems: 'center', justifyContent: 'center' },
  deleteBtn: { width: 32, height: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#fecdd3', borderRadius: 8, backgroundColor: '#fff1f2' },
  addPlace: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  addPlaceText: { color: '#2563eb', fontWeight: '700', fontSize: 13 },
  fareCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, padding: 14, marginBottom: 12 },
  fareCopy: { flex: 1, marginRight: 12 },
  fareVehicle: { fontWeight: '700', color: '#0f172a', fontSize: 15 },
  fareHint: { marginTop: 4, color: '#64748b', fontSize: 12 },
  fareLabel: { color: '#64748b', fontSize: 11, textAlign: 'right' },
  fareValue: { color: '#2563eb', fontWeight: '800', fontSize: 18, textAlign: 'right' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  switchLabel: { flex: 1, color: '#1e293b', fontSize: 14, paddingRight: 12 },
  noteCard: { backgroundColor: '#ecfdf5', borderRadius: 12, padding: 12, marginTop: 8 },
  noteTitle: { fontWeight: '700', color: '#0f172a', marginBottom: 6 },
  noteLine: { color: '#334155', marginBottom: 4 },
  footer: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e5e7eb', gap: 8 },
  footerRow: { flexDirection: 'row', gap: 10 },
  rowButton: { flex: 1 },
  backButton: { minHeight: 48, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff' },
  backButtonText: { color: '#0f172a', fontWeight: '700', fontSize: 15 },
  shareBtn: { minHeight: 48, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ecfdf5', borderWidth: 1, borderColor: '#a7f3d0' },
  shareBtnText: { color: '#047857', fontWeight: '700', fontSize: 15, textAlign: 'center' },
  linkBtn: { minHeight: 44, borderRadius: 12, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  linkBtnText: { color: '#047857', fontWeight: '700', fontSize: 14, textAlign: 'center' },
  button: { minHeight: 48, backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 15, textAlign: 'center' },
});
