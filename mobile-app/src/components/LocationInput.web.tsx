/**
 * Web implementation - uses Google Maps JS SDK Autocomplete (same as web app).
 * No proxy, real Google Maps API.
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useGoogleMaps } from '../providers/GoogleMapsProvider';
import { validatePickupLocation } from '../services/placesAPI';
import { colors } from '../theme/colors';
import type { Location } from '../types';
import type { TripType } from '../types';

const VIZAG_LAT = 17.6868;
const VIZAG_LNG = 83.2185;
const MAX_DISTANCE_KM = 35;

function getDistanceFromLatLng(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function isWithinVizagRange(lat: number, lng: number, maxKm: number = MAX_DISTANCE_KM): boolean {
  return getDistanceFromLatLng(VIZAG_LAT, VIZAG_LNG, lat, lng) <= maxKm;
}

interface LocationInputProps {
  label: string;
  placeholder: string;
  value: Location | null;
  onLocationChange: (location: Location | null) => void;
  isPickupLocation?: boolean;
  tripType?: TripType;
  helperText?: string;
  showLeftIcon?: boolean;
}

export function LocationInput({
  label,
  placeholder,
  value,
  onLocationChange,
  isPickupLocation = false,
  tripType = 'outstation',
  helperText,
  showLeftIcon = false,
}: LocationInputProps) {
  const [inputValue, setInputValue] = useState(value?.name || value?.address || '');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const initRef = useRef(false);

  const { isLoaded, google, error } = useGoogleMaps();

  useEffect(() => {
    setInputValue(value?.name || value?.address || '');
  }, [value?.id]);

  useEffect(() => {
    if (!isLoaded || !google || !inputRef.current || initRef.current) return;

    try {
      const isOutstationDrop = tripType === 'outstation' && !isPickupLocation;
      const options: google.maps.places.AutocompleteOptions = {
        types: ['geocode', 'establishment'],
        componentRestrictions: { country: 'in' },
      };
      if (!isOutstationDrop) {
        const vizagCenter = new google.maps.LatLng(VIZAG_LAT, VIZAG_LNG);
        const circle = new google.maps.Circle({
          center: vizagCenter,
          radius: MAX_DISTANCE_KM * 1000,
        });
        const bounds = circle.getBounds() as google.maps.LatLngBounds;
        options.bounds = bounds;
        options.strictBounds = isPickupLocation || tripType === 'local';
      }

      const inputEl = inputRef.current;
      if (!inputEl) return;

      autocompleteRef.current = new google.maps.places.Autocomplete(inputEl, options);
      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace();
        if (!place?.geometry?.location) return;

        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const name = place.name || place.formatted_address || '';
        const address = place.formatted_address || name;

        const loc: Location = {
          id: place.place_id || address,
          name,
          address,
          city: 'Visakhapatnam',
          state: 'Andhra Pradesh',
          lat,
          lng,
          type: 'other',
          popularityScore: 50,
          isInVizag: isWithinVizagRange(lat, lng),
        };

        if (isPickupLocation || tripType === 'local') {
          const validation = validatePickupLocation(loc, tripType);
          if (!validation.valid) {
            onLocationChange(null);
            setInputValue('');
            return;
          }
        }

        setInputValue(name || address);
        onLocationChange(loc);
      });

      initRef.current = true;
    } catch (err) {
      console.error('[LocationInput] Autocomplete init failed:', err);
    }
  }, [isLoaded, google, isPickupLocation, tripType, onLocationChange]);

  const handleChangeText = (text: string) => {
    setInputValue(text);
    if (!text) onLocationChange(null);
  };

  const handleClear = () => {
    setInputValue('');
    onLocationChange(null);
  };

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>Location search unavailable. Check EXPO_PUBLIC_GOOGLE_MAPS_API_KEY.</Text>
      </View>
    );
  }

  const inputStyle: React.CSSProperties = {
    border: 'none',
    outline: 'none',
    flex: 1,
    fontSize: 15,
    fontWeight: 600,
    color: colors.foreground,
    backgroundColor: 'transparent',
    paddingLeft: showLeftIcon ? 6 : 10,
    paddingRight: 10,
    paddingTop: 10,
    paddingBottom: 10,
    minWidth: 0,
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrapper, showLeftIcon && styles.inputWrapperRow]}>
        {showLeftIcon && (
          <View style={styles.iconInside}>
            <Feather name="map-pin" size={18} color={colors.gray600} />
          </View>
        )}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => handleChangeText(e.target.value)}
          placeholder={value ? '' : placeholder}
          style={inputStyle}
        />
        {inputValue ? (
          <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
            <Text style={styles.clearText}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {helperText ? <Text style={styles.helper}>{helperText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
    ...(Platform.OS === 'web' ? { position: 'relative' as const } : {}),
  },
  label: {
    fontSize: 11,
    color: colors.primary,
    marginBottom: 3,
    fontWeight: '600',
  },
  inputWrapper: {
    position: 'relative' as const,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.gray50,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  inputWrapperRow: {},
  iconInside: { marginRight: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.foreground,
  },
  clearBtn: {
    position: 'absolute',
    right: 10,
    top: 10,
  },
  clearText: { color: colors.mutedForeground, fontSize: 15 },
  helper: {
    fontSize: 11,
    color: colors.mutedForeground,
    marginTop: 3,
  },
  error: {
    fontSize: 12,
    color: '#dc2626',
    marginTop: 4,
  },
});
