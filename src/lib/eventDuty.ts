import {
  EVENT_DUTY_STATUSES,
  EVENT_VEHICLE_TYPES,
  type EventDailyStats,
  type EventDutyStatus,
  type EventGps,
  type EventVehicleType,
} from '@/types/eventDuty';

export const EVENT_VEHICLE_TYPE_LABELS: Record<EventVehicleType, string> = {
  sedan: 'Sedan',
  innova: 'Innova',
  innova_crysta: 'Innova Crysta',
  ertiga: 'Ertiga',
  fortuner: 'Fortuner',
  mini_bus: 'Mini Bus',
  tempo_traveller: 'Tempo Traveller',
  urbania: 'Urbania',
  other: 'Other',
};

export function eventVehicleTypeLabel(type: string | null | undefined): string {
  if (!type) return 'Vehicle';
  if ((EVENT_VEHICLE_TYPES as readonly string[]).includes(type)) {
    return EVENT_VEHICLE_TYPE_LABELS[type as EventVehicleType];
  }
  return type;
}

export function maskAadhaar(value: string | null | undefined): string {
  const digits = (value || '').replace(/\D+/g, '');
  if (digits.length < 4) return 'XXXX XXXX ****';
  return `XXXX XXXX ${digits.slice(-4)}`;
}

export function normalizeVehicleReg(value: string | null | undefined): string {
  return (value || '').replace(/\s+/g, '').toUpperCase();
}

export function isValidIndianMobile(value: string | null | undefined): boolean {
  let digits = (value || '').replace(/\D+/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits);
}

export function normalizeIndianMobile(value: string): string {
  let digits = value.replace(/\D+/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return digits;
}

export function isValidAadhaar(value: string | null | undefined): boolean {
  return /^\d{12}$/.test((value || '').replace(/\D+/g, ''));
}

export function isValidIndianDl(value: string | null | undefined): boolean {
  const dl = (value || '').replace(/\s+/g, '').toUpperCase();
  return dl.length >= 8 && dl.length <= 20 && /^[A-Z0-9\-/]+$/.test(dl);
}

export type DocumentOcrKind = 'rc' | 'insurance' | 'dl' | 'aadhaar';

export interface DocumentOcrFields {
  registrationNumber?: string;
  ownerName?: string;
  make?: string;
  model?: string;
  vehicleType?: EventVehicleType;
  capacity?: string;
  fullName?: string;
  licenseNumber?: string;
  mobile?: string;
  aadhaarNumber?: string;
}

export function keepFilled(current: string, next?: string | null): string {
  if (current.trim()) return current;
  return (next || '').trim();
}

function ocrLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function isOcrJunkLine(value: string): boolean {
  return /^(na|n\/a|regn\.?|registration|owner name|maker'?s? name|model name|vehicle class|seating|standing|sleeper|name|dl no|licence|license|aadhaar|address|son\/wife|date of|validity|chassis|engine|colour|color|fuel|emission|government|issued by|indian union)/i.test(value.trim());
}

function valueAfterLabel(lines: string[], labels: string[]): string | undefined {
  const labelRe = new RegExp(`^(?:${labels.join('|')})\\s*[:.\\-]*\\s*(.*)$`, 'i');
  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].match(labelRe);
    if (!match) continue;
    const rest = (match[1] || '').trim();
    if (rest && !isOcrJunkLine(rest)) return rest.replace(/[,;]+$/, '').trim();
    const next = lines[i + 1];
    if (next && !isOcrJunkLine(next)) return next.replace(/[,;]+$/, '').trim();
  }
  return undefined;
}

function extractIndianReg(text: string): string | undefined {
  const match = text.toUpperCase().match(/\b([A-Z]{2}\s?\d{1,2}\s?[A-Z]{1,3}\s?\d{4})\b/);
  if (!match) return undefined;
  const normalized = normalizeVehicleReg(match[1]);
  return normalized.length >= 8 ? normalized : undefined;
}

function extractIndianDl(text: string): string | undefined {
  const labeled = text.toUpperCase().match(/\b(?:DL|LICEN[CS]E)\s*(?:NO|NUMBER|#)?\s*[:.\-]?\s*([A-Z]{2}\s?\d{2}\s?\d{4}\s?\d{7}|[A-Z]{2}\s?\d{2}\s?[0-9A-Z]{5,14})/);
  const raw = labeled?.[1] || text.toUpperCase().match(/\b([A-Z]{2}\s?\d{2}\s?\d{4}\s?\d{7})\b/)?.[1];
  if (!raw) return undefined;
  const dl = raw.replace(/\s+/g, '');
  return isValidIndianDl(dl) ? dl : undefined;
}

function extractAadhaarNumber(text: string): string | undefined {
  const spaced = text.match(/\b(\d{4})\s(\d{4})\s(\d{4})\b/);
  const digits = spaced ? `${spaced[1]}${spaced[2]}${spaced[3]}` : text.replace(/\D+/g, '');
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

function inferVehicleType(text: string): EventVehicleType | undefined {
  const hay = text.toLowerCase();
  if (/urbania/.test(hay)) return 'urbania';
  if (/innova\s*crysta/.test(hay)) return 'innova_crysta';
  if (/\binnova\b/.test(hay)) return 'innova';
  if (/fortuner/.test(hay)) return 'fortuner';
  if (/ertiga/.test(hay)) return 'ertiga';
  if (/tempo\s*traveller|force\s*traveller/.test(hay)) return 'tempo_traveller';
  if (/mini\s*bus|minibus/.test(hay)) return 'mini_bus';
  if (/\b(dzire|etios|amaze|glanza|swift|sedan)\b/.test(hay)) return 'sedan';
  return undefined;
}

function extractSeating(text: string): string | undefined {
  const labeled = text.match(/seating[^0-9]{0,40}(\d{1,2})/i);
  if (labeled) return labeled[1];
  const lines = ocrLines(text);
  for (let i = 0; i < lines.length; i += 1) {
    if (/seating/i.test(lines[i])) {
      const next = lines[i + 1]?.match(/^(\d{1,2})\b/);
      if (next) return next[1];
    }
  }
  return undefined;
}

export function parseRcOcr(text: string): DocumentOcrFields {
  const lines = ocrLines(text);
  const registrationNumber = extractIndianReg(text);
  const ownerName = extractPersonName(text, ['owner name'])
    || valueAfterLabel(lines, ['owner name']);
  const make = valueAfterLabel(lines, ["maker'?s? name", 'maker', 'manufacturer']);
  const model = valueAfterLabel(lines, ['model name', 'model']);
  return {
    registrationNumber,
    ownerName: ownerName && !isOcrJunkLine(ownerName) ? ownerName : undefined,
    make,
    model,
    vehicleType: inferVehicleType(`${text} ${model || ''} ${make || ''}`),
    capacity: extractSeating(text),
  };
}

export function parseDlOcr(text: string): DocumentOcrFields {
  return {
    fullName: extractPersonName(text, ['name', 'holder name', 'licence holder']),
    licenseNumber: extractIndianDl(text),
    mobile: (() => {
      const match = text.match(/\b([6-9]\d{9})\b/);
      return match && isValidIndianMobile(match[1]) ? match[1] : undefined;
    })(),
  };
}

export function parseAadhaarOcr(text: string): DocumentOcrFields {
  return {
    fullName: extractPersonName(text, ['name', 'naam']),
    aadhaarNumber: extractAadhaarNumber(text),
  };
}

export function parseInsuranceOcr(text: string): DocumentOcrFields {
  return {
    registrationNumber: extractIndianReg(text),
  };
}

export function parseDocumentOcr(kind: DocumentOcrKind, text: string): DocumentOcrFields {
  switch (kind) {
    case 'rc':
      return parseRcOcr(text);
    case 'insurance':
      return parseInsuranceOcr(text);
    case 'dl':
      return parseDlOcr(text);
    case 'aadhaar':
      return parseAadhaarOcr(text);
    default: {
      const _never: never = kind;
      return _never;
    }
  }
}

export function calculateDutyKm(openingKm: number, closingKm: number): number {
  return closingKm - openingKm;
}

export function canCloseOdometer(openingKm: number, closingKm: number): boolean {
  return closingKm >= openingKm;
}

export function dutyStatusLabel(status: string): string {
  const known = assertDutyStatus(status);
  switch (known) {
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
    default: {
      const _exhaustive: never = known;
      return _exhaustive;
    }
  }
}

export function assertDutyStatus(status: string): EventDutyStatus {
  if ((EVENT_DUTY_STATUSES as readonly string[]).includes(status)) {
    return status as EventDutyStatus;
  }
  return 'exception';
}

function padDatePart(value: number): string {
  return String(value).padStart(2, '0');
}

export function toLocalIsoDate(date: Date): string {
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
}

function localIsoDate(date: Date): string {
  return toLocalIsoDate(date);
}

export function todayIsoDate(): string {
  return localIsoDate(new Date());
}

export function datesBetween(start: string, end: string): string[] {
  const out: string[] = [];
  const cursor = new Date(`${start}T00:00:00`);
  const last = new Date(`${end}T00:00:00`);
  if (Number.isNaN(cursor.getTime()) || Number.isNaN(last.getTime())) return out;
  while (cursor <= last) {
    out.push(localIsoDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

export function formatDutyDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDutyDateShort(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function mapsUrl(gps: EventGps | null | undefined): string | null {
  if (!gps || !Number.isFinite(gps.lat) || !Number.isFinite(gps.lng)) {
    return null;
  }
  return `https://maps.google.com/?q=${gps.lat},${gps.lng}`;
}

export function formatGps(gps: EventGps | null | undefined): string {
  if (!gps || !Number.isFinite(gps.lat) || !Number.isFinite(gps.lng)) {
    return '';
  }
  if (gps.address?.trim()) {
    return gps.address.trim();
  }
  const coords = `${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)}`;
  if (gps.accuracy != null && Number.isFinite(gps.accuracy)) {
    return `${coords} (±${Math.round(gps.accuracy)} m)`;
  }
  return coords;
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
  const d = new Date(value.includes('T') ? value : value.replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? null : d;
}

export type TrackSignal = 'live' | 'stale' | 'offline' | 'none';

export function trackSignal(lastGpsAt?: string | null, nowMs?: number): TrackSignal {
  const d = parseServerDateTime(lastGpsAt);
  if (!d) return 'none';
  const age = (nowMs ?? Date.now()) - d.getTime();
  if (age <= 120_000) return 'live';
  if (age <= 15 * 60_000) return 'stale';
  return 'offline';
}

export function formatLastSeen(lastGpsAt?: string | null, nowMs?: number): string {
  const d = parseServerDateTime(lastGpsAt);
  if (!d) return 'No GPS yet';
  const mins = Math.max(0, Math.floor(((nowMs ?? Date.now()) - d.getTime()) / 60000));
  if (mins < 1) return 'Live now';
  if (mins < 60) return `Last seen ${mins} min ago`;
  const hours = Math.floor(mins / 60);
  const rest = mins % 60;
  if (hours < 24) return rest ? `Last seen ${hours}h ${rest}m ago` : `Last seen ${hours}h ago`;
  return `Last seen ${d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' })}`;
}

/** Closing time used for the bill. An ask-to-end cuts the clock there, even if the driver finishes later. */
export function billableDutyEnd(closingAt?: string | null, endRequestedAt?: string | null): string | null | undefined {
  const asked = parseServerDateTime(endRequestedAt);
  if (!asked || !endRequestedAt) return closingAt;
  const closed = parseServerDateTime(closingAt);
  if (!closed || closed.getTime() > asked.getTime()) return endRequestedAt;
  return closingAt;
}

/** Closing time on the duty slip: when the end message was sent. The driver's own end is used only if no message was sent. */
export function dutyClosingTime(closingAt?: string | null, endRequestedAt?: string | null): string | null | undefined {
  return endRequestedAt || closingAt || null;
}

export type EndRequestDeliveryReason = 'sent' | 'no_subscription' | 'push_not_configured' | 'push_failed';

export type EndRequestWhatsApp = 'sent' | 'manual' | 'no_phone' | 'failed' | 'not_configured';

export interface EndRequestDelivery {
  sent: number;
  subscribed: number;
  reason: EndRequestDeliveryReason;
  whatsapp?: EndRequestWhatsApp;
  whatsappUrl?: string | null;
}

export function endRequestResultMessage(delivery?: EndRequestDelivery | null): string {
  const wa = delivery?.whatsapp;
  if (wa === 'sent') {
    return 'Asked to end. WhatsApp reminder sent with the duty link, and billable time stopped now.';
  }
  if (wa === 'manual') {
    return 'Asked to end. Billable time stopped now. WhatsApp could not be sent.';
  }
  const reason = delivery?.reason ?? 'no_subscription';
  const waNote = wa === 'no_phone'
    ? ' No mobile number is saved, so WhatsApp was not sent.'
    : wa === 'failed' || wa === 'not_configured'
      ? ' WhatsApp could not be sent. The driver still sees the request on the duty screen.'
      : '';
  switch (reason) {
    case 'sent':
      return `Asked to end. The driver phone was alerted, and billable time stopped now.${waNote}`;
    case 'no_subscription':
    case 'push_not_configured':
    case 'push_failed':
      return `Asked to end. Billable time stopped now. The message is on the driver duty screen.${waNote}`;
    default: {
      const _never: never = reason;
      return _never;
    }
  }
}

/** What the event manager sees after marking a vehicle In Trip. */
export function tripPromptResultMessage(alreadyOnTrip: boolean, delivery?: EndRequestDelivery | null): string {
  const onScreen = alreadyOnTrip
    ? 'Driver asked to tap In Parking when the guest is dropped.'
    : 'Marked In Trip. The driver gets a popup to tap In Parking after the drop.';
  const reason = delivery?.reason ?? 'no_subscription';
  switch (reason) {
    case 'sent':
      return onScreen;
    case 'no_subscription':
    case 'push_not_configured':
    case 'push_failed':
      return `${onScreen} It is on the driver duty screen.`;
    default: {
      const _never: never = reason;
      return _never;
    }
  }
}

export interface DriverEndNotice {
  id: number;
  status: string;
  openingAt?: string | null;
  closingAt?: string | null;
  endRequestedAt?: string | null;
  endRequestSeenAt?: string | null;
  endRequestNonce?: string | null;
  dutyPlace?: 'trip' | 'parking' | null;
  parkingPromptAt?: string | null;
  parkingPromptNonce?: string | null;
}

export function dutyDurationMinutes(
  start?: string | null,
  end?: string | null,
  nowMs?: number,
): number {
  const from = parseServerDateTime(start);
  if (!from) return 0;
  const to = parseServerDateTime(end) || new Date(nowMs ?? Date.now());
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / 60000));
}

export function formatDutyDurationCompact(
  start?: string | null,
  end?: string | null,
  nowMs?: number,
): string {
  if (!parseServerDateTime(start)) return '';
  const mins = dutyDurationMinutes(start, end, nowMs);
  const hours = Math.floor(mins / 60);
  const rest = mins % 60;
  if (hours <= 0) return `${rest}m`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}m`;
}

export function formatDutyDuration(
  start?: string | null,
  end?: string | null,
  nowMs?: number,
): string {
  if (!parseServerDateTime(start)) return '';
  const mins = dutyDurationMinutes(start, end, nowMs);
  const hours = Math.floor(mins / 60);
  const rest = mins % 60;
  const label = hours > 0 ? `${hours} hr ${rest} min` : `${rest} min`;
  return end ? label : `${label} (ongoing)`;
}

export function formatServerTime(value: string | null | undefined): string {
  const d = parseServerDateTime(value);
  if (!d) return '';
  return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

export function formatServerDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const d = parseServerDateTime(value);
  if (!d) return value;
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

export function formatDutyDateRange(dates: string[]): string {
  if (!dates.length) return 'No dates';
  const sorted = [...dates].sort();
  const groups: string[][] = [];
  let current: string[] = [];
  for (const date of sorted) {
    if (!current.length) {
      current = [date];
      continue;
    }
    const prev = new Date(`${current[current.length - 1]}T00:00:00`);
    const next = new Date(`${date}T00:00:00`);
    const diff = (next.getTime() - prev.getTime()) / 86400000;
    if (diff === 1) {
      current.push(date);
    } else {
      groups.push(current);
      current = [date];
    }
  }
  if (current.length) groups.push(current);
  return groups
    .map((g) => {
      if (g.length === 1) return formatDutyDateShort(g[0]);
      return `${formatDutyDateShort(g[0])}–${formatDutyDateShort(g[g.length - 1])}`;
    })
    .join(' and ');
}

export function whatsappUrl(text: string, phone?: string): string {
  const encoded = encodeURIComponent(text);
  const digits = phone ? normalizeIndianMobile(phone) : '';
  return digits ? `https://wa.me/91${digits}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
}

export function driverRegistrationMessage(opts: {
  eventName: string;
  vehicleType: string;
  vehicleNumber?: string | null;
  pickupLocation?: string | null;
  reportingTime?: string | null;
  dates?: string[];
  url: string;
}): string {
  const time = formatReportingTime(opts.reportingTime);
  return [
    'Vizag Taxi Hub Driver Registration',
    `Event: ${opts.eventName}`,
    `Vehicle: ${opts.vehicleType}`,
    opts.vehicleNumber ? `Vehicle No: ${opts.vehicleNumber}` : '',
    opts.pickupLocation ? `Pickup: ${opts.pickupLocation}` : '',
    time ? `Reporting: ${time}` : '',
    opts.dates?.length ? `Duty dates: ${formatDutyDateRange(opts.dates)}` : '',
    '',
    'Please complete your registration:',
    opts.url,
  ]
    .filter(Boolean)
    .join('\n');
}

export function eventShareMessage(eventName: string, url: string): string {
  return `${eventName} Vehicle Summary:\n${url}`;
}

export function dutySlipMessage(opts: {
  vehicleNumber?: string | null;
  date: string;
  driverName?: string | null;
  totalKm?: number | null;
  url: string;
}): string {
  return [
    'Vizag Taxi Hub Duty Slip',
    opts.vehicleNumber ? `Vehicle: ${opts.vehicleNumber}` : '',
    `Date: ${opts.date}`,
    opts.driverName ? `Driver: ${opts.driverName}` : '',
    opts.totalKm != null ? `Total KM: ${opts.totalKm}` : '',
    '',
    'View/Download:',
    opts.url,
  ]
    .filter(Boolean)
    .join('\n');
}

export function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function decodeReportCell(value: string): string {
  return value
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Pulls header and body cells out of the report table HTML used by the PDF export. */
export function parseReportTable(tableHtml: string): { headers: string[]; rows: string[][] } {
  const head = tableHtml.match(/<thead\b[^>]*>[\s\S]*?<\/thead>/i)?.[0] ?? '';
  const body = tableHtml.match(/<tbody\b[^>]*>[\s\S]*?<\/tbody>/i)?.[0] ?? '';
  const headers = [...head.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/gi)].map((match) => decodeReportCell(match[1]));
  const rows = [...body.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((row) =>
    [...row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((cell) => decodeReportCell(cell[1])),
  );
  return { headers, rows };
}

export function reportPdfFileName(title: string): string {
  const base = title.trim().replace(/[^\w.-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'report';
  return /\.pdf$/i.test(base) ? base : `${base}.pdf`;
}

export function downloadCsv(filename: string, headers: string[], rows: Array<Array<string | number | null | undefined>>): void {
  const escape = (value: string | number | null | undefined) => {
    const text = value == null ? '' : String(value);
    if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  };
  const body = [headers.map(escape).join(','), ...rows.map((row) => row.map(escape).join(','))].join('\n');
  const blob = new Blob([`\uFEFF${body}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function qrImageUrl(data: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(data)}`;
}

export const OCTOBER_2026_TEMPLATE = {
  name: 'October 2026 Event',
  eventCode: 'VTH-2026-10-001',
  startDate: '2026-10-12',
  endDate: '2026-10-21',
  defaultReportingTime: '06:00',
  groups: [
    { vehicleType: 'innova_crysta' as const, quantity: 8, passengerCount: null, dates: ['2026-10-12','2026-10-13','2026-10-14','2026-10-15','2026-10-16','2026-10-17','2026-10-20','2026-10-21'] },
    { vehicleType: 'fortuner' as const, quantity: 1, passengerCount: 24, dates: ['2026-10-12','2026-10-13','2026-10-14','2026-10-15','2026-10-16','2026-10-17','2026-10-18'] },
    { vehicleType: 'mini_bus' as const, quantity: 3, passengerCount: 24, dates: ['2026-10-12','2026-10-13','2026-10-14','2026-10-15','2026-10-16','2026-10-17','2026-10-20','2026-10-21'] },
    { vehicleType: 'innova' as const, quantity: 7, passengerCount: 19, dates: ['2026-10-15','2026-10-16','2026-10-17','2026-10-18','2026-10-19','2026-10-20','2026-10-21'] },
    { vehicleType: 'innova' as const, quantity: 1, passengerCount: 2, dates: ['2026-10-16','2026-10-17','2026-10-18','2026-10-19','2026-10-20','2026-10-21'] },
    { vehicleType: 'innova' as const, quantity: 1, passengerCount: 2, dates: ['2026-10-16','2026-10-17','2026-10-18','2026-10-19','2026-10-20','2026-10-21'], notes: 'continuation' },
    { vehicleType: 'fortuner' as const, quantity: 1, passengerCount: 4, dates: ['2026-10-17','2026-10-18','2026-10-19','2026-10-20','2026-10-21'] },
  ],
};

function isOdometerYear(value: number): boolean {
  return value >= 1900 && value <= 2099;
}

function isOdometerYearMonth(value: number): boolean {
  if (value < 200001 || value > 209912) {
    return false;
  }
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
    if (value < 1000) {
      return false;
    }
    if (isOdometerYear(value)) {
      return false;
    }
    if (filterDateNoise && (isOdometerYearMonth(value) || isOdometerClock(value))) {
      return false;
    }
    return true;
  });
  if (filtered.length === 0) {
    return null;
  }
  for (const length of [6, 5, 7, 4]) {
    const match = filtered.find((value) => String(value).length === length);
    if (match != null) {
      return match;
    }
  }
  return filtered[0] ?? null;
}

export function extractOdometerReading(text: string | null | undefined): number | null {
  if (!text) {
    return null;
  }
  const normalized = text.replace(/(\d),(\d)/g, '$1$2');
  const labeled: number[] = [];
  const kmPattern = /(\d{4,7})\s*(?:km|kms|kilomet)/gi;
  let match: RegExpExecArray | null = kmPattern.exec(normalized);
  while (match) {
    labeled.push(Number(match[1]));
    match = kmPattern.exec(normalized);
  }
  const fromLabel = pickOdometerCandidate(labeled, false);
  if (fromLabel != null) {
    return fromLabel;
  }
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

function isPlaceholderAssignment(value: string | null | undefined): boolean {
  const text = (value || '').trim();
  return text === '' || /^not assigned$/i.test(text) || text === '-';
}

/** A duty counts as a vehicle only after a registration number is saved. */
export function isRegisteredEventVehicle(vehicleNumber: string | null | undefined): boolean {
  return !isPlaceholderAssignment(vehicleNumber);
}

export function isShareVehicleAssigned(row: {
  vehicleNumber?: string | null;
  driverName?: string | null;
}): boolean {
  return !isPlaceholderAssignment(row.vehicleNumber) && !isPlaceholderAssignment(row.driverName);
}

export function shareListStats(
  rows: Array<{ status?: string | null }>,
  date = '',
): EventDailyStats {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const status = (row.status || 'not_started').toLowerCase();
    counts[status] = (counts[status] || 0) + 1;
  }
  const completed = counts.completed || 0;
  const inProgress = counts.in_progress || 0;
  return {
    date,
    totalVehicles: rows.length,
    started: completed + inProgress + (counts.missing_closing || 0),
    inProgress,
    completed,
    pending: (counts.not_started || 0) + (counts.scheduled || 0),
    missingOpening: counts.missing_opening || 0,
    missingClosing: counts.missing_closing || 0,
    exception: counts.exception || 0,
  };
}

export async function downscaleImageFile(file: File, maxEdge = 1600, quality = 0.82): Promise<File> {
  if (!file.type.startsWith('image/')) {
    return file;
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Could not read photo'));
      el.src = url;
    });
    const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
    if (scale === 1 && file.size < 1_200_000) {
      return file;
    }
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return file;
    }
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', quality);
    });
    if (!blob) {
      return file;
    }
    const base = file.name.replace(/\.[^.]+$/, '') || 'odometer';
    return new File([blob], `${base}.jpg`, { type: 'image/jpeg' });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export type HomeShortcutKind = 'driver' | 'event';

export type HomeShortcutPlatform = 'standalone' | 'ios' | 'android' | 'other';

const HOME_SHORTCUT_PATH: Record<HomeShortcutKind, RegExp> = {
  driver: /^\/driver\/register\/[a-fA-F0-9]{16,128}$/,
  event: /^\/event\/share\/[a-fA-F0-9]{16,128}$/,
};

/** The home-screen icon must open this token page, not the public site. */
export function homeShortcutStartPath(kind: HomeShortcutKind, pathname: string): string | null {
  const path = (pathname || '').split('?')[0].replace(/\/+$/, '') || '/';
  return HOME_SHORTCUT_PATH[kind].test(path) ? path : null;
}

export function homeShortcutPlatform(ua: string, standalone: boolean): HomeShortcutPlatform {
  if (standalone) return 'standalone';
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  if (/android/i.test(ua)) return 'android';
  return 'other';
}

/** WhatsApp and other in-app browsers cannot add a page to the phone home screen. */
export function isEmbeddedMobileBrowser(ua: string): boolean {
  return /WhatsApp|Instagram|FBAN|FBAV|FB_IAB|Line\/|Twitter|Snapchat|; wv\)/i.test(ua);
}
