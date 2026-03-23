/**
 * Fleet Vehicles tab - shows available vehicles in the fleet
 * Two vehicles per row. Rate card opens a bottom sheet with local, outstation, airport, tour fares.
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Platform,
  Modal,
  Pressable,
  Animated,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/core';
import { useNavigation } from '@react-navigation/core';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme/colors';
import { loadVehicles, type Vehicle } from '../services/vehiclesAPI';
import {
  getLocalPackageFares,
  getAirportFares,
  calculateLocalFare,
  calculateAirportFare,
} from '../services/fareService';
import { tourAPI } from '../services/tourAPI';

const CARD_GAP = 12;
const HORIZONTAL_PADDING = 32; // 16 * 2 (padding left + right)
const SAMPLE_OUTSTATION_KM = 300;
const SAMPLE_AIRPORT_KM = 20;

export function FleetVehiclesScreen() {
  const { width } = useWindowDimensions();
  const cardWidth = Math.floor((width - HORIZONTAL_PADDING - CARD_GAP) / 2);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [fareDetails, setFareDetails] = useState<{
    local: number;
    outstation: number;
    airport: number;
    tour: number;
  } | null>(null);
  const [fareLoading, setFareLoading] = useState(false);
  const slideAnim = useRef(new Animated.Value(400)).current;
  const navigation = useNavigation<any>();

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      loadVehicles()
        .then((v) => {
          if (!cancelled) setVehicles(v);
        })
        .catch(() => {
          if (!cancelled) setVehicles([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => { cancelled = true; };
    }, [])
  );

  useEffect(() => {
    if (sheetVisible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      slideAnim.setValue(400);
    }
  }, [sheetVisible, slideAnim]);

  const closeSheet = () => {
    Animated.timing(slideAnim, {
      toValue: 400,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setSheetVisible(false);
      setSelectedVehicle(null);
      setFareDetails(null);
    });
  };

  const openFareSheet = async (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setSheetVisible(true);
    setFareDetails(null);
    setFareLoading(true);
    try {
      const [localFares, airportFares, tours] = await Promise.all([
        getLocalPackageFares(),
        getAirportFares(),
        tourAPI.getAvailableTours(),
      ]);

      const outstationVal = vehicle.price || 0;
      const localVal = calculateLocalFare(
        localFares.matrix,
        '8hrs-80km',
        vehicle.name,
        vehicle.id
      );
      const airportVal = calculateAirportFare(
        vehicle.name,
        SAMPLE_AIRPORT_KM,
        Object.keys(airportFares).length > 0 ? airportFares : undefined,
        vehicle.id
      );

      let tourVal = 0;
      const name = (vehicle.name || '').toLowerCase();
      const vid = String(vehicle.id || '').toLowerCase().replace(/-/g, '_');
      const priceKeys = [
        vid,
        name.replace(/\s+/g, '_'),
        ...(name.includes('innova') ? ['innova_crysta', 'innova'] : []),
        ...(name.includes('swift') || name.includes('dzire') ? ['sedan', 'swift_dzire'] : []),
        ...(name.includes('ertiga') ? ['ertiga'] : []),
        ...(name.includes('tempo') ? ['tempo_traveller', 'tempo'] : []),
        ...(name.includes('glanza') ? ['toyota_glanza', 'glanza'] : []),
        ...(name.includes('amaze') ? ['amaze', 'sedan'] : []),
      ];
      for (const tour of tours) {
        const pricing = tour.pricing || {};
        for (const k of priceKeys) {
          const p = pricing[k];
          if (typeof p === 'number' && p > 0) {
            tourVal = tourVal === 0 ? p : Math.min(tourVal, p);
            break;
          }
        }
      }

      setFareDetails({
        local: localVal,
        outstation: outstationVal,
        airport: airportVal,
        tour: tourVal,
      });
    } catch {
      setFareDetails({ local: 0, outstation: 0, airport: 0, tour: 0 });
    } finally {
      setFareLoading(false);
    }
  };

  const bookForTripType = (tripType: 'local' | 'outstation' | 'airport' | 'tour') => {
    closeSheet();
    navigation.navigate('Main', { screen: 'Home', params: { initialTripType: tripType === 'tour' ? 'tour' : tripType } });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Fleet Vehicles</Text>
        <Text style={styles.subtitle}>Our cab fleet for your journey</Text>
      </View>
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
        >
          {vehicles.map((v) => (
            <View key={v.id} style={[styles.card, { width: cardWidth }]}>
              {v.image ? (
                <Image source={{ uri: v.image }} style={styles.cardImage} resizeMode="cover" />
              ) : (
                <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
                  <MaterialCommunityIcons name="car-side" size={40} color={colors.gray400} />
                </View>
              )}
              <View style={styles.cardContent}>
                <Text style={styles.cardName} numberOfLines={1}>{v.name}</Text>
                <View style={styles.rateCardRow}>
                  <Text style={styles.bookLink} onPress={() => openFareSheet(v)}>
                    Rate card →
                  </Text>
                  <View style={styles.specsRow}>
                    <MaterialCommunityIcons name="seat-passenger" size={12} color={colors.gray500} />
                    <Text style={styles.specsText}>{v.capacity || 4}</Text>
                    <MaterialCommunityIcons name="bag-suitcase-outline" size={12} color={colors.gray500} />
                    <Text style={styles.specsText}>{(v as any).luggageCapacity ?? 2}</Text>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <Modal visible={sheetVisible} transparent animationType="fade">
        <Pressable style={styles.sheetOverlay} onPress={closeSheet}>
          <Animated.View style={[styles.sheetPane, { transform: [{ translateY: slideAnim }] }]}>
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View style={styles.sheetHandleBar} />
              <View style={styles.sheetHeaderRow}>
                <Text style={styles.sheetTitle}>{selectedVehicle?.name} – Fare Details</Text>
                <TouchableOpacity
                  onPress={closeSheet}
                  style={styles.sheetCloseIcon}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Feather name="x" size={24} color={colors.gray600} />
                </TouchableOpacity>
              </View>
              <Text style={styles.sheetSub}>Sample rates. Actual fare depends on route & distance.</Text>

              {fareLoading ? (
                <ActivityIndicator size="small" color={colors.primary} style={styles.sheetLoader} />
              ) : fareDetails ? (
                <View style={styles.fareRows}>
                  <TouchableOpacity style={styles.fareRow} onPress={() => bookForTripType('local')} activeOpacity={0.7}>
                    <Feather name="clock" size={18} color={colors.primary} />
                    <Text style={styles.fareLabel}>Local (8hrs-80km)</Text>
                    <Text style={styles.fareValue}>₹{fareDetails.local.toLocaleString('en-IN')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.fareRow} onPress={() => bookForTripType('outstation')} activeOpacity={0.7}>
                    <Feather name="map" size={18} color={colors.primary} />
                    <Text style={styles.fareLabel}>Outstation ({SAMPLE_OUTSTATION_KM} km)</Text>
                    <Text style={styles.fareValue}>₹{fareDetails.outstation.toLocaleString('en-IN')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.fareRow} onPress={() => bookForTripType('airport')} activeOpacity={0.7}>
                    <MaterialCommunityIcons name="airplane" size={18} color={colors.primary} />
                    <Text style={styles.fareLabel}>Airport ({SAMPLE_AIRPORT_KM} km)</Text>
                    <Text style={styles.fareValue}>₹{fareDetails.airport.toLocaleString('en-IN')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.fareRow} onPress={() => bookForTripType('tour')} activeOpacity={0.7}>
                    <Feather name="map-pin" size={18} color={colors.primary} />
                    <Text style={styles.fareLabel}>Tour fares</Text>
                    <Text style={styles.fareValue}>
                      {fareDetails.tour > 0 ? `₹${fareDetails.tour.toLocaleString('en-IN')}` : 'On request'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              <TouchableOpacity style={styles.sheetCloseBtn} onPress={closeSheet}>
                <Text style={styles.sheetCloseText}>Close</Text>
              </TouchableOpacity>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray50 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  title: {
    fontSize: 28,
    fontFamily: fonts.bold,
    color: colors.foreground,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: colors.gray600,
  },
  loader: { flex: 1, marginTop: 48 },
  scroll: { flex: 1 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: CARD_GAP,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }
      : { elevation: 2 }),
  },
  cardImage: {
    width: '100%',
    height: 100,
    backgroundColor: colors.gray100,
  },
  cardImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: { padding: 12 },
  cardName: {
    fontSize: 15,
    fontFamily: fonts.semiBold,
    color: colors.foreground,
  },
  rateCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  bookLink: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: colors.primary,
  },
  specsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  specsText: {
    fontSize: 11,
    color: colors.gray600,
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheetPane: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    paddingHorizontal: 20,
  },
  sheetHandleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.gray300,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sheetTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: fonts.semiBold,
    color: colors.gray900,
  },
  sheetCloseIcon: {
    padding: 4,
  },
  sheetSub: {
    fontSize: 12,
    color: colors.gray500,
    marginTop: 4,
    marginBottom: 16,
  },
  sheetLoader: {
    marginVertical: 24,
  },
  fareRows: {
    gap: 12,
    marginBottom: 16,
  },
  fareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.gray50,
    borderRadius: 10,
    gap: 12,
  },
  fareLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: fonts.medium,
    color: colors.gray700,
  },
  fareValue: {
    fontSize: 15,
    fontFamily: fonts.semiBold,
    color: colors.primary,
  },
  sheetCloseBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colors.gray100,
    borderRadius: 10,
  },
  sheetCloseText: {
    fontSize: 15,
    fontFamily: fonts.semiBold,
    color: colors.gray700,
  },
});
