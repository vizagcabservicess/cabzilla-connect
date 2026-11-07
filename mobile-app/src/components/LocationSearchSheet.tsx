/**
 * Full-screen pickup and drop search. The home form opens this instead of typing inline.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ExpoLocation from 'expo-location';
import {
  fetchPlacePredictions,
  fetchPlaceDetails,
  validatePickupLocation,
  type PlacePrediction,
} from '../services/placesAPI';
import { colors, fonts } from '../theme/colors';
import type { Location, TripType } from '../types';

const RECENT_KEY = 'vth_recent_locations';
const RECENT_LIMIT = 8;

type FocusField = 'pickup' | 'drop';

interface LocationSearchSheetProps {
  visible: boolean;
  initialFocus: FocusField;
  onClose: () => void;
  tripType: TripType;
  showDrop: boolean;
  pickup: Location | null;
  drop: Location | null;
  onPickupChange: (location: Location | null) => void;
  onDropChange: (location: Location | null) => void;
}

interface LocationLaunchFieldProps {
  label: string;
  value: Location | null;
  placeholder: string;
  helperText?: string;
  onPress: () => void;
}

function fieldValue(field: FocusField, pickup: Location | null, drop: Location | null): Location | null {
  switch (field) {
    case 'pickup':
      return pickup;
    case 'drop':
      return drop;
    default: {
      const neverField: never = field;
      return neverField;
    }
  }
}

function idleLabel(field: FocusField): string {
  switch (field) {
    case 'pickup':
      return 'PICK UP LOCATION';
    case 'drop':
      return 'DROP LOCATION';
    default: {
      const neverField: never = field;
      return neverField;
    }
  }
}

function activeCaption(field: FocusField): string {
  switch (field) {
    case 'pickup':
      return 'FROM';
    case 'drop':
      return 'TO';
    default: {
      const neverField: never = field;
      return neverField;
    }
  }
}

function activePlaceholder(field: FocusField, tripType: TripType): string {
  switch (field) {
    case 'pickup':
      return 'Enter pickup address';
    case 'drop':
      return tripType === 'local' ? 'Enter last drop address' : 'Enter drop address';
    default: {
      const neverField: never = field;
      return neverField;
    }
  }
}

async function loadRecent(): Promise<Location[]> {
  try {
    const raw = await AsyncStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Location[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function rememberLocation(location: Location): Promise<Location[]> {
  const current = await loadRecent();
  const key = location.id || `${location.lat},${location.lng}`;
  const next = [location, ...current.filter((item) => (item.id || `${item.lat},${item.lng}`) !== key)].slice(0, RECENT_LIMIT);
  await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next));
  return next;
}

export function LocationLaunchField({
  label,
  value,
  placeholder,
  helperText,
  onPress,
}: LocationLaunchFieldProps) {
  const text = value?.name || value?.address || '';
  return (
    <View style={launchStyles.container}>
      <Text style={launchStyles.label}>{label}</Text>
      <TouchableOpacity style={launchStyles.box} onPress={onPress} activeOpacity={0.8}>
        <Text style={text ? launchStyles.value : launchStyles.placeholder} numberOfLines={1}>
          {text || placeholder}
        </Text>
      </TouchableOpacity>
      {helperText ? <Text style={launchStyles.helper}>{helperText}</Text> : null}
    </View>
  );
}

export function LocationSearchSheet({
  visible,
  initialFocus,
  onClose,
  tripType,
  showDrop,
  pickup,
  drop,
  onPickupChange,
  onDropChange,
}: LocationSearchSheetProps) {
  const [focus, setFocus] = useState<FocusField>(initialFocus);
  const [localPickup, setLocalPickup] = useState<Location | null>(pickup);
  const [localDrop, setLocalDrop] = useState<Location | null>(drop);
  const [query, setQuery] = useState('');
  const [typing, setTyping] = useState(false);
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [recent, setRecent] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);
  const pickupRef = useRef(pickup);
  const dropRef = useRef(drop);
  pickupRef.current = pickup;
  dropRef.current = drop;

  const restrictToVizag = !(tripType === 'outstation' && focus === 'drop');

  const beginFocus = useCallback((field: FocusField) => {
    setFocus(field);
    setTyping(false);
    setPredictions([]);
    setSearchError(null);
    const current = fieldValue(field, localPickup, localDrop);
    setQuery(current?.name || current?.address || '');
  }, [localPickup, localDrop]);

  useEffect(() => {
    if (!visible) return;
    const nextPickup = pickupRef.current;
    const nextDrop = dropRef.current;
    setLocalPickup(nextPickup);
    setLocalDrop(nextDrop);
    setFocus(initialFocus);
    setTyping(false);
    setPredictions([]);
    setSearchError(null);
    const current = fieldValue(initialFocus, nextPickup, nextDrop);
    setQuery(current?.name || current?.address || '');
    void loadRecent().then(setRecent);
    const timer = setTimeout(() => inputRef.current?.focus(), 250);
    return () => clearTimeout(timer);
  }, [visible, initialFocus]);

  const search = useCallback(async (text: string) => {
    setLoading(true);
    try {
      const { predictions: results, error } = await fetchPlacePredictions(text, { restrictToVizag });
      setPredictions(results);
      if (error === 'NO_API_KEY' || error === 'REQUEST_DENIED') {
        setSearchError('Location search is unavailable right now. Try again in a moment.');
      } else if (error === 'NETWORK') {
        setSearchError('Unable to fetch locations. Check your internet connection.');
      } else {
        setSearchError(null);
      }
    } catch {
      setPredictions([]);
      setSearchError('Unable to fetch locations. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, [restrictToVizag]);

  useEffect(() => {
    if (!typing) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setPredictions([]);
      setSearchError(null);
      return;
    }
    debounceRef.current = setTimeout(() => {
      void search(query.trim());
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, typing, search]);

  const commit = async (field: FocusField, location: Location) => {
    if (field === 'pickup' || tripType === 'local') {
      const validation = validatePickupLocation(location, tripType);
      if (!validation.valid) {
        Alert.alert('Invalid Location', validation.message ?? 'Please select a valid location.');
        return;
      }
    }
    if (field === 'pickup') {
      setLocalPickup(location);
      onPickupChange(location);
    } else {
      setLocalDrop(location);
      onDropChange(location);
    }
    const saved = await rememberLocation(location).catch(() => recent);
    setRecent(saved);

    const otherEmpty = field === 'pickup' ? showDrop && !localDrop : !localPickup;
    if (otherEmpty) {
      const next: FocusField = field === 'pickup' ? 'drop' : 'pickup';
      setFocus(next);
      setQuery('');
      setTyping(false);
      setPredictions([]);
      setSearchError(null);
      setTimeout(() => inputRef.current?.focus(), 50);
      return;
    }
    onClose();
  };

  const handleSelectPrediction = async (prediction: PlacePrediction) => {
    setLoading(true);
    try {
      const location = await fetchPlaceDetails(prediction.place_id);
      if (!location) return;
      await commit(focus, location);
    } finally {
      setLoading(false);
    }
  };

  const handleCurrentLocation = async () => {
    setLocating(true);
    try {
      const permission = await ExpoLocation.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Location', 'Allow location access to use your current location.');
        return;
      }
      const position = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.Balanced,
      });
      const places = await ExpoLocation.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      }).catch(() => []);
      const place = places[0];
      const name = place?.name || place?.street || 'Current Location';
      const address = [place?.name, place?.street, place?.district, place?.city, place?.region]
        .filter(Boolean)
        .join(', ') || name;
      const location: Location = {
        id: `current-${position.coords.latitude.toFixed(5)}-${position.coords.longitude.toFixed(5)}`,
        name,
        address,
        city: place?.city || 'Visakhapatnam',
        state: place?.region || 'Andhra Pradesh',
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        type: 'other',
        popularityScore: 50,
      };
      await commit(focus, location);
    } catch {
      Alert.alert('Location', 'Unable to read your current location.');
    } finally {
      setLocating(false);
    }
  };

  const showingResults = typing && query.trim().length >= 2;

  const renderField = (field: FocusField) => {
    const selected = fieldValue(field, localPickup, localDrop);
    const active = focus === field;
    const caption = selected?.name || selected?.address || idleLabel(field);
    return (
      <View style={[styles.field, active ? styles.fieldActive : styles.fieldIdle]}>
        {field === 'pickup' ? (
          <TouchableOpacity onPress={onClose} hitSlop={10} style={styles.backBtn} accessibilityLabel="Back">
            <Ionicons name="chevron-back" size={22} color="#6b7280" />
          </TouchableOpacity>
        ) : (
          <View style={styles.dropDot} />
        )}
        {active ? (
          <View style={styles.fieldBody}>
            <Text style={styles.activeCaption}>{activeCaption(field)}</Text>
            <TextInput
              ref={field === focus ? inputRef : undefined}
              value={query}
              onChangeText={(text) => {
                setQuery(text);
                setTyping(true);
                if (!text) {
                  if (field === 'pickup') {
                    setLocalPickup(null);
                    onPickupChange(null);
                  } else {
                    setLocalDrop(null);
                    onDropChange(null);
                  }
                }
              }}
              placeholder={activePlaceholder(field, tripType)}
              placeholderTextColor="#9ca3af"
              style={styles.input}
              autoCorrect={false}
              autoCapitalize="words"
              returnKeyType="search"
            />
          </View>
        ) : (
          <TouchableOpacity style={styles.fieldBody} onPress={() => beginFocus(field)} activeOpacity={0.7}>
            <Text style={selected ? styles.idleValue : styles.idlePlaceholder} numberOfLines={1}>
              {caption}
            </Text>
          </TouchableOpacity>
        )}
        {active && query ? (
          <TouchableOpacity
            onPress={() => {
              setQuery('');
              setTyping(false);
              setPredictions([]);
              if (field === 'pickup') {
                setLocalPickup(null);
                onPickupChange(null);
              } else {
                setLocalDrop(null);
                onDropChange(null);
              }
              inputRef.current?.focus();
            }}
            hitSlop={8}
          >
            <Ionicons name="close-circle" size={18} color="#9ca3af" />
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.screen}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.fields}>
            {renderField('pickup')}
            {showDrop ? renderField('drop') : null}
          </View>

          <TouchableOpacity style={styles.currentRow} onPress={() => { void handleCurrentLocation(); }} activeOpacity={0.7}>
            {locating ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="locate" size={18} color={colors.primary} />
            )}
            <Text style={styles.currentText}>Current Location</Text>
          </TouchableOpacity>

          {searchError ? <Text style={styles.error}>{searchError}</Text> : null}

          {!showingResults && recent.length > 0 ? (
            <View style={styles.sectionBar}>
              <Text style={styles.section}>RECENT SEARCHES</Text>
            </View>
          ) : null}
          {showingResults && loading ? (
            <View style={styles.loaderRow}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : null}

          <ScrollView
            style={styles.list}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {showingResults
              ? predictions.map((item) => (
                <TouchableOpacity
                  key={item.place_id}
                  style={styles.resultRow}
                  onPress={() => { void handleSelectPrediction(item); }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="business-outline" size={20} color="#6b7280" />
                  <View style={styles.resultText}>
                    <Text style={styles.resultTitle} numberOfLines={1}>
                      {item.structured_formatting?.main_text || item.description}
                    </Text>
                    {item.structured_formatting?.secondary_text ? (
                      <Text style={styles.resultSub} numberOfLines={1}>
                        {item.structured_formatting.secondary_text}
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              ))
              : recent.map((item) => (
                <TouchableOpacity
                  key={item.id || `${item.lat},${item.lng}`}
                  style={styles.resultRow}
                  onPress={() => { void commit(focus, item); }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="business-outline" size={20} color="#6b7280" />
                  <View style={styles.resultText}>
                    <Text style={styles.resultTitle} numberOfLines={1}>{item.name || item.address}</Text>
                    {item.address ? (
                      <Text style={styles.resultSub} numberOfLines={1}>{item.address}</Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              ))}
            {showingResults && !loading && predictions.length === 0 && !searchError ? (
              <Text style={styles.empty}>No places found</Text>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const launchStyles = StyleSheet.create({
  container: { marginBottom: 10 },
  label: {
    fontSize: 11,
    color: colors.primary,
    marginBottom: 3,
    fontWeight: '600',
  },
  box: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.gray50,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  value: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.foreground,
  },
  placeholder: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.mutedForeground,
  },
  helper: {
    fontSize: 11,
    color: colors.mutedForeground,
    marginTop: 3,
  },
});

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#fff',
  },
  fields: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    minHeight: 52,
    paddingRight: 12,
  },
  fieldIdle: {
    backgroundColor: '#F2F3F5',
  },
  fieldActive: {
    backgroundColor: '#EAF4FF',
    borderWidth: 1.5,
    borderColor: '#3B82F6',
  },
  backBtn: {
    width: 40,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginLeft: 16,
    marginRight: 8,
  },
  fieldBody: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  activeCaption: {
    fontSize: 11,
    fontFamily: fonts.bold,
    color: colors.primary,
    letterSpacing: 0.4,
  },
  input: {
    fontSize: 16,
    fontFamily: fonts.medium,
    color: colors.foreground,
    padding: 0,
    marginTop: 1,
  },
  idlePlaceholder: {
    fontSize: 15,
    fontFamily: fonts.semiBold,
    color: '#9ca3af',
    letterSpacing: 0.6,
  },
  idleValue: {
    fontSize: 15,
    fontFamily: fonts.semiBold,
    color: colors.foreground,
  },
  currentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
  },
  currentText: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: colors.primary,
  },
  error: {
    color: '#b91c1c',
    fontSize: 13,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  sectionBar: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  section: {
    color: '#9ca3af',
    fontSize: 12,
    fontFamily: fonts.semiBold,
    letterSpacing: 0.6,
  },
  loaderRow: {
    paddingVertical: 8,
    alignItems: 'flex-start',
    paddingHorizontal: 20,
  },
  list: {
    flex: 1,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  resultText: {
    flex: 1,
    gap: 2,
  },
  resultTitle: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: colors.foreground,
  },
  resultSub: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: '#9ca3af',
  },
  empty: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    color: '#9ca3af',
    fontSize: 14,
  },
});
