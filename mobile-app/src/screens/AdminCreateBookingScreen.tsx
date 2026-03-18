/**
 * Admin Create Booking - native form to create bookings (mirrors web AdminBookingForm).
 * Uses LocationInput (Google Places autocomplete), distance auto-calculation, DateTimePicker.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Modal,
  FlatList,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/core';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { adminExtendedAPI } from '../services/adminExtendedAPI';
import { loadVehicles } from '../services/vehiclesAPI';
import {
  getOutstationFares,
  getLocalPackageFares,
  getAirportFares,
  calculateOutstationFare,
  calculateOutstationRoundTripFare,
  calculateLocalFare,
  calculateAirportFare,
  type LocalPackageMatrix,
  type OutstationFare,
} from '../services/fareService';
import { formatDateForAPI } from '../utils/dateUtils';
import { calculateDistanceMatrix } from '../services/distanceService';
import { LocationInput } from '../components/LocationInput';
import { DateTimePickerComponent } from '../components/DateTimePicker';
import { tourAPI, type TourInfo } from '../services/tourAPI';
import type { Vehicle } from '../services/vehiclesAPI';
import type { Location } from '../types';
import type { TripType } from '../types';

const TRIP_TYPES: { id: TripType; label: string }[] = [
  { id: 'outstation', label: 'Outstation' },
  { id: 'local', label: 'Local' },
  { id: 'airport', label: 'Airport' },
  { id: 'tour', label: 'Tour' },
];

const HOURLY_PACKAGES = [
  { value: '8hrs-80km', label: '8 Hrs/80 km' },
  { value: '10hrs-100km', label: '10 Hrs/100 km' },
];

export function AdminCreateBookingScreen() {
  const navigation = useNavigation<any>();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isCalculatingDistance, setIsCalculatingDistance] = useState(false);

  const [tripType, setTripType] = useState<TripType>('outstation');
  const [tripMode, setTripMode] = useState<'one-way' | 'round-trip'>('one-way');
  const [airportDirection, setAirportDirection] = useState<'from-airport' | 'to-airport'>('from-airport');
  const [pickupLocation, setPickupLocation] = useState<Location | null>(null);
  const [dropLocation, setDropLocation] = useState<Location | null>(null);
  const [pickupDate, setPickupDate] = useState(new Date());
  const [returnDate, setReturnDate] = useState<Date | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [distance, setDistance] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [hourlyPackage, setHourlyPackage] = useState('8hrs-80km');
  const [passengerName, setPassengerName] = useState('');
  const [passengerPhone, setPassengerPhone] = useState('');
  const [passengerEmail, setPassengerEmail] = useState('');
  const [additionalRequirements, setAdditionalRequirements] = useState('');
  const [outstationFares, setOutstationFares] = useState<Record<string, { basePrice: number; pricePerKm: number; driverAllowance: number }>>({});
  const [localMatrix, setLocalMatrix] = useState<LocalPackageMatrix | null>(null);
  const [airportFares, setAirportFares] = useState<Record<string, import('../services/fareService').AirportFare> | null>(null);
  const [isLoadingFares, setIsLoadingFares] = useState(false);

  // Tour: packages, selection, vehicles with pricing
  const [tours, setTours] = useState<TourInfo[]>([]);
  const [toursLoading, setToursLoading] = useState(false);
  const [selectedTour, setSelectedTour] = useState<TourInfo | null>(null);
  const [tourVehicles, setTourVehicles] = useState<Array<Vehicle & { tourPrice?: number }>>([]);
  const [showTourPicker, setShowTourPicker] = useState(false);

  // Pricing & Discount (matches web AdminBookingForm)
  const [discountType, setDiscountType] = useState<'none' | 'percentage' | 'fixed'>('none');
  const [discountValue, setDiscountValue] = useState(0);
  const [partialPaymentReceived, setPartialPaymentReceived] = useState(false);
  const [partialPaymentAmount, setPartialPaymentAmount] = useState(0);
  const [markAsPaid, setMarkAsPaid] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await loadVehicles();
        if (!cancelled) {
          setVehicles(list);
          if (list.length > 0 && !selectedVehicle) setSelectedVehicle(list[0]);
        }
      } catch {
        if (!cancelled) setVehicles([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const formatDateTime = () => formatDateForAPI(pickupDate);

  useEffect(() => {
    if (tripType === 'local' || tripType === 'tour') {
      setDropLocation(null);
        if (tripType === 'local') {
        const kmMatch = hourlyPackage.match(/(\d+)\s*km/i) || hourlyPackage.match(/(\d+)/);
        setDistance(kmMatch ? kmMatch[1] : '80');
      } else if (tripType === 'tour') {
        setDistance('120');
      }
    }
  }, [tripType]);

  useEffect(() => {
    if (tripType === 'local') {
      const kmMatch = hourlyPackage.match(/(\d+)\s*km/i) || hourlyPackage.match(/(\d+)/);
      setDistance(kmMatch ? kmMatch[1] : '80');
    }
  }, [hourlyPackage, tripType]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (tripType === 'local' || tripType === 'tour') return;
      if (!pickupLocation || !dropLocation) {
        if (tripType === 'outstation' || tripType === 'airport') setDistance('');
        return;
      }
      setIsCalculatingDistance(true);
      try {
        const result = await calculateDistanceMatrix(pickupLocation, dropLocation);
        if (!cancelled && result.status === 'OK') {
          setDistance(String(result.distance));
          if (result.distance > 35 && tripType === 'airport') {
            setTripType('outstation');
          }
        }
      } catch {
        if (!cancelled) setDistance('');
      } finally {
        if (!cancelled) setIsCalculatingDistance(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [pickupLocation, dropLocation, tripType]);

  // When on Airport tab and distance > 35km (outstation), switch to Outstation (matches web Hero logic)
  useEffect(() => {
    const dist = parseFloat(distance) || 0;
    if (tripType === 'airport' && dist > 35) {
      setTripType('outstation');
    }
  }, [distance, tripType]);

  const loadFares = useCallback(() => {
    let cancelled = false;
    setIsLoadingFares(true);
    (async () => {
      try {
        if (tripType === 'local') {
          const { matrix } = await getLocalPackageFares();
          if (!cancelled) setLocalMatrix(matrix);
          if (!cancelled) setOutstationFares({});
          if (!cancelled) setAirportFares(null);
        } else if (tripType === 'airport') {
          const [oMap, aMap] = await Promise.all([getOutstationFares(), getAirportFares()]);
          if (!cancelled) setOutstationFares(oMap);
          if (!cancelled) setAirportFares(Object.keys(aMap).length > 0 ? aMap : null);
          if (!cancelled) setLocalMatrix(null);
        } else {
          const fMap = await getOutstationFares();
          if (!cancelled) setOutstationFares(fMap);
          if (!cancelled) setAirportFares(null);
          if (!cancelled) setLocalMatrix(null);
        }
      } catch {
        if (!cancelled) setOutstationFares({});
        if (!cancelled) setLocalMatrix(null);
        if (!cancelled) setAirportFares(null);
      } finally {
        if (!cancelled) setIsLoadingFares(false);
      }
    })();
    return () => { cancelled = true; };
  }, [tripType]);

  useEffect(() => {
    loadFares();
  }, [loadFares]);

  // Refetch fares when screen gains focus (e.g. after admin updates fares elsewhere)
  useFocusEffect(useCallback(() => {
    loadFares();
  }, [loadFares]));

  // Pricing & Discount helpers (match web AdminBookingForm)
  const basePrice = parseFloat(totalAmount) || 0;
  const calculatePriceAfterDiscount = () => {
    let price = basePrice;
    if (discountType === 'percentage' && discountValue > 0) {
      price = Math.max(0, price - (price * discountValue) / 100);
    } else if (discountType === 'fixed' && discountValue > 0) {
      price = Math.max(0, price - discountValue);
    }
    return price;
  };
  const priceAfterDiscount = calculatePriceAfterDiscount();
  const finalPrice = partialPaymentReceived && partialPaymentAmount > 0
    ? Math.max(0, priceAfterDiscount - partialPaymentAmount)
    : priceAfterDiscount;

  const getFareForVehicle = useCallback(
    (vehicle: Vehicle): number => {
      const name = String(vehicle.name || vehicle.id || 'sedan');
      const dist = parseFloat(distance) || 0;

      if (tripType === 'local' && localMatrix) {
        const vehicleId = String(vehicle.id || '').trim();
        return calculateLocalFare(localMatrix, hourlyPackage, name, vehicleId || undefined);
      }
      if (tripType === 'airport') {
        const vehicleId = String(vehicle.id || '').trim();
        return calculateAirportFare(name, dist, airportFares, vehicleId || undefined);
      }
      if (tripType === 'tour' && selectedTour?.pricing) {
        const vehicleId = String(vehicle.id || '').toLowerCase().trim();
        const vehicleName = name.toLowerCase().replace(/\s+/g, '_');
        return selectedTour.pricing[vehicleId] ?? selectedTour.pricing[vehicleName] ?? selectedTour.pricing[name.toLowerCase()] ?? 0;
      }

      const id = String(vehicle.id || '').toLowerCase().replace(/-/g, '_').trim();
      const nameKey = name.toLowerCase().replace(/\s+/g, '_');
      const fare =
        outstationFares[id] ||
        outstationFares[nameKey] ||
        outstationFares[name.toLowerCase()] ||
        (name.toLowerCase().includes('swift') || name.toLowerCase().includes('dzire') ? outstationFares['sedan'] : null) ||
        (name.toLowerCase().includes('glanza') ? outstationFares['glanza'] || outstationFares['toyota_glanza'] || outstationFares['sedan'] : null) ||
        (name.toLowerCase().includes('amaze') ? outstationFares['amaze'] || outstationFares['sedan'] : null) ||
        (name.toLowerCase().includes('ertiga') ? outstationFares['ertiga'] : null) ||
        (name.toLowerCase().includes('innova') || name.toLowerCase().includes('crysta') ? outstationFares['innova_crysta'] || outstationFares['innova'] : null) ||
        (name.toLowerCase().includes('tempo') ? outstationFares['tempo_traveller'] || outstationFares['tempo'] : null) ||
        outstationFares['sedan'];

      if (!fare) return 0;
      if ((fare.basePrice ?? 0) <= 0 && (fare.pricePerKm ?? 0) <= 0) return 0;
      const outFare = fare as OutstationFare;
      if (tripMode === 'round-trip' && returnDate && dist > 0) {
        return calculateOutstationRoundTripFare(outFare, dist, pickupDate, returnDate);
      }
      return calculateOutstationFare(outFare, dist);
    },
    [tripType, tripMode, returnDate, pickupDate, distance, hourlyPackage, localMatrix, airportFares, outstationFares, selectedTour]
  );

  // Fetch tours when tripType is tour
  useEffect(() => {
    if (tripType !== 'tour') {
      setTours([]);
      setSelectedTour(null);
      setTourVehicles([]);
      return;
    }
    let cancelled = false;
    setToursLoading(true);
    tourAPI.getAvailableTours()
      .then((list) => {
        if (!cancelled) setTours(list.filter((t) => t.name));
      })
      .catch(() => { if (!cancelled) setTours([]); })
      .finally(() => { if (!cancelled) setToursLoading(false); });
    return () => { cancelled = true; };
  }, [tripType]);

  // Build tour vehicles when tour is selected
  useEffect(() => {
    if (tripType !== 'tour' || !selectedTour?.pricing) {
      setTourVehicles([]);
      return;
    }
    const withPrices = vehicles.map((v) => {
      const id = String(v.id || '').toLowerCase().trim();
      const nameKey = String(v.name || v.id || '').toLowerCase().replace(/\s+/g, '_');
      const price = selectedTour.pricing![id] ?? selectedTour.pricing![nameKey];
      return { ...v, tourPrice: typeof price === 'number' ? price : undefined };
    });
    setTourVehicles(withPrices);
  }, [tripType, selectedTour, vehicles]);

  useEffect(() => {
    if (!selectedVehicle) return;
    const dist = parseFloat(distance) || 0;
    if ((tripType === 'outstation' || tripType === 'airport') && dist <= 0) return;
    if (tripType === 'local' && !localMatrix) return;
    if (tripType === 'airport' && !airportFares && Object.keys(outstationFares).length === 0) return;
    if (tripType === 'outstation' && Object.keys(outstationFares).length === 0) return;
    if (tripType === 'outstation' && tripMode === 'round-trip' && !returnDate) return;
    if (tripType === 'tour' && !selectedTour) return;
    const fare = getFareForVehicle(selectedVehicle);
    if (fare > 0) setTotalAmount(String(fare));
  }, [selectedVehicle, distance, tripType, tripMode, returnDate, localMatrix, airportFares, outstationFares, selectedTour, getFareForVehicle]);

  const displayVehicles = tripType === 'tour' && tourVehicles.some((v) => v.tourPrice && v.tourPrice > 0)
    ? tourVehicles.filter((v) => v.tourPrice && v.tourPrice > 0)
    : vehicles;

  const handleSubmit = async () => {
    const pickupStr = pickupLocation?.address || pickupLocation?.name || '';
    if (!pickupStr.trim()) {
      Alert.alert('Error', 'Pickup location is required');
      return;
    }
    if (tripType === 'tour' && !selectedTour) {
      Alert.alert('Error', 'Please select a tour package');
      return;
    }
    if (!passengerName.trim()) {
      Alert.alert('Error', 'Passenger name is required');
      return;
    }
    if (!passengerPhone.trim()) {
      Alert.alert('Error', 'Passenger phone is required');
      return;
    }
    if (!passengerEmail.trim()) {
      Alert.alert('Error', 'Passenger email is required');
      return;
    }
    if (basePrice <= 0) {
      Alert.alert('Error', 'Total amount must be greater than 0');
      return;
    }
    const dist = parseFloat(distance) || 0;
    const discountAmount =
      discountType === 'percentage' && discountValue > 0
        ? Math.round(basePrice * (discountValue / 100))
        : discountType === 'fixed' && discountValue > 0
          ? discountValue
          : 0;
    setSubmitting(true);
    try {
      const dropStr = (dropLocation?.address || dropLocation?.name || '').trim();
      const payload = {
        pickupLocation: pickupStr.trim(),
        dropLocation: dropStr || undefined,
        pickupDate: formatDateTime(),
        pickupTime: `${String(pickupDate.getHours()).padStart(2, '0')}:${String(pickupDate.getMinutes()).padStart(2, '0')}`,
        tripType,
        tripMode,
        returnDate: tripMode === 'round-trip' && returnDate ? formatDateForAPI(returnDate) : undefined,
        airportDirection: tripType === 'airport' ? airportDirection : undefined,
        vehicleType: selectedVehicle?.name || 'Sedan',
        cabType: selectedVehicle?.name,
        passengerName: passengerName.trim(),
        passengerPhone: passengerPhone.trim(),
        passengerEmail: passengerEmail.trim(),
        additionalRequirements: additionalRequirements.trim() || undefined,
        distance: dist > 0 ? dist : undefined,
        totalAmount: basePrice,
        hourlyPackage: tripType === 'local' ? hourlyPackage : undefined,
        discountAmount,
        discountType: discountType !== 'none' ? discountType : undefined,
        discountValue: discountValue > 0 ? discountValue : 0,
        isPaid: markAsPaid,
        partialPaymentReceived,
        partialPaymentAmount: partialPaymentReceived ? partialPaymentAmount : 0,
        tourId: tripType === 'tour' && selectedTour ? selectedTour.id : undefined,
        createdByAdmin: true,
      };
      const res = await adminExtendedAPI.createBooking(payload);
      const bn = res?.data?.bookingNumber || res?.bookingNumber || res?.data?.id;
      Alert.alert(
        'Booking Created',
        `Booking ${bn ? `#${bn}` : ''} has been created successfully.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to create booking';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.title}>Create Booking</Text>
        <View style={styles.backBtn} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Trip Type */}
          <Text style={styles.label}>Trip Type</Text>
          <View style={styles.tripTypeRow}>
            {TRIP_TYPES.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[styles.tripTypeBtn, tripType === t.id && styles.tripTypeBtnActive]}
                onPress={() => {
                  setTripType(t.id);
                  if (t.id === 'local' || t.id === 'airport') {
                    setTripMode('one-way');
                    setReturnDate(null);
                  }
                  if (t.id === 'airport') setAirportDirection('from-airport');
                }}
              >
                <Text style={[styles.tripTypeText, tripType === t.id && styles.tripTypeTextActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Trip Mode (One Way / Round Trip) - outstation & tour */}
          {(tripType === 'outstation' || tripType === 'tour') && (
            <>
              <Text style={styles.label}>Trip Mode</Text>
              <View style={styles.tripTypeRow}>
                {(['one-way', 'round-trip'] as const).map((mode) => (
                  <TouchableOpacity
                    key={mode}
                    style={[styles.tripTypeBtn, tripMode === mode && styles.tripTypeBtnActive]}
                    onPress={() => {
                      setTripMode(mode);
                      if (mode === 'one-way') setReturnDate(null);
                      else if (!returnDate) setReturnDate(new Date(pickupDate.getTime() + 24 * 60 * 60 * 1000));
                    }}
                  >
                    <Text style={[styles.tripTypeText, tripMode === mode && styles.tripTypeTextActive]}>
                      {mode === 'one-way' ? 'One Way' : 'Round Trip'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* Airport Direction (From / To Airport) */}
          {tripType === 'airport' && (
            <>
              <Text style={styles.label}>Airport Direction</Text>
              <View style={styles.tripTypeRow}>
                {(['from-airport', 'to-airport'] as const).map((dir) => (
                  <TouchableOpacity
                    key={dir}
                    style={[styles.tripTypeBtn, airportDirection === dir && styles.tripTypeBtnActive]}
                    onPress={() => setAirportDirection(dir)}
                  >
                    <Text style={[styles.tripTypeText, airportDirection === dir && styles.tripTypeTextActive]}>
                      {dir === 'from-airport' ? 'From Airport' : 'To Airport'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* Select Tour (tour trips only) */}
          {tripType === 'tour' && (
            <>
              <Text style={styles.label}>Select Tour *</Text>
              <TouchableOpacity
                style={[styles.input, styles.tourSelect, !selectedTour && styles.inputError]}
                onPress={() => setShowTourPicker(true)}
                disabled={toursLoading}
              >
                <Text style={[styles.tourSelectText, !selectedTour && styles.tourSelectPlaceholder]}>
                  {toursLoading ? 'Loading tours...' : selectedTour ? selectedTour.name : 'Choose a tour package'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={colors.gray600} />
              </TouchableOpacity>
              {!selectedTour && tours.length > 0 && (
                <Text style={styles.errorText}>Please select a tour package</Text>
              )}
              <Modal
                visible={showTourPicker}
                transparent
                animationType="slide"
                onRequestClose={() => setShowTourPicker(false)}
              >
                <Pressable style={styles.modalOverlay} onPress={() => setShowTourPicker(false)}>
                  <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>Select Tour</Text>
                      <TouchableOpacity onPress={() => setShowTourPicker(false)}>
                        <Ionicons name="close" size={24} color={colors.foreground} />
                      </TouchableOpacity>
                    </View>
                    <FlatList
                      data={tours}
                      keyExtractor={(t) => t.id}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={styles.tourItem}
                          onPress={() => {
                            setSelectedTour(item);
                            setDropLocation({
                              id: `tour_${item.id}`,
                              name: item.name,
                              address: item.name,
                            } as Location);
                            setSelectedVehicle(null);
                            setTotalAmount('');
                            setShowTourPicker(false);
                          }}
                        >
                          <Text style={styles.tourItemText}>{item.name}</Text>
                        </TouchableOpacity>
                      )}
                    />
                  </View>
                </Pressable>
              </Modal>
            </>
          )}

          {/* Pickup / Drop - Google Places autocomplete */}
          <LocationInput
            label="Pickup Location *"
            placeholder="e.g. Vizag Railway Station"
            value={pickupLocation}
            onLocationChange={setPickupLocation}
            isPickupLocation
            tripType={tripType}
            helperText={tripType === 'outstation' || tripType === 'airport' ? 'Select within 35km of Visakhapatnam' : undefined}
          />
          {(tripType === 'outstation' || tripType === 'airport') && (
            <LocationInput
              label="Drop Location"
              placeholder="e.g. Araku Valley"
              value={dropLocation}
              onLocationChange={setDropLocation}
              isPickupLocation={false}
              tripType={tripType}
            />
          )}

          {/* Date & Time */}
          <DateTimePickerComponent
            label="Pickup Date & Time"
            date={pickupDate}
            onDateChange={setPickupDate}
            minDate={new Date()}
          />

          {/* Return Date - when round-trip */}
          {(tripType === 'outstation' || tripType === 'tour') && tripMode === 'round-trip' && (
            <DateTimePickerComponent
              label="Return Date & Time"
              date={returnDate ?? new Date(pickupDate.getTime() + 24 * 60 * 60 * 1000)}
              onDateChange={(d) => setReturnDate(d)}
              minDate={new Date(pickupDate.getTime())}
            />
          )}

          {/* Vehicle */}
          <Text style={styles.label}>Vehicle</Text>
          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.vehicleScroll}>
              {displayVehicles.map((v) => {
                const isSelected = !!selectedVehicle && (
                  String(selectedVehicle.id) === String(v.id) ||
                  selectedVehicle.name === v.name
                );
                return (
                  <TouchableOpacity
                    key={String(v.id) || v.name}
                    style={[
                      styles.vehicleChip,
                      isSelected && styles.vehicleChipActive,
                    ]}
                    onPress={() => setSelectedVehicle(v)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.vehicleChipText,
                        isSelected && styles.vehicleChipTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {v.name}
                    </Text>
                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color="#fff"
                        style={styles.vehicleChipCheck}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* Distance (outstation / airport) */}
          {(tripType === 'outstation' || tripType === 'airport') && (
            <>
              <Text style={styles.label}>Distance (km)</Text>
              <TextInput
                style={styles.input}
                value={distance}
                onChangeText={setDistance}
                placeholder="e.g. 120"
                keyboardType="numeric"
                placeholderTextColor={colors.gray600}
              />
            </>
          )}

          {/* Hourly package (local) */}
          {tripType === 'local' && (
            <>
              <Text style={styles.label}>Package</Text>
              <View style={styles.tripTypeRow}>
                {['8hrs-80km', '10hrs-100km'].map((pkg) => (
                  <TouchableOpacity
                    key={pkg}
                    style={[
                      styles.tripTypeBtn,
                      hourlyPackage === pkg && styles.tripTypeBtnActive,
                    ]}
                    onPress={() => setHourlyPackage(pkg)}
                  >
                    <Text
                      style={[
                        styles.tripTypeText,
                        hourlyPackage === pkg && styles.tripTypeTextActive,
                      ]}
                    >
                      {pkg === '8hrs-80km' ? '8 Hrs/80 km' : '10 Hrs/100 km'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* Pricing & Discount (when vehicle selected) */}
          {selectedVehicle && (
            <View style={styles.pricingSection}>
              <Text style={styles.pricingTitle}>Pricing & Discount</Text>
              <View style={styles.pricingRow}>
                <Text style={styles.pricingLabel}>Base Price:</Text>
                <Text style={styles.pricingValue}>₹{basePrice.toLocaleString('en-IN')}</Text>
              </View>
              <Text style={[styles.label, { marginTop: 12 }]}>Apply Discount</Text>
              <View style={styles.tripTypeRow}>
                {(['none', 'percentage', 'fixed'] as const).map((dt) => (
                  <TouchableOpacity
                    key={dt}
                    style={[styles.tripTypeBtn, discountType === dt && styles.tripTypeBtnActive]}
                    onPress={() => setDiscountType(dt)}
                  >
                    <Text style={[styles.tripTypeText, discountType === dt && styles.tripTypeTextActive]}>
                      {dt === 'none' ? 'No Discount' : dt === 'percentage' ? 'Percentage' : 'Fixed'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {discountType !== 'none' && (
                <View style={styles.discountInputRow}>
                  <TextInput
                    style={[styles.input, styles.discountInput]}
                    value={discountValue ? String(discountValue) : ''}
                    onChangeText={(t) => setDiscountValue(parseFloat(t) || 0)}
                    placeholder={discountType === 'percentage' ? 'e.g. 10' : 'e.g. 500'}
                    keyboardType="numeric"
                    placeholderTextColor={colors.gray600}
                  />
                  <Text style={styles.discountSuffix}>{discountType === 'percentage' ? '%' : '₹'}</Text>
                </View>
              )}
              <Text style={[styles.label, { marginTop: 12 }]}>Payment Status</Text>
              <TouchableOpacity
                style={styles.checkRow}
                onPress={() => {
                  setPartialPaymentReceived(!partialPaymentReceived);
                  if (partialPaymentReceived) setPartialPaymentAmount(0);
                }}
              >
                <Ionicons
                  name={partialPaymentReceived ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={colors.primary}
                  style={styles.checkIcon}
                />
                <Text style={styles.checkLabel}>Partial Payment Received</Text>
              </TouchableOpacity>
              {partialPaymentReceived && (
                <View style={styles.discountInputRow}>
                  <Text style={styles.pricingLabel}>Amount (₹)</Text>
                  <TextInput
                    style={[styles.input, styles.discountInput]}
                    value={partialPaymentAmount ? String(partialPaymentAmount) : ''}
                    onChangeText={(t) => setPartialPaymentAmount(parseFloat(t) || 0)}
                    placeholder="0"
                    keyboardType="numeric"
                    placeholderTextColor={colors.gray600}
                  />
                </View>
              )}
              <TouchableOpacity
                style={[styles.checkRow, markAsPaid && styles.checkRowActive]}
                onPress={() => setMarkAsPaid(!markAsPaid)}
                disabled={partialPaymentReceived}
              >
                <Ionicons
                  name={markAsPaid ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={partialPaymentReceived ? colors.gray200 : colors.primary}
                  style={styles.checkIcon}
                />
                <Text style={[styles.checkLabel, partialPaymentReceived && styles.checkLabelDisabled]}>
                  Mark as Paid (Full Payment)
                </Text>
              </TouchableOpacity>
              <View style={[styles.pricingRow, styles.finalPriceRow]}>
                <Text style={styles.finalPriceLabel}>Final Price:</Text>
                <Text style={styles.finalPriceValue}>₹{finalPrice.toLocaleString('en-IN')}</Text>
              </View>
            </View>
          )}

          {/* Total Amount */}
          <Text style={styles.label}>Total Amount (₹) *</Text>
          <TextInput
            style={styles.input}
            value={totalAmount}
            onChangeText={setTotalAmount}
            placeholder="e.g. 3500"
            keyboardType="numeric"
            placeholderTextColor={colors.gray600}
          />

          {/* Passenger */}
          <Text style={styles.label}>Passenger Name *</Text>
          <TextInput
            style={styles.input}
            value={passengerName}
            onChangeText={setPassengerName}
            placeholder="Full name"
            placeholderTextColor={colors.gray600}
          />
          <Text style={styles.label}>Passenger Phone *</Text>
          <TextInput
            style={styles.input}
            value={passengerPhone}
            onChangeText={setPassengerPhone}
            placeholder="10-digit mobile"
            keyboardType="phone-pad"
            placeholderTextColor={colors.gray600}
          />
          <Text style={styles.label}>Passenger Email *</Text>
          <TextInput
            style={styles.input}
            value={passengerEmail}
            onChangeText={setPassengerEmail}
            placeholder="email@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor={colors.gray600}
          />
          <Text style={styles.label}>Additional Requirements</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={additionalRequirements}
            onChangeText={setAdditionalRequirements}
            placeholder="Optional notes"
            multiline
            numberOfLines={3}
            placeholderTextColor={colors.gray600}
          />

          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>Create Booking</Text>
            )}
          </TouchableOpacity>
          <View style={{ height: 24 }} />
        </ScrollView>
      </KeyboardAvoidingView>
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
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.foreground, textAlign: 'center' },
  keyboard: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.gray600,
    marginTop: 16,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.foreground,
  },
  inputHalf: { flex: 1 },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  dateTimeRow: { flexDirection: 'row', gap: 12 },
  tripTypeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  tripTypeBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  tripTypeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tripTypeText: { fontSize: 14, fontWeight: '500', color: colors.gray600 },
  tripTypeTextActive: { color: '#fff' },
  vehicleScroll: { marginBottom: 8 },
  vehicleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.gray200,
    marginRight: 8,
  },
  vehicleChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  vehicleChipCheck: { marginLeft: 6 },
  vehicleChipText: { fontSize: 14, fontWeight: '500', color: colors.gray600 },
  vehicleChipTextActive: { color: '#fff' },
  submitBtn: {
    marginTop: 24,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  tourSelect: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tourSelectText: { fontSize: 15, color: colors.foreground },
  tourSelectPlaceholder: { color: colors.gray600 },
  inputError: { borderColor: '#ef4444' },
  errorText: { fontSize: 12, color: '#ef4444', marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.gray200 },
  modalTitle: { fontSize: 18, fontWeight: '600', color: colors.foreground },
  tourItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  tourItemText: { fontSize: 15, color: colors.foreground },
  pricingSection: { backgroundColor: '#fff', borderRadius: 10, padding: 16, marginTop: 16, borderWidth: 1, borderColor: colors.gray200 },
  pricingTitle: { fontSize: 16, fontWeight: '600', color: colors.foreground, marginBottom: 12 },
  pricingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  pricingLabel: { fontSize: 14, color: colors.gray600 },
  pricingValue: { fontSize: 14, fontWeight: '600', color: colors.foreground },
  discountInputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
  discountInput: { flex: 1, maxWidth: 120 },
  discountSuffix: { fontSize: 14, color: colors.gray600 },
  checkRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10 },
  checkRowActive: { opacity: 0.9 },
  checkIcon: {},
  checkLabel: { fontSize: 14, color: colors.foreground },
  checkLabelDisabled: { color: colors.gray600 },
  finalPriceRow: { borderTopWidth: 1, borderTopColor: colors.gray200, marginTop: 12, paddingTop: 12 },
  finalPriceLabel: { fontSize: 15, fontWeight: '600', color: colors.foreground },
  finalPriceValue: { fontSize: 15, fontWeight: '700', color: colors.foreground },
});
