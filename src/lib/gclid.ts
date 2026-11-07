const GCLID_KEY = 'vth_gclid';
const GCLID_TS_KEY = 'vth_gclid_ts';
const GCLID_MAX_AGE_MS = 90 * 24 * 3600 * 1000;

function sanitizeGclid(raw: string | null): string | null {
  if (!raw) return null;
  const gclid = raw.trim();
  if (!gclid || gclid.length > 255) return null;
  if (!/^[A-Za-z0-9_-]+$/.test(gclid)) return null;
  return gclid;
}

/** Remember the Google click ID from an ad landing URL. A newer value replaces the stored one. */
export function captureGclidFromSearch(search: string): void {
  try {
    const gclid = sanitizeGclid(new URLSearchParams(search).get('gclid'));
    if (!gclid) return;
    localStorage.setItem(GCLID_KEY, gclid);
    localStorage.setItem(GCLID_TS_KEY, Date.now().toString());
  } catch {
    /* private mode / blocked storage */
  }
}

/** Stored click ID from the last 90 days, or null when there is none. */
export function getStoredGclid(): string | null {
  try {
    const gclid = sanitizeGclid(localStorage.getItem(GCLID_KEY));
    const ts = Number(localStorage.getItem(GCLID_TS_KEY) || 0);
    if (!gclid || !Number.isFinite(ts) || Date.now() - ts >= GCLID_MAX_AGE_MS) return null;
    return gclid;
  } catch {
    return null;
  }
}
