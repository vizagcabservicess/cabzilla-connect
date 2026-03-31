/**
 * Indian fuel pump LCD → amount / volume / rate (server Gemini + numeric validation via fuel-pump-vision.php).
 */
import { Platform } from 'react-native';
import { API_BASE_URL, WEB_APP_BASE_URL } from '../config';

export type FuelPumpFuelKind = 'petrol' | 'diesel' | 'cng';

export type FuelPumpGeminiSuccess = {
  amount: number | null;
  volume: number | null;
  rate: number | null;
  density?: number | null;
  confidence?: string;
  validation?: {
    calculated_amount: number | null;
    difference: number | null;
    is_valid: boolean;
    status?: string;
  };
  unreadable_fields?: string[];
};

export type FuelPumpGeminiInvalid = {
  error: 'invalid_reading';
  retakeRecommended?: boolean;
  retakeReason?: string | null;
  message?: string | null;
  fraudFlag?: boolean;
};

export type FuelPumpGeminiFallback = { fallback: true };

export type FuelPumpGeminiOutcome = FuelPumpGeminiSuccess | FuelPumpGeminiInvalid | FuelPumpGeminiFallback;

function getApiBase(): string {
  const base = API_BASE_URL || (Platform.OS === 'web' ? '' : WEB_APP_BASE_URL || '');
  if (!base) return '';
  return base.replace(/^(https?:\/\/)www\./, '$1');
}

function coerceFiniteNumber(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const stripped = v.replace(/,/g, '').replace(/\s/g, '').replace(/[^0-9.\-]/g, '');
    if (stripped === '' || stripped === '.') return null;
    const n = parseFloat(stripped);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Strip data-URI prefix for raw base64 payloads. */
export function stripBase64DataUri(base64: string): string {
  const s = base64.trim();
  const m = s.match(/^data:image\/[a-z+]+;base64,(.+)$/i);
  if (m && m[1]) {
    return m[1].replace(/\s/g, '');
  }
  return s.replace(/\s/g, '');
}

function normalizeFuelKind(v: string | undefined): FuelPumpFuelKind {
  const f = (v ?? 'petrol').toLowerCase();
  if (f === 'diesel') return 'diesel';
  if (f === 'cng' || f.includes('cng')) return 'cng';
  return 'petrol';
}

function rateBand(kind: FuelPumpFuelKind): { min: number; max: number } {
  if (kind === 'diesel') return { min: 80, max: 100 };
  if (kind === 'cng') return { min: 70, max: 100 };
  return { min: 88, max: 110 };
}

/** Hard validation — mirrors PHP client-side guard (server is authoritative). */
export function validateIndianPumpReading(
  parsed: unknown,
  fuelType: FuelPumpFuelKind | string = 'petrol'
): FuelPumpGeminiSuccess | FuelPumpGeminiInvalid {
  if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { error: 'invalid_reading', message: 'Could not read pump display clearly. Please retake the photo.' };
  }
  const o = parsed as Record<string, unknown>;
  const amount = coerceFiniteNumber(o.amount);
  const volume = coerceFiniteNumber(o.volume);
  const rate = coerceFiniteNumber(o.rate);
  const density = coerceFiniteNumber(o.density);

  const kind = normalizeFuelKind(String(fuelType));
  const { min: rateMin, max: rateMax } = rateBand(kind);

  if (amount == null || volume == null || rate == null || !(amount > 0) || !(volume > 0) || !(rate > 0)) {
    return {
      error: 'invalid_reading',
      retakeRecommended: true,
      message: 'Could not read pump display clearly. Please retake the photo.',
    };
  }
  if (amount >= 80 && amount <= 130) {
    return {
      error: 'invalid_reading',
      retakeRecommended: true,
      fraudFlag: true,
      message: `Extracted amount ₹${amount.toFixed(2)} looks like a rate (₹/L), not the sale total. Please retake the photo.`,
    };
  }
  if (volume >= 820 && volume <= 860) {
    return {
      error: 'invalid_reading',
      retakeRecommended: true,
      message: 'Could not read pump display clearly. Please retake the photo.',
    };
  }
  if (volume < 1 || volume > 500 || amount < 150 || amount > 50_000) {
    return {
      error: 'invalid_reading',
      retakeRecommended: true,
      message: 'Could not read pump display clearly. Please retake the photo.',
    };
  }
  if (rate < rateMin || rate > rateMax) {
    return {
      error: 'invalid_reading',
      retakeRecommended: true,
      fraudFlag: true,
      message: `Rate ₹${rate.toFixed(2)}/L is outside expected range ₹${rateMin}–₹${rateMax}. Please retake photo.`,
    };
  }

  const calculated = volume * rate;
  if (!(calculated > 0)) {
    return {
      error: 'invalid_reading',
      message: 'Numbers do not add up. Please retake photo.',
    };
  }
  const diffPct = (Math.abs(amount - calculated) / calculated) * 100;
  if (diffPct > 5) {
    return {
      error: 'invalid_reading',
      retakeRecommended: true,
      message: `Numbers don't add up (${diffPct.toFixed(1)}% error). Please retake photo.`,
    };
  }

  let confidence = 'medium';
  if (typeof o.confidence === 'string' && /^(high|medium|low)$/i.test(o.confidence)) {
    confidence = o.confidence.toLowerCase();
  }
  const calcR = Math.round(calculated * 100) / 100;
  const diffAbs = Math.round(Math.abs(amount - calcR) * 100) / 100;
  const unreadable: string[] = [];
  if (Array.isArray(o.unreadable_fields)) {
    for (const u of o.unreadable_fields) {
      if (typeof u === 'string' && u.trim() !== '') unreadable.push(u.trim());
    }
  }

  return {
    amount,
    volume,
    rate,
    density,
    confidence,
    validation: {
      calculated_amount: calcR,
      difference: diffAbs,
      is_valid: true,
      status: 'approved',
    },
    unreadable_fields: unreadable,
  };
}

type ProxyBody =
  | {
      status: 'ok';
      result: Record<string, unknown>;
    }
  | {
      status: 'invalid_reading';
      retake_required?: unknown;
      retake_reason?: unknown;
      message?: unknown;
      fraud_flag?: unknown;
    }
  | { status: 'fallback'; message?: string };

function mapProxyToOutcome(body: ProxyBody, fuelType: FuelPumpFuelKind): FuelPumpGeminiOutcome | null {
  if (body.status === 'invalid_reading') {
    return {
      error: 'invalid_reading',
      retakeRecommended: body.retake_required === true,
      retakeReason: typeof body.retake_reason === 'string' ? body.retake_reason : null,
      message:
        typeof body.message === 'string'
          ? body.message
          : typeof body.retake_reason === 'string'
            ? body.retake_reason
            : null,
      fraudFlag: body.fraud_flag === true,
    };
  }
  if (body.status === 'ok' && body.result != null && typeof body.result === 'object') {
    return validateIndianPumpReading(body.result, fuelType);
  }
  return null;
}

async function extractViaPhpProxy(
  imageUri: string,
  authToken: string,
  fuelType: FuelPumpFuelKind
): Promise<FuelPumpGeminiOutcome | null> {
  const base = getApiBase();
  if (!base || !authToken) return null;

  try {
    const form = new FormData();
    form.append('image', {
      uri: imageUri,
      name: 'pump.jpg',
      type: 'image/jpeg',
    } as unknown as Blob);
    form.append('fuelType', fuelType);

    const res = await fetch(`${base}/api/driver/fuel-pump-vision.php`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      body: form,
    });

    const raw = (await res.text()).replace(/^\uFEFF/, '').trim();
    if (!res.ok) {
      try {
        const errBody = JSON.parse(raw) as unknown;
        // eslint-disable-next-line no-console
        console.error(`[fuel-pump-vision HTTP ${res.status}]`, JSON.stringify(errBody, null, 2));
      } catch {
        // eslint-disable-next-line no-console
        console.error(`[fuel-pump-vision HTTP ${res.status}]`, raw.slice(0, 2000));
      }
      return null;
    }
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      return null;
    }
    if (data == null || typeof data !== 'object' || !('status' in data)) {
      return null;
    }
    const body = data as ProxyBody;
    if (body.status === 'fallback') {
      return null;
    }
    return mapProxyToOutcome(body, fuelType);
  } catch {
    return null;
  }
}

/** Pump photo: stencil-cropped + 2048px JPEG from FuelCaptureCameraModal, then compressImageForUpload(geminiVisionPreset). */
export async function extractIndianFuelPumpDisplayFromImage(
  imageUri: string,
  authToken: string | null,
  fuelType: FuelPumpFuelKind | string = 'petrol'
): Promise<FuelPumpGeminiOutcome> {
  if (!imageUri) {
    return { fallback: true };
  }

  const ft = normalizeFuelKind(typeof fuelType === 'string' ? fuelType : 'petrol');

  if (authToken) {
    const fromProxy = await extractViaPhpProxy(imageUri, authToken, ft);
    if (fromProxy !== null) {
      return fromProxy;
    }
  }

  return { fallback: true };
}
