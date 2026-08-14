import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { fetchPlacePredictions, fetchPlaceDetails, validatePickupLocation, validateDropLocation } from '../services/placesAPI';
import { GOOGLE_MAPS_API_KEY } from '../config';
import { colors } from '../theme/colors';
import type { Location } from '../types';
import type { TripType } from '../types';

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

const DEBOUNCE_MS = 300;

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
  const [predictions, setPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setInputValue(value?.name || value?.address || '');
  }, [value?.id]);

  const restrictToVizag = tripType === 'outstation' && !isPickupLocation ? false : true;

  const search = useCallback(async (text: string) => {
    if (text.length < 2) {
      setPredictions([]);
      setSearchError(null);
      return;
    }
    if (!GOOGLE_MAPS_API_KEY) {
      setPredictions([]);
      setSearchError('Location search needs an API key. Add EXPO_PUBLIC_GOOGLE_MAPS_API_KEY to EAS (preview + production) or .env for Expo Go.');
      setLoading(false);
      return;
    }
    setSearchError(null);
    setLoading(true);
    try {
      const { predictions: results, error } = await fetchPlacePredictions(text, { restrictToVizag });
      setPredictions(results);
      if (error === 'NO_API_KEY') {
        setSearchError('API key not set. Add to EAS secrets (for APK) or .env (for Expo Go).');
      } else if (error === 'REQUEST_DENIED') {
        setSearchError('API key restricted. In Google Cloud, add Android app (com.vizagtaxihub.app) or set Application restrictions to None.');
      } else if (error === 'NETWORK') {
        setSearchError('Unable to fetch locations. Check your internet connection.');
      } else {
        setSearchError(null);
      }
      setShowSuggestions(true);
    } catch {
      setPredictions([]);
      setSearchError('Unable to fetch locations. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, [restrictToVizag]);

  const handleChangeText = (text: string) => {
    setInputValue(text);
    setSearchError(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text) {
      onLocationChange(null);
      setPredictions([]);
      return;
    }
    debounceRef.current = setTimeout(() => search(text), DEBOUNCE_MS);
  };

  const handleSelectPrediction = async (prediction: any) => {
    setShowSuggestions(false);
    setPredictions([]);
    setLoading(true);
    try {
      const location = await fetchPlaceDetails(prediction.place_id);
      if (!location) return;
      if (isPickupLocation || tripType === 'local') {
        const validation = validatePickupLocation(location, tripType);
        if (!validation.valid) {
          Alert.alert('Invalid Location', validation.message ?? 'Please select a valid location.');
          onLocationChange(null);
          setInputValue('');
          return;
        }
      } else if (tripType === 'airport') {
        validateDropLocation(location, tripType);
        // Parent (HomeScreen) will auto-switch tab when drop is outside 35km
      }
      setInputValue(location.name || location.address);
      onLocationChange(location);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setInputValue('');
    setPredictions([]);
    setShowSuggestions(false);
    setSearchError(null);
    onLocationChange(null);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrapper, showLeftIcon && styles.inputWrapperWithIcon]}>
        {showLeftIcon && (
          <View style={styles.iconInside}>
            <Feather name="map-pin" size={18} color={colors.gray600} />
          </View>
        )}
        <TextInput
          style={[styles.input, showLeftIcon && styles.inputWithIcon]}
          value={inputValue}
          onChangeText={handleChangeText}
          placeholder={value ? '' : placeholder}
          placeholderTextColor={colors.mutedForeground}
          onFocus={() => predictions.length > 0 && setShowSuggestions(true)}
        />
        {inputValue ? (
          <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
            <Text style={styles.clearText}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {helperText ? (
        <Text style={styles.helper}>{helperText}</Text>
      ) : null}
      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}
      {searchError && inputValue.length >= 2 && !loading && (
        <Text style={styles.searchError}>{searchError}</Text>
      )}
      {showSuggestions && predictions.length > 0 && (
        <View style={styles.suggestions}>
          <ScrollView
            keyboardShouldPersistTaps="always"
            nestedScrollEnabled
            style={styles.suggestionsList}
          >
            {predictions.map((item) => (
              <TouchableOpacity
                key={item.place_id}
                style={styles.suggestionItem}
                onPress={() => handleSelectPrediction(item)}
                activeOpacity={0.7}
              >
                <Text style={styles.suggestionMain}>{item.structured_formatting?.main_text || item.description}</Text>
                {item.structured_formatting?.secondary_text ? (
                  <Text style={styles.suggestionSub}>{item.structured_formatting.secondary_text}</Text>
                ) : null}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
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
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.gray50,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  inputWrapperWithIcon: {},
  iconInside: { marginRight: 6 },
  input: {
    flex: 1,
    borderWidth: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
    fontSize: 15,
    fontWeight: '600',
    color: colors.foreground,
    backgroundColor: 'transparent',
  },
  inputWithIcon: { paddingLeft: 0 },
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
  loader: { marginTop: 4 },
  searchError: {
    fontSize: 12,
    color: '#b91c1c',
    marginTop: 6,
    fontFamily: 'Inter_400Regular',
  },
  suggestions: {
    marginTop: 4,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: 200,
    zIndex: 9999,
    elevation: 8,
    ...(Platform.OS === 'web' ? { position: 'absolute' as const, left: 0, right: 0, top: '100%' } : {}),
  },
  suggestionsList: { maxHeight: 196 },
  suggestionItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  suggestionMain: { fontWeight: '600', color: colors.foreground },
  suggestionSub: { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
});
