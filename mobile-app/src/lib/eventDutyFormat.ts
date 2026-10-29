import { resolveVehicleImageUrl } from '../utils/mediaUrl';

export function keepFilled(current: string, next?: string | null): string {
  if (current.trim()) return current;
  return (next || '').trim();
}

export function dutyStatusLabel(status: string): string {
  switch (status) {
    case 'scheduled':
      return 'Scheduled';
    case 'not_started':
      return 'Not Started';
    case 'in_progress':
      return 'In Progress';
    case 'completed':
      return 'Completed';
    case 'missing_opening':
      return 'Missing Opening';
    case 'missing_closing':
      return 'Missing Closing';
    case 'exception':
      return 'Exception';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()) || 'Duty';
  }
}

export function formatReportingTime(value: string | null | undefined): string {
  if (!value) return '';
  const match = /^(\d{1,2}):(\d{2})/.exec(value.trim());
  if (!match) return value;
  const hours = Number(match[1]);
  const minutes = match[2];
  if (Number.isNaN(hours) || hours < 0 || hours > 23) return value;
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes} ${suffix}`;
}

export function parseServerDateTime(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value.includes('T') ? value : value.replace(' ', 'T'));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatServerTime(value: string | null | undefined): string {
  const parsed = parseServerDateTime(value);
  if (!parsed) return '';
  return parsed.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

export function formatServerDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const parsed = parseServerDateTime(value);
  if (!parsed) return value;
  return parsed.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

export function billableDutyEnd(closingAt?: string | null, endRequestedAt?: string | null): string | null | undefined {
  const asked = parseServerDateTime(endRequestedAt);
  if (!asked || !endRequestedAt) return closingAt;
  const closed = parseServerDateTime(closingAt);
  if (!closed || closed.getTime() > asked.getTime()) return endRequestedAt;
  return closingAt;
}

export function dutyClosingTime(closingAt?: string | null, endRequestedAt?: string | null): string | null | undefined {
  return endRequestedAt || closingAt || null;
}

function dutyDurationMinutes(start?: string | null, end?: string | null, nowMs?: number, pausedSeconds = 0): number {
  const from = parseServerDateTime(start);
  if (!from) return 0;
  const to = parseServerDateTime(end) || new Date(nowMs ?? Date.now());
  const seconds = Math.floor((to.getTime() - from.getTime()) / 1000) - Math.max(0, Math.floor(pausedSeconds));
  return Math.max(0, Math.floor(seconds / 60));
}

export function formatDutyDuration(start?: string | null, end?: string | null, nowMs?: number, pausedSeconds = 0): string {
  if (!parseServerDateTime(start)) return '';
  const mins = dutyDurationMinutes(start, end, nowMs, pausedSeconds);
  const hours = Math.floor(mins / 60);
  const rest = mins % 60;
  const label = hours > 0 ? `${hours} hr ${rest} min` : `${rest} min`;
  return end ? label : `${label} (ongoing)`;
}

export function canCloseOdometer(openingKm: number, closingKm: number): boolean {
  return closingKm >= openingKm;
}

export function mapsUrl(lat: number, lng: number): string {
  return `https://maps.google.com/?q=${lat},${lng}`;
}

export function fleetPhoto(type: string): string {
  return resolveVehicleImageUrl({ name: type });
}

function isOdometerYear(value: number): boolean {
  return value >= 1900 && value <= 2099;
}

function isOdometerYearMonth(value: number): boolean {
  if (value < 200001 || value > 209912) return false;
  const month = value % 100;
  return month >= 1 && month <= 12;
}

function isOdometerClock(value: number): boolean {
  const digits = String(value);
  if (digits.length === 6) {
    const hours = Math.floor(value / 10000);
    const minutes = Math.floor((value % 10000) / 100);
    const seconds = value % 100;
    return hours <= 23 && minutes <= 59 && seconds <= 59;
  }
  if (digits.length === 4) {
    const hours = Math.floor(value / 100);
    const minutes = value % 100;
    return hours <= 23 && minutes <= 59;
  }
  return false;
}

function pickOdometerCandidate(values: number[], filterDateNoise: boolean): number | null {
  const filtered = values.filter((value) => {
    if (value < 1000) return false;
    if (isOdometerYear(value)) return false;
    if (filterDateNoise && (isOdometerYearMonth(value) || isOdometerClock(value))) return false;
    return true;
  });
  if (filtered.length === 0) return null;
  for (const length of [6, 5, 7, 4]) {
    const match = filtered.find((value) => String(value).length === length);
    if (match != null) return match;
  }
  return filtered[0] ?? null;
}

export function extractOdometerReading(text: string | null | undefined): number | null {
  if (!text) return null;
  const normalized = text.replace(/(\d),(\d)/g, '$1$2');
  const labeled: number[] = [];
  const kmPattern = /(\d{4,7})\s*(?:km|kms|kilomet)/gi;
  let match: RegExpExecArray | null = kmPattern.exec(normalized);
  while (match) {
    labeled.push(Number(match[1]));
    match = kmPattern.exec(normalized);
  }
  const fromLabel = pickOdometerCandidate(labeled, false);
  if (fromLabel != null) return fromLabel;
  const consecutive: number[] = [];
  const numPattern = /\d{4,7}/g;
  match = numPattern.exec(normalized);
  while (match) {
    consecutive.push(Number(match[0]));
    match = numPattern.exec(normalized);
  }
  const spaced = /(\d{2,3})\s+(\d{3})(?:\s+(\d{3}))?/g;
  match = spaced.exec(normalized);
  while (match) {
    consecutive.push(Number(`${match[1]}${match[2]}${match[3] || ''}`));
    match = spaced.exec(normalized);
  }
  return pickOdometerCandidate(consecutive, true);
}

export type DocumentOcrKind = 'dl' | 'aadhaar';

export type DocumentOcrFields = {
  fullName?: string;
  licenseNumber?: string;
  aadhaarNumber?: string;
  mobile?: string;
};

function ocrLines(text: string): string[] {
  return text.split(/\r?\n/).map((line) => line.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

function isOcrJunkLine(value: string): boolean {
  return /^(na|n\/a|name|dl no|licence|license|aadhaar|address|son\/wife|date of|validity|government|issued by|indian union)/i.test(value.trim());
}

function valueAfterLabel(lines: string[], labels: string[]): string | undefined {
  const labelRe = new RegExp(`^(?:${labels.join('|')})\\s*[:.\\-]*\\s*(.*)$`, 'i');
  for (let i = 0; i < lines.length; i += 1) {
    const found = lines[i].match(labelRe);
    if (!found) continue;
    const rest = (found[1] || '').trim();
    if (rest && !isOcrJunkLine(rest)) return rest.replace(/[,;]+$/, '').trim();
    const next = lines[i + 1];
    if (next && !isOcrJunkLine(next)) return next.replace(/[,;]+$/, '').trim();
  }
  return undefined;
}

function isValidIndianDl(value: string): boolean {
  const dl = value.replace(/\s+/g, '').toUpperCase();
  return dl.length >= 8 && dl.length <= 20 && /^[A-Z0-9\-/]+$/.test(dl);
}

function extractIndianDl(text: string): string | undefined {
  const labeled = text.toUpperCase().match(/\b(?:DL|LICEN[CS]E)\s*(?:NO|NUMBER|#)?\s*[:.\-]?\s*([A-Z]{2}\s?\d{2}\s?\d{4}\s?\d{7}|[A-Z]{2}\s?\d{2}\s?[0-9A-Z]{5,14})/);
  const raw = labeled?.[1] || text.toUpperCase().match(/\b([A-Z]{2}\s?\d{2}\s?\d{4}\s?\d{7})\b/)?.[1];
  if (!raw) return undefined;
  const dl = raw.replace(/\s+/g, '');
  return isValidIndianDl(dl) ? dl : undefined;
}

function isValidAadhaar(value: string): boolean {
  return /^\d{12}$/.test(value);
}

function extractAadhaarNumber(text: string): string | undefined {
  const spaced = text.match(/\b(\d{4})\s(\d{4})\s(\d{4})\b/);
  const digits = spaced ? `${spaced[1]}${spaced[2]}${spaced[3]}` : '';
  if (spaced && isValidAadhaar(digits)) return digits;
  const only = text.match(/\b(\d{12})\b/);
  if (only && isValidAadhaar(only[1])) return only[1];
  return undefined;
}

function extractPersonName(text: string, labels: string[]): string | undefined {
  const value = valueAfterLabel(ocrLines(text), labels);
  if (!value) return undefined;
  const cleaned = value.replace(/[^A-Za-z .]/g, ' ').replace(/\s+/g, ' ').trim();
  if (cleaned.length < 3 || cleaned.length > 60) return undefined;
  if (!/[A-Za-z]{2,}/.test(cleaned)) return undefined;
  return cleaned;
}

export function parseDocumentOcr(kind: DocumentOcrKind, text: string): DocumentOcrFields {
  if (kind === 'dl') {
    const mobile = text.match(/\b([6-9]\d{9})\b/);
    return {
      fullName: extractPersonName(text, ['name', 'holder name', 'licence holder']),
      licenseNumber: extractIndianDl(text),
      mobile: mobile?.[1],
    };
  }
  return {
    fullName: extractPersonName(text, ['name', 'naam']),
    aadhaarNumber: extractAadhaarNumber(text),
  };
}
