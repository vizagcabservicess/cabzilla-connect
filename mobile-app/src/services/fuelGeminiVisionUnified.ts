/**
 * Unified Gemini vision for pump / receipt / odometer (server: fuel-vision-unified.php).
 */
import { Platform } from 'react-native';
import { API_BASE_URL, WEB_APP_BASE_URL } from '../config';

export type FuelCapturePhase = 'pump' | 'receipt' | 'odometer';

export type FuelVisionUnifiedResult = {
  fuel_amount: number | null;
  volume: number | null;
  rate: number | null;
  odometer_reading: number | null;
  confidence: 'high' | 'medium' | 'low';
  source: FuelCapturePhase;
  should_retake: boolean;
};

function getApiBase(): string {
  const base = API_BASE_URL || (Platform.OS === 'web' ? '' : WEB_APP_BASE_URL || '');
  if (!base) return '';
  return base.replace(/^(https?:\/\/)www\./, '$1');
}

function parseUnified(body: unknown): FuelVisionUnifiedResult | null {
  if (body == null || typeof body !== 'object' || !('status' in body)) return null;
  const o = body as Record<string, unknown>;
  const st = o.status;
  /** `fuel-vision-unified.php` returns status "error" with HTTP 200 + result stubs when validation fails (avoids CDN non-JSON 502 pages). */
  if ((st !== 'ok' && st !== 'error') || o.result == null || typeof o.result !== 'object') return null;
  const r = o.result as Record<string, unknown>;
  const conf = r.confidence === 'high' || r.confidence === 'medium' || r.confidence === 'low' ? r.confidence : 'low';
  const src =
    r.source === 'pump' || r.source === 'receipt' || r.source === 'odometer' ? r.source : 'pump';
  const num = (v: unknown): number | null =>
    v != null && typeof v === 'number' && Number.isFinite(v) ? v : null;
  const intish = (v: unknown): number | null => {
    if (v == null) return null;
    if (typeof v === 'number' && Number.isFinite(v)) return Math.round(v);
    if (typeof v === 'string') {
      const n = parseInt(v.replace(/\D/g, ''), 10);
      return Number.isFinite(n) && n > 0 ? n : null;
    }
    return null;
  };
  return {
    fuel_amount: num(r.fuel_amount),
    volume: num(r.volume),
    rate: num(r.rate),
    odometer_reading: intish(r.odometer_reading),
    confidence: conf,
    source: src,
    should_retake: r.should_retake === true,
  };
}

/** `data.fuelUnifiedVision` from upload-fuel-odometer.php (pump) — same shape as fuel-vision-unified `result`. */
export function fuelUnifiedVisionFromUploadPayload(raw: unknown): FuelVisionUnifiedResult | null {
  if (raw == null || typeof raw !== 'object') return null;
  return parseUnified({ status: 'ok', result: raw });
}

/**
 * Calls PHP `fuel-vision-unified.php`. Retries once on network/5xx failure.
 */
export async function analyzeFuelCaptureUnified(
  imageUri: string,
  authToken: string,
  phase: FuelCapturePhase,
  fuelKind?: 'petrol' | 'diesel' | 'cng'
): Promise<FuelVisionUnifiedResult | null> {
  const base = getApiBase();
  if (!base || !authToken || !imageUri) return null;

  const attempt = async (): Promise<FuelVisionUnifiedResult | null> => {
    try {
      const form = new FormData();
      form.append('phase', phase);
      if (phase === 'pump' && fuelKind != null) {
        form.append('fuelType', fuelKind);
      }
      form.append('image', {
        uri: imageUri,
        name: 'capture.jpg',
        type: 'image/jpeg',
      } as unknown as Blob);

      const res = await fetch(`${base}/api/driver/fuel-vision-unified.php`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: form,
      });

      const raw = (await res.text()).replace(/^\uFEFF/, '').trim();
      let data: unknown;
      try {
        data = JSON.parse(raw);
      } catch {
        if (__DEV__ && !res.ok) {
          const cdnHint =
            !raw.trimStart().startsWith('{') && raw.length < 120
              ? ' Non-JSON body: proxy/origin error, timeout, or PHP fatal — check server logs and fuel-vision-unified.php.'
              : '';
          // eslint-disable-next-line no-console
          console.error(`[fuel-vision-unified HTTP ${res.status}]${cdnHint}`, raw.slice(0, 2000));
        }
        return null;
      }
      if (!res.ok) {
        const fromBody = parseUnified(data);
        if (fromBody != null) return fromBody;
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.error(`[fuel-vision-unified HTTP ${res.status}]`, JSON.stringify(data, null, 2));
        }
        return null;
      }
      if (__DEV__) {
        try {
          const d = data as Record<string, unknown>;
          // eslint-disable-next-line no-console
          console.log(
            '[fuel-vision-unified response]',
            JSON.stringify(
              { status: d.status, result: d.result, error: d.error, detail: d.detail },
              null,
              2,
            ),
          );
        } catch {
          /* ignore */
        }
      }
      return parseUnified(data);
    } catch {
      return null;
    }
  };

  const first = await attempt();
  if (first != null) return first;
  return await attempt();
}

export const FUEL_RETAKE_GUIDANCE_MESSAGE =
  'Retake photo:\n\n• Hold phone straight\n• Avoid glare\n• Keep display fully visible';
