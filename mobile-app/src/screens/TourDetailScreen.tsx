/**
 * Tour Detail Screen - native, matches web TourDetailPage
 * Gallery, Overview/Itinerary/Inclusions tabs, vehicle selection, Book Now
 */
import React, { useState, useEffect } from 'react';
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
import { tourAPI, type TourDetail } from '../services/tourAPI';
import { loadVehicles } from '../services/vehiclesAPI';
import { DateTimePickerComponent } from '../components/DateTimePicker';
import { LocationInput } from '../components/LocationInput';
import { colors, fonts } from '../theme/colors';
import type { RootStackParamList } from '../navigation/types';
import type { Location } from '../types';

type TabId = 'overview' | 'itinerary' | 'inclusions';

function toMinimalLocation(name: string, isInVizag = true): Location {
  return {
    id: '',
    name,
    address: '',
    city: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    lat: 17.739,
    lng: 83.303,
    type: 'landmark',
    popularityScore: 0,
    isInVizag,
  };
}

type Props = NativeStackScreenProps<RootStackParamList, 'TourDetail'>;

export function TourDetailScreen({ route, navigation }: Props) {
  const { tourId, tourName: paramTourName, pickupLocation: paramPickup, pickupDate: paramPickupDate } = route.params ?? {};

  const [tour, setTour] = useState<TourDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [vehicles, setVehicles] = useState<{ id: string; name: string; capacity?: number; price: number }[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<{ id: string; name: string; capacity?: number; price: number } | null>(null);
  const [pickupLocation, setPickupLocation] = useState<Location | null>(
    paramPickup ?? toMinimalLocation('Visakhapatnam')
  );
  const [pickupDate, setPickupDate] = useState<Date>(
    paramPickupDate ? new Date(paramPickupDate) : (() => {
      const d = new Date();
      d.setTime(d.getTime() + 60 * 60 * 1000);
      return d;
    })()
  );
  const [tripMode, setTripMode] = useState<'one-way' | 'round-trip'>('one-way');
  const [paymentMode, setPaymentMode] = useState<'partial' | 'full'>('partial');

  const totalPrice = selectedVehicle?.price ?? 0;
  const partialAmount = Math.round(totalPrice * 0.3);

  useEffect(() => {
    if (!tourId) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const detail = await tourAPI.getTourDetail(tourId);
        setTour(detail);
      } catch {
        setTour(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [tourId]);

  useEffect(() => {
    if (!tour?.pricing || Object.keys(tour.pricing).length === 0) return;
    (async () => {
      try {
        const vList = await loadVehicles();
        const withPricing = vList
          .map((v) => {
            const id = String(v.id || (v as { vehicleId?: string }).vehicleId || '').toLowerCase().replace(/-/g, '_').trim();
            const name = String(v.name || '').toLowerCase();
            const keysToTry = [
              id,
              name,
              name.replace(/\s+/g, '_'),
              name.includes('swift') || name.includes('dzire') ? 'sedan' : null,
              name.includes('glanza') ? 'toyota_glanza' : null,
              name.includes('ertiga') ? 'ertiga' : null,
              name.includes('innova') ? 'innova_crysta' : null,
              name.includes('tempo') ? 'tempo_traveller' : null,
            ].filter(Boolean) as string[];
            let price = 0;
            for (const k of keysToTry) {
              const p = tour.pricing[k];
              if (typeof p === 'number' && p > 0) {
                price = p;
                break;
              }
            }
            if (price <= 0) {
              for (const [pk, pv] of Object.entries(tour.pricing)) {
                if (name.includes(pk.toLowerCase()) || pk.toLowerCase().includes(name.split(' ')[0] || '')) {
                  price = pv;
                  break;
                }
              }
            }
            return { ...v, price };
          })
          .filter((v) => v.price > 0);
        setVehicles(withPricing);
      } catch {
        setVehicles([]);
      }
    })();
  }, [tour?.pricing]);

  const minDate = (() => {
    const d = new Date();
    d.setTime(d.getTime() + 60 * 60 * 1000);
    return d;
  })();

  const handleBookNow = () => {
    if (!tour || !selectedVehicle || !pickupLocation) return;
    const dropLoc: Location = tripMode === 'round-trip'
      ? pickupLocation
      : toMinimalLocation(tour.tourName, false);
    navigation.navigate('BookingSummary', {
      pickupLocation,
      dropLocation: dropLoc,
      pickupDate: pickupDate.getTime(),
      tripType: 'tour',
      tripMode,
      distance: tour.distance,
      duration: 240,
      tourId: tour.tourId,
      tourName: tour.tourName,
      selectedVehicle: {
        id: selectedVehicle.id,
        name: selectedVehicle.name,
        capacity: selectedVehicle.capacity,
      },
      totalPrice: selectedVehicle.price,
      paymentMode,
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!tour) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Feather name="arrow-left" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Tour Not Found</Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>The requested tour could not be found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const displayImages = tour.gallery && tour.gallery.length > 0
    ? tour.gallery
    : [{ id: '1', url: tour.imageUrl || '', alt: tour.tourName }];
  const mainImage = displayImages[0]?.url || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{tour.tourName}</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View>
        {/* Hero image - 4th screenshot style with overlay tag */}
        <View style={styles.heroWrap}>
          <Image source={{ uri: mainImage }} style={styles.heroImage} resizeMode="cover" />
          {(tour.category || tour.difficulty) && (
            <View style={styles.badgeOverlay}>
              {tour.category ? (
                <View style={styles.badgeOverlayPill}>
                  <Text style={styles.badgeOverlayText}>{tour.category}</Text>
                </View>
              ) : null}
              {tour.difficulty ? (
                <View style={[styles.badgeOverlayPill, styles.badgeOverlayOutline]}>
                  <Text style={styles.badgeOverlayTextOutline}>{tour.difficulty}</Text>
                </View>
              ) : null}
            </View>
          )}
        </View>

        {/* Package card - 4th screenshot style */}
        <View style={styles.packageCard}>
          <View style={styles.packageTitleRow}>
            <Text style={styles.packageTitle} numberOfLines={2}>{tour.tourName}</Text>
            <View style={styles.durationBadge}>
              <Text style={styles.durationBadgeText}>
                {tour.days}D / {Math.max(0, tour.days - 1)}N
              </Text>
            </View>
          </View>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Feather name="map-pin" size={14} color={colors.gray600} />
              <Text style={styles.metaText}>{tour.distance} km</Text>
            </View>
            <View style={styles.metaItem}>
              <Feather name="calendar" size={14} color={colors.gray600} />
              <Text style={styles.metaText}>{tour.days} day{tour.days > 1 ? 's' : ''}</Text>
            </View>
            <View style={styles.metaItem}>
              <Feather name="clock" size={14} color={colors.gray600} />
              <Text style={styles.metaText}>{tour.timeDuration?.trim() || 'Full Day'}</Text>
            </View>
          </View>
          {/* Bullet features - from highlights or inclusions */}
          <View style={styles.featuresList}>
            {(tour.highlights?.slice(0, 4) || tour.inclusions?.filter(Boolean).slice(0, 4) || []).map((item, i) => (
              <View key={i} style={styles.featureItem}>
                <Text style={styles.featureBullet}>•</Text>
                <Text style={styles.featureText}>
                  {typeof item === 'string' ? item : (item as { title?: string }).title || ''}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsRow}>
          {(['overview', 'itinerary', 'inclusions'] as TabId[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'overview' ? 'Overview' : tab === 'itinerary' ? 'Itinerary' : 'Inclusions'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab content */}
        <View style={styles.tabContent}>
          {activeTab === 'overview' && (
            <>
              <Text style={styles.sectionTitle}>About This Tour</Text>
              <Text style={styles.bodyText}>{tour.description || 'No description available.'}</Text>
              {tour.highlights && tour.highlights.length > 0 && (
                <View style={styles.highlights}>
                  {tour.highlights.map((h, i) => (
                    <View key={i} style={styles.highlightItem}>
                      <Text style={styles.highlightTitle}>{h.title}</Text>
                      <Text style={styles.highlightDesc}>{h.description}</Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
          {activeTab === 'itinerary' && (
            <>
              <Text style={styles.sectionTitle}>Tour Itinerary</Text>
              {tour.itinerary && tour.itinerary.length > 0 ? (
                tour.itinerary.map((day, i) => (
                  <View key={i} style={styles.itineraryDay}>
                    <Text style={styles.itineraryDayTitle}>Day {day.day}: {day.title}</Text>
                    <Text style={styles.bodyText}>{day.description}</Text>
                    {day.activities && day.activities.length > 0 && (
                      <View style={styles.activitiesList}>
                        {day.activities.map((a, j) => (
                          <Text key={j} style={styles.activityItem}>• {a}</Text>
                        ))}
                      </View>
                    )}
                  </View>
                ))
              ) : (
                <Text style={styles.bodyText}>No itinerary available.</Text>
              )}
            </>
          )}
          {activeTab === 'inclusions' && (
            <View style={styles.inclusionsGrid}>
              <View style={styles.inclusionsBlock}>
                <Text style={styles.inclusionsTitleGreen}>Included</Text>
                {tour.inclusions && tour.inclusions.filter(Boolean).length > 0 ? (
                  tour.inclusions.filter(Boolean).map((item, i) => (
                    <View key={i} style={styles.inclusionRow}>
                      <Text style={styles.checkGreen}>✔</Text>
                      <Text style={styles.inclusionText}>{item}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noList}>No inclusions listed</Text>
                )}
              </View>
              <View style={styles.inclusionsBlock}>
                <Text style={styles.inclusionsTitleRed}>Not Included</Text>
                {tour.exclusions && tour.exclusions.filter(Boolean).length > 0 ? (
                  tour.exclusions.filter(Boolean).map((item, i) => (
                    <View key={i} style={styles.inclusionRow}>
                      <Text style={styles.checkRed}>✖</Text>
                      <Text style={styles.inclusionText}>{item}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noList}>No exclusions listed</Text>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Vehicle selection */}
        <View style={styles.vehicleSection}>
          <Text style={styles.sectionTitle}>Select Your Vehicle</Text>
          {vehicles.length > 0 ? (
            <View style={styles.vehicleList}>
              {vehicles.map((v) => (
                <TouchableOpacity
                  key={v.id}
                  style={[
                    styles.vehicleCard,
                    selectedVehicle?.id === v.id && styles.vehicleCardSelected,
                  ]}
                  onPress={() => setSelectedVehicle(v)}
                >
                  <View style={styles.vehicleCardLeft}>
                    <Text style={styles.vehicleName}>{v.name}</Text>
                    {v.capacity ? (
                      <Text style={styles.vehicleMeta}>{v.capacity} passengers</Text>
                    ) : null}
                  </View>
                  <Text style={styles.vehiclePrice}>₹{v.price.toLocaleString('en-IN')}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={styles.noVehicles}>No vehicles available for this tour</Text>
          )}
        </View>

        {/* Pickup & date */}
        <View style={styles.bookingSection}>
          <Text style={styles.sectionTitle}>Your Trip</Text>
          <LocationInput
            label="PICKUP LOCATION"
            placeholder="Enter pickup location"
            value={pickupLocation}
            onLocationChange={setPickupLocation}
            isPickupLocation
            tripType="tour"
          />
          <DateTimePickerComponent
            label="TOUR DATE & TIME"
            date={pickupDate}
            onDateChange={setPickupDate}
            minDate={minDate}
          />
          <View style={styles.tripModeRow}>
            <TouchableOpacity
              style={[styles.tripModeBtn, tripMode === 'one-way' && styles.tripModeBtnActive]}
              onPress={() => setTripMode('one-way')}
            >
              <Text style={[styles.tripModeText, tripMode === 'one-way' && styles.tripModeTextActive]}>One Way</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tripModeBtn, tripMode === 'round-trip' && styles.tripModeBtnActive]}
              onPress={() => setTripMode('round-trip')}
            >
              <Text style={[styles.tripModeText, tripMode === 'round-trip' && styles.tripModeTextActive]}>Round Trip</Text>
            </TouchableOpacity>
          </View>
        </View>

        </View>
      </ScrollView>

      {/* Sticky bottom bar: Part Pay / Full Pay + Book this package (same as Booking Summary) */}
      {selectedVehicle && pickupLocation && (
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
              style={styles.payNowBtn}
              onPress={handleBookNow}
            >
              <Text style={styles.payNowBtnText}>Book this package @ ₹{selectedVehicle.price.toLocaleString('en-IN')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { padding: 8, minWidth: 40 },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: fonts.bold, color: colors.foreground, textAlign: 'center' },
  errorWrap: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 16, color: colors.gray600, fontFamily: fonts.regular },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 160 },

  heroWrap: { marginBottom: 0, position: 'relative' },
  heroImage: {
    width: '100%',
    height: 220,
    borderRadius: 0,
    backgroundColor: colors.gray100,
  },
  badgeOverlay: {
    position: 'absolute',
    top: 12,
    left: 16,
    flexDirection: 'row',
    gap: 8,
  },
  badgeOverlayPill: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  badgeOverlayOutline: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeOverlayText: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: '#fff',
  },
  badgeOverlayTextOutline: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: colors.gray900,
  },
  packageCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: -24,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.12,
          shadowRadius: 20,
          elevation: 6,
        }),
  },
  packageTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  packageTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.gray900,
  },
  durationBadge: {
    backgroundColor: colors.gray100,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  durationBadgeText: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: colors.gray600,
  },
  featuresList: { marginBottom: 16 },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  featureBullet: { fontSize: 14, color: colors.primary },
  featureText: { flex: 1, fontSize: 13, color: colors.gray600, fontFamily: fonts.regular },
  metaRow: { flexDirection: 'row', gap: 16, marginTop: 8, marginBottom: 12, alignItems: 'center' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 13, color: colors.gray600, fontFamily: fonts.regular },

  tabsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.gray100,
  },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 13, fontFamily: fonts.medium, color: colors.gray600 },
  tabTextActive: { color: '#fff' },
  tabContent: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontFamily: fonts.bold, color: colors.gray900, marginBottom: 10 },
  bodyText: { fontSize: 14, color: colors.gray600, fontFamily: fonts.regular, lineHeight: 22, marginBottom: 12 },
  highlights: { gap: 12 },
  highlightItem: { marginBottom: 8 },
  highlightTitle: { fontSize: 14, fontFamily: fonts.semiBold, color: colors.gray900, marginBottom: 2 },
  highlightDesc: { fontSize: 13, color: colors.gray600, fontFamily: fonts.regular },
  itineraryDay: { marginBottom: 16 },
  itineraryDayTitle: { fontSize: 14, fontFamily: fonts.semiBold, color: colors.gray900, marginBottom: 6 },
  activitiesList: { marginLeft: 8, marginTop: 4 },
  activityItem: { fontSize: 13, color: colors.gray600, marginBottom: 2 },
  inclusionsGrid: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  inclusionsBlock: {
    flex: 1,
    minWidth: 140,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#fff',
  },
  inclusionsTitleGreen: { fontSize: 14, fontFamily: fonts.semiBold, color: '#059669', marginBottom: 8 },
  inclusionsTitleRed: { fontSize: 14, fontFamily: fonts.semiBold, color: '#dc2626', marginBottom: 8 },
  inclusionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 4 },
  checkGreen: { fontSize: 14, color: '#059669' },
  checkRed: { fontSize: 14, color: '#dc2626' },
  inclusionText: { flex: 1, fontSize: 13, color: colors.gray900 },
  noList: { fontSize: 12, color: colors.gray600 },

  vehicleSection: { marginBottom: 24 },
  vehicleList: { gap: 10 },
  vehicleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: '#fff',
  },
  vehicleCardSelected: { borderColor: colors.primary, backgroundColor: '#eff6ff' },
  vehicleCardLeft: { flex: 1 },
  vehicleName: { fontSize: 15, fontFamily: fonts.semiBold, color: colors.gray900 },
  vehicleMeta: { fontSize: 12, color: colors.gray600, marginTop: 2 },
  vehiclePrice: { fontSize: 16, fontFamily: fonts.bold, color: colors.primary },
  noVehicles: { fontSize: 14, color: colors.gray600, fontFamily: fonts.regular },

  bookingSection: { marginBottom: 20 },
  tripModeRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  tripModeBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
  },
  tripModeBtnActive: { borderColor: colors.primary, backgroundColor: '#eff6ff' },
  tripModeText: { fontSize: 14, fontFamily: fonts.medium, color: colors.gray600 },
  tripModeTextActive: { color: colors.primary },

  // Sticky bottom bar (matches Booking Summary)
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
  payNowBtn: {
    alignSelf: 'stretch',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payNowBtnText: { fontSize: 16, fontFamily: fonts.bold, color: '#fff', letterSpacing: 1 },
});
