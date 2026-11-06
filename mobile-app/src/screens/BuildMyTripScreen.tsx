import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { format } from 'date-fns';
import { tourAPI, type TourInfo } from '../services/tourAPI';
import { loadVehicles, type Vehicle } from '../services/vehiclesAPI';
import { fonts } from '../theme/colors';
import { useAuth } from '../providers/AuthProvider';
import { useTripCart, type TripTour } from '../lib/tripCart';
import { shareBuildTripLink } from '../lib/tripQuoteShare';
import { LocationInput } from '../components/LocationInput';
import { DateTimePickerComponent } from '../components/DateTimePicker';
import { calculateDistanceMatrix } from '../services/distanceService';
import { calculateAirportFare, getAirportFares, type AirportFare } from '../services/fareService';
import type { Location } from '../types';

type Row = TripTour & { pricing?: Record<string, number>; distance?: number };

type TransferDirection = 'from-airport' | 'to-airport' | 'from-station' | 'to-station';

type Transfer = {
  id: string;
  direction: TransferDirection;
  place: Location | null;
  when: Date;
  distanceKm: number;
  fare: number;
};

const VIZAG_AIRPORT: Location = {
  id: 'vizag_airport',
  name: 'Alluri Sitarama Raju International Airport',
  address: 'Alluri Sitarama Raju International Airport, Bhogapuram, Vizianagaram District, Andhra Pradesh',
  city: 'Bhogapuram',
  state: 'Andhra Pradesh',
  lat: 17.97611,
  lng: 83.50389,
  type: 'airport',
  popularityScore: 99,
  isInVizag: false,
};

const VIZAG_RAILWAY: Location = {
  id: 'vizag_railway',
  name: 'Visakhapatnam Railway Station',
  address: 'Visakhapatnam Railway Station, Visakhapatnam',
  city: 'Visakhapatnam',
  state: 'Andhra Pradesh',
  lat: 17.7215,
  lng: 83.2248,
  type: 'train_station',
  popularityScore: 98,
  isInVizag: true,
};

function isArrival(direction: TransferDirection): boolean {
  return direction === 'from-airport' || direction === 'from-station';
}

function edgeWhen(direction: TransferDirection, tripStart: Date, dayCount: number): Date {
  const date = new Date(tripStart);
  if (!isArrival(direction)) {
    date.setDate(date.getDate() + Math.max(0, dayCount - 1));
  }
  return date;
}

function newTransfer(direction: TransferDirection, tripStart: Date, dayCount: number): Transfer {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    direction,
    place: null,
    when: edgeWhen(direction, tripStart, dayCount),
    distanceKm: 0,
    fare: 0,
  };
}

function formatPrice(amount: number): string {
  if (!(amount > 0)) return '';
  return `₹${amount.toLocaleString('en-IN')}`;
}

function formatDuration(days?: number, timeDuration?: string): string {
  if (days && days >= 2) return `${days}D / ${Math.max(1, days - 1)}N`;
  const label = String(timeDuration || '').trim();
  if (label) return label;
  if (days === 1) return '1 Day';
  return '';
}

function suggestedDuration(rows: Row[]): string {
  const days = rows.reduce((sum, tour) => sum + (Number(tour.days) > 0 ? Number(tour.days) : 1), 0);
  if (days <= 1) return rows.map((tour) => String(tour.timeDuration || '').trim()).find(Boolean) || '1 Day';
  const nights = Math.max(0, days - 1);
  return `${days} Days / ${nights} Night${nights === 1 ? '' : 's'}`;
}

function tourPlace(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('srikurmam') || n.includes('arasavalli')) return 'Srikakulam, Andhra Pradesh';
  if (n.includes('lambasingi')) return 'Lambasingi, Alluri Sitharama Raju Dist.';
  if (n.includes('vanajangi')) return 'Vanajangi, Andhra Pradesh';
  if (n.includes('araku')) return 'Araku Valley, Visakhapatnam';
  if (n.includes('vizag') || n.includes('visakhapatnam')) return 'Visakhapatnam, Andhra Pradesh';
  return 'Andhra Pradesh';
}

function priceForVehicle(pricing: Record<string, number> | undefined, vehicleId: string): number {
  if (!pricing || !vehicleId) return 0;
  const id = vehicleId.toLowerCase();
  for (const [key, value] of Object.entries(pricing)) {
    const amount = Number(value);
    if (key.toLowerCase() === id && Number.isFinite(amount) && amount > 0) return amount;
  }
  return 0;
}

function namedPlace(name: string): Location {
  return {
    id: `tour_${name}`,
    name,
    address: name,
    city: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    lat: 17.7215,
    lng: 83.2248,
    type: 'other',
    popularityScore: 50,
    isInVizag: true,
  };
}

function defaultWhen(): Date {
  const date = new Date();
  date.setTime(date.getTime() + 90 * 60 * 1000);
  return date;
}

export function BuildMyTripScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const tripCart = useTripCart();
  const isSuperAdmin = user?.role === 'super_admin';
  const [catalog, setCatalog] = useState<TourInfo[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleId, setVehicleId] = useState('');
  const [pickup, setPickup] = useState<Location | null>(null);
  const [when, setWhen] = useState<Date>(defaultWhen);
  const [duration, setDuration] = useState('');
  const [planOpen, setPlanOpen] = useState(false);
  const [itineraryOpen, setItineraryOpen] = useState(true);
  const [airportOpen, setAirportOpen] = useState(false);
  const [railwayOpen, setRailwayOpen] = useState(false);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [railwayTransfers, setRailwayTransfers] = useState<Transfer[]>([]);
  const [whenPickerId, setWhenPickerId] = useState<string | null>(null);
  const [airportFares, setAirportFares] = useState<Record<string, AirportFare> | null>(null);
  const [faresReady, setFaresReady] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [guestReady, setGuestReady] = useState(false);

  useEffect(() => {
    void tourAPI.getAvailableTours().then(setCatalog).catch(() => setCatalog([]));
    void loadVehicles().then(setVehicles).catch(() => setVehicles([]));
    void getAirportFares()
      .then(setAirportFares)
      .catch(() => setAirportFares(null))
      .finally(() => setFaresReady(true));
  }, []);

  const rows = useMemo<Row[]>(() => tripCart.items.map((item) => {
    const match = catalog.find((tour) => tour.id === item.id || tour.name === item.name);
    const pricing = match?.pricing;
    const values = Object.values(pricing || {}).filter((value): value is number => typeof value === 'number' && value > 0);
    const minPrice = item.minPrice || (values.length > 0 ? Math.min(...values) : 0);
    return {
      ...item,
      name: match?.name || item.name,
      image: item.image || match?.image,
      days: item.days || match?.days,
      timeDuration: item.timeDuration || match?.timeDuration,
      distance: match?.distance,
      pricing,
      minPrice: minPrice > 0 ? minPrice : undefined,
    };
  }), [tripCart.items, catalog]);

  const suggested = suggestedDuration(rows);
  const durationLabel = duration.trim() || suggested;
  const durationChoices = useMemo(() => {
    const values = new Set<string>();
    if (suggested) values.add(suggested);
    rows.forEach((row) => {
      const own = suggestedDuration([row]);
      if (own) values.add(own);
      const raw = String(row.timeDuration || '').trim();
      if (raw) values.add(raw);
    });
    return [...values];
  }, [rows, suggested]);

  const vehicleOptions = useMemo(() => {
    if (rows.length === 0) return [];
    return vehicles
      .map((vehicle) => ({
        ...vehicle,
        packagePrice: rows.reduce((sum, row) => sum + priceForVehicle(row.pricing, vehicle.id), 0),
      }))
      .filter((vehicle) => vehicle.packagePrice > 0)
      .sort((a, b) => a.packagePrice - b.packagePrice);
  }, [rows, vehicles]);

  const selectedVehicle = vehicleOptions.find((vehicle) => vehicle.id === vehicleId) || vehicleOptions[0];
  const packageValue = selectedVehicle?.packagePrice
    || rows.reduce((sum, row) => sum + (Number(row.minPrice) || 0), 0);

  const itinerary = useMemo(() => {
    const lines: Array<{ day: number; title: string; note: string }> = [];
    let day = 1;
    rows.forEach((row) => {
      const span = Math.max(1, Number(row.days) || 1);
      for (let index = 0; index < span; index += 1) {
        const date = new Date(when);
        date.setDate(date.getDate() + day - 1);
        lines.push({
          day,
          title: span > 1 ? `${row.name} · Day ${index + 1}` : row.name,
          note: `${format(date, 'd MMM')} · ${index === 0 ? tourPlace(row.name) : 'Continue this package'}`,
        });
        day += 1;
      }
    });
    return lines;
  }, [rows, when]);

  const tripDayCount = Math.max(1, itinerary.length);
  const airportExtra = transfers.reduce((sum, transfer) => sum + (transfer.fare > 0 ? transfer.fare : 0), 0);
  const railwayExtra = railwayTransfers.reduce((sum, transfer) => sum + (transfer.fare > 0 ? transfer.fare : 0), 0);
  const quotedTotal = packageValue + airportExtra + railwayExtra;
  const transferQuoteKey = [
    selectedVehicle?.id || '',
    faresReady ? 'ready' : 'wait',
    ...transfers.map((transfer) => `${transfer.id}:${transfer.direction}:${transfer.place?.lat ?? ''}:${transfer.place?.lng ?? ''}`),
    ...railwayTransfers.map((transfer) => `${transfer.id}:${transfer.direction}:${transfer.place?.lat ?? ''}:${transfer.place?.lng ?? ''}`),
  ].join('|');

  useEffect(() => {
    if (!faresReady || !selectedVehicle) return;
    const lists = [
      { items: transfers, hub: VIZAG_AIRPORT, apply: setTransfers },
      { items: railwayTransfers, hub: VIZAG_RAILWAY, apply: setRailwayTransfers },
    ];
    const pending = lists.some((list) =>
      list.items.some((transfer) => transfer.place && Number.isFinite(transfer.place.lat) && Number.isFinite(transfer.place.lng))
    );
    if (!pending) return;
    let cancelled = false;
    const vehicle = selectedVehicle;
    void (async () => {
      const priced = await Promise.all(lists.map(async (list) => {
        const next = await Promise.all(list.items.map(async (transfer) => {
          const place = transfer.place;
          if (!place || !Number.isFinite(place.lat) || !Number.isFinite(place.lng)) {
            return transfer.distanceKm === 0 && transfer.fare === 0 ? transfer : { ...transfer, distanceKm: 0, fare: 0 };
          }
          const origin = isArrival(transfer.direction) ? list.hub : place;
          const destination = isArrival(transfer.direction) ? place : list.hub;
          const result = await calculateDistanceMatrix(origin, destination);
          const distanceKm = result.status === 'OK' ? result.distance : 0;
          const fare = distanceKm > 0 ? calculateAirportFare(vehicle.name, distanceKm, airportFares, vehicle.id) : 0;
          return { ...transfer, distanceKm, fare };
        }));
        return { ...list, next };
      }));
      if (cancelled) return;
      priced.forEach((list) => {
        const changed = list.next.some(
          (transfer, index) => transfer.distanceKm !== list.items[index]?.distanceKm || transfer.fare !== list.items[index]?.fare
        );
        if (changed) list.apply(list.next);
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [transferQuoteKey, faresReady, selectedVehicle, transfers, railwayTransfers, airportFares]);

  const goAddTours = () => {
    if (navigation.canGoBack()) navigation.goBack();
  };

  const openDetails = (row: Row) => {
    (navigation.navigate as (name: string, params?: object) => void)('TourDetail', {
      tourId: row.id,
      tourName: row.name,
    });
  };

  const continueBooking = () => {
    if (!pickup) {
      setPlanOpen(true);
      Alert.alert('Trip plan', 'Enter the pickup location, date and time to continue.');
      return;
    }
    const vehicle = selectedVehicle;
    const transferNote = [...transfers, ...railwayTransfers]
      .filter((transfer) => transfer.place?.name)
      .map((transfer) => {
        if (transfer.direction === 'from-airport') return `Airport to ${transfer.place?.name}`;
        if (transfer.direction === 'to-airport') return `${transfer.place?.name} to Airport`;
        if (transfer.direction === 'from-station') return `Railway station to ${transfer.place?.name}`;
        return `${transfer.place?.name} to Railway station`;
      })
      .join(' + ');
    const dropName = [rows.map((row) => row.name).join(' + '), transferNote].filter(Boolean).join(' · ');
    (navigation.navigate as (name: string, params?: object) => void)('BookingSummary', {
      pickupLocation: pickup,
      dropLocation: namedPlace(dropName),
      pickupDate: when.getTime(),
      tripType: 'tour',
      tripMode: 'round-trip',
      distance: rows.reduce((sum, row) => sum + (Number(row.distance) || 0), 0),
      duration: itinerary.length * 24 * 60,
      tourId: rows[0]?.id,
      tourName: dropName,
      selectedVehicle: vehicle
        ? { id: vehicle.id, name: vehicle.name, capacity: vehicle.capacity, image: vehicle.image }
        : { id: 'quote', name: 'Cab' },
      totalPrice: quotedTotal,
      paymentMode: 'partial',
    });
  };

  const proceed = () => {
    if (rows.length === 0) return;
    if (isSuperAdmin || guestReady) {
      continueBooking();
      return;
    }
    setPhoneOpen(true);
  };

  const shareLink = async () => {
    try {
      await shareBuildTripLink(rows);
    } catch {
      Alert.alert('Share link', 'The Build Your Trip link could not be opened.');
    }
  };

  const createPdf = () => {
    (navigation.navigate as (name: string, params?: object) => void)('Quotation', {
      tours: rows.map((row) => {
        const vehiclePrice = selectedVehicle ? priceForVehicle(row.pricing, selectedVehicle.id) : 0;
        return {
          id: row.id,
          name: row.name,
          days: row.days,
          timeDuration: row.timeDuration,
          price: vehiclePrice > 0 ? vehiclePrice : Number(row.minPrice) || 0,
        };
      }),
      vehicleName: selectedVehicle?.name || '',
      packageAmount: quotedTotal,
      pickup: pickup?.name || '',
      pickupDate: when.getTime(),
      duration: durationLabel,
      transfers: [...transfers, ...railwayTransfers]
        .filter((transfer) => transfer.place?.name)
        .map((transfer) => ({
          direction: transfer.direction,
          placeName: transfer.place?.name || '',
        })),
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Feather name="briefcase" size={16} color="#fff" />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>My Tour List</Text>
          <Text style={styles.subtitle}>Plan your perfect trip with your selected tours</Text>
        </View>
        <TouchableOpacity onPress={goAddTours} style={styles.closeBtn} accessibilityLabel="Close tour list">
          <Feather name="x" size={20} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      {rows.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No tours selected</Text>
          <Text style={styles.emptyText}>Add packages from the home screen, then open My trip to review them.</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={goAddTours}>
            <Feather name="plus" size={16} color="#fff" />
            <Text style={styles.primaryBtnText}>Add tours</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.countRow}>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{rows.length}</Text>
            </View>
            <Text style={styles.countLabel} numberOfLines={1}>
              {rows.length === 1 ? '1 tour selected' : `${rows.length} tours selected`}
            </Text>
            <TouchableOpacity style={styles.clearBtn} onPress={() => { void tripCart.clear(); }}>
              <Feather name="trash-2" size={12} color="#f43f5e" />
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addBtn} onPress={goAddTours}>
              <Feather name="plus" size={12} color="#2563eb" />
              <Text style={styles.addText}>Add</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.fold} onPress={() => setAirportOpen((open) => !open)}>
            <Feather name="navigation" size={16} color="#2563eb" />
            <Text style={styles.foldTitle}>Airport Transfers</Text>
            <Text style={styles.foldMeta} numberOfLines={1}>
              {airportExtra > 0 ? `${formatPrice(airportExtra)} extra` : transfers.length === 0 ? 'Pickup or drop from Vizag airport' : `${transfers.length} added`}
            </Text>
            <Feather name={airportOpen ? 'chevron-up' : 'chevron-down'} size={16} color="#94a3b8" />
          </TouchableOpacity>
          {airportOpen ? (
            <View style={styles.foldBody}>
              {transfers.map((transfer, index) => (
                <View key={transfer.id} style={styles.transferCard}>
                  <View style={styles.transferHead}>
                    <Text style={styles.transferTitle}>Transfer {index + 1}</Text>
                    <TouchableOpacity onPress={() => setTransfers((current) => current.filter((item) => item.id !== transfer.id))}>
                      <Feather name="trash-2" size={16} color="#fb7185" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.dirRow}>
                    {(['from-airport', 'to-airport'] as const).map((direction) => {
                      const on = transfer.direction === direction;
                      return (
                        <TouchableOpacity
                          key={direction}
                          style={[styles.dirChip, on && styles.dirChipOn]}
                          onPress={() => {
                            if (direction === transfer.direction) return;
                            setTransfers((current) => current.map((item) => item.id === transfer.id ? {
                              ...item,
                              direction,
                              place: null,
                              distanceKm: 0,
                              fare: 0,
                              when: edgeWhen(direction, when, tripDayCount),
                            } : item));
                          }}
                        >
                          <Text style={[styles.dirText, on && styles.dirTextOn]}>
                            {direction === 'from-airport' ? 'From Airport' : 'To Airport'}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <LocationInput
                    label={transfer.direction === 'from-airport' ? 'Drop location (Hotel / Address)' : 'Pickup location (Hotel / Address)'}
                    placeholder={transfer.direction === 'from-airport' ? 'Hotel or drop address' : 'Hotel or pickup address'}
                    value={transfer.place}
                    onLocationChange={(place) => setTransfers((current) => current.map((item) => item.id === transfer.id ? { ...item, place, distanceKm: 0, fare: 0 } : item))}
                    tripType="airport"
                    isPickupLocation={transfer.direction === 'to-airport'}
                  />
                  <View style={styles.whenRow}>
                    <View style={styles.whenCol}>
                      <Text style={styles.miniLabel}>Date</Text>
                      <TouchableOpacity style={styles.whenBtn} onPress={() => setWhenPickerId(transfer.id)}>
                        <Feather name="calendar" size={14} color="#94a3b8" />
                        <Text style={styles.whenValue} numberOfLines={1}>{format(transfer.when, 'd MMM, yyyy')}</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.whenCol}>
                      <Text style={styles.miniLabel}>Pickup time</Text>
                      <TouchableOpacity style={styles.whenBtn} onPress={() => setWhenPickerId(transfer.id)}>
                        <Feather name="clock" size={14} color="#94a3b8" />
                        <Text style={styles.whenValue} numberOfLines={1}>{format(transfer.when, 'h:mm a')}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  {whenPickerId === transfer.id ? (
                    <>
                      <DateTimePicker
                        value={transfer.when}
                        mode="datetime"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        minimumDate={new Date(Date.now() + 60 * 60 * 1000)}
                        onChange={(_, selected) => {
                          if (Platform.OS === 'android') setWhenPickerId(null);
                          if (!selected) return;
                          setTransfers((current) => current.map((item) => item.id === transfer.id ? { ...item, when: selected } : item));
                        }}
                      />
                      {Platform.OS === 'ios' ? (
                        <TouchableOpacity style={styles.pickerDone} onPress={() => setWhenPickerId(null)}>
                          <Text style={styles.pickerDoneText}>Done</Text>
                        </TouchableOpacity>
                      ) : null}
                    </>
                  ) : null}
                  <View style={styles.statRow}>
                    <View style={styles.statBox}>
                      <View style={styles.statLabelRow}>
                        <Feather name="map-pin" size={11} color="#94a3b8" />
                        <Text style={styles.statLabel}>Distance</Text>
                      </View>
                      <Text style={styles.statValue}>{transfer.distanceKm > 0 ? `${Math.round(transfer.distanceKm)} km` : '—'}</Text>
                    </View>
                    <View style={styles.statBox}>
                      <View style={styles.statLabelRow}>
                        <Text style={styles.statRupee}>₹</Text>
                        <Text style={styles.statLabel}>Estimated fare</Text>
                      </View>
                      <Text style={[styles.statValue, transfer.fare > 0 && styles.statFare]}>
                        {!selectedVehicle
                          ? 'Select a vehicle'
                          : transfer.fare > 0
                            ? `${formatPrice(transfer.fare)} extra`
                            : transfer.place
                              ? 'Calculating…'
                              : '—'}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
              <TouchableOpacity
                style={styles.dashedBtn}
                onPress={() => setTransfers((current) => [...current, newTransfer('from-airport', when, tripDayCount)])}
              >
                <Feather name="plus" size={14} color="#2563eb" />
                <Text style={styles.dashedText}>{transfers.length === 0 ? 'Add a transfer' : 'Add another transfer'}</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <TouchableOpacity style={styles.fold} onPress={() => setRailwayOpen((open) => !open)}>
            <Feather name="map-pin" size={16} color="#2563eb" />
            <Text style={styles.foldTitle}>Railway Station Transfers</Text>
            <Text style={styles.foldMeta} numberOfLines={1}>
              {railwayExtra > 0 ? `${formatPrice(railwayExtra)} extra` : railwayTransfers.length === 0 ? 'Pickup or drop from Vizag railway station' : `${railwayTransfers.length} added`}
            </Text>
            <Feather name={railwayOpen ? 'chevron-up' : 'chevron-down'} size={16} color="#94a3b8" />
          </TouchableOpacity>
          {railwayOpen ? (
            <View style={styles.foldBody}>
              {railwayTransfers.map((transfer, index) => (
                <View key={transfer.id} style={styles.transferCard}>
                  <View style={styles.transferHead}>
                    <Text style={styles.transferTitle}>Transfer {index + 1}</Text>
                    <TouchableOpacity onPress={() => setRailwayTransfers((current) => current.filter((item) => item.id !== transfer.id))}>
                      <Feather name="trash-2" size={16} color="#fb7185" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.dirRow}>
                    {(['from-station', 'to-station'] as const).map((direction) => {
                      const on = transfer.direction === direction;
                      return (
                        <TouchableOpacity
                          key={direction}
                          style={[styles.dirChip, on && styles.dirChipOn]}
                          onPress={() => {
                            if (direction === transfer.direction) return;
                            setRailwayTransfers((current) => current.map((item) => item.id === transfer.id ? {
                              ...item,
                              direction,
                              place: null,
                              distanceKm: 0,
                              fare: 0,
                              when: edgeWhen(direction, when, tripDayCount),
                            } : item));
                          }}
                        >
                          <Text style={[styles.dirText, on && styles.dirTextOn]}>
                            {direction === 'from-station' ? 'From Station' : 'To Station'}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <LocationInput
                    label={transfer.direction === 'from-station' ? 'Drop location (Hotel / Address)' : 'Pickup location (Hotel / Address)'}
                    placeholder={transfer.direction === 'from-station' ? 'Hotel or drop address' : 'Hotel or pickup address'}
                    value={transfer.place}
                    onLocationChange={(place) => setRailwayTransfers((current) => current.map((item) => item.id === transfer.id ? { ...item, place, distanceKm: 0, fare: 0 } : item))}
                    tripType="outstation"
                    isPickupLocation={transfer.direction === 'to-station'}
                  />
                  <View style={styles.whenRow}>
                    <View style={styles.whenCol}>
                      <Text style={styles.miniLabel}>Date</Text>
                      <TouchableOpacity style={styles.whenBtn} onPress={() => setWhenPickerId(transfer.id)}>
                        <Feather name="calendar" size={14} color="#94a3b8" />
                        <Text style={styles.whenValue} numberOfLines={1}>{format(transfer.when, 'd MMM, yyyy')}</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.whenCol}>
                      <Text style={styles.miniLabel}>Pickup time</Text>
                      <TouchableOpacity style={styles.whenBtn} onPress={() => setWhenPickerId(transfer.id)}>
                        <Feather name="clock" size={14} color="#94a3b8" />
                        <Text style={styles.whenValue} numberOfLines={1}>{format(transfer.when, 'h:mm a')}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  {whenPickerId === transfer.id ? (
                    <>
                      <DateTimePicker
                        value={transfer.when}
                        mode="datetime"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        minimumDate={new Date(Date.now() + 60 * 60 * 1000)}
                        onChange={(_, selected) => {
                          if (Platform.OS === 'android') setWhenPickerId(null);
                          if (!selected) return;
                          setRailwayTransfers((current) => current.map((item) => item.id === transfer.id ? { ...item, when: selected } : item));
                        }}
                      />
                      {Platform.OS === 'ios' ? (
                        <TouchableOpacity style={styles.pickerDone} onPress={() => setWhenPickerId(null)}>
                          <Text style={styles.pickerDoneText}>Done</Text>
                        </TouchableOpacity>
                      ) : null}
                    </>
                  ) : null}
                  <View style={styles.statRow}>
                    <View style={styles.statBox}>
                      <View style={styles.statLabelRow}>
                        <Feather name="map-pin" size={11} color="#94a3b8" />
                        <Text style={styles.statLabel}>Distance</Text>
                      </View>
                      <Text style={styles.statValue}>{transfer.distanceKm > 0 ? `${Math.round(transfer.distanceKm)} km` : '—'}</Text>
                    </View>
                    <View style={styles.statBox}>
                      <View style={styles.statLabelRow}>
                        <Text style={styles.statRupee}>₹</Text>
                        <Text style={styles.statLabel}>Estimated fare</Text>
                      </View>
                      <Text style={[styles.statValue, transfer.fare > 0 && styles.statFare]}>
                        {!selectedVehicle
                          ? 'Select a vehicle'
                          : transfer.fare > 0
                            ? `${formatPrice(transfer.fare)} extra`
                            : transfer.place
                              ? 'Calculating…'
                              : '—'}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
              <TouchableOpacity
                style={styles.dashedBtn}
                onPress={() => setRailwayTransfers((current) => [...current, newTransfer('from-station', when, tripDayCount)])}
              >
                <Feather name="plus" size={14} color="#2563eb" />
                <Text style={styles.dashedText}>{railwayTransfers.length === 0 ? 'Add a transfer' : 'Add another transfer'}</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <TouchableOpacity style={styles.fold} onPress={() => setPlanOpen((open) => !open)}>
            <Feather name="calendar" size={16} color="#2563eb" />
            <Text style={styles.foldTitle}>Trip plan</Text>
            <Text style={styles.foldMeta} numberOfLines={1}>
              {`${format(when, 'd MMM, h:mm a')} · ${durationLabel}`}
            </Text>
            <Feather name={planOpen ? 'chevron-up' : 'chevron-down'} size={16} color="#94a3b8" />
          </TouchableOpacity>
          {planOpen ? (
            <View style={styles.foldBody}>
              <LocationInput
                label="Pickup location"
                placeholder="Search pickup location"
                value={pickup}
                onLocationChange={setPickup}
                isPickupLocation
                tripType="tour"
                helperText="Pickup must be within 20 km of Vizag Taxi Hub."
              />
              <DateTimePickerComponent label="Travel date & time" date={when} onDateChange={setWhen} />
              <Text style={styles.fieldLabel}>Tour duration</Text>
              <View style={styles.chips}>
                {durationChoices.map((choice) => {
                  const on = choice === durationLabel;
                  return (
                    <TouchableOpacity key={choice} style={[styles.chip, on && styles.chipOn]} onPress={() => setDuration(choice)}>
                      <Text style={[styles.chipText, on && styles.chipTextOn]}>{choice}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {itinerary.length > 0 ? (
                <View style={styles.itinerary}>
                  <TouchableOpacity style={styles.itineraryHead} onPress={() => setItineraryOpen((open) => !open)}>
                    <Feather name="book-open" size={14} color="#64748b" />
                    <Text style={styles.itineraryTitle}>{durationLabel}</Text>
                    <Feather name={itineraryOpen ? 'chevron-up' : 'chevron-down'} size={16} color="#94a3b8" />
                  </TouchableOpacity>
                  {itineraryOpen ? itinerary.map((line) => (
                    <View key={`${line.day}-${line.title}`} style={styles.dayRow}>
                      <View style={styles.dayDot} />
                      <View style={styles.dayCopy}>
                        <Text style={styles.dayTitle}>Day {line.day}</Text>
                        <Text style={styles.dayName}>{line.title}</Text>
                        <Text style={styles.dayNote}>{line.note}</Text>
                      </View>
                    </View>
                  )) : null}
                </View>
              ) : null}
              <View style={styles.planActions}>
                <TouchableOpacity
                  style={styles.ghostBtn}
                  onPress={() => {
                    setPickup(null);
                    setWhen(defaultWhen());
                    setDuration('');
                  }}
                >
                  <Text style={styles.ghostBtnText}>Clear</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.doneBtn} onPress={() => setPlanOpen(false)}>
                  <Text style={styles.doneBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {rows.map((row, index) => {
            const vehiclePrice = selectedVehicle ? priceForVehicle(row.pricing, selectedVehicle.id) : 0;
            const displayPrice = vehiclePrice > 0 ? vehiclePrice : Number(row.minPrice) || 0;
            const badge = formatDuration(row.days, row.timeDuration);
            return (
              <View key={row.id} style={styles.card}>
                {rows.length > 1 ? (
                  <View style={styles.movers}>
                    <TouchableOpacity disabled={index === 0} onPress={() => { void tripCart.move(index, index - 1); }}>
                      <Feather name="chevron-up" size={18} color={index === 0 ? '#e2e8f0' : '#94a3b8'} />
                    </TouchableOpacity>
                    <TouchableOpacity disabled={index === rows.length - 1} onPress={() => { void tripCart.move(index, index + 1); }}>
                      <Feather name="chevron-down" size={18} color={index === rows.length - 1 ? '#e2e8f0' : '#94a3b8'} />
                    </TouchableOpacity>
                  </View>
                ) : null}
                <View style={styles.thumb}>
                  {row.image ? <Image source={{ uri: row.image }} style={styles.thumbImage} /> : null}
                  {badge ? <Text style={styles.thumbBadge}>{badge}</Text> : null}
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardName} numberOfLines={2}>{row.name}</Text>
                  <View style={styles.placeRow}>
                    <Feather name="map-pin" size={12} color="#3b82f6" />
                    <Text style={styles.place} numberOfLines={1}>{tourPlace(row.name)}</Text>
                  </View>
                  <View style={styles.cardFoot}>
                    {displayPrice > 0 ? (
                      <View>
                        <Text style={styles.cardPrice}>{formatPrice(displayPrice)}</Text>
                        <Text style={styles.cardPriceNote}>{vehiclePrice > 0 ? selectedVehicle?.name : 'onwards'}</Text>
                      </View>
                    ) : <View />}
                    <TouchableOpacity style={styles.detailsBtn} onPress={() => openDetails(row)}>
                      <Text style={styles.detailsText}>View Details</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <TouchableOpacity style={styles.removeBtn} onPress={() => { void tripCart.remove(row.id); }} accessibilityLabel={`Remove ${row.name}`}>
                  <Feather name="trash-2" size={14} color="#fb7185" />
                </TouchableOpacity>
              </View>
            );
          })}

          <View style={styles.estimate}>
            <View style={styles.estimateCopy}>
              <Text style={styles.estimateLabel}>Estimated Package Value</Text>
              <Text style={styles.estimateValue}>
                {quotedTotal > 0 ? `${formatPrice(quotedTotal)} onwards` : 'Quote on request'}
              </Text>
              {airportExtra > 0 ? (
                <Text style={styles.estimateExtra}>Includes {formatPrice(airportExtra)} additional airport transfer</Text>
              ) : null}
              {railwayExtra > 0 ? (
                <Text style={styles.estimateExtra}>Includes {formatPrice(railwayExtra)} railway station transfer</Text>
              ) : null}
            </View>
            <Text style={styles.estimateNote}>Customize your trip as per your needs!</Text>
          </View>

          {vehicleOptions.length > 0 ? (
            <View style={styles.vehicles}>
              <Text style={styles.vehiclesLabel}>Vehicle Options <Text style={styles.vehiclesHint}>(Select to see updated price)</Text></Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.vehicleRow}>
                {vehicleOptions.map((vehicle) => {
                  const selected = vehicle.id === selectedVehicle?.id;
                  return (
                    <TouchableOpacity key={vehicle.id} style={[styles.vehicleCard, selected && styles.vehicleCardOn]} onPress={() => setVehicleId(vehicle.id)}>
                      {vehicle.image ? (
                        <Image source={{ uri: vehicle.image }} style={styles.vehicleImage} resizeMode="contain" />
                      ) : (
                        <Feather name="truck" size={28} color="#cbd5e1" />
                      )}
                      <Text style={styles.vehicleName} numberOfLines={2}>{vehicle.name}</Text>
                      <Text style={styles.vehiclePrice}>{formatPrice(vehicle.packagePrice)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}

          <View style={styles.why}>
            <Text style={styles.whyTitle}>Why Book with Vizag Taxi Hub?</Text>
            <View style={styles.whyGrid}>
              <Text style={styles.whyItem}>Trusted & Safe Travel</Text>
              <Text style={styles.whyItem}>Experienced Local Guides</Text>
              <Text style={styles.whyItem}>Well-Maintained Vehicles</Text>
              <Text style={styles.whyItem}>24/7 Support</Text>
            </View>
          </View>

          {isSuperAdmin ? (
            <>
              <TouchableOpacity style={styles.pdfBtn} onPress={createPdf}>
                <Feather name="file-text" size={16} color="#1d4ed8" />
                <Text style={styles.pdfBtnText}>Create / share quotation PDF</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.shareBtn} onPress={() => { void shareLink(); }}>
                <Feather name="share-2" size={16} color="#047857" />
                <Text style={styles.shareBtnText}>Share Build Your Trip link</Text>
              </TouchableOpacity>
            </>
          ) : null}

          <TouchableOpacity style={styles.primaryBtn} onPress={proceed}>
            <Text style={styles.primaryBtnText}>Proceed to next step</Text>
            <Feather name="arrow-right" size={16} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.hint}>Enter pickup, date, time and duration to build the itinerary</Text>
          <TouchableOpacity style={styles.moreBtn} onPress={goAddTours}>
            <Feather name="plus" size={14} color="#334155" />
            <Text style={styles.moreText}>Add More Tours</Text>
          </TouchableOpacity>
          <Text style={styles.footerNote}>Let&apos;s make your Andhra journey unforgettable!</Text>
        </ScrollView>
      )}

      <Modal visible={phoneOpen} transparent animationType="fade" onRequestClose={() => setPhoneOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPhoneOpen(false)}>
          <Pressable style={styles.modalCard}>
            <Text style={styles.modalTitle}>WhatsApp number</Text>
            <Text style={styles.modalText}>We use this number to share the trip details.</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="10-digit mobile number"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              maxLength={10}
            />
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => {
                if (phone.replace(/\D/g, '').length < 10) {
                  Alert.alert('Mobile number', 'Enter a 10-digit mobile number.');
                  return;
                }
                setGuestReady(true);
                setPhoneOpen(false);
                continueBooking();
              }}
            >
              <Text style={styles.primaryBtnText}>Continue</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#f0f9ff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  headerIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1 },
  title: { fontSize: 17, fontFamily: fonts.bold, color: '#0f172a' },
  subtitle: { marginTop: 2, fontSize: 11, color: '#64748b', fontFamily: fonts.regular },
  closeBtn: { padding: 6 },
  body: { padding: 16, paddingBottom: 32 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyTitle: { fontSize: 18, fontFamily: fonts.bold, color: '#0f172a' },
  emptyText: { marginTop: 8, marginBottom: 16, textAlign: 'center', color: '#64748b', lineHeight: 20 },
  countRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  countBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' },
  countBadgeText: { color: '#fff', fontFamily: fonts.bold, fontSize: 12 },
  countLabel: { flex: 1, fontFamily: fonts.semiBold, color: '#0f172a', fontSize: 13 },
  clearBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 4 },
  clearText: { color: '#f43f5e', fontSize: 11, fontFamily: fonts.medium },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#fff' },
  addText: { color: '#2563eb', fontSize: 11, fontFamily: fonts.semiBold },
  fold: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 12, minHeight: 44, marginBottom: 8 },
  foldTitle: { fontFamily: fonts.semiBold, color: '#0f172a', fontSize: 13 },
  foldMeta: { flex: 1, color: '#64748b', fontSize: 12 },
  foldBody: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, marginTop: -4, marginBottom: 8 },
  dashedBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderStyle: 'dashed', borderColor: '#bfdbfe', backgroundColor: '#eff6ff', borderRadius: 12, minHeight: 40 },
  dashedText: { color: '#2563eb', fontFamily: fonts.semiBold, fontSize: 12 },
  transferCard: { marginBottom: 10 },
  transferHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  transferTitle: { fontFamily: fonts.semiBold, color: '#1e293b' },
  dirRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  dirChip: { flex: 1, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', paddingVertical: 8, alignItems: 'center', backgroundColor: '#fff' },
  dirChipOn: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  dirText: { color: '#334155', fontFamily: fonts.semiBold, fontSize: 12 },
  dirTextOn: { color: '#fff' },
  whenRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  whenCol: { flex: 1 },
  miniLabel: { marginBottom: 6, fontSize: 11, fontFamily: fonts.semiBold, color: '#64748b' },
  whenBtn: { minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff', paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  whenValue: { flex: 1, fontSize: 13, fontFamily: fonts.medium, color: '#0f172a' },
  pickerDone: { alignItems: 'flex-end', paddingVertical: 6 },
  pickerDoneText: { color: '#2563eb', fontFamily: fonts.semiBold },
  statRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  statBox: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 10 },
  statLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statLabel: { fontSize: 10, fontFamily: fonts.semiBold, color: '#94a3b8', textTransform: 'uppercase' },
  statRupee: { fontSize: 11, fontFamily: fonts.semiBold, color: '#94a3b8' },
  statValue: { marginTop: 4, fontSize: 13, fontFamily: fonts.semiBold, color: '#1e293b' },
  statFare: { color: '#2563eb' },
  fieldLabel: { marginTop: 8, marginBottom: 6, fontFamily: fonts.semiBold, color: '#0f172a', fontSize: 13 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 999, backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 8 },
  chipOn: { backgroundColor: '#2563eb' },
  chipText: { color: '#334155', fontFamily: fonts.semiBold, fontSize: 12 },
  chipTextOn: { color: '#fff' },
  itinerary: { marginTop: 12, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 10 },
  itineraryHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  itineraryTitle: { flex: 1, fontFamily: fonts.semiBold, color: '#0f172a' },
  dayRow: { flexDirection: 'row', gap: 10, marginTop: 10, paddingLeft: 4 },
  dayDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#2563eb', marginTop: 4 },
  dayCopy: { flex: 1 },
  dayTitle: { fontFamily: fonts.semiBold, color: '#0f172a', fontSize: 13 },
  dayName: { color: '#334155', fontSize: 12, marginTop: 2 },
  dayNote: { color: '#64748b', fontSize: 11, marginTop: 2 },
  planActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  ghostBtn: { flex: 1, height: 44, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  ghostBtnText: { fontFamily: fonts.semiBold, color: '#1e293b' },
  doneBtn: { flex: 1, height: 44, borderRadius: 12, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' },
  doneBtnText: { color: '#fff', fontFamily: fonts.semiBold },
  card: { flexDirection: 'row', gap: 10, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', padding: 8, marginBottom: 10 },
  movers: { justifyContent: 'center', gap: 4 },
  thumb: { width: 88, height: 88, borderRadius: 12, backgroundColor: '#e2e8f0', overflow: 'hidden' },
  thumbImage: { width: '100%', height: '100%' },
  thumbBadge: { position: 'absolute', left: 6, top: 6, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2, fontSize: 9, fontFamily: fonts.bold, color: '#1e293b', overflow: 'hidden' },
  cardBody: { flex: 1, paddingRight: 18 },
  cardName: { fontFamily: fonts.bold, color: '#0f172a', fontSize: 13 },
  placeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  place: { flex: 1, color: '#64748b', fontSize: 10 },
  cardFoot: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 8 },
  cardPrice: { color: '#2563eb', fontFamily: fonts.bold, fontSize: 13 },
  cardPriceNote: { color: '#94a3b8', fontSize: 10 },
  detailsBtn: { borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  detailsText: { color: '#2563eb', fontSize: 10, fontFamily: fonts.semiBold },
  removeBtn: { position: 'absolute', right: 6, top: 6, padding: 4 },
  estimate: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, backgroundColor: '#eff6ff', borderRadius: 16, padding: 12, marginTop: 4 },
  estimateCopy: { flex: 1 },
  estimateLabel: { color: '#475569', fontFamily: fonts.semiBold, fontSize: 11 },
  estimateValue: { marginTop: 4, color: '#1d4ed8', fontFamily: fonts.bold, fontSize: 20 },
  estimateExtra: { marginTop: 2, color: '#64748b', fontSize: 10, fontFamily: fonts.medium },
  estimateNote: { maxWidth: '38%', textAlign: 'right', color: '#059669', fontStyle: 'italic', fontSize: 10 },
  vehicles: { marginTop: 12, backgroundColor: '#ecfdf5', borderRadius: 16, borderWidth: 1, borderColor: '#d1fae5', padding: 12 },
  vehiclesLabel: { fontFamily: fonts.semiBold, color: '#334155', fontSize: 11, marginBottom: 8 },
  vehiclesHint: { fontFamily: fonts.regular, color: '#64748b' },
  vehicleRow: { gap: 8 },
  vehicleCard: { width: 76, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9', padding: 6, alignItems: 'center' },
  vehicleCardOn: { borderColor: '#3b82f6', borderWidth: 2 },
  vehicleImage: { width: 64, height: 32 },
  vehicleName: { marginTop: 4, minHeight: 28, textAlign: 'center', fontSize: 9, color: '#475569' },
  vehiclePrice: { marginTop: 2, color: '#1d4ed8', fontFamily: fonts.bold, fontSize: 11 },
  why: { marginTop: 12, backgroundColor: '#fffbeb', borderRadius: 16, borderWidth: 1, borderColor: '#fef3c7', padding: 12 },
  whyTitle: { fontFamily: fonts.semiBold, color: '#1e293b', marginBottom: 8, fontSize: 12 },
  whyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  whyItem: { width: '47%', color: '#475569', fontSize: 10 },
  pdfBtn: { marginTop: 12, minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: '#bfdbfe', backgroundColor: '#eff6ff', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  pdfBtnText: { color: '#1d4ed8', fontFamily: fonts.semiBold, fontSize: 13 },
  shareBtn: { marginTop: 8, minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: '#a7f3d0', backgroundColor: '#ecfdf5', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  shareBtnText: { color: '#047857', fontFamily: fonts.semiBold, fontSize: 13 },
  primaryBtn: { marginTop: 12, minHeight: 44, borderRadius: 12, backgroundColor: '#2563eb', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  primaryBtnText: { color: '#fff', fontFamily: fonts.semiBold, fontSize: 13 },
  hint: { marginTop: 6, textAlign: 'center', color: '#94a3b8', fontSize: 10 },
  moreBtn: { marginTop: 8, minHeight: 40, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#fff' },
  moreText: { color: '#334155', fontFamily: fonts.semiBold, fontSize: 12 },
  footerNote: { marginTop: 12, textAlign: 'center', color: '#94a3b8', fontStyle: 'italic', fontSize: 10 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.35)', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  modalTitle: { fontFamily: fonts.bold, fontSize: 18, color: '#0f172a' },
  modalText: { marginTop: 6, marginBottom: 12, color: '#64748b' },
  modalInput: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 4 },
});
