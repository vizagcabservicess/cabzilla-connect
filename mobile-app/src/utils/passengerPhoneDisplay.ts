/**
 * Passenger phone display/dial: uses only stored passenger_phone + passenger_country_code.
 * If phone already starts with "+", treat as full international as entered/saved.
 * No default country (e.g. India) when the booking has no country code.
 */

function digitsOnly(s: string): string {
  return s.replace(/\D/g, '');
}

function normalizeDial(raw: string | null | undefined): string {
  if (raw == null || raw === '') return '';
  let s = String(raw).trim();
  if (s.startsWith('+')) s = s.slice(1);
  if (s.startsWith('00')) s = s.slice(2);
  return digitsOnly(s);
}

export function formatPassengerPhoneForDisplay(
  phone: string | null | undefined,
  passengerCountryCode?: string | null | undefined
): string {
  const raw = String(phone ?? '').trim();
  if (!raw) return '';
  if (raw.startsWith('+')) return raw;
  const code = String(passengerCountryCode ?? '').trim();
  const national = digitsOnly(raw);
  if (!national) return '';
  if (!code) return national;
  const prefix = code.startsWith('+') ? code : `+${code}`;
  return `${prefix} ${national}`;
}

export function passengerPhoneE164Digits(
  phone: string | null | undefined,
  passengerCountryCode?: string | null | undefined
): string | null {
  const raw = String(phone ?? '').trim();
  if (!raw) return null;
  if (raw.startsWith('+')) {
    const d = digitsOnly(raw);
    return d.length >= 10 ? d : null;
  }
  const national = digitsOnly(raw);
  if (!national) return null;
  const cc = normalizeDial(passengerCountryCode);
  if (!cc) return null;
  const full = `${cc}${national}`;
  return full.length >= 10 ? full : null;
}

export function passengerPhoneToTelHref(
  phone: string | null | undefined,
  passengerCountryCode?: string | null | undefined
): string | null {
  const raw = String(phone ?? '').trim();
  if (!raw) return null;
  if (raw.startsWith('+')) {
    const d = digitsOnly(raw);
    return d.length >= 10 ? `tel:+${d}` : null;
  }
  const national = digitsOnly(raw);
  if (!national || national.length < 10) return null;
  const cc = normalizeDial(passengerCountryCode);
  if (cc) return `tel:+${cc}${national}`;
  return `tel:${national}`;
}
