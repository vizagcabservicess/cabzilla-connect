import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Briefcase,
  Calculator,
  BookOpen,
  CalendarDays,
  Car,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  FileDown,
  Headphones,
  MapPin,
  Plus,
  Share2,
  Shield,
  Star,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { tourAPI } from '@/services/api/tourAPI';
import { getVehicleData } from '@/services/vehicleDataService';
import { useTourCart } from '@/hooks/useTourCart';
import {
  clearTourCart,
  findCatalogTour,
  moveTourInCart,
  openTourListPanel,
  proceedTourCartToBooking,
  readTourCart,
  readTourCartPreferredVehicle,
  readTourCartTripExtras,
  writeTourCartTripExtras,
  unselectTourFromBookingWidget,
  writeTourCart,
  writeTourCartPreferredVehicle,
  VTH_TOUR_LIST_PANEL_OPEN_EVENT,
  type TourWidgetAddPayload,
} from '@/lib/addTourToBookingWidget';
import { combinedTourPriceForVehicle, startingTourPrice, tourPriceForVehicle } from '@/lib/tourVehiclePrice';
import { resolveSmartBudgetMediaUrl } from '@/lib/smartBudgetUpload';
import { getTourUrl } from '@/utils/tourUrlUtils';
import { cn } from '@/lib/utils';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type { CabType } from '@/types/cab';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import {
  SESSION_GUEST_TRACK_PHONE_KEY,
  trackGuestSearch,
  buildGuestSearchSummaryUrl,
} from '@/services/trackSearchAPI';
import {
  GuestWhatsAppPhoneDialog,
  defaultWhatsappCountry,
} from '@/components/GuestWhatsAppPhoneDialog';
import {
  TourCartQuotationDialog,
  TripPlanFields,
  buildTripSchedule,
  suggestedTourDuration,
} from '@/components/tour/TourCartQuotationDialog';
import { TourAdditionalAirportTransfers } from '@/components/tour/TourAdditionalAirportTransfers';
import { airportHotelName, clampToLeadTime, clampTripAfterFromAirports, daysCoveringTourAndAirports, formatTourDurationLabel, minTourStartInstant, AIRPORT_DURATION_PAD_DAYS } from '@/lib/tourScheduleTimes';
import { isBuildTripDeepLink, shareBuildYourTripLink } from '@/lib/buildYourTrip';
import type { TourQuoteAirportTransfer, TourQuoteTripPlan } from '@/components/pdf/TourCartQuotationPDF';
import type { CountryCode } from '@/lib/countryCodes';

type CatalogTour = {
  tourId: string;
  tourName: string;
  name?: string;
  image?: string;
  imageUrl?: string;
  days?: number;
  timeDuration?: string;
  distance?: number;
  minPrice?: number;
  pricing?: Record<string, number>;
  description?: string;
};

type EnrichedCartItem = TourWidgetAddPayload & {
  pricing?: Record<string, number>;
  description?: string;
  distance?: number;
};

type VehicleOption = {
  id: string;
  name: string;
  price: number;
  image?: string;
};

function formatDuration(days?: number, timeDuration?: string): string {
  if (days && days >= 2) {
    const nights = Math.max(1, days - 1);
    return `${days}D / ${nights}N`;
  }
  const label = String(timeDuration || '').trim();
  if (label) return label;
  if (days === 1) return '1 Day';
  return '';
}

function tripPlanSummary(plan: TourQuoteTripPlan): string {
  let when = '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(plan.pickupDate)) {
    const date = new Date(
      Number(plan.pickupDate.slice(0, 4)),
      Number(plan.pickupDate.slice(5, 7)) - 1,
      Number(plan.pickupDate.slice(8, 10))
    );
    const dateLabel = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(plan.pickupTime);
    let time = '';
    if (timeMatch) {
      const hours = Number(timeMatch[1]);
      const suffix = hours >= 12 ? 'PM' : 'AM';
      const hour12 = hours % 12 || 12;
      time = `${hour12}:${timeMatch[2]} ${suffix}`;
    }
    when = [dateLabel, time].filter(Boolean).join(', ');
  }
  const parts = [when, plan.tourDuration.trim()].filter(Boolean);
  return parts.join(' · ') || 'Add date and duration';
}

function quotedTripDayCount(duration: string, rows: Array<{ days?: number }>): number {
  const daysWord = /(\d+)\s*days?/i.exec(duration);
  if (daysWord) return Math.max(1, Number(daysWord[1]));
  const compact = /(\d+)\s*d\b/i.exec(duration);
  if (compact) return Math.max(1, Number(compact[1]));
  const fromRows = rows.reduce((sum, row) => sum + (Number(row.days) > 0 ? Number(row.days) : 1), 0);
  return Math.max(1, fromRows);
}

function formatPrice(amount: number): string {
  if (!(amount > 0)) return '';
  return `₹${amount.toLocaleString('en-IN')}`;
}

function tourPlace(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('srikurmam') || n.includes('arasavalli')) return 'Srikakulam, Andhra Pradesh';
  if (n.includes('lambasingi')) return 'Lambasingi, Alluri Sitharama Raju Dist.';
  if (n.includes('vanajangi')) return 'Vanajangi, Andhra Pradesh';
  if (n.includes('araku')) return 'Araku Valley, Visakhapatnam';
  if (n.includes('vizag') || n.includes('visakhapatnam')) return 'Visakhapatnam, Andhra Pradesh';
  return 'Andhra Pradesh';
}

function enrichCartItem(item: TourWidgetAddPayload, catalog: CatalogTour[]): EnrichedCartItem {
  const match = findCatalogTour(catalog, item.tourId, item.tourName);
  const imageUrl = item.imageUrl || match?.imageUrl || match?.image || '';
  const days = item.days || match?.days;
  const timeDuration = item.timeDuration || match?.timeDuration;
  const distance = Number(match?.distance) > 0 ? Number(match?.distance) : undefined;
  const pricing = match?.pricing;
  const minPrice =
    item.minPrice || startingTourPrice(pricing) || Number(match?.minPrice) || 0;
  return {
    ...item,
    tourId: match?.tourId || item.tourId,
    tourName: match?.tourName || item.tourName,
    imageUrl: imageUrl || undefined,
    days,
    timeDuration,
    distance,
    minPrice: minPrice > 0 ? minPrice : undefined,
    pricing,
    description: match?.description,
  };
}

export function MyTourListPanel() {
  const { items } = useTourCart();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const runOnHome = (fn: () => void) => {
    if (location.pathname === '/') {
      fn();
      return;
    }
    navigate('/');
    window.setTimeout(fn, 450);
  };

  const goToDestinations = () => {
    runOnHome(() => {
      document.getElementById('home-destinations')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  };
  const [open, setOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    return isBuildTripDeepLink(window.location.search) && readTourCart().length > 0;
  });
  const [catalog, setCatalog] = useState<CatalogTour[]>([]);
  const [vehicles, setVehicles] = useState<CabType[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(
    () => readTourCartPreferredVehicle()?.id || ''
  );
  const [showGuestPhoneModal, setShowGuestPhoneModal] = useState(false);
  const [showQuoteDialog, setShowQuoteDialog] = useState(false);
  const [tripPlan, setTripPlan] = useState<TourQuoteTripPlan>(() => {
    const saved = readTourCartTripExtras()?.tripPlan;
    return {
      pickupLocation: saved?.pickupLocation || '',
      pickupDate: saved?.pickupDate || '',
      pickupTime: saved?.pickupTime || '',
      tourDuration: saved?.tourDuration || '',
    };
  });
  const [tripPlanOpen, setTripPlanOpen] = useState('');
  const [airportExtra, setAirportExtra] = useState(() => readTourCartTripExtras()?.additionalAirportFare || 0);
  const [airportTransfers, setAirportTransfers] = useState<TourQuoteAirportTransfer[]>(
    () => readTourCartTripExtras()?.airportTransfers || []
  );
  const handleAirportTransfers = useCallback((next: TourQuoteAirportTransfer[]) => {
    setAirportTransfers((current) =>
      JSON.stringify(current) === JSON.stringify(next) ? current : next
    );
  }, []);
  const handleTripSchedule = useCallback((when: { pickupDate: string; pickupTime: string }) => {
    setTripPlan((current) =>
      current.pickupDate === when.pickupDate && current.pickupTime === when.pickupTime
        ? current
        : { ...current, pickupDate: when.pickupDate, pickupTime: when.pickupTime }
    );
  }, []);
  const durationTouched = useRef(false);
  const [guestPhoneDigits, setGuestPhoneDigits] = useState('');
  const [guestPhoneCountry, setGuestPhoneCountry] = useState<CountryCode>(() =>
    defaultWhatsappCountry()
  );

  useEffect(() => {
    const hotel = airportHotelName(airportTransfers);
    const fromAirport = airportTransfers.find((transfer) => transfer.direction === 'from-airport');
    const hasFromAirport = Boolean(fromAirport);
    setTripPlan((current) => {
      const clamped = hasFromAirport
        ? clampTripAfterFromAirports(current, airportTransfers)
        : current.pickupDate
          ? clampToLeadTime(current)
          : current;
      let changed = false;
      const next = { ...current };
      if (
        clamped.pickupDate &&
        (clamped.pickupDate !== current.pickupDate || clamped.pickupTime !== current.pickupTime)
      ) {
        next.pickupDate = clamped.pickupDate;
        next.pickupTime = clamped.pickupTime;
        changed = true;
      }
      if (hotel && !current.pickupLocation.trim()) {
        next.pickupLocation = hotel;
        next.pickupPlace = fromAirport?.place || current.pickupPlace;
        changed = true;
      }
      const saved = changed ? next : current;
      if (saved.pickupDate) {
        try {
          const [year, month, day] = saved.pickupDate.split('-').map(Number);
          const [hours, minutes] = (saved.pickupTime || '00:00').split(':').map(Number);
          sessionStorage.setItem(
            'pickupDate',
            JSON.stringify(new Date(year, month - 1, day, hours || 0, minutes || 0, 0, 0))
          );
        } catch {
          /* ignore */
        }
      }
      return changed ? next : current;
    });
  }, [airportTransfers]);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(VTH_TOUR_LIST_PANEL_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(VTH_TOUR_LIST_PANEL_OPEN_EVENT, onOpen);
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      tourAPI.getAvailableTours().catch(() => []),
      getVehicleData(false, false).catch(() => []),
    ]).then(([tours, fleet]) => {
      if (cancelled) return;
      const mapped = (Array.isArray(tours) ? tours : []).map((tour) => {
        const row = tour as CatalogTour & { id?: string; name?: string; image?: string };
        return {
          tourId: String(row.tourId || row.id || ''),
          tourName: String(row.tourName || row.name || ''),
          image: row.image,
          imageUrl: row.imageUrl || row.image,
          days: row.days,
          timeDuration: row.timeDuration,
          distance: Number(row.distance) > 0 ? Number(row.distance) : undefined,
          pricing: row.pricing,
          description: row.description,
        };
      });
      setCatalog(mapped);
      setVehicles(Array.isArray(fleet) ? fleet : []);
      const current = readTourCart();
      if (current.length === 0) return;
      let changed = false;
      const next = current.map((item) => {
        const match = findCatalogTour(mapped, item.tourId, item.tourName);
        if (!match) return item;
        const imageUrl = item.imageUrl || match.imageUrl || match.image;
        if (match.tourId === item.tourId && imageUrl === item.imageUrl) return item;
        changed = true;
        return {
          ...item,
          tourId: match.tourId,
          tourName: match.tourName || item.tourName,
          imageUrl: imageUrl || item.imageUrl,
          days: item.days || match.days,
          timeDuration: item.timeDuration || match.timeDuration,
          minPrice: item.minPrice || startingTourPrice(match.pricing) || undefined,
        };
      });
      if (changed) writeTourCart(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo(
    () => items.map((item) => enrichCartItem(item, catalog)),
    [items, catalog]
  );

  useEffect(() => {
    if (items.length === 0) durationTouched.current = false;
  }, [items.length]);

  useEffect(() => {
    const packageLabel = suggestedTourDuration(rows);
    const packageDays = quotedTripDayCount(packageLabel, rows);
    const currentDays = quotedTripDayCount(tripPlan.tourDuration || packageLabel, rows);
    const spanDays = daysCoveringTourAndAirports(
      tripPlan.pickupDate,
      packageDays,
      airportTransfers.map((transfer) => transfer.pickupDate)
    );
    const storedDays = currentDays > packageDays + AIRPORT_DURATION_PAD_DAYS ? packageDays : currentDays;
    const nextDays = durationTouched.current
      ? Math.max(storedDays, spanDays)
      : Math.max(packageDays, spanDays);
    const nextLabel =
      nextDays <= 1 && packageDays <= 1 ? packageLabel : formatTourDurationLabel(nextDays);
    setTripPlan((current) =>
      current.tourDuration === nextLabel ? current : { ...current, tourDuration: nextLabel }
    );
  }, [rows, airportTransfers, tripPlan.pickupDate, tripPlan.tourDuration]);

  const plannedTrip = useMemo<TourQuoteTripPlan>(
    () => ({
      ...tripPlan,
      tourDuration: tripPlan.tourDuration.trim() || suggestedTourDuration(rows),
    }),
    [rows, tripPlan]
  );
  const tripSchedule = useMemo(
    () => buildTripSchedule(rows, plannedTrip, airportTransfers),
    [rows, plannedTrip, airportTransfers]
  );
  const durationOptions = useMemo(() => {
    const values = new Set<string>();
    const suggested = suggestedTourDuration(rows);
    if (suggested) values.add(suggested);
    const packageDays = quotedTripDayCount(suggested, rows);
    const spanDays = daysCoveringTourAndAirports(
      tripPlan.pickupDate,
      packageDays,
      airportTransfers.map((transfer) => transfer.pickupDate)
    );
    if (spanDays > packageDays) values.add(formatTourDurationLabel(spanDays));
    for (const row of rows) {
      const own = suggestedTourDuration([row]);
      if (own) values.add(own);
      const raw = String(row.timeDuration || '').trim();
      if (raw) values.add(raw);
    }
    return [...values];
  }, [rows, tripPlan.pickupDate, airportTransfers]);

  const vehicleOptions = useMemo<VehicleOption[]>(() => {
    if (rows.length === 0) return [];
    return vehicles
      .map((vehicle) => ({
        id: vehicle.id || vehicle.vehicleId || vehicle.name,
        name: vehicle.name,
        image: vehicle.image,
        price: combinedTourPriceForVehicle(rows, vehicle),
      }))
      .filter((option) => option.price > 0)
      .sort((a, b) => a.price - b.price);
  }, [rows, vehicles]);

  useEffect(() => {
    if (vehicleOptions.length === 0) {
      setSelectedVehicleId('');
      return;
    }
    const current = vehicleOptions.find((option) => option.id === selectedVehicleId);
    if (current) {
      writeTourCartPreferredVehicle({ id: current.id, name: current.name });
      return;
    }
    const stored = readTourCartPreferredVehicle();
    const storedMatch = stored
      ? vehicleOptions.find(
          (option) =>
            option.id === stored.id ||
            option.name.trim().toLowerCase() === String(stored.name || '').trim().toLowerCase()
        )
      : undefined;
    const next = storedMatch || vehicleOptions[0];
    setSelectedVehicleId(next.id);
    writeTourCartPreferredVehicle({ id: next.id, name: next.name });
  }, [vehicleOptions, selectedVehicleId]);

  const selectedOption =
    vehicleOptions.find((option) => option.id === selectedVehicleId) || vehicleOptions[0];
  const selectedVehicle =
    vehicles.find((vehicle) => (vehicle.id || vehicle.vehicleId || vehicle.name) === selectedOption?.id) ||
    null;
  const packageValue =
    selectedOption?.price ||
    rows.reduce((sum, row) => sum + (Number(row.minPrice) || 0), 0);
  const quotedTotal = packageValue + airportExtra;
  const isSuperAdmin = user?.role === 'super_admin';

  const persistTripExtras = useCallback(
    (nextTransfers = airportTransfers, nextFare = airportExtra, nextPlan = tripPlan) => {
      writeTourCartTripExtras({
        tripPlan: nextPlan,
        airportTransfers: nextTransfers,
        additionalAirportFare: nextFare,
      });
    },
    [airportExtra, airportTransfers, tripPlan]
  );

  useEffect(() => {
    persistTripExtras();
  }, [persistTripExtras]);

  const goToPickupStep = () => {
    persistTripExtras();
    setShowGuestPhoneModal(false);
    setOpen(false);
    proceedTourCartToBooking({
      navigate,
      preferredVehicle: selectedOption
        ? { id: selectedOption.id, name: selectedOption.name }
        : null,
    });
  };

  const handleProceedToNextStep = () => {
    if (user?.role === 'super_admin') {
      goToPickupStep();
      return;
    }
    let cached = '';
    try {
      cached = sessionStorage.getItem(SESSION_GUEST_TRACK_PHONE_KEY)?.trim() || '';
    } catch {
      cached = '';
    }
    if (cached) {
      goToPickupStep();
      return;
    }
    setShowGuestPhoneModal(true);
  };

  const handleGuestPhoneSubmit = () => {
    if (guestPhoneDigits.length !== guestPhoneCountry.maxLength) {
      toast({
        title: 'Invalid number',
        description: `Enter a valid ${guestPhoneCountry.maxLength}-digit number for ${guestPhoneCountry.name}.`,
        variant: 'destructive',
      });
      return;
    }
    const guestPhone = `${guestPhoneCountry.dialCode}${guestPhoneDigits}`;
    try {
      sessionStorage.setItem(SESSION_GUEST_TRACK_PHONE_KEY, guestPhone);
    } catch {
      /* ignore */
    }
    const drop = rows.map((row) => row.tourName).join(' + ');
    const fareText =
      selectedOption && selectedOption.price > 0
        ? `₹${selectedOption.price.toLocaleString('en-IN')}`
        : '';
    const tourSummaryUrl = buildGuestSearchSummaryUrl({
      tripType: 'tour',
      tourHref: '/tours',
    });
    trackGuestSearch({
      guestPhone,
      pickup: 'Pickup pending',
      drop,
      tripType: rows.length > 1 ? `Tour · ${rows.length} packages` : 'Tour',
      departure: '',
      carsShown: selectedOption
        ? [fareText ? `${selectedOption.name}: ${fareText}` : selectedOption.name]
        : [],
      vehicleFares: selectedOption
        ? [{ name: selectedOption.name, fareText: fareText || 'Quote on request' }]
        : undefined,
      searchSummaryUrl: tourSummaryUrl,
    });
    setGuestPhoneDigits('');
    setGuestPhoneCountry(defaultWhatsappCountry());
    goToPickupStep();
  };

  useEffect(() => {
    if (items.length === 0 && open) setOpen(false);
  }, [items.length, open]);

  const panel =
    items.length === 0 ? null : (
    <div className="flex min-h-0 max-h-[calc(100dvh-env(safe-area-inset-top,0px))] flex-col overflow-hidden rounded-t-3xl bg-white shadow-[0_18px_50px_rgba(15,23,42,0.18)] md:max-h-[calc(100dvh-6rem)] md:rounded-3xl">
      <div className="relative shrink-0 overflow-hidden border-b border-slate-100 bg-gradient-to-r from-sky-50 to-white px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Briefcase className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-[17px] font-bold leading-tight text-slate-900">My Tour List</h2>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Plan your perfect trip with your selected tours
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close tour list"
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            onClick={() => setOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[12px] font-bold text-white">
            {items.length}
          </span>
          <p className="min-w-0 flex-1 truncate text-[13px] font-semibold leading-none text-slate-900">
            {items.length === 1 ? '1 tour selected' : `${items.length} tours selected`}
          </p>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-1 text-[11px] font-medium text-rose-500 hover:bg-rose-50"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                clearTourCart();
                setOpen(false);
              }}
            >
              <Trash2 className="h-3 w-3" />
              Clear
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-0.5 rounded-full border border-blue-200 bg-white px-2 py-1 text-[11px] font-semibold text-blue-600 hover:bg-blue-50"
              onClick={() => {
                setOpen(false);
                goToDestinations();
              }}
            >
              <Plus className="h-3 w-3" />
              Add
            </button>
          </div>
        </div>

        <TourAdditionalAirportTransfers
          vehicle={selectedVehicle}
          tripStartDate={plannedTrip.pickupDate}
          tripStartTime={plannedTrip.pickupTime}
          tripDayCount={quotedTripDayCount(suggestedTourDuration(rows), rows)}
          initialTransfers={airportTransfers}
          onFareChange={setAirportExtra}
          onTransfersChange={handleAirportTransfers}
          onTripScheduleChange={handleTripSchedule}
        />

        <Accordion
          type="single"
          collapsible
          value={tripPlanOpen}
          onValueChange={setTripPlanOpen}
          className="mb-2"
        >
          <AccordionItem
            value="trip-plan"
            className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
          >
            <AccordionTrigger className="h-11 rounded-none border-0 bg-white px-3 py-0 text-slate-400 hover:no-underline [&>svg]:text-slate-400">
              <span className="flex min-w-0 flex-1 items-center gap-2 pr-2">
                <CalendarDays className="h-4 w-4 shrink-0 text-blue-600" />
                <span className="shrink-0 text-[13px] font-semibold text-slate-900">Trip plan</span>
                <span className="truncate text-[12px] font-normal text-slate-500">
                  {tripPlanSummary(plannedTrip)}
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-3">
              <TripPlanFields
                idPrefix="tour-list-trip"
                embedded
                plan={plannedTrip}
                durationOptions={durationOptions}
                minDate={minTourStartInstant(airportTransfers)}
                onChange={(next) => {
                  if (next.tourDuration !== plannedTrip.tourDuration) durationTouched.current = true;
                  setTripPlan(next);
                }}
              />
              {tripSchedule.length > 0 ? (
                <div className="mt-3.5">
                  <p className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-slate-800">
                    <BookOpen className="h-3.5 w-3.5 text-slate-500" />
                    Itinerary
                  </p>
                  <Accordion type="single" collapsible defaultValue="itinerary-days">
                    <AccordionItem value="itinerary-days" className="rounded-xl border border-slate-200 bg-white">
                      <AccordionTrigger className="h-10 rounded-xl px-3 py-0 text-[13px] font-semibold text-slate-900 hover:no-underline [&>svg]:text-slate-400">
                        {plannedTrip.tourDuration || 'Itinerary'}
                      </AccordionTrigger>
                      <AccordionContent className="px-3 pb-3">
                        <ol className="relative ml-1 space-y-3 border-l border-blue-100 pl-4">
                          {tripSchedule.map((line) => (
                            <li key={`${line.day}-${line.title}`} className="relative">
                              <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-blue-600 ring-4 ring-white" />
                              <p className="text-[13px] font-semibold leading-snug text-slate-900">
                                Day {line.day}
                                {line.when ? ` - ${line.when}` : ''}
                              </p>
                              {line.title ? (
                                <p className="text-[12px] font-medium leading-snug text-slate-700">{line.title}</p>
                              ) : null}
                              {line.note ? (
                                <p className="text-[11px] leading-snug text-slate-500">{line.note}</p>
                              ) : null}
                            </li>
                          ))}
                        </ol>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              ) : null}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className="h-11 rounded-xl border border-slate-200 bg-white text-[14px] font-semibold text-slate-800 hover:bg-slate-50"
                  onClick={() => {
                    durationTouched.current = false;
                    setTripPlan({
                      pickupLocation: '',
                      pickupDate: '',
                      pickupTime: '',
                      tourDuration: suggestedTourDuration(rows),
                      pickupPlace: undefined,
                    });
                    try {
                      sessionStorage.removeItem('pickupLocation');
                      sessionStorage.removeItem('pickupDate');
                    } catch {
                      /* ignore */
                    }
                  }}
                >
                  Clear
                </button>
                <button
                  type="button"
                  className="h-11 rounded-xl bg-blue-600 text-[14px] font-semibold text-white hover:bg-blue-700"
                  onClick={() => setTripPlanOpen('')}
                >
                  Done
                </button>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="space-y-2.5">
          {rows.map((row, index) => {
            const vehiclePrice = selectedVehicle
              ? tourPriceForVehicle(row.pricing, selectedVehicle)
              : 0;
            const displayPrice = vehiclePrice > 0 ? vehiclePrice : Number(row.minPrice) || 0;
            return (
            <div
              key={row.tourId}
              className="relative flex gap-2.5 rounded-2xl border border-slate-100 bg-white p-2 shadow-sm"
            >
              {rows.length > 1 ? (
                <div className="flex shrink-0 flex-col justify-center gap-1">
                  <button
                    type="button"
                    aria-label={`Move ${row.tourName} up`}
                    disabled={index === 0}
                    className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-25"
                    onClick={() => moveTourInCart(index, index - 1)}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${row.tourName} down`}
                    disabled={index === rows.length - 1}
                    className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-25"
                    onClick={() => moveTourInCart(index, index + 1)}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>
              ) : null}
              <div className="relative h-[88px] w-[88px] shrink-0 overflow-hidden rounded-xl bg-slate-200">
                {row.imageUrl ? (
                  <img
                    src={resolveSmartBudgetMediaUrl(row.imageUrl)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : null}
                {formatDuration(row.days, row.timeDuration) ? (
                  <span className="absolute left-1.5 top-1.5 rounded-full bg-white/95 px-1.5 py-0.5 text-[9px] font-bold text-slate-800">
                    {formatDuration(row.days, row.timeDuration)}
                  </span>
                ) : null}
              </div>
              <div className="min-w-0 flex-1 pr-6">
                <p className="line-clamp-2 text-[13px] font-bold leading-snug text-slate-900">
                  {row.tourName}
                </p>
                <p className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-500">
                  <MapPin className="h-3 w-3 shrink-0 text-blue-500" />
                  <span className="truncate">{tourPlace(row.tourName)}</span>
                </p>
                <div className="mt-1.5 flex items-end justify-between gap-2">
                  {displayPrice > 0 ? (
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold leading-tight text-blue-600">
                        {formatPrice(displayPrice)}
                      </p>
                      <p className="truncate text-[10px] font-medium text-slate-400">
                        {vehiclePrice > 0 ? selectedOption?.name : 'onwards'}
                      </p>
                    </div>
                  ) : (
                    <span />
                  )}
                  <Link
                    to={getTourUrl({ tourId: row.tourId, tourName: row.tourName })}
                    className="shrink-0 whitespace-nowrap rounded-lg border border-blue-200 px-2 py-1 text-[10px] font-semibold text-blue-600 hover:bg-blue-50"
                    onClick={() => setOpen(false)}
                  >
                    View Details
                  </Link>
                </div>
              </div>
              <button
                type="button"
                aria-label={`Remove ${row.tourName}`}
                className="absolute right-1.5 top-1.5 rounded-full p-1 text-rose-400 hover:bg-rose-50 hover:text-rose-600"
                onClick={() => unselectTourFromBookingWidget(row)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            );
          })}
        </div>

        <div className="mt-3 rounded-2xl bg-blue-50 px-3 py-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                <Calculator className="h-3.5 w-3.5 text-blue-600" />
                Estimated Package Value
              </p>
              <p className="mt-0.5 text-xl font-bold text-blue-700">
                {quotedTotal > 0 ? `${formatPrice(quotedTotal)} onwards` : 'Quote on request'}
              </p>
              {airportExtra > 0 ? (
                <p className="mt-0.5 text-[10px] font-medium text-slate-500">
                  Includes {formatPrice(airportExtra)} additional airport transfer
                </p>
              ) : null}
            </div>
            <p className="max-w-[40%] text-right text-[10px] italic leading-snug text-emerald-600">
              Customize your trip as per your needs!
            </p>
          </div>
        </div>

        {vehicleOptions.length > 0 ? (
          <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
              <Car className="h-3.5 w-3.5 text-emerald-600" />
              Vehicle Options
              <span className="font-normal text-slate-500">(Select to see updated price)</span>
            </p>
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {vehicleOptions.map((option) => {
                const selected = option.id === selectedOption?.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    className={cn(
                      'w-[72px] shrink-0 rounded-xl border bg-white px-1.5 py-2 text-center transition-colors',
                      selected
                        ? 'border-blue-500 ring-2 ring-blue-100'
                        : 'border-slate-100 hover:border-blue-200'
                    )}
                    onClick={() => {
                      setSelectedVehicleId(option.id);
                      writeTourCartPreferredVehicle({ id: option.id, name: option.name });
                    }}
                  >
                    <div className="mx-auto h-8 w-full">
                      {option.image ? (
                        <img
                          src={resolveSmartBudgetMediaUrl(option.image)}
                          alt=""
                          className="mx-auto h-8 object-contain"
                        />
                      ) : (
                        <Car className="mx-auto h-7 w-7 text-slate-300" />
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 min-h-[24px] text-[9px] font-medium leading-tight text-slate-600">
                      {option.name}
                    </p>
                    <p className="mt-0.5 text-[11px] font-bold text-blue-700">
                      {formatPrice(option.price)}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="mt-3 rounded-2xl border border-amber-100 bg-amber-50/50 p-3">
          <p className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-slate-800">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            Why Book with Vizag Taxi Hub?
          </p>
          <div className="grid grid-cols-2 gap-2">
            <p className="flex items-center gap-1.5 text-[10px] text-slate-600">
              <Shield className="h-3.5 w-3.5 text-emerald-600" />
              Trusted & Safe Travel
            </p>
            <p className="flex items-center gap-1.5 text-[10px] text-slate-600">
              <Users className="h-3.5 w-3.5 text-orange-500" />
              Experienced Local Guides
            </p>
            <p className="flex items-center gap-1.5 text-[10px] text-slate-600">
              <Car className="h-3.5 w-3.5 text-blue-600" />
              Well-Maintained Vehicles
            </p>
            <p className="flex items-center gap-1.5 text-[10px] text-slate-600">
              <Headphones className="h-3.5 w-3.5 text-violet-500" />
              24/7 Support
            </p>
          </div>
        </div>

        {isSuperAdmin ? (
          <>
            <button
              type="button"
              className="mt-3 flex h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 text-[13px] font-semibold text-blue-700 hover:bg-blue-100"
              onClick={() => setShowQuoteDialog(true)}
            >
              <FileDown className="h-4 w-4" />
              Create / share quotation PDF
            </button>
            <button
              type="button"
              className="mt-2 flex h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 text-[13px] font-semibold text-emerald-800 hover:bg-emerald-100"
              onClick={() => {
                shareBuildYourTripLink(
                  rows.map((row) => ({
                    tourId: row.tourId,
                    tourName: row.tourName,
                    imageUrl: row.imageUrl,
                    minPrice: row.minPrice,
                    days: row.days,
                    timeDuration: row.timeDuration,
                  }))
                );
                toast({
                  title: 'Build Your Trip link ready',
                  description:
                    rows.length > 0
                      ? `${rows.length} selected tour${rows.length === 1 ? '' : 's'} are in the customer link.`
                      : 'Link copied. Share it so the customer can add tours and transfers.',
                });
              }}
            >
              <Share2 className="h-4 w-4" />
              Share Build Your Trip link
            </button>
          </>
        ) : null}

        <button
          type="button"
          className="mt-3 flex h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-blue-600 text-[13px] font-semibold text-white shadow-sm hover:bg-blue-700"
          onClick={handleProceedToNextStep}
        >
          Proceed to next step
          <ArrowRight className="h-4 w-4" />
        </button>
        <p className="mt-1 text-center text-[10px] text-slate-400">
          Enter pickup, date, time and duration to build the itinerary
        </p>
        <button
          type="button"
          className="mt-2 flex h-10 w-full items-center justify-center gap-1 rounded-xl border border-slate-200 text-[12px] font-semibold text-slate-700 hover:bg-slate-50"
          onClick={() => {
            setOpen(false);
            goToDestinations();
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          Add More Tours
        </button>
        <p className="mt-3 text-center text-[10px] italic text-slate-400">
          Let&apos;s make your Andhra journey unforgettable!
        </p>
      </div>
    </div>
  );

  return (
    <>
      {!open ? (
        <button
          type="button"
          aria-label={
            items.length > 0
              ? `My trip, ${items.length} ${items.length === 1 ? 'tour' : 'tours'}`
              : 'Build Your Trip'
          }
          className={cn(
            'fixed z-[10030] max-w-[calc(50%-0.75rem)] rounded-full bg-blue-600 font-semibold text-white shadow-[0_10px_24px_-6px_rgba(37,99,235,0.55)] hover:bg-blue-700',
            'right-3',
            'bottom-[calc(5.75rem+env(safe-area-inset-bottom,0px)+var(--vth-chat-clearance,0px))]',
            'md:bottom-[calc(5.25rem+var(--vth-chat-clearance,0px))] md:right-6',
            'flex items-center gap-2 py-1.5 pl-1.5 pr-2.5 text-left'
          )}
          onClick={() => {
            if (items.length === 0) {
              goToDestinations();
              return;
            }
            openTourListPanel();
          }}
        >
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15">
            <Briefcase className="h-5 w-5" />
            {items.length > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-0.5 text-[10px] font-bold text-blue-600">
                {items.length}
              </span>
            ) : null}
          </span>
          <span className="min-w-0 pr-0.5">
            <span className="block truncate text-[13px] font-semibold leading-tight">
              {items.length > 0 ? `My trip · ${items.length}` : 'Build Your Trip'}
            </span>
            <span className="mt-0.5 flex items-center gap-0.5 truncate text-[10px] font-medium leading-tight text-white/80">
              {items.length > 0 ? 'View selected tours' : 'Add tours & transfers'}
              <ChevronRight className="h-3 w-3 shrink-0" />
            </span>
          </span>
        </button>
      ) : null}

      {open ? (
        <>
          <button
            type="button"
            aria-label="Dismiss tour list"
            className="fixed inset-0 z-[10020] bg-slate-900/30 md:hidden"
            onClick={() => setOpen(false)}
          />
          <div
            className={cn(
              'fixed z-[10030] flex w-full max-w-md flex-col overflow-hidden',
              'bottom-0 left-1/2 max-h-[calc(100dvh-env(safe-area-inset-top,0px))] -translate-x-1/2',
              'md:bottom-auto md:left-auto md:right-3 md:top-20 md:max-h-[calc(100dvh-6rem)] md:w-[26.5rem] md:max-w-none md:translate-x-0'
            )}
          >
            {panel}
          </div>
        </>
      ) : null}

      <GuestWhatsAppPhoneDialog
        open={showGuestPhoneModal}
        onOpenChange={(openModal) => {
          setShowGuestPhoneModal(openModal);
          if (!openModal) {
            setGuestPhoneDigits('');
            setGuestPhoneCountry(defaultWhatsappCountry());
          }
        }}
        idPrefix="tour-list-guest-wa"
        selectedCountry={guestPhoneCountry}
        onCountryChange={setGuestPhoneCountry}
        phoneDigits={guestPhoneDigits}
        onPhoneDigitsChange={setGuestPhoneDigits}
        onSubmit={handleGuestPhoneSubmit}
        submitLabel="Continue"
        submitIcon={<ArrowRight className="mr-2 h-4 w-4" aria-hidden />}
        description="Enter your number to get tour quotes. We'll send trip updates on WhatsApp."
        routeLabel={
          rows.length > 0
            ? rows.length === 1
              ? rows[0].tourName
              : `${rows[0].tourName} + ${rows.length - 1} more`
            : undefined
        }
      />

      {isSuperAdmin ? (
        <TourCartQuotationDialog
          open={showQuoteDialog}
          onOpenChange={setShowQuoteDialog}
          quote={{
            tours: rows.map((row) => {
              const vehiclePrice = selectedVehicle
                ? tourPriceForVehicle(row.pricing, selectedVehicle)
                : 0;
              return {
                tourId: row.tourId,
                tourName: row.tourName,
                duration: formatDuration(row.days, row.timeDuration),
                days: row.days,
                distance: row.distance,
                timeDuration: row.timeDuration,
                price: vehiclePrice > 0 ? vehiclePrice : Number(row.minPrice) || 0,
                description: row.description,
              };
            }),
            selectedVehicleName: selectedOption?.name || 'Selected vehicle',
            combinedTotal: quotedTotal,
            additionalAirportFare: airportExtra,
            airportTransfers,
            vehicleOptions: vehicleOptions.map((option) => {
              const fleetMatch = vehicles.find(
                (vehicle) => (vehicle.id || vehicle.vehicleId || vehicle.name) === option.id
              );
              return {
                name: option.name,
                price: option.price,
                capacity: fleetMatch?.capacity,
                image: option.image || fleetMatch?.image,
              };
            }),
            tripPlan: plannedTrip,
          }}
          onTripPlanChange={(next) => {
            if (next.tourDuration !== plannedTrip.tourDuration) durationTouched.current = true;
            setTripPlan(next);
          }}
        />
      ) : null}
    </>
  );
}
