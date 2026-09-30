import React from 'react';
import { Document, Font, Image, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { Location } from '@/lib/locationData';

export type TourCartQuotationItineraryDay = {
  day: number;
  title: string;
  description: string;
  activities: string[];
};

export type TourCartQuotationTour = {
  tourId?: string;
  tourName: string;
  duration: string;
  price: number;
  days?: number;
  distance?: number;
  timeDuration?: string;
  description?: string;
  itinerary?: TourCartQuotationItineraryDay[];
};

export type TourCartQuotationVehicle = {
  name: string;
  price: number;
  capacity?: number;
  image?: string;
};

export type TourQuoteInclusions = {
  parking: boolean;
  tolls: boolean;
  driverAllowance: boolean;
  permits: boolean;
  entryFees: boolean;
  hotels: boolean;
  gst: boolean;
};

export const defaultTourQuoteInclusions = (): TourQuoteInclusions => ({
  parking: false,
  tolls: false,
  driverAllowance: false,
  permits: false,
  entryFees: false,
  hotels: false,
  gst: false,
});

const QUOTE_EXTRAS: Array<{ key: keyof TourQuoteInclusions; label: string; excludedLabel?: string }> = [
  { key: 'parking', label: 'Parking fees' },
  { key: 'tolls', label: 'Tolls' },
  { key: 'driverAllowance', label: "Driver's allowance" },
  { key: 'permits', label: 'Permits' },
  { key: 'entryFees', label: 'Entry fees' },
  { key: 'hotels', label: 'Hotels' },
];

export const GST_INVOICE_NOTE = 'GST 18% is applicable only when a GST invoice is raised.';

export function quoteInclusionSummary(inclusions: TourQuoteInclusions): string {
  const included = QUOTE_EXTRAS.filter((item) => inclusions[item.key]).map((item) => item.label);
  const excluded = QUOTE_EXTRAS.filter((item) => !inclusions[item.key]).map(
    (item) => item.excludedLabel || item.label
  );
  const parts: string[] = ['Private cab, driver and fuel as per package are included'];
  if (included.length > 0) parts.push(`${included.join(', ')} included`);
  if (excluded.length > 0) parts.push(`${excluded.join(', ')} not included`);
  return `${parts.join('. ')}. ${GST_INVOICE_NOTE}`;
}

function quoteInclusionLines(
  inclusions: TourQuoteInclusions,
  adjustments?: TourQuoteAdjustments
): { included: string; excluded: string } {
  const included = ['Private cab', 'Driver', 'Fuel as per package'];
  const excluded: string[] = [];
  for (const item of QUOTE_EXTRAS) {
    if (inclusions[item.key]) included.push(item.label);
    else excluded.push(item.excludedLabel || item.label);
  }
  if (adjustments?.carrierIncluded) {
    const amount = Math.max(0, Number(adjustments.carrierAmount) || 0);
    included.push(amount > 0 ? `Carrier (+ Rs ${Math.round(amount)})` : 'Carrier');
  }
  const dot = ' · ';
  return {
    included: `${included.join(dot)} - INCLUDED`,
    excluded: excluded.length > 0 ? `${excluded.join(dot)} - NOT INCLUDED` : '',
  };
}

export type TourQuoteTripPlan = {
  pickupLocation: string;
  pickupDate: string;
  pickupTime: string;
  tourDuration: string;
  pickupPlace?: Location;
};

export type TourQuoteAdjustments = {
  lastDropLocation?: string;
  hotelName?: string;
  /** Quotation-only overnight stay location for each night. */
  nightStays?: string[];
  carrierIncluded?: boolean;
  carrierAmount?: number;
  extraLabel?: string;
  extraAmount?: number;
  discountAmount?: number;
  /** Quotation-only seating override for Tempo Traveller / Urbania. */
  customSeatingCapacity?: number;
  /** Editable itinerary places for each quote day (index is day number minus 1). */
  extraPlacesByDay?: string[][];
  quoteNotes?: string;
};

export const defaultTourQuoteAdjustments = (): TourQuoteAdjustments => ({
  lastDropLocation: '',
  hotelName: '',
  nightStays: [],
  carrierIncluded: false,
  carrierAmount: 0,
  extraLabel: '',
  extraAmount: 0,
  discountAmount: 0,
  customSeatingCapacity: 0,
  extraPlacesByDay: [],
  quoteNotes: '',
});

export function quoteAddonTotal(adjustments?: TourQuoteAdjustments): number {
  const carrier =
    adjustments?.carrierIncluded ? Math.max(0, Number(adjustments.carrierAmount) || 0) : 0;
  const extra = Math.max(0, Number(adjustments?.extraAmount) || 0);
  return carrier + extra;
}

export function quotePayableTotal(
  packageTotal: number,
  adjustments?: TourQuoteAdjustments
): number {
  const base = Math.max(0, Number(packageTotal) || 0);
  const addons = quoteAddonTotal(adjustments);
  const discount = Math.max(0, Number(adjustments?.discountAmount) || 0);
  return Math.max(0, base + addons - Math.min(discount, base + addons));
}

export type TourQuoteAirportTransfer = {
  direction: 'from-airport' | 'to-airport';
  placeName: string;
  pickupDate: string;
  pickupTime: string;
  fare?: number;
  distanceKm?: number;
  place?: Location;
};

export type TourCartQuotationPDFProps = {
  customerName: string;
  customerPhone: string;
  preparedOn: Date;
  tours: TourCartQuotationTour[];
  selectedVehicleName: string;
  combinedTotal: number;
  /** Extra airport-transfer fare already included in combinedTotal. */
  additionalAirportFare?: number;
  airportTransfers?: TourQuoteAirportTransfer[];
  vehicleOptions: TourCartQuotationVehicle[];
  inclusions?: TourQuoteInclusions;
  tripPlan?: TourQuoteTripPlan;
  routeLabel?: string;
  tripTypeLabel?: string;
  /** Original package fare before extras and discount. */
  packageTotal?: number;
  adjustments?: TourQuoteAdjustments;
};

const GREEN = '#1A3A2A';
const GREEN_LINE = '#2A5A3A';
const GREEN_EDGE = '#1A7A3A';
const GOLD = '#D4A017';
const CREAM = '#F5E6B3';
const CREAM_ALT = '#FAF0CC';
const BODY = '#353535';
const MUTED = '#6B7280';
const MINT = '#AAFFAA';

function logoSrc(): string {
  if (typeof window !== 'undefined') return '/uploads/vizagtaxihub-logo.png';
  return `${process.cwd().replace(/\\/g, '/')}/public/uploads/vizagtaxihub-logo.png`;
}

Font.registerHyphenationCallback((word) => [word]);

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#ffffff',
    paddingTop: 28,
    paddingBottom: 42,
    paddingHorizontal: 42,
    fontFamily: 'Helvetica',
    color: GREEN,
  },
  watermark: {
    position: 'absolute',
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#E6E6E6',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 26,
    backgroundColor: GREEN,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  bottomText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
    color: GOLD,
    textAlign: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  brandLockup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 136,
    height: 36,
    marginRight: 12,
  },
  title: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 17,
    color: GREEN,
  },
  quoteDate: {
    fontFamily: 'Helvetica',
    fontSize: 8,
    color: MUTED,
    marginBottom: 2,
  },
  goldRule: {
    height: 3,
    backgroundColor: GOLD,
    marginBottom: 10,
  },
  dearRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  dear: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    color: GREEN,
  },
  phone: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: MUTED,
  },
  intro: {
    fontSize: 9,
    lineHeight: 1.4,
    color: BODY,
    marginBottom: 10,
  },
  introBold: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: BODY,
  },
  stats: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: GREEN,
    marginBottom: 8,
  },
  statsGold: {
    height: 5,
    backgroundColor: GOLD,
  },
  statsRow: {
    flexDirection: 'row',
    minHeight: 58,
  },
  stat: {
    flex: 1,
    paddingTop: 7,
    paddingBottom: 8,
    paddingHorizontal: 8,
    borderRightWidth: 0.6,
    borderRightColor: GREEN_LINE,
  },
  statLast: {
    borderRightWidth: 0,
  },
  statLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 6.5,
    color: GOLD,
    marginBottom: 4,
  },
  statValue: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    color: '#FFFFFF',
    lineHeight: 1.25,
  },
  statValueFare: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
    color: '#FFFFFF',
  },
  statSub: {
    fontFamily: 'Helvetica',
    fontSize: 6.5,
    color: CREAM,
    marginTop: 3,
  },
  routeBar: {
    backgroundColor: GREEN,
    borderWidth: 1.5,
    borderColor: GOLD,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginBottom: 6,
  },
  routeText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
    color: CREAM,
    textAlign: 'center',
  },
  includeBar: {
    backgroundColor: GREEN,
    borderWidth: 1.5,
    borderColor: GREEN_EDGE,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  includeText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.5,
    color: MINT,
    textAlign: 'center',
    lineHeight: 1.35,
  },
  sectionWrap: {
    marginBottom: 4,
  },
  sectionWrapSpaced: {
    marginTop: 12,
  },
  sectionHead: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    color: GOLD,
    marginBottom: 2,
  },
  sectionRule: {
    height: 0.7,
    backgroundColor: CREAM,
    marginBottom: 6,
  },
  dayCard: {
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: GOLD,
    borderRightWidth: 0.4,
    borderBottomWidth: 0.4,
    borderRightColor: '#DDDDDD',
    borderBottomColor: '#DDDDDD',
  },
  dayHeadRow: {
    backgroundColor: GREEN,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  dayHeadLeft: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8.5,
    color: '#FFFFFF',
    marginRight: 8,
  },
  dayHeadMain: {
    flex: 1,
    paddingLeft: 8,
  },
  dayHeadRight: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    color: CREAM,
  },
  dayBody: {
    backgroundColor: '#FFFFFF',
    paddingTop: 4,
    paddingBottom: 4,
    paddingHorizontal: 8,
  },
  sectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 2,
  },
  square: {
    width: 5,
    height: 5,
    marginRight: 6,
    backgroundColor: GOLD,
  },
  sectionName: {
    flex: 1,
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    color: GOLD,
  },
  haltName: {
    flex: 1,
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    color: GREEN,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderBottomWidth: 0.4,
    borderBottomColor: '#F0F0F0',
    paddingVertical: 3,
    paddingLeft: 2,
  },
  dash: {
    width: 12,
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: GOLD,
  },
  place: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8.5,
    color: GREEN,
  },
  detail: {
    fontFamily: 'Helvetica-Oblique',
    fontSize: 7.5,
    color: MUTED,
  },
  costBox: {
    backgroundColor: GREEN,
    borderTopWidth: 3,
    borderTopColor: GOLD,
    borderTopLeftRadius: 6,
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  costKicker: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8.5,
    color: GOLD,
    marginBottom: 6,
    textAlign: 'center',
  },
  costAmount: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 28,
    color: '#FFFFFF',
    marginBottom: 6,
    textAlign: 'center',
  },
  costSub: {
    fontFamily: 'Helvetica',
    fontSize: 7.5,
    color: CREAM,
    marginBottom: 4,
    textAlign: 'center',
  },
  costInc: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.5,
    color: MINT,
    textAlign: 'center',
  },
  noteRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  noteNum: {
    width: 16,
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.5,
    color: GOLD,
  },
  noteText: {
    flex: 1,
    fontFamily: 'Helvetica',
    fontSize: 7.5,
    color: BODY,
    lineHeight: 1.35,
  },
  closeRow: {
    flexDirection: 'row',
    marginTop: 14,
  },
  closeLeft: {
    flex: 1.1,
    paddingRight: 12,
  },
  brand: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
    color: GREEN,
    marginBottom: 2,
  },
  closeMeta: {
    fontFamily: 'Helvetica',
    fontSize: 8,
    color: MUTED,
    lineHeight: 1.4,
  },
  closeRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  closeInvite: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: GREEN,
    textAlign: 'right',
    marginBottom: 2,
  },
  closeHint: {
    fontFamily: 'Helvetica',
    fontSize: 8,
    color: MUTED,
    textAlign: 'right',
    marginBottom: 6,
  },
  ctaTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: GOLD,
    textAlign: 'right',
  },
  ctaSub: {
    fontFamily: 'Helvetica',
    fontSize: 8,
    color: MUTED,
    textAlign: 'right',
    marginTop: 1,
  },
});


const NOTES = [
  "Driver's food expenses are not included in the above cost.",
  'AC will be switched off while travelling through ghat roads and while the vehicle is on standby.',
  'Sightseeing will be covered subject to available time, weather, road conditions and local circumstances. We will not be responsible for delays caused by traffic, road closures, strikes, bandhs or other unforeseen circumstances.',
  'For places inaccessible by our vehicle, the cab will proceed only up to the designated parking area. Guests will need to use local jeeps or autos at their own expense.',
  'During peak season, parking may be restricted at popular viewpoints. Guests may need to walk or use local autos at their own expense.',
  'Any extension beyond the agreed vehicle duty hours/time limit will incur additional charges.',
  'All sightseeing is planned route-wise and subject to the operational timings and accessibility of each location. Pickup location, date and time will be confirmed before travel.',
  GST_INVOICE_NOTE,
];

const TERMS = [
  'Spitting or vomiting inside the bus/car can be unpleasant and difficult to clean up. It can also spread germs and bacteria. The cost of cleaning up vomit can range from Rs. 500 to Rs. 1,000, depending on the severity of the mess.',
  'Loud sound systems can be disruptive to other passengers and can also damage the bus. If you are caught playing loud music on the bus/car, you could be fined.',
  'Damage to any part of the bus/car is also not tolerated. If you are found to have damaged the bus, you will be responsible for the cost of repairs.',
  'Smoking and drinking are not allowed inside the buses/cars.',
  'Keep your belongings close to you and do not leave them unattended.',
  'Please read the entire terms and conditions and itinerary before booking. This will ensure that you understand all of the policies and procedures related to your bus/car travel.',
];

const DOT = ' · ';

function rupees(amount: number): string {
  return `Rs. ${amount.toLocaleString('en-IN')}/-`;
}

function pdfText(raw: string): string {
  return raw
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[^\x09\x0A\x0D\x20-\x7E\u00B7]/g, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  return pdfText(phone);
}

function routeToken(name: string): string {
  if (/\bto\b/i.test(name)) return pdfText(name.replace(/\s+/g, ' ').trim());
  let text = name
    .replace(/\s+\d+\s*D\b.*$/i, '')
    .replace(/\s+Package\b.*$/i, '')
    .replace(/\s*[–—-]\s+.*$/, '')
    .replace(/^\d+\s*Days?\s+/i, '')
    .replace(/\bTour\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  text = text.split(/\s*[&+/]\s*/)[0]?.trim() || text;
  text = text.replace(/^Vizag\s+/i, '').replace(/\s+Valley$/i, '').replace(/\s+Temple$/i, '');
  const words = text.split(' ').filter(Boolean);
  if (words.length > 2) text = words.slice(0, 2).join(' ');
  return text || pdfText(name);
}

function ribbonPlace(name: string): string {
  const text = name
    .replace(/\s+\d+\s*D\b.*$/i, '')
    .replace(/\s+Package\b.*$/i, '')
    .replace(/\s*[–—-]\s+.*$/, '')
    .replace(/^\d+\s*Days?\s+/i, '')
    .replace(/\bTour\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text || pdfText(name);
}

function splitActivity(raw: string): { place: string; detail: string } {
  const text = pdfText(raw).replace(/^[\s\-•n]+/, '').trim();
  const parts = text.split(/\s+-\s+/);
  if (parts.length >= 2) {
    return { place: parts[0].trim(), detail: parts.slice(1).join(' - ').trim() };
  }
  const colon = text.split(/:\s+/);
  if (colon.length === 2 && colon[0].length < 42) {
    return { place: colon[0].trim(), detail: colon[1].trim() };
  }
  return { place: text, detail: '' };
}

function isHalt(text: string): boolean {
  return /night halt|drop at hotel|overnight stay|night stay/i.test(text);
}

function isVizagPlace(text: string): boolean {
  return /visakhapatnam|\bvizag\b/i.test(text);
}

function shortHalt(raw: string): string {
  const text = pdfText(raw);
  if (isVizagPlace(text)) return 'Visakhapatnam';
  if (/araku/i.test(text)) return 'Araku';
  if (/\bpuri\b/i.test(text)) return 'Puri';
  if (/bhubaneswar/i.test(text)) return 'Bhubaneswar';
  if (/gopalpur/i.test(text)) return 'Gopalpur';
  const inCity = text.match(/\bin\s+([A-Za-z][A-Za-z\s]{1,24})/i);
  if (inCity && !/hotel|night|evening/i.test(inCity[1])) {
    return inCity[1].trim().replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
  }
  return '';
}

function dayTitle(raw: string): string {
  const text = pdfText(raw).replace(/\s+/g, ' ').trim();
  if (text.length <= 90) return text;
  return `${text.slice(0, 90).trim()}...`;
}

function sightseeingDayTitle(raw: string): string {
  let text = dayTitle(raw);
  text = text.replace(/\s*[-–—:]\s*.*\bin\s+one\s+day\b.*$/i, '');
  text = text.replace(/\s*[-–—:]\s*Beaches\b.*$/i, '');
  text = text.replace(/\s*[-–—:]\s*Viewpoints?\b.*$/i, '');
  return text.replace(/\s+/g, ' ').trim() || dayTitle(raw);
}

function isLocalSightseeingTour(tour: TourCartQuotationTour): boolean {
  const haystack = `${tour.tourName} ${tour.duration || ''} ${tour.timeDuration || ''}`;
  if (/city\s*tour|sight\s*see|local\s*sight|north\s*city|south\s*city/i.test(haystack)) {
    return true;
  }
  const days = Number(tour.days) > 0 ? Number(tour.days) : 0;
  return days === 1 && Boolean(tourHoursLabel(tour) || tourKmLabel(tour));
}

function localPackageLabel(tour: TourCartQuotationTour): string {
  const hoursMatch = /(\d+)\s*h/i.exec(`${tourHoursLabel(tour)} ${tour.duration || ''}`);
  const hours = hoursMatch ? Number(hoursMatch[1]) : 10;
  const km = Number(tour.distance) > 0 ? Math.round(Number(tour.distance)) : 100;
  return `${hours}hrs ${km}Km Package`;
}

function hasTiming(text: string): boolean {
  return /\d+\s*h(?:ou)?rs?|\d+\s*km|\b\d{1,2}:\d{2}\b|\b(?:am|pm)\b/i.test(text);
}

function tourHoursLabel(tour: TourCartQuotationTour): string {
  const hours = String(tour.timeDuration || '').trim();
  if (hours) return hours;
  const duration = String(tour.duration || '').trim();
  if (/\d+\s*h(?:ou)?rs?|full\s*day/i.test(duration)) return duration;
  return '';
}

function tourKmLabel(tour: TourCartQuotationTour): string {
  return Number(tour.distance) > 0 ? `${Math.round(Number(tour.distance))} KM` : '';
}

function isLocalTourQuote(tours: TourCartQuotationTour[], tripTypeLabel?: string): boolean {
  if (/^local\b/i.test(pdfText(tripTypeLabel || ''))) return true;
  if (tours.length !== 1) return false;
  const tour = tours[0];
  const days = Number(tour.days) > 0 ? Number(tour.days) : tour.itinerary?.length || 0;
  if (days > 1) return false;
  return days === 1 || Boolean(tourHoursLabel(tour));
}

function tourTimingSuffix(tour: TourCartQuotationTour): string {
  const fromFields = [tourHoursLabel(tour), tourKmLabel(tour).replace(' KM', 'KM')].filter(Boolean).join(' ');
  if (fromFields) return fromFields;
  const duration = String(tour.duration || '').trim();
  if (duration && hasTiming(duration)) return duration;
  return '';
}

type FlatDay = {
  day: number;
  heading: string;
  section: string;
  activities: string[];
  halt: string;
};

function parsePlanDate(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatPlanDate(date: Date): string {
  const day = date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const weekday = date.toLocaleDateString('en-GB', { weekday: 'long' });
  return `${day} (${weekday})`;
}

function formatPlanTime(value: string): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return pdfText(value);
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return pdfText(value);
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

function sameDayHours(value: string): number | null {
  const match = /(\d+(?:\.\d+)?)\s*h(?:ou)?rs?/i.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  if (!Number.isFinite(hours) || hours <= 0 || hours > 18) return null;
  return hours;
}

function endClock(start: string, hours: number): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(start.trim());
  if (!match) return '';
  const total = Number(match[1]) * 60 + Number(match[2]) + Math.round(hours * 60);
  const wrapped = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const endHours = Math.floor(wrapped / 60);
  const endMinutes = wrapped % 60;
  return formatPlanTime(`${endHours}:${String(endMinutes).padStart(2, '0')}`);
}

function isBookingTripKind(label: string): boolean {
  return /outstation|airport transfer|^local\b/i.test(label);
}

function scheduleDays(days: FlatDay[], plan?: TourQuoteTripPlan, tripTypeLabel?: string): FlatDay[] {
  if (!plan) return days;
  const location = pdfText(plan.pickupLocation);
  const time = plan.pickupTime ? formatPlanTime(plan.pickupTime) : '';
  const start = parsePlanDate(plan.pickupDate);
  const hours = sameDayHours(plan.tourDuration || '');
  const bookingKind = isBookingTripKind(tripTypeLabel || '');
  const localKind = /^local\b/i.test(tripTypeLabel || '');
  const oneWay = /one[-\s]?way/i.test(tripTypeLabel || '');
  const until = !bookingKind && !oneWay && hours && plan.pickupTime ? endClock(plan.pickupTime, hours) : '';
  const windowLabel = time && until ? `${time} to ${until}` : '';
  return days.map((day, index) => {
    const date = start ? new Date(start.getFullYear(), start.getMonth(), start.getDate() + index) : null;
    const dateLabel = date ? formatPlanDate(date) : '';
    let heading = bookingKind && !localKind
      ? dateLabel || day.heading
      : [dateLabel, day.heading].filter(Boolean).join(' | ');
    if (!bookingKind && index === 0 && windowLabel && !/\b(?:am|pm)\b/i.test(day.heading)) {
      heading = `${heading} (${windowLabel})`;
    }
    const pickup =
      index === 0 && (location || time)
        ? `Pickup from ${location || 'pickup point'}${time ? ` at ${time}` : ''}`
        : '';
    return {
      ...day,
      heading,
      activities: pickup ? [pickup, ...day.activities] : day.activities,
    };
  });
}

function flattenDays(
  tours: TourCartQuotationTour[],
  plan?: TourQuoteTripPlan,
  tripTypeLabel?: string,
  routeLabel?: string,
  adjustments?: TourQuoteAdjustments
): FlatDay[] {
  const out: FlatDay[] = [];
  let n = 1;
  const tripKind = pdfText(tripTypeLabel || '');
  const bookingKind = isBookingTripKind(tripKind);
  const localQuote = isLocalTourQuote(tours, tripKind);
  const routeLine = bookingKind
    ? [pdfText(routeLabel || tours[0]?.tourName || ''), tripKind].filter(Boolean).join(' ')
    : '';
  for (const tour of tours) {
    const days =
      tour.itinerary && tour.itinerary.length > 0
        ? tour.itinerary
        : [
            {
              day: 1,
              title: tour.tourName,
              description: '',
              activities: tour.description && !isBookingTripKind(tour.description) ? [tour.description] : [],
            },
          ];
    const singleDay = days.length === 1;
    for (const item of days) {
      const sightseeing = isLocalSightseeingTour(tour);
      const rawTitle = sightseeing
        ? sightseeingDayTitle(item.title || tour.tourName)
        : dayTitle(item.title || tour.tourName);
      const timing = sightseeing
        ? localPackageLabel(tour)
        : localQuote || (!bookingKind && tours.length === 1 && singleDay)
          ? tourTimingSuffix(tour)
          : '';
      const heading =
        bookingKind && !localQuote && !sightseeing
          ? ''
          : timing && !hasTiming(rawTitle)
            ? `${rawTitle} (${timing})`.trim()
            : rawTitle;
      const haltFromActs = [...item.activities].reverse().find((line) => isHalt(line)) || '';
      const hasEditedPlaces = (adjustments?.extraPlacesByDay || []).some((places) =>
        (places || []).some((place) => pdfText(place).trim())
      );
      const edited = extraPlacesForDay(adjustments, out.length);
      const activities = hasEditedPlaces
        ? edited
        : item.activities.filter((line) => {
            if (isHalt(line)) return false;
            if (!bookingKind) return true;
            if (isBookingTripKind(line) && !/\bto\b/i.test(line)) return false;
            return true;
          });
      if (
        !hasEditedPlaces &&
        bookingKind &&
        routeLine &&
        n === 1 &&
        !activities.some((line) => /\bto\b/i.test(line))
      ) {
        activities.push(routeLine);
      }
      const rawSection =
        !bookingKind && item.description && item.description.length < 80 ? pdfText(item.description) : '';
      const section =
        rawSection && /beaches|viewpoints?|museums|in one day/i.test(rawSection) ? '' : rawSection;
      out.push({
        day: n,
        heading,
        section,
        activities,
        halt: haltFromActs ? shortHalt(haltFromActs) : '',
      });
      n += 1;
    }
  }
  return applyEndRouteHeadings(
    finalizeNightHalts(applyQuoteNotes(scheduleDays(out, plan, tripTypeLabel), adjustments), adjustments),
    adjustments
  );
}

function quoteEndPlace(adjustments?: TourQuoteAdjustments): string {
  const drop = pdfText(adjustments?.lastDropLocation || '').trim();
  if (drop) return drop;
  const stays = (adjustments?.nightStays || []).map((stay) => pdfText(stay).trim()).filter(Boolean);
  return stays[stays.length - 1] || '';
}

function isVanajangiPlace(text: string): boolean {
  return /vana?jangi/i.test(text);
}

function applyEndRouteHeadings(days: FlatDay[], adjustments?: TourQuoteAdjustments): FlatDay[] {
  const endPlace = quoteEndPlace(adjustments);
  if (!isVanajangiPlace(endPlace)) return days;
  return days.map((day, index) => {
    const mentionsAraku = /araku/i.test(day.heading);
    const mentionsVizag = isVizagPlace(day.heading);
    const isLast = index === days.length - 1;
    if (!mentionsVizag || (!mentionsAraku && !isLast)) return day;
    const datePrefix = day.heading.match(/^(.+?)\s*\|\s*/);
    const prefix = datePrefix ? `${datePrefix[1].trim()} | ` : '';
    return { ...day, heading: `${prefix}Araku Valley to Vanajangi` };
  });
}

function finalizeNightHalts(days: FlatDay[], adjustments?: TourQuoteAdjustments): FlatDay[] {
  const stays = (adjustments?.nightStays || []).map((stay) => pdfText(stay).trim());
  return days.map((day, index) => {
    const stay = stays[index];
    if (stay) {
      return { ...day, halt: shortHalt(stay) || stay };
    }
    if (isVizagPlace(day.halt)) {
      return { ...day, halt: '' };
    }
    return day;
  });
}

function extraPlacesForDay(adjustments: TourQuoteAdjustments | undefined, dayIndex: number): string[] {
  return (adjustments?.extraPlacesByDay?.[dayIndex] || [])
    .map((place) => pdfText(place).trim())
    .filter(Boolean);
}

function applyQuoteNotes(days: FlatDay[], adjustments?: TourQuoteAdjustments): FlatDay[] {
  if (!adjustments || days.length === 0) return days;
  const drop = pdfText(adjustments.lastDropLocation || '').trim();
  const stays = (adjustments.nightStays || []).map((stay) => pdfText(stay).trim());
  const hasNightStays = stays.some(Boolean);
  const hotel = pdfText(adjustments.hotelName || '').trim();
  const notes = pdfText(adjustments.quoteNotes || '').trim();
  return days.map((day, index) => {
    const extras: string[] = [];
    if (index === days.length - 1) {
      if (drop) extras.push(`Drop at ${drop}`);
      if (hotel && !hasNightStays) extras.push(`Hotel: ${hotel}`);
      if (notes) extras.push(`Notes: ${notes}`);
    }
    if (extras.length === 0) return day;
    return { ...day, activities: [...day.activities, ...extras] };
  });
}

function startOfPlanDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function airportTransferCard(transfer: TourQuoteAirportTransfer): { when: string; route: string } {
  const airport = 'Alluri Sitarama Raju International Airport';
  const place = pdfText(transfer.placeName) || 'selected location';
  const route =
    transfer.direction === 'from-airport'
      ? `From ${airport} to ${place}`
      : `From ${place} to ${airport}`;
  const date = transfer.pickupDate ? parsePlanDate(transfer.pickupDate) : null;
  const when = [
    date ? formatPlanDate(date) : '',
    transfer.pickupTime ? formatPlanTime(transfer.pickupTime) : '',
  ].filter(Boolean);
  return {
    when: pdfText(when.join(' at ')),
    route: pdfText(route),
  };
}

/**
 * Airport transfers are their own rows. Arrivals sit before day 1.
 * Departures sit after the last day. They are not mixed into sightseeing bullets.
 */
function splitAirportTransfers(
  dayCount: number,
  plan: TourQuoteTripPlan | undefined,
  transfers: TourQuoteAirportTransfer[]
): { leading: TourQuoteAirportTransfer[]; trailing: TourQuoteAirportTransfer[] } {
  const start = plan?.pickupDate ? parsePlanDate(plan.pickupDate) : null;
  const startMs = start ? startOfPlanDay(start) : null;
  const endMs = startMs == null ? null : startMs + Math.max(0, dayCount - 1) * 24 * 60 * 60 * 1000;
  const leading: TourQuoteAirportTransfer[] = [];
  const trailing: TourQuoteAirportTransfer[] = [];
  for (const transfer of transfers) {
    if (!transfer.placeName.trim()) continue;
    const transferDate = transfer.pickupDate ? parsePlanDate(transfer.pickupDate) : null;
    const whenMs = transferDate ? startOfPlanDay(transferDate) : null;
    const departs =
      transfer.direction === 'to-airport' ||
      (whenMs != null && endMs != null && startMs != null && whenMs >= endMs && whenMs > startMs);
    if (departs) trailing.push(transfer);
    else leading.push(transfer);
  }
  return { leading, trailing };
}

function durationLabel(tours: TourCartQuotationTour[], flatCount: number): { title: string; sub: string } {
  const daysFromTours = tours.reduce((sum, tour) => {
    if (Number(tour.days) > 0) return sum + Number(tour.days);
    if (tour.itinerary && tour.itinerary.length > 0) return sum + tour.itinerary.length;
    return sum + 1;
  }, 0);
  const days = Math.max(flatCount, daysFromTours, 1);
  const nights = Math.max(0, days - 1);
  const sub = tours
    .map((tour) => pdfText(tour.duration))
    .filter(Boolean)
    .join(' + ');
  return {
    title: `${days} Day${days === 1 ? '' : 's'} / ${nights} Night${nights === 1 ? '' : 's'}`,
    sub,
  };
}

function durationSubline(sub: string): string {
  if (!sub) return 'As per itinerary';
  if (sub.length <= 24) return sub;
  return 'Combined itinerary';
}

export function TourCartQuotationPDF({
  customerName,
  customerPhone,
  preparedOn,
  tours,
  selectedVehicleName,
  combinedTotal,
  additionalAirportFare = 0,
  airportTransfers = [],
  vehicleOptions,
  inclusions = defaultTourQuoteInclusions(),
  tripPlan,
  routeLabel,
  tripTypeLabel,
  packageTotal,
  adjustments,
}: TourCartQuotationPDFProps) {
  const inclusionLines = quoteInclusionLines(inclusions, adjustments);
  const selected = vehicleOptions.find((vehicle) => vehicle.name === selectedVehicleName);
  const tripKind = pdfText(tripTypeLabel || '') || `${tours.length} selected package${tours.length === 1 ? '' : 's'}`;
  const bookingKind = isBookingTripKind(tripKind);
  const flatDays = flattenDays(tours, tripPlan, tripTypeLabel, routeLabel, adjustments);
  const packageFare = Math.max(0, Number(packageTotal ?? combinedTotal) || 0);
  const carrierAmount = adjustments?.carrierIncluded
    ? Math.max(0, Number(adjustments.carrierAmount) || 0)
    : 0;
  const extraAmount = Math.max(0, Number(adjustments?.extraAmount) || 0);
  const extraLabel = pdfText(adjustments?.extraLabel || '').trim() || 'Extra';
  const discountAmount = Math.max(0, Number(adjustments?.discountAmount) || 0);
  const airportRows = splitAirportTransfers(flatDays.length, tripPlan, airportTransfers);
  const duration = durationLabel(tours, flatDays.length);
  const localQuote = isLocalTourQuote(tours, tripTypeLabel);
  const localHours = tours.length === 1 ? tourHoursLabel(tours[0]) : '';
  const durationTitle = localQuote
    ? pdfText(localHours || tripPlan?.tourDuration || '') || duration.title
    : pdfText(tripPlan?.tourDuration || '') || duration.title;
  const kmTotal = tours.reduce((sum, tour) => sum + (Number(tour.distance) || 0), 0);
  const kmLabel = tours.length === 1 && kmTotal > 0 ? `${Math.round(kmTotal)} KM` : '';
  const durationSub = tours.length > 1
    ? 'As per the route'
    : localQuote
      ? kmLabel || 'As per the route'
      : kmLabel || durationSubline(duration.sub);
  const pickupLocation = pdfText(tripPlan?.pickupLocation || '');
  const pickupDate = tripPlan?.pickupDate ? parsePlanDate(tripPlan.pickupDate) : null;
  const pickupWhen = [
    pickupDate ? formatPlanDate(pickupDate) : '',
    tripPlan?.pickupTime ? formatPlanTime(tripPlan.pickupTime) : '',
  ].filter(Boolean);
  const pickupSentence = pickupLocation
    ? `Pickup from ${pickupLocation}${pickupWhen.length ? ` on ${pickupWhen.join(' at ')}` : ''}.`
    : '';
  const tokens = tours.map((tour) => routeToken(tour.tourName));
  const ribbon = tours.map((tour) => ribbonPlace(tour.tourName));
  const routeMain = pdfText(routeLabel || '') || tokens.join(DOT) || 'As per itinerary';
  const routeValue = bookingKind ? tripKind : routeMain;
  const routeSub = bookingKind ? '' : tripKind;
  const guest = pdfText(customerName);
  const vehicle = pdfText(selectedVehicleName);
  const seatCount =
    Number(adjustments?.customSeatingCapacity) > 0
      ? Math.round(Number(adjustments?.customSeatingCapacity))
      : selected?.capacity;
  const vehicleLine = seatCount ? vehicle : `${vehicle} (AC)`;
  const vehicleSubLine = [
    seatCount ? `${seatCount} Seater · AC` : 'Private AC cab',
    adjustments?.carrierIncluded ? 'Carrier' : '',
  ]
    .filter(Boolean)
    .join(' · ');
  const dateLabel = preparedOn.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const dayCount = Math.max(flatDays.length, 1);
  const tripName = tokens.join(DOT);
  const runningRoute = tokens.join('-');
  const phone = formatPhone(customerPhone);

  const watermarkCells: Array<{ top: number; left: number }> = [];
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      watermarkCells.push({ top: 20 + row * 110, left: -40 + col * 220 });
    }
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {watermarkCells.map((cell, index) => (
          <Text
            key={index}
            fixed
            style={[styles.watermark, { top: cell.top, left: cell.left, transform: 'rotate(-30deg)' }]}
          >
            Vizag Taxi Hub
          </Text>
        ))}

        <View fixed style={styles.bottomBar}>
          <Text
            style={styles.bottomText}
            render={({ pageNumber }) =>
              `Vizag Taxi Hub${DOT}${guest}${DOT}${vehicle}${DOT}${runningRoute}${DOT}Page ${pageNumber}`
            }
          />
        </View>

        <View style={styles.headerRow}>
          <View style={styles.brandLockup}>
            <Image src={logoSrc()} style={styles.logo} />
            <Text style={styles.title}>TRIP QUOTATION</Text>
          </View>
          <Text style={styles.quoteDate}>Date: {dateLabel}</Text>
        </View>
        <View style={styles.goldRule} />

        <View style={styles.dearRow}>
          <Text style={styles.dear}>Dear {guest},</Text>
          <Text style={styles.phone}>{phone}</Text>
        </View>
        <Text style={styles.intro}>
          Thank you for choosing <Text style={styles.introBold}>Vizag Taxi Hub</Text>. Please find below the
          quotation for your <Text style={styles.introBold}>{tripKind || `${dayCount}-Day ${tripName} tour`}</Text> in a{' '}
          <Text style={styles.introBold}>
            {vehicle}
            {seatCount ? ` (${seatCount} Seater, AC)` : ' (AC)'}
          </Text>
          . {quoteInclusionSummary(inclusions)}
          {pickupSentence ? ` ${pickupSentence}` : ''} Duration: {durationTitle}.
        </Text>

        <View style={styles.stats}>
          <View style={styles.statsGold} />
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>VEHICLE</Text>
              <Text style={styles.statValue}>{vehicleLine}</Text>
              <Text style={styles.statSub}>{vehicleSubLine}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>DURATION</Text>
              <Text style={styles.statValue}>{durationTitle}</Text>
              <Text style={styles.statSub}>{durationSub}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>{bookingKind ? 'TRIP TYPE' : 'ROUTE'}</Text>
              <Text style={styles.statValue}>{routeValue}</Text>
              {routeSub ? <Text style={styles.statSub}>{routeSub}</Text> : null}
            </View>
            <View style={[styles.stat, styles.statLast]}>
              <Text style={styles.statLabel}>TOTAL FARE</Text>
              <Text style={styles.statValueFare}>{rupees(combinedTotal)}</Text>
              <Text style={styles.statSub}>
                {discountAmount > 0
                  ? `After discount ${rupees(discountAmount)}`
                  : additionalAirportFare > 0
                    ? `Includes airport transfer ${rupees(additionalAirportFare)}`
                    : 'Private cab package'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.routeBar}>
          <Text style={styles.routeText}>{routeLabel ? routeMain : ribbon.join(DOT)}</Text>
        </View>
        <View style={styles.includeBar}>
          <Text style={styles.includeText}>
            {inclusionLines.included}
            {inclusionLines.excluded ? `\n${inclusionLines.excluded}` : ''}
          </Text>
        </View>

        <View style={styles.sectionWrap}>
          <Text style={styles.sectionHead}>DAY-WISE ITINERARY</Text>
          <View style={styles.sectionRule} />
        </View>
        {airportRows.leading.map((transfer, index) => {
          const card = airportTransferCard(transfer);
          return (
            <View key={`airport-before-${index}`} style={styles.dayCard} wrap={false}>
              <View style={styles.dayHeadRow}>
                <Text style={styles.dayHeadLeft}>AIRPORT</Text>
                <View style={styles.dayHeadMain}>
                  <Text style={styles.dayHeadRight}>{card.when || 'Airport transfer'}</Text>
                </View>
              </View>
              <View style={styles.dayBody}>
                <Text style={styles.place}>{card.route}</Text>
              </View>
            </View>
          );
        })}
        {flatDays.map((day) => (
          <View key={`day-${day.day}`} style={styles.dayCard} wrap={day.activities.length > 12}>
            <View style={styles.dayHeadRow}>
              <Text style={styles.dayHeadLeft}>DAY {day.day}</Text>
              <View style={styles.dayHeadMain}>
                <Text style={styles.dayHeadRight}>{day.heading}</Text>
              </View>
            </View>
            <View style={styles.dayBody}>
              {day.section ? (
                <View style={styles.sectionItem}>
                  <View style={styles.square} />
                  <Text style={styles.sectionName}>{day.section}</Text>
                </View>
              ) : null}
              {day.activities.map((activity, index) => {
                const parts = splitActivity(activity);
                return (
                  <View key={`${day.day}-${index}`} style={styles.activityRow}>
                    <Text style={styles.dash}>–</Text>
                    <Text>
                      <Text style={styles.place}>{parts.place}</Text>
                      {parts.detail ? <Text style={styles.detail}> {parts.detail}</Text> : null}
                    </Text>
                  </View>
                );
              })}
              {day.halt ? (
                <View style={styles.sectionItem}>
                  <View style={styles.square} />
                  <Text style={styles.haltName}>Night Halt – {day.halt}</Text>
                </View>
              ) : null}
            </View>
          </View>
        ))}
        {airportRows.trailing.map((transfer, index) => {
          const card = airportTransferCard(transfer);
          return (
            <View key={`airport-after-${index}`} style={styles.dayCard} wrap={false}>
              <View style={styles.dayHeadRow}>
                <Text style={styles.dayHeadLeft}>AIRPORT</Text>
                <View style={styles.dayHeadMain}>
                  <Text style={styles.dayHeadRight}>{card.when || 'Airport transfer'}</Text>
                </View>
              </View>
              <View style={styles.dayBody}>
                <Text style={styles.place}>{card.route}</Text>
              </View>
            </View>
          );
        })}

        <View style={styles.sectionWrap} wrap={false}>
          <Text style={styles.sectionHead}>TOUR COST</Text>
          <View style={styles.sectionRule} />
          <View style={styles.costBox}>
            <Text style={styles.costKicker}>
              {dayCount}-DAY TOUR PACKAGE{DOT}
              {vehicle.toUpperCase()}
              {seatCount ? ` (${seatCount} SEATER AC)` : ' (AC)'}
            </Text>
            <Text style={styles.costAmount}>{rupees(combinedTotal)}</Text>
            {packageFare !== combinedTotal || carrierAmount > 0 || extraAmount > 0 || discountAmount > 0 ? (
              <Text style={styles.costSub}>Package {rupees(packageFare)}</Text>
            ) : null}
            {adjustments?.carrierIncluded ? (
              <Text style={styles.costSub}>
                {carrierAmount > 0 ? `Carrier + ${rupees(carrierAmount)}` : 'Carrier included'}
              </Text>
            ) : null}
            {extraAmount > 0 ? (
              <Text style={styles.costSub}>
                {extraLabel} + {rupees(extraAmount)}
              </Text>
            ) : null}
            {discountAmount > 0 ? (
              <Text style={styles.costSub}>Discount - {rupees(discountAmount)}</Text>
            ) : null}
            {additionalAirportFare > 0 ? (
              <Text style={styles.costSub}>
                Includes additional airport transfer {rupees(additionalAirportFare)}
              </Text>
            ) : null}
            <Text style={styles.costSub}>{ribbon.join(DOT)}</Text>
            <Text style={styles.costInc}>{inclusionLines.included}</Text>
          </View>
        </View>

        <View style={styles.sectionWrap}>
          <Text style={styles.sectionHead}>IMPORTANT NOTES</Text>
          <View style={styles.sectionRule} />
        </View>
        {NOTES.map((note, index) => {
          const text =
            index === 0 && inclusions.driverAllowance
              ? "Driver's allowance, including food, is included in the above cost."
              : note;
          return (
          <View
            key={note}
            style={[styles.noteRow, { backgroundColor: index % 2 === 0 ? CREAM : CREAM_ALT }]}
            wrap={false}
          >
            <Text style={styles.noteNum}>{index + 1}</Text>
            <Text style={styles.noteText}>{text}</Text>
          </View>
          );
        })}

        <View style={[styles.sectionWrap, styles.sectionWrapSpaced]}>
          <Text style={styles.sectionHead}>TERMS AND CONDITIONS</Text>
          <View style={styles.sectionRule} />
        </View>
        {TERMS.map((term, index) => (
          <View
            key={term}
            style={[styles.noteRow, { backgroundColor: index % 2 === 0 ? CREAM : CREAM_ALT }]}
            wrap={false}
          >
            <Text style={styles.noteNum}>{index + 1}</Text>
            <Text style={styles.noteText}>{term}</Text>
          </View>
        ))}

        <View style={styles.closeRow} wrap={false}>
          <View style={styles.closeLeft}>
            <Text style={styles.brand}>Vizag Taxi Hub</Text>
            <Text style={styles.closeMeta}>+91 99663 63662{DOT}www.vizagtaxihub.com</Text>
            <Text style={styles.closeMeta}>
              44-66-22/4, Near Singalamma Temple,{'\n'}Kailasapuram, Visakhapatnam – 530024
            </Text>
          </View>
          <View style={styles.closeRight}>
            <Text style={styles.closeInvite}>We look forward to your confirmation.</Text>
            <Text style={styles.closeHint}>Please reply or WhatsApp to confirm your booking.</Text>
            <Text style={styles.ctaTitle}>Confirm Your Booking</Text>
            <Text style={styles.ctaSub}>Call / WhatsApp to confirm</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
