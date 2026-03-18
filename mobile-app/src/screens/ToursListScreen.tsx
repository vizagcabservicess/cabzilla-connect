/**
 * Tours List Screen - vertical full-width cards using backend data only.
 * Uses: name, image, days, distance, timeDuration, pricing (min).
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { format } from 'date-fns';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { tourAPI } from '../services/tourAPI';
import { colors, fonts } from '../theme/colors';
import type { RootStackParamList } from '../navigation/types';
import type { Location } from '../types';
import type { TourInfo } from '../services/tourAPI';

type Props = NativeStackScreenProps<RootStackParamList, 'ToursList'>;

function toMinimalLocation(name: string): Location {
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
    isInVizag: true,
  };
}

function getMinPrice(tour: TourInfo): number {
  if (!tour.pricing || Object.values(tour.pricing).length === 0) return 0;
  return Math.min(...Object.values(tour.pricing));
}

function getDurationLabel(tour: TourInfo): string {
  if (tour.timeDuration?.trim()) return tour.timeDuration.trim();
  return tour.days ? `${tour.days} day${tour.days > 1 ? 's' : ''}` : '';
}

export function ToursListScreen({ route, navigation }: Props) {
  const params = route.params ?? {};
  const initialPickup = params.pickupLocation ?? null;
  const initialDate = params.pickupDate ? new Date(params.pickupDate) : new Date();
  const tripMode = params.tripMode ?? 'one-way';

  const [pickupLocation, setPickupLocation] = useState<Location | null>(initialPickup);
  const [pickupDate, setPickupDate] = useState<Date>(initialDate);
  const [tours, setTours] = useState<TourInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const list = await tourAPI.getAvailableTours();
        setTours(list);
      } catch {
        setTours([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleTourSelect = (tour: TourInfo) => {
    if (!tour?.id) return;
    const loc = pickupLocation ?? toMinimalLocation('Visakhapatnam');
    navigation.navigate('TourDetail', {
      tourId: tour.id,
      tourName: tour.name,
      pickupLocation: loc,
      pickupDate: pickupDate.getTime(),
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tour Packages</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.tourPackagesSection}>
          <View style={styles.searchSummaryCard}>
            <View style={styles.searchSummaryContent}>
              <View style={styles.searchSummaryRow}>
                <Text style={styles.searchSummaryLabel}>From</Text>
                <Text style={styles.searchSummaryValue} numberOfLines={1}>
                  {pickupLocation?.name || pickupLocation?.address || 'Select location'}
                </Text>
              </View>
              <View style={styles.searchSummaryRow}>
                <Text style={styles.searchSummaryLabel}>Trip Type</Text>
                <Text style={styles.searchSummaryValue}>
                  {tripMode === 'round-trip' ? 'Round Trip' : 'One Way'}
                </Text>
              </View>
              <View style={styles.searchSummaryRow}>
                <Text style={styles.searchSummaryLabel}>Trip Start</Text>
                <Text style={styles.searchSummaryValue}>
                  {format(pickupDate, 'dd MMM yyyy')} at {format(pickupDate, 'HH:mm')}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.searchSummaryEditBtn}
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Feather name="edit-2" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.tourPackagesTitle}>Explore Amazing Destinations</Text>
          <Text style={styles.tourPackagesSubtitle}>
            Discover the beauty of Andhra Pradesh with our carefully curated tour packages
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator style={styles.loader} color={colors.primary} size="large" />
        ) : tours.length > 0 ? (
          <View style={styles.tourList}>
            {tours.map((tour, i) => {
              const minPrice = getMinPrice(tour);
              const durationLabel = getDurationLabel(tour);
              const isFeatured = i === 0 && tours.length > 1;
              return (
                <TouchableOpacity
                  key={tour.id || i}
                  style={[styles.tourCard, isFeatured && styles.tourCardFeatured]}
                  onPress={() => handleTourSelect(tour)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.tourCardImageWrap, isFeatured && styles.tourCardImageWrapFeatured]}>
                    {tour.image ? (
                      <Image source={{ uri: tour.image }} style={styles.tourCardImage} resizeMode="cover" />
                    ) : (
                      <View style={[styles.tourCardImage, styles.tourCardImagePlaceholder]}>
                        <Feather name="image" size={40} color={colors.gray600} />
                      </View>
                    )}
                  </View>
                  <View style={styles.tourCardContent}>
                    <View style={styles.tourCardTitleRow}>
                      <Text style={styles.tourCardTitle} numberOfLines={2}>
                        {tour.name}
                      </Text>
                      <View style={styles.tourCardPriceWrap}>
                        <Text style={styles.tourCardPrice}>
                          ₹{minPrice > 0 ? minPrice.toLocaleString('en-IN') : '--'}
                        </Text>
                      </View>
                    </View>
                    {(durationLabel || (tour.distance && tour.distance > 0)) && (
                      <View style={styles.tourCardMeta}>
                        {durationLabel ? (
                          <View style={styles.tourCardMetaItem}>
                            <Feather name="clock" size={12} color={colors.gray600} />
                            <Text style={styles.tourCardMetaText}>{durationLabel}</Text>
                          </View>
                        ) : null}
                        {tour.distance && tour.distance > 0 ? (
                          <View style={styles.tourCardMetaItem}>
                            <Feather name="map-pin" size={12} color={colors.gray600} />
                            <Text style={styles.tourCardMetaText}>{tour.distance} km</Text>
                          </View>
                        ) : null}
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🏔️</Text>
            <Text style={styles.emptyTitle}>No tours found</Text>
            <Text style={styles.emptySubtitle}>Try again later</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const CARD_IMAGE_HEIGHT = 160;
const FEATURED_IMAGE_HEIGHT = 200;

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
  backBtn: { padding: 8, minWidth: 40 },
  headerTitle: { fontSize: 18, fontFamily: fonts.bold, color: colors.foreground },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },

  tourPackagesSection: { marginBottom: 20 },
  searchSummaryCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: colors.border,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 4,
          elevation: 2,
        }),
  },
  searchSummaryContent: { flex: 1 },
  searchSummaryRow: { marginBottom: 6 },
  searchSummaryLabel: {
    fontSize: 11,
    fontFamily: fonts.medium,
    color: colors.gray600,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  searchSummaryValue: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.gray900,
  },
  searchSummaryEditBtn: { padding: 8 },
  tourPackagesTitle: {
    fontSize: 20,
    fontFamily: fonts.bold,
    color: colors.gray900,
    marginTop: 12,
    marginBottom: 6,
  },
  tourPackagesSubtitle: {
    fontSize: 14,
    color: colors.gray600,
    fontFamily: fonts.regular,
  },
  loader: { marginVertical: 24 },
  tourList: { gap: 16 },
  tourCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 2px 16px rgba(0,0,0,0.08)' }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 16,
          elevation: 4,
        }),
  },
  tourCardFeatured: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  tourCardImageWrap: {
    width: '100%',
    height: CARD_IMAGE_HEIGHT,
    backgroundColor: colors.gray100,
  },
  tourCardImageWrapFeatured: {
    height: FEATURED_IMAGE_HEIGHT,
  },
  tourCardImage: { width: '100%', height: '100%' },
  tourCardImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tourCardContent: { padding: 16 },
  tourCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  tourCardTitle: {
    flex: 1,
    fontSize: 17,
    fontFamily: fonts.semiBold,
    color: colors.gray900,
  },
  tourCardPriceWrap: { alignItems: 'flex-end' },
  tourCardPrice: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: colors.primary,
  },
  tourCardMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 10,
  },
  tourCardMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tourCardMetaText: {
    fontSize: 13,
    color: colors.gray600,
    fontFamily: fonts.regular,
  },

  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontFamily: fonts.semiBold, color: colors.gray900, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: colors.gray600, fontFamily: fonts.regular },
});
