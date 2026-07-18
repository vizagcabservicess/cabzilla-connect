import { useEffect, useState, type FormEvent } from 'react';
import { format } from 'date-fns';
import { Car, ChevronDown, Clock, Loader2, Pencil, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LocationInput } from '@/components/LocationInput';
import { DateTimePicker } from '@/components/DateTimePicker';
import { TabTripSelector, type TripSelectorTab } from '@/components/TabTripSelector';
import type { Location } from '@/lib/locationData';
import { convertToApiLocation } from '@/lib/locationUtils';
import type { TripMode } from '@/lib/tripTypes';
import { loadCabTypes } from '@/lib/cabData';
import { calculateDistanceMatrix } from '@/lib/distanceService';
import { buildVehicleFareLinesForGuestTrack } from '@/lib/guestSearchFareLines';
import { matchTourPackageFromLocationText } from '@/lib/availableTours';
import { validateSmartBudgetSpecialRequests } from '@/lib/smartBudgetChatGuard';
import type { CabType } from '@/types/cab';
import type { TourListItem } from '@/types/tour';
import { tourDetailAPI } from '@/services/api/tourDetailAPI';
import { smartBudgetAPI } from '@/services/api/smartBudgetAPI';
import {
  SMART_BUDGET_DEFAULTS,
  smartBudgetMinBudgetFromWebsiteFare,
  type SmartBudgetSession,
} from '@/types/smartBudget';
import { cn } from '@/lib/utils';

const HOURLY_PACKAGE_OPTIONS = [
  { value: '8hrs-80km', label: '8 Hours / 80 KM' },
  { value: '10hrs-100km', label: '10 Hours / 100 KM' },
];

/** Matches Hero search widget: outstation ↔ airport fare switch threshold. */
const LOCAL_PAIR_MAX_KM = 35;

function haversineKm(a: Location, b: Location): number | null {
  if (!a.lat || !a.lng || !b.lat || !b.lng) return null;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * c;
}

/** Same cell padding as Hero mobile ticket (`heroTicketCellPad`) */
const TICKET_CELL_PAD = 'px-2 py-1.5';

/** Borderless infield select — matches Hero Urbania ticket row */
const TICKET_SELECT =
  'h-auto min-h-[1.25rem] w-full cursor-pointer appearance-none rounded-none border-0 bg-transparent py-0 pr-6 text-left text-[15px] font-bold leading-tight text-gray-900 outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0';

const TICKET_ROW = 'flex items-start gap-2';

type VehicleFareOption = {
  id: string;
  name: string;
  capacity: number;
  fare: number | null;
  fareText: string;
};

type PostStep = 1 | 2;

function locationLabel(loc: Location | null): string {
  if (!loc) return '';
  return (loc.address || loc.name || '').trim();
}

function parseFareText(fareText: string): number | null {
  const digits = fareText.replace(/[^\d]/g, '');
  if (!digits) return null;
  const n = Number(digits);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function fareTripTypeForTab(tab: TripSelectorTab): 'outstation' | 'local' | 'airport' | 'tour' {
  if (tab === 'custom') return 'outstation';
  return tab;
}

function locationInputTripType(tab: TripSelectorTab): 'outstation' | 'local' | 'airport' | 'tour' | 'custom' {
  return tab;
}

function formatInr(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

function tripTypeLabel(tab: TripSelectorTab): string {
  switch (tab) {
    case 'outstation':
      return 'Outstation';
    case 'local':
      return 'Hourly rental';
    case 'airport':
      return 'Airport';
    case 'tour':
      return 'Tour';
    case 'custom':
      return 'Custom itinerary';
    default: {
      const _exhaustive: never = tab;
      return _exhaustive;
    }
  }
}

function locationFromLabel(label: string): Location | null {
  const text = label.trim();
  if (!text) return null;
  return {
    id: `prefill_${text.slice(0, 48)}`,
    name: text,
    address: text,
    lat: 0,
    lng: 0,
    city: '',
    state: '',
    type: 'other',
    popularityScore: 50,
  };
}

function locationFromTourPackage(tour: TourListItem): Location {
  return {
    id: `tour_${tour.tourId}`,
    name: tour.tourName,
    address: tour.tourName,
    lat: 17.7215,
    lng: 83.2248,
    city: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    type: 'other',
    popularityScore: 50,
    isInVizag: true,
  };
}

function tourPriceForCab(tour: TourListItem, cabId: string): number | null {
  const pricing = tour.pricing || {};
  const direct = pricing[cabId] ?? pricing[cabId.toLowerCase()];
  if (typeof direct === 'number' && direct > 0) return direct;
  const matchKey = Object.keys(pricing).find((k) => k.toLowerCase() === cabId.toLowerCase());
  if (!matchKey) return null;
  const n = pricing[matchKey];
  return typeof n === 'number' && n > 0 ? n : null;
}

function inferTripTabFromSession(session: SmartBudgetSession): TripSelectorTab {
  const notes = (session.special_requests || '').toLowerCase();
  if (notes.includes('custom itinerary') || notes.includes('trip: custom')) return 'custom';
  if (notes.includes('trip: local') || /hours\s*\/\s*\d+\s*km/i.test(session.drop_location || '')) {
    return 'local';
  }
  if (notes.includes('trip: airport')) return 'airport';
  if (notes.includes('trip: tour')) return 'tour';
  return 'outstation';
}

function stripPrefillNotes(special: string | null | undefined): string {
  if (!special) return '';
  return special
    .split(' · ')
    .filter((part) => {
      const p = part.trim().toLowerCase();
      return (
        !p.startsWith('trip:') &&
        !p.startsWith('mode:') &&
        !p.startsWith('package:') &&
        !p.startsWith('distance:') &&
        !p.startsWith('website fare:') &&
        !p.startsWith('itinerary:') &&
        !p.startsWith('return:')
      );
    })
    .join(' · ')
    .trim();
}

function extractEstimatedKmNote(special: string | null | undefined): string {
  if (!special) return '';
  const match = special.match(/Distance:\s*~?([\d.]+)\s*km/i);
  if (!match?.[1]) return '';
  const n = Math.round(Number(match[1]));
  return Number.isFinite(n) && n > 0 ? String(n) : '';
}

function extractItineraryNote(special: string | null | undefined): string {
  if (!special) return '';
  const match = special.match(/Itinerary:\s*(.+?)(?:\s*·|$)/i);
  return match?.[1]?.trim() || '';
}

export function CustomerPostTripForm({
  customerName,
  customerPhone,
  onCreated,
  prefillFromSession = null,
}: {
  customerName: string;
  customerPhone: string;
  onCreated: (session: SmartBudgetSession) => void;
  /** When set (e.g. Republish), prefill trip particulars from an existing booking. */
  prefillFromSession?: SmartBudgetSession | null;
}) {
  const [step, setStep] = useState<PostStep>(1);
  const [tripType, setTripType] = useState<TripSelectorTab>('outstation');
  const [tripMode, setTripMode] = useState<TripMode>('one-way');
  const [hourlyPackage, setHourlyPackage] = useState('8hrs-80km');
  const [pickupLocation, setPickupLocation] = useState<Location | null>(null);
  const [dropLocation, setDropLocation] = useState<Location | null>(null);
  const [tripDate, setTripDate] = useState<Date | undefined>(new Date());
  /** Round-trip return — same role as Hero `returnDate` (outstation / tour / custom). */
  const [returnDate, setReturnDate] = useState<Date | undefined>(undefined);
  const [name, setName] = useState(customerName);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [passengers, setPassengers] = useState('4');
  const [budget, setBudget] = useState('');
  const [websiteFare, setWebsiteFare] = useState<number | null>(null);
  const [websiteFareText, setWebsiteFareText] = useState<string | null>(null);
  const [specialRequests, setSpecialRequests] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [websiteVehicles, setWebsiteVehicles] = useState<CabType[]>([]);
  const [vehicleOptions, setVehicleOptions] = useState<VehicleFareOption[]>([]);
  const [faresLoading, setFaresLoading] = useState(false);
  const [routeDistanceKm, setRouteDistanceKm] = useState(0);
  /** Custom itinerary only — user-entered estimate (no matrix km). */
  const [estimatedKm, setEstimatedKm] = useState('');
  const [isTabSwitching, setIsTabSwitching] = useState(false);
  const [budgetMinPercent, setBudgetMinPercent] = useState(
    SMART_BUDGET_DEFAULTS.budgetMinOfWebsiteFarePercent
  );
  const [prefillApplied, setPrefillApplied] = useState(false);
  const [tourPackages, setTourPackages] = useState<TourListItem[]>([]);
  const [tourPackagesLoading, setTourPackagesLoading] = useState(false);
  const [specialRequestsGuardHint, setSpecialRequestsGuardHint] = useState<string | null>(null);

  const isCustom = tripType === 'custom';
  const needsDrop = tripType === 'outstation' || tripType === 'airport';
  const showOptionalDrop = isCustom;
  const showRouteRail = needsDrop || showOptionalDrop;
  const showReturnDate =
    tripMode === 'round-trip' &&
    (tripType === 'outstation' || tripType === 'tour' || isCustom);
  const customEstimatedKm = isCustom ? Math.max(0, Math.round(Number(estimatedKm)) || 0) : 0;
  /**
   * Custom: only the user estimate (not pickup→drop matrix).
   * Other tabs: one-way matrix km; round trip shows ×2 like homepage Hero.
   */
  const displayRouteDistanceKm = isCustom
    ? customEstimatedKm
    : showReturnDate && routeDistanceKm > 0
      ? routeDistanceKm * 2
      : routeDistanceKm;

  const handleTripModeChange = (mode: TripMode) => {
    setTripMode(mode);
    if (mode === 'one-way') {
      setReturnDate(undefined);
      return;
    }
    setReturnDate((prev) => {
      const start = tripDate || new Date();
      const minReturn = new Date(start.getTime() + 60 * 60 * 1000);
      if (!prev || prev < minReturn) return minReturn;
      return prev;
    });
  };

  const applyTourPackage = (tour: TourListItem | null) => {
    if (!tour) {
      setDropLocation(null);
      if (tripType === 'tour') setRouteDistanceKm(0);
      return;
    }
    setDropLocation(locationFromTourPackage(tour));
    setRouteDistanceKm(tour.distance > 0 ? tour.distance : 0);
  };

  /** Homepage-style: tour destinations typed on Outstation switch to Tour package. */
  const switchToTourPackage = (tour: TourListItem, fromLabel: string) => {
    setIsTabSwitching(true);
    toast.info(`“${fromLabel}” is a tour destination — switched to Tour packages.`);
    setTripType('tour');
    applyTourPackage(tour);
    setSelectedVehicleId('');
    setVehicleType('');
    setWebsiteFare(null);
    setWebsiteFareText(null);
    window.setTimeout(() => setIsTabSwitching(false), 800);
  };

  const handleDropLocationChange = (loc: Location | null) => {
    if (
      loc &&
      !isTabSwitching &&
      (tripType === 'outstation' || tripType === 'airport') &&
      tourPackages.length > 0
    ) {
      const label = locationLabel(loc) || loc.name || '';
      const match = matchTourPackageFromLocationText(label, tourPackages);
      if (match) {
        switchToTourPackage(match, label || match.tourName);
        return;
      }
    }
    setDropLocation(loc);
  };

  const selectedTourId =
    tripType === 'tour' && dropLocation?.id?.startsWith('tour_')
      ? dropLocation.id.replace(/^tour_/, '')
      : '';
  const selectedTourPackage =
    selectedTourId && tourPackages.length > 0
      ? tourPackages.find((t) => t.tourId === selectedTourId) || null
      : null;

  const minBudget = smartBudgetMinBudgetFromWebsiteFare(websiteFare, {
    isCustomItinerary: isCustom,
    minPercent: budgetMinPercent,
  });

  // Same as homepage Hero: ≤35 km pair uses airport fares; >35 km uses outstation.
  useEffect(() => {
    if (isTabSwitching || !pickupLocation || !dropLocation) return;
    if (tripType !== 'outstation' && tripType !== 'airport') return;
    const calculatedDistance = haversineKm(pickupLocation, dropLocation);
    if (calculatedDistance == null) return;

    if (tripType === 'outstation' && calculatedDistance <= LOCAL_PAIR_MAX_KM) {
      setIsTabSwitching(true);
      toast.info(
        `Route is ${calculatedDistance.toFixed(1)} km (within ${LOCAL_PAIR_MAX_KM} km). Switched to Airport for local rates.`
      );
      setTripType('airport');
      const t = window.setTimeout(() => setIsTabSwitching(false), 1000);
      return () => window.clearTimeout(t);
    }
    if (tripType === 'airport' && calculatedDistance > LOCAL_PAIR_MAX_KM) {
      setIsTabSwitching(true);
      toast.info(
        `Route is ${calculatedDistance.toFixed(1)} km (beyond ${LOCAL_PAIR_MAX_KM} km). Switched to Outstation.`
      );
      setTripType('outstation');
      const t = window.setTimeout(() => setIsTabSwitching(false), 1000);
      return () => window.clearTimeout(t);
    }
  }, [pickupLocation, dropLocation, tripType, isTabSwitching]);

  /** If tours load after the user already picked a tour destination on Outstation, switch then. */
  useEffect(() => {
    if (isTabSwitching || tourPackages.length === 0) return;
    if (tripType !== 'outstation' && tripType !== 'airport') return;
    if (!dropLocation) return;
    const label = locationLabel(dropLocation) || dropLocation.name || '';
    const match = matchTourPackageFromLocationText(label, tourPackages);
    if (!match) return;
    switchToTourPackage(match, label || match.tourName);
  }, [tourPackages, dropLocation, tripType, isTabSwitching]);

  useEffect(() => {
    if (!prefillFromSession || prefillApplied) return;
    const tab = inferTripTabFromSession(prefillFromSession);
    setTripType(tab);
    const notes = (prefillFromSession.special_requests || '').toLowerCase();
    setTripMode(notes.includes('round trip') ? 'round-trip' : 'one-way');
    if (tab === 'local') {
      const drop = prefillFromSession.drop_location || '';
      const pkg = HOURLY_PACKAGE_OPTIONS.find((o) => drop.includes(o.label) || drop.includes(o.value));
      if (pkg) setHourlyPackage(pkg.value);
    }
    setPickupLocation(locationFromLabel(prefillFromSession.pickup || ''));
    if (tab === 'outstation' || tab === 'airport' || tab === 'custom' || tab === 'tour') {
      const drop = prefillFromSession.drop_location || '';
      if (drop && drop !== 'Custom itinerary' && drop !== 'Tour package') {
        setDropLocation(locationFromLabel(drop));
      }
    }
    // Republish: keep route/vehicle/budget, but start time should be now (user can still edit).
    setTripDate(new Date());
    setReturnDate(undefined);
    if (prefillFromSession.passengers) setPassengers(String(prefillFromSession.passengers));
    if (prefillFromSession.customer_budget != null) {
      setBudget(String(Math.round(Number(prefillFromSession.customer_budget))));
    }
    if (tab === 'custom') {
      setSpecialRequests(extractItineraryNote(prefillFromSession.special_requests) || '');
      setEstimatedKm(extractEstimatedKmNote(prefillFromSession.special_requests));
    } else {
      setSpecialRequests(stripPrefillNotes(prefillFromSession.special_requests));
      setEstimatedKm('');
    }
    setVehicleType(prefillFromSession.vehicle_type || '');
    setStep(1);
    setPrefillApplied(true);
  }, [prefillFromSession, prefillApplied]);

  useEffect(() => {
    if (!prefillFromSession?.vehicle_type || vehicleOptions.length === 0) return;
    const match = vehicleOptions.find(
      (v) => v.name.toLowerCase() === prefillFromSession.vehicle_type.toLowerCase()
    );
    if (match && selectedVehicleId !== match.id) {
      setSelectedVehicleId(match.id);
    }
  }, [prefillFromSession, vehicleOptions, selectedVehicleId]);

  useEffect(() => {
    let cancelled = false;
    void smartBudgetAPI.public
      .getConfig()
      .then((cfg) => {
        if (!cancelled && cfg.budget_min_of_website_fare_percent > 0) {
          setBudgetMinPercent(cfg.budget_min_of_website_fare_percent);
        }
      })
      .catch(() => {
        /* keep default until API deployed */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const vehicles = await loadCabTypes(false, true);
        if (cancelled) return;
        setWebsiteVehicles(vehicles.filter((v) => v.isActive !== false && v.name));
      } catch {
        if (!cancelled) {
          setWebsiteVehicles([]);
          toast.error('Could not load website vehicles');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setTourPackagesLoading(true);
    void tourDetailAPI
      .getTours()
      .then((list) => {
        if (!cancelled) setTourPackages(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!cancelled) setTourPackages([]);
      })
      .finally(() => {
        if (!cancelled) setTourPackagesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (websiteVehicles.length === 0) {
      setVehicleOptions([]);
      setRouteDistanceKm(0);
      return;
    }

    let cancelled = false;

    void (async () => {
      setFaresLoading(true);
      let distanceKm = 0;

      if (tripType === 'tour' && selectedTourPackage) {
        distanceKm = selectedTourPackage.distance > 0 ? selectedTourPackage.distance : 0;
        if (cancelled) return;
        setRouteDistanceKm(distanceKm);
        setVehicleOptions(
          websiteVehicles.map((cab) => {
            const fare = tourPriceForCab(selectedTourPackage, cab.id);
            return {
              id: cab.id,
              name: cab.name,
              capacity: cab.capacity || 4,
              fare,
              fareText: fare != null ? formatInr(fare) : 'Fare n/a',
            };
          })
        );
        setFaresLoading(false);
        return;
      }

      if (needsDrop && pickupLocation && dropLocation) {
        try {
          const result = await calculateDistanceMatrix(pickupLocation, dropLocation);
          distanceKm = result?.distance ?? 0;
        } catch {
          distanceKm = 0;
        }
      } else if (tripType === 'local') {
        distanceKm = hourlyPackage === '10hrs-100km' ? 100 : 80;
      } else if (isCustom) {
        // Custom never uses matrix km — only the customer estimate when provided.
        distanceKm = customEstimatedKm;
      }

      if (cancelled) return;
      if (!isCustom) {
        setRouteDistanceKm(distanceKm);
      } else {
        setRouteDistanceKm(0);
      }

      try {
        const lines = await buildVehicleFareLinesForGuestTrack(websiteVehicles, {
          tripType: fareTripTypeForTab(tripType),
          tripMode,
          hourlyPackage,
          distance: distanceKm,
          pickupDate: tripDate || new Date(),
          returnDate: showReturnDate ? returnDate ?? null : undefined,
        });

        if (cancelled) return;

        setVehicleOptions(
          websiteVehicles.map((cab, index) => {
            const line = lines[index];
            const fareText = line?.fareText || 'Fare n/a';
            return {
              id: cab.id,
              name: cab.name,
              capacity: cab.capacity || 4,
              fare: parseFareText(fareText),
              fareText,
            };
          })
        );
      } catch {
        if (!cancelled) {
          setVehicleOptions(
            websiteVehicles.map((cab) => ({
              id: cab.id,
              name: cab.name,
              capacity: cab.capacity || 4,
              fare: null,
              fareText: 'Fare n/a',
            }))
          );
        }
      } finally {
        if (!cancelled) setFaresLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    websiteVehicles,
    tripType,
    tripMode,
    hourlyPackage,
    tripDate,
    returnDate,
    showReturnDate,
    pickupLocation,
    dropLocation,
    needsDrop,
    isCustom,
    customEstimatedKm,
    selectedTourPackage,
  ]);

  /** Keep return at least 1h after trip start when round-trip is active. */
  useEffect(() => {
    if (!showReturnDate || !tripDate) return;
    const minReturn = new Date(tripDate.getTime() + 60 * 60 * 1000);
    setReturnDate((prev) => {
      if (!prev || prev < minReturn) return minReturn;
      return prev;
    });
  }, [showReturnDate, tripDate]);

  useEffect(() => {
    if (!selectedVehicleId) {
      setWebsiteFare(null);
      setWebsiteFareText(null);
      setVehicleType('');
      return;
    }
    const opt = vehicleOptions.find((o) => o.id === selectedVehicleId);
    if (!opt) return;
    setVehicleType(opt.name);
    setPassengers(String(opt.capacity || 4));
    setWebsiteFare(opt.fare);
    setWebsiteFareText(opt.fare != null ? opt.fareText : 'Website fare not available for this route yet');
  }, [selectedVehicleId, vehicleOptions]);

  const handleTabChange = (tab: TripSelectorTab) => {
    setTripType(tab);
    setPickupLocation(null);
    setDropLocation(null);
    setRouteDistanceKm(0);
    setSelectedVehicleId('');
    setVehicleType('');
    setWebsiteFare(null);
    setWebsiteFareText(null);
    setStep(1);
    if (tab !== 'outstation' && tab !== 'tour' && tab !== 'custom') {
      setTripMode('one-way');
      setReturnDate(undefined);
    }
    if (tab === 'custom') {
      setSpecialRequests('');
      setEstimatedKm('');
      setRouteDistanceKm(0);
    } else {
      setEstimatedKm('');
    }
  };

  const handleVehicleSelect = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
    if (!vehicleId) {
      setVehicleType('');
      setWebsiteFare(null);
      setWebsiteFareText(null);
    }
  };

  const validateStep1 = (): boolean => {
    const pickup = locationLabel(pickupLocation);
    if (!pickup) {
      toast.error('Enter pickup location');
      return false;
    }
    if (needsDrop && !locationLabel(dropLocation)) {
      toast.error('Enter drop location');
      return false;
    }
    if (tripType === 'tour' && !selectedTourId) {
      toast.error('Select a tour package');
      return false;
    }
    if (isCustom && !specialRequests.trim()) {
      toast.error('Describe your custom itinerary');
      return false;
    }
    if (isCustom && customEstimatedKm <= 0) {
      toast.error('Enter estimated kilometres for this itinerary');
      return false;
    }
    if (!vehicleType.trim()) {
      toast.error('Select a vehicle');
      return false;
    }
    if (!tripDate) {
      toast.error('Pick departure date & time');
      return false;
    }
    if (showReturnDate) {
      if (!returnDate) {
        toast.error('Pick return date & time');
        return false;
      }
      if (returnDate < tripDate) {
        toast.error('Return must be after trip start');
        return false;
      }
    }
    return true;
  };

  const canContinueStep1 =
    Boolean(locationLabel(pickupLocation)) &&
    (!needsDrop || Boolean(locationLabel(dropLocation))) &&
    (tripType !== 'tour' || Boolean(selectedTourId)) &&
    (!isCustom || Boolean(specialRequests.trim())) &&
    (!isCustom || customEstimatedKm > 0) &&
    Boolean(selectedVehicleId && vehicleType.trim()) &&
    Boolean(tripDate) &&
    (!showReturnDate || Boolean(returnDate));

  const goToStep2 = () => {
    if (!validateStep1()) return;
    setStep(2);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (step !== 2) {
      goToStep2();
      return;
    }
    if (!validateStep1()) {
      setStep(1);
      return;
    }
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    const budgetNum = Number(budget);
    if (!budgetNum || budgetNum <= 0) {
      toast.error('Enter your budget');
      return;
    }
    if (minBudget != null && budgetNum < minBudget) {
      toast.error(`Budget must be at least ${formatInr(minBudget)}`);
      return;
    }
    if (!tripDate) {
      toast.error('Pick departure date & time');
      return;
    }
    if (!isCustom) {
      const notesGuard = validateSmartBudgetSpecialRequests(specialRequests);
      if (!notesGuard.ok) {
        setSpecialRequestsGuardHint(notesGuard.reason);
        toast.error(notesGuard.reason);
        return;
      }
    }

    const pickup = locationLabel(pickupLocation);
    let drop = locationLabel(dropLocation);
    if (tripType === 'local') {
      const pkg = HOURLY_PACKAGE_OPTIONS.find((o) => o.value === hourlyPackage);
      drop = pkg?.label || hourlyPackage;
    } else if (tripType === 'tour') {
      drop = selectedTourPackage?.tourName || drop || 'Tour package';
    } else if (isCustom && !drop) {
      drop = 'Custom itinerary';
    }

    const notes: string[] = [];
    if (isCustom) notes.push('Trip: custom itinerary');
    else notes.push(`Trip: ${tripType}`);
    if (tripType === 'outstation' || isCustom || tripType === 'tour') {
      notes.push(tripMode === 'round-trip' ? 'Mode: round trip' : 'Mode: one way');
    }
    if (showReturnDate && returnDate) {
      notes.push(`Return: ${format(returnDate, "d MMM yyyy 'at' h:mm a")}`);
    }
    if (tripType === 'local') notes.push(`Package: ${drop}`);
    if (tripType === 'tour' && selectedTourPackage) {
      notes.push(`Package: ${selectedTourPackage.tourName}`);
    }
    if (
      displayRouteDistanceKm > 0 &&
      (needsDrop || tripType === 'local' || tripType === 'tour' || isCustom)
    ) {
      notes.push(
        isCustom
          ? `Distance: ~${Math.round(displayRouteDistanceKm)} km (estimated)`
          : showReturnDate && routeDistanceKm > 0
            ? `Distance: ~${Math.round(displayRouteDistanceKm)} km (round trip · ${Math.round(routeDistanceKm)} km one way)`
            : `Distance: ~${Math.round(displayRouteDistanceKm)} km`
      );
    }
    if (websiteFare != null && websiteFareText) {
      notes.push(`Website fare: ${websiteFareText}`);
    }
    if (isCustom && specialRequests.trim()) {
      notes.push(`Itinerary: ${specialRequests.trim()}`);
    } else if (specialRequests.trim()) {
      notes.push(specialRequests.trim());
    }

    setSubmitting(true);
    try {
      const session = await smartBudgetAPI.customer.createTrip({
        pickup,
        drop_location: drop || pickup,
        trip_datetime: format(tripDate, "yyyy-MM-dd'T'HH:mm"),
        vehicle_type: vehicleType.trim(),
        passengers: Math.max(1, Number(passengers) || 1),
        customer_budget: budgetNum,
        quoted_fare: websiteFare,
        is_custom_itinerary: isCustom,
        customer_name: name.trim(),
        special_requests: notes.join(' · '),
        link_ttl_minutes: SMART_BUDGET_DEFAULTS.linkTtlMinutes,
      });
      toast.success('Trip posted — Vizag Taxi Hub notified first (vendors after 3 min if not accepted)');
      onCreated(session);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not post trip');
    } finally {
      setSubmitting(false);
    }
  };

  const packageLabel =
    HOURLY_PACKAGE_OPTIONS.find((o) => o.value === hourlyPackage)?.label || hourlyPackage;
  const summaryLines: Array<{ label: string; value: string }> = [
    { label: 'Trip', value: tripTypeLabel(tripType) },
  ];
  if (tripType === 'outstation' || tripType === 'tour' || isCustom) {
    summaryLines.push({
      label: 'Mode',
      value: tripMode === 'round-trip' ? 'Round trip' : 'One way',
    });
  }
  summaryLines.push({ label: 'From', value: locationLabel(pickupLocation) || '—' });
  if (tripType === 'tour') {
    summaryLines.push({
      label: 'Package',
      value: selectedTourPackage?.tourName || locationLabel(dropLocation) || '—',
    });
  } else if (showRouteRail) {
    summaryLines.push({
      label: isCustom ? 'Final drop' : 'To',
      value: locationLabel(dropLocation) || (isCustom ? 'Not set' : '—'),
    });
  }
  if (tripType === 'local') {
    summaryLines.push({ label: 'Package', value: packageLabel });
  }
  if (displayRouteDistanceKm > 0 && (needsDrop || tripType === 'local' || tripType === 'tour' || isCustom)) {
    summaryLines.push({
      label: isCustom ? 'Est. km' : 'Distance',
      value: isCustom
        ? `~${Math.round(displayRouteDistanceKm)} km (estimated)`
        : showReturnDate && routeDistanceKm > 0
          ? `~${Math.round(displayRouteDistanceKm)} km (round trip)`
          : `~${Math.round(displayRouteDistanceKm)} km`,
    });
  }
  if (isCustom && specialRequests.trim()) {
    summaryLines.push({ label: 'Itinerary', value: specialRequests.trim() });
  }
  summaryLines.push({
    label: 'Trip start',
    value: tripDate ? format(tripDate, "d MMM, yyyy 'at' h:mm a") : '—',
  });
  if (showReturnDate) {
    summaryLines.push({
      label: 'Return',
      value: returnDate ? format(returnDate, "d MMM, yyyy 'at' h:mm a") : '—',
    });
  }
  summaryLines.push({ label: 'Vehicle', value: vehicleType || '—' });
  summaryLines.push({ label: 'Passengers', value: passengers || '—' });

  return (
    <div className="bg-white">
      <div className="mb-3">
        <h2 className="text-lg font-semibold text-slate-900">Post a trip</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {prefillFromSession
            ? 'Republishing — adjust time or other details, then continue.'
            : step === 1
              ? 'Pick trip type and details, then continue to set your budget.'
              : 'Confirm your budget — Vizag Taxi Hub reviews first, then vendors if skipped.'}
        </p>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
        {step === 1 ? (
          <>
            <TabTripSelector
              selectedTab={tripType}
              tripMode={tripMode}
              onTabChange={handleTabChange}
              onTripModeChange={handleTripModeChange}
              onClearLocations={() => {
                setPickupLocation(null);
                setDropLocation(null);
                setRouteDistanceKm(0);
              }}
              visibleTabs={['outstation', 'local', 'airport', 'tour', 'custom']}
              showTripModeToggle
              hideUrbaniaPromo
              hidePromoSlider
              suppressMobileCardChrome
              urbaniaMobileTripTiles
            />

            <div className="divide-y divide-gray-200 overflow-hidden rounded-xl border border-gray-200 bg-white">
              {showRouteRail ? (
                <div className="flex min-h-0 items-stretch bg-white">
                  <div className="relative w-[14px] shrink-0 self-stretch py-1.5" aria-hidden>
                    <div className="absolute left-1/2 top-[1.25rem] h-2 w-2 -translate-x-1/2 rounded-full border-2 border-blue-600 bg-white" />
                    <div className="absolute bottom-[1.25rem] left-1/2 h-2 w-2 -translate-x-1/2 rounded-full border-2 border-blue-600 bg-white" />
                    <div className="absolute left-1/2 top-[1.85rem] bottom-[1.85rem] w-0 -translate-x-1/2 border-l-2 border-dashed border-blue-500/55" />
                  </div>
                  <div className="min-w-0 flex-1 divide-y divide-gray-200">
                    <LocationInput
                      id="cust-pickup"
                      label="From"
                      placeholder="Enter pickup location"
                      value={pickupLocation ? convertToApiLocation(pickupLocation) : undefined}
                      onLocationChange={setPickupLocation}
                      isPickupLocation
                      tripType={locationInputTripType(tripType)}
                      variant="infield"
                      className={TICKET_CELL_PAD}
                      hideLeadingIcon
                      required
                    />
                    <LocationInput
                      id="cust-drop"
                      label={isCustom ? 'Final drop' : 'To'}
                      placeholder={
                        isCustom ? 'Enter final drop if known' : 'Enter destination location'
                      }
                      value={dropLocation ? convertToApiLocation(dropLocation) : undefined}
                      onLocationChange={handleDropLocationChange}
                      isPickupLocation={false}
                      tripType={locationInputTripType(tripType)}
                      variant="infield"
                      className={TICKET_CELL_PAD}
                      hideLeadingIcon
                      required={!isCustom}
                      onRequestOutstationSwitch={() => handleTabChange('outstation')}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <LocationInput
                    id="cust-pickup"
                    label="From"
                    placeholder="Enter pickup location"
                    value={pickupLocation ? convertToApiLocation(pickupLocation) : undefined}
                    onLocationChange={setPickupLocation}
                    isPickupLocation
                    tripType={locationInputTripType(tripType)}
                    variant="infield"
                    className={TICKET_CELL_PAD}
                    required
                  />
                  {tripType === 'tour' && (
                    <div className={cn(TICKET_ROW, TICKET_CELL_PAD, 'w-full')}>
                      <Car className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" aria-hidden />
                      <div className="flex min-w-0 flex-1 flex-col gap-0 leading-none">
                        <label
                          htmlFor="cust-tour-pkg"
                          className="text-[11px] font-medium leading-none text-gray-500"
                        >
                          Tour package <span className="ml-0.5 text-red-500">*</span>
                        </label>
                        <div className="relative mt-0.5 w-full">
                          <select
                            id="cust-tour-pkg"
                            className={TICKET_SELECT}
                            value={selectedTourId}
                            onChange={(e) => {
                              const id = e.target.value;
                              const tour = tourPackages.find((t) => t.tourId === id) || null;
                              applyTourPackage(tour);
                            }}
                            required
                            disabled={tourPackagesLoading && tourPackages.length === 0}
                          >
                            <option value="">
                              {tourPackagesLoading ? 'Loading packages…' : 'Select a tour package'}
                            </option>
                            {tourPackages.map((tour) => (
                              <option key={tour.tourId} value={tour.tourId}>
                                {tour.tourName}
                              </option>
                            ))}
                          </select>
                          <ChevronDown
                            className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 opacity-60"
                            aria-hidden
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  {tripType === 'local' && (
                    <div className={cn(TICKET_ROW, TICKET_CELL_PAD, 'w-full')}>
                      <Clock className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" aria-hidden />
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="text-[11px] font-medium leading-none text-gray-500">Package</span>
                        <div className="relative mt-0.5 w-full">
                          <select
                            id="cust-pkg"
                            className={TICKET_SELECT}
                            value={hourlyPackage}
                            onChange={(e) => setHourlyPackage(e.target.value)}
                            aria-label="Hourly package"
                          >
                            {HOURLY_PACKAGE_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                          <ChevronDown
                            className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 opacity-60"
                            aria-hidden
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {isCustom && (
                <div className={cn(TICKET_CELL_PAD, 'w-full space-y-1.5')}>
                  <label htmlFor="cust-itinerary" className="text-[11px] font-medium leading-none text-gray-500">
                    Custom itinerary <span className="ml-0.5 text-red-500">*</span>
                  </label>
                  <Textarea
                    id="cust-itinerary"
                    className="min-h-[4.5rem] resize-y border-0 bg-transparent px-0 py-0 text-[15px] font-medium leading-snug text-gray-900 shadow-none placeholder:font-normal placeholder:text-gray-500 focus-visible:ring-0"
                    rows={3}
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    placeholder="Day 1: Vizag → Araku · Day 2: Lambasingi · Day 3: return…"
                    required
                  />
                </div>
              )}

              {isCustom ? (
                <div className={cn(TICKET_ROW, TICKET_CELL_PAD, 'w-full')}>
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" aria-hidden />
                  <div className="flex min-w-0 flex-1 flex-col gap-0 leading-none">
                    <label
                      htmlFor="cust-estimated-km"
                      className="text-[11px] font-medium leading-none text-gray-500"
                    >
                      Estimated kilometres <span className="ml-0.5 text-red-500">*</span>
                    </label>
                    <Input
                      id="cust-estimated-km"
                      className="mt-0.5 h-auto min-h-[1.25rem] border-0 px-0 py-0 text-[15px] font-bold leading-tight text-gray-900 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                      type="number"
                      min={1}
                      step={1}
                      inputMode="numeric"
                      value={estimatedKm}
                      onChange={(e) => setEstimatedKm(e.target.value)}
                      placeholder="e.g. 1800"
                      required
                    />
                    <p className="mt-1 text-[11px] font-normal text-muted-foreground">
                      Enter your best estimate for the full itinerary (we don’t auto-calculate custom routes).
                    </p>
                  </div>
                </div>
              ) : (
                displayRouteDistanceKm > 0 &&
                (showRouteRail || tripType === 'local' || tripType === 'tour') && (
                  <p className={cn(TICKET_CELL_PAD, 'text-xs text-muted-foreground')}>
                    Distance ~{Math.round(displayRouteDistanceKm)} km
                    {showReturnDate && routeDistanceKm > 0
                      ? ` round trip (~${Math.round(routeDistanceKm)} km one way)`
                      : ''}
                    {tripType === 'airport' || tripType === 'outstation'
                      ? ' · website fares use this route'
                      : ''}
                  </p>
                )
              )}

              <DateTimePicker
                label="Trip start"
                date={tripDate}
                onDateChange={setTripDate}
                minDate={new Date()}
                variant="infield"
                className={cn(TICKET_CELL_PAD, 'w-full')}
              />

              {showReturnDate ? (
                <DateTimePicker
                  label="Return"
                  date={returnDate}
                  onDateChange={setReturnDate}
                  minDate={tripDate || new Date()}
                  variant="infield"
                  className={cn(TICKET_CELL_PAD, 'w-full')}
                />
              ) : null}
              <div className={cn(TICKET_ROW, TICKET_CELL_PAD, 'w-full')}>
                <Car className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" aria-hidden />
                <div className="flex min-w-0 flex-1 flex-col gap-0 leading-none">
                  <label htmlFor="cust-vehicle" className="text-[11px] font-medium leading-none text-gray-500">
                    Vehicle <span className="ml-0.5 text-red-500">*</span>
                  </label>
                  <div className="relative mt-0.5 w-full">
                    <select
                      id="cust-vehicle"
                      className={TICKET_SELECT}
                      value={selectedVehicleId}
                      onChange={(e) => handleVehicleSelect(e.target.value)}
                      required
                      disabled={faresLoading && vehicleOptions.length === 0}
                    >
                      <option value="">
                        {faresLoading ? 'Loading website vehicles…' : 'Select vehicle'}
                      </option>
                      {vehicleOptions.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 opacity-60"
                      aria-hidden
                    />
                  </div>
                </div>
              </div>
              <div className={cn(TICKET_ROW, TICKET_CELL_PAD, 'w-full')}>
                <Users className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" aria-hidden />
                <div className="flex min-w-0 flex-1 flex-col gap-0 leading-none">
                  <label htmlFor="cust-pax" className="text-[11px] font-medium leading-none text-gray-500">
                    Passengers
                  </label>
                  <Input
                    id="cust-pax"
                    className="mt-0.5 h-auto min-h-[1.25rem] border-0 px-0 py-0 text-[15px] font-bold leading-tight text-gray-900 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    type="number"
                    min={1}
                    value={passengers}
                    onChange={(e) => setPassengers(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <Button
              type="button"
              onClick={goToStep2}
              disabled={!canContinueStep1}
              className="axis-search-btn mt-1 flex h-11 w-full items-center justify-center px-4 text-sm uppercase tracking-wide shadow-md disabled:opacity-60"
            >
              Continue
            </Button>
          </>
        ) : (
          <>
            <div className="rounded-xl border border-gray-200 bg-white p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">Trip summary</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 px-2 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
                  onClick={() => setStep(1)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
              </div>
              <dl className="space-y-1.5 text-sm">
                {summaryLines.map((line) => (
                  <div key={line.label} className="flex gap-2">
                    <dt className="w-24 shrink-0 text-xs font-medium text-muted-foreground">{line.label}</dt>
                    <dd className="min-w-0 flex-1 break-words font-medium text-slate-900">{line.value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {!isCustom ? (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="cust-website-fare">Website fare (₹)</Label>
                  <Input
                    id="cust-website-fare"
                    className="h-11 bg-slate-50 font-semibold text-slate-900"
                    value={
                      websiteFare != null
                        ? websiteFare.toLocaleString('en-IN')
                        : faresLoading
                          ? 'Loading…'
                          : 'Not available yet'
                    }
                    readOnly
                  />
                  {websiteFare == null && !faresLoading ? (
                    <p className="text-xs text-amber-700">
                      {websiteFareText || 'Website fare not available yet'}
                      {needsDrop ? ' — complete pickup & drop first.' : ''}
                    </p>
                  ) : null}
                </div>
              ) : null}
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="cust-budget">
                  Your budget (₹) <span className="text-destructive">*</span>
                  {minBudget != null ? (
                    <span className="ml-1 font-normal text-muted-foreground">
                      · min {formatInr(minBudget)}
                    </span>
                  ) : null}
                </Label>
                <Input
                  id="cust-budget"
                  className="h-11"
                  type="number"
                  min={minBudget ?? 1}
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder={minBudget != null ? `Minimum ${minBudget}` : 'e.g. 2800'}
                  required
                />
                {isCustom ? (
                  <p className="text-xs text-muted-foreground">
                    Custom itinerary — no website-fare minimum.
                  </p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cust-name">
                  Your name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="cust-name"
                  className="h-11"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Full name"
                />
              </div>
              <div className="space-y-1.5">
                <Label>WhatsApp phone</Label>
                <Input className="h-11" value={customerPhone} disabled />
              </div>
              {!isCustom && (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="cust-notes">Special requests</Label>
                  <Textarea
                    id="cust-notes"
                    className="text-sm"
                    rows={2}
                    value={specialRequests}
                    onChange={(e) => {
                      const next = e.target.value;
                      setSpecialRequests(next);
                      const check = validateSmartBudgetSpecialRequests(next);
                      setSpecialRequestsGuardHint(next.trim() && !check.ok ? check.reason : null);
                    }}
                    placeholder="Child seat, luggage, etc. — no phone numbers"
                    aria-invalid={Boolean(specialRequestsGuardHint)}
                  />
                  {specialRequestsGuardHint ? (
                    <p className="text-xs text-destructive">{specialRequestsGuardHint}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Phone numbers and number words are blocked (same as private chat).
                    </p>
                  )}
                </div>
              )}
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="axis-search-btn mt-1 flex h-11 w-full items-center justify-center gap-2 px-4 text-sm uppercase tracking-wide shadow-md disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                  <path
                    fillRule="evenodd"
                    d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              Post trip to Vizag Taxi Hub
            </Button>
          </>
        )}
      </form>
    </div>
  );
}
