/**
 * Booking Summary - trip details, selected vehicle, fare breakdown, Book Now
 * Matches web app design
 */
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Share,
  Platform,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/core';
import {
  calculateOutstationFareBreakdown,
  calculateOutstationRoundTripFare,
  calculateOutstationRoundTripBreakdown,
  getOutstationFares,
  getLocalPackageFares,
  getAirportFares,
  calculateLocalFare,
  calculateAirportFare,
  type LocalPackageMatrix,
} from '../services/fareService';
import { tourAPI } from '../services/tourAPI';
import { colors, fonts } from '../theme/colors';
import type { RootStackParamList } from '../navigation/types';
import type { Location } from '../types';
import type { TripType } from '../types';

export type BookingSummaryParams = {
  pickupLocation: Location;
  dropLocation: Location | null;
  pickupDate: number;
  returnDate?: number;
  tripType: TripType;
  tripMode?: 'one-way' | 'round-trip';
  distance: number;
  duration?: number;
  hourlyPackage?: string;
  tourId?: string;
  tourName?: string;
  selectedVehicle: {
    id: string;
    name: string;
    capacity?: number;
    amenities?: string[];
    image?: string;
  };
  totalPrice: number;
};

type Props = NativeStackScreenProps<RootStackParamList, 'BookingSummary'>;

function getFareForVehicle(
  fares: Record<string, { basePrice: number; pricePerKm: number; driverAllowance: number }>,
  vehicle: { id?: string; name?: string }
): { basePrice: number; pricePerKm: number; driverAllowance: number } | null {
  const id = String(vehicle.id || '').toLowerCase().replace(/-/g, '_').trim();
  const name = String(vehicle.name || '').toLowerCase();
  const fare =
    fares[id] ||
    fares[name.replace(/\s+/g, '_')] ||
    (name.includes('swift') || name.includes('dzire') ? fares['sedan'] : null) ||
    (name.includes('glanza') ? fares['glanza'] || fares['toyota_glanza'] || fares['toyota'] || fares['sedan'] : null) ||
    (name.includes('amaze') ? fares['amaze'] || fares['sedan'] : null) ||
    (name.includes('ertiga') ? fares['ertiga'] : null) ||
    (name.includes('innova') ? fares['innova_crysta'] : null) ||
    (name.includes('tempo') ? fares['tempo_traveller'] || fares['tempo'] : null) ||
    (name.includes('luxury') ? fares['luxury'] : null) ||
    fares['sedan'];
  return fare && (fare.basePrice > 0 || fare.pricePerKm > 0) ? fare : null;
}

export function BookingSummaryScreen({ route, navigation }: Props) {
  const {
    pickupLocation,
    dropLocation,
    pickupDate: pickupDateTs,
    returnDate: returnDateTs,
    tripType,
    tripMode = 'one-way',
    distance,
    duration,
    hourlyPackage = '8hrs-80km',
    tourId,
    tourName,
    selectedVehicle,
    totalPrice: passedTotalPrice,
  } = route.params;

  const [fares, setFares] = React.useState<Record<string, { basePrice: number; pricePerKm: number; driverAllowance: number }>>({});
  const [localMatrix, setLocalMatrix] = React.useState<LocalPackageMatrix | null>(null);
  const [airportFares, setAirportFares] = React.useState<Record<string, import('../services/fareService').AirportFare> | null>(null);
  const [tourPricing, setTourPricing] = React.useState<Record<string, number> | null>(null);
  const [paymentMode, setPaymentMode] = React.useState<'partial' | 'full'>(
    (route.params as { paymentMode?: 'partial' | 'full' }).paymentMode ?? 'partial'
  );

  const loadFares = React.useCallback(async () => {
    if (tripType === 'local') {
      const { matrix } = await getLocalPackageFares();
      setLocalMatrix(matrix);
    } else if (tripType === 'airport') {
      const aMap = await getAirportFares();
      setAirportFares(Object.keys(aMap).length > 0 ? aMap : null);
    } else if (tripType === 'tour' && tourId) {
      const tours = await tourAPI.getAvailableTours();
      const tour = tours.find((t) => t.id === tourId);
      if (tour?.pricing) setTourPricing(tour.pricing);
    }
    const fMap = await getOutstationFares();
    setFares(fMap);
  }, [tripType, tourId]);

  React.useEffect(() => {
    loadFares();
  }, [loadFares]);

  useFocusEffect(React.useCallback(() => {
    loadFares();
  }, [loadFares]));

  const pickupDate = new Date(pickupDateTs);
  const returnDate = returnDateTs ? new Date(returnDateTs) : null;
  const fareData = getFareForVehicle(fares, selectedVehicle);
  // Only treat as round-trip when we have BOTH tripMode and returnDate - prevents showing
  // round-trip extra distance (e.g. 398 KM) when UI displays one-way total (349 KM)
  const isOutstationRoundTrip =
    tripType === 'outstation' && tripMode === 'round-trip' && returnDate != null;
  const outstationBreakdown =
    fareData && tripType === 'outstation' && !isOutstationRoundTrip
      ? calculateOutstationFareBreakdown(fareData, distance)
      : null;
  const roundTripBreakdown =
    fareData && isOutstationRoundTrip && returnDate
      ? calculateOutstationRoundTripBreakdown(
          fareData,
          distance,
          pickupDate,
          returnDate
        )
      : null;
  const roundTripTotal = roundTripBreakdown?.totalFare ?? 0;

  const isSimpleFare = tripType === 'local' || tripType === 'airport' || tripType === 'tour';
  const computedTotal =
    tripType === 'local' && localMatrix
      ? calculateLocalFare(localMatrix, hourlyPackage, selectedVehicle.name || '', selectedVehicle.id || undefined)
      : tripType === 'airport'
        ? calculateAirportFare(selectedVehicle.name || '', distance, airportFares, selectedVehicle.id || undefined)
        : tripType === 'tour' && tourPricing
          ? (() => {
              const name = (selectedVehicle.name || '').toLowerCase();
              for (const [k, v] of Object.entries(tourPricing)) {
                if (name.includes(k.toLowerCase()) && v > 0) return v;
              }
              return Object.values(tourPricing)[0] ?? 0;
            })()
          : 0;

  // Use computed/breakdown total so displayed Total Price matches the sum of fare components
  const totalPrice =
    isOutstationRoundTrip
      ? (roundTripBreakdown ? roundTripBreakdown.totalFare : passedTotalPrice) || computedTotal
      : outstationBreakdown
        ? outstationBreakdown.total
        : passedTotalPrice > 0
          ? passedTotalPrice
          : computedTotal;
  const breakdown = isSimpleFare ? null : outstationBreakdown;

  const dropName =
    tripType === 'tour' && tourName ? tourName : (dropLocation?.name || pickupLocation.name);

  const partialAmount = Math.round(totalPrice * 0.3);
  const payAmount = paymentMode === 'partial' ? partialAmount : totalPrice;

  const handleShareWhatsApp = () => {
    const tripLabel =
      tripType === 'outstation'
        ? tripMode === 'round-trip'
          ? 'Outstation Round-Trip'
          : 'Outstation One-Way'
        : tripType === 'local'
          ? 'Local'
          : tripType === 'airport'
            ? 'Airport'
            : tripType === 'tour'
              ? tourName || 'Tour'
              : 'Taxi';
    const text =
      `${tripLabel} Booking\n\n` +
      `From: ${pickupLocation.name}\n` +
      `To: ${dropName}\n` +
      `Date: ${pickupDate.toLocaleString('en-IN')}` +
      (returnDate ? `\nReturn: ${returnDate.toLocaleString('en-IN')}` : '') +
      `\nVehicle: ${selectedVehicle.name}\n` +
      `Distance: ${distance} KM` +
      (isOutstationRoundTrip ? ' × 2 (round trip)' : '') +
      `\nTotal: ₹${totalPrice.toLocaleString('en-IN')}`;
    Share.share({
      message: text,
      title: 'Booking Summary',
    }).catch(() => {});
  };

  const handleBookNow = () => {
    navigation.navigate('PassengerInfo', {
      pickupLocation,
      dropLocation,
      pickupDate: pickupDateTs,
      returnDate: returnDateTs,
      tripType,
      tripMode: tripType === 'outstation' ? tripMode : undefined,
      distance,
      duration,
      hourlyPackage: tripType === 'local' ? hourlyPackage : undefined,
      tourId: tripType === 'tour' ? tourId : undefined,
      tourName: tripType === 'tour' ? tourName : undefined,
      selectedVehicle,
      totalPrice,
      paymentMode,
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Image
          source={{ uri: 'https://www.vizagtaxihub.com/uploads/vizagtaxihub-logo.png' }}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={styles.menuBtn} />
      </View>

      {/* Progress - step 1 active (reviewing selection), step 2 next - match web */}
      <View style={styles.progress}>
        <Text style={[styles.progressStep, styles.progressActive]}>1. Select Vehicle</Text>
        <View style={styles.progressConnector} />
        <Text style={styles.progressStep}>2. Passenger Info</Text>
        <View style={styles.progressConnector} />
        <Text style={styles.progressStep}>3. Payment</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Booking Summary - match web header */}
        <Text style={styles.sectionTitle}>Booking Summary</Text>

        {/* Trip details card - web layout: TRIP TYPE, TOTAL DISTANCE, PICKUP, DROP-OFF, PICKUP DATE */}
        <View style={styles.tripCard}>
          <View style={styles.tripRow}>
            <Feather name="calendar" size={16} color="#2563eb" style={styles.tripIconWrap} />
            <View style={styles.tripLoc}>
              <Text style={styles.tripLabel}>TRIP TYPE</Text>
              <Text style={styles.tripAddress}>
                {tripType === 'outstation'
                  ? tripMode === 'round-trip'
                    ? 'Outstation (Round Trip)'
                    : 'Outstation (One-Way)'
                  : tripType === 'local'
                    ? `Local (${hourlyPackage === '10hrs-100km' ? '10 Hrs / 100 KM' : '8 Hrs / 80 KM'})`
                    : tripType === 'airport'
                      ? 'Airport Transfer'
                      : tripType === 'tour' && tourName
                        ? tourName
                        : tripType}
              </Text>
            </View>
          </View>
          <View style={styles.tripDivider} />
          <View style={styles.tripRow}>
            <Feather name="map-pin" size={16} color="#2563eb" style={styles.tripIconWrap} />
            <View style={styles.tripLoc}>
              <Text style={styles.tripLabel}>
                {isOutstationRoundTrip ? 'ACTUAL DISTANCE' : 'TOTAL DISTANCE'}
              </Text>
              <Text style={styles.tripAddress}>
                {tripType === 'local'
                  ? hourlyPackage === '10hrs-100km'
                    ? '10 Hrs / 100 KM'
                    : '8 Hrs / 80 KM'
                  : isOutstationRoundTrip
                    ? `${distance * 2} KM`
                    : `${distance} KM`}
              </Text>
            </View>
          </View>
          <View style={styles.tripDivider} />
          <View style={styles.tripRow}>
            <Feather name="map-pin" size={16} color="#2563eb" style={styles.tripIconWrap} />
            <View style={styles.tripLoc}>
              <Text style={styles.tripLabel}>PICKUP</Text>
              <Text style={styles.tripAddress}>{pickupLocation.name}</Text>
              {pickupLocation.address ? (
                <Text style={styles.tripSub}>{pickupLocation.address}</Text>
              ) : null}
            </View>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.editBtn}>
              <Text style={styles.editIcon}>✎</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.tripDivider} />
          <View style={styles.tripRow}>
            <Feather name="map-pin" size={16} color="#dc2626" style={styles.tripIconWrap} />
            <View style={styles.tripLoc}>
              <Text style={styles.tripLabel}>DROP-OFF</Text>
              <Text style={styles.tripAddress}>
                {tripType === 'local' ? 'Local package (pickup only)' : dropName}
              </Text>
            </View>
          </View>
          <View style={styles.tripDivider} />
          <View style={styles.tripRow}>
            <Feather name="calendar" size={16} color="#2563eb" style={styles.tripIconWrap} />
            <View style={styles.tripLoc}>
              <Text style={styles.tripLabel}>PICKUP DATE</Text>
              <Text style={styles.tripAddress}>
                {pickupDate.toLocaleDateString('en-IN', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}{' '}
                - {pickupDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.editBtn}>
              <Text style={styles.editIcon}>✎</Text>
            </TouchableOpacity>
          </View>
          {returnDate && isOutstationRoundTrip ? (
            <>
              <View style={styles.tripDivider} />
              <View style={styles.tripRow}>
                <Feather name="calendar" size={16} color="#2563eb" style={styles.tripIconWrap} />
                <View style={styles.tripLoc}>
                  <Text style={styles.tripLabel}>RETURN DATE</Text>
                  <Text style={styles.tripAddress}>
                    {returnDate.toLocaleDateString('en-IN', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}{' '}
                    - {returnDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
            </>
          ) : null}
        </View>

        {/* Vehicle card - web uses bg-blue-50 (light blue) */}
        <View style={styles.vehicleCard}>
          {selectedVehicle.image ? (
            <Image source={{ uri: selectedVehicle.image }} style={styles.vehicleImage} />
          ) : (
            <View style={[styles.vehicleImage, styles.vehicleImagePlaceholder]}>
              <Text style={styles.vehiclePlaceholderText}>🚗</Text>
            </View>
          )}
          <View style={styles.vehicleInfo}>
            <Text style={styles.vehicleName}>{selectedVehicle.name}</Text>
            <View style={styles.vehicleSpecs}>
              <Text style={styles.vehicleSpec}>
                {selectedVehicle.capacity ?? 4} Seats
              </Text>
              <Text style={styles.vehicleSpec}>AC</Text>
            </View>
          </View>
        </View>

        {/* Fare breakdown - outstation has line items; local/airport/tour/round-trip show total */}
        {(breakdown || roundTripBreakdown || (isSimpleFare && totalPrice > 0) || (isOutstationRoundTrip && totalPrice > 0)) && (
          <View style={styles.fareCard}>
            {breakdown ? (
              <>
                <View style={styles.fareRow}>
                  <Text style={styles.fareLabel}>Base fare</Text>
                  <Text style={styles.fareValue} numberOfLines={1}>
                    ₹{breakdown.basePrice.toLocaleString('en-IN')}
                  </Text>
                </View>
                <View style={styles.fareRow}>
                  <Text style={styles.fareLabel}>Driver allowance</Text>
                  <Text style={styles.fareValue} numberOfLines={1}>
                    ₹{breakdown.driverAllowance.toLocaleString('en-IN')}
                  </Text>
                </View>
                {breakdown.extraDistanceFare > 0 && (
                  <View style={styles.fareRow}>
                    <Text style={styles.fareLabel}>
                      Extra distance charges ({breakdown.extraKmDisplay} KM)
                    </Text>
                    <Text style={styles.fareValue} numberOfLines={1}>
                      ₹{breakdown.extraDistanceFare.toLocaleString('en-IN')}
                    </Text>
                  </View>
                )}
                <View style={styles.fareDivider} />
              </>
            ) : roundTripBreakdown ? (
              <>
                <View style={styles.fareRow}>
                  <Text style={styles.fareLabel}>Base fare</Text>
                  <Text style={styles.fareValue} numberOfLines={1}>
                    ₹{Math.round(roundTripBreakdown.baseFare).toLocaleString('en-IN')}
                  </Text>
                </View>
                <View style={styles.fareRow}>
                  <Text style={styles.fareLabel}>Driver allowance</Text>
                  <Text style={styles.fareValue} numberOfLines={1}>
                    ₹{roundTripBreakdown.driverAllowance.toLocaleString('en-IN')}
                  </Text>
                </View>
                {roundTripBreakdown.extraDistanceCharges > 0 && (
                  <View style={styles.fareRow}>
                    <Text style={styles.fareLabel}>
                      Extra distance charges ({Math.round(roundTripBreakdown.extraDistance)} KM)
                    </Text>
                    <Text style={styles.fareValue} numberOfLines={1}>
                      ₹{Math.round(roundTripBreakdown.extraDistanceCharges).toLocaleString('en-IN')}
                    </Text>
                  </View>
                )}
                {roundTripBreakdown.nightAllowance > 0 && (
                  <View style={styles.fareRow}>
                    <Text style={styles.fareLabel}>Night halt charges</Text>
                    <Text style={styles.fareValue} numberOfLines={1}>
                      ₹{roundTripBreakdown.nightAllowance.toLocaleString('en-IN')}
                    </Text>
                  </View>
                )}
                <View style={styles.fareDivider} />
              </>
            ) : null}
            <View style={styles.fareRow}>
              <Text style={styles.fareTotalLabel}>Total Price</Text>
              <Text style={styles.fareTotalValue} numberOfLines={1}>
                ₹{totalPrice.toLocaleString('en-IN')}
              </Text>
            </View>
          </View>
        )}

        {/* Share on WhatsApp - proper WhatsApp icon */}
        <TouchableOpacity style={styles.whatsappBtn} onPress={handleShareWhatsApp} activeOpacity={0.8}>
          <MaterialCommunityIcons name="whatsapp" size={18} color="#fff" />
          <Text style={styles.whatsappText}>Share on WhatsApp</Text>
        </TouchableOpacity>
        <Text style={styles.disclaimer}>Parking and tolls fees are extra.</Text>
      </ScrollView>

      {/* MakeMyTrip-style sticky bottom bar: Part Pay / Full Pay + BOOK NOW */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomBanner}>
          <Feather name="check-circle" size={12} color="#0d9488" />
          <Text style={styles.bottomBannerText}>
            Pay ₹{partialAmount.toLocaleString('en-IN')} in advance to reserve, rest to driver. Toll and parking as per actual.
          </Text>
        </View>
        <View style={styles.bottomPaymentBar}>
          <View style={styles.paymentOptionsRow}>
            <TouchableOpacity
              style={[styles.paymentOptionChip, paymentMode === 'partial' && styles.paymentOptionChipSelected]}
              onPress={() => setPaymentMode('partial')}
              activeOpacity={0.8}
            >
              <View style={[styles.radioChip, paymentMode === 'partial' && styles.radioChipSelected]} />
              <Text style={[styles.paymentOptionChipLabel, paymentMode === 'partial' && styles.paymentOptionChipLabelSelected]}>Part Pay</Text>
              <Text style={[styles.paymentOptionChipAmount, paymentMode === 'partial' && styles.paymentOptionChipAmountSelected]} numberOfLines={1}>₹{partialAmount.toLocaleString('en-IN')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.paymentOptionChip, paymentMode === 'full' && styles.paymentOptionChipSelected]}
              onPress={() => setPaymentMode('full')}
              activeOpacity={0.8}
            >
              <View style={[styles.radioChip, paymentMode === 'full' && styles.radioChipSelected]} />
              <Text style={[styles.paymentOptionChipLabel, paymentMode === 'full' && styles.paymentOptionChipLabelSelected]}>Full Pay</Text>
              <Text style={[styles.paymentOptionChipAmount, paymentMode === 'full' && styles.paymentOptionChipAmountSelected]} numberOfLines={1}>₹{totalPrice.toLocaleString('en-IN')}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.payNowBtn, totalPrice <= 0 && styles.payNowBtnDisabled]}
            onPress={handleBookNow}
            disabled={totalPrice <= 0}
          >
            <Text style={styles.payNowBtnText}>BOOK NOW</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    borderBottomColor: colors.border,
  },
  backBtn: { padding: 8 },
  backText: { fontSize: 20, color: colors.primary, fontFamily: fonts.semiBold },
  logo: { width: 100, height: 36 },
  menuBtn: { padding: 8 },
  menuIcon: { fontSize: 22, color: colors.foreground, fontFamily: fonts.regular },
  progress: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  progressStep: { fontSize: 13, color: colors.gray600, fontFamily: fonts.medium },
  progressActive: { color: colors.primary, fontFamily: fonts.bold, textDecorationLine: 'underline' },
  progressConnector: { width: 12, height: 2, backgroundColor: colors.border, marginHorizontal: 4 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 140 },
  sectionTitle: {
    fontSize: 20,
    fontFamily: fonts.bold,
    color: colors.foreground,
    marginBottom: 16,
  },
  tripCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    marginBottom: 12,
    ...(Platform.OS === 'web' ? { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' } : { elevation: 2 }),
  },
  tripRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  tripDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 12,
    marginLeft: 26,
  },
  tripIconWrap: { marginRight: 10, marginTop: 2 },
  tripLoc: { flex: 1, minWidth: 0 },
  tripLabel: {
    fontSize: 11,
    color: colors.gray600,
    fontFamily: fonts.semiBold,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  tripValue: { fontSize: 16, fontFamily: fonts.bold, color: colors.foreground },
  tripAddress: { fontSize: 14, fontFamily: fonts.semiBold, color: colors.foreground },
  tripSub: { fontSize: 12, color: colors.mutedForeground, marginTop: 2, fontFamily: fonts.regular },
  editBtn: { padding: 4, marginLeft: 8 },
  editIcon: { color: '#6b7280', fontSize: 14, fontFamily: fonts.regular },
  vehicleCard: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    ...(Platform.OS === 'web' ? { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' } : { elevation: 2 }),
  },
  vehicleImage: {
    width: 80,
    height: 60,
    borderRadius: 8,
    backgroundColor: colors.gray100,
    marginRight: 12,
  },
  vehicleImagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  vehiclePlaceholderText: { fontSize: 28 },
  vehicleInfo: { flex: 1 },
  vehicleName: { fontSize: 16, fontFamily: fonts.bold, color: colors.foreground },
  vehicleSpecs: { flexDirection: 'row', gap: 12, marginTop: 6 },
  vehicleSpec: { fontSize: 13, color: colors.mutedForeground, fontFamily: fonts.regular },
  fareCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
    ...(Platform.OS === 'web' ? { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' } : { elevation: 2 }),
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fareLabel: { fontSize: 14, color: '#4b5563', flex: 1, fontFamily: fonts.regular },
  fareValue: { fontSize: 14, fontFamily: fonts.semiBold, color: colors.foreground, marginLeft: 8, minWidth: 70, textAlign: 'right' },
  fareDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  fareTotalLabel: { fontSize: 15, fontFamily: fonts.bold, color: colors.foreground, flex: 1 },
  fareTotalValue: { fontSize: 16, fontFamily: fonts.bold, color: colors.primary, marginLeft: 8, minWidth: 70, textAlign: 'right' },
  whatsappBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    backgroundColor: '#25D366',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 8,
    gap: 8,
  },
  whatsappIcon: { fontSize: 18 },
  whatsappText: { fontSize: 15, fontFamily: fonts.semiBold, color: '#fff' },
  disclaimer: { fontSize: 12, color: colors.mutedForeground, marginBottom: 24, fontFamily: fonts.regular },
  // MakeMyTrip-style sticky bottom bar (compact)
  bottomBar: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 16 : 10,
    paddingTop: 6,
  },
  bottomBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ccfbf1',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginBottom: 5,
    gap: 5,
  },
  bottomBannerText: {
    fontSize: 11,
    color: '#0d9488',
    fontFamily: fonts.medium,
    flex: 1,
  },
  bottomPaymentBar: {
    flexDirection: 'column',
    backgroundColor: '#374151',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 6,
  },
  paymentOptionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  paymentOptionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderRadius: 6,
    backgroundColor: '#4b5563',
    flex: 1,
    minWidth: 0,
  },
  paymentOptionChipSelected: {
    backgroundColor: colors.primary,
  },
  radioChip: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  radioChipSelected: { borderColor: '#fff', backgroundColor: colors.primary },
  paymentOptionChipLabel: { fontSize: 11, fontFamily: fonts.semiBold, color: 'rgba(255,255,255,0.9)' },
  paymentOptionChipLabelSelected: { color: '#fff' },
  paymentOptionChipAmount: { fontSize: 11, fontFamily: fonts.bold, color: 'rgba(255,255,255,0.9)' },
  paymentOptionChipAmountSelected: { color: '#fff' },
  bottomTotal: { flex: 1 },
  bottomTotalLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontFamily: fonts.medium },
  bottomTotalValue: { fontSize: 20, fontFamily: fonts.bold, color: '#fff', marginTop: 2 },
  payNowBtn: {
    alignSelf: 'stretch',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payNowBtnDisabled: { backgroundColor: colors.gray600, opacity: 0.6 },
  payNowBtnText: { fontSize: 16, fontFamily: fonts.bold, color: '#fff', letterSpacing: 1, textTransform: 'uppercase' },
});
