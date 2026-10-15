import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  ActivityIndicator,
  Platform,
  Alert,
  Dimensions,
  Modal,
  Pressable,
  Animated,
  Linking,
  AppState,
  type AppStateStatus,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/core';
import { useFocusEffect } from '@react-navigation/native';
import { LocationInput } from '../components/LocationInput';
import { DateTimePickerComponent } from '../components/DateTimePicker';
import { colors, fonts } from '../theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_MAX_WIDTH = Math.min(420, SCREEN_WIDTH - 32);
import { calculateDistanceMatrix } from '../services/distanceService';
import { isLocationInVizag, getDistanceBetween } from '../lib/locationUtils';
import { tourAPI } from '../services/tourAPI';
import { useAuth } from '../providers/AuthProvider';
import { useTripCart } from '../lib/tripCart';
import { useMenu } from '../providers/MenuProvider';
import type { RootStackParamList } from '../navigation/types';
import type { Location } from '../types';
import type { TripType, TripMode } from '../types';

const SUPPORT_PHONE = '+919966363662';
const SUPPORT_WHATSAPP = '919966363662';
const SEARCH_HINTS = [
  'Where would you like to travel today?',
  'Book a cab to Araku Valley…',
  'Airport pickup in Visakhapatnam…',
  'Outstation trip to Hyderabad…',
  'Local sightseeing in Vizag…',
  'Tour packages to Lambasingi…',
];

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

const VIZAG_CITY_AIRPORT: Location = {
  id: 'vizag_city_airport',
  name: 'Vizag International Airport',
  address: 'Vizag International Airport (VTZ), NAD, Visakhapatnam, Andhra Pradesh',
  city: 'Visakhapatnam',
  state: 'Andhra Pradesh',
  lat: 17.72111,
  lng: 83.22444,
  type: 'airport',
  popularityScore: 98,
  isInVizag: true,
};

function getMinimumDate(): Date {
  const n = new Date();
  n.setTime(n.getTime() + 60 * 60 * 1000);
  return n;
}

/** Earliest allowed pickup = device time + 1h (re-check at tap — UI can show :28 while min is already :29). */
function resolvePickupForSearch(current: Date): Date {
  const min = getMinimumDate();
  return current.getTime() < min.getTime() ? new Date(min.getTime()) : current;
}

/** Trip start must stay ≥ now+1h; state was only set once so it goes stale as the clock moves. */
function clampPickupToMinimum(setPickupDate: React.Dispatch<React.SetStateAction<Date>>): void {
  const min = getMinimumDate();
  setPickupDate((prev) => (prev < min ? min : prev));
}

type HomeNavProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;
type HomeRouteProp = RouteProp<RootStackParamList, 'Home'>;

export function HomeScreen() {
  const navigation = useNavigation<HomeNavProp>();
  const route = useRoute<HomeRouteProp>();
  const { isAuthenticated } = useAuth();
  const tripCart = useTripCart();
  const { openMenu } = useMenu();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchHint, setSearchHint] = useState(0);
  const [stops, setStops] = useState<Array<Location | null>>([]);
  const initialTrip = route.params?.initialTripType ?? 'outstation';
  const showAuthSheetParam = route.params?.showAuthSheet ?? false;
  const [authSheetVisible, setAuthSheetVisible] = useState(false);
  const [supportSheetVisible, setSupportSheetVisible] = useState(false);
  const homeScrollRef = useRef<ScrollView>(null);
  const destinationsY = useRef(0);
  const slideAnim = useRef(new Animated.Value(300)).current;
  const supportSlideAnim = useRef(new Animated.Value(-180)).current;
  const [tripType, setTripType] = useState<TripType>(initialTrip);
  const [tripMode, setTripMode] = useState<TripMode>('one-way');
  const [hourlyPackage, setHourlyPackage] = useState<string>('8hrs-80km');
  const [airportDirection, setAirportDirection] = useState<'from-airport' | 'to-airport'>('from-airport');
  const [pickupLocation, setPickupLocation] = useState<Location | null>(null);
  const [dropLocation, setDropLocation] = useState<Location | null>(null);
  const [pickupDate, setPickupDate] = useState<Date>(getMinimumDate());
  const [returnDate, setReturnDate] = useState<Date | null>(null);
  const pickupDateRef = useRef(pickupDate);
  const returnDateRef = useRef(returnDate);
  useEffect(() => {
    pickupDateRef.current = pickupDate;
  }, [pickupDate]);
  useEffect(() => {
    returnDateRef.current = returnDate;
  }, [returnDate]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [tours, setTours] = useState<any[]>([]);
  const [toursLoading, setToursLoading] = useState(true);

  React.useEffect(() => {
    tourAPI.getAvailableTours().then(setTours).catch(() => setTours([])).finally(() => setToursLoading(false));
  }, []);

  useEffect(() => {
    const id = setInterval(() => setSearchHint((index) => (index + 1) % SEARCH_HINTS.length), 3500);
    return () => clearInterval(id);
  }, []);

  // Keep trip start ≥ device time + 1h: clamp when returning to Home, on resume, and every minute while Home is visible.
  useFocusEffect(
    useCallback(() => {
      clampPickupToMinimum(setPickupDate);
      const tick = setInterval(() => {
        clampPickupToMinimum(setPickupDate);
      }, 60_000);
      return () => clearInterval(tick);
    }, [])
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') {
        clampPickupToMinimum(setPickupDate);
      }
    });
    return () => sub.remove();
  }, []);

  // Show auth bottom sheet when redirected after logout
  useEffect(() => {
    if (showAuthSheetParam) {
      setAuthSheetVisible(true);
      navigation.setParams({ showAuthSheet: false });
    }
  }, [showAuthSheetParam, navigation]);

  useEffect(() => {
    if (authSheetVisible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      slideAnim.setValue(300);
    }
  }, [authSheetVisible, slideAnim]);

  useEffect(() => {
    if (supportSheetVisible) {
      Animated.spring(supportSlideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      supportSlideAnim.setValue(-180);
    }
  }, [supportSheetVisible, supportSlideAnim]);

  const closeAuthSheet = () => {
    Animated.timing(slideAnim, {
      toValue: 300,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setAuthSheetVisible(false);
    });
  };

  const openSupportSheet = () => setSupportSheetVisible(true);
  const closeSupportSheet = () => {
    Animated.timing(supportSlideAnim, {
      toValue: -180,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setSupportSheetVisible(false);
    });
  };

  // Sync trip type when navigating from Services tab (Outstation, Airport, Local, Tour)
  React.useEffect(() => {
    const fromParams = route.params?.initialTripType;
    if (fromParams) {
      setTripType(fromParams);
    }
  }, [route.params?.initialTripType]);

  // Return date: match web app logic exactly - clear when locations missing; set from travel time API when both filled
  React.useEffect(() => {
    if (tripType !== 'outstation' || tripMode !== 'round-trip') return;
    // When locations missing, clear return date (same as web)
    if (!pickupLocation || !dropLocation) {
      setReturnDate(null);
      return;
    }
    // Both locations filled: call travel time API and set return date (same as web Hero)
    const fallbackMinReturn = new Date(pickupDate.getTime() + 60 * 60 * 1000);
    let cancelled = false;
    (async () => {
      try {
        const result = await calculateDistanceMatrix(pickupLocation, dropLocation);
        if (cancelled) return;
        if (result.status === 'OK') {
          const minMinutes = result.duration + 30;
          const minReturn = new Date(pickupDate.getTime() + minMinutes * 60 * 1000);
          setReturnDate((prev) => {
            if (!prev || prev < pickupDate) return minReturn;
            return prev;
          });
        } else {
          setReturnDate((prev) => {
            if (!prev || prev < pickupDate) return fallbackMinReturn;
            return prev;
          });
        }
      } catch {
        if (!cancelled) {
          setReturnDate((prev) => {
            if (!prev || prev < pickupDate) return fallbackMinReturn;
            return prev;
          });
        }
      }
    })();
    return () => { cancelled = true; };
  }, [tripType, tripMode, pickupLocation, dropLocation, pickupDate]);

  // Reactive tab switch: runs after dropLocation updates (avoids stale closure in onLocationChange)
  React.useEffect(() => {
    if (!dropLocation || (tripType !== 'outstation' && tripType !== 'airport')) return;
    const coordOk = (n: unknown) => typeof n === 'number' && !isNaN(n) && n !== 0;
    const hasCoords =
      pickupLocation &&
      coordOk(pickupLocation.lat) &&
      coordOk(pickupLocation.lng) &&
      coordOk(dropLocation.lat) &&
      coordOk(dropLocation.lng);
    const distanceKm = hasCoords
      ? getDistanceBetween(
          pickupLocation!.lat as number,
          pickupLocation!.lng as number,
          dropLocation.lat as number,
          dropLocation.lng as number
        )
      : 0;
    const dropInVizag = isLocationInVizag(dropLocation) || dropLocation.isInVizag === true;

    if (tripType === 'outstation' && ((hasCoords && distanceKm <= 35) || dropInVizag)) {
      setTripType('airport');
    } else if (tripType === 'airport' && ((hasCoords && distanceKm > 35) || !dropInVizag)) {
      setTripType('outstation');
    }
  }, [dropLocation, pickupLocation, tripType]);

  const isAirportLocation = (loc: Location | null) =>
    loc &&
    (loc.id === VIZAG_AIRPORT.id ||
      loc.id === VIZAG_CITY_AIRPORT.id ||
      loc.name?.toLowerCase().includes('airport'));

  const handleAirportDirection = (dir: 'from-airport' | 'to-airport') => {
    setAirportDirection(dir);
    if (dir === 'from-airport') {
      setPickupLocation(VIZAG_AIRPORT);
      setDropLocation(null);
    } else {
      setPickupLocation(null);
      setDropLocation(VIZAG_AIRPORT);
    }
  };

  const handleTabChange = (tab: TripType) => {
    setTripType(tab);
    if (tab === 'local' || tab === 'tour' || tripType === 'local') {
      setDropLocation(null);
      if (tab === 'local') {
        setHourlyPackage('8hrs-80km');
      }
    } else if (tab === 'outstation' && tripType === 'airport') {
      setDropLocation(null);
      if (isAirportLocation(pickupLocation)) {
        setPickupLocation(null);
      }
    }
    if (tab !== 'outstation') setStops([]);
  };

  const isFormValid =
    pickupLocation &&
    pickupLocation.name &&
    (tripType === 'tour' || dropLocation) &&
    (!(tripType === 'outstation' && tripMode === 'round-trip') || (returnDate != null)) &&
    !stops.some((stop) => !stop?.name);

  const performSearch = useCallback(
    async (effectiveTripType: TripType, pickupHint?: Date) => {
      const drop =
        effectiveTripType === 'tour' ? pickupLocation : dropLocation;
      const pickupResolved = resolvePickupForSearch(pickupHint ?? pickupDateRef.current);
      if (pickupResolved.getTime() !== pickupDateRef.current.getTime()) {
        setPickupDate(pickupResolved);
        pickupDateRef.current = pickupResolved;
      }
      const pickupTs = pickupResolved.getTime();

      let returnTs: number | undefined;
      if (effectiveTripType === 'outstation' && tripMode === 'round-trip') {
        const r = returnDateRef.current;
        if (r && r.getTime() >= pickupTs) {
          returnTs = r.getTime();
        } else if (r) {
          const bumped = new Date(pickupTs + 60 * 60 * 1000);
          setReturnDate(bumped);
          returnDateRef.current = bumped;
          returnTs = bumped.getTime();
        }
      }

      setIsCalculating(true);
      try {
        let distance = 0;
        let duration = 0;
        if (effectiveTripType === 'local') {
          distance = hourlyPackage === '8hrs-80km' ? 80 : 100;
          duration = 240;
        } else if (effectiveTripType !== 'tour' && drop) {
          const via = effectiveTripType === 'outstation' ? stops.filter((stop): stop is Location => Boolean(stop?.name)) : [];
          const points = [pickupLocation!, ...via, drop];
          for (let index = 0; index < points.length - 1; index += 1) {
            const result = await calculateDistanceMatrix(points[index], points[index + 1]);
            if (result.status === 'OK') {
              distance += result.distance;
              duration += result.duration;
            }
          }
        }
        navigation.navigate('CabResults', {
          pickupLocation: pickupLocation!,
          dropLocation: drop ?? null,
          pickupDate: pickupTs,
          returnDate: returnTs,
          tripType: effectiveTripType,
          tripMode,
          distance,
          duration,
          hourlyPackage: effectiveTripType === 'local' ? hourlyPackage : undefined,
        });
      } catch {
        navigation.navigate('CabResults', {
          pickupLocation: pickupLocation!,
          dropLocation: drop ?? null,
          pickupDate: pickupTs,
          returnDate: returnTs,
          tripType: effectiveTripType,
          tripMode,
          distance: effectiveTripType === 'local' ? (hourlyPackage === '8hrs-80km' ? 80 : 100) : 0,
          duration: effectiveTripType === 'local' ? 240 : 0,
          hourlyPackage: effectiveTripType === 'local' ? hourlyPackage : undefined,
        });
      } finally {
        setIsCalculating(false);
      }
    },
    [pickupLocation, dropLocation, stops, tripMode, hourlyPackage, navigation]
  );

  const handleSearchCabs = useCallback(async () => {
    if (!isFormValid || !pickupLocation) return;
    const effectivePickup = resolvePickupForSearch(pickupDateRef.current);
    if (effectivePickup.getTime() !== pickupDateRef.current.getTime()) {
      setPickupDate(effectivePickup);
      pickupDateRef.current = effectivePickup;
    }
    const drop = tripType === 'tour' ? pickupLocation : dropLocation;
    if (tripType !== 'tour' && !drop) return;

    let effectiveTripType: TripType = tripType;

    // Trip type auto-switch - matches web app Hero logic exactly
    // Web uses (lat && lng) so 0 is treated as missing - we do the same
    const validCoord = (n: unknown) =>
      typeof n === 'number' && !isNaN(n) && n !== 0;
    const hasCoords =
      drop &&
      validCoord(pickupLocation.lat) &&
      validCoord(pickupLocation.lng) &&
      validCoord(drop.lat) &&
      validCoord(drop.lng);
    const distanceKm = hasCoords
      ? getDistanceBetween(
          pickupLocation.lat as number,
          pickupLocation.lng as number,
          drop.lat as number,
          drop.lng as number
        )
      : 0;

    if (tripType === 'airport' && drop) {
      const dropInVizag = hasCoords ? isLocationInVizag(drop) : (drop.isInVizag === true);
      const shouldSwitchOutstation = hasCoords ? distanceKm > 35 : !dropInVizag;
      if (shouldSwitchOutstation) {
        effectiveTripType = 'outstation';
        Alert.alert(
          'Switching to Outstation',
          hasCoords
            ? `Distance is ${distanceKm.toFixed(1)}km (beyond 35km). We'll use Outstation fares for this trip.`
            : "Selected drop is outside Visakhapatnam. We'll use Outstation fares for this trip.",
          [
            {
              text: 'OK',
              onPress: () => {
                const ep = resolvePickupForSearch(pickupDateRef.current);
                setPickupDate(ep);
                pickupDateRef.current = ep;
                void performSearch(effectiveTripType, ep);
              },
            },
          ]
        );
        return;
      }
    } else if (tripType === 'outstation' && pickupLocation && drop) {
      const shouldSwitchAirport = hasCoords
        ? distanceKm <= 35
        : isLocationInVizag(drop) || drop.isInVizag === true;
      if (shouldSwitchAirport) {
        effectiveTripType = 'airport';
        Alert.alert(
          'Switching to Airport',
          hasCoords
            ? `Distance is ${distanceKm.toFixed(1)}km (within 35km). We'll use Airport Transfer fares for this trip.`
            : "Drop location is within Visakhapatnam. We'll use Airport Transfer fares for this trip.",
          [
            {
              text: 'OK',
              onPress: () => {
                const ep = resolvePickupForSearch(pickupDateRef.current);
                setPickupDate(ep);
                pickupDateRef.current = ep;
                void performSearch(effectiveTripType, ep);
              },
            },
          ]
        );
        return;
      }
    }

    await performSearch(effectiveTripType, effectivePickup);
  }, [isFormValid, pickupLocation, dropLocation, tripType, tripMode, performSearch]);

  const tabs: { id: TripType; label: string; icon: string }[] = [
    { id: 'outstation', label: 'Outstation\nTrips', icon: 'car-side' },
    { id: 'local', label: 'Hourly\nRentals', icon: 'clock-outline' },
    { id: 'airport', label: 'Airport\nTransfer', icon: 'airplane' },
    { id: 'tour', label: 'Tour\nPackages', icon: 'map-marker-path' },
  ];

  const applySearch = () => {
    const text = searchQuery.trim().toLowerCase();
    if (!text) return;
    if (text.includes('airport')) handleTabChange('airport');
    else if (text.includes('hour') || text.includes('local') || text.includes('sight')) handleTabChange('local');
    else if (text.includes('tour') || text.includes('araku') || text.includes('lambasingi') || text.includes('package')) handleTabChange('tour');
    else handleTabChange('outstation');
  };

  const pickupHelper = 'Please select a location within 35km of Visakhapatnam';
  const dropHelper =
    tripType === 'airport' ? 'Please select a location within 35km of Visakhapatnam' : '';

  const goToLogin = () => {
    setAuthSheetVisible(false);
    const tabNav = navigation.getParent();
    if (tabNav) {
      tabNav.navigate('Profile', { screen: 'Login' });
    } else {
      navigation.navigate('Profile', { screen: 'Login' });
    }
  };
  const goToSignup = () => {
    setAuthSheetVisible(false);
    const tabNav = navigation.getParent();
    if (tabNav) {
      tabNav.navigate('Profile', { screen: 'Signup' });
    } else {
      navigation.navigate('Profile', { screen: 'Signup' });
    }
  };

  return (
    <>
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.searchBar}>
        <Feather name="search" size={16} color="#94a3b8" />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={applySearch}
          placeholder={SEARCH_HINTS[searchHint]}
          placeholderTextColor="#94a3b8"
          style={styles.searchInput}
          returnKeyType="search"
        />
      </View>
      <View style={styles.header}>
        <Image
          source={{ uri: 'https://www.vizagtaxihub.com/uploads/vizagtaxihub-logo.png' }}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerCall} onPress={() => { void Linking.openURL(`https://wa.me/${SUPPORT_WHATSAPP}`); }} accessibilityLabel="WhatsApp">
            <MaterialCommunityIcons name="whatsapp" size={20} color="#059669" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerCall} onPress={() => { void Linking.openURL(`tel:${SUPPORT_PHONE}`); }} accessibilityLabel="Call">
            <Feather name="phone" size={18} color="#2563eb" />
          </TouchableOpacity>
          <TouchableOpacity onPress={openMenu} style={styles.menuBtn} accessibilityLabel="Menu">
            <Feather name="menu" size={22} color="#0f172a" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        ref={homeScrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Top Navigation Tabs - Icons above text */}
        <View style={styles.tabsWrapper}>
          <View style={styles.tabs}>
            {tabs.map((tab) => {
              const isActive = tripType === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[styles.tab, isActive && styles.tabActive]}
                  onPress={() => handleTabChange(tab.id)}
                >
                  <MaterialCommunityIcons
                    name={tab.icon as any}
                    size={18}
                    color={isActive ? colors.primary : colors.gray600}
                  />
                  <Text style={[styles.tabText, isActive && styles.tabTextActive]} numberOfLines={2}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {(tripType === 'outstation' || tripType === 'tour') && (
          <View style={styles.toggleRow}>
            {(['one-way', 'round-trip'] as const).map((mode) => {
              const on = tripMode === mode;
              return (
                <TouchableOpacity
                  key={mode}
                  style={[styles.modeCard, on && styles.modeCardOn]}
                  onPress={() => {
                    setTripMode(mode);
                    if (mode === 'one-way') setReturnDate(null);
                  }}
                >
                  <View style={styles.flex}>
                    <Text style={[styles.toggleText, on && styles.toggleTextActive]}>{mode === 'one-way' ? 'One Way' : 'Round Trip'}</Text>
                    <Text style={styles.toggleSubtext}>{mode === 'one-way' ? 'Get dropped off' : 'Keep cab till return'}</Text>
                  </View>
                  <View style={[styles.modeMark, on && styles.modeMarkOn]}>
                    {on ? <Feather name="check" size={14} color="#fff" /> : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        {tripType === 'airport' && (
          <View style={styles.toggleRow}>
            {(['from-airport', 'to-airport'] as const).map((dir) => {
              const on = airportDirection === dir;
              return (
                <TouchableOpacity key={dir} style={[styles.modeCard, on && styles.modeCardOn]} onPress={() => handleAirportDirection(dir)}>
                  <View style={styles.flex}>
                    <Text style={[styles.toggleText, on && styles.toggleTextActive]}>{dir === 'from-airport' ? 'From Airport' : 'To Airport'}</Text>
                    <Text style={styles.toggleSubtext}>{dir === 'from-airport' ? 'Pickup at terminal' : 'Drop at terminal'}</Text>
                  </View>
                  <View style={[styles.modeMark, on && styles.modeMarkOn]}>
                    {on ? <Feather name="check" size={14} color="#fff" /> : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Booking Form - Card container */}
        <View style={[styles.form, { maxWidth: CARD_MAX_WIDTH }]}>
          <View style={styles.locationCard}>
            <View style={styles.rail}>
              <View style={styles.railDot} />
              <View style={styles.railLine} />
              <View style={styles.railDot} />
            </View>
            <View style={styles.flex}>
              <LocationInput
                label="From"
                placeholder={tripType === 'local' ? 'Enter pickup location' : 'Enter pickup location'}
                value={pickupLocation}
                onLocationChange={(loc) => setPickupLocation(loc)}
                isPickupLocation={true}
                tripType={tripType}
                helperText={tripType === 'airport' && airportDirection === 'from-airport' ? '' : pickupHelper}
              />
              {tripType === 'outstation' ? (
                <>
                  {stops.map((stop, index) => (
                    <View key={`stop-${index}`} style={styles.stopRow}>
                      <View style={styles.flex}>
                        <LocationInput
                          label={`Stop ${index + 1}`}
                          placeholder="Add a stop"
                          value={stop}
                          onLocationChange={(loc) => setStops((current) => current.map((item, itemIndex) => itemIndex === index ? loc : item))}
                          tripType={tripType}
                        />
                      </View>
                      <TouchableOpacity onPress={() => setStops((current) => current.filter((_, itemIndex) => itemIndex !== index))} accessibilityLabel="Remove stop">
                        <Feather name="x" size={18} color="#94a3b8" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity style={styles.addStop} onPress={() => setStops((current) => [...current, null])}>
                    <Feather name="plus-circle" size={16} color="#2563eb" />
                    <Text style={styles.addStopText}>{stops.length ? 'Add more stops' : 'Add stop'}</Text>
                    <Text style={styles.addStopHint}>Add multiple stops in between</Text>
                  </TouchableOpacity>
                </>
              ) : null}
              {tripType !== 'tour' ? (
                <LocationInput
                  key={`drop-${tripType}`}
                  label={tripType === 'local' ? 'Last drop at' : tripType === 'airport' && airportDirection === 'to-airport' ? 'To' : 'To'}
                  placeholder={tripType === 'local' ? 'Enter last drop location' : 'Enter destination location'}
                  value={dropLocation}
                  onLocationChange={(loc) => setDropLocation(loc)}
                  isPickupLocation={false}
                  tripType={tripType}
                  helperText={dropHelper}
                />
              ) : null}
            </View>
          </View>
          {tripType === 'local' ? (
            <View style={styles.packageRow}>
              <Text style={styles.packageLabel}>Package</Text>
              {(['8hrs-80km', '10hrs-100km'] as const).map((pkg) => (
                <TouchableOpacity key={pkg} style={[styles.packageChip, hourlyPackage === pkg && styles.packageChipOn]} onPress={() => setHourlyPackage(pkg)}>
                  <Text style={[styles.packageText, hourlyPackage === pkg && styles.packageTextOn]}>{pkg === '8hrs-80km' ? '8 Hours / 80 KM' : '10 Hours / 100 KM'}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
          {tripType === 'tour' && tours.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tourPicks}>
              {tours.slice(0, 8).map((tour: { id?: string; name?: string }) => (
                <TouchableOpacity
                  key={tour.id}
                  style={styles.tourPick}
                  onPress={() => {
                    const ep = resolvePickupForSearch(pickupDateRef.current);
                    navigation.navigate('TourDetail', {
                      tourId: tour.id ?? '',
                      tourName: tour.name ?? '',
                      pickupLocation: pickupLocation || undefined,
                      pickupDate: ep.getTime(),
                    });
                  }}
                >
                  <Text style={styles.tourPickText} numberOfLines={1}>{tour.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : null}

          <DateTimePickerComponent
            label="Trip Start"
            date={pickupDate}
            onDateChange={setPickupDate}
            minDate={getMinimumDate()}
          />

          {tripType === 'outstation' && tripMode === 'round-trip' && (
            <DateTimePickerComponent
              label="Return trip"
              date={returnDate ?? new Date(pickupDate.getTime() + 8 * 60 * 60 * 1000)}
              onDateChange={(d) => setReturnDate(d)}
              minDate={pickupDate}
            />
          )}

          {tripType === 'tour' ? (
            <TouchableOpacity
              style={[
                styles.searchBtn,
                (!pickupLocation || !pickupLocation.name || isCalculating) && styles.searchBtnDisabled,
              ]}
              onPress={() => {
                if (pickupLocation && pickupLocation.name) {
                  const ep = resolvePickupForSearch(pickupDateRef.current);
                  if (ep.getTime() !== pickupDateRef.current.getTime()) {
                    setPickupDate(ep);
                    pickupDateRef.current = ep;
                  }
                  navigation.navigate('ToursList', {
                    pickupLocation,
                    pickupDate: ep.getTime(),
                    tripMode,
                  });
                }
              }}
              disabled={!pickupLocation || !pickupLocation.name || isCalculating}
            >
              {isCalculating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={styles.searchLabel}>
                  <Feather name="search" size={16} color="#fff" />
                  <Text style={styles.searchBtnText}>SEARCH</Text>
                </View>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.searchBtn,
                (!isFormValid || isCalculating) && styles.searchBtnDisabled,
              ]}
              onPress={handleSearchCabs}
              disabled={!isFormValid || isCalculating}
            >
              {isCalculating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={styles.searchLabel}>
                  <Feather name="search" size={16} color="#fff" />
                  <Text style={styles.searchBtnText}>SEARCH</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
          <View style={styles.trustRow}>
            <Text style={styles.trustItem}>GST registered</Text>
            <Text style={styles.trustDot}>·</Text>
            <Text style={styles.trustItem}>Verified</Text>
            <Text style={styles.trustDot}>·</Text>
            <Text style={styles.trustItem}>Since 2020</Text>
          </View>
        </View>

        {/* Explore Amazing Destinations - Tour packages carousel */}
        <View
          style={styles.destinationsSection}
          onLayout={(event) => { destinationsY.current = event.nativeEvent.layout.y; }}
        >
          <View style={styles.destinationsBadge}>
            <Feather name="map-pin" size={14} color="#ea580c" />
            <Text style={styles.destinationsBadgeText}>TOUR PACKAGES</Text>
          </View>
          <Text style={styles.destinationsTitle}>Explore Amazing Destinations</Text>
          <Text style={styles.destinationsSubtitle}>
            Discover the beauty of Andhra Pradesh with our carefully curated tour packages
          </Text>
          {toursLoading ? (
            <ActivityIndicator style={styles.destinationsLoader} color={colors.primary} size="large" />
          ) : tours.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.destinationsScroll}
            >
              {tours.map((tour: { id?: string; name?: string; days?: number; image?: string; timeDuration?: string; pricing?: Record<string, number> }, i) => {
                const values = Object.values(tour.pricing || {}).filter((v): v is number => typeof v === 'number');
                const minPrice = values.length > 0 ? Math.min(...values) : 0;
                const added = Boolean(tour.id && tripCart.has(tour.id));
                return (
                  <View key={tour.id || i} style={styles.destinationCard}>
                    <TouchableOpacity
                      onPress={() => {
                        const ep = resolvePickupForSearch(pickupDateRef.current);
                        navigation.navigate('TourDetail', {
                          tourId: tour.id ?? '',
                          tourName: tour.name ?? '',
                          pickupLocation: pickupLocation || undefined,
                          pickupDate: ep.getTime(),
                        });
                      }}
                      activeOpacity={0.8}
                    >
                    <View style={styles.destinationCardImageWrap}>
                      {tour.image ? (
                        <Image source={{ uri: tour.image }} style={styles.destinationCardImage} resizeMode="cover" />
                      ) : (
                        <View style={[styles.destinationCardImage, styles.destinationCardImagePlaceholder]}>
                          <Feather name="image" size={32} color={colors.gray600} />
                        </View>
                      )}
                    </View>
                    <Text style={styles.destinationCardTitle} numberOfLines={2}>
                      {tour.name}
                    </Text>
                    <Text style={styles.destinationCardPrice}>
                      ₹{minPrice > 0 ? minPrice.toLocaleString('en-IN') : '--'}
                    </Text>
                    </TouchableOpacity>
                    <View style={styles.addTripWrap}>
                      <TouchableOpacity
                        style={[styles.addTripBtn, added && styles.addTripBtnOn]}
                        onPress={() => {
                          if (!tour.id || !tour.name) return;
                          void tripCart.toggle({
                            id: tour.id,
                            name: tour.name,
                            days: tour.days,
                            image: tour.image,
                            minPrice: minPrice > 0 ? minPrice : undefined,
                            timeDuration: tour.timeDuration,
                          });
                        }}
                        activeOpacity={0.85}
                      >
                        <Feather name={added ? 'check' : 'plus'} size={14} color={added ? '#1d4ed8' : '#fff'} />
                        <Text style={[styles.addTripBtnText, added && styles.addTripBtnTextOn]} numberOfLines={1}>
                          {added ? 'Added' : 'Add to My Trip'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          ) : null}
        </View>
      </ScrollView>
      <TouchableOpacity
        style={styles.buildTrip}
        onPress={() => {
          if (tripCart.items.length === 0) {
            homeScrollRef.current?.scrollTo({ y: Math.max(0, destinationsY.current - 8), animated: true });
            return;
          }
          navigation.navigate('BuildMyTrip');
        }}
        activeOpacity={0.9}
      >
        <View style={styles.buildTripIcon}>
          <Feather name="briefcase" size={18} color="#fff" />
          {tripCart.items.length > 0 ? (
            <View style={styles.buildTripBadge}>
              <Text style={styles.buildTripBadgeText}>{tripCart.items.length}</Text>
            </View>
          ) : null}
        </View>
        <View>
          <Text style={styles.buildTripTitle}>
            {tripCart.items.length > 0 ? `My trip · ${tripCart.items.length}` : 'Build Your Trip'}
          </Text>
          <Text style={styles.buildTripSub}>
            {tripCart.items.length > 0 ? 'View selected tours' : 'Add tours & transfers'}
          </Text>
        </View>
      </TouchableOpacity>
    </SafeAreaView>

    <Modal visible={supportSheetVisible} transparent animationType="fade">
      <Pressable style={styles.supportSheetOverlay} onPress={closeSupportSheet}>
        <Animated.View style={[styles.supportSheetPane, { transform: [{ translateY: supportSlideAnim }] }]}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={styles.supportSheetHandleBar} />
            <Text style={styles.supportSheetTitle}>Support</Text>
            <Text style={styles.supportSheetSub}>Get in touch with us</Text>
            <TouchableOpacity
              style={styles.supportSheetBtn}
              onPress={() => {
                Linking.openURL(`https://wa.me/${SUPPORT_WHATSAPP}`).catch(() => {});
                closeSupportSheet();
              }}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="whatsapp" size={18} color="#fff" />
              <Text style={styles.supportSheetBtnText}>WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.supportSheetBtnOutline}
              onPress={() => {
                Linking.openURL(`tel:${SUPPORT_PHONE}`).catch(() => {});
                closeSupportSheet();
              }}
              activeOpacity={0.8}
            >
              <Feather name="phone" size={18} color={colors.primary} />
              <Text style={styles.supportSheetBtnTextOutline}>Phone Call</Text>
            </TouchableOpacity>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>

    <Modal visible={authSheetVisible} transparent animationType="fade">
      <Pressable style={styles.authSheetOverlay} onPress={closeAuthSheet}>
        <Animated.View style={[styles.authSheetPane, { transform: [{ translateY: slideAnim }] }]}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={styles.authSheetHandleBar} />
            <Text style={styles.authSheetTitle}>Welcome back</Text>
            <Text style={styles.authSheetSub}>Sign in to manage your bookings and account</Text>
            <TouchableOpacity style={styles.authSheetBtn} onPress={goToLogin} activeOpacity={0.8}>
              <Feather name="log-in" size={20} color="#fff" />
              <Text style={styles.authSheetBtnText}>Log in</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.authSheetBtnOutline} onPress={goToSignup} activeOpacity={0.8}>
              <Feather name="user-plus" size={20} color={colors.primary} />
              <Text style={styles.authSheetBtnTextOutline}>Sign up</Text>
            </TouchableOpacity>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 8, backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 12, height: 42 },
  searchInput: { flex: 1, fontFamily: fonts.regular, fontSize: 14, color: '#0f172a', padding: 0 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  logo: { width: 168, height: 46 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerCall: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: '#bfdbfe', alignItems: 'center', justifyContent: 'center', backgroundColor: '#eff6ff' },
  menuBtn: { padding: 6 },

  buildTrip: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    borderRadius: 999,
    paddingVertical: 8,
    paddingLeft: 8,
    paddingRight: 14,
    elevation: 6,
    shadowColor: '#1e3a8a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  buildTripIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  buildTripBadge: { position: 'absolute', right: -4, top: -4, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  buildTripBadgeText: { color: '#2563eb', fontSize: 10, fontFamily: fonts.bold },
  buildTripTitle: { color: '#fff', fontFamily: fonts.bold, fontSize: 13 },
  buildTripSub: { color: 'rgba(255,255,255,0.85)', fontFamily: fonts.medium, fontSize: 10, marginTop: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: 12, paddingBottom: 24 },

  tabsWrapper: { marginBottom: 8 },
  tabs: { flexDirection: 'row', gap: 8 },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tabActive: { borderColor: colors.primary, borderWidth: 1.5 },
  tabText: {
    fontSize: 10,
    fontFamily: fonts.semiBold,
    color: colors.gray600,
    marginTop: 2,
    textAlign: 'center',
  },
  tabTextActive: { color: colors.primary, fontFamily: fonts.bold },

  flex: { flex: 1 },
  toggleRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  modeCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 12, paddingVertical: 10 },
  modeCardOn: { borderColor: '#2563eb' },
  modeMark: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: '#cbd5e1' },
  modeMarkOn: { backgroundColor: '#2563eb', borderColor: '#2563eb', alignItems: 'center', justifyContent: 'center' },
  rail: { width: 16, alignItems: 'center', paddingVertical: 18 },
  railDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: '#2563eb', backgroundColor: '#fff' },
  railLine: { flex: 1, width: 0, borderLeftWidth: 1, borderStyle: 'dashed', borderColor: '#93c5fd', marginVertical: 4 },
  stopRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addStop: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  addStopText: { color: '#2563eb', fontFamily: fonts.semiBold, fontSize: 14 },
  addStopHint: { flex: 1, color: '#94a3b8', fontFamily: fonts.regular, fontSize: 11 },
  packageRow: { gap: 8 },
  packageLabel: { color: '#64748b', fontFamily: fonts.medium, fontSize: 12 },
  packageChip: { borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff' },
  packageChipOn: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  packageText: { color: '#334155', fontFamily: fonts.semiBold, fontSize: 14 },
  packageTextOn: { color: '#2563eb' },
  tourPicks: { gap: 8 },
  tourPick: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 12, paddingVertical: 10, maxWidth: 220 },
  tourPickText: { color: '#0f172a', fontFamily: fonts.semiBold, fontSize: 13 },
  searchLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  trustRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 8 },
  trustItem: { color: '#64748b', fontFamily: fonts.medium, fontSize: 11 },
  trustDot: { color: '#cbd5e1' },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleBtnActive: {
    backgroundColor: '#fff',
    borderColor: colors.primary,
  },
  toggleText: { fontSize: 13, fontFamily: fonts.semiBold, color: colors.gray600, textAlign: 'center' },
  toggleTextActive: { color: colors.primary, fontFamily: fonts.bold },
  toggleSubtext: {
    fontSize: 10,
    fontFamily: fonts.regular,
    color: colors.gray600,
    textAlign: 'center',
    marginTop: 1,
  },
  toggleSubtextActive: { color: colors.primary },

  form: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 16,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 3,
        }),
  },
  locationCard: { flexDirection: 'row', alignItems: 'stretch', gap: 4 },

  fromToContent: { flex: 1 },
  fromBlock: { marginBottom: 0 },
  toBlock: { marginBottom: 0 },

  searchBtn: {
    backgroundColor: colors.blue600,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    minHeight: 44,
  },
  searchBtnDisabled: { opacity: 0.6 },
  searchBtnText: { color: '#fff', fontSize: 15, fontFamily: fonts.bold },

  tourList: { gap: 12 },
  tourCard: {
    backgroundColor: colors.gray50,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tourName: { fontSize: 16, fontFamily: fonts.semiBold, color: colors.foreground },
  tourMeta: { fontSize: 12, color: colors.mutedForeground, marginTop: 4, fontFamily: fonts.regular },
  tourTapHint: { fontSize: 12, color: colors.primary, marginTop: 6, fontFamily: fonts.medium },
  tourHint: { fontSize: 14, color: colors.gray600, textAlign: 'center', marginTop: 8, fontFamily: fonts.regular },

  destinationsSection: { marginTop: 20, paddingTop: 16, paddingBottom: 72, borderTopWidth: 1, borderTopColor: colors.border },
  destinationsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#fff7ed',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 8,
  },
  destinationsBadgeText: { fontSize: 11, fontFamily: fonts.semiBold, color: '#ea580c', marginLeft: 4 },
  destinationsTitle: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.gray900,
    textAlign: 'center',
    marginBottom: 4,
  },
  destinationsSubtitle: {
    fontSize: 13,
    color: colors.gray600,
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  destinationsLoader: { marginVertical: 24 },
  destinationsScroll: { paddingBottom: 8, gap: 12 },
  destinationCard: {
    width: (SCREEN_WIDTH - 36) / 2,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }
      : { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 }),
  },
  destinationCardImageWrap: {
    height: 108,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  destinationCardImage: { width: '100%', height: 108 },
  destinationCardImagePlaceholder: {
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  destinationCardTitle: {
    height: 32,
    marginTop: 8,
    marginHorizontal: 10,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: fonts.semiBold,
    color: colors.gray900,
  },
  destinationCardPrice: {
    height: 18,
    marginTop: 2,
    marginHorizontal: 10,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: fonts.bold,
    color: colors.gray900,
  },
  addTripWrap: { paddingHorizontal: 10, paddingTop: 8, paddingBottom: 10 },
  addTripBtn: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#2563eb',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2563eb',
    paddingHorizontal: 6,
  },
  addTripBtnOn: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  addTripBtnText: { color: '#fff', fontFamily: fonts.semiBold, fontSize: 11 },
  addTripBtnTextOn: { color: '#1d4ed8' },
  supportSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-start',
  },
  supportSheetPane: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    ...(Platform.OS !== 'web' && { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 8 }),
  },
  supportSheetHandleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.gray300,
    alignSelf: 'center',
    marginBottom: 16,
  },
  supportSheetTitle: {
    fontSize: 20,
    fontFamily: fonts.bold,
    color: colors.foreground,
    textAlign: 'center',
    marginBottom: 4,
  },
  supportSheetSub: {
    fontSize: 14,
    color: colors.gray600,
    textAlign: 'center',
    marginBottom: 20,
  },
  supportSheetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#25D366',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 10,
  },
  supportSheetBtnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  supportSheetBtnText: { fontSize: 15, fontFamily: fonts.semiBold, color: '#fff' },
  supportSheetBtnTextOutline: { fontSize: 15, fontFamily: fonts.semiBold, color: colors.primary },
  authSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  authSheetPane: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  authSheetHandleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.gray300,
    alignSelf: 'center',
    marginBottom: 20,
  },
  authSheetTitle: {
    fontSize: 22,
    fontFamily: fonts.bold,
    color: colors.foreground,
    textAlign: 'center',
    marginBottom: 8,
  },
  authSheetSub: {
    fontSize: 15,
    color: colors.gray600,
    textAlign: 'center',
    marginBottom: 24,
  },
  authSheetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  authSheetBtnText: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: '#fff',
  },
  authSheetBtnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
  },
  authSheetBtnTextOutline: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: colors.primary,
  },
});
