/**
 * FuelCaptureModal - Capture fuel bill, parallel OCR + GPS, always continues to form.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { extractTextFromImage } from '../services/ocrService';
import { colors } from '../theme/colors';
import { formatPlaceFromGeocode } from '../utils/formatReverseGeocode';
import { parseFuelFinalAmountFromText } from '../utils/parseFuelFinalAmountFromOcr';

export type ParsedFuelType = 'Petrol' | 'Diesel' | 'CNG' | 'Electric';

/** @deprecated Use FuelCaptureSessionResult; kept for typing OCR hints */
export interface FuelCaptureResult {
  amount: number;
  liters: number;
  vehicleNumber: string;
  fuelStation?: string;
  fuelType?: ParsedFuelType;
  imageUri: string;
}

export interface FuelCaptureLocation {
  latitude: number;
  longitude: number;
  accuracy: number | null;
}

export interface FuelCaptureSessionResult {
  imageUri: string;
  /** null if OCR could not detect an amount — user enters manually */
  amount: number | null;
  fuelStation?: string;
  /** Reverse-geocoded place name from GPS (used when OCR has no station) */
  locationName?: string;
  fuelType?: ParsedFuelType;
  vehicleNumber?: string;
  location: FuelCaptureLocation | null;
  capturedAt: string;
  rawOcrText?: string;
}

function extractStationName(raw: string): string | undefined {
  const paidAt = raw.match(/paid\s+at\s+([^\n\r]+?)(?=\n|$)/i);
  if (paidAt) {
    let s = paidAt[1].trim().replace(/\s+/g, ' ');
    s = s.replace(/\s+\d{5,}\s*$/, '').trim();
    if (s.length >= 2 && s.length <= 120) return s;
  }
  const collapsed = raw.replace(/\s+/g, ' ').trim();
  const collapsedStation = collapsed.match(
    /welcomes\s+you\s+([A-Za-z0-9\s&.]{3,70}?)\s+(?:pump\s*\(|tel\.|inv\.|no\.|local\s+id)/i
  );
  if (collapsedStation?.[1]) {
    const s = collapsedStation[1].trim();
    if (s.length >= 3) return s.slice(0, 120);
  }
  const ent = collapsed.match(/\b([A-Z][A-Za-z0-9\s&.]{2,50}?(?:ENTERPRISES|SERVICES))\b/i);
  if (ent?.[1]) return ent[1].trim().slice(0, 120);

  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  const noise =
    /^(inv\.?|no\.?|date|time|product|volume|rate|amount|tel\.?|mobile|vehicle|thank|preset|density|nozzle|fip|local|atot|vtot|₹|pump|product|density|local\s+id|fip\s+no|nozzle\s+no)/i;

  for (let i = 0; i < lines.length; i++) {
    if (/welcomes\s+you/i.test(lines[i])) {
      const next = lines[i + 1];
      if (
        next &&
        next.length >= 3 &&
        !noise.test(next) &&
        !/^pump\s*\(/i.test(next) &&
        !/^m\d+/i.test(next)
      ) {
        return next.replace(/\s*\([^)]*\)\s*$/, '').replace(/\.$/, '').trim().slice(0, 120);
      }
    }
  }
  for (const line of lines) {
    if (noise.test(line)) continue;
    if (/^(bharat\s+petroleum|indian\s+oil|hpcl|iocl|bpcl|shell|essar|nayara)\b/i.test(line) && line.length < 45) {
      continue;
    }
    if (/\b(ENTERPRISES|PETROLEUM|SERVICES|OUTLET|FUELS|FILLING\s+STATION)\b/i.test(line)) {
      return line.replace(/\s*\([^)]*\)\s*$/, '').replace(/\.$/, '').trim().slice(0, 120);
    }
  }
  return undefined;
}

function parseFuelFromText(text: string): Partial<FuelCaptureResult> {
  const result: Partial<FuelCaptureResult> = {};
  const station = extractStationName(text);
  if (station) result.fuelStation = station;
  const clean = text.replace(/\s+/g, ' ').replace(/\s*:\s*/g, ' : ');
  const toNum = (s: string) => parseFloat(s.replace(/,/g, '')) || 0;

  const fromParser = parseFuelFinalAmountFromText(text);
  if (fromParser != null && fromParser >= 1 && fromParser <= 999999) {
    result.amount = fromParser;
  }

  // Pump-style total row without ₹/Rs (OCR dropped symbol)
  if (!result.amount || result.amount < 1) {
    const totalPump = clean.match(/\btotal\s+(\d{2,6}\.\d{2})\b/i);
    if (totalPump) {
      const val = toNum(totalPump[1]);
      if (val >= 50 && val <= 999999) result.amount = val;
    }
  }

  const volumeLabelMatch = clean.match(
    /(?:volume|vol)\s*\(?\s*l\s*\)?\s*:?\s*(\d+(?:\.\d{1,2})?)/i
  );
  if (volumeLabelMatch) {
    const v = toNum(volumeLabelMatch[1]);
    if (v >= 0 && v <= 9999) result.liters = v;
  }
  if (result.liters === undefined) {
    const literSuffix = clean.match(/(\d{1,4}(?:\.\d{1,2})?)\s*(?:l|litres?|liters?|ltr)/i);
    if (literSuffix) result.liters = toNum(literSuffix[1]);
  }

  const productMatch = clean.match(/(?:product|fuel)\s*:?\s*(petrol|diesel|cng|electric)\b/i);
  if (productMatch) {
    const w = productMatch[1].toLowerCase();
    if (w === 'petrol') result.fuelType = 'Petrol';
    else if (w === 'diesel') result.fuelType = 'Diesel';
    else if (w === 'cng') result.fuelType = 'CNG';
    else if (w === 'electric') result.fuelType = 'Electric';
  }

  const vehicleMatch = clean.match(
    /(?:AP|TS|TN|KA|MH|KL|DL|GJ|OD|WB|UP)[\s-]*\d{2}[\s-]*[A-Z]{1,2}[\s-]*\d{1,4}/i
  );
  if (vehicleMatch) {
    result.vehicleNumber = vehicleMatch[0].replace(/\s+/g, ' ').trim();
  }
  return result;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSessionComplete: (session: FuelCaptureSessionResult) => void;
}

export function FuelCaptureModal({ visible, onClose, onSessionComplete }: Props) {
  const [step, setStep] = useState<'idle' | 'capturing' | 'processing'>('idle');
  const [statusHint, setStatusHint] = useState('');

  const handleCapture = async () => {
    setStatusHint('');
    setStep('capturing');

    await Location.requestForegroundPermissionsAsync();

    const { status: camStatus } = await ImagePicker.requestCameraPermissionsAsync();
    if (camStatus !== 'granted') {
      setStatusHint('Camera permission is required to capture the receipt.');
      setStep('idle');
      return;
    }

    const pickerResult = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.8,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });

    if (pickerResult.canceled || !pickerResult.assets?.[0]?.uri) {
      setStep('idle');
      return;
    }

    const imageUri = pickerResult.assets[0].uri;
    const capturedAt = new Date().toISOString();
    setStep('processing');

    let fullText = '';
    let location: FuelCaptureLocation | null = null;

    try {
      const [texts, pos] = await Promise.all([
        extractTextFromImage(imageUri).catch(() => [] as string[]),
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }).catch(() => null),
      ]);

      fullText = (texts || []).join('\n');
      if (pos?.coords) {
        location = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? null,
        };
      }
    } catch {
      fullText = '';
    }

    let locationName: string | undefined;
    if (location) {
      try {
        const geo = await Location.reverseGeocodeAsync({
          latitude: location.latitude,
          longitude: location.longitude,
        });
        locationName = formatPlaceFromGeocode(geo[0]);
      } catch {
        locationName = undefined;
      }
    }

    const parsed = parseFuelFromText(fullText);
    const amount =
      parsed.amount != null && parsed.amount >= 1 && parsed.amount <= 999999 ? parsed.amount : null;

    onSessionComplete({
      imageUri,
      amount,
      fuelStation: parsed.fuelStation,
      locationName,
      fuelType: parsed.fuelType,
      vehicleNumber: parsed.vehicleNumber,
      location,
      capturedAt,
      rawOcrText: fullText.trim() || undefined,
    });
    setStep('idle');
    setStatusHint('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.title}>Capture Fuel Bill</Text>
          <Text style={styles.desc}>
            Take a photo of the fuel bill or payment receipt. We will read the amount when possible; you can always
            edit on the next screen. Location is saved in the background if you allow it.
          </Text>
          {statusHint ? <Text style={styles.errorText}>{statusHint}</Text> : null}
          <View style={styles.actions}>
            {step === 'idle' && (
              <>
                <TouchableOpacity style={styles.captureBtn} onPress={() => void handleCapture()}>
                  <Text style={styles.captureBtnText}>Take Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => {
                    setStatusHint('');
                    onClose();
                  }}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
            {(step === 'capturing' || step === 'processing') && (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>
                  {step === 'capturing' && 'Opening camera...'}
                  {step === 'processing' && 'Reading receipt, location & place name...'}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  content: { backgroundColor: '#fff', borderRadius: 16, padding: 24 },
  title: { fontSize: 18, fontWeight: '700', color: colors.foreground, marginBottom: 8 },
  desc: { fontSize: 14, color: colors.gray600, marginBottom: 16, lineHeight: 20 },
  errorText: { fontSize: 14, color: '#dc2626', marginBottom: 12 },
  actions: { gap: 12 },
  captureBtn: { backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  captureBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  cancelBtn: { paddingVertical: 14, alignItems: 'center' },
  cancelBtnText: { fontSize: 16, fontWeight: '500', color: colors.gray600 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  loadingText: { fontSize: 14, color: colors.gray600 },
});
