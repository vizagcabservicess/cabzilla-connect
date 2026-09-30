import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Car,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  Hotel,
  IndianRupee,
  Loader2,
  LocateFixed,
  MapPin,
  Plus,
  Search,
  Share2,
  Trash2,
  User,
  Users,
  X,
} from 'lucide-react';
import { saveAs } from 'file-saver';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { resolveSmartBudgetMediaUrl } from '@/lib/smartBudgetUpload';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  WhatsAppCountryPhoneRow,
  defaultWhatsappCountry,
} from '@/components/WhatsAppCountryPhoneRow';
import { useToast } from '@/hooks/use-toast';
import { DateTimePicker, type DateTimePickerHandle } from '@/components/DateTimePicker';
import { LocationInput } from '@/components/LocationInput';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useGoogleMaps } from '@/providers/GoogleMapsProvider';
import { generateTourCartQuotationPdf } from '@/lib/generateTourCartQuotationPdf';
import type { CountryCode } from '@/lib/countryCodes';
import type { Location } from '@/lib/locationData';
import { getVizagAirportLocations } from '@/lib/locationData';
import { isWithinTourPickupRadius } from '@/lib/locationUtils';
import { tourDetailAPI } from '@/services/api/tourDetailAPI';
import { airportHotelName, clampToLeadTime, clampTripAfterFromAirports, daysCoveringTourAndAirports, earliestPickupInstant, earliestToAirportWhen, formatTourDurationLabel, latestFromAirportWhen, minTourStartInstant, tourIsoDateOnly } from '@/lib/tourScheduleTimes';
import {
  flattenTourItineraryPlaces,
  moveListItem,
  normalizeQuoteItinerary,
  padPlacesByDay,
} from '@/lib/tourQuoteItinerary';
import { cn } from '@/lib/utils';
import {
  defaultTourQuoteAdjustments,
  defaultTourQuoteInclusions,
  GST_INVOICE_NOTE,
  quoteInclusionSummary,
  quotePayableTotal,
  type TourCartQuotationPDFProps,
  type TourQuoteAdjustments,
  type TourQuoteInclusions,
  type TourQuoteTripPlan,
} from '@/components/pdf/TourCartQuotationPDF';

const QUOTE_EXTRA_OPTIONS: Array<{ key: keyof TourQuoteInclusions; label: string }> = [
  { key: 'parking', label: 'Parking fees' },
  { key: 'tolls', label: 'Tolls' },
  { key: 'driverAllowance', label: "Driver's allowance" },
  { key: 'permits', label: 'Permits' },
  { key: 'entryFees', label: 'Entry fees' },
  { key: 'hotels', label: 'Hotels' },
];

type QuoteWizardStep = 1 | 2 | 3;

const quoteFieldClass = 'h-11 rounded-xl bg-white text-base md:text-[13px]';
const quoteAmountClass = 'h-9 w-24 rounded-xl bg-white text-base md:text-[13px]';

const QUOTE_STEPS: Array<{ id: QuoteWizardStep; label: string }> = [
  { id: 1, label: 'Customer' },
  { id: 2, label: 'Trip Details' },
  { id: 3, label: 'Fare & Extras' },
];

function QuoteStepBar({ step }: { step: QuoteWizardStep }) {
  const progress = step === 1 ? '0%' : step === 2 ? '50%' : '100%';
  return (
    <div className="px-5 pb-3 pt-1">
      <div className="relative grid grid-cols-3 overflow-hidden">
        <div className="absolute left-[calc(16.666%-0.75rem)] right-[calc(16.666%-0.75rem)] top-3 h-px overflow-hidden bg-slate-200">
          <div className="h-full bg-blue-600" style={{ width: progress }} />
        </div>
        {QUOTE_STEPS.map((item) => {
          const done = step > item.id;
          const current = step === item.id;
          return (
            <div key={item.id} className="relative z-10 flex flex-col items-center gap-1.5">
              <span
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                  done || current
                    ? 'bg-blue-600 text-white'
                    : 'border border-slate-300 bg-white text-slate-400'
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : item.id}
              </span>
              <span
                className={cn(
                  'text-center text-[10px] font-semibold leading-tight',
                  current || done ? 'text-slate-800' : 'text-slate-400'
                )}
              >
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type TourCartQuotationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: Omit<TourCartQuotationPDFProps, 'customerName' | 'customerPhone' | 'preparedOn'>;
  onTripPlanChange: (plan: TourQuoteTripPlan) => void;
  requireTourPickupRadius?: boolean;
};

export function suggestedTourDuration(
  tours: Array<{ days?: number; timeDuration?: string; duration?: string }>
): string {
  const days = tours.reduce((sum, tour) => {
    if (Number(tour.days) > 0) return sum + Number(tour.days);
    return sum + 1;
  }, 0);
  if (days <= 1) {
    const hours = tours
      .map((tour) => String(tour.timeDuration || tour.duration || '').trim())
      .filter(Boolean);
    return hours[0] || '1 Day';
  }
  const nights = Math.max(0, days - 1);
  return `${days} Days / ${nights} Night${nights === 1 ? '' : 's'}`;
}

export function quoteNightCount(
  duration: string,
  tours: Array<{ days?: number }> = []
): number {
  const nightsWord = /(\d+)\s*nights?/i.exec(duration);
  if (nightsWord) return Math.max(0, Number(nightsWord[1]));
  const daysWord = /(\d+)\s*days?/i.exec(duration);
  if (daysWord) return Math.max(0, Number(daysWord[1]) - 1);
  const compact = /(\d+)\s*d\b/i.exec(duration);
  if (compact) return Math.max(0, Number(compact[1]) - 1);
  const fromTours = tours.reduce((sum, tour) => sum + (Number(tour.days) > 0 ? Number(tour.days) : 1), 0);
  return fromTours > 1 ? fromTours - 1 : 0;
}

export function quoteDayCount(
  duration: string,
  tours: Array<{ days?: number }> = []
): number {
  const daysWord = /(\d+)\s*days?/i.exec(duration);
  if (daysWord) return Math.max(1, Number(daysWord[1]));
  const compact = /(\d+)\s*d\b/i.exec(duration);
  if (compact) return Math.max(1, Number(compact[1]));
  const nights = quoteNightCount(duration, tours);
  if (nights > 0) return nights + 1;
  const fromTours = tours.reduce((sum, tour) => sum + (Number(tour.days) > 0 ? Number(tour.days) : 1), 0);
  return Math.max(1, fromTours || 1);
}

function resolvedTripPlan(
  quote: TourCartQuotationDialogProps['quote']
): TourQuoteTripPlan {
  return {
    ...quote.tripPlan,
    pickupLocation: quote.tripPlan?.pickupLocation?.trim() || '',
    pickupDate: quote.tripPlan?.pickupDate || '',
    pickupTime: quote.tripPlan?.pickupTime || '',
    tourDuration: quote.tripPlan?.tourDuration?.trim() || suggestedTourDuration(quote.tours),
  };
}

function dateFromPlan(plan: TourQuoteTripPlan): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(plan.pickupDate)) return undefined;
  const [year, month, day] = plan.pickupDate.split('-').map(Number);
  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(plan.pickupTime);
  const hours = timeMatch ? Number(timeMatch[1]) : 0;
  const minutes = timeMatch ? Number(timeMatch[2]) : 0;
  const date = new Date(year, month - 1, day, hours, minutes, 0, 0);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function fieldsFromDate(date: Date | undefined): Pick<TourQuoteTripPlan, 'pickupDate' | 'pickupTime'> {
  if (!date || Number.isNaN(date.getTime())) return { pickupDate: '', pickupTime: '' };
  return {
    pickupDate: [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-'),
    pickupTime: `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`,
  };
}

function rememberPickup(location: Location | null) {
  try {
    if (!location) sessionStorage.removeItem('pickupLocation');
    else sessionStorage.setItem('pickupLocation', JSON.stringify(location));
  } catch {
    /* ignore */
  }
}

function rememberPickupDate(date: Date | undefined) {
  if (!date) return;
  try {
    sessionStorage.setItem('pickupDate', JSON.stringify(date));
  } catch {
    /* ignore */
  }
}

function formatTripWhen(plan: TourQuoteTripPlan): string {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(plan.pickupDate)
    ? new Date(
        Number(plan.pickupDate.slice(0, 4)),
        Number(plan.pickupDate.slice(5, 7)) - 1,
        Number(plan.pickupDate.slice(8, 10))
      ).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';
  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(plan.pickupTime);
  let time = plan.pickupTime;
  if (timeMatch) {
    const hours = Number(timeMatch[1]);
    const suffix = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    time = `${hour12}:${timeMatch[2]} ${suffix}`;
  }
  return [date, time].filter(Boolean).join(' at ');
}

function parseQuoteRupees(raw: string): number {
  const amount = Number(String(raw).replace(/[^\d.]/g, ''));
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function allowsQuoteCustomSeating(vehicleName: string): boolean {
  return /urbania|tempo\s*traveller/i.test(vehicleName);
}

function parseQuoteSeats(raw: string): number {
  const seats = Number.parseInt(String(raw).replace(/[^\d]/g, ''), 10);
  return Number.isFinite(seats) && seats >= 1 && seats <= 99 ? seats : 0;
}

function buildWhatsAppText(
  customerName: string,
  quote: TourCartQuotationDialogProps['quote'],
  totalLabel: string,
  adjustments: TourQuoteAdjustments,
  packageTotal: number
): string {
  const tourLines = quote.tours
    .map(
      (tour) =>
        `• ${tour.tourName}${tour.duration ? ` (${tour.duration})` : ''} — Rs ${tour.price.toLocaleString('en-IN')}`
    )
    .join('\n');
  const carrierAmount = adjustments.carrierIncluded
    ? Math.max(0, Number(adjustments.carrierAmount) || 0)
    : 0;
  const extraAmount = Math.max(0, Number(adjustments.extraAmount) || 0);
  const discountAmount = Math.max(0, Number(adjustments.discountAmount) || 0);
  const extraLabel = adjustments.extraLabel?.trim() || 'Extra';
  return [
    `Vizag Taxi Hub quotation for ${customerName}`,
    '',
    tourLines,
    '',
    `Vehicle: ${quote.selectedVehicleName}${
      Number(adjustments.customSeatingCapacity) > 0
        ? ` (${Math.round(Number(adjustments.customSeatingCapacity))} Seater)`
        : ''
    }${adjustments.carrierIncluded ? ' + carrier' : ''}`,
    `Package total: Rs ${packageTotal.toLocaleString('en-IN')}`,
    adjustments.carrierIncluded
      ? carrierAmount > 0
        ? `Carrier: + Rs ${Math.round(carrierAmount).toLocaleString('en-IN')}`
        : 'Carrier: included'
      : null,
    extraAmount > 0
      ? `${extraLabel}: + Rs ${Math.round(extraAmount).toLocaleString('en-IN')}`
      : null,
    discountAmount > 0
      ? `Discount: - Rs ${Math.round(discountAmount).toLocaleString('en-IN')}`
      : null,
    `Payable total: ${totalLabel}`,
    '',
    quoteInclusionSummary(quote.inclusions ?? defaultTourQuoteInclusions()),
    `Pickup: ${quote.tripPlan?.pickupLocation || 'To be confirmed'}`,
    adjustments.lastDropLocation?.trim()
      ? `Last drop: ${adjustments.lastDropLocation.trim()}`
      : null,
    ...(adjustments.nightStays || [])
      .map((stay, index) => (stay.trim() ? `Night ${index + 1} stay: ${stay.trim()}` : null))
      .filter(Boolean),
    !(adjustments.nightStays || []).some((stay) => stay.trim()) && adjustments.hotelName?.trim()
      ? `Hotel: ${adjustments.hotelName.trim()}`
      : null,
    adjustments.quoteNotes?.trim() ? `Notes: ${adjustments.quoteNotes.trim()}` : null,
    `Date and time: ${quote.tripPlan ? formatTripWhen(quote.tripPlan) : 'To be confirmed'}`,
    ...(quote.airportTransfers || [])
      .filter((transfer) => transfer.placeName)
      .map((transfer) => {
        const airport = 'Alluri Sitarama Raju International Airport';
        const route =
          transfer.direction === 'from-airport'
            ? `From ${airport} to ${transfer.placeName}`
            : `From ${transfer.placeName} to ${airport}`;
        const when = formatTripWhen({
          pickupLocation: '',
          pickupDate: transfer.pickupDate,
          pickupTime: transfer.pickupTime,
          tourDuration: '',
        });
        return `Airport transfer: ${route}${when ? ` on ${when}` : ''}`;
      }),
    `Tour duration: ${quote.tripPlan?.tourDuration || suggestedTourDuration(quote.tours)}`,
    'Book: +91 9966363662 | www.vizagtaxihub.com',
  ]
    .filter((line): line is string => line !== null)
    .join('\n');
}

function planFieldLabel(icon: typeof MapPin, text: string) {
  const Icon = icon;
  return (
    <p className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-slate-800">
      <Icon className="h-3.5 w-3.5 text-slate-500" />
      {text}
    </p>
  );
}

const PLAN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatPlanDateBox(date: Date | undefined): string {
  if (!date) return 'Select date';
  return `${date.getDate()} ${PLAN_MONTHS[date.getMonth()]}, ${date.getFullYear()}`;
}

function formatPlanTimeBox(date: Date | undefined): string {
  if (!date) return 'Select time';
  const hours = date.getHours();
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${String(date.getMinutes()).padStart(2, '0')} ${suffix}`;
}

export function TripPlanFields({
  plan,
  onChange,
  idPrefix,
  embedded = false,
  durationOptions = [],
  menuFields = false,
  minDate,
}: {
  plan: TourQuoteTripPlan;
  onChange: (plan: TourQuoteTripPlan) => void;
  idPrefix: string;
  embedded?: boolean;
  durationOptions?: string[];
  /** Date and time look like dropdowns (quotation dialog). */
  menuFields?: boolean;
  minDate?: Date;
}) {
  const set = (patch: Partial<TourQuoteTripPlan>) => onChange({ ...plan, ...patch });
  const pickupPlace = plan.pickupPlace?.id
    ? plan.pickupPlace
    : plan.pickupLocation.trim()
      ? {
          id: `named-pickup:${plan.pickupLocation.trim()}`,
          name: plan.pickupLocation.trim(),
          address: plan.pickupLocation.trim(),
          lat: 17.6868,
          lng: 83.2185,
          city: 'Visakhapatnam',
          state: 'Andhra Pradesh',
          type: 'hotel' as const,
          popularityScore: 50,
        }
      : undefined;
  const travelDate = dateFromPlan(plan);
  const pickupOk = !pickupPlace || isWithinTourPickupRadius(pickupPlace);
  const pickerRef = useRef<DateTimePickerHandle>(null);
  const { toast } = useToast();
  const { isLoaded, google } = useGoogleMaps();
  const [locating, setLocating] = useState(false);

  const applyLocation = (location: Location | null | undefined) => {
    if (!location?.id) {
      rememberPickup(null);
      set({ pickupLocation: '', pickupPlace: undefined });
      return;
    }
    rememberPickup(location);
    set({ pickupLocation: location.name, pickupPlace: location });
  };

  const applyDate = (date: Date | undefined) => {
    const fields = fieldsFromDate(date);
    let clamped = fields.pickupDate ? clampToLeadTime(fields) : fields;
    if (minDate && clamped.pickupDate) {
      const at = dateFromPlan({ ...plan, ...clamped });
      if (at && at.getTime() < minDate.getTime()) {
        clamped = clampToLeadTime({
          pickupDate: [
            minDate.getFullYear(),
            String(minDate.getMonth() + 1).padStart(2, '0'),
            String(minDate.getDate()).padStart(2, '0'),
          ].join('-'),
          pickupTime: `${String(minDate.getHours()).padStart(2, '0')}:${String(minDate.getMinutes()).padStart(2, '0')}`,
        });
        toast({
          title: 'Pickup time updated',
          description: 'Tour pickup must be at least 2 hours after the airport pickup.',
        });
      }
    }
    rememberPickupDate(dateFromPlan({ ...plan, ...clamped }));
    if (
      fields.pickupDate &&
      (clamped.pickupDate !== fields.pickupDate || clamped.pickupTime !== fields.pickupTime) &&
      !(minDate && date && date.getTime() < minDate.getTime())
    ) {
      toast({
        title: 'Pickup time updated',
        description: 'Trip time must be at least 1.5 hours from now.',
      });
    }
    set(clamped);
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: 'Location unavailable',
        description: 'Your browser does not support current location.',
        variant: 'destructive',
      });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const finish = (name: string, address: string) => {
          applyLocation({
            id: `geo_${lat}_${lng}`,
            name,
            address,
            lat,
            lng,
            city: 'Visakhapatnam',
            state: 'Andhra Pradesh',
            type: 'other',
            popularityScore: 50,
          });
          setLocating(false);
        };
        if (!isLoaded || !google?.maps?.Geocoder) {
          finish('Current location', 'Current location');
          return;
        }
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          if (status === 'OK' && results?.[0]) {
            finish(results[0].formatted_address, results[0].formatted_address);
            return;
          }
          finish('Current location', 'Current location');
        });
      },
      () => {
        setLocating(false);
        toast({
          title: 'Could not read location',
          description: 'Please allow location access or search for a pickup point.',
          variant: 'destructive',
        });
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  const durationChoices = Array.from(
    new Set([plan.tourDuration.trim(), ...durationOptions.map((option) => option.trim())].filter(Boolean))
  );

  return (
      <div className="space-y-3.5 pt-1">
        <div>
          {planFieldLabel(MapPin, 'Pickup location')}
          <div className="flex items-stretch gap-2">
            <div
              className={cn(
                'relative min-w-0 flex-1 rounded-xl border border-slate-200 pl-8 pr-2',
                menuFields ? 'bg-white' : 'bg-slate-50'
              )}
            >
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <LocationInput
                id={`${idPrefix}-pickup`}
                label=""
                placeholder="Search pickup location"
                location={pickupPlace}
                onLocationChange={applyLocation}
                isPickupLocation
                tripType="tour"
                variant="infield"
                compact
                hideLeadingIcon
                hideClearButton
                className="w-full min-w-0 [&>p]:hidden [&_.ios-search-input-wrapper]:min-h-10 [&_.ios-search-input-wrapper]:items-center [&_.ios-search-input-wrapper]:py-0"
              />
            </div>
            {menuFields ? null : (
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={locating}
                className="inline-flex w-[6.5rem] shrink-0 flex-col items-center justify-center gap-0.5 self-stretch rounded-xl border border-slate-200 bg-white px-1.5 text-[10px] font-semibold leading-tight text-blue-600 hover:bg-blue-50 disabled:opacity-60"
              >
                {locating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LocateFixed className="h-4 w-4" />
                )}
                Use my location
              </button>
            )}
          </div>
          <p
            className={cn(
              'mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold',
              pickupOk ? 'text-emerald-600' : 'text-rose-600'
            )}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Pickup must be within 20 km of Vizag Taxi Hub.
          </p>
        </div>

        <div>
          {planFieldLabel(Calendar, 'Travel date & time')}
          <div className="relative grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => pickerRef.current?.open()}
              className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 text-left"
            >
              {menuFields ? <Calendar className="h-4 w-4 shrink-0 text-slate-500" /> : null}
              <span
                className={cn(
                  'min-w-0 flex-1 truncate text-[13px] font-medium',
                  travelDate ? 'text-slate-900' : 'text-slate-400'
                )}
              >
                {formatPlanDateBox(travelDate)}
              </span>
              {menuFields ? (
                <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
              ) : (
                <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
              )}
            </button>
            <button
              type="button"
              onClick={() => pickerRef.current?.open()}
              className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 text-left"
            >
              {menuFields ? <Clock className="h-4 w-4 shrink-0 text-slate-500" /> : null}
              <span
                className={cn(
                  'min-w-0 flex-1 truncate text-[13px] font-medium',
                  travelDate ? 'text-slate-900' : 'text-slate-400'
                )}
              >
                {formatPlanTimeBox(travelDate)}
              </span>
              {menuFields ? (
                <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
              ) : (
                <Clock className="h-4 w-4 shrink-0 text-slate-400" />
              )}
            </button>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-11 overflow-hidden opacity-0">
              <DateTimePicker
                ref={pickerRef}
                label="Travel date & time"
                date={travelDate}
                onDateChange={applyDate}
                minDate={minDate && minDate.getTime() > earliestPickupInstant().getTime() ? minDate : earliestPickupInstant()}
                variant="infield"
              />
            </div>
          </div>
        </div>

        <div>
          {planFieldLabel(Clock, 'Tour duration')}
          {durationChoices.length > 0 ? (
            <Select value={plan.tourDuration} onValueChange={(value) => set({ tourDuration: value })}>
              <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white text-base font-medium text-slate-900 shadow-none focus:ring-1 focus:ring-blue-500/30 md:text-[13px]">
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent className="z-[10080]">
                {durationChoices.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id={`${idPrefix}-duration`}
              value={plan.tourDuration}
              onChange={(event) => set({ tourDuration: event.target.value })}
              placeholder="2 Days / 1 Night"
              className={quoteFieldClass}
            />
          )}
        </div>
      </div>
  );
}

export type TripScheduleLine = {
  day: number;
  when: string;
  title: string;
  note: string;
};

function scheduleBlurb(raw: string | undefined): string {
  const text = String(raw || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return '';
  const sentence = text.match(/^[^.!?]+[.!?]?/)?.[0]?.trim() || text;
  if (sentence.length <= 110) return sentence;
  return `${sentence.slice(0, 107).trim()}...`;
}

function scheduleDayDate(start: Date, offset: number): Date {
  return new Date(start.getFullYear(), start.getMonth(), start.getDate() + offset);
}

function scheduleWhenLabel(date: Date): string {
  return `${date.toLocaleDateString('en-GB', { weekday: 'short' })}, ${date.getDate()} ${date.toLocaleDateString('en-GB', { month: 'short' })}`;
}

function planDayIso(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function planDateFromIso(iso: string): Date | null {
  const day = tourIsoDateOnly(iso);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  return new Date(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10)));
}

export function buildTripSchedule(
  tours: Array<{ tourName: string; days?: number; timeDuration?: string; description?: string }>,
  plan: TourQuoteTripPlan,
  transfers: Array<{ direction?: string; pickupDate?: string; pickupTime?: string; placeName?: string }> = []
): TripScheduleLine[] {
  const fromAirport = latestFromAirportWhen(transfers);
  const toAirport = earliestToAirportWhen(transfers);
  const pickupStart = planDateFromIso(plan.pickupDate);
  const fromDay = fromAirport ? planDateFromIso(fromAirport.pickupDate) : null;
  const start =
    fromDay && pickupStart && fromDay.getTime() < pickupStart.getTime() ? fromDay : pickupStart || fromDay;
  const hotel = airportHotelName(transfers);
  const lines: TripScheduleLine[] = [];
  let dayNumber = 1;
  for (const tour of tours) {
    const count = Number(tour.days) > 0 ? Number(tour.days) : 1;
    const blurb = scheduleBlurb(tour.description) || String(tour.timeDuration || '').trim();
    for (let index = 0; index < count; index += 1) {
      const date = start ? scheduleDayDate(start, dayNumber - 1) : null;
      const iso = date ? planDayIso(date) : '';
      const isReturnDay = count > 1 && index === count - 1;
      const notes: string[] = [];
      if (fromAirport && iso === fromAirport.pickupDate) {
        notes.push(hotel ? `Airport pickup to ${hotel}` : 'Airport pickup');
      }
      if (toAirport && iso === toAirport.pickupDate) {
        notes.push(hotel ? `Drop at airport from ${hotel}` : 'Transfer to airport');
      }
      if (!isReturnDay && index === 0 && blurb) notes.push(blurb);
      if (isReturnDay) notes.push('Continue sightseeing & return');
      lines.push({
        day: dayNumber,
        when: date ? scheduleWhenLabel(date) : '',
        title: isReturnDay ? '' : tour.tourName,
        note: notes.join(' · '),
      });
      dayNumber += 1;
    }
  }
  return lines;
}

function isOutsideTripSheet(target: EventTarget | null): boolean {
  const node = target instanceof Element ? target : target instanceof Node ? target.parentElement : null;
  return Boolean(node?.closest('.location-search-sheet, .pac-container, .datetime-picker-sheet'));
}

export function TourCartQuotationDialog({
  open,
  onOpenChange,
  quote,
  onTripPlanChange,
  requireTourPickupRadius = true,
}: TourCartQuotationDialogProps) {
  const { toast } = useToast();
  const [customerName, setCustomerName] = useState('');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [country, setCountry] = useState<CountryCode>(() => defaultWhatsappCountry());
  const [step, setStep] = useState<QuoteWizardStep>(1);
  const [busy, setBusy] = useState<'download' | 'share' | null>(null);
  const [inclusions, setInclusions] = useState<TourQuoteInclusions>(() => defaultTourQuoteInclusions());
  const [lastDropPlace, setLastDropPlace] = useState<Location | undefined>();
  const airportLocations = getVizagAirportLocations();

  useEffect(() => {
    if (!open) return;
    const fromAirport = (quote.airportTransfers || []).find(
      (transfer) => transfer.direction === 'from-airport' && (transfer.place || transfer.placeName)
    );
    const toAirport = (quote.airportTransfers || []).find((transfer) => transfer.direction === 'to-airport');
    if (fromAirport && onTripPlanChange) {
      const plan = resolvedTripPlan(quote);
      const hotelName = fromAirport.placeName || fromAirport.place?.name || '';
      const nextPlace = fromAirport.place;
      const clamped = clampTripAfterFromAirports(plan, quote.airportTransfers || []);
      if (
        hotelName && (plan.pickupLocation !== hotelName || (!plan.pickupPlace?.id && nextPlace?.id))
        || clamped.pickupDate !== plan.pickupDate
        || clamped.pickupTime !== plan.pickupTime
      ) {
        onTripPlanChange({
          ...plan,
          pickupDate: clamped.pickupDate || plan.pickupDate,
          pickupTime: clamped.pickupTime || plan.pickupTime,
          pickupLocation: hotelName || plan.pickupLocation,
          pickupPlace: nextPlace || plan.pickupPlace,
        });
      }
    }
    if (toAirport) {
      const airport =
        airportLocations.find((location) => location.id === 'vizag_airport') ?? airportLocations[0];
      setLastDropPlace((current) => {
        if (current && /airport/i.test(current.name || current.address || '')) return current;
        return airport;
      });
    }
  }, [open, onTripPlanChange, quote.airportTransfers]);
  const [nightStays, setNightStays] = useState<string[]>([]);
  const [extraPlacesByDay, setExtraPlacesByDay] = useState<string[][]>([]);
  const [itinerarySeed, setItinerarySeed] = useState<string[][]>([]);
  const [itineraryOpen, setItineraryOpen] = useState<string[]>(['day-0']);
  const [quoteNotes, setQuoteNotes] = useState('');
  const [carrierIncluded, setCarrierIncluded] = useState(false);
  const [carrierAmount, setCarrierAmount] = useState('');
  const [extraLabel, setExtraLabel] = useState('');
  const [extraAmount, setExtraAmount] = useState('');
  const [discountAmount, setDiscountAmount] = useState('');
  const [customSeats, setCustomSeats] = useState('');
  const quoteAllowsCustomSeating = allowsQuoteCustomSeating(quote.selectedVehicleName);
  const adjustments = useMemo<TourQuoteAdjustments>(() => {
    const next = defaultTourQuoteAdjustments();
    next.lastDropLocation = lastDropPlace?.name?.trim() || '';
    next.nightStays = nightStays.map((stay) => stay.trim());
    next.extraPlacesByDay = extraPlacesByDay.map((places) =>
      places.map((place) => place.trim()).filter(Boolean)
    );
    next.quoteNotes = quoteNotes.trim();
    next.carrierIncluded = carrierIncluded;
    next.carrierAmount = carrierIncluded ? parseQuoteRupees(carrierAmount) : 0;
    next.extraLabel = extraLabel.trim();
    next.extraAmount = parseQuoteRupees(extraAmount);
    next.discountAmount = parseQuoteRupees(discountAmount);
    next.customSeatingCapacity = quoteAllowsCustomSeating ? parseQuoteSeats(customSeats) : 0;
    return next;
  }, [
    carrierAmount,
    carrierIncluded,
    customSeats,
    discountAmount,
    extraAmount,
    extraLabel,
    extraPlacesByDay,
    lastDropPlace,
    nightStays,
    quoteAllowsCustomSeating,
    quoteNotes,
  ]);
  const stayNightCount = quoteNightCount(resolvedTripPlan(quote).tourDuration, quote.tours);
  const extraDayCount = quoteDayCount(resolvedTripPlan(quote).tourDuration, quote.tours);

  useEffect(() => {
    setNightStays((current) => {
      if (stayNightCount <= 0) return current.length === 0 ? current : [];
      const next = Array.from({ length: stayNightCount }, (_, index) => current[index] || '');
      if (next.length === current.length && next.every((value, index) => value === current[index])) {
        return current;
      }
      return next;
    });
  }, [stayNightCount]);

  const quoteTourKey = quote.tours.map((tour) => tour.tourId || tour.tourName).join('|');

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void Promise.all(
      quote.tours.map(async (tour) => {
        if (tour.itinerary && tour.itinerary.length > 0) return tour;
        if (!tour.tourId) return tour;
        try {
          const detail = await tourDetailAPI.getTourDetail(tour.tourId);
          return { ...tour, itinerary: normalizeQuoteItinerary(detail?.itinerary) };
        } catch {
          return tour;
        }
      })
    ).then((tours) => {
      if (!cancelled) setItinerarySeed(flattenTourItineraryPlaces(tours));
    });
    return () => {
      cancelled = true;
    };
  }, [open, quoteTourKey, quote.tours]);

  useEffect(() => {
    setExtraPlacesByDay((current) => padPlacesByDay(current, extraDayCount, itinerarySeed));
  }, [extraDayCount, itinerarySeed]);

  const itineraryDays = useMemo(() => {
    const plan = resolvedTripPlan(quote);
    const transfers = quote.airportTransfers || [];
    const lines = buildTripSchedule(quote.tours, plan, transfers);
    const fromAirport = latestFromAirportWhen(transfers);
    const toAirport = earliestToAirportWhen(transfers);
    const hotel = airportHotelName(transfers);
    const origin =
      (fromAirport ? planDateFromIso(fromAirport.pickupDate) : null) || planDateFromIso(plan.pickupDate);
    return Array.from({ length: extraDayCount }, (_, index) => {
      const line = lines[index];
      if (line) return line;
      const start = origin ? scheduleDayDate(origin, index) : null;
      const iso = start ? planDayIso(start) : '';
      const isToAirport = Boolean(toAirport && iso === toAirport.pickupDate);
      const isFromAirport = Boolean(fromAirport && iso === fromAirport.pickupDate);
      return {
        day: index + 1,
        when: start ? scheduleWhenLabel(start) : '',
        title: isToAirport ? 'Airport drop' : isFromAirport ? 'Airport pickup' : '',
        note: isToAirport
          ? hotel
            ? `From ${hotel} to airport`
            : 'Transfer to airport'
          : isFromAirport
            ? hotel
              ? `Airport to ${hotel}`
              : 'Airport pickup'
            : '',
      };
    });
  }, [extraDayCount, quote]);

  const packageTotal = quote.combinedTotal;
  const payableTotal = quotePayableTotal(packageTotal, adjustments);
  const durationOptions = useMemo(() => {
    const values = new Set<string>();
    const suggested = suggestedTourDuration(quote.tours);
    if (suggested) values.add(suggested);
    const packageDays = quoteDayCount(suggested, quote.tours);
    const spanDays = daysCoveringTourAndAirports(
      quote.tripPlan?.pickupDate || '',
      packageDays,
      (quote.airportTransfers || []).map((transfer) => transfer.pickupDate)
    );
    if (spanDays > packageDays) values.add(formatTourDurationLabel(spanDays));
    for (const tour of quote.tours) {
      const own = suggestedTourDuration([tour]);
      if (own) values.add(own);
      const raw = String(tour.timeDuration || tour.duration || '').trim();
      if (raw) values.add(raw);
    }
    return [...values];
  }, [quote.airportTransfers, quote.tours, quote.tripPlan?.pickupDate]);
  const selectedFare =
    quote.vehicleOptions.find((vehicle) => vehicle.name === quote.selectedVehicleName) ||
    quote.vehicleOptions[0];
  const quoteSeatCount =
    quoteAllowsCustomSeating && Number(adjustments.customSeatingCapacity) > 0
      ? Math.round(Number(adjustments.customSeatingCapacity))
      : selectedFare?.capacity && selectedFare.capacity > 0
        ? selectedFare.capacity
        : 0;
  const seatText = quoteSeatCount > 0 ? `${quoteSeatCount}+1 Seater` : '';
  const vehicleImage = selectedFare?.image ? resolveSmartBudgetMediaUrl(selectedFare.image) : '';

  const reset = () => {
    setCustomerName('');
    setPhoneDigits('');
    setCountry(defaultWhatsappCountry());
    setInclusions(defaultTourQuoteInclusions());
    setLastDropPlace(undefined);
    setNightStays([]);
    setExtraPlacesByDay([]);
    setItinerarySeed([]);
    setItineraryOpen(['day-0']);
    setQuoteNotes('');
    setCarrierIncluded(false);
    setCarrierAmount('');
    setExtraLabel('');
    setExtraAmount('');
    setDiscountAmount('');
    setCustomSeats('');
    setStep(1);
    setBusy(null);
  };

  const validateCustomer = (): { name: string; phone: string } | null => {
    const name = customerName.trim();
    if (name.length < 2) {
      toast({
        title: 'Customer name required',
        description: 'Enter the guest name for this quotation.',
        variant: 'destructive',
      });
      return null;
    }
    if (phoneDigits.length !== country.maxLength) {
      toast({
        title: 'Invalid number',
        description: `Enter a valid ${country.maxLength}-digit WhatsApp number for ${country.name}.`,
        variant: 'destructive',
      });
      return null;
    }
    return { name, phone: `${country.dialCode}${phoneDigits}` };
  };

  const validateTrip = (): boolean => {
    const plan = resolvedTripPlan(quote);
    if (requireTourPickupRadius && (!plan.pickupPlace?.id || !isWithinTourPickupRadius(plan.pickupPlace))) {
      toast({
        title: 'Pickup location required',
        description: 'Select a pickup within 20 km of Vizag Taxi Hub.',
        variant: 'destructive',
      });
      return false;
    }
    if (!requireTourPickupRadius && !plan.pickupLocation.trim()) {
      toast({
        title: 'Pickup location required',
        description: 'Choose a pickup location for this quotation.',
        variant: 'destructive',
      });
      return false;
    }
    if (!plan.pickupDate) {
      toast({
        title: 'Pickup date required',
        description: 'Choose the date the itinerary should start.',
        variant: 'destructive',
      });
      return false;
    }
    if (!plan.pickupTime) {
      toast({
        title: 'Pickup time required',
        description: 'Choose the time Day 1 should start.',
        variant: 'destructive',
      });
      return false;
    }
    return true;
  };

  const validate = (): { name: string; phone: string } | null => {
    const guest = validateCustomer();
    if (!guest) {
      setStep(1);
      return null;
    }
    if (!validateTrip()) {
      setStep(2);
      return null;
    }
    return guest;
  };

  const goNext = () => {
    if (step === 1) {
      if (!validateCustomer()) return;
      setStep(2);
      return;
    }
    if (step === 2) {
      if (!validateTrip()) return;
      setStep(3);
    }
  };

  const buildPdf = async (name: string, phone: string) => {
    return generateTourCartQuotationPdf({
      ...quote,
      customerName: name,
      customerPhone: phone,
      preparedOn: new Date(),
      inclusions,
      tripPlan: resolvedTripPlan(quote),
      packageTotal,
      combinedTotal: payableTotal,
      adjustments,
    });
  };

  const handleDownload = async () => {
    const guest = validate();
    if (!guest) return;
    setBusy('download');
    try {
      const { blob, fileName } = await buildPdf(guest.name, guest.phone);
      saveAs(blob, fileName);
      toast({
        title: 'Quotation PDF ready',
        description: fileName,
      });
    } catch (error) {
      console.error(error);
      toast({
        title: 'PDF failed',
        description:
          error instanceof Error
            ? error.message
            : 'Could not create the quotation PDF. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setBusy(null);
    }
  };

  const handleShare = async () => {
    const guest = validate();
    if (!guest) return;
    setBusy('share');
    try {
      const { blob, fileName } = await buildPdf(guest.name, guest.phone);
      const totalLabel = `Rs ${payableTotal.toLocaleString('en-IN')}`;
      const text = buildWhatsAppText(
        guest.name,
        { ...quote, inclusions, tripPlan: resolvedTripPlan(quote), adjustments },
        totalLabel,
        adjustments,
        packageTotal
      );
      const digits = guest.phone.replace(/\D/g, '');
      if (digits.length < 10) {
        toast({
          title: 'Client number required',
          description: 'Enter the guest WhatsApp number to open the chat.',
          variant: 'destructive',
        });
        return;
      }

      const file = new File([blob], fileName, { type: 'application/pdf' });
      const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
      let canShareFile = false;
      try {
        canShareFile =
          typeof navigator.share === 'function' &&
          typeof navigator.canShare === 'function' &&
          navigator.canShare({ files: [file] });
      } catch {
        canShareFile = false;
      }

      if (mobile && canShareFile) {
        await navigator.share({
          title: `Quotation for ${guest.name} (${guest.phone})`,
          text,
          files: [file],
        });
        toast({
          title: 'Quotation shared',
          description: `Choose WhatsApp and send to ${guest.phone}.`,
        });
        return;
      }

      saveAs(blob, fileName);
      try {
        if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
          await navigator.clipboard.write([new ClipboardItem({ 'application/pdf': blob })]);
        }
      } catch {
        // Clipboard file copy is optional; the downloaded PDF can still be attached.
      }
      window.open(
        `https://wa.me/${digits}?text=${encodeURIComponent(text)}`,
        '_blank',
        'noopener,noreferrer'
      );
      toast({
        title: 'WhatsApp opened',
        description: 'Client chat is open. Paste or drag the downloaded quotation PDF into the chat.',
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      console.error(error);
      toast({
        title: 'Share failed',
        description: 'Could not share the quotation. Try downloading the PDF instead.',
        variant: 'destructive',
      });
    } finally {
      setBusy(null);
    }
  };

  const inclusionColumns = [
    QUOTE_EXTRA_OPTIONS.filter((option) =>
      option.key === 'parking' || option.key === 'tolls' || option.key === 'driverAllowance'
    ),
    QUOTE_EXTRA_OPTIONS.filter(
      (option) => option.key === 'permits' || option.key === 'entryFees' || option.key === 'hotels'
    ),
  ];

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent
        showClose={false}
        data-tour-quote-dialog=""
        className="max-h-[92vh] max-w-[420px] content-start gap-0 overflow-x-hidden overflow-y-auto rounded-[1.6rem] border-slate-200 p-0 sm:rounded-[1.6rem] max-md:inset-x-0 max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:top-auto max-md:flex max-md:h-auto max-md:max-h-[100dvh] max-md:max-w-none max-md:translate-x-0 max-md:translate-y-0 max-md:flex-col max-md:justify-start max-md:rounded-b-none max-md:rounded-t-[1.6rem]"
        onPointerDownOutside={(event) => {
          if (isOutsideTripSheet(event.target)) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (isOutsideTripSheet(event.target)) event.preventDefault();
        }}
        onFocusOutside={(event) => {
          if (isOutsideTripSheet(event.target)) event.preventDefault();
        }}
      >
        <div className="flex items-start gap-3 px-5 pb-3 pt-5 pr-12">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
            <FileText className="h-5 w-5" />
          </span>
          <DialogHeader className="space-y-0.5 text-left">
            <DialogTitle className="text-[16px] font-bold leading-tight text-slate-900">
              Trip Itinerary & Fare Details
            </DialogTitle>
            <DialogDescription className="text-[12px] text-slate-500">
              {step === 1
                ? 'Enter your basic details'
                : step === 2
                  ? 'Add your travel plan details'
                  : 'Review fare and add extras'}
            </DialogDescription>
          </DialogHeader>
          <button
            type="button"
            aria-label="Close"
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <QuoteStepBar step={step} />
        <div className="space-y-4 px-5 pb-5">
          {step === 1 ? (
            <>
              <div>
                <p className="mb-3 text-[15px] font-semibold text-slate-900">Customer Details</p>
                <label
                  htmlFor="tour-quote-name"
                  className="mb-1.5 flex items-center gap-1.5 text-[13px] font-semibold text-slate-800"
                >
                  <User className="h-4 w-4 text-slate-500" />
                  Customer name <span className="text-rose-500">*</span>
                </label>
                <Input
                  id="tour-quote-name"
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  placeholder="Guest full name"
                  autoComplete="name"
                  className="h-11 rounded-xl border-slate-200 text-base"
                />
              </div>
              <div>
                <p className="mb-1.5 flex items-center gap-1.5 text-[13px] font-semibold text-slate-800">
                  <span className="flex h-4 w-4 items-center justify-center text-[#25D366]">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                      <path
                        fill="currentColor"
                        d="M20.5 3.5A11 11 0 0 0 2.1 17.8L1 23l5.3-1.1A11 11 0 0 0 12 22a11 11 0 0 0 8.5-18.5zM12 20.2a9.1 9.1 0 0 1-4.6-1.3l-.3-.2-3.2.8.8-3.1-.2-.3A9.1 9.1 0 1 1 12 20.2zm5-6.8c-.3-.1-1.6-.8-1.8-.9s-.4-.1-.6.1-.7.9-.8 1-.3.2-.6.1a7.4 7.4 0 0 1-2.2-1.4 8.2 8.2 0 0 1-1.5-1.9c-.2-.3 0-.4.1-.6l.4-.4.2-.3a.5.5 0 0 0 0-.5c-.1-.1-.6-1.4-.8-1.9s-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 2.9 2.9 0 0 0-.9 2.2 5 5 0 0 0 1.1 2.7 11.4 11.4 0 0 0 4.4 3.9c.5.2 1 .4 1.5.5a3.6 3.6 0 0 0 1.6.1 2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .2-1.2c-.1-.2-.3-.2-.6-.3z"
                      />
                    </svg>
                  </span>
                  WhatsApp number <span className="text-rose-500">*</span>
                </p>
                <WhatsAppCountryPhoneRow
                  idPrefix="tour-quote-wa"
                  hideLabel
                  selectedCountry={country}
                  onCountryChange={(next) => {
                    setCountry(next);
                    setPhoneDigits('');
                  }}
                  phoneDigits={phoneDigits}
                  onPhoneDigitsChange={setPhoneDigits}
                />
                <p className="mt-2.5 flex items-start gap-1.5 text-[11px] leading-snug text-emerald-700">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  We will use this number to share the itinerary and fare details on WhatsApp.
                </p>
              </div>
            </>
          ) : null}
          {step === 2 ? (
            <>
              <p className="text-[15px] font-semibold text-slate-900">Trip Details</p>
              <TripPlanFields
                idPrefix="tour-quote-trip"
                embedded
                menuFields
                plan={resolvedTripPlan(quote)}
                durationOptions={durationOptions}
                minDate={minTourStartInstant(quote.airportTransfers || [])}
                onChange={onTripPlanChange}
              />
              <div>
                {planFieldLabel(MapPin, 'Last drop location (optional)')}
                <div className="relative min-w-0 rounded-xl border border-slate-200 bg-white pl-8 pr-2">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <LocationInput
                    id="tour-quote-last-drop"
                    label=""
                    placeholder="Search last drop location"
                    location={lastDropPlace}
                    onLocationChange={setLastDropPlace}
                    tripType="outstation"
                    variant="infield"
                    compact
                    hideLeadingIcon
                    hideClearButton
                    className="w-full min-w-0 [&>p]:hidden [&_.ios-search-input-wrapper]:min-h-10 [&_.ios-search-input-wrapper]:items-center [&_.ios-search-input-wrapper]:py-0"
                  />
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-[12px] font-medium text-slate-600">Day-wise itinerary</p>
                <Accordion
                  type="multiple"
                  value={itineraryOpen}
                  onValueChange={(value) => setItineraryOpen(Array.isArray(value) ? value : [value])}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                >
                  {itineraryDays.map((line, dayIndex) => {
                    const places = extraPlacesByDay[dayIndex]?.length
                      ? extraPlacesByDay[dayIndex]
                      : [''];
                    const subtitle = [line.when, line.title].filter(Boolean).join(' · ');
                    return (
                      <AccordionItem
                        key={`itinerary-day-${dayIndex}`}
                        value={`day-${dayIndex}`}
                        className="border-slate-100"
                      >
                        <AccordionTrigger className="px-3 py-2 text-left hover:no-underline">
                          <span className="min-w-0 truncate text-[13px] font-medium leading-tight text-slate-800">
                            <span className="font-semibold">Day {line.day}</span>
                            {subtitle ? (
                              <span className="font-normal text-slate-500"> · {subtitle}</span>
                            ) : null}
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="px-3 pb-2.5">
                          <div className="space-y-1.5">
                            {places.map((place, placeIndex) => (
                              <div
                                key={`itinerary-day-${dayIndex}-place-${placeIndex}`}
                                className="flex gap-1.5"
                              >
                                <Input
                                  id={`tour-quote-day-${dayIndex + 1}-place-${placeIndex + 1}`}
                                  value={place}
                                  onChange={(event) => {
                                    const value = event.target.value;
                                    setExtraPlacesByDay((current) => {
                                      const next = padPlacesByDay(current, extraDayCount, itinerarySeed);
                                      next[dayIndex] = [...(next[dayIndex] || [''])];
                                      next[dayIndex][placeIndex] = value;
                                      return next;
                                    });
                                  }}
                                  placeholder="Place or activity"
                                  className="h-9 rounded-lg bg-white text-base md:text-[13px]"
                                />
                                <div className="flex h-9 shrink-0 flex-col overflow-hidden rounded-lg border border-slate-200">
                                  <button
                                    type="button"
                                    className="flex h-[18px] w-7 items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-slate-700 disabled:pointer-events-none disabled:opacity-30"
                                    aria-label={`Move place ${placeIndex + 1} up on day ${dayIndex + 1}`}
                                    disabled={placeIndex === 0}
                                    onClick={() => {
                                      setExtraPlacesByDay((current) => {
                                        const next = padPlacesByDay(current, extraDayCount, itinerarySeed);
                                        next[dayIndex] = moveListItem(
                                          next[dayIndex] || [''],
                                          placeIndex,
                                          placeIndex - 1
                                        );
                                        return next;
                                      });
                                    }}
                                  >
                                    <ChevronUp className="h-3 w-3" />
                                  </button>
                                  <button
                                    type="button"
                                    className="flex h-[18px] w-7 items-center justify-center border-t border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-700 disabled:pointer-events-none disabled:opacity-30"
                                    aria-label={`Move place ${placeIndex + 1} down on day ${dayIndex + 1}`}
                                    disabled={placeIndex === places.length - 1}
                                    onClick={() => {
                                      setExtraPlacesByDay((current) => {
                                        const next = padPlacesByDay(current, extraDayCount, itinerarySeed);
                                        next[dayIndex] = moveListItem(
                                          next[dayIndex] || [''],
                                          placeIndex,
                                          placeIndex + 1
                                        );
                                        return next;
                                      });
                                    }}
                                  >
                                    <ChevronDown className="h-3 w-3" />
                                  </button>
                                </div>
                                <button
                                  type="button"
                                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                                  aria-label={`Remove place ${placeIndex + 1} from day ${dayIndex + 1}`}
                                  onClick={() => {
                                    setExtraPlacesByDay((current) => {
                                      const next = padPlacesByDay(current, extraDayCount, itinerarySeed);
                                      const remaining = (next[dayIndex] || ['']).filter(
                                        (_, index) => index !== placeIndex
                                      );
                                      next[dayIndex] = remaining.length > 0 ? remaining : [''];
                                      return next;
                                    });
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 text-[12px] font-semibold text-blue-600"
                              onClick={() => {
                                setExtraPlacesByDay((current) => {
                                  const next = padPlacesByDay(current, extraDayCount, itinerarySeed);
                                  next[dayIndex] = [...(next[dayIndex] || ['']), ''];
                                  return next;
                                });
                              }}
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Add place
                            </button>
                            {dayIndex < stayNightCount ? (
                              <div className="pt-1">
                                {planFieldLabel(Hotel, `Night ${dayIndex + 1} stay`)}
                                <Input
                                  id={`tour-quote-night-stay-${dayIndex + 1}`}
                                  value={nightStays[dayIndex] || ''}
                                  onChange={(event) => {
                                    const value = event.target.value;
                                    setNightStays((current) => {
                                      const next = Array.from(
                                        { length: stayNightCount },
                                        (_, stayIndex) => current[stayIndex] || ''
                                      );
                                      next[dayIndex] = value;
                                      return next;
                                    });
                                  }}
                                  placeholder={`City or hotel for night ${dayIndex + 1}`}
                                  className="h-9 rounded-lg bg-white text-base md:text-[13px]"
                                />
                              </div>
                            ) : null}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </div>
            </>
          ) : null}
          {step === 3 ? (
            <>
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
            <div className="flex h-14 w-[4.5rem] shrink-0 items-center justify-center">
              {vehicleImage ? (
                <img src={vehicleImage} alt="" className="h-12 w-full object-contain" />
              ) : (
                <Car className="h-8 w-8 text-slate-300" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-semibold text-slate-900">
                {quote.selectedVehicleName}
              </p>
              {seatText ? (
                <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500">
                  <Users className="h-3 w-3" />
                  {seatText}
                </p>
              ) : null}
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[11px] text-slate-500">Total Fare</p>
              <p className="text-[18px] font-bold leading-tight text-blue-600">
                ₹{payableTotal.toLocaleString('en-IN')}
              </p>
              {payableTotal !== packageTotal ? (
                <p className="text-[10px] font-medium text-slate-500">
                  Package ₹{packageTotal.toLocaleString('en-IN')}
                </p>
              ) : null}
              {quote.additionalAirportFare && quote.additionalAirportFare > 0 ? (
                <p className="text-[10px] font-medium text-slate-500">
                  Includes ₹{quote.additionalAirportFare.toLocaleString('en-IN')} airport transfer
                </p>
              ) : null}
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-[13px] font-semibold text-slate-900">Adjustments (optional)</p>
            {quoteAllowsCustomSeating ? (
              <div className="flex items-center gap-2">
                <label
                  htmlFor="tour-quote-custom-seats"
                  className="min-w-0 flex-1 text-[13px] font-medium text-slate-800"
                >
                  Custom seating
                </label>
                <Input
                  id="tour-quote-custom-seats"
                  value={customSeats}
                  onChange={(event) => setCustomSeats(event.target.value.replace(/[^\d]/g, '').slice(0, 2))}
                  placeholder={
                    selectedFare?.capacity && selectedFare.capacity > 0
                      ? String(selectedFare.capacity)
                      : 'Seats'
                  }
                  inputMode="numeric"
                  className={quoteAmountClass}
                />
              </div>
            ) : null}
            <div className="flex items-center gap-2">
              <Checkbox
                id="tour-quote-carrier"
                checked={carrierIncluded}
                onCheckedChange={(checked) => setCarrierIncluded(checked === true)}
              />
              <label htmlFor="tour-quote-carrier" className="min-w-0 flex-1 text-[13px] font-medium text-slate-800">
                Add carrier to vehicle
              </label>
              <Input
                id="tour-quote-carrier-amount"
                value={carrierAmount}
                onChange={(event) => setCarrierAmount(event.target.value)}
                placeholder="₹ 0"
                inputMode="decimal"
                disabled={!carrierIncluded}
                className={`${quoteAmountClass} disabled:bg-slate-100`}
              />
            </div>
            <div>
              {planFieldLabel(FileText, 'Other extra')}
              <div className="grid grid-cols-[1fr_5.5rem] gap-2">
                <Input
                  id="tour-quote-extra-label"
                  value={extraLabel}
                  onChange={(event) => setExtraLabel(event.target.value)}
                  placeholder="Child seat, extra km, …"
                  className={quoteFieldClass}
                />
                <Input
                  id="tour-quote-extra-amount"
                  value={extraAmount}
                  onChange={(event) => setExtraAmount(event.target.value)}
                  placeholder="₹ 0"
                  inputMode="decimal"
                  className={quoteFieldClass}
                />
              </div>
            </div>
            <div>
              {planFieldLabel(IndianRupee, 'Discount')}
              <Input
                id="tour-quote-discount"
                value={discountAmount}
                onChange={(event) => setDiscountAmount(event.target.value)}
                placeholder="₹ 0"
                inputMode="decimal"
                className={quoteFieldClass}
              />
            </div>
          </div>
          <div>
            {planFieldLabel(FileText, 'Notes (optional)')}
            <Textarea
              id="tour-quote-notes"
              value={quoteNotes}
              onChange={(event) => setQuoteNotes(event.target.value)}
              placeholder="Any special requests or remarks for this quotation"
              rows={3}
              className="rounded-xl bg-white text-base md:text-[13px]"
            />
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 px-3 py-3">
            <p className="flex items-center gap-2 text-[13px] font-semibold text-slate-900">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <FileText className="h-3.5 w-3.5" />
              </span>
              Included in this fare
            </p>
            <p className="mt-1 text-[11px] leading-snug text-slate-500">
              Checked items are included. Unchecked items are not included.
            </p>
            <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-2">
              {inclusionColumns.map((column, columnIndex) => (
                <div key={columnIndex} className="space-y-2">
                  {column.map((option) => (
                    <label
                      key={option.key}
                      htmlFor={`tour-quote-${option.key}`}
                      className="flex cursor-pointer items-center gap-2 text-[13px] text-slate-700"
                    >
                      <Checkbox
                        id={`tour-quote-${option.key}`}
                        checked={inclusions[option.key]}
                        onCheckedChange={(checked) =>
                          setInclusions((current) => ({ ...current, [option.key]: checked === true }))
                        }
                        className="h-4 w-4 rounded border-blue-500 data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              ))}
            </div>
            <p className="mt-2.5 text-[12px] leading-snug text-slate-600">{GST_INVOICE_NOTE}</p>
          </div>
            </>
          ) : null}
          <div className="space-y-2">
            {step < 3 ? (
              <div className={cn('flex gap-2', step === 1 ? '' : '')}>
                {step > 1 ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 flex-1 rounded-xl border-slate-200 text-[15px] font-semibold"
                    onClick={() => setStep((current) => (current === 3 ? 2 : 1))}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                ) : null}
                <Button
                  type="button"
                  className="h-12 flex-1 rounded-xl bg-blue-600 text-[15px] font-semibold hover:bg-blue-700"
                  onClick={goNext}
                >
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 flex-1 rounded-xl border-slate-200 text-[15px] font-semibold"
                    disabled={Boolean(busy)}
                    onClick={() => setStep(2)}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    type="button"
                    className="h-12 flex-1 rounded-xl bg-blue-600 text-[15px] font-semibold hover:bg-blue-700"
                    disabled={Boolean(busy)}
                    onClick={() => void handleDownload()}
                  >
                    {busy === 'download' ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <FileText className="mr-2 h-4 w-4" />
                    )}
                    Download PDF
                  </Button>
                </div>
                <button
                  type="button"
                  className="flex h-9 w-full items-center justify-center gap-1.5 text-[13px] font-semibold text-emerald-700 hover:text-emerald-800 disabled:opacity-60"
                  disabled={Boolean(busy)}
                  onClick={() => void handleShare()}
                >
                  {busy === 'share' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Share2 className="h-3.5 w-3.5" />
                  )}
                  Share on WhatsApp
                </button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
