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

export function quoteInclusionLines(
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
  /**
   * Inclusive pickup-through-return dates for a timed trip.
   * The duration label can be "12 Hours" while the day plan still covers each calendar date.
   */
  calendarDays?: number;
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

export type TourQuoteRailwayTransfer = {
  direction: 'from-station' | 'to-station';
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
  /** Extra railway-station transfer fare already included in combinedTotal. */
  additionalRailwayFare?: number;
  railwayTransfers?: TourQuoteRailwayTransfer[];
  vehicleOptions: TourCartQuotationVehicle[];
  inclusions?: TourQuoteInclusions;
  tripPlan?: TourQuoteTripPlan;
  routeLabel?: string;
  tripTypeLabel?: string;
  /** Original package fare before extras and discount. */
  packageTotal?: number;
  adjustments?: TourQuoteAdjustments;
};
