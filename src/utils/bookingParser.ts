import { AI_VEHICLE_TYPES, type ParsedBooking } from '@/services/api/aiBookingAPI';

export type ParseResult = {
  data: ParsedBooking;
  parse_errors: string[];
};

const EMPTY_BOOKING = (): ParsedBooking => ({
  pickup_date: '',
  pickup_time: '',
  pickup_location: '',
  drop_location: '',
  trip_type: 'One Way',
  cost: 0,
  advance_received: 0,
  customer_name: '',
  customer_mobile: '',
  manager_name: '',
  manager_mobile: '',
  driver_name: '',
  vehicle_type: '',
  seating_capacity: 0,
  payment_mode: '',
});

function cleanFieldValue(raw: string): string {
  return raw
    .trim()
    .replace(/^\*+|\*+$/g, '')
    .replace(/^\_+|\_+$/g, '')
    .trim();
}

function matchLine(text: string, pattern: RegExp): string {
  const m = text.match(pattern);
  return cleanFieldValue(m?.[1] ?? '');
}

function dedupeLocation(raw: string): string {
  const v = cleanFieldValue(raw);
  if (!v) return '';
  const parts = v.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2 && parts[0] === parts[1]) return parts[0];
  return v.replace(/\s*\(?\s*https?:\/\/\S+/gi, '').trim();
}

function parseDate(raw: string): string {
  const t = cleanFieldValue(raw);
  if (!t) return '';
  const dmY = t.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dmY) {
    return `${dmY[3]}-${dmY[2].padStart(2, '0')}-${dmY[1].padStart(2, '0')}`;
  }
  const mdy = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) {
    return `${mdy[3]}-${mdy[2].padStart(2, '0')}-${mdy[1].padStart(2, '0')}`;
  }
  const ts = Date.parse(t);
  if (!Number.isNaN(ts)) return new Date(ts).toISOString().slice(0, 10);
  return '';
}

function parseTime(raw: string): string {
  const t = cleanFieldValue(raw);
  if (!t) return '';
  const ampm = t.match(/^(\d{1,2}):(\d{2})\s*(A\.?M\.?|P\.?M\.?)/i);
  if (ampm) {
    let hour = parseInt(ampm[1], 10);
    const min = ampm[2];
    const isPm = ampm[3].replace(/\./g, '').toUpperCase().startsWith('P');
    if (isPm && hour !== 12) hour += 12;
    if (!isPm && hour === 12) hour = 0;
    return `${String(hour).padStart(2, '0')}:${min}`;
  }
  const h24 = t.match(/^(\d{1,2}):(\d{2})$/);
  if (h24) return `${h24[1].padStart(2, '0')}:${h24[2]}`;
  return '';
}

function parseToField(raw: string): [string, string] {
  const cleaned = cleanFieldValue(raw);
  if (!cleaned) return ['', 'One Way'];
  let tripType = 'One Way';
  const bracket = cleaned.match(/^(.+?)\s*\(([^)]+)\)\s*$/i);
  if (bracket) {
    const location = bracket[1].trim();
    const suffix = bracket[2].toLowerCase();
    if (/two.?way|round.?trip/i.test(suffix)) tripType = 'Round Trip';
    else if (/one.?way/i.test(suffix)) tripType = 'One Way';
    else if (/local/i.test(suffix)) tripType = 'Local';
    return [location, tripType];
  }
  if (/^local$/i.test(cleaned)) return [cleaned, 'Local'];
  if (/two.?way|round.?trip/i.test(cleaned)) tripType = 'Round Trip';
  else if (/\blocal\b/i.test(cleaned)) tripType = 'Local';
  return [cleaned, tripType];
}

function parseMoney(raw: string): number {
  const t = cleanFieldValue(raw);
  if (!t) return 0;
  const primary = t.match(/₹?\s*([\d,]+)\s*(?:\/\s*-)?/);
  if (primary) {
    return parseInt(primary[1].replace(/,/g, ''), 10) || 0;
  }
  const fallback = t.match(/([\d,]+)/);
  return fallback ? parseInt(fallback[1].replace(/,/g, ''), 10) || 0 : 0;
}

/** e.g. "4+1" → 5, "7" → 7, "16 passengers" → 16 */
function parseSeatingCapacity(raw: string): number {
  const t = cleanFieldValue(raw);
  if (!t) return 0;
  const plus = t.match(/^(\d+)\s*\+\s*(\d+)/);
  if (plus) {
    return parseInt(plus[1], 10) + parseInt(plus[2], 10);
  }
  const n = t.match(/(\d+)/);
  return n ? parseInt(n[1], 10) : 0;
}

function parseCustomerName(raw: string): string {
  return cleanFieldValue(raw).replace(/^(Mr\.|Mrs\.|Ms\.|Miss\.|Dr\.)\s+/i, '').trim();
}

function parseMobile(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return digits.length === 10 ? digits : '';
}

function tempoBySeating(seating: number): string {
  if (seating >= 18) return 'Tempo Traveller 18';
  if (seating >= 17) return 'Tempo Traveller 17';
  if (seating >= 12) return 'Tempo Traveller 12';
  return 'Tempo Traveller 17';
}

/** Map free-text vehicle + seating to allowed AI vehicle type. */
export function normalizeVehicleName(name: string, seating = 0): string {
  const trimmed = cleanFieldValue(name)
    .replace(/\s*\[.*?\]\s*/g, '')
    .replace(/\s*\(.*?\)\s*/g, '')
    .trim();

  for (const allowed of AI_VEHICLE_TYPES) {
    if (trimmed.toLowerCase() === allowed.toLowerCase()) return allowed;
  }
  if (/sedan/i.test(trimmed)) return 'Sedan';
  if (/crysta/i.test(trimmed)) return 'Innova Crysta';
  if (/innova/i.test(trimmed)) return 'Innova';
  if (/ertiga/i.test(trimmed)) return 'Ertiga';
  if (/urbania/i.test(trimmed)) return 'Force Urbania';
  if (/tempo.*12|12.*tempo/i.test(trimmed)) return 'Tempo Traveller 12';
  if (/tempo.*17|17.*tempo/i.test(trimmed)) return 'Tempo Traveller 17';
  if (/tempo.*18|18.*tempo/i.test(trimmed)) return 'Tempo Traveller 18';
  if (/tempo/i.test(trimmed)) return tempoBySeating(seating);

  if (seating > 0) {
    if (seating <= 5) return 'Sedan';
    if (seating === 6) return 'Ertiga';
    if (seating <= 8) return 'Innova Crysta';
    if (seating <= 12) return 'Tempo Traveller 12';
    if (seating <= 17) return 'Tempo Traveller 17';
    if (seating === 18) return 'Tempo Traveller 18';
    if (seating >= 27) return 'Force Urbania';
  }

  return trimmed;
}

function isAllowedVehicle(vehicle: string): boolean {
  return AI_VEHICLE_TYPES.includes(vehicle as (typeof AI_VEHICLE_TYPES)[number]);
}

function parsePricingBlock(text: string): { vehicle_type: string; cost: number } | null {
  const lines = text.split('\n');
  for (const line of lines) {
    if (/km|hour|distance|receipt|booking\s*#/i.test(line)) continue;
    const m = line.match(/^\s*[\*\-•]?\s*(.+?):\s*[₹]?\s*([\d,]+)/i);
    if (!m) continue;
    const vehicle = normalizeVehicleName(m[1]);
    const cost = parseMoney(m[2]);
    if (vehicle && cost >= 100) {
      return { vehicle_type: vehicle, cost };
    }
  }
  return null;
}

function extractManagerBlock(text: string): string {
  const chunks = text.split(/\n-{3,}\n|\nTrip details\s*\n/i);
  for (let i = chunks.length - 1; i >= 0; i--) {
    if (/Pick-up Date:/i.test(chunks[i]) || /Passenger name:/i.test(chunks[i])) {
      return chunks[i];
    }
  }
  return text;
}

function isVizagConfirmationFormat(text: string): boolean {
  return /Booking Confirmation|Vizag Taxi Hub|\*Pickup:\*|\*Fare \(base\):/i.test(text);
}

function isManagerOrDriverFormat(text: string): boolean {
  return /Pick-up Date:/i.test(text) || /Passenger name:/i.test(text);
}

function collectErrors(data: ParsedBooking, optionalFields = false): string[] {
  const errors: string[] = [];
  if (!data.pickup_date) errors.push('pickup_date');
  if (!data.pickup_location) errors.push('pickup_location');
  if (!data.drop_location) errors.push('drop_location');
  if (!data.customer_name) errors.push('customer_name');
  if (!data.customer_mobile) errors.push('customer_mobile');
  if (data.cost <= 0) errors.push('cost');
  if (!data.vehicle_type || !isAllowedVehicle(data.vehicle_type)) errors.push('vehicle_type');
  if (!optionalFields) {
    if (data.seating_capacity <= 0) errors.push('seating_capacity');
    if (!data.payment_mode) errors.push('payment_mode');
  }
  return errors;
}

function finalizeResult(data: ParsedBooking, errors: string[]): ParseResult {
  if (data.vehicle_type) {
    const normalized = normalizeVehicleName(data.vehicle_type, data.seating_capacity);
    if (isAllowedVehicle(normalized)) {
      data.vehicle_type = normalized;
      const vi = errors.indexOf('vehicle_type');
      if (vi >= 0) errors.splice(vi, 1);
    }
  }
  data.pickup_location = dedupeLocation(data.pickup_location);
  data.drop_location = dedupeLocation(data.drop_location);
  data.advance_received = 0;
  return { data, parse_errors: [...new Set(errors)] };
}

/** Manager / Driver WhatsApp format */
function parseManagerDriverFormat(text: string): ParseResult {
  const errors: string[] = [];
  const data = EMPTY_BOOKING();

  const pickupDateRaw = matchLine(text, /Pick-up Date:\s*(.+)/i);
  data.pickup_date = parseDate(pickupDateRaw);
  if (!data.pickup_date) errors.push('pickup_date');

  const pickupTimeRaw = matchLine(text, /Pick-up Time:\s*(.+)/i);
  data.pickup_time = parseTime(pickupTimeRaw);
  if (pickupTimeRaw && !data.pickup_time) errors.push('pickup_time');

  data.pickup_location = matchLine(text, /From:\s*(.+)/i);
  if (!data.pickup_location) errors.push('pickup_location');

  const toRaw = matchLine(text, /To:\s*(.+)/i);
  [data.drop_location, data.trip_type] = parseToField(toRaw);
  if (!data.drop_location) errors.push('drop_location');

  const costRaw = matchLine(text, /Cost:\s*(.+)/i);
  data.cost = parseMoney(costRaw);
  if (data.cost <= 0) errors.push('cost');

  data.customer_name = parseCustomerName(matchLine(text, /Passenger name:\s*(.+)/i));
  if (!data.customer_name) errors.push('customer_name');

  data.customer_mobile = parseMobile(matchLine(text, /Passenger number:\s*(.+)/i));
  if (!data.customer_mobile) errors.push('customer_mobile');

  data.manager_name = matchLine(text, /Manager name:\s*(.+)/i);
  data.driver_name = matchLine(text, /Driver name:\s*(.+)/i);

  const phoneRaw = matchLine(text, /Phone number:\s*(.+)/i);
  if (data.manager_name) {
    data.manager_mobile = parseMobile(phoneRaw);
    if (phoneRaw && !data.manager_mobile) errors.push('manager_mobile');
  }

  const vehicleRaw = matchLine(text, /Vehicle:\s*(.+)/i);
  const seatingRaw = matchLine(text, /Seating capacity:\s*(.+)/i);
  data.seating_capacity = parseSeatingCapacity(seatingRaw);
  data.vehicle_type = normalizeVehicleName(vehicleRaw, data.seating_capacity);
  if (!data.vehicle_type || !isAllowedVehicle(data.vehicle_type)) errors.push('vehicle_type');
  if (data.seating_capacity <= 0) errors.push('seating_capacity');

  data.payment_mode = matchLine(text, /Mode of Payment:\s*(.+)/i);
  if (!data.payment_mode) errors.push('payment_mode');

  return finalizeResult(data, errors);
}

/** Vizag Taxi Hub app booking confirmation message */
function parseVizagConfirmation(text: string): ParseResult {
  const errors: string[] = [];
  const data = EMPTY_BOOKING();

  const hello = text.match(/Hello\s+([^!\n*]+)!/i);
  if (hello) data.customer_name = cleanFieldValue(hello[1]);

  data.pickup_location = dedupeLocation(
    matchLine(text, /\*Pickup:\*\s*(.+)/i) || matchLine(text, /Pickup:\s*(.+)/i)
  );
  if (!data.pickup_location) errors.push('pickup_location');

  data.drop_location = dedupeLocation(
    matchLine(text, /\*Destination:\*\s*(.+)/i) || matchLine(text, /Destination:\s*(.+)/i)
  );
  if (!data.drop_location) errors.push('drop_location');

  const dtRaw =
    matchLine(text, /\*Pickup date[^:]*:\*\s*(.+)/i) ||
    matchLine(text, /Pickup date[^:]*:\s*(.+)/i);
  if (dtRaw) {
    const parts = dtRaw.split(',');
    data.pickup_date = parseDate(parts[0]?.trim() ?? '');
    data.pickup_time = parseTime(parts.slice(1).join(',').trim());
  }
  if (!data.pickup_date) errors.push('pickup_date');

  const tripRaw = matchLine(text, /\*Trip type:\*\s*(.+)/i);
  if (/round/i.test(tripRaw)) data.trip_type = 'Round Trip';
  else if (/one.?way/i.test(tripRaw)) data.trip_type = 'One Way';
  else if (/local/i.test(tripRaw)) data.trip_type = 'Local';

  const capRaw =
    matchLine(text, /\*Capacity:\*\s*(.+)/i) || matchLine(text, /Capacity:\s*(.+)/i);
  data.seating_capacity = parseSeatingCapacity(capRaw);

  const vehicleRaw = matchLine(text, /\*Vehicle:\*\s*(.+)/i) || matchLine(text, /Vehicle:\s*(.+)/i);
  data.vehicle_type = normalizeVehicleName(vehicleRaw, data.seating_capacity);
  if (!data.vehicle_type || !isAllowedVehicle(data.vehicle_type)) errors.push('vehicle_type');

  const guestRaw = matchLine(text, /\*Guest contact:\*\s*(.+)/i);
  if (guestRaw) {
    const phoneMatch = guestRaw.match(/(\+?\d[\d\s\-]{8,}\d)/);
    if (phoneMatch) data.customer_mobile = parseMobile(phoneMatch[1]);
    const namePart = guestRaw.replace(phoneMatch?.[0] ?? '', '').replace(/,/g, ' ').trim();
    if (namePart) data.customer_name = parseCustomerName(namePart);
  }
  if (!data.customer_name) errors.push('customer_name');
  if (!data.customer_mobile) errors.push('customer_mobile');

  const fareRaw =
    matchLine(text, /\*Fare \(base\):\*\s*(.+)/i) ||
    matchLine(text, /Fare \(base\):\s*(.+)/i);
  data.cost = parseMoney(fareRaw);
  if (data.cost <= 0) errors.push('cost');

  const advanceRaw = matchLine(text, /\*Advance:\*\s*(.+)/i);
  if (/razorpay|online|upi/i.test(advanceRaw)) data.payment_mode = 'Online';
  else if (/phonepe/i.test(advanceRaw)) data.payment_mode = 'PhonePe';
  else data.payment_mode = 'Cash';

  const driverRaw = matchLine(text, /\*Driver:\*\s*(.+)/i);
  if (driverRaw && !/to be shared/i.test(driverRaw)) {
    data.driver_name = cleanFieldValue(driverRaw.split(',')[0] ?? driverRaw);
  }

  return finalizeResult(data, collectErrors(data, true));
}

function mergePreferPrimary(primary: ParseResult, secondary: ParseResult): ParseResult {
  const data = { ...secondary.data };
  const fields: (keyof ParsedBooking)[] = [
    'pickup_date', 'pickup_time', 'pickup_location', 'drop_location', 'trip_type',
    'cost', 'customer_name', 'customer_mobile',
    'manager_name', 'manager_mobile', 'driver_name', 'vehicle_type',
    'seating_capacity', 'payment_mode',
  ];
  for (const key of fields) {
    const pv = primary.data[key];
    const sv = data[key];
    if (pv !== '' && pv !== 0 && pv != null) {
      if (sv === '' || sv === 0) data[key] = pv as never;
    }
  }
  const errors = collectErrors(data, !data.payment_mode);
  return finalizeResult(data, errors);
}

/** Regex parser — Manager, Driver, Vizag confirmation, and pricing formats. */
export function parseBookingText(input: string): ParseResult {
  const text = input.replace(/\r\n/g, '\n').trim();
  if (!text) {
    return { data: EMPTY_BOOKING(), parse_errors: ['input'] };
  }

  const managerBlock = extractManagerBlock(text);
  const hasManager = isManagerOrDriverFormat(managerBlock);
  const hasConfirmation = isVizagConfirmationFormat(text);

  if (hasManager && hasConfirmation) {
    if (managerBlock.trim() !== text) {
      return parseManagerDriverFormat(managerBlock);
    }
    return mergePreferPrimary(
      parseManagerDriverFormat(managerBlock),
      parseVizagConfirmation(text)
    );
  }
  if (hasManager) {
    return parseManagerDriverFormat(managerBlock);
  }
  if (hasConfirmation) {
    return parseVizagConfirmation(text);
  }

  let result = parseManagerDriverFormat(text);
  if (result.parse_errors.length > 3) {
    const pricing = parsePricingBlock(text);
    if (pricing) {
      if (!result.data.vehicle_type || !isAllowedVehicle(result.data.vehicle_type)) {
        result.data.vehicle_type = pricing.vehicle_type;
      }
      if (result.data.cost <= 0) result.data.cost = pricing.cost;
      result = finalizeResult(result.data, collectErrors(result.data, true));
    }
  }

  return result;
}

export function describeParseErrors(parseErrors: string[]): string {
  if (parseErrors.length === 0) return '';
  const labels: Record<string, string> = {
    pickup_date: 'Pick-up Date',
    pickup_time: 'Pick-up Time',
    pickup_location: 'From / Pickup',
    drop_location: 'To / Destination',
    cost: 'Cost / Fare',
    customer_name: 'Passenger / Guest name',
    customer_mobile: 'Passenger / Guest mobile',
    vehicle_type: 'Vehicle',
    seating_capacity: 'Seating capacity',
    payment_mode: 'Mode of Payment',
    input: 'Input text',
  };
  return parseErrors.map((k) => labels[k] ?? k).join(', ');
}
