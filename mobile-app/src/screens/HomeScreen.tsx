import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
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
import type { RootStackParamList } from '../navigation/types';
import type { Location } from '../types';
import type { TripType, TripMode } from '../types';

const SUPPORT_PHONE = '+919966363662';
const SUPPORT_WHATSAPP = '919966363662';

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
  const initialTrip = route.params?.initialTripType ?? 'outstation';
  const showAuthSheetParam = route.params?.showAuthSheet ?? false;
  const [authSheetVisible, setAuthSheetVisible] = useState(false);
  const [supportSheetVisible, setSupportSheetVisible] = useState(false);
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
  };

  const isFormValid =
    pickupLocation &&
    pickupLocation.name &&
    (tripType === 'tour' || dropLocation) &&
    (!(tripType === 'outstation' && tripMode === 'round-trip') || (returnDate != null));

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
          const result = await calculateDistanceMatrix(pickupLocation!, drop);
          if (result.status === 'OK') {
            distance = result.distance;
            duration = result.duration;
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
    [pickupLocation, dropLocation, tripMode, hourlyPackage, navigation]
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
    { id: 'outstation', label: 'Outstation\nTrips', icon: 'car' },
    { id: 'airport', label: 'Airport\nTransfer', icon: 'airplane' },
    { id: 'local', label: 'Hourly\nRentals', icon: 'clock-outline' },
    { id: 'tour', label: 'Tour\nPackages', icon: 'map-marker-path' },
  ];

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
      {/* Header - logo left, support button right */}
      <View style={styles.header}>
        <Image
          source={{ uri: 'https://www.vizagtaxihub.com/uploads/vizagtaxihub-logo.png' }}
          style={styles.logo}
          resizeMode="contain"
        />
        <TouchableOpacity
          style={styles.headerSupportBtn}
          onPress={openSupportSheet}
          activeOpacity={0.7}
        >
          <Feather name="help-circle" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
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

        {/* Local Package Selection - matches web */}
        {tripType === 'local' && (
          <View style={styles.toggleRow}>
            {(['8hrs-80km', '10hrs-100km'] as const).map((pkg) => (
              <TouchableOpacity
                key={pkg}
                style={[
                  styles.toggleBtn,
                  hourlyPackage === pkg && styles.toggleBtnActive,
                ]}
                onPress={() => setHourlyPackage(pkg)}
              >
                <Text
                  style={[
                    styles.toggleText,
                    hourlyPackage === pkg && styles.toggleTextActive,
                  ]}
                >
                  {pkg === '8hrs-80km' ? '8 Hrs / 80 KM' : '10 Hrs / 100 KM'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Trip Type Selection - Pill style */}
        {(tripType === 'outstation' || tripType === 'tour') && (
          <View style={styles.toggleRow}>
            {(['one-way', 'round-trip'] as const).map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[
                  styles.toggleBtn,
                  tripMode === mode && styles.toggleBtnActive,
                ]}
                onPress={() => {
                  setTripMode(mode);
                  if (mode === 'one-way') {
                    setReturnDate(null);
                  }
                }}
              >
                <Text
                  style={[
                    styles.toggleText,
                    tripMode === mode && styles.toggleTextActive,
                  ]}
                >
                  {mode === 'one-way' ? 'One Way' : 'Round Trip'}
                </Text>
                <Text
                  style={[
                    styles.toggleSubtext,
                    tripMode === mode && styles.toggleSubtextActive,
                  ]}
                >
                  {mode === 'one-way' ? 'Get dropped off' : 'Keep cab till return'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {tripType === 'airport' && (
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                airportDirection === 'from-airport' && styles.toggleBtnActive,
              ]}
              onPress={() => handleAirportDirection('from-airport')}
            >
              <Text
                style={[
                  styles.toggleText,
                  airportDirection === 'from-airport' && styles.toggleTextActive,
                ]}
              >
                From Airport
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                airportDirection === 'to-airport' && styles.toggleBtnActive,
              ]}
              onPress={() => handleAirportDirection('to-airport')}
            >
              <Text
                style={[
                  styles.toggleText,
                  airportDirection === 'to-airport' && styles.toggleTextActive,
                ]}
              >
                To Airport
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Booking Form - Card container */}
        <View style={[styles.form, { maxWidth: CARD_MAX_WIDTH }]}>
          <View style={styles.locationCard}>
            {(tripType === 'outstation' || tripType === 'airport' || tripType === 'local') ? (
              <View style={styles.fromToContent}>
                <View style={styles.fromBlock}>
                  <LocationInput
                      label="FROM"
                      placeholder="Enter pickup location"
                      value={pickupLocation}
                      onLocationChange={(loc) => setPickupLocation(loc)}
                      isPickupLocation={true}
                      tripType={tripType}
                      helperText={pickupHelper}
                      showLeftIcon={true}
                    />
                  </View>
                  <View style={styles.toBlock}>
                    <LocationInput
                      key={`drop-${tripType}`}
                      label={tripType === 'local' ? 'LAST DROP AT' : 'TO'}
                      placeholder={tripType === 'local' ? 'Enter last drop location' : 'Enter drop location'}
                      value={dropLocation}
                      onLocationChange={(loc) => setDropLocation(loc)}
                      isPickupLocation={false}
                      tripType={tripType}
                      helperText={dropHelper}
                      showLeftIcon={true}
                    />
                  </View>
                </View>
            ) : (
              <LocationInput
                label="FROM"
                placeholder="Enter pickup location"
                value={pickupLocation}
                onLocationChange={(loc) => setPickupLocation(loc)}
                isPickupLocation={true}
                tripType={tripType}
                helperText={pickupHelper}
                showLeftIcon={true}
              />
            )}
          </View>

          <DateTimePickerComponent
            label="Trip Start"
            date={pickupDate}
            onDateChange={setPickupDate}
            minDate={getMinimumDate()}
          />

          {tripType === 'outstation' && tripMode === 'round-trip' && (
            <DateTimePickerComponent
              label="Return date of journey"
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
                <Text style={styles.searchBtnText}>SEARCH TOURS</Text>
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
                <Text style={styles.searchBtnText}>SEARCH</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Explore Amazing Destinations - Tour packages carousel */}
        <View style={styles.destinationsSection}>
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
              {tours.map((tour: { id?: string; name?: string; image?: string; pricing?: Record<string, number> }, i) => {
                const values = Object.values(tour.pricing || {}).filter((v): v is number => typeof v === 'number');
                const minPrice = values.length > 0 ? Math.min(...values) : 0;
                return (
                  <TouchableOpacity
                    key={tour.id || i}
                    style={styles.destinationCard}
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
                    <View style={styles.destinationCardContent}>
                      <View style={styles.destinationCardContentRow}>
                        <Text style={styles.destinationCardTitle} numberOfLines={2}>
                          {tour.name}
                        </Text>
                        <View style={styles.destinationCardPriceWrap}>
                          <Text style={styles.destinationCardPrice}>
                            ₹{minPrice > 0 ? minPrice.toLocaleString('en-IN') : '--'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : null}
        </View>
      </ScrollView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  logo: { width: 160, height: 44 },
  headerSupportBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuBtn: { padding: 8 },
  menuIcon: { fontSize: 24, color: colors.foreground, fontFamily: fonts.regular },

  scroll: { flex: 1 },
  scrollContent: { padding: 12, paddingBottom: 24 },

  tabsWrapper: { marginBottom: 8 },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.gray100,
    borderRadius: 10,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  tabText: {
    fontSize: 10,
    fontFamily: fonts.semiBold,
    color: colors.gray600,
    marginTop: 2,
    textAlign: 'center',
  },
  tabTextActive: { color: colors.primary, fontFamily: fonts.bold },

  toggleRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
    justifyContent: 'center',
  },
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
  locationCard: {
    marginBottom: 0,
  },

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

  destinationsSection: { marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border },
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
  destinationsScroll: { paddingHorizontal: 16, paddingBottom: 24 },
  destinationCard: {
    width: SCREEN_WIDTH - 64,
    marginRight: 16,
    maxWidth: 320,
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
    position: 'relative',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  destinationCardImage: { width: '100%', height: 120 },
  destinationCardImagePlaceholder: {
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  destinationCardContent: {
    padding: 12,
    backgroundColor: '#fff',
  },
  destinationCardContentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  destinationCardTitle: {
    flex: 1,
    fontSize: 15,
    fontFamily: fonts.bold,
    color: colors.gray900,
    marginRight: 12,
  },
  destinationCardPriceWrap: { alignItems: 'flex-end' },
  destinationCardPrice: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.gray900,
  },
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
