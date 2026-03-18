/**
 * Cab selection screen - matches web app design
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/core';
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
} from '../services/fareService';
import { tourAPI } from '../services/tourAPI';
import { colors, fonts } from '../theme/colors';
import type { RootStackParamList } from '../navigation/types';
import type { Location } from '../types';
import type { TripType } from '../types';

export type CabResultsParams = {
  pickupLocation: Location;
  dropLocation: Location | null;
  pickupDate: number;
  returnDate?: number;
  tripType: TripType;
  tripMode?: 'one-way' | 'round-trip';
  distance: number;
  duration: number;
  hourlyPackage?: string;
  tourId?: string;
  tourName?: string;
};

type Props = NativeStackScreenProps<RootStackParamList, 'CabResults'>;

export function CabResultsScreen({ route, navigation }: Props) {
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
  } = route.params;
  const pickupDate = new Date(pickupDateTs);
  const returnDate = returnDateTs ? new Date(returnDateTs) : null;

  const [vehicles, setVehicles] = useState<any[]>([]);
  const [fares, setFares] = useState<Record<string, { basePrice: number; pricePerKm: number; driverAllowance: number }>>({});
  const [localMatrix, setLocalMatrix] = useState<LocalPackageMatrix | null>(null);
  const [airportFares, setAirportFares] = useState<Record<string, import('../services/fareService').AirportFare> | null>(null);
  const [tourPricing, setTourPricing] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Refetch on focus so backend fare updates reflect when user enters/returns to this screen
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      (async () => {
        try {
          const vList = await loadVehicles();
          if (!cancelled) setVehicles(vList);

          if (tripType === 'local') {
            const { matrix } = await getLocalPackageFares();
            if (!cancelled) setLocalMatrix(matrix);
          } else if (tripType === 'airport') {
            const [fMap, aMap] = await Promise.all([getOutstationFares(), getAirportFares()]);
            if (!cancelled) {
              setFares(fMap);
              setAirportFares(Object.keys(aMap).length > 0 ? aMap : null);
            }
          } else if (tripType === 'outstation') {
            const fMap = await getOutstationFares();
            if (!cancelled) {
              setFares(fMap);
              setAirportFares(null);
            }
          } else if (tripType === 'tour' && tourId) {
            const [tours, fMap] = await Promise.all([
              tourAPI.getAvailableTours(),
              getOutstationFares(),
            ]);
            if (!cancelled) {
              setFares(fMap);
              const tour = tours.find((t) => t.id === tourId);
              if (tour?.pricing && Object.keys(tour.pricing).length > 0) {
                setTourPricing(tour.pricing);
              }
            }
          } else {
            const fMap = await getOutstationFares();
            if (!cancelled) {
              setFares(fMap);
              setAirportFares(null);
            }
          }
        } catch {
          if (!cancelled) {
            setVehicles([]);
            setFares({});
            setAirportFares(null);
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => { cancelled = true; };
    }, [tripType, tourId])
  );

  const getFareForVehicle = (vehicle: { id?: string; vehicleId?: string; name?: string }): number => {
    const name = String(vehicle.name || vehicle.id || vehicle.vehicleId || 'sedan');

    if (tripType === 'local' && localMatrix) {
      const vehicleId = String(vehicle.id || vehicle.vehicleId || '').trim();
      return calculateLocalFare(localMatrix, hourlyPackage, name, vehicleId || undefined);
    }
    if (tripType === 'airport') {
      const vehicleId = String(vehicle.id || vehicle.vehicleId || '').trim();
      return calculateAirportFare(name, distance, airportFares, vehicleId || undefined);
    }
    if (tripType === 'tour' && tourPricing && Object.keys(tourPricing).length > 0) {
      const n = name.toLowerCase();
      const id = String(vehicle.id || vehicle.vehicleId || '').toLowerCase().replace(/-/g, '_').trim();
      // Try exact keys: vehicle id, name variants, and known mappings (match tour_fare_rates vehicle_id)
      const keysToTry = [
        id,
        n,
        n.replace(/\s+/g, '_'),
        n.replace(/-/g, '_'),
        (n.includes('swift') || n.includes('dzire')) ? 'sedan' : null,
        n.includes('glanza') ? 'toyota_glanza' : null,
        n.includes('glanza') ? 'glanza' : null,
        n.includes('ertiga') ? 'ertiga' : null,
        n.includes('innova') ? 'innova_crysta' : null,
        n.includes('tempo') ? 'tempo_traveller' : null,
        n.includes('tempo') ? 'tempo' : null,
      ].filter(Boolean) as string[];
      for (const k of keysToTry) {
        const price = tourPricing[k];
        if (typeof price === 'number' && price > 0) return price;
      }
      for (const [pKey, pVal] of Object.entries(tourPricing)) {
        if ((n.includes(pKey.toLowerCase()) || pKey.toLowerCase().includes(n.split(' ')[0] || n)) && pVal > 0)
          return pVal;
      }
      // Vehicle not in tour pricing - fall back to outstation to avoid showing 0
    }

    const id = String(vehicle.id || vehicle.vehicleId || '').toLowerCase().replace(/-/g, '_').trim();
    const nameKey = name.toLowerCase().replace(/\s+/g, '_');
    const fare =
      fares[id] ||
      fares[nameKey] ||
      fares[name.toLowerCase()] ||
      (name.toLowerCase().includes('swift') || name.toLowerCase().includes('dzire') ? fares['sedan'] : null) ||
      (name.toLowerCase().includes('glanza') ? fares['glanza'] || fares['toyota_glanza'] || fares['toyota'] || fares['sedan'] : null) ||
      (name.toLowerCase().includes('amaze') ? fares['amaze'] || fares['sedan'] : null) ||
      (name.toLowerCase().includes('ertiga') ? fares['ertiga'] : null) ||
      (name.toLowerCase().includes('innova') ? fares['innova_crysta'] : null) ||
      (name.toLowerCase().includes('tempo') ? fares['tempo_traveller'] || fares['tempo'] : null) ||
      (name.toLowerCase().includes('luxury') ? fares['luxury'] : null) ||
      fares['sedan'];
    if (!fare || (fare.basePrice <= 0 && fare.pricePerKm <= 0)) return 0;
    // Only use round-trip fare when we have return date - prevents wrong fare when tripMode
    // is round-trip but returnDate wasn't passed (e.g. one-way flow)
    if (tripType === 'outstation' && tripMode === 'round-trip' && returnDate) {
      return calculateOutstationRoundTripFare(fare, distance, pickupDate, returnDate);
    }
    return calculateOutstationFare(fare, distance);
  };

  const dropName =
    tripType === 'tour' && tourName ? tourName : (dropLocation?.name || pickupLocation.name);
  const durationHrs = Math.round(duration / 60) || 4;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header - match web: logo + menu */}
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

      {/* Progress steps - match web with connectors */}
      <View style={styles.progress}>
        <Text style={[styles.progressStep, styles.progressActive]}>1. Select Vehicle</Text>
        <View style={styles.progressConnector} />
        <Text style={styles.progressStep}>2. Passenger Info</Text>
        <View style={styles.progressConnector} />
        <Text style={styles.progressStep}>3. Payment</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Trip summary card - match web: light bg, Origin → Destination, Edit button */}
        <View style={styles.tripCard}>
          <View style={styles.tripRow}>
            <View style={styles.tripRoute}>
              {tripType === 'local' ? (
                <Text style={styles.tripFrom} numberOfLines={1}>
                  {pickupLocation.name} • {hourlyPackage === '10hrs-100km' ? '10 Hrs / 100 KM' : '8 Hrs / 80 KM'}
                </Text>
              ) : (
                <>
                  <Text style={styles.tripFrom} numberOfLines={1}>{pickupLocation.name}</Text>
                  <Feather name="chevron-right" size={16} color="#9ca3af" style={styles.tripChevron} />
                  <Text style={styles.tripTo} numberOfLines={1}>{dropName}</Text>
                </>
              )}
            </View>
            <TouchableOpacity style={styles.editBtn} onPress={() => navigation.goBack()}>
              <Feather name="edit-2" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.tripDateTime}>
            {pickupDate.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}, {pickupDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            {tripMode === 'round-trip' && returnDate && (
              <>
                {' • Return: '}
                {returnDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, {returnDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </>
            )}
          </Text>
        </View>

        {/* Rates line - varies by trip type */}
        <Text style={styles.ratesLine}>
          {tripType === 'local'
            ? `Rates for ${hourlyPackage === '10hrs-100km' ? '10 Hrs / 100 KM' : '8 Hrs / 80 KM'} package`
            : tripType === 'tour' && tourName
              ? `Rates for ${tourName} (${distance} km)`
              : tripMode === 'round-trip'
                ? `Rates for ${distance || 0} × 2 = ${(distance || 0) * 2} Kms round trip | ${durationHrs * 2} hr(s) approx`
                : `Rates for ${distance || 0} Kms approx distance | ${durationHrs} hr(s) approx time`}
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
        ) : (
          <View style={styles.cabList}>
            {vehicles.map((v) => {
              const vid = v.id || v.vehicleId || '';
              const fare = getFareForVehicle(v);
              const isExpanded = expandedId === vid;
              const handleCardPress = () => {
                navigation.navigate('BookingSummary', {
                  pickupLocation,
                  dropLocation,
                  pickupDate: pickupDateTs,
                  returnDate: returnDateTs,
                  tripType,
                  tripMode,
                  distance,
                  duration,
                  hourlyPackage: tripType === 'local' ? hourlyPackage : undefined,
                  tourId: tripType === 'tour' ? tourId : undefined,
                  tourName: tripType === 'tour' ? tourName : undefined,
                  selectedVehicle: {
                    id: vid,
                    name: v.name || 'Cab',
                    capacity: v.capacity,
                    amenities: v.amenities,
                    image: v.image,
                  },
                  totalPrice: fare,
                });
              };
              return (
                <View key={vid} style={styles.cabCard}>
                  <TouchableOpacity
                    style={styles.cabRow}
                    onPress={handleCardPress}
                    activeOpacity={0.9}
                  >
                    {/* Left: Car image */}
                    {v.image ? (
                      <Image source={{ uri: v.image }} style={styles.cabImage} />
                    ) : (
                      <View style={[styles.cabImage, styles.cabImagePlaceholder]}>
                        <Text style={styles.cabImageText}>🚗</Text>
                      </View>
                    )}
                    {/* Center: Name, specs, amenities */}
                    <View style={styles.cabInfo}>
                      <Text style={styles.cabName}>{v.name || 'Cab'}</Text>
                      <Text style={styles.cabSpecs}>
                        {v.capacity || 4} Seats • {v.luggageCapacity ?? 2} Bags • {v.fuelType || 'Petrol'}
                      </Text>
                    </View>
                    {/* Right: Price only - match web (no Select button) */}
                    <View style={styles.cabRight}>
                      <Text style={styles.cabFare}>₹{fare > 0 ? fare.toLocaleString('en-IN') : '—'}</Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.viewDetails}
                    onPress={() => setExpandedId(isExpanded ? null : vid)}
                  >
                    <Text style={styles.viewDetailsText}>{isExpanded ? 'Hide Details' : 'View Details'}</Text>
                    <Feather name={isExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.primary} />
                  </TouchableOpacity>
                  {isExpanded && (
                    <View style={styles.expandedContent}>
                      <Text style={styles.expandedTitle}>Inclusions</Text>
                      <Text style={styles.expandedText}>• AC, Fuel, Driver charges included</Text>
                      <Text style={styles.expandedText}>• Toll charges as per actual</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {!loading && vehicles.length === 0 && (
          <Text style={styles.empty}>No cabs available. Please try again.</Text>
        )}
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
  progressConnector: {
    width: 12,
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: 4,
  },
  progressStep: {
    fontSize: 13,
    color: colors.gray600,
    fontFamily: fonts.medium,
  },
  progressActive: {
    color: colors.primary,
    fontFamily: fonts.bold,
    textDecorationLine: 'underline',
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  tripCard: {
    backgroundColor: '#f8faf5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e7d9',
    padding: 16,
    marginBottom: 8,
    ...(Platform.OS === 'web' ? { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' } : { elevation: 2 }),
  },
  tripRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  tripRoute: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  tripFrom: { fontSize: 14, fontFamily: fonts.bold, color: colors.foreground, flexShrink: 0 },
  tripChevron: { marginHorizontal: 2 },
  tripTo: { fontSize: 14, fontFamily: fonts.bold, color: colors.foreground, flex: 1, marginLeft: 0 },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  tripDateTime: { fontSize: 12, color: colors.mutedForeground, marginTop: 8, fontFamily: fonts.regular },
  ratesLine: {
    fontSize: 13,
    color: colors.gray600,
    marginBottom: 16,
    fontFamily: fonts.regular,
  },
  loader: { marginTop: 40 },
  cabList: { gap: 12, marginBottom: 8 },
  cabCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    marginBottom: 12,
    ...(Platform.OS === 'web' ? { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' } : { elevation: 2 }),
  },
  cabRow: { flexDirection: 'row', gap: 12 },
  cabImage: {
    width: 80,
    height: 60,
    borderRadius: 8,
    backgroundColor: colors.gray100,
  },
  cabImagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  cabImageText: { fontSize: 24 },
  cabInfo: { flex: 1, minWidth: 0, justifyContent: 'flex-start' },
  cabName: { fontSize: 15, fontFamily: fonts.bold, color: colors.foreground },
  cabRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  cabFare: { fontSize: 18, fontFamily: fonts.bold, color: colors.foreground },
  cabSpecs: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginTop: 4,
    fontFamily: fonts.regular,
  },
  viewDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
  },
  viewDetailsText: { fontSize: 13, color: colors.primary, fontFamily: fonts.semiBold },
  viewDetailsArrow: { fontSize: 10, color: colors.primary },
  expandedContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  expandedTitle: { fontSize: 13, fontFamily: fonts.semiBold, color: colors.foreground, marginBottom: 6 },
  expandedText: { fontSize: 12, color: colors.mutedForeground, marginBottom: 2, fontFamily: fonts.regular },
  empty: {
    fontSize: 16,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginTop: 24,
    fontFamily: fonts.regular,
  },
});
