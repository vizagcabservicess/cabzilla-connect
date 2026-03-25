/**
 * FuelCaptureModal - Capture fuel bill photo, extract via OCR (amount, liters, vehicle number)
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { extractTextFromImage } from '../services/ocrService';
import { colors } from '../theme/colors';

export type ParsedFuelType = 'Petrol' | 'Diesel' | 'CNG' | 'Electric';

export interface FuelCaptureResult {
  amount: number;
  liters: number;
  vehicleNumber: string;
  /** Dealer / outlet name from receipt header (e.g. KRISHNA ENTERPRISES) */
  fuelStation?: string;
  /** From receipt line e.g. Product : Petrol */
  fuelType?: ParsedFuelType;
  imageUri: string;
}

/** Outlet name from BP/IOCL/HPCL-style receipts (often line after "Welcomes You" or line with ENTERPRISES). */
function extractStationName(raw: string): string | undefined {
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

  // 1. Amount – labeled formats (Bharat Petroleum, IndianOil, etc.)
  const amountPatterns: Array<{ re: RegExp; minVal?: number }> = [
    { re: /(?:total\s+)?amount\s*\(?\s*rs\.?\s*\)?\s*:?\s*(\d+(?:\.\d{2})?)/i },
    { re: /total\s+amount\s*\(?\s*rs\.?\s*\)?\s*:?\s*(\d+(?:\.\d{2})?)/i },
    { re: /(?:amount|amt|total)\s*\(?\s*rs\.?\s*\)?\s*:?\s*(\d+(?:\.\d{2})?)/i },
    { re: /(?:amount|total)[^\d]{0,30}(\d{3,7}\.\d{2})/i, minVal: 100 },
    { re: /₹\s*(\d+(?:\.\d{2})?)|(\d{3,7}(?:\.\d{2})?)\s*₹/ },
  ];
  for (const { re, minVal = 1 } of amountPatterns) {
    const m = clean.match(re);
    const val = m ? toNum(m[1] ?? m[2] ?? '0') : 0;
    if (val >= minVal && val <= 999999) {
      result.amount = val;
      break;
    }
  }

  // 2. Volume – "Volume (L) : 00024.19" or "Volume(L):" or "24.19 L"
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

  // Fuel type – "Product : Petrol", "Fuel: Diesel"
  const productMatch = clean.match(/(?:product|fuel)\s*:?\s*(petrol|diesel|cng|electric)\b/i);
  if (productMatch) {
    const w = productMatch[1].toLowerCase();
    if (w === 'petrol') result.fuelType = 'Petrol';
    else if (w === 'diesel') result.fuelType = 'Diesel';
    else if (w === 'cng') result.fuelType = 'CNG';
    else if (w === 'electric') result.fuelType = 'Electric';
  }

  // 3. Vehicle – Indian plates (AP39WD 9777, TS01AB 1234)
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
  onResult: (result: FuelCaptureResult) => void;
  /** Called when OCR fails – pass image URI so user can enter details manually */
  onManualFallback?: (imageUri: string) => void;
}

export function FuelCaptureModal({ visible, onClose, onResult, onManualFallback }: Props) {
  const [step, setStep] = useState<'idle' | 'capturing' | 'processing'>('idle');
  const [error, setError] = useState('');
  const [failedImageUri, setFailedImageUri] = useState<string | null>(null);
  const [debugOcrText, setDebugOcrText] = useState<string | null>(null);

  const handleCapture = async () => {
    setError('');
    setFailedImageUri(null);
    setDebugOcrText(null);
    setStep('capturing');

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      setError('Camera permission is required');
      setStep('idle');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.8,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });

    if (result.canceled || !result.assets?.[0]?.uri) {
      setStep('idle');
      return;
    }

    setStep('processing');
    try {
      const texts = await extractTextFromImage(result.assets[0].uri);
      const fullText = (texts || []).join(' ');
      const parsed = parseFuelFromText(fullText);

      if (!parsed.amount || parsed.amount < 1) {
        setError('Could not detect amount. Please retake with the total amount clearly visible, or enter details manually.');
        setFailedImageUri(result.assets[0].uri);
        setDebugOcrText(fullText || '(no text from OCR)');
        setStep('idle');
        return;
      }

      onResult({
        amount: parsed.amount,
        liters: parsed.liters || 0,
        vehicleNumber: parsed.vehicleNumber || '',
        fuelStation: parsed.fuelStation,
        fuelType: parsed.fuelType,
        imageUri: result.assets[0].uri,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to process');
      setFailedImageUri(result.assets?.[0]?.uri ?? null);
      setStep('idle');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.title}>Capture Fuel Bill</Text>
          <Text style={styles.desc}>
            Take a photo of the fuel bill. Amount, liters, fuel station, and vehicle number will be extracted when possible.
          </Text>
          {error ? (
            <Text style={styles.errorText}>
              {error.includes('Tesseract') ? 'Receipt scanning is not available. You can enter the details manually.' : error}
            </Text>
          ) : null}
          {debugOcrText !== null ? (
            <View style={styles.debugBox}>
              <Text style={styles.debugLabel}>Debug – raw OCR text:</Text>
              <ScrollView style={styles.debugScroll} nestedScrollEnabled>
                <Text style={styles.debugText} selectable>
                  {debugOcrText || '(empty)'}
                </Text>
              </ScrollView>
            </View>
          ) : null}
          <View style={styles.actions}>
            {step === 'idle' && (
              <>
                <TouchableOpacity style={styles.captureBtn} onPress={handleCapture}>
                  <Text style={styles.captureBtnText}>Take Photo</Text>
                </TouchableOpacity>
                {error && failedImageUri && onManualFallback && (
                  <TouchableOpacity
                    style={styles.manualBtn}
                    onPress={() => {
                      onManualFallback(failedImageUri);
                      setError('');
                      setFailedImageUri(null);
                      setDebugOcrText(null);
                      onClose();
                    }}
                  >
                    <Text style={styles.manualBtnText}>Enter Manually</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => {
                    setError('');
                    setDebugOcrText(null);
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
                  {step === 'processing' && 'Extracting details...'}
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
  debugBox: { marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 8 },
  debugLabel: { fontSize: 12, fontWeight: '600', color: colors.gray600, marginBottom: 4 },
  debugScroll: { maxHeight: 120 },
  debugText: { fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: '#374151' },
  actions: { gap: 12 },
  captureBtn: { backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  captureBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  manualBtn: { paddingVertical: 14, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: colors.primary },
  manualBtnText: { fontSize: 16, fontWeight: '600', color: colors.primary },
  cancelBtn: { paddingVertical: 14, alignItems: 'center' },
  cancelBtnText: { fontSize: 16, fontWeight: '500', color: colors.gray600 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  loadingText: { fontSize: 14, color: colors.gray600 },
});
