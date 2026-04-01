/**
 * FuelEntryScreen - Driver fuel entry with receipt capture, OCR, payment method
 */
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { colors } from '../theme/colors';
import { authAPI } from '../services/authAPI';
import { driverTripsAPI } from '../services/driverTripsAPI';
import type { DriverTrip } from '../services/driverTripsAPI';
import { formatPlaceFromGeocode } from '../utils/formatReverseGeocode';
import { parseOdometerFromText } from '../utils/parseOdometerFromOcr';
import { compressImageForUpload } from '../utils/compressImageForUpload';
import { FuelCaptureCameraModal } from '../components/FuelCaptureCameraModal';
import {
  analyzeFuelCaptureUnified,
  fuelUnifiedVisionFromUploadPayload,
  FUEL_RETAKE_GUIDANCE_MESSAGE,
  type FuelCapturePhase,
  type FuelVisionUnifiedResult,
} from '../services/fuelGeminiVisionUnified';

const PAYMENT_OPTIONS: { value: 'card' | 'upi' | 'customer_advance' | 'company_paid'; label: string }[] = [
  { value: 'card', label: 'Card' },
  { value: 'upi', label: 'UPI' },
  { value: 'customer_advance', label: 'Customer Advance' },
  { value: 'company_paid', label: 'Company Paid' },
];

type ParsedFuelType = 'Petrol' | 'Diesel' | 'CNG' | 'Electric';

const CAPTURE_WINDOW_MS = 30 * 60 * 1000;

export type CaptureMeta = {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  capturedAt: string;
};

const FUEL_TYPE_OPTIONS: { value: ParsedFuelType; label: string }[] = [
  { value: 'Petrol', label: 'Petrol' },
  { value: 'Diesel', label: 'Diesel' },
  { value: 'CNG', label: 'CNG' },
  { value: 'Electric', label: 'Electric' },
];

const TAB_BAR_HEIGHT = 56;

function normalizeVehicleNo(s: string): string {
  return s.replace(/\s/g, '').toLowerCase();
}

/** API may return numbers as strings; avoid NaN from empty or junk. */
function parsePositiveAmount(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === 'number' && Number.isFinite(v) && v > 0) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(/,/g, '').trim());
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

/** e.g. ₹11178 from glued ₹/L vs ₹2019 on receipt OCR — block save until pump is retaken. */
function ocrPumpAndReceiptTotalsDangerouslyMismatch(receiptOcr: number | null, pumpOcr: number | null): boolean {
  if (receiptOcr == null || pumpOcr == null) return false;
  if (!(receiptOcr > 0) || !(pumpOcr > 0)) return false;
  const tol = Math.max(120, receiptOcr * 0.15);
  return Math.abs(pumpOcr - receiptOcr) > tol;
}

/** Softer threshold: show confirm modal (driver may still proceed after acknowledging). */
function receiptPumpOcrTotalsMeaningfullyDiffer(receiptOcr: number | null, pumpOcr: number | null): boolean {
  if (receiptOcr == null || pumpOcr == null) return false;
  if (!(receiptOcr > 0) || !(pumpOcr > 0)) return false;
  const lo = Math.min(receiptOcr, pumpOcr);
  const tol = Math.max(15, lo * 0.02);
  return Math.abs(pumpOcr - receiptOcr) > tol;
}

type CrossMismatchLine = { key: string; text: string };

/**
 * Differences across receipt OCR, pump OCR, and edited fields — driver must confirm before save
 * (unless a server anti-fraud flag is set).
 */
function buildCrossSourceMismatchLines(params: {
  ocrReceiptAmount: number | null;
  ocrPumpAmount: number | null;
  ocrReceiptQty: number | null;
  ocrPumpQty: number | null;
  enteredTotal: number;
  enteredQty: number;
  enteredOdo: number;
  ocrOdometer: number | null;
}): CrossMismatchLine[] {
  const lines: CrossMismatchLine[] = [];
  const {
    ocrReceiptAmount,
    ocrPumpAmount,
    ocrReceiptQty,
    ocrPumpQty,
    enteredTotal,
    enteredQty,
    enteredOdo,
    ocrOdometer,
  } = params;

  if (receiptPumpOcrTotalsMeaningfullyDiffer(ocrReceiptAmount, ocrPumpAmount)) {
    lines.push({
      key: 'receipt_vs_pump',
      text: `Receipt OCR total ₹${ocrReceiptAmount!.toFixed(2)} vs pump display OCR ₹${ocrPumpAmount!.toFixed(2)} (check photos or edit amounts).`,
    });
  }
  if (ocrPumpAmount != null && ocrPumpAmount > 0 && Number.isFinite(enteredTotal) && enteredTotal > 0) {
    const tol = Math.max(20, enteredTotal * 0.03);
    if (Math.abs(enteredTotal - ocrPumpAmount) > tol) {
      lines.push({
        key: 'entered_vs_pump',
        text: `Entered total ₹${enteredTotal.toFixed(2)} vs pump OCR ₹${ocrPumpAmount.toFixed(2)}.`,
      });
    }
  }
  if (ocrReceiptAmount != null && ocrReceiptAmount > 0 && Number.isFinite(enteredTotal) && enteredTotal > 0) {
    const tol = Math.max(20, enteredTotal * 0.03);
    if (Math.abs(enteredTotal - ocrReceiptAmount) > tol) {
      lines.push({
        key: 'entered_vs_receipt',
        text: `Entered total ₹${enteredTotal.toFixed(2)} vs receipt OCR ₹${ocrReceiptAmount.toFixed(2)}.`,
      });
    }
  }
  if (
    ocrReceiptQty != null &&
    ocrReceiptQty > 0 &&
    ocrPumpQty != null &&
    ocrPumpQty > 0 &&
    Math.abs(ocrReceiptQty - ocrPumpQty) > Math.max(0.35, ocrPumpQty * 0.04)
  ) {
    lines.push({
      key: 'qty_receipt_vs_pump',
      text: `Quantity: receipt OCR ${ocrReceiptQty.toFixed(2)} vs pump OCR ${ocrPumpQty.toFixed(2)} (litres or kg).`,
    });
  }
  if (
    ocrOdometer != null &&
    ocrOdometer > 0 &&
    Number.isFinite(enteredOdo) &&
    enteredOdo > 0 &&
    Math.abs(enteredOdo - ocrOdometer) >= Math.max(5, Math.floor(enteredOdo * 0.002))
  ) {
    lines.push({
      key: 'odometer',
      text: `Odometer: you entered ${enteredOdo} km but the odometer photo OCR suggests ${ocrOdometer} km.`,
    });
  }
  if (ocrPumpQty != null && ocrPumpQty > 0 && Number.isFinite(enteredQty) && enteredQty > 0) {
    const tol = Math.max(0.4, enteredQty * 0.04);
    if (Math.abs(enteredQty - ocrPumpQty) > tol) {
      lines.push({
        key: 'entered_qty_vs_pump',
        text: `Quantity: you entered ${enteredQty.toFixed(2)} but pump OCR ${ocrPumpQty.toFixed(2)}.`,
      });
    }
  }

  return lines;
}

/** If ₹/L implied by amount ÷ litres is outside a normal forecourt band, OCR probably grabbed density or wrong row (missing decimals). */
function fuelPumpImpliedRateLooksInvalid(amount: number, qty: number): boolean {
  if (!(amount > 0) || !(qty > 0.25) || qty > 200) return false;
  const implied = amount / qty;
  return implied < 62 || implied > 155;
}

/** Match server `fuel_pump_numeric_math_abs_delta_inr` (~₹0.10; small slack for float). */
function pumpSaleTotalMatchesVolumeTimesRate(amount: number, qty: number, rate: number): boolean {
  const calc = qty * rate;
  if (!(calc > 0) || !Number.isFinite(calc) || !Number.isFinite(amount)) return false;
  const exp2 = Math.round(calc * 100) / 100;
  const expR = Math.round(calc);
  const delta = Math.min(Math.abs(amount - exp2), Math.abs(amount - expR));
  return delta <= 0.11;
}

/**
 * Pump digits are only trustworthy for autofill when unified vision is confident and returns
 * both amount and volume — otherwise we would paste Vision/heuristic guesses that still imply a “normal” ₹/L.
 */
function isUnifiedPumpReadingTrustworthy(u: FuelVisionUnifiedResult | null): boolean {
  if (u == null || u.should_retake) return false;
  if (u.confidence !== 'high') return false;
  const a = parsePositiveAmount(u.fuel_amount);
  const q = parsePositiveAmount(u.volume);
  if (a == null || q == null) return false;
  // Sale total is not in the forecourt ₹/L band (~₹80–₹130); values there are almost always the Rate row mis-mapped.
  if (a >= 80 && a <= 130) return false;
  // Model often puts Volume (L) in fuel_amount and garbage in volume; implied ₹/L still looks "normal" (e.g. 20.95 / 0.32).
  const r = parsePositiveAmount(u.rate);
  if (
    r != null &&
    q < 2.5 &&
    q > 0 &&
    a >= 5 &&
    a <= 70 &&
    r >= 70 &&
    r <= 125
  ) {
    return false;
  }
  if (fuelPumpImpliedRateLooksInvalid(a, q)) return false;
  if (r != null && !pumpSaleTotalMatchesVolumeTimesRate(a, q, r)) return false;
  return true;
}

/** Server included pump LLM (Gemini) JSON in debug and it passed hard validation. */
function isServerPumpVisionValidated(fuelOcrDebug: unknown): boolean {
  if (fuelOcrDebug == null || typeof fuelOcrDebug !== 'object') return false;
  const o = fuelOcrDebug as Record<string, unknown>;
  if (o.pump_gemini_validated === true || o.pump_claude_validated === true) return true;
  const gv = o.gemini_pump_vision;
  if (gv != null && typeof gv === 'object' && (gv as Record<string, unknown>).ok === true) return true;
  const legacy = o.claude_haiku_vision;
  if (legacy != null && typeof legacy === 'object' && (legacy as Record<string, unknown>).ok === true)
    return true;
  return false;
}

/** Merge server `fuelOcrDebug` with the app’s parallel `fuel-vision-unified.php` result for Push debug / Metro. */
function mergeFuelOcrDebugWithClientUnified(
  rawDbg: unknown,
  phase: FuelCapturePhase,
  unifiedVision: FuelVisionUnifiedResult | null,
  visionTokenSent: boolean,
): Record<string, unknown> {
  const base =
    rawDbg != null && typeof rawDbg === 'object' && !Array.isArray(rawDbg)
      ? { ...(rawDbg as Record<string, unknown>) }
      : {};
  const serialized =
    unifiedVision == null
      ? null
      : {
          fuel_amount: unifiedVision.fuel_amount,
          volume: unifiedVision.volume,
          rate: unifiedVision.rate,
          odometer_reading: unifiedVision.odometer_reading,
          confidence: unifiedVision.confidence,
          source: unifiedVision.source,
          should_retake: unifiedVision.should_retake,
        };
  base.client_unified_vision = {
    note:
      'Pump: usually from upload data.fuelUnifiedVision (one Gemini call). Receipt/odometer: parallel fuel-vision-unified.php. Compare with gemini_pump_vision in debug.',
    phase,
    token_sent: visionTokenSent,
    pump_autofill_trustworthy:
      phase === 'pump' ? isUnifiedPumpReadingTrustworthy(unifiedVision) : undefined,
    result: serialized,
  };
  return base;
}

/** Server `ocr_retake_reasons` codes — keep in sync with fuel-ocr-debug.php */
const OCR_RETAKE_REASON_LABEL: Record<string, string> = {
  sparse_receipt_text: 'very little text detected',
  few_lines_no_station_context: 'slip layout not recognized',
  conflicting_payable_candidates: 'conflicting totals detected',
  weak_parse_multi_candidate: 'unclear which amount is the bill total',
  sparse_pump_text: 'very little text on the pump display',
  implied_rate_unrealistic: 'litres and total do not match a normal ₹/L',
  volume_line_unreadable: 'volume line not readable — amount alone is unreliable',
  volume_line_unreadable_inferred_qty: 'volume line unreadable (values were inferred)',
  quantity_inferred_from_sale_rate: 'litres were inferred from total ÷ rate only',
  heavy_digit_repairs: 'many digit corrections — image may be blurry or glared',
};

function buildOcrRetakeAlert(extracted: Record<string, unknown>, phase: 'receipt' | 'pump'): { title: string; message: string } | null {
  if (extracted.ocr_retake_recommended !== true) return null;
  const codes = Array.isArray(extracted.ocr_retake_reasons)
    ? (extracted.ocr_retake_reasons as unknown[]).filter((x): x is string => typeof x === 'string' && x.length > 0)
    : [];
  const detail =
    codes.length === 0
      ? 'The photo looks too unclear to trust automatic readings (glare, blur, or cropping).'
      : `Possible issues: ${codes.map((c) => OCR_RETAKE_REASON_LABEL[c] ?? c).join('; ')}.`;
  const lighting =
    phase === 'receipt'
      ? 'Hold the receipt flat, avoid flash on glossy paper, and use even lighting.'
      : 'Face the display straight-on, block reflections, wait for digits to steady, and tap to focus.';
  return {
      title: 'Retake this photo',
      message: `${detail}\n\n${lighting}\n\nWe did not fill in amounts automatically. You can type them after a clearer shot.`,
    };
}

export function FuelEntryScreen() {
  const navigation = useNavigation<any>();
  const { params } = useRoute<any>();
  const insets = useSafeAreaInsets();
  const initialBookingId = params?.bookingId ?? null;
  const scrollBottomPadding = insets.bottom + TAB_BAR_HEIGHT + 32;

  const [vehicles, setVehicles] = useState<{ id: number; vehicleNumber: string; name: string }[]>([]);
  const [trips, setTrips] = useState<DriverTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [vehicleId, setVehicleId] = useState<number | null>(null);
  const [bookingId, setBookingId] = useState<number | null>(initialBookingId);
  const [quantity, setQuantity] = useState('');
  const [totalCost, setTotalCost] = useState('');
  const [odometer, setOdometer] = useState('');
  const [fuelStation, setFuelStation] = useState('');
  /** Human-readable GPS + time for the primary capture (receipt, else latest photo). */
  const [captureGpsSummary, setCaptureGpsSummary] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'upi' | 'customer_advance' | 'company_paid'>('company_paid');
  const [cardLastFour, setCardLastFour] = useState('');
  const [receiptPhoto, setReceiptPhoto] = useState<{ localUri: string; imageUrl: string; meta: CaptureMeta } | null>(null);
  const [pumpPhoto, setPumpPhoto] = useState<{ localUri: string; imageUrl: string; meta: CaptureMeta } | null>(null);
  const [odometerPhoto, setOdometerPhoto] = useState<{ localUri: string; imageUrl: string; meta: CaptureMeta } | null>(null);

  const [capturingPhase, setCapturingPhase] = useState<'receipt' | 'pump' | 'odometer' | null>(null);
  const [entryFlags, setEntryFlags] = useState<string[]>([]);
  /** Blocks save until pump upload passes strict server validation (and receipt/pump hold cleared). */
  const [pumpOcrGateBlocked, setPumpOcrGateBlocked] = useState(false);
  /** Driver acknowledged cross-source (receipt / pump / odometer) differences for this submit attempt. */
  const [crossMismatchModalVisible, setCrossMismatchModalVisible] = useState(false);
  const [crossMismatchLines, setCrossMismatchLines] = useState<CrossMismatchLine[]>([]);

  // OCR extracted values (used to show warnings + enable strict Save validation)
  const [ocrReceiptAmount, setOcrReceiptAmount] = useState<number | null>(null);
  const [ocrReceiptQuantity, setOcrReceiptQuantity] = useState<number | null>(null);
  const [ocrPumpAmount, setOcrPumpAmount] = useState<number | null>(null);
  const [ocrPumpQuantity, setOcrPumpQuantity] = useState<number | null>(null);
  const [ocrOdometerValue, setOcrOdometerValue] = useState<number | null>(null);
  /** Last receipt/pump upload explainability payload (`data.fuelOcrDebug` from API). */
  const [fuelOcrDebug, setFuelOcrDebug] = useState<Record<string, unknown> | null>(null);
  const [fuelOcrDebugOpen, setFuelOcrDebugOpen] = useState(false);

  const [fuelType, setFuelType] = useState<ParsedFuelType>('Petrol');
  const [vehicleLocked, setVehicleLocked] = useState(false);

  const ocrReceiptAmountRef = useRef<number | null>(null);
  const ocrPumpAmountRef = useRef<number | null>(null);
  const guidedCaptureRef = useRef<{ resolve: (uri: string) => void; reject: (e: Error) => void } | null>(
    null
  );
  const [guidedCameraVisible, setGuidedCameraVisible] = useState(false);
  const [guidedCameraPhase, setGuidedCameraPhase] = useState<'receipt' | 'pump' | 'odometer'>('pump');
  /** Server-side fuel OCR debug pairs receipt Vision text with pump text on the next pump upload. */
  const receiptPairedOcrTextRef = useRef<string | null>(null);
  useEffect(() => {
    ocrReceiptAmountRef.current = ocrReceiptAmount;
  }, [ocrReceiptAmount]);
  useEffect(() => {
    ocrPumpAmountRef.current = ocrPumpAmount;
  }, [ocrPumpAmount]);

  const selectedTrip = useMemo(
    () => (bookingId != null ? trips.find((t) => t.id === bookingId) ?? null : null),
    [bookingId, trips]
  );

  const load = useCallback(async () => {
    try {
      const [vList, tList] = await Promise.all([driverTripsAPI.getVehicles(), driverTripsAPI.getTrips()]);
      setVehicles(vList);
      setTrips(tList.filter((t) => t.status === 'in_progress' || t.status === 'assigned'));
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      void Location.requestForegroundPermissionsAsync();
    }, [load])
  );

  useEffect(() => {
    if (!loading && initialBookingId != null && trips.some((t) => t.id === initialBookingId)) {
      setBookingId(initialBookingId);
    }
  }, [loading, initialBookingId, trips]);

  useEffect(() => {
    if (!selectedTrip) {
      setVehicleLocked(false);
      return;
    }
    const fid = selectedTrip.fleetVehicleId;
    if (fid != null && fid > 0 && vehicles.some((v) => v.id === fid)) {
      setVehicleId(fid);
      setVehicleLocked(true);
      return;
    }
    const vn = (selectedTrip.vehicleNumber || '').trim();
    if (!vn) {
      setVehicleLocked(false);
      return;
    }
    const match = vehicles.find((v) => normalizeVehicleNo(v.vehicleNumber) === normalizeVehicleNo(vn));
    if (match) {
      setVehicleId(match.id);
      setVehicleLocked(true);
    } else {
      setVehicleLocked(false);
    }
  }, [selectedTrip, vehicles]);

  const selectedVehicleNumber = useMemo(() => {
    if (vehicleId != null) return vehicles.find((v) => v.id === vehicleId)?.vehicleNumber ?? null;
    return selectedTrip?.vehicleNumber ?? null;
  }, [vehicleId, vehicles, selectedTrip]);

  const isCapturedWithinWindow = useCallback((capturedAt?: string | null) => {
    if (!capturedAt) return false;
    const t = new Date(capturedAt).getTime();
    if (Number.isNaN(t)) return false;
    const elapsed = Date.now() - t;
    return elapsed >= 0 && elapsed <= CAPTURE_WINDOW_MS;
  }, []);

  const normalizeFuelTypeFromBackend = (raw: unknown): ParsedFuelType | null => {
    const s = String(raw ?? '').trim().toLowerCase();
    if (s === 'petrol') return 'Petrol';
    if (s === 'diesel') return 'Diesel';
    if (s === 'cng') return 'CNG';
    if (s === 'electric' || s === 'ev') return 'Electric';
    return null;
  };

  const unionFlags = (a: string[], b: string[]): string[] => Array.from(new Set([...a, ...b]));

  const buildGpsSummary = useCallback(async (meta: CaptureMeta, label: string) => {
    if (meta.latitude == null || meta.longitude == null) return '';
    let place = '';
    try {
      const list = await Location.reverseGeocodeAsync({
        latitude: meta.latitude,
        longitude: meta.longitude,
      });
      place = formatPlaceFromGeocode(list[0]) ?? '';
    } catch {
      /* coords only */
    }
    const t = new Date(meta.capturedAt);
    const timeStr = Number.isNaN(t.getTime())
      ? meta.capturedAt
      : t.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    const acc =
      meta.accuracy != null && Number.isFinite(meta.accuracy) ? ` · ±${Math.round(meta.accuracy)} m` : '';
    const coords = `${meta.latitude.toFixed(5)}, ${meta.longitude.toFixed(5)}`;
    const parts = [label];
    if (place) parts.push(place);
    parts.push(`${coords}${acc}`);
    parts.push(timeStr);
    return parts.join('\n');
  }, []);

  useEffect(() => {
    const meta = receiptPhoto?.meta ?? pumpPhoto?.meta ?? odometerPhoto?.meta;
    const label = receiptPhoto
      ? 'Fuel receipt (primary for submit)'
      : pumpPhoto
        ? 'Pump photo'
        : odometerPhoto
          ? 'Odometer photo'
          : '';
    if (!meta || !label || meta.latitude == null || meta.longitude == null) {
      setCaptureGpsSummary('');
      return;
    }
    let cancelled = false;
    void (async () => {
      const s = await buildGpsSummary(meta, label);
      if (!cancelled) setCaptureGpsSummary(s);
    })();
    return () => {
      cancelled = true;
    };
  }, [buildGpsSummary, receiptPhoto, pumpPhoto, odometerPhoto]);

  const handleCapturePhoto = async (phase: 'receipt' | 'pump' | 'odometer') => {
    if (!selectedVehicleNumber) {
      Alert.alert('Validation', 'Please select a vehicle before capturing photos');
      return;
    }
    if (!vehicleId) {
      Alert.alert('Validation', 'Please select a vehicle');
      return;
    }
    if (capturingPhase) return;

    setCapturingPhase(phase);
    try {
      const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
      if (locStatus !== 'granted') {
        Alert.alert('Validation', 'Location permission is required for GPS validation');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });

      let localUri: string;
      if (Platform.OS === 'web') {
        const { status: camStatus } = await ImagePicker.requestCameraPermissionsAsync();
        if (camStatus !== 'granted') {
          Alert.alert('Validation', 'Camera permission is required');
          return;
        }
        const pickerResult = await ImagePicker.launchCameraAsync({
          allowsEditing: false,
          quality: 0.85,
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
        });
        if (pickerResult.canceled || !pickerResult.assets?.[0]?.uri) return;
        localUri = pickerResult.assets[0].uri;
      } else {
        localUri = await new Promise<string>((resolve, reject) => {
          guidedCaptureRef.current = { resolve, reject };
          setGuidedCameraPhase(phase);
          setGuidedCameraVisible(true);
        });
      }
      const capturedAt = new Date().toISOString();

      const uploadType: 'fuel_receipt' | 'fuel_pump' | 'odometer' =
        phase === 'receipt' ? 'fuel_receipt' : phase === 'pump' ? 'fuel_pump' : 'odometer';

      const uploadUri = await compressImageForUpload(localUri, { geminiVisionPreset: true });
      const visionToken = await authAPI.getStoredToken();
      const uploadParams = {
        imageUri: uploadUri,
        skipImageCompress: true,
        type: uploadType,
        bookingId: bookingId || undefined,
        vehicleId: vehicleId || undefined,
        vehicleNumber: selectedVehicleNumber,
        captureTimestamp: capturedAt,
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        locationAccuracy: pos.coords.accuracy ?? null,
        receiptTotalOcr:
          uploadType === 'fuel_pump'
            ? ocrReceiptAmountRef.current != null && ocrReceiptAmountRef.current > 0
              ? ocrReceiptAmountRef.current
              : null
            : undefined,
        pairedReceiptOcrText:
          uploadType === 'fuel_pump' &&
          receiptPairedOcrTextRef.current != null &&
          receiptPairedOcrTextRef.current.trim() !== ''
            ? receiptPairedOcrTextRef.current
            : undefined,
        includeFuelOcrDebug:
          uploadType === 'fuel_pump' || uploadType === 'fuel_receipt' || uploadType === 'odometer'
            ? ('1' as const)
            : undefined,
        fuelType: uploadType === 'fuel_pump' ? fuelType : undefined,
      };

      const [uploaded, unifiedFromParallel] = await Promise.all([
        driverTripsAPI.uploadFuelOdometer(uploadParams),
        phase !== 'pump' && visionToken
          ? analyzeFuelCaptureUnified(uploadUri, visionToken, phase)
          : Promise.resolve(null),
      ]);
      let unifiedVision: FuelVisionUnifiedResult | null = unifiedFromParallel;
      if (phase === 'pump') {
        const fromUpload = fuelUnifiedVisionFromUploadPayload(
          (uploaded as { fuelUnifiedVision?: unknown }).fuelUnifiedVision,
        );
        if (fromUpload != null) {
          unifiedVision = fromUpload;
        } else if (visionToken) {
          const fk =
            fuelType === 'Diesel' ? 'diesel' : fuelType === 'CNG' ? 'cng' : 'petrol';
          unifiedVision = await analyzeFuelCaptureUnified(uploadUri, visionToken, 'pump', fk);
        }
      }

      const imageUrl = uploaded.imageUrl;
      const meta: CaptureMeta = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy ?? null,
        capturedAt,
      };
      const fraudFlags = (Array.isArray(uploaded.fraudFlags) ? uploaded.fraudFlags : []).filter(
        (f) => f !== 'OCR_TIMESTAMP_MISMATCH'
      );
      if (phase === 'receipt') {
        setEntryFlags((prev) => {
          const rest = prev.filter((f) => f !== 'OCR_TIMESTAMP_MISMATCH');
          return fraudFlags.length > 0 ? unionFlags(rest, fraudFlags) : rest;
        });
      } else if (fraudFlags.length > 0 || uploadType === 'fuel_pump') {
        setEntryFlags((prev) => {
          const cleared =
            uploadType === 'fuel_pump' && !fraudFlags.includes('FUEL_AMOUNT_MISMATCH')
              ? prev.filter((f) => f !== 'FUEL_AMOUNT_MISMATCH')
              : prev;
          return fraudFlags.length > 0 ? unionFlags(cleared, fraudFlags) : cleared;
        });
      }

      if (phase === 'receipt') {
        setReceiptPhoto({ localUri, imageUrl, meta });
        receiptPairedOcrTextRef.current =
          typeof uploaded.rawText === 'string' && uploaded.rawText.trim() !== '' ? uploaded.rawText : null;
      } else if (phase === 'pump') {
        setPumpPhoto({ localUri, imageUrl, meta });
      } else {
        setOdometerPhoto({ localUri, imageUrl, meta });
      }

      const extracted = (uploaded.extracted ?? {}) as Record<string, unknown>;
      if (phase === 'odometer') {
        const rawOdo = extracted.odometer;
        let odoVal: number | null = null;
        if (rawOdo != null && rawOdo !== '') {
          const odo = typeof rawOdo === 'number' ? rawOdo : Number(rawOdo);
          if (Number.isFinite(odo) && odo > 0) {
            odoVal = Math.floor(odo);
          }
        }
        if (typeof uploaded.rawText === 'string' && uploaded.rawText.trim() !== '') {
          const fromText = parseOdometerFromText(uploaded.rawText);
          if (fromText != null && fromText > 0) {
            if (odoVal == null) {
              odoVal = fromText;
            } else if (
              odoVal !== fromText &&
              odoVal >= 100_000 &&
              odoVal <= 999_999 &&
              fromText >= 10_000 &&
              fromText <= 99_999 &&
              fromText * 3 < odoVal
            ) {
              // Server often returns a 6-digit OCR glue (e.g. 403351) while on-device parse finds real 5-digit km.
              odoVal = fromText;
            }
          }
        }
        if (
          unifiedVision &&
          (unifiedVision.confidence === 'high' || unifiedVision.confidence === 'medium') &&
          !unifiedVision.should_retake &&
          unifiedVision.odometer_reading != null &&
          unifiedVision.odometer_reading > 0
        ) {
          odoVal = unifiedVision.odometer_reading;
        }
        setOcrOdometerValue(odoVal);
        setOdometer(odoVal != null ? String(odoVal) : '');
        if (__DEV__) {
          const mini = mergeFuelOcrDebugWithClientUnified(null, 'odometer', unifiedVision, Boolean(visionToken));
          // eslint-disable-next-line no-console
          console.log('[FuelOCR odometer client unified]', JSON.stringify(mini.client_unified_vision, null, 2));
        }
      } else {
        const retakeAlert =
          phase === 'receipt' || phase === 'pump' ? buildOcrRetakeAlert(extracted, phase) : null;
        const ocrRetake = retakeAlert != null;

        const amtRaw = extracted.total_amount ?? extracted.amount;
        let amountVal = parsePositiveAmount(amtRaw);
        let qtyVal = parsePositiveAmount(extracted.quantity);
        if (ocrRetake) {
          amountVal = null;
          if (phase === 'pump') qtyVal = null;
        }
        if (unifiedVision && !unifiedVision.should_retake) {
          if (phase === 'pump' && isUnifiedPumpReadingTrustworthy(unifiedVision)) {
            const ua = parsePositiveAmount(unifiedVision.fuel_amount);
            const uq = parsePositiveAmount(unifiedVision.volume);
            if (ua != null) amountVal = ua;
            if (uq != null) qtyVal = uq;
          } else if (
            phase === 'receipt' &&
            (unifiedVision.confidence === 'high' || unifiedVision.confidence === 'medium')
          ) {
            const ua = parsePositiveAmount(unifiedVision.fuel_amount);
            if (ua != null) amountVal = ua;
          }
        }

        if (phase === 'pump') {
          const dbgEarly = (uploaded as { fuelOcrDebug?: unknown }).fuelOcrDebug;
          const serverVisionOk = isServerPumpVisionValidated(dbgEarly);
          const unifiedTrust = isUnifiedPumpReadingTrustworthy(unifiedVision);
          if (!serverVisionOk && !unifiedTrust) {
            amountVal = null;
            qtyVal = null;
          }
        }

        const serverOcrStatus =
          typeof extracted.fuel_ocr_status === 'string' ? extracted.fuel_ocr_status : null;

        if (phase === 'receipt') {
          setOcrReceiptAmount(amountVal);
          ocrReceiptAmountRef.current = amountVal;
          setOcrReceiptQuantity(qtyVal);
          if (amountVal != null) {
            setTotalCost(String(amountVal));
          } else {
            const pump = ocrPumpAmountRef.current;
            setTotalCost(pump != null && pump > 0 ? String(pump) : '');
          }
          const pumpAmt = ocrPumpAmountRef.current;
          if (ocrPumpAndReceiptTotalsDangerouslyMismatch(amountVal, pumpAmt)) {
            setOcrPumpQuantity(null);
            setQuantity('');
          } else {
            const pumpHasQty = pumpPhoto != null && ocrPumpQuantity != null;
            if (!pumpHasQty) setQuantity(qtyVal != null ? String(qtyVal) : '');
          }
        } else {
          setOcrPumpAmount(amountVal);
          ocrPumpAmountRef.current = amountVal;
          const receiptOcr = ocrReceiptAmountRef.current;
          const pumpMismatchTight = serverOcrStatus === 'mismatch';
          const pumpTotalsMismatch = ocrPumpAndReceiptTotalsDangerouslyMismatch(receiptOcr, amountVal);
          if (pumpTotalsMismatch || pumpMismatchTight) {
            setOcrPumpQuantity(null);
            setQuantity('');
          } else {
            setOcrPumpQuantity(qtyVal);
            setQuantity(qtyVal != null ? String(qtyVal) : '');
          }
          const hasReceipt = ocrReceiptAmountRef.current != null && ocrReceiptAmountRef.current > 0;
          if (!hasReceipt && amountVal != null) setTotalCost(String(amountVal));
          else if (!hasReceipt && amountVal == null) setTotalCost('');
        }

        if (phase === 'receipt' || phase === 'pump') {
          const rawDbg = (uploaded as { fuelOcrDebug?: unknown }).fuelOcrDebug;
          const merged = mergeFuelOcrDebugWithClientUnified(
            rawDbg,
            phase,
            unifiedVision,
            Boolean(visionToken),
          );
          setFuelOcrDebug(merged);
          if (__DEV__) {
            // eslint-disable-next-line no-console
            console.log('[FuelOCR debug merged]', JSON.stringify(merged, null, 2));
            if (rawDbg == null || typeof rawDbg !== 'object') {
              // eslint-disable-next-line no-console
              console.warn(
                '[FuelOCR] No server fuelOcrDebug — only client_unified_vision in merged payload; deploy upload-fuel-odometer.php?',
              );
            }
          }
        }

        if (phase === 'pump') {
          const st = typeof extracted.fuel_ocr_status === 'string' ? extracted.fuel_ocr_status : '';
          const blocked =
            extracted.pump_reading_rejected === true || st === 'hold' || st === 'rejected';
          setPumpOcrGateBlocked(blocked);
          if (extracted.pump_reading_rejected === true) {
            const m =
              typeof extracted.pump_reading_message === 'string'
                ? extracted.pump_reading_message
                : 'Could not validate pump display. Retake the photo.';
            Alert.alert('Pump photo not accepted', m);
          } else if (st === 'hold') {
            const pr = extracted.pump_receipt_review as { message?: string } | undefined;
            const hm =
              pr != null && typeof pr.message === 'string'
                ? pr.message
                : 'Pump and receipt amounts do not match. Flagged for review.';
            Alert.alert('Review required', hm);
          }
        }

        if (ocrRetake && retakeAlert) {
          Alert.alert(retakeAlert.title, retakeAlert.message);
        } else if (phase === 'receipt' && amountVal == null) {
          Alert.alert(
            'Could not read receipt total',
            'We could not detect the bill amount on this photo. Retake the receipt with the total in clear view, less glare, and good lighting. You can still enter the amount manually.'
          );
        } else if (phase === 'pump') {
          if (extracted.pump_reading_rejected !== true && amountVal == null) {
            Alert.alert(
              'Could not read pump amount',
              'We could not detect the Amount (₹) on the pump display. Retake the photo so the main sale total is sharp and readable. You can still enter litres and amount manually.'
            );
          } else if (
            amountVal != null &&
            qtyVal != null &&
            fuelPumpImpliedRateLooksInvalid(amountVal, qtyVal)
          ) {
            Alert.alert(
              'Pump numbers look unreliable',
              'The total and litres from this image do not match a normal pump (often caused by glare or missing decimal points). Retake the pump photo or correct the values manually.'
            );
          }
        }

        const station = typeof extracted.station === 'string' ? extracted.station.trim() : '';
        if (station) {
          if (phase === 'receipt') setFuelStation(station);
          if (phase === 'pump' && fuelStation.trim() === '') setFuelStation(station);
        }

        const ft = normalizeFuelTypeFromBackend(extracted.fuel_type ?? extracted.fuelType);
        if (ft) setFuelType(ft);
      }

      if (unifiedVision?.should_retake === true && unifiedVision.confidence === 'low') {
        Alert.alert('Retake suggested', FUEL_RETAKE_GUIDANCE_MESSAGE);
      }

      try {
        const [addr] = await Location.reverseGeocodeAsync({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        const placeLine = formatPlaceFromGeocode(addr);
        if (placeLine) {
          setFuelStation((prev) => (prev.trim() === '' ? placeLine : prev));
        }
      } catch {
        /* optional geocode */
      }
    } catch (e) {
      if (e instanceof Error && e.message === 'cancelled') {
        return;
      }
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to process photos');
    } finally {
      setCapturingPhase(null);
    }
  };

  const handleSubmit = async (options?: { skipCrossMismatchModal?: boolean }) => {
    if (!vehicleId) {
      Alert.alert('Validation', 'Please select a vehicle');
      return;
    }
    if (pumpOcrGateBlocked) {
      Alert.alert(
        'Pump photo not validated',
        'The last pump photo failed validation or is on hold for a receipt mismatch. Retake the pump photo or resolve the review flag before saving.'
      );
      return;
    }
    if (!receiptPhoto || !pumpPhoto || !odometerPhoto) {
      Alert.alert('Validation', 'Capture Fuel receipt, Pump photo, and Odometer photo before submitting');
      return;
    }
    if (![receiptPhoto.meta.capturedAt, pumpPhoto.meta.capturedAt, odometerPhoto.meta.capturedAt].every((at) => isCapturedWithinWindow(at))) {
      Alert.alert('Validation', 'Please capture photos again: each photo must have been taken within the last 30 minutes');
      return;
    }

    if (entryFlags.includes('FUEL_AMOUNT_MISMATCH') || entryFlags.includes('PUMP_RECEIPT_MISMATCH_HOLD')) {
      Alert.alert(
        'Validation',
        'Pump display total and receipt total differ beyond the allowed tolerance for the same fill. Retake the pump or receipt photo.'
      );
      return;
    }

    if (ocrPumpAndReceiptTotalsDangerouslyMismatch(ocrReceiptAmount, ocrPumpAmount)) {
      Alert.alert(
        'Validation',
        'Pump and receipt OCR totals differ by more than about 15% (₹120+). Retake photos for the same fill or correct the amounts before saving.',
      );
      return;
    }

    const q = parseFloat(quantity);
    const t = parseFloat(totalCost);
    if (isNaN(q) || q <= 0 || isNaN(t) || t <= 0) {
      Alert.alert('Validation', 'Quantity and total amount are required');
      return;
    }
    const odo = parseInt(odometer.replace(/\D/g, ''), 10);
    if (isNaN(odo) || odo <= 0) {
      Alert.alert('Validation', 'Odometer reading is required');
      return;
    }

    if (!options?.skipCrossMismatchModal) {
      const mm = buildCrossSourceMismatchLines({
        ocrReceiptAmount,
        ocrPumpAmount,
        ocrReceiptQty: ocrReceiptQuantity,
        ocrPumpQty: ocrPumpQuantity,
        enteredTotal: t,
        enteredQty: q,
        enteredOdo: odo,
        ocrOdometer: ocrOdometerValue,
      });
      if (mm.length > 0) {
        setCrossMismatchLines(mm);
        setCrossMismatchModalVisible(true);
        return;
      }
    }
    if (paymentMethod === 'card' && cardLastFour.replace(/\D/g, '').length !== 4) {
      Alert.alert('Validation', 'Enter last 4 digits of card');
      return;
    }

    setSubmitting(true);
    try {
      await driverTripsAPI.submitFuelEntry({
        vehicleId,
        bookingId: bookingId || undefined,
        quantity: q,
        pricePerUnit: t / q,
        totalCost: t,
        receiptTotalAmount: t,
        pumpDisplayTotal: ocrPumpAmount != null && ocrPumpAmount > 0 ? ocrPumpAmount : null,
        odometer: odo,
        fuelType,
        fuelStation: fuelStation || undefined,
        paymentMethod,
        cardLastFour: paymentMethod === 'card' ? cardLastFour.replace(/\D/g, '').slice(-4) : undefined,
        receiptImageUrl: receiptPhoto.imageUrl,
        pumpImageUrl: pumpPhoto.imageUrl,
        odometerImageUrl: odometerPhoto.imageUrl,
        latitude: receiptPhoto.meta.latitude ?? undefined,
        longitude: receiptPhoto.meta.longitude ?? undefined,
        locationAccuracy: receiptPhoto.meta.accuracy ?? undefined,
        captureTimestamp: receiptPhoto.meta.capturedAt,
        flags: entryFlags,
      });

      Alert.alert('Success', 'Fuel entry saved', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  const qNum = parseFloat(quantity);
  const tNum = parseFloat(totalCost);
  const odoNum = parseInt(odometer.replace(/\D/g, ''), 10);

  const receiptVsPumpVariance =
    ocrPumpAmount != null && ocrPumpAmount > 0 && Number.isFinite(tNum) && tNum > 0 ? Math.round((tNum - ocrPumpAmount) * 100) / 100 : null;

  const ocrPumpReceiptMismatch = ocrPumpAndReceiptTotalsDangerouslyMismatch(ocrReceiptAmount, ocrPumpAmount);

  const photosCaptured = Boolean(receiptPhoto && pumpPhoto && odometerPhoto);
  const captureTimesValid =
    receiptPhoto && pumpPhoto && odometerPhoto
      ? [receiptPhoto.meta.capturedAt, pumpPhoto.meta.capturedAt, odometerPhoto.meta.capturedAt].every((at) => isCapturedWithinWindow(at))
      : false;
  const numericValid = !Number.isNaN(qNum) && qNum > 0 && !Number.isNaN(tNum) && tNum > 0 && !Number.isNaN(odoNum) && odoNum > 0;

  const saveDisabled =
    submitting ||
    !photosCaptured ||
    !captureTimesValid ||
    !numericValid ||
    pumpOcrGateBlocked ||
    entryFlags.includes('FUEL_AMOUNT_MISMATCH') ||
    entryFlags.includes('PUMP_RECEIPT_MISMATCH_HOLD');

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={styles.title}>Add Fuel Entry</Text>
        </View>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.title}>Add Fuel Entry</Text>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottomPadding }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
      >
        <View style={styles.captureRow}>
          <View style={styles.captureCard}>
            <Text style={styles.captureCardTitle} numberOfLines={2}>
              Receipt *
            </Text>
            {receiptPhoto ? (
              <>
                <Image source={{ uri: receiptPhoto.localUri }} style={styles.capturePreview} />
                <TouchableOpacity
                  style={styles.retakeBtnSm}
                  onPress={() => {
                    setReceiptPhoto(null);
                    setOcrReceiptAmount(null);
                    setOcrReceiptQuantity(null);
                    ocrReceiptAmountRef.current = null;
                    receiptPairedOcrTextRef.current = null;
                    setFuelOcrDebug(null);
                    setFuelOcrDebugOpen(false);
                    // Clear receipt total until new OCR runs (avoids stale closure + wrong pump fallback before upload completes).
                    setTotalCost('');
                    void handleCapturePhoto('receipt');
                  }}
                  disabled={capturingPhase !== null}
                >
                  <Text style={styles.retakeBtnTextSm}>Retake</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={styles.captureBtnSm}
                onPress={() => void handleCapturePhoto('receipt')}
                disabled={capturingPhase !== null || !vehicleId}
              >
                {capturingPhase === 'receipt' ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="receipt-outline" size={18} color="#fff" />
                )}
                <Text style={styles.captureBtnTextSm}>Capture</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.captureCard}>
            <Text style={styles.captureCardTitle} numberOfLines={2}>
              Pump *
            </Text>
            {pumpPhoto ? (
              <>
                <Image source={{ uri: pumpPhoto.localUri }} style={styles.capturePreview} />
                <TouchableOpacity
                  style={styles.retakeBtnSm}
                  onPress={() => {
                    setPumpPhoto(null);
                    setOcrPumpAmount(null);
                    setOcrPumpQuantity(null);
                    ocrPumpAmountRef.current = null;
                    setPumpOcrGateBlocked(false);
                    setFuelOcrDebug(null);
                    setFuelOcrDebugOpen(false);
                    setQuantity('');
                    void handleCapturePhoto('pump');
                  }}
                  disabled={capturingPhase !== null}
                >
                  <Text style={styles.retakeBtnTextSm}>Retake</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={styles.captureBtnSm}
                onPress={() => void handleCapturePhoto('pump')}
                disabled={capturingPhase !== null || !vehicleId}
              >
                {capturingPhase === 'pump' ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="flame-outline" size={18} color="#fff" />
                )}
                <Text style={styles.captureBtnTextSm}>Capture</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.captureCard}>
            <Text style={styles.captureCardTitle} numberOfLines={2}>
              Odo *
            </Text>
            {odometerPhoto ? (
              <>
                <Image source={{ uri: odometerPhoto.localUri }} style={styles.capturePreview} />
                <TouchableOpacity
                  style={styles.retakeBtnSm}
                  onPress={() => {
                    setOdometerPhoto(null);
                    setOcrOdometerValue(null);
                    setOdometer('');
                    void handleCapturePhoto('odometer');
                  }}
                  disabled={capturingPhase !== null}
                >
                  <Text style={styles.retakeBtnTextSm}>Retake</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[styles.captureBtnSm, styles.captureBtnOutline]}
                onPress={() => void handleCapturePhoto('odometer')}
                disabled={capturingPhase !== null || !vehicleId}
              >
                {capturingPhase === 'odometer' ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Ionicons name="speedometer-outline" size={18} color={colors.primary} />
                )}
                <Text style={[styles.captureBtnTextSm, styles.captureBtnTextOutline]}>Capture</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {entryFlags.includes('FUEL_AMOUNT_MISMATCH') ? (
          <Text style={styles.errorText}>
            Receipt total and pump display total differ beyond the allowed tolerance (anti-fraud). Retake the pump or
            receipt for the same transaction.
          </Text>
        ) : null}

        {ocrPumpReceiptMismatch ? (
          <Text style={styles.errorText}>
            Pump total from OCR (₹{ocrPumpAmount != null ? ocrPumpAmount.toFixed(2) : '—'}) differs a lot from receipt OCR
            (₹{ocrReceiptAmount != null ? ocrReceiptAmount.toFixed(2) : '—'}). Retake for the same fill if that is wrong.
            Smaller differences: tap Save — you will be asked to confirm before the entry is sent.
          </Text>
        ) : null}

        {receiptPhoto || pumpPhoto ? (
          <View style={styles.ocrDebugCard}>
            <TouchableOpacity
              style={styles.ocrDebugToggle}
              onPress={() => setFuelOcrDebugOpen((o) => !o)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name={fuelOcrDebugOpen ? 'chevron-down' : 'chevron-forward'} size={18} color={colors.primary} />
              <Text style={styles.ocrDebugToggleText}>
                OCR debug {fuelOcrDebug == null ? '(not returned — update server or retake receipt/pump)' : ''}
              </Text>
            </TouchableOpacity>
            {fuelOcrDebugOpen && fuelOcrDebug != null ? (
              <ScrollView style={styles.ocrDebugScroll} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                <Text selectable style={styles.ocrDebugMono}>
                  {JSON.stringify(fuelOcrDebug, null, 2)}
                </Text>
              </ScrollView>
            ) : null}
            {fuelOcrDebugOpen && fuelOcrDebug == null ? (
              <Text style={styles.receiptHintMuted}>
                Receipt and pump uploads request debug from the server. If this stays empty, deploy the latest
                upload-fuel-odometer.php (and OCR helpers) or the upload failed early. Capture the receipt before the
                pump for paired totals in pump debug. In development builds, search Metro or Android Logcat for
                [FuelOCR debug].
              </Text>
            ) : null}
          </View>
        ) : null}

        <Field label="Vehicle *">
          {vehicleLocked && selectedTrip?.vehicleNumber ? (
            <Text style={styles.lockedHint}>Locked to trip vehicle ({selectedTrip.vehicleNumber.trim() || 'assigned'})</Text>
          ) : null}
          <View style={styles.pickerRow}>
            {vehicles.map((v) => {
              const disabled = vehicleLocked && vehicleId !== v.id;
              return (
                <TouchableOpacity
                  key={v.id}
                  disabled={disabled}
                  style={[
                    styles.pickerBtn,
                    vehicleId === v.id && styles.pickerBtnActive,
                    disabled && styles.pickerBtnDisabled,
                  ]}
                  onPress={() => {
                    if (!vehicleLocked) setVehicleId(v.id);
                  }}
                >
                  <Text style={[styles.pickerBtnText, vehicleId === v.id && styles.pickerBtnTextActive, disabled && styles.pickerBtnTextDisabled]}>
                    {v.vehicleNumber}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Field>

        <Field label="Link to Trip (optional)">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[styles.tripChip, !bookingId && styles.tripChipActive]}
              onPress={() => setBookingId(null)}
            >
              <Text style={[styles.tripChipText, !bookingId && styles.tripChipTextActive]}>None</Text>
            </TouchableOpacity>
            {trips.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[styles.tripChip, bookingId === t.id && styles.tripChipActive]}
                onPress={() => setBookingId(t.id)}
              >
                <Text style={[styles.tripChipText, bookingId === t.id && styles.tripChipTextActive]}>{t.bookingNumber}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Field>

        <Field label="Quantity (liters / kg) * — from pump photo">
          <TextInput
            style={styles.input}
            value={quantity}
            onChangeText={setQuantity}
            placeholder="e.g., 35"
            keyboardType="decimal-pad"
            placeholderTextColor={colors.gray500}
          />
          {ocrReceiptQuantity == null && ocrPumpQuantity == null && (quantity.trim() === '' || qNum <= 0) ? (
            <Text style={styles.warningText}>OCR couldn't read quantity. Enter manually to save.</Text>
          ) : null}
        </Field>

        <Field label="Total Cost (₹) * — from receipt / payment slip">
          <TextInput
            style={styles.input}
            value={totalCost}
            onChangeText={setTotalCost}
            placeholder="e.g., 430 (paid ₹ on slip)"
            keyboardType="decimal-pad"
            placeholderTextColor={colors.gray500}
          />
          {ocrReceiptAmount == null && ocrPumpAmount == null && (totalCost.trim() === '' || tNum <= 0) ? (
            <Text style={styles.warningText}>OCR couldn't read amount. Enter manually to save.</Text>
          ) : null}
          {ocrPumpAmount != null && ocrPumpAmount > 0 && Number.isFinite(tNum) && tNum > 0 ? (
            <Text style={styles.hintTextMuted}>
              Pump display: ₹{ocrPumpAmount.toFixed(2)} · Receipt/paid: ₹{tNum.toFixed(2)}
              {receiptVsPumpVariance != null && Math.abs(receiptVsPumpVariance) >= 0.01 ? (
                <Text style={styles.varianceText}>
                  {' '}
                  · Difference: ₹{receiptVsPumpVariance.toFixed(2)}{' '}
                  {receiptVsPumpVariance > 0 ? '(paid more than pump)' : '(paid less than pump)'}
                </Text>
              ) : (
                ' · Match'
              )}
            </Text>
          ) : null}
        </Field>

        <Field label="Fuel type *">
          <View style={styles.pickerRow}>
            {FUEL_TYPE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.pickerBtn, fuelType === opt.value && styles.pickerBtnActive]}
                onPress={() => setFuelType(opt.value)}
              >
                <Text style={[styles.pickerBtnText, fuelType === opt.value && styles.pickerBtnTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Field>

        <Field label="Odometer *">
          <TextInput
            style={styles.input}
            value={odometer}
            onChangeText={setOdometer}
            placeholder="e.g., 45230"
            keyboardType="number-pad"
            placeholderTextColor={colors.gray500}
          />
          {ocrOdometerValue == null && (odometer.trim() === '' || odoNum <= 0) ? (
            <Text style={styles.warningText}>OCR couldn't read odometer. Enter manually to save.</Text>
          ) : null}
        </Field>

        <Field label="Fuel Station">
          <TextInput
            style={styles.input}
            value={fuelStation}
            onChangeText={setFuelStation}
            placeholder="Auto-filled from GPS / receipt — edit if needed"
            placeholderTextColor={colors.gray500}
          />
        </Field>

        <Field label="GPS capture location & timestamp">
          <Text style={styles.readonlyMultiline}>
            {captureGpsSummary ||
              'Enable location for this app. After each photo, we record GPS coordinates, reverse-geocode the address, and the capture time. The block above uses the fuel receipt capture first (matches what is sent on save).'}
          </Text>
        </Field>

        <Field label="Payment Method *">
          {PAYMENT_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.paymentBtn, paymentMethod === opt.value && styles.paymentBtnActive]}
              onPress={() => setPaymentMethod(opt.value)}
            >
              <Text style={[styles.paymentBtnText, paymentMethod === opt.value && styles.paymentBtnTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
          {paymentMethod === 'card' && (
            <TextInput
              style={[styles.input, { marginTop: 8 }]}
              value={cardLastFour}
              onChangeText={(t) => setCardLastFour(t.replace(/\D/g, '').slice(0, 4))}
              placeholder="Last 4 digits"
              keyboardType="number-pad"
              placeholderTextColor={colors.gray500}
              maxLength={4}
            />
          )}
        </Field>

        <TouchableOpacity
          style={[styles.submitBtn, saveDisabled && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={saveDisabled}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>Save Fuel Entry</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={crossMismatchModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCrossMismatchModalVisible(false)}
      >
        <Pressable style={styles.mismatchModalBackdrop} onPress={() => setCrossMismatchModalVisible(false)}>
          <Pressable style={styles.mismatchModalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.mismatchModalTitle}>Confirm readings</Text>
            <Text style={styles.mismatchModalSubtitle}>
              These values don&apos;t line up across receipt, pump photo, or odometer. Continue only if the amount, quantity,
              and odometer you entered are correct.
            </Text>
            <ScrollView style={styles.mismatchModalList} nestedScrollEnabled keyboardShouldPersistTaps="handled">
              {crossMismatchLines.map((row) => (
                <Text key={row.key} style={styles.mismatchModalBullet}>
                  • {row.text}
                </Text>
              ))}
            </ScrollView>
            <View style={styles.mismatchModalActions}>
              <TouchableOpacity
                style={[styles.mismatchModalBtn, styles.mismatchModalBtnSecondary]}
                onPress={() => setCrossMismatchModalVisible(false)}
              >
                <Text style={styles.mismatchModalBtnSecondaryText}>Go back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.mismatchModalBtn, styles.mismatchModalBtnPrimary]}
                onPress={() => {
                  setCrossMismatchModalVisible(false);
                  void handleSubmit({ skipCrossMismatchModal: true });
                }}
              >
                <Text style={styles.mismatchModalBtnPrimaryText}>Confirm & save</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <FuelCaptureCameraModal
        visible={guidedCameraVisible}
        phase={guidedCameraPhase}
        onDismiss={() => {
          setGuidedCameraVisible(false);
          guidedCaptureRef.current?.reject(new Error('cancelled'));
          guidedCaptureRef.current = null;
        }}
        onCaptured={(uri) => {
          setGuidedCameraVisible(false);
          guidedCaptureRef.current?.resolve(uri);
          guidedCaptureRef.current = null;
        }}
      />
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray50 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.gray200 },
  backBtn: { padding: 4, marginRight: 8 },
  title: { fontSize: 18, fontWeight: '700', color: colors.foreground },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  captureRow: { flexDirection: 'row', gap: 8, marginBottom: 12, alignItems: 'stretch' },
  captureCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  captureCardTitle: { fontSize: 11, fontWeight: '700', color: colors.gray700, marginBottom: 6, minHeight: 28 },
  capturePreview: { width: '100%', height: 76, borderRadius: 8, backgroundColor: colors.gray50, marginBottom: 6 },
  retakeBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.primary, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  retakeBtnSm: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.primary, paddingVertical: 6, borderRadius: 8, alignItems: 'center' },
  retakeBtnText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  retakeBtnTextSm: { color: colors.primary, fontSize: 11, fontWeight: '700' },
  captureBtnSm: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    minHeight: 76,
  },
  captureBtnTextSm: { fontSize: 11, fontWeight: '700', color: '#fff' },
  readonlyMultiline: {
    backgroundColor: colors.gray50,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.gray700,
    lineHeight: 18,
  },
  warningText: { marginTop: 8, fontSize: 13, color: '#d97706' },
  hintTextMuted: { marginTop: 8, fontSize: 12, color: colors.gray600, lineHeight: 17 },
  varianceText: { fontSize: 12, color: '#b45309', fontWeight: '600' },
  errorText: { marginTop: 10, fontSize: 14, color: '#dc2626', textAlign: 'center' },
  captureBtnOutline: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  captureBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  captureBtnTextOutline: { color: colors.primary },
  receiptHint: { fontSize: 13, color: colors.gray700, marginBottom: 16 },
  receiptHintMuted: { fontSize: 13, color: colors.gray500, marginBottom: 16, lineHeight: 18 },
  field: { marginBottom: 16 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: colors.gray600, marginBottom: 8 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.foreground,
  },
  pickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pickerBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.gray200, backgroundColor: '#fff' },
  pickerBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pickerBtnDisabled: { opacity: 0.38 },
  pickerBtnText: { fontSize: 13, fontWeight: '500', color: colors.foreground },
  pickerBtnTextActive: { color: '#fff' },
  pickerBtnTextDisabled: { color: colors.gray500 },
  lockedHint: { fontSize: 12, color: colors.gray600, marginBottom: 8 },
  tripChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.gray200, backgroundColor: '#fff', marginRight: 8 },
  tripChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tripChipText: { fontSize: 13, fontWeight: '500', color: colors.foreground },
  tripChipTextActive: { color: '#fff' },
  paymentBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.gray200, backgroundColor: '#fff', marginBottom: 8 },
  paymentBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  paymentBtnText: { fontSize: 13, fontWeight: '500', color: colors.foreground },
  paymentBtnTextActive: { color: '#fff' },
  submitBtn: { marginTop: 24, backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  submitBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  btnDisabled: { opacity: 0.7 },
  ocrDebugCard: {
    marginBottom: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray200,
    overflow: 'hidden',
  },
  ocrDebugToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 },
  ocrDebugToggleText: { fontSize: 14, fontWeight: '600', color: colors.primary, flex: 1 },
  ocrDebugScroll: { maxHeight: 280, borderTopWidth: 1, borderTopColor: colors.gray200 },
  ocrDebugMono: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: 10,
    lineHeight: 14,
    color: colors.gray700,
    padding: 12,
  },
  mismatchModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  mismatchModalCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  mismatchModalTitle: { fontSize: 18, fontWeight: '700', color: colors.foreground, marginBottom: 8 },
  mismatchModalSubtitle: { fontSize: 14, color: colors.gray600, lineHeight: 20, marginBottom: 14 },
  mismatchModalList: { maxHeight: 260, marginBottom: 16 },
  mismatchModalBullet: { fontSize: 14, color: colors.gray800, lineHeight: 21, marginBottom: 10 },
  mismatchModalActions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
  mismatchModalBtn: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, minWidth: 120, alignItems: 'center' },
  mismatchModalBtnSecondary: { backgroundColor: colors.gray100, borderWidth: 1, borderColor: colors.gray200 },
  mismatchModalBtnSecondaryText: { fontSize: 15, fontWeight: '600', color: colors.gray700 },
  mismatchModalBtnPrimary: { backgroundColor: colors.primary },
  mismatchModalBtnPrimaryText: { fontSize: 15, fontWeight: '600', color: '#fff' },
});
