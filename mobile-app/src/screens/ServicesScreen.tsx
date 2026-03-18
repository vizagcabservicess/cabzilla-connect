/**
 * Services tab - Uber-style grid of service options
 */
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/core';
import { colors, fonts } from '../theme/colors';
import type { TripType } from '../types';

const WHATSAPP_NUMBER = '919966363662';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_SIZE = (SCREEN_WIDTH - 48) / 2 - 12; // 2 columns, 16px padding each side, 12px gap

const SERVICE_ITEMS: Array<{
  id: string;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  tripType?: TripType;
  action?: 'hire-driver' | 'whatsapp';
}> = [
  { id: 'outstation', label: 'Outstation Trips', icon: 'car-side', tripType: 'outstation' },
  { id: 'airport', label: 'Airport Transfer', icon: 'airplane', tripType: 'airport' },
  { id: 'hourly', label: 'Hourly Rentals', icon: 'clock-outline', tripType: 'local' },
  { id: 'tour', label: 'Tour', icon: 'map-marker-path', tripType: 'tour' },
  { id: 'hire', label: 'Hire Driver', icon: 'account', action: 'hire-driver' },
  { id: 'whatsapp', label: 'Chat on WhatsApp', icon: 'whatsapp', action: 'whatsapp' },
];

export function ServicesScreen() {
  const navigation = useNavigation<any>();

  const handleServicePress = (item: (typeof SERVICE_ITEMS)[0]) => {
    if (item.action === 'whatsapp') {
      Linking.openURL(`https://wa.me/${WHATSAPP_NUMBER}`).catch(() => {});
      return;
    }
    if (item.action === 'hire-driver') {
      navigation.navigate('HireDriver');
      return;
    }
    if (item.tripType) {
      navigation.navigate('Main', {
        screen: 'Home',
        params: { initialTripType: item.tripType },
      });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Services</Text>
        <Text style={styles.subtitle}>Go anywhere, get anything</Text>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      >
        {SERVICE_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.card}
            onPress={() => handleServicePress(item)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name={item.icon}
              size={32}
              color={colors.primary}
              style={styles.cardIcon}
            />
            <Text style={styles.cardLabel} numberOfLines={2}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
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
  scroll: { flex: 1 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
    paddingBottom: 32,
  },
  card: {
    width: CARD_SIZE,
    minHeight: 100,
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'flex-start',
  },
  cardIcon: { marginBottom: 12 },
  cardLabel: {
    fontSize: 15,
    fontFamily: fonts.semiBold,
    color: colors.foreground,
    lineHeight: 20,
  },
});
