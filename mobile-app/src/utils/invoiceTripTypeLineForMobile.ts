/**
 * Self-contained trip type label + HTML patch for React Native (no @/ web aliases / packageData).
 */

function modeLabelFromBooking(booking: Record<string, unknown>): string {
  const modeRaw = String(booking.trip_mode ?? booking.tripMode ?? '').toLowerCase();
  return modeRaw.includes('round') ? 'Round trip' : 'One way';
}

const KNOWN_LOCAL_HOURLY_CAPS: Array<[number, number]> = [
  [4, 40],
  [8, 80],
  [10, 100],
];

function bookingHasKnownLocalHourlyCapsRecord(booking: Record<string, unknown>): boolean {
  if (booking.tour_id ?? booking.tourId) {
    return false;
  }
  const h = Number(booking.hoursIncluded ?? booking.hours_included);
  const km = Number(booking.kmIncluded ?? booking.km_included);
  if (!Number.isFinite(h) || !Number.isFinite(km) || h <= 0 || km <= 0) {
    return false;
  }
  return KNOWN_LOCAL_HOURLY_CAPS.some(([H, K]) => H === h && K === km);
}

function normalizeTripForInvoice(booking: Record<string, unknown>): string {
  const tourRef = booking.tour_id ?? booking.tourId;
  if (!tourRef && (booking.hourlyPackage ?? booking.hourly_package)) {
    return 'local';
  }
  let t = String(booking.trip_type ?? booking.tripType ?? '').trim();
  if (!t) {
    return '';
  }
  const collapsed = t.toLowerCase().replace(/[\s_-]+/g, '');
  const lower = t.toLowerCase();
  if (
    lower === 'local' ||
    lower === 'local city ride' ||
    collapsed === 'localcityride' ||
    lower.includes('hourly')
  ) {
    return 'local';
  }
  const dropRaw = booking.drop_location ?? booking.dropLocation ?? '';
  const drop =
    typeof dropRaw === 'object' && dropRaw !== null
      ? String((dropRaw as { city?: string }).city ?? '').toLowerCase()
      : String(dropRaw).toLowerCase();
  if (!tourRef && drop.includes('local city ride')) {
    return 'local';
  }
  return t;
}

function stripHtmlTags(s: string): string {
  return s.replace(/<[^>]+>/g, ' ');
}

function tryParseLocalHoursKmFromInvoiceHtml(html: string): { hours: number; km: number } | null {
  let h: number | null = null;
  let km: number | null = null;
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let m: RegExpExecArray | null;
  while ((m = rowRe.exec(html)) !== null) {
    const plain = stripHtmlTags(m[1]).replace(/\s+/g, ' ').trim();
    const lower = plain.toLowerCase();
    if (/no\.?\s*of\s*hours?\b/i.test(lower)) {
      const nums = plain.match(/\d+/g);
      if (nums?.length) {
        h = parseInt(nums[nums.length - 1]!, 10);
      }
    }
    if (/no\.?\s*of\s*kilometers?\b/i.test(lower) || /no\.?\s*of\s*kms?\b/i.test(lower)) {
      const nums = plain.match(/\d+/g);
      if (nums?.length) {
        km = parseInt(nums[nums.length - 1]!, 10);
      }
    }
  }
  if (h != null && km != null && h > 0 && km > 0) {
    return { hours: h, km: km };
  }
  return null;
}

function enrichBookingFromInvoiceHtml(
  html: string,
  booking: Record<string, unknown>
): Record<string, unknown> {
  if (bookingHasKnownLocalHourlyCapsRecord(booking)) {
    return booking;
  }
  const parsed = tryParseLocalHoursKmFromInvoiceHtml(html);
  if (!parsed) {
    return booking;
  }
  const { hours, km } = parsed;
  const known = KNOWN_LOCAL_HOURLY_CAPS.some(([H, K]) => H === hours && K === km);
  if (!known) {
    return booking;
  }
  return { ...booking, hoursIncluded: hours, kmIncluded: km };
}

export function getInvoiceTripTypeDisplayForMobile(booking: Record<string, unknown> | undefined): string {
  if (!booking || typeof booking !== 'object') {
    return '— (One way)';
  }
  const modeLabel = modeLabelFromBooking(booking);
  const raw = String(booking.trip_type ?? booking.tripType ?? '').trim();
  const tourRef = booking.tour_id ?? booking.tourId;

  if (tourRef || raw.toLowerCase() === 'tour') {
    const name = String(booking.tour_name ?? booking.tourName ?? '').trim();
    return name ? `Tour: ${name} (${modeLabel})` : `Tour (${modeLabel})`;
  }

  const normalized = normalizeTripForInvoice(booking).toLowerCase();
  const isLocal = normalized === 'local' || bookingHasKnownLocalHourlyCapsRecord(booking);

  if (isLocal) {
    return 'Local';
  }

  if (normalized === 'airport' || raw.toLowerCase().includes('airport')) {
    return `Airport transfer (${modeLabel})`;
  }

  if (normalized === 'outstation' || raw.toLowerCase().includes('outstation')) {
    return `Outstation (${modeLabel})`;
  }

  if (raw) {
    const titled = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
    return `${titled} (${modeLabel})`;
  }

  return `— (${modeLabel})`;
}

const INVOICE_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export interface MobileTripSummary {
  tripType: string;
  vehicleType: string;
  vehicleNumber: string;
  tripDate: string;
  noOfHours: string;
  noOfKilometers: string;
}

export function formatInvoiceTripDateForMobile(dateStr?: unknown): string {
  if (dateStr == null || String(dateStr).trim() === '') return '';
  const raw = String(dateStr);
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  const day = String(d.getDate()).padStart(2, '0');
  return `${day} ${INVOICE_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function getDefaultBillingAddressForMobile(booking?: Record<string, unknown>): string {
  if (!booking) return '';
  return String(booking.billingAddress ?? booking.billing_address ?? '').trim();
}

export function getDefaultTripSummaryForMobile(booking?: Record<string, unknown>): MobileTripSummary {
  if (!booking) {
    return {
      tripType: '',
      vehicleType: '',
      vehicleNumber: '',
      tripDate: '',
      noOfHours: '--',
      noOfKilometers: '--',
    };
  }

  let noOfHours = '--';
  const hours =
    booking.hoursIncluded ?? booking.hours_included ?? booking.no_of_hours ?? booking.estimated_hours;
  if (hours != null && String(hours).trim() !== '') {
    noOfHours = String(hours);
  }

  let noOfKilometers = '--';
  const km = booking.kmIncluded ?? booking.km_included ?? booking.distance;
  if (km != null && String(km).trim() !== '' && Number(km) > 0) {
    noOfKilometers = String(Math.round(Number(km)));
  }

  return {
    tripType: getInvoiceTripTypeDisplayForMobile(booking),
    vehicleType: String(booking.cabType ?? booking.cab_type ?? booking.vehicle_type ?? ''),
    vehicleNumber: String(booking.vehicleNumber ?? booking.vehicle_number ?? '').trim(),
    tripDate: formatInvoiceTripDateForMobile(booking.pickupDate ?? booking.pickup_date),
    noOfHours,
    noOfKilometers,
  };
}

export function patchInvoiceHtmlTripTypeCellForMobile(
  html: string,
  booking: Record<string, unknown> | undefined
): string {
  if (!html || !booking) {
    return html;
  }
  const line = getInvoiceTripTypeDisplayForMobile(enrichBookingFromInvoiceHtml(html, booking));

  let patched = html.replace(
    /(<p[^>]*\bcompact-p\b[^>]*>\s*<strong>\s*Trip\s*Type\s*:?\s*<\/strong>)\s*[^<]*/gi,
    `$1 ${line}`
  );
  if (patched !== html) {
    return patched;
  }
  patched = html.replace(
    /(<p[^>]*\bcompact-p\b[^>]*>[\s\S]*?<strong>\s*Trip\s*Type\s*:?\s*<\/strong>)\s*([\s\S]*?)(<\/p>)/gi,
    (_, a: string, _mid: string, c: string) => `${a} ${line}${c}`
  );
  if (patched !== html) {
    return patched;
  }

  const reTd =
    /(<td[^>]*>[\s\S]*?Trip\s*Type\s*:?[\s\S]*?<\/td>\s*<td[^>]*>)([\s\S]*?)(<\/td>)/gi;
  patched = html.replace(reTd, (_, a: string, _mid: string, c: string) => `${a}${line}${c}`);
  if (patched !== html) {
    return patched;
  }
  const reTh =
    /(<th[^>]*>[\s\S]*?Trip\s*Type\s*:?[\s\S]*?<\/th>\s*<td[^>]*>)([\s\S]*?)(<\/td>)/gi;
  patched = html.replace(reTh, (_, a: string, _mid: string, c: string) => `${a}${line}${c}`);
  if (patched !== html) {
    return patched;
  }
  const reDetail =
    /(<div[^>]*\bdetail-label\b[^>]*>[\s\S]*?Trip\s*Type\s*:?[\s\S]*?<\/div>\s*<div[^>]*\bdetail-value\b[^>]*>)([\s\S]*?)(<\/div>)/gi;
  return html.replace(reDetail, (_, a: string, _mid: string, c: string) => `${a}${line}${c}`);
}
