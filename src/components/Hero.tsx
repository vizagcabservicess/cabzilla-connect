import {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
  useMemo,
  lazy,
  Suspense,
  type CSSProperties,
} from 'react';
import { LocationInput, type LocationInputHandle } from './LocationInput';
import { OutstationAddStopLink, OutstationStopRows } from './OutstationStopsEditor';
import { DateTimePicker, type DateTimePickerHandle } from './DateTimePicker';
import { CabOptions } from './CabOptions';
import { BookingSummary } from './BookingSummary';
import { Location, getVizagAirportLocations, resolveCanonicalVizagAirport } from '@/lib/locationData';
import { convertToApiLocation, createLocationChangeHandler, isLocationInVizag, isWithinTourPickupRadius } from '@/lib/locationUtils';
import {
  getServicePathForTripType,
  inferTripServiceType,
  isAirportTransferOtherEnd,
  isVizagAirportLocation,
  type CustomerTripService,
} from '@/lib/inferTripService';
import { getRestrictedAirportRouteBlock, RESTRICTED_AIRPORT_ROUTE_PHONE_DISPLAY, RESTRICTED_AIRPORT_ROUTE_PHONE_TEL, RESTRICTED_AIRPORT_ROUTES_ENABLED } from '@/lib/restrictedAirportRoutes';
import { cabTypes, formatPrice, loadCabTypes } from '@/lib/cabData';
import { hourlyPackages, getLocalPackagePrice } from '@/lib/packageData';
import { TripType, TripMode, ensureCustomerTripType } from '@/lib/tripTypes';
import { CabType } from '@/types/cab';
import { filterAvailableVehicles } from '@/utils/vehicleAvailability';
import { ChevronRight, ChevronDown, ArrowLeft, ArrowRight, X, MapPin, Edit, Users, Car, Clock, Briefcase, Snowflake, Shield, CheckCircle2, ShieldCheck, Search } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { TourTabIcon } from '@/components/icons/CabTabIcons';
import { Button } from '@/components/ui/button';
import { TabTripSelector, type TripSelectorTab } from './TabTripSelector';
import { HomeHeroBanner } from '@/components/home/HomeHeroBanner';
import { HeroValueProps } from '@/components/home/HeroValueProps';
import { MobileTrustBanner } from '@/components/home/MobileTrustBanner';
import { BOOKING_HOME_RESET_EVENT } from '@/lib/bookingSessionReset';
import { resetPageScroll, scrollToBookingWidget } from '@/lib/bookingWidgetScroll';
import { useIsMobile } from '@/hooks/use-mobile';

/** Desktop-only route map: `@react-google-maps/api` is large — keep out of initial mobile bundle. */
const GoogleMapComponent = lazy(() => import('./GoogleMapComponent'));
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { GuestDetailsForm } from './GuestDetailsForm';
import { BookingPaymentFooter } from './BookingPaymentFooter';
import { StepIndicator } from './StepIndicator';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { bookingAPI } from '@/services/api';
import { BookingRequest } from '@/types/api';
import { MobileNavigation } from './MobileNavigation';
import {
  calculateDistanceMatrix,
  calculateRouteDistance,
  estimateRoadKmAlongRoute,
  estimateRoadKmSync,
} from '@/lib/distanceService';
import {
  filledOutstationStops,
  formatViaStopsLabel,
  MAX_OUTSTATION_STOPS,
  parseStoredStops,
  routePointsWithStops,
} from '@/lib/outstationStops';

import { cn } from '@/lib/utils';
import { useGoogleMaps } from '@/providers/GoogleMapsProvider';
import { useAuth } from '@/providers/AuthProvider';
import { formatDateForAPI, coerceTripDate, isValidTripDate } from '@/lib/dateUtils';
import { countOutstationBillingDays } from '@/utils/outstationRoundTripLimits';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  OfferCampaignPopup,
  clearHomePendingOffer,
  computeOfferPricing,
  loadOfferCampaignForSearch,
  readHomePendingOffer,
} from '@/components/offers/OfferCampaignPopup';
import {
  BookingCouponSection,
  BookingOfferStickyBanner,
} from '@/components/offers/BookingCouponSection';
import type { OfferCampaignPublic } from '@/types/offerCampaign';
import { resolveOfferCampaignCategory, toOfferTravelDateYmd, toOfferTravelTimeHm, normalizeOfferTargetId, toOfferTripRoute, isOfferRouteEligible, isOfferTravelTimeEligible, isOfferTravelDateEligible, formatOfferRouteScope, formatOfferCouponWorksOn } from '@/types/offerCampaign';
import { offerCampaignAPI } from '@/services/api/offerCampaignAPI';
import {
  trackGuestSearch,
  formatDepartureForTrack,
  buildTripTypeLabelForTrack,
  buildGuestTrackRouteKey,
  formatGuestTrackDropField,
} from '@/services/trackSearchAPI';
import { buildVehicleFareLinesForGuestTrack } from '@/lib/guestSearchFareLines';
import { getAirportTransferFare } from '@/lib/airportFareForBooking';
import { WhatsAppCountryPhoneRow, defaultWhatsappCountry } from '@/components/WhatsAppCountryPhoneRow';
import type { CountryCode } from '@/lib/countryCodes';
import { generateVehicleUrl } from '@/utils/vehicleUrlUtils';
import type { TourListItem } from '@/types/tour';
import { tourDetailAPI } from '@/services/api/tourDetailAPI';
import { getTourUrl } from '@/utils/tourUrlUtils';
import { locationLooksLikeArakuTour } from '@/lib/availableTours';
import {
  getVehicleEmbedConfig,
} from '@/seo/vehicleEmbedMeta';

const URB_EMBED_STRIP_ICONS = [Users, Briefcase, Snowflake, Shield] as const;

/** Mobile vehicle embed reference: segmented USP row with vertical dividers */
function VehicleEmbedMobileFeatureBar({
  labels,
  ariaLabel,
  className,
}: {
  labels: readonly string[];
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        'flex divide-x divide-blue-200 overflow-x-auto rounded-xl border border-blue-200 bg-blue-50 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className
      )}
    >
      {labels.map((label, idx) => {
        const Icon = URB_EMBED_STRIP_ICONS[idx] ?? Users;
        return (
          <div
            key={label}
            className="flex min-w-[6.75rem] flex-1 flex-col items-center justify-center gap-1 px-1.5 py-2.5 sm:min-w-0"
          >
            <Icon className="h-4 w-4 shrink-0 text-blue-600" aria-hidden />
            <span className="text-center text-[10px] font-semibold leading-tight text-[#4f5d6a]">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

const hourlyPackageOptions = [
  { value: "8hrs-80km", label: "8 Hours / 80 KM" },
  { value: "10hrs-100km", label: "10 Hours / 100 KM" }
];

/** Match dropdown width to trigger (and never exceed the viewport) so Package/Tour menus stay on-screen. */
const heroTourPackageSelectContentProps = {
  side: 'bottom' as const,
  align: 'start' as const,
  sideOffset: 4,
  collisionPadding: 12,
  position: 'popper' as const,
  style: {
    width: 'var(--radix-select-trigger-width)',
    maxWidth: 'min(var(--radix-select-trigger-width), calc(100vw - 1.5rem))',
    minWidth: 0,
  } as CSSProperties,
  className:
    'box-border min-w-0 overflow-x-hidden [&_[data-radix-select-viewport]]:max-w-full [&_[data-radix-select-viewport]]:min-w-0 [&_[role=option]]:items-start [&_[role=option]]:whitespace-normal [&_[role=option]]:break-words [&_[role=option]]:py-2 [&_[role=option]]:leading-snug',
};

const heroMobileTourSelectTriggerDefault = cn(
  'flex h-11 min-h-[3rem] w-full items-center rounded-xl border border-slate-200/90 bg-white px-3 text-[1rem] font-semibold text-gray-900 shadow-sm',
  'hover:bg-slate-50/80',
  'focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0',
  'focus-visible:border-slate-300 focus-visible:shadow-[0_0_0_3px_rgba(15,23,42,0.06)]',
  'data-[state=open]:border-slate-300 data-[state=open]:shadow-[0_0_0_3px_rgba(15,23,42,0.06)]',
  'data-[placeholder]:font-normal data-[placeholder]:text-gray-500'
);

/** Urbania ticket row: borderless select — no boxed blue focus ring */
const heroUrbaniaMobileTourSelectTrigger = cn(
  'flex h-auto min-h-[1.75rem] w-full items-center justify-between gap-2 rounded-none border-0 bg-transparent px-0 py-0 text-left',
  'shadow-none outline-none outline-offset-0 ring-0 ring-offset-0',
  'text-[15px] font-bold leading-tight text-gray-900 data-[placeholder]:font-normal data-[placeholder]:text-gray-500',
  'hover:bg-transparent',
  'focus:border-0 focus:outline-none focus:ring-0 focus:shadow-none',
  'focus-visible:border-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:shadow-none',
  'data-[state=open]:border-0 data-[state=open]:shadow-none data-[state=open]:ring-0'
);

/** Soft row highlight when Package / Tour select is open (ticket chrome). */
const heroTicketSelectRowFocusClass =
  'rounded-lg transition-[background-color,box-shadow] duration-150 focus-within:bg-slate-50/90';

/** Urbania stacked card: cohesive dropdown panel + comfortable option tiles */
const heroUrbaniaMobileSelectContentProps = {
  ...heroTourPackageSelectContentProps,
  sideOffset: 8,
  className: cn(
    heroTourPackageSelectContentProps.className,
    'overflow-hidden rounded-xl border-0 bg-white p-0',
    'shadow-[0_12px_42px_-12px_rgba(15,23,42,0.16),0_4px_14px_-4px_rgba(15,23,42,0.08)]',
    'ring-1 ring-gray-900/[0.06]',
    '[&_[data-radix-select-viewport]]:p-1.5',
    '[&_[role=option]]:mx-0 [&_[role=option]]:my-0.5 [&_[role=option]]:rounded-xl [&_[role=option]]:border-0',
    '[&_[role=option]]:py-2.5 [&_[role=option]]:pl-10 [&_[role=option]]:pr-3',
    '[&_[role=option]]:text-left [&_[role=option]]:text-[15px] [&_[role=option]]:font-semibold [&_[role=option]]:leading-snug',
    '[&_[role=option]]:text-gray-900 [&_[role=option]]:outline-none [&_[role=option]]:transition-colors',
    '[&_[role=option]]:data-[highlighted]:bg-blue-50 [&_[role=option]]:data-[highlighted]:text-blue-900',
    '[&_[role=option]]:focus:bg-blue-50 [&_[role=option]]:focus:text-blue-900'
  ),
};

/** Mobile ticket shell — matches `/vehicle/urbania` hero card chrome */
const heroMobileTicketShellCardClass =
  'max-lg:overflow-hidden max-lg:rounded-2xl max-lg:border-0 max-lg:bg-white max-lg:shadow-none';

/** Search slot gutters — same as `vehicle-urbania-search-slot` */
const heroMobileTicketShellPaddingClass = 'max-lg:px-4 max-lg:pb-3 max-lg:pt-0';

/** Home promo banner: small inset from card top edge */
const heroMobileTicketShellPaddingHomeClass = 'max-lg:px-2.5 max-lg:pb-2.5 max-lg:pt-2';

const heroMobileTicketShellFormWrapClass = 'bg-transparent px-0 pt-0 shadow-none';

const vizagAirportLocations = getVizagAirportLocations();
const airportLocation =
  vizagAirportLocations.find((loc) => loc.id === 'vizag_airport') ?? vizagAirportLocations[0];

function withCanonicalAirportCoords(location: Location | null | undefined): Location | null {
  if (!location) return null;
  if (!isVizagAirportLocation(location)) return location;
  const resolved = resolveCanonicalVizagAirport(location);
  if (
    resolved.id === location.id &&
    resolved.lat === location.lat &&
    resolved.lng === location.lng &&
    resolved.name === location.name
  ) {
    return location;
  }
  return resolved;
}

function isAllowedPickupLocation(
  location: Location | null | undefined,
  tripType?: TripType
): boolean {
  if (!location) return false;
  if (isLocationInVizag(location) || isVizagAirportLocation(location)) return true;
  return tripType === 'airport' && isAirportTransferOtherEnd(location);
}

function RestrictedAirportRouteNotice({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="relative z-[10041] mt-3 rounded-xl border border-red-300 bg-red-50 px-3.5 py-3 text-left shadow-sm"
    >
      <p className="text-base font-bold leading-snug text-red-950">Route unavailable</p>
      <p className="mt-1.5 text-sm font-medium leading-relaxed text-slate-800">{message}</p>
      <a
        href={`tel:${RESTRICTED_AIRPORT_ROUTE_PHONE_TEL}`}
        className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-lg bg-red-700 px-3 text-sm font-bold text-white"
      >
        Call {RESTRICTED_AIRPORT_ROUTE_PHONE_DISPLAY}
      </a>
    </div>
  );
}

/** Session: guest WhatsApp (E.164) after first successful entry — skip modal on repeat searches in this tab. */
const SESSION_GUEST_TRACK_PHONE_KEY = 'guestTrackWhatsAppE164';
/** Session: last search tracking snapshot (pickup, drop, cars shown, selected cab, etc.) for support/debug. */
const SESSION_GUEST_SEARCH_SNAPSHOT_KEY = 'guestSearchSnapshot';

export function Hero({ onSearch, isSearchActive, visibleTabs, hideBackground, embedCompactLayout, embedStretchToShell, onEditStart, onTripEditOpenChange, onStepChange, lockedVehicleSlug, summaryBackHref, urbaniaUnifiedMobileLayout, embedDesktopCardLayout, embedDesktopCardTitle }: { onSearch?: (searchData: any) => void; isSearchActive?: boolean; visibleTabs?: Array<'outstation' | 'local' | 'airport' | 'tour' | 'custom'>; hideBackground?: boolean; /** Local /embed pages only: normal flow layout, no banner-centering absolute + lighter widget padding */ embedCompactLayout?: boolean; /** When embedded in a route that already wraps `container`/padding: drop inner max-width + nested container so the widget aligns with breadcrumbs */ embedStretchToShell?: boolean; onEditStart?: () => void; /** Urbania embed parent: show page content below the widget while user edits trip search (step 2). */ onTripEditOpenChange?: (open: boolean) => void; onStepChange?: (step: number) => void; lockedVehicleSlug?: string; summaryBackHref?: string; /** `/vehicle/urbania`: parent already renders one gray shell — hide duplicate mobile white card around this embed */ urbaniaUnifiedMobileLayout?: boolean; /** Desktop: stacked booking card (title + fields + full-width Search) for service marketing hero */ embedDesktopCardLayout?: boolean; /** Booking-card heading when `embedDesktopCardLayout` is on */ embedDesktopCardTitle?: string }) {
  const normalizedLockSlug = lockedVehicleSlug?.trim().toLowerCase() ?? '';
  const vehicleEmbedConfig = lockedVehicleSlug
    ? getVehicleEmbedConfig(normalizedLockSlug)
    : null;
  const isVehicleEmbedLock = Boolean(vehicleEmbedConfig);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const bookingSummaryRef = useRef<HTMLDivElement>(null);
  const { isLoaded } = useGoogleMaps();
  /** `/vehicle/*` embed on small viewports: one padded bordered card so tabs + form stay aligned like native app chrome. */
  const urbaniaMobileEmbedShell =
    Boolean(embedStretchToShell && isVehicleEmbedLock);
  /** Parent `VehicleDetailPage` wraps hero + embed in a single gray shell below `lg`. */
  const urbaniaUnifiedShell =
    Boolean(urbaniaUnifiedMobileLayout && urbaniaMobileEmbedShell);
  /** Home + vehicle/service embeds: in-field captions + stacked ticket divider on mobile/tablet.
   *  Service landings (local/airport/outstation) pass embedCompactLayout — use ticket UI so Package
   *  uses constrained Radix Select (native <select> popups overflow the viewport in Chrome). */
  const heroMobileTicketStyle =
    isVehicleEmbedLock ||
    Boolean(embedCompactLayout) ||
    (!embedStretchToShell && !embedCompactLayout && !lockedVehicleSlug);
  const heroMobileFieldVariant: 'app' | 'infield' = heroMobileTicketStyle ? 'infield' : 'app';
  const heroTicketCellPad = heroMobileTicketStyle ? 'px-2 py-1.5' : '';
  const heroTourLocalRowClass = heroMobileTicketStyle ? 'flex items-start gap-2 px-2 py-1.5' : undefined;
  /** Home page premium shell — desktop mesh banner + glass card; mobile keeps classic ticket widget. */
  const isHomePremiumHero =
    !hideBackground &&
    !embedCompactLayout &&
    !embedStretchToShell &&
    !isSearchActive &&
    !isVehicleEmbedLock &&
    !lockedVehicleSlug;
  /** Classic mobile ticket chrome: home + vehicle embeds (max-lg classes only). */
  const heroMobileUnifiedShell =
    !urbaniaUnifiedShell &&
    heroMobileTicketStyle &&
    (isHomePremiumHero || isVehicleEmbedLock || Boolean(lockedVehicleSlug));
  /** Local / airport / outstation landings: same ticket gutters as home (no nested padded card). */
  const isServiceLandingEmbed = Boolean(
    embedCompactLayout && embedStretchToShell && !isVehicleEmbedLock,
  );
  const heroMobileFormShellWrap =
    urbaniaMobileEmbedShell || heroMobileUnifiedShell || isServiceLandingEmbed;
  
  const loadFromSessionStorage = () => {
    try {
      // Check for route prefill data first
      const routePrefillData = sessionStorage.getItem('routePrefillData');
      if (routePrefillData) {
        const prefillData = JSON.parse(routePrefillData);
        // sessionStorage.removeItem('routePrefillData'); // Do NOT clear after use
        const prePick = prefillData.pickupLocation as Location | undefined;
        const allowAnyPickup = Boolean(prefillData.openGuestDetails);
        return {
          pickupLocation: prePick && (allowAnyPickup || isAllowedPickupLocation(prePick, prefillData.tripType))
            ? withCanonicalAirportCoords(prePick)
            : null,
          dropLocation: prefillData.dropLocation,
          pickupDate: coerceTripDate(
            prefillData.pickupDate
              ? (() => {
                  const parsedDate = new Date(prefillData.pickupDate);
                  const now = new Date();
                  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
                  if (!isValidTripDate(parsedDate) || parsedDate < oneHourFromNow) {
                    return oneHourFromNow;
                  }
                  return parsedDate;
                })()
              : undefined,
          ),
          returnDate: prefillData.returnDate
            ? (() => {
                const parsedReturn = new Date(prefillData.returnDate);
                return isValidTripDate(parsedReturn) ? parsedReturn : null;
              })()
            : null,
          tripType: prefillData.tripType || 'outstation',
          tripMode: prefillData.tripMode || 'one-way',
          hourlyPackage: prefillData.hourlyPackage || hourlyPackageOptions[0].value,
          selectedCab: prefillData.selectedCab || null,
          autoTriggerSearch: prefillData.autoTriggerSearch,
          openGuestDetails: Boolean(prefillData.openGuestDetails),
          vehicleHint: typeof prefillData.vehicleHint === 'string' ? prefillData.vehicleHint : '',
          estimatedFare:
            typeof prefillData.estimatedFare === 'number' && prefillData.estimatedFare > 0
              ? prefillData.estimatedFare
              : 0,
          estimatedKm:
            typeof prefillData.estimatedKm === 'number' && prefillData.estimatedKm > 0
              ? prefillData.estimatedKm
              : 0,
          intermediateStops: parseStoredStops(prefillData.intermediateStops),
        };
      }

      const pickupData = sessionStorage.getItem('pickupLocation');
      const dropData = sessionStorage.getItem('dropLocation');
      const pickupDateStr = sessionStorage.getItem('pickupDate');
      const returnDateStr = sessionStorage.getItem('returnDate');
      const tripTypeData = sessionStorage.getItem('tripType');
      const tripModeData = sessionStorage.getItem('tripMode');
      const hourlyPkgData = sessionStorage.getItem('hourlyPackage');
      const cabData = sessionStorage.getItem('selectedCab');
      
      // Determine default trip type based on visibleTabs
      let defaultTripType: TripType = 'outstation';
      if (visibleTabs && visibleTabs.length === 1) {
        defaultTripType = visibleTabs[0] as TripType;
      }
      
      return {
        pickupLocation: pickupData
          ? (() => {
              const p = JSON.parse(pickupData) as Location;
              return isAllowedPickupLocation(p, defaultTripType) ? withCanonicalAirportCoords(p) : null;
            })()
          : null,
        dropLocation: dropData
          ? withCanonicalAirportCoords(JSON.parse(dropData) as Location)
          : null,
        pickupDate: coerceTripDate(
          pickupDateStr
            ? (() => {
                const parsedDate = new Date(JSON.parse(pickupDateStr));
                const now = new Date();
                const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
                if (!isValidTripDate(parsedDate) || parsedDate < oneHourFromNow) {
                  return oneHourFromNow;
                }
                return parsedDate;
              })()
            : undefined,
        ),
        returnDate: returnDateStr
          ? (() => {
              const parsedReturn = new Date(JSON.parse(returnDateStr));
              return isValidTripDate(parsedReturn) ? parsedReturn : null;
            })()
          : null,
        tripType: tripTypeData as TripType || defaultTripType,
        tripMode: tripModeData as TripMode || 'one-way',
        hourlyPackage: hourlyPkgData || hourlyPackageOptions[0].value,
        selectedCab: cabData ? JSON.parse(cabData) as CabType : null,
        autoTriggerSearch: false,
        openGuestDetails: false,
        vehicleHint: '',
        estimatedFare: 0,
        estimatedKm: 0,
        intermediateStops: parseStoredStops(
          (() => {
            try {
              const raw = sessionStorage.getItem('intermediateStops');
              return raw ? JSON.parse(raw) : [];
            } catch {
              return [];
            }
          })()
        ),
      };
    } catch (error) {
      console.error("Error loading data from session storage:", error);
      
      // Determine default trip type based on visibleTabs
      let defaultTripType: TripType = 'outstation';
      if (visibleTabs && visibleTabs.length === 1) {
        defaultTripType = visibleTabs[0] as TripType;
      }
      
      return {
        pickupLocation: null,
        dropLocation: null,
        pickupDate: (() => {
          const now = new Date();
          const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
          return oneHourFromNow;
        })(),
        returnDate: null,
        tripType: defaultTripType,
        tripMode: 'one-way' as TripMode,
        hourlyPackage: hourlyPackageOptions[0].value,
        selectedCab: null,
        autoTriggerSearch: false,
        openGuestDetails: false,
        vehicleHint: '',
        estimatedFare: 0,
        estimatedKm: 0,
        intermediateStops: [],
      };
    }
  };
  
  const savedData = loadFromSessionStorage();
  
  // Handle navigation state from edit functionality
  const navigationState = location.state as any;
  const editModeData = navigationState && navigationState.tripType === 'tour' ? {
    pickupLocation: navigationState.pickupLocation
      ? typeof navigationState.pickupLocation === 'object'
        ? navigationState.pickupLocation
        : {
            id: '',
            name: navigationState.pickupLocation,
            address: '',
            lat: 0,
            lng: 0,
            city: '',
            state: '',
            type: 'other',
            popularityScore: 50,
          }
      : savedData.pickupLocation,
    tripType: 'tour' as TripType
  } : {};
  
  const [pickupLocation, setPickupLocation] = useState<Location | null>(editModeData.pickupLocation || savedData.pickupLocation);
  const [dropLocation, setDropLocation] = useState<Location | null>(savedData.dropLocation);
  const [intermediateStops, setIntermediateStops] = useState<Array<Location | null>>(
    savedData.tripType === 'outstation' ? savedData.intermediateStops ?? [] : []
  );
  const [pickupDate, setPickupDate] = useState<Date>(() => coerceTripDate(savedData.pickupDate));
  const [returnDate, setReturnDate] = useState<Date | null>(() =>
    isValidTripDate(savedData.returnDate) ? savedData.returnDate : null,
  );
  
  // Wrap setReturnDate to track all calls
  const setReturnDateWithLogging = useCallback((value: Date | null | ((prev: Date | null) => Date | null)) => {
    console.log('[SET RETURN DATE] Called with:', {
      value,
      type: typeof value,
      isFunction: typeof value === 'function',
      timestamp: new Date().toISOString(),
      stackTrace: new Error().stack
    });
    setReturnDate(value);
  }, [setReturnDate]);
  
  // Track returnDate state changes
  useEffect(() => {
    console.log('[RETURN DATE STATE] returnDate state changed:', {
      returnDate,
      timestamp: new Date().toISOString()
    });
  }, [returnDate]);
  
  // Add a wrapper to track return date changes
  const handleReturnDateChange = useCallback((newDate: Date | undefined) => {
    console.log('[RETURN DATE CHANGE] User changed return date:', {
      newDate,
      currentReturnDate: returnDate,
      timestamp: new Date().toISOString()
    });
    setReturnDate(isValidTripDate(newDate) ? newDate : null);
  }, [returnDate]);
  const handlePickupDateChange = useCallback((date: Date | undefined) => {
    if (isValidTripDate(date)) {
      setPickupDate(date);
    }
  }, []);
  // Don't auto-select first vehicle - user must explicitly select to see booking summary
  const [selectedCab, setSelectedCabState] = useState<CabType | null>(() => {
    const cab = savedData.selectedCab || null;
    if (normalizedLockSlug && cab && generateVehicleUrl(cab) !== normalizedLockSlug) return null;
    return cab;
  });
  const [distance, setDistance] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [currentStep, setCurrentStep] = useState<number>(() => {
    if (!isSearchActive) return 1;
    const initialType = editModeData.tripType || savedData.tripType;
    const hasPickup = Boolean((editModeData.pickupLocation || savedData.pickupLocation)?.name);
    const hasDrop = Boolean(savedData.dropLocation?.name);
    if (initialType === 'local') return hasPickup ? 2 : 1;
    return hasPickup && hasDrop ? 2 : 1;
  });
  const [isFormValid, setIsFormValid] = useState<boolean>(false);
  const [showBookingSummaryModal, setShowBookingSummaryModal] = useState<boolean>(false);
  const [animateBookingSummaryModal, setAnimateBookingSummaryModal] = useState<boolean>(false);
  const [tripType, setTripType] = useState<TripType>(editModeData.tripType || savedData.tripType);
  const filledStops = useMemo(
    () => (tripType === 'outstation' ? filledOutstationStops(intermediateStops) : []),
    [tripType, intermediateStops]
  );
  const measureBookedRoute = useCallback(
    async (origin: Location, dest: Location) => {
      if (tripType === 'outstation' && filledStops.length > 0) {
        return calculateRouteDistance(routePointsWithStops(origin, dest, filledStops));
      }
      return calculateDistanceMatrix(origin, dest);
    },
    [tripType, filledStops]
  );
  const [tripMode, setTripMode] = useState<TripMode>(savedData.tripMode);
  const [hourlyPackage, setHourlyPackage] = useState<string>(savedData.hourlyPackage);
  const [showGuestDetailsForm, setShowGuestDetailsForm] = useState<boolean>(false);
  const [isCalculatingDistance, setIsCalculatingDistance] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [finalTotal, setFinalTotal] = useState<number>(0);
  const [offerCampaign, setOfferCampaign] = useState<OfferCampaignPublic | null>(null);
  const [offerPopupOpen, setOfferPopupOpen] = useState(false);
  const [offerApplied, setOfferApplied] = useState(false);
  const [offerRedemptionId, setOfferRedemptionId] = useState<number | null>(null);
  const offerCampaignIdRef = useRef<number | null>(null);
  /** Pre-discount fare from BookingSummary — used for coupon math & API apply. */
  const [websiteFareTotal, setWebsiteFareTotal] = useState(0);
  const [bookingPaymentMode, setBookingPaymentMode] = useState<'partial' | 'full'>(() => {
    if (typeof sessionStorage === 'undefined') return 'partial';
    const m = sessionStorage.getItem('paymentMode');
    return m === 'full' ? 'full' : 'partial';
  });
  const [validationError, setValidationError] = useState<string | null>(null);
  const [restrictedRouteNotice, setRestrictedRouteNotice] = useState<string | null>(null);
  const [minTravelHours, setMinTravelHours] = useState<number>(0);
  const [isCheckingTravelTime, setIsCheckingTravelTime] = useState<boolean>(false);
  const [isReturnTimeEnabled, setIsReturnTimeEnabled] = useState<boolean>(false);
  const [minValidReturnTime, setMinValidReturnTime] = useState<Date | null>(null);
  const [showMobileEditForm, setShowMobileEditForm] = useState<boolean>(false);
  // Add new state for airport direction label
  const [airportDirectionLabel, setAirportDirectionLabel] = useState<string>('');
  const [isTabSwitching, setIsTabSwitching] = useState<boolean>(false);
  const [isSlidingSearch, setIsSlidingSearch] = useState<boolean>(false);
  const [dynamicVehicles, setDynamicVehicles] = useState<CabType[]>([]);
  const [vehiclesLoaded, setVehiclesLoaded] = useState<boolean>(false);
  const [editTrigger, setEditTrigger] = useState<number>(0);
  const skipPhoneGateRef = useRef(false);
  /** When true, `proceedWithSearch` skips a duplicate track (modal path already called `runGuestSearchTracking`). */
  const skipNextGuestTrackRef = useRef(false);
  /** Latest SEARCH handler — used by header-search / route-prefill auto-trigger (must include phone gate). */
  const handleContinueRef = useRef<() => void>(() => {});
  /** Header search asked to run SEARCH once locations are valid (phone gate included). */
  const pendingAutoSearchRef = useRef(false);
  const openGuestDetailsRef = useRef(Boolean(savedData.openGuestDetails));
  const vehicleHintRef = useRef(savedData.vehicleHint || '');
  const estimatedFareRef = useRef(savedData.estimatedFare || 0);
  const estimatedKmRef = useRef(savedData.estimatedKm || 0);
  /** Google Distance Matrix leg for {@link buildGuestTrackRouteKey} — matches CabList km & duration (avoids stale state). */
  const routedKmForRouteRef = useRef<{ key: string; km: number; durationMinutes: number }>({
    key: '',
    km: 0,
    durationMinutes: 0,
  });
  const [showGuestPhoneModal, setShowGuestPhoneModal] = useState(false);
  const [guestPhoneDigits, setGuestPhoneDigits] = useState('');
  const [guestPhoneCountry, setGuestPhoneCountry] = useState<CountryCode>(() => defaultWhatsappCountry());
  /** Tour tab: packages from public tours API (same list as /tours page). */
  const [heroTourList, setHeroTourList] = useState<TourListItem[]>([]);
  const [heroTourListLoading, setHeroTourListLoading] = useState(false);

  const sortedHeroTours = useMemo(
    () => [...heroTourList].sort((a, b) => a.tourName.localeCompare(b.tourName)),
    [heroTourList]
  );

  type LocationInputSlot = { mobile: LocationInputHandle | null; desktop: LocationInputHandle | null };
  type DatePickerSlot = { mobile: DateTimePickerHandle | null; desktop: DateTimePickerHandle | null };
  const dropLocationInputRefs = useRef<LocationInputSlot>({ mobile: null, desktop: null });
  const departurePickerRefs = useRef<DatePickerSlot>({ mobile: null, desktop: null });
  const returnPickerRefs = useRef<DatePickerSlot>({ mobile: null, desktop: null });
  const desktopTripModeFocusRef = useRef<HTMLButtonElement | null>(null);
  const mobileTripModeFocusRef = useRef<HTMLButtonElement | null>(null);
  const packageSelectRefs = useRef<{ mobile: HTMLSelectElement | null; desktop: HTMLSelectElement | null }>({
    mobile: null,
    desktop: null,
  });
  const tourPackageTriggerRefs = useRef<{ mobile: HTMLButtonElement | null; desktop: HTMLButtonElement | null }>({
    mobile: null,
    desktop: null,
  });
  const searchButtonRefs = useRef<{ mobile: HTMLButtonElement | null; desktop: HTMLButtonElement | null }>({
    mobile: null,
    desktop: null,
  });
  const tripTypeRef = useRef(tripType);
  const tripModeRef = useRef(tripMode);
  tripTypeRef.current = tripType;
  tripModeRef.current = tripMode;

  const isDesktopBookingViewport = () =>
    typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;

  const scheduleBookingFocus = (fn: () => void) => {
    window.setTimeout(fn, 100);
  };

  const focusDropLocationField = () => {
    const slot = isDesktopBookingViewport()
      ? dropLocationInputRefs.current.desktop
      : dropLocationInputRefs.current.mobile;
    slot?.focus();
  };

  const focusTripModeControl = () => {
    const target = isDesktopBookingViewport()
      ? desktopTripModeFocusRef.current
      : mobileTripModeFocusRef.current;
    target?.focus();
    target?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };

  const openDeparturePicker = () => {
    const slot = isDesktopBookingViewport()
      ? departurePickerRefs.current.desktop
      : departurePickerRefs.current.mobile;
    slot?.open();
  };

  const openReturnPicker = () => {
    const slot = isDesktopBookingViewport()
      ? returnPickerRefs.current.desktop
      : returnPickerRefs.current.mobile;
    slot?.open();
  };

  const focusSearchButton = () => {
    const target = isDesktopBookingViewport()
      ? searchButtonRefs.current.desktop
      : searchButtonRefs.current.mobile;
    target?.focus();
    target?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };

  const focusPackageSelect = () => {
    const target = isDesktopBookingViewport()
      ? packageSelectRefs.current.desktop
      : packageSelectRefs.current.mobile;
    target?.focus();
    target?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };

  const focusTourPackageSelect = () => {
    const target = isDesktopBookingViewport()
      ? tourPackageTriggerRefs.current.desktop
      : tourPackageTriggerRefs.current.mobile;
    target?.focus();
    target?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };

  const advanceAfterPickupSelected = () => {
    scheduleBookingFocus(() => {
      const type = tripTypeRef.current;
      if (type === 'outstation' || type === 'airport') {
        focusDropLocationField();
        return;
      }
      if (type === 'local') {
        focusPackageSelect();
        return;
      }
      if (type === 'tour') {
        focusTourPackageSelect();
        return;
      }
      openDeparturePicker();
    });
  };

  const advanceAfterDropSelected = () => {
    scheduleBookingFocus(() => {
      const type = tripTypeRef.current;
      if (type === 'outstation' || type === 'airport' || type === 'tour') {
        focusTripModeControl();
        return;
      }
      openDeparturePicker();
    });
  };

  const advanceAfterTripModeSelected = () => {
    scheduleBookingFocus(() => {
      openDeparturePicker();
    });
  };

  const advanceAfterDepartureApplied = () => {
    scheduleBookingFocus(() => {
      if (tripTypeRef.current === 'outstation' && tripModeRef.current === 'round-trip') {
        openReturnPicker();
        return;
      }
      focusSearchButton();
    });
  };

  const advanceAfterReturnApplied = () => {
    scheduleBookingFocus(() => {
      focusSearchButton();
    });
  };

  const handleTripModeChangeWithAdvance = (mode: TripMode) => {
    setTripMode(mode);
    advanceAfterTripModeSelected();
  };

  const applyHeroTourPackageSelection = useCallback((tour: TourListItem | null) => {
    if (!tour) {
      setDropLocation(null);
      try {
        sessionStorage.removeItem('dropLocation');
      } catch {
        /* ignore */
      }
      return;
    }
    const loc: Location = {
      id: `tour_${tour.tourId}`,
      name: tour.tourName,
      city: 'Visakhapatnam',
      state: 'Andhra Pradesh',
      lat: 17.7215,
      lng: 83.2248,
      type: 'other',
      popularityScore: 50,
      address: tour.tourName,
      isInVizag: true,
    };
    setDropLocation(loc);
    try {
      sessionStorage.setItem('dropLocation', JSON.stringify(loc));
    } catch {
      /* ignore */
    }
    window.setTimeout(() => {
      const target = window.matchMedia('(min-width: 1024px)').matches
        ? desktopTripModeFocusRef.current
        : mobileTripModeFocusRef.current;
      target?.focus();
      target?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, 100);
  }, []);

  useEffect(() => {
    if (tripType !== 'tour') return;
    let cancelled = false;
    setHeroTourListLoading(true);
    tourDetailAPI
      .getTours()
      .then((list) => {
        if (!cancelled) setHeroTourList(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!cancelled) setHeroTourList([]);
      })
      .finally(() => {
        if (!cancelled) setHeroTourListLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tripType]);

  // Helper: earliest bookable departure (now + 1 hour), minute precision
  const getMinimumAllowedDate = () => {
    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
    oneHourFromNow.setSeconds(0, 0);
    return oneHourFromNow;
  };

  // Edit handlers for booking summary
  const handleEditPickupLocation = () => {
    // Force LocationInput components to completely re-mount by changing their keys
    setEditTrigger(prev => prev + 1);
    setIsSlidingSearch(true);
    setShowGuestDetailsForm(false);
    if (isSearchActive) resetPageScroll();
    if (onEditStart) onEditStart();
    onTripEditOpenChange?.(true);
  };

  const handleEditPickupDate = () => {
    // Force LocationInput components to completely re-mount by changing their keys
    setEditTrigger(prev => prev + 1);
    setIsSlidingSearch(true);
    setShowGuestDetailsForm(false);
    if (isSearchActive) resetPageScroll();
    if (onEditStart) onEditStart();
    onTripEditOpenChange?.(true);
  };

  /** Reset homepage booking widget back to step 1 (logo click, back navigation). */
  const resetToHomeBookingForm = useCallback(() => {
    setPickupLocation(null);
    setDropLocation(null);
    setIntermediateStops([]);
    setReturnDate(null);
    setPickupDate(getMinimumAllowedDate());
    setSelectedCabState(null);
    setDistance(0);
    setDuration(0);
    routedKmForRouteRef.current = { key: '', km: 0, durationMinutes: 0 };
    setFinalTotal(0);
    setCurrentStep(1);
    setShowGuestDetailsForm(false);
    setIsSlidingSearch(false);
    setShowMobileEditForm(false);
    setValidationError(null);
    setRestrictedRouteNotice(null);
    setTripType('outstation');
    setTripMode('one-way');
    if (onStepChange) onStepChange(1);
    onTripEditOpenChange?.(false);
    const scrollHomeTop = () => {
      resetPageScroll();
    };
    scrollHomeTop();
    requestAnimationFrame(scrollHomeTop);
    window.setTimeout(scrollHomeTop, 100);
  }, [onStepChange, onTripEditOpenChange]);

  /** When `navigate(summaryBackHref)` stays on the same URL (Urbania embed), React keeps Hero mounted — explicitly reset booking flow back to step 1. */
  const handleBookingSummaryBack = () => {
    sessionStorage.removeItem('routePrefillData');
    sessionStorage.removeItem('pickupLocation');
    sessionStorage.removeItem('dropLocation');
    sessionStorage.removeItem('intermediateStops');
    sessionStorage.removeItem('pickupDate');
    sessionStorage.removeItem('returnDate');
    sessionStorage.removeItem('selectedCab');

    const target = summaryBackHref ?? '/';
    const normalized = (pathname: string) =>
      pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
    const stripQueryHash = (p: string) => (p.split(/[?#]/)[0] ?? p);
    const backPath = normalized(stripQueryHash(summaryBackHref != null ? target : ''));
    const here = normalized(location.pathname);

    const samePageEmbedded =
      summaryBackHref != null && summaryBackHref.length > 0 && backPath === here;

    if (samePageEmbedded) {
      resetToHomeBookingForm();
      return;
    }

    navigate(target);
  };

  useEffect(() => {
    const handleHomeReset = () => {
      resetToHomeBookingForm();
    };

    window.addEventListener(BOOKING_HOME_RESET_EVENT, handleHomeReset);
    return () => window.removeEventListener(BOOKING_HOME_RESET_EVENT, handleHomeReset);
  }, [resetToHomeBookingForm]);

  // Load dynamic vehicles with inactive dates
  useEffect(() => {
    const loadVehicles = async () => {
      try {
        // Clear cache to force fresh data
        sessionStorage.removeItem('cabTypes');
        sessionStorage.removeItem('cachedVehicles');
        localStorage.removeItem('cachedVehicles');
        localStorage.removeItem('cachedVehiclesTimestamp');
        
        const vehicles = await loadCabTypes(false, true); // Load active vehicles only with force refresh
        setDynamicVehicles(vehicles);
        setVehiclesLoaded(true);
        
        // Don't auto-select - user must explicitly select a vehicle
        
        // Add a global function for manual testing
        (window as any).refreshVehicles = () => {
          loadVehicles();
        };
        
        // Add global debug functions
        (window as any).debugVehicles = () => {
          // Debug function for vehicles
        };
      } catch (error) {
        console.error('Error loading dynamic vehicles:', error);
        // Fallback to static cabTypes
        setDynamicVehicles(cabTypes);
        setVehiclesLoaded(true);
        
        // Don't auto-select - user must explicitly select a vehicle
      }
    };
    
    loadVehicles();
  }, []);

  const filteredAvailableForDates = useMemo(
    () =>
      filterAvailableVehicles(dynamicVehicles, pickupDate, returnDate ?? undefined),
    [dynamicVehicles, pickupDate, returnDate]
  );

  const heroBookingCabList = useMemo(() => {
    if (!normalizedLockSlug) return filteredAvailableForDates;
    return filteredAvailableForDates.filter(
      (c) => generateVehicleUrl(c) === normalizedLockSlug
    );
  }, [filteredAvailableForDates, normalizedLockSlug]);

  // Listen for route prefill events (header search widget)
  useEffect(() => {
    const handleRoutePrefill = (event: CustomEvent) => {
      const {
        pickupLocation: pickup,
        dropLocation: drop,
        tripType: type,
        tripMode: mode,
        autoTriggerSearch,
      } = event.detail;
      setPickupLocation(pickup ?? null);
      setDropLocation(drop ?? null);
      if (type) setTripType(type);
      if (mode) setTripMode(mode);
      sessionStorage.setItem('tripType', type || 'outstation');

      window.requestAnimationFrame(() => {
        scrollToBookingWidget();
      });

      // Queue SEARCH (with WhatsApp phone gate) — runs when form becomes valid
      if (autoTriggerSearch !== false && pickup && drop) {
        pendingAutoSearchRef.current = true;
      }
    };

    window.addEventListener('routePrefill', handleRoutePrefill as EventListener);
    return () => window.removeEventListener('routePrefill', handleRoutePrefill as EventListener);
  }, []);

  // Handle navigation state when coming from edit mode
  useEffect(() => {
    if (navigationState && navigationState.tripType === 'tour') {
      // Set trip type to tour if coming from tour edit
      setTripType('tour');
      
      // Clear the navigation state after processing
      window.history.replaceState({}, document.title);
    }
  }, [navigationState]);

  // Preserve stored dates instead of always resetting to current date
  useEffect(() => {
    // Only set to current date if no date is stored and no date is already set
    const storedPickupDate = sessionStorage.getItem('pickupDate');
    if (!storedPickupDate && !pickupDate) {
      // Set to minimum allowed date (current time + 1 hour)
      setPickupDate(getMinimumAllowedDate());
    }
  }, []);

  // Bootstrap pending auto-search from session prefill (navigate-from-other-page case)
  useEffect(() => {
    if (openGuestDetailsRef.current) return;
    if (savedData.autoTriggerSearch === true && savedData.pickupLocation && savedData.dropLocation) {
      pendingAutoSearchRef.current = true;
    }
  }, []);

  // VTH AI deep-link: skip cab list and open Guest Details (GST / contact) with prefilled trip
  useEffect(() => {
    if (!openGuestDetailsRef.current) return;
    if (!vehiclesLoaded) return;
    if (!pickupLocation || !dropLocation) return;
    if (showGuestDetailsForm) return;

    const restrictedMessage = getRestrictedAirportRouteBlock(pickupLocation, dropLocation, tripType);
    if (restrictedMessage) {
      openGuestDetailsRef.current = false;
      notifyRestrictedAirportRoute(restrictedMessage);
      return;
    }

    openGuestDetailsRef.current = false;

    const hint = (vehicleHintRef.current || '').toLowerCase();
    const list = heroBookingCabList;
    let matched: CabType | null = null;
    if (hint && list.length) {
      matched =
        list.find((v) => v.name.toLowerCase().includes(hint) || hint.includes(v.name.toLowerCase().split(' ')[0])) ||
        list.find((v) => {
          const n = v.name.toLowerCase();
          if (hint.includes('innova') || hint.includes('crysta')) return n.includes('innova') || n.includes('crysta');
          if (hint.includes('ertiga')) return n.includes('ertiga');
          if (hint.includes('tempo')) return n.includes('tempo');
          if (hint.includes('urbania') || hint.includes('bus')) return n.includes('urbania') || n.includes('bus');
          if (hint.includes('luxury')) return n.includes('luxury');
          if (hint.includes('sedan') || hint.includes('dzire')) return n.includes('sedan') || n.includes('dzire') || n.includes('swift');
          return false;
        }) ||
        null;
    }
    if (!matched && list.length) matched = list[0];
    if (matched) setSelectedCabState(matched);

    if (estimatedFareRef.current > 0) {
      setFinalTotal(estimatedFareRef.current);
      setWebsiteFareTotal(estimatedFareRef.current);
    }

    const dropForKm = tripType === 'local' ? pickupLocation : dropLocation;
    const syncKm =
      pickupLocation && dropForKm
        ? filledStops.length > 0
          ? estimateRoadKmAlongRoute(routePointsWithStops(pickupLocation, dropForKm, filledStops))
          : estimateRoadKmSync(pickupLocation, dropForKm)
        : 0;
    const km =
      estimatedKmRef.current > 0
        ? estimatedKmRef.current
        : syncKm > 0
          ? syncKm
          : 0;
    if (km > 0) setDistance(km);
    setIsCalculatingDistance(false);

    setCurrentStep(2);
    if (onStepChange) onStepChange(2);
    setShowGuestDetailsForm(true);
    if (onSearch) {
      onSearch({
        pickupLocation,
        dropLocation,
        pickupDate,
        returnDate,
        tripType,
        tripMode,
        hourlyPackage,
        selectedCab: matched,
      });
    }
    try {
      sessionStorage.removeItem('routePrefillData');
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehiclesLoaded, pickupLocation, dropLocation, heroBookingCabList, showGuestDetailsForm]);

  // Run queued header/deep-link search via the same SEARCH path (phone modal included)
  useEffect(() => {
    if (!pendingAutoSearchRef.current) return;
    if (!pickupLocation || !dropLocation || !isFormValid) return;

    pendingAutoSearchRef.current = false;
    try {
      sessionStorage.removeItem('routePrefillData');
    } catch {
      /* ignore */
    }
    const timer = window.setTimeout(() => {
      handleContinueRef.current();
    }, 50);
    return () => window.clearTimeout(timer);
  }, [pickupLocation, dropLocation, isFormValid, tripType, tripMode, pickupDate]);

  // Clear routePrefillData after processing to prevent stale data
  useEffect(() => {
    const routePrefillData = sessionStorage.getItem('routePrefillData');
    if (routePrefillData) {
      const timer = setTimeout(() => {
        sessionStorage.removeItem('routePrefillData');
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  // Handle visibleTabs changes to ensure proper tab selection
  useEffect(() => {
    if (visibleTabs && visibleTabs.length === 1) {
      const singleTab = visibleTabs[0] as TripType;
      if (tripType !== singleTab) {
        setTripType(singleTab);
        // Clear locations when switching trip types to ensure fresh state
        setPickupLocation(null);
        setDropLocation(null);
        sessionStorage.removeItem('pickupLocation');
        sessionStorage.removeItem('dropLocation');
      }
    }
  }, [visibleTabs, tripType]);

  // Homepage: Custom itinerary is Smart Budget–only — never keep `custom` selected here.
  useEffect(() => {
    const tabs = visibleTabs ?? (['outstation', 'local', 'airport', 'tour'] as const);
    if (tripType === 'custom' && !tabs.includes('custom')) {
      setTripType('outstation');
      sessionStorage.setItem('tripType', 'outstation');
    }
  }, [visibleTabs, tripType]);

  // Clear stale sessionStorage data on mount to ensure fresh state
  useEffect(() => {
    // Clear any stale prefill data that might interfere with current navigation
    const routePrefillData = sessionStorage.getItem('routePrefillData');
    if (routePrefillData) {
      try {
        const data = JSON.parse(routePrefillData);
        // Only clear if the data is for a different trip type than what's currently visible
        if (visibleTabs && visibleTabs.length === 1 && data.tripType !== visibleTabs[0]) {
          sessionStorage.removeItem('routePrefillData');
        }
      } catch (error) {
        // If parsing fails, clear the data
        sessionStorage.removeItem('routePrefillData');
      }
    }
  }, [visibleTabs]);

  // Force reset when component mounts to ensure fresh state
  useEffect(() => {
    // Reset to step 1 when component mounts
    setCurrentStep(1);
    setShowGuestDetailsForm(false);
    
    // Clear any existing search state
    setIsLoading(false);
    setValidationError(null);
    
    // Reset form validation
    setIsFormValid(false);
  }, []);

  // REMOVED: This useEffect was clearing returnDate on mount, which was causing
  // the user's manually selected return date to be lost. The travel time calculation
  // useEffect already handles setting the initial return date appropriately.

  // Only call travel time API and set returnDate when both locations are filled
  useEffect(() => {
    console.log('[TRAVEL TIME CALC] useEffect triggered', {
      tripType,
      tripMode,
      hasPickupLocation: !!pickupLocation,
      hasDropLocation: !!dropLocation,
      currentReturnDate: returnDate
    });
    
    if (
      tripType === 'outstation' &&
      tripMode === 'round-trip'
    ) {
      // If either location is missing, disable and clear returnDate, do not call API
      if (!pickupLocation || !dropLocation) {
        console.log('[TRAVEL TIME CALC] Missing locations, clearing return date');
        setIsReturnTimeEnabled(false);
        setReturnDateWithLogging(null);
        setMinValidReturnTime(null);
        setValidationError(null);
        setIsCheckingTravelTime(false);
        return;
      }
      if (!isValidTripDate(pickupDate)) {
        return;
      }
      // Enable return date picker immediately when locations are filled (don't block on API)
      setIsReturnTimeEnabled(true);
      const fallbackMinReturn = new Date(pickupDate.getTime() + 60 * 60 * 1000); // 1 hour after pickup
      setMinValidReturnTime(prev => prev ?? fallbackMinReturn);
      setIsCheckingTravelTime(true);
      (async () => {
        try {
          console.log('[TRAVEL TIME CALC] Calling calculateDistanceMatrix...');
          const result = await measureBookedRoute(pickupLocation, dropLocation);
          console.log('[TRAVEL TIME CALC] Result:', result);
          
          if (result.status === 'OK') {
            const minMinutes = result.duration + 30;
            const minReturn = new Date(pickupDate.getTime() + minMinutes * 60 * 1000);
            console.log('[TRAVEL TIME CALC] Calculated minReturn:', {
              duration: result.duration,
              minMinutes,
              minReturn,
              pickupDate,
              currentReturnDate: returnDate
            });
            
            setIsReturnTimeEnabled(true);
            setMinValidReturnTime(minReturn);
            
            // Only prefill returnDate if it's null (first time calculation) or invalid (before pickup date)
            // This allows users to manually set their own return time without it being overridden
            setReturnDateWithLogging(prevReturnDate => {
              console.log('[TRAVEL TIME CALC] setReturnDate callback:', {
                prevReturnDate,
                minReturn,
                pickupDate,
                willReset: !prevReturnDate || prevReturnDate < pickupDate
              });
              
              if (!prevReturnDate) {
                console.log('[TRAVEL TIME CALC] Setting return date to minReturn (null)');
                return minReturn;
              }
              // If current return date is before pickup date, reset it
              if (prevReturnDate < pickupDate) {
                console.log('[TRAVEL TIME CALC] Resetting return date (before pickup)');
                return minReturn;
              }
              console.log('[TRAVEL TIME CALC] Preserving user return date:', prevReturnDate);
              return prevReturnDate;
            });
            setValidationError(null);
          } else {
            console.log('[TRAVEL TIME CALC] API error:', result.status);
            setMinValidReturnTime(fallbackMinReturn);
            setReturnDateWithLogging(prev => prev && prev >= pickupDate ? prev : fallbackMinReturn);
            setValidationError(null);
          }
        } catch (err) {
          console.error('[TRAVEL TIME CALC] Exception:', err);
          setMinValidReturnTime(fallbackMinReturn);
          setReturnDateWithLogging(prev => prev && prev >= pickupDate ? prev : fallbackMinReturn);
          setValidationError(null);
        } finally {
          setIsCheckingTravelTime(false);
        }
      })();
    }
  // Only depend on pickupLocation, dropLocation, pickupDate, tripType, tripMode
  // returnDate is NOT in dependencies to avoid infinite loops
  }, [pickupLocation, dropLocation, pickupDate, tripType, tripMode, measureBookedRoute]);

  // Validate returnDate when user manually edits it (round-trip only)
  useEffect(() => {
    if (tripType !== 'outstation' || tripMode !== 'round-trip') {
      setValidationError(null);
      return;
    }
    if (
      pickupLocation && dropLocation &&
      pickupDate &&
      returnDate &&
      minValidReturnTime
    ) {
      if (returnDate < minValidReturnTime) {
        const minMinutes = Math.round((minValidReturnTime.getTime() - pickupDate.getTime()) / 60000);
        setValidationError(
          `Return time must be at least ${Math.ceil(minMinutes/60)} hours after pickup time based on travel time from Google Maps.`
        );
      } else {
        setValidationError(null);
      }
    }
  }, [returnDate, minValidReturnTime, pickupDate, pickupLocation, dropLocation, tripType, tripMode]);

  // Validate form fields and set isFormValid
  useEffect(() => {
    let valid = true;
    if (!pickupLocation || !pickupLocation.name) valid = false;
    if (
      (tripType === 'outstation' ||
        tripType === 'airport' ||
        tripType === 'custom' ||
        tripType === 'local') &&
      (!dropLocation || !dropLocation.name)
    )
      valid = false;
    if (
      tripType === 'tour' &&
      (!dropLocation || !dropLocation.name || !String(dropLocation.id || '').startsWith('tour_'))
    )
      valid = false;
    if (tripType === 'tour' && pickupLocation && !isWithinTourPickupRadius(pickupLocation)) valid = false;
    if (!pickupDate) valid = false;
    if (tripType === 'outstation' && tripMode === 'round-trip' && !returnDate) valid = false;
    if (tripType === 'outstation' && intermediateStops.some((stop) => !stop?.name)) valid = false;
    setIsFormValid(valid);
  }, [pickupLocation, dropLocation, pickupDate, returnDate, tripType, tripMode, intermediateStops]);

  const isVizagAirport = (location: Location | null): boolean => isVizagAirportLocation(location);
  const hideRestrictedAirportDrops =
    RESTRICTED_AIRPORT_ROUTES_ENABLED &&
    tripType === 'airport' &&
    isVizagAirportLocation(pickupLocation);
  const pickupInputValue = pickupLocation ? { ...pickupLocation } : undefined;
  const dropInputValue = dropLocation ? { ...dropLocation } : undefined;
  const showFromToFields =
    tripType === 'outstation' || tripType === 'airport' || tripType === 'custom' || tripType === 'local';
  const dropFieldLabel = tripType === 'local' ? 'Last drop at' : 'To';
  const dropFieldPlaceholder =
    tripType === 'local' ? 'Enter last drop location' : 'Enter destination location';
  const dropFieldDesktopLabel = tripType === 'local' ? 'Last drop at' : 'Drop location';
  const restrictedAirportRouteMessage = getRestrictedAirportRouteBlock(
    pickupLocation,
    dropLocation,
    tripType
  );
  const visibleRestrictedAirportMessage =
    tripType === 'airport' ? restrictedAirportRouteMessage || restrictedRouteNotice : null;

  const notifyRestrictedAirportRoute = (message: string) => {
    setRestrictedRouteNotice(message);
  };
  const switchAirportTripToOutstation = () => {
    const pickupIsAirport = isVizagAirportLocation(pickupLocation);
    const dropIsAirport = isVizagAirportLocation(dropLocation);
    const otherEnd = pickupIsAirport ? dropLocation : dropIsAirport ? pickupLocation : dropLocation;
    if (otherEnd && isAirportTransferOtherEnd(otherEnd)) {
      return;
    }
    setTripType('outstation');
    sessionStorage.setItem('tripType', 'outstation');
    setAirportDirectionLabel('');
  };

  const applyInferredHomepageTab = (
    nextPickup: Location | null,
    nextDrop: Location | null,
    currentType: TripType,
  ) => {
    if (currentType === 'tour' || currentType === 'custom') return;
    if (visibleTabs && visibleTabs.length === 1) return;

    const inferred = inferTripServiceType(nextPickup, nextDrop);
    if (!inferred || inferred === currentType) return;
    if (inferred === 'airport' && (!nextPickup || !nextDrop)) return;

    switch (inferred) {
      case 'tour':
        return;
      case 'local':
        setTripType('local');
        sessionStorage.setItem('tripType', 'local');
        setAirportDirectionLabel('');
        return;
      case 'airport':
        setTripType('airport');
        sessionStorage.setItem('tripType', 'airport');
        return;
      case 'outstation':
        setTripType('outstation');
        sessionStorage.setItem('tripType', 'outstation');
        setAirportDirectionLabel('');
        return;
      default: {
        const _never: never = inferred;
        return _never;
      }
    }
  };

  /** When trip intent no longer matches a locked service page, jump to the right landing with prefill. */
  const redirectToInferredServicePage = useCallback(
    (inferred: CustomerTripService) => {
      const path = getServicePathForTripType(inferred);
      if (!path) return false;
      if (location.pathname === path || location.pathname.startsWith(`${path}/`)) return false;

      const prefill = {
        pickupLocation,
        dropLocation: inferred === 'local' ? dropLocation : dropLocation,
        tripType: inferred,
        tripMode: inferred === 'outstation' ? tripMode : 'one-way',
        hourlyPackage,
        pickupDate: pickupDate ? pickupDate.toISOString() : undefined,
        returnDate: returnDate ? returnDate.toISOString() : undefined,
      };
      sessionStorage.setItem('tripType', inferred);
      sessionStorage.setItem('tripMode', prefill.tripMode);
      sessionStorage.setItem('routePrefillData', JSON.stringify(prefill));
      if (pickupLocation) sessionStorage.setItem('pickupLocation', JSON.stringify(pickupLocation));
      if (dropLocation) sessionStorage.setItem('dropLocation', JSON.stringify(dropLocation));

      const labels: Record<CustomerTripService, string> = {
        local: 'Local Taxi',
        airport: 'Airport Taxi',
        outstation: 'Outstation Taxi',
        tour: 'Tours',
      };
      toast({
        title: `Switched to ${labels[inferred]}`,
        description: 'Your locations look like a different trip type — we moved you to the matching page.',
        duration: 3500,
      });
      navigate(path);
      return true;
    },
    [
      location.pathname,
      pickupLocation,
      dropLocation,
      tripMode,
      hourlyPackage,
      pickupDate,
      returnDate,
      toast,
      navigate,
    ]
  );

  // Add function to check if a location should be treated as airport for current trip type
  const shouldTreatAsAirport = (location: Location | null): boolean => {
    if (!location) return false;
    
    // Only apply airport logic when on airport tab
    if (tripType !== 'airport') {
      return false;
    }
    
    return isVizagAirport(location);
  };

  // Add function to update airport direction label
  const updateAirportDirectionLabel = (pickup: Location | null, drop: Location | null) => {
    if (tripType !== 'airport') {
      setAirportDirectionLabel('');
      return;
    }

    // For airport tab, show appropriate labels based on what's selected
    if (isVizagAirport(pickup) && isVizagAirport(drop)) {
      setAirportDirectionLabel('Airport Transfer');
    } else if (isVizagAirport(pickup)) {
      setAirportDirectionLabel('From Airport');
    } else if (isVizagAirport(drop)) {
      setAirportDirectionLabel('To Airport');
    } else if (pickup && !isVizagAirport(pickup) && isVizagAirport(drop)) {
      setAirportDirectionLabel('To Airport');
    } else if (drop && !isVizagAirport(drop) && isVizagAirport(pickup)) {
      setAirportDirectionLabel('From Airport');
    } else if (pickup && isVizagAirport(pickup) && !drop) {
      setAirportDirectionLabel('From Airport');
    } else if (drop && isVizagAirport(drop) && !pickup) {
      setAirportDirectionLabel('To Airport');
    } else {
      setAirportDirectionLabel('');
    }
  };

  const handleAirportDirectionChange = (direction: 'from-airport' | 'to-airport') => {
    if (!airportLocation || tripType !== 'airport') return;
    if (direction === 'from-airport') {
      setPickupLocation(airportLocation);
      setDropLocation(null);
      sessionStorage.setItem('pickupLocation', JSON.stringify(airportLocation));
      sessionStorage.removeItem('dropLocation');
      setAirportDirectionLabel('From Airport');
    } else {
      setPickupLocation(null);
      setDropLocation(airportLocation);
      sessionStorage.removeItem('pickupLocation');
      sessionStorage.setItem('dropLocation', JSON.stringify(airportLocation));
      setAirportDirectionLabel('To Airport');
    }
  };

  const handlePickupLocationChange = (location: Location) => {
    // Check if location is null, undefined, or empty (cleared)
    const isLocationCleared = !location || !location.name || location.name === '';
    
    if (isLocationCleared) {
      if (tripType === 'airport' && airportDirectionLabel !== 'To Airport' && airportLocation) {
        setPickupLocation(airportLocation);
        sessionStorage.setItem('pickupLocation', JSON.stringify(airportLocation));
        return;
      }
      setPickupLocation(null);
      sessionStorage.removeItem('pickupLocation');
      // Set a flag to prevent automatic airport location setting
      sessionStorage.setItem('userClearedPickupLocation', 'true');
      // Clear the flag after a short delay
      setTimeout(() => {
        sessionStorage.removeItem('userClearedPickupLocation');
      }, 1000);
      return;
    }
    
    setIsTabSwitching(false); // Reset tab switching flag when user selects a location

    if (tripType === 'tour') {
      if (!isWithinTourPickupRadius(location)) {
        toast({
          title: 'Pickup too far for tours',
          description:
            'Tour pickup must be within 20 km of Vizag Taxi Hub. Please choose a closer location.',
          variant: 'destructive',
          duration: 4000,
        });
        return;
      }
    } else if (
      !isLocationInVizag(location) &&
      !isVizagAirportLocation(location) &&
      !(tripType === 'airport' && isAirportTransferOtherEnd(location))
    ) {
      toast({
        title: 'Pickup outside service area',
        description:
          'Pickup must be within 35 km of Visakhapatnam or in the Bhogapuram airport area (Vizianagaram / Srikakulam).',
        variant: 'destructive',
        duration: 4000,
      });
      return;
    }

    const pickupRestrictedMessage = getRestrictedAirportRouteBlock(location, dropLocation, tripType);
    if (pickupRestrictedMessage) {
      notifyRestrictedAirportRoute(pickupRestrictedMessage);
      return;
    }

    setRestrictedRouteNotice(null);
    const nextPickup = withCanonicalAirportCoords({ ...location, isInVizag: true }) ?? {
      ...location,
      isInVizag: true,
    };
    setPickupLocation(nextPickup);
    applyInferredHomepageTab(nextPickup, dropLocation, tripType);
    advanceAfterPickupSelected();
  };
  
  const handleDropLocationChange = (location: Location) => {
    // Check if location is null, undefined, or empty (cleared)
    const isLocationCleared = !location || !location.name || location.name === '';
    
    if (isLocationCleared) {
      setRestrictedRouteNotice(null);
      setDropLocation(null);
      sessionStorage.removeItem('dropLocation');
      // Set a flag to prevent automatic airport location setting
      sessionStorage.setItem('userClearedDropLocation', 'true');
      // Clear the flag after a short delay
      setTimeout(() => {
        sessionStorage.removeItem('userClearedDropLocation');
      }, 1000);
      return;
    }
    
    setIsTabSwitching(false); // Reset tab switching flag when user selects a location

    const dropRestrictedMessage = getRestrictedAirportRouteBlock(pickupLocation, location, tripType);
    if (dropRestrictedMessage) {
      notifyRestrictedAirportRoute(dropRestrictedMessage);
      return;
    }

    setRestrictedRouteNotice(null);
    
    if (location.isInVizag === undefined) {
      location.isInVizag = isLocationInVizag(location);
    }

    if (
      tripType === 'local' &&
      !isLocationInVizag(location) &&
      !isVizagAirportLocation(location)
    ) {
      toast({
        title: 'Drop outside service area',
        description:
          'Last drop must be within 35 km of Visakhapatnam. Please choose a location in or near the city.',
        variant: 'destructive',
        duration: 4000,
      });
      return;
    }

    const nextDrop = withCanonicalAirportCoords(location) ?? location;
    setDropLocation(nextDrop);
    applyInferredHomepageTab(pickupLocation, nextDrop, tripType);
    advanceAfterDropSelected();

    const dropOutsideAirportTransfer =
      !isAirportTransferOtherEnd(nextDrop);
    if (tripType === 'airport' && dropOutsideAirportTransfer) {
      switchAirportTripToOutstation();
    }
  };

  const handleAddOutstationStop = () => {
    if (tripType !== 'outstation') return;
    setIntermediateStops((prev) =>
      prev.length >= MAX_OUTSTATION_STOPS ? prev : [...prev, null]
    );
  };

  const handleOutstationStopChange = (index: number, location: Location | null) => {
    setIntermediateStops((prev) => {
      const next = [...prev];
      next[index] = location;
      return next;
    });
  };

  const handleRemoveOutstationStop = (index: number) => {
    setIntermediateStops((prev) => prev.filter((_, i) => i !== index));
  };

  // Locked service landings only (local/airport/outstation) — never change homepage widget tabs
  useEffect(() => {
    if (isTabSwitching) return;
    if (tripType === 'tour' || tripType === 'custom') return;

    const lockedTab =
      visibleTabs && visibleTabs.length === 1 ? (visibleTabs[0] as CustomerTripService) : null;
    if (!lockedTab || lockedTab === 'tour') return;

    const inferred = inferTripServiceType(pickupLocation, dropLocation);
    if (!inferred || inferred === 'tour' || inferred === lockedTab) return;

    // Local hourly packages may start or end at the airport — stay on Local Taxi.
    if (lockedTab === 'local' && inferred === 'airport') return;

    const airportHit = isVizagAirportLocation(pickupLocation) || isVizagAirportLocation(dropLocation);
    if (!dropLocation && !airportHit) return;

    setIsTabSwitching(true);
    redirectToInferredServicePage(inferred);
    setTimeout(() => setIsTabSwitching(false), 1200);
  }, [
    pickupLocation,
    dropLocation,
    tripType,
    visibleTabs,
    isTabSwitching,
    redirectToInferredServicePage,
  ]);

  useEffect(() => {
    if (tripType === 'tour' || tripType === 'custom') return;
    if (!pickupLocation || !dropLocation) return;
    applyInferredHomepageTab(pickupLocation, dropLocation, tripType);
  }, [pickupLocation, dropLocation, tripType, visibleTabs]);

  useEffect(() => {
    sessionStorage.setItem('tripType', tripType);
    sessionStorage.setItem('tripMode', tripMode);
    
    if (tripType === 'airport' && airportLocation) {
      // Reset airport direction label when switching to airport tab
      updateAirportDirectionLabel(pickupLocation, dropLocation);
    } else {
      // Clear airport direction label for non-airport trips
      setAirportDirectionLabel('');
      
      // Tour packages shouldn't keep an airport endpoint from a prior airport tab.
      // Local trips may intentionally use the airport as pickup/drop — do not clear.
      if (tripType === 'tour') {
        if (dropLocation && shouldTreatAsAirport(dropLocation)) {
          setDropLocation(null);
          sessionStorage.removeItem('dropLocation');
        }
        
        if (
          pickupLocation &&
          (shouldTreatAsAirport(pickupLocation) || !isWithinTourPickupRadius(pickupLocation))
        ) {
          setPickupLocation(null);
          sessionStorage.removeItem('pickupLocation');
        }
      }
    }
    
    if (tripType === 'local') {
      // Only clear if not already set by prefill
      if (!pickupLocation && !dropLocation) {
        setDropLocation(null);
        sessionStorage.removeItem('dropLocation');
        setPickupLocation(null);
        sessionStorage.removeItem('pickupLocation');
      }
    }
  }, [tripType, tripMode]);

  useEffect(() => {
    if (pickupLocation) {
      sessionStorage.setItem('pickupLocation', JSON.stringify(pickupLocation));
    } else {
      sessionStorage.removeItem('pickupLocation');
    }
    if (dropLocation) {
      sessionStorage.setItem('dropLocation', JSON.stringify(dropLocation));
    } else {
      sessionStorage.removeItem('dropLocation');
    }
    if (tripType === 'outstation' && intermediateStops.length > 0) {
      sessionStorage.setItem('intermediateStops', JSON.stringify(intermediateStops));
    } else {
      sessionStorage.removeItem('intermediateStops');
    }
  }, [pickupLocation, dropLocation, intermediateStops, tripType]);

  useEffect(() => {
    if (tripType !== 'outstation') {
      setIntermediateStops([]);
    }
  }, [tripType]);

  // Handle airport-specific logic when locations change
  useEffect(() => {
    if (tripType === 'airport' && airportLocation) {
      // Check if user recently cleared locations to prevent automatic setting
      const userClearedDropLocation = sessionStorage.getItem('userClearedDropLocation') === 'true';
      const userClearedPickupLocation = sessionStorage.getItem('userClearedPickupLocation') === 'true';
      
      if (!pickupLocation && !dropLocation && !userClearedPickupLocation && !userClearedDropLocation) {
        setPickupLocation(airportLocation);
        sessionStorage.setItem('pickupLocation', JSON.stringify(airportLocation));
        setAirportDirectionLabel('From Airport');
      }

      if (pickupLocation && pickupLocation.name && !dropLocation && !shouldTreatAsAirport(pickupLocation) && !userClearedDropLocation) {
        setDropLocation(airportLocation);
        sessionStorage.setItem('dropLocation', JSON.stringify(airportLocation));
      }
      
      if (dropLocation && dropLocation.name && !pickupLocation && !shouldTreatAsAirport(dropLocation) && !userClearedPickupLocation) {
        setPickupLocation(airportLocation);
        sessionStorage.setItem('pickupLocation', JSON.stringify(airportLocation));
      }
      
      updateAirportDirectionLabel(pickupLocation, dropLocation);
    } else if (tripType !== 'airport') {
      setAirportDirectionLabel('');
    }
  }, [pickupLocation, dropLocation, tripType, airportLocation]);





  useEffect(() => {
    if (pickupDate) {
      // Always update sessionStorage with the current pickupDate
      sessionStorage.setItem('pickupDate', JSON.stringify(pickupDate));
    }
    if (returnDate) {
      sessionStorage.setItem('returnDate', JSON.stringify(returnDate));
    } else {
      sessionStorage.removeItem('returnDate');
    }
  }, [pickupDate, returnDate]);

  // Keep trip start ≥1h ahead only on the search form (step 1).
  // Do NOT run on results — bumping every 30s chased "now+1h" forever and
  // re-triggered fare calc / looked like a page refresh.
  useEffect(() => {
    if (currentStep !== 1 || isSearchActive) return;

    const bumpIfStale = () => {
      setPickupDate((prev) => {
        const floorMs = Date.now() + 60 * 60 * 1000;
        const floor = new Date(floorMs);
        floor.setSeconds(0, 0);
        if (!prev) return floor;
        const cur = new Date(prev);
        cur.setSeconds(0, 0);
        // 5-minute grace so we don't re-bump on every interval after setting to floor
        if (cur.getTime() >= floorMs - 5 * 60 * 1000) return prev;
        return floor;
      });
    };
    bumpIfStale();
    const id = window.setInterval(bumpIfStale, 30_000);
    return () => window.clearInterval(id);
  }, [currentStep, isSearchActive]);

  useEffect(() => {
    sessionStorage.setItem('hourlyPackage', hourlyPackage);
  }, [hourlyPackage]);

  useEffect(() => {
    routedKmForRouteRef.current = { key: '', km: 0, durationMinutes: 0 };
  }, [pickupLocation, dropLocation]);

  useEffect(() => {
    if (tripType === 'local') {
      const selectedPackage = hourlyPackage === '8hrs-80km' ? 80 : 100;
      setDistance(selectedPackage);
    }
  }, [tripType, hourlyPackage]);



  function handleContinue() {
    if (!isFormValid) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields before continuing.",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }
    if (validationError) {
      toast({
        title: "Invalid Return Time",
        description: validationError,
        variant: "destructive",
        duration: 4000,
      });
      return;
    }

    const restrictedMessage = getRestrictedAirportRouteBlock(pickupLocation, dropLocation, tripType);
    if (restrictedMessage) {
      notifyRestrictedAirportRoute(restrictedMessage);
      return;
    }

    // Locked service pages only — redirect if locations imply a different service
    if (pickupLocation && dropLocation && tripType !== 'tour' && tripType !== 'custom') {
      const lockedTab =
        visibleTabs && visibleTabs.length === 1 ? (visibleTabs[0] as CustomerTripService) : null;
      if (lockedTab && lockedTab !== 'tour') {
        const inferred = inferTripServiceType(pickupLocation, dropLocation);
        if (
          inferred &&
          inferred !== 'tour' &&
          inferred !== lockedTab &&
          !(lockedTab === 'local' && inferred === 'airport')
        ) {
          redirectToInferredServicePage(inferred);
          return;
        }
      }
    }

    void proceedWithSearch();
  }
  handleContinueRef.current = handleContinue;

  /** POST / track-search + session snapshot (guest phone must already be in session if skipping modal). */
  async function runGuestSearchTracking(guestPhone: string) {
    const availableCabs = heroBookingCabList;
    const dropForKm = tripType === 'local' ? pickupLocation : dropLocation;
    const syncKm =
      pickupLocation && dropForKm
        ? filledStops.length > 0
          ? estimateRoadKmAlongRoute(routePointsWithStops(pickupLocation, dropForKm, filledStops))
          : estimateRoadKmSync(pickupLocation, dropForKm)
        : 0;
    const routeKey = buildGuestTrackRouteKey(pickupLocation, dropForKm, filledStops);
    const routed = routedKmForRouteRef.current;
    const coordsOk = (loc: typeof pickupLocation) =>
      !!loc &&
      Number.isFinite(loc.lat) &&
      Number.isFinite(loc.lng) &&
      !(loc.lat === 0 && loc.lng === 0);
    /**
     * Fare cards use Google Distance Matrix (`distance` / CabList). Alerts must use the same km — not
     * `estimateRoadKmSync` (Haversine×1.3), which is often tens of km high and jumps tiers vs the UI.
     */
    let distanceForTrack: number;
    let durationMinutesForTrack: number | undefined;
    if (tripType === 'local') {
      const pkgKm =
        hourlyPackage.includes('4hrs') || hourlyPackage.includes('4 hr')
          ? 40
          : hourlyPackage.includes('10hrs') || hourlyPackage.includes('10 hr')
            ? 100
            : 80;
      distanceForTrack = distance > 0 ? distance : pkgKm;
      durationMinutesForTrack = undefined;
    } else if (
      (tripType === 'outstation' || tripType === 'airport' || tripType === 'custom') &&
      coordsOk(pickupLocation) &&
      coordsOk(dropForKm)
    ) {
      if (routeKey && routed.key === routeKey && routed.km > 0) {
        distanceForTrack = routed.km;
        durationMinutesForTrack =
          routed.durationMinutes > 0 ? routed.durationMinutes : undefined;
      } else {
        try {
          const dm = await measureBookedRoute(pickupLocation!, dropForKm!);
          if (dm.status === 'OK' && dm.distance > 0) {
            distanceForTrack = dm.distance;
            durationMinutesForTrack = dm.duration > 0 ? dm.duration : undefined;
            if (routeKey) {
              routedKmForRouteRef.current = {
                key: routeKey,
                km: dm.distance,
                durationMinutes: dm.duration,
              };
            }
          } else {
            distanceForTrack = syncKm > 0 ? syncKm : distance;
            durationMinutesForTrack = undefined;
          }
        } catch {
          distanceForTrack = syncKm > 0 ? syncKm : distance;
          durationMinutesForTrack = undefined;
        }
      }
    } else {
      distanceForTrack = syncKm > 0 ? syncKm : distance;
      durationMinutesForTrack = undefined;
    }

    if (
      (tripType === 'outstation' || tripType === 'airport' || tripType === 'custom') &&
      distanceForTrack > 0 &&
      (durationMinutesForTrack === undefined || durationMinutesForTrack <= 0)
    ) {
      durationMinutesForTrack = Math.max(1, Math.round((distanceForTrack / 50) * 60));
    }
    const vehicleFares = await buildVehicleFareLinesForGuestTrack(availableCabs, {
      tripType,
      tripMode,
      hourlyPackage,
      distance: distanceForTrack,
      pickupDate,
      returnDate: returnDate || undefined,
    });
    /** Production PHP joins this with commas — include fare in each entry so legacy track-search.php shows prices. */
    const carsShown =
      vehicleFares.length > 0
        ? vehicleFares.map((v) => `${v.name}: ${v.fareText}`)
        : availableCabs.map((c) => c.name);
    const pickup = pickupLocation?.name?.trim() || '';
    const drop = dropLocation?.name?.trim() || (tripType === 'local' ? pickup : '');
    const viaStopsLabel = formatViaStopsLabel(filledStops);
    const tripTypeLabel = buildTripTypeLabelForTrack(tripType, tripMode, hourlyPackage, airportDirectionLabel);
    const distRounded = distanceForTrack > 0 ? Math.round(distanceForTrack) : undefined;
    const durRounded =
      durationMinutesForTrack !== undefined && durationMinutesForTrack > 0
        ? Math.round(durationMinutesForTrack)
        : undefined;
    const departure = formatDepartureForTrack(pickupDate);
    /** PHP `search_alerts_format_route_summary` reads distance/duration fields — keep trip type label only. */
    trackGuestSearch({
      guestPhone,
      pickup,
      drop: formatGuestTrackDropField(drop, viaStopsLabel),
      viaStops: viaStopsLabel || undefined,
      tripType: tripTypeLabel,
      departure,
      distanceKmOneWay: distRounded,
      durationMinutesOneWay: durRounded,
      tripModeTrack: tripMode,
      carsShown,
      vehicleFares,
    });

    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(
          SESSION_GUEST_SEARCH_SNAPSHOT_KEY,
          JSON.stringify({
            updatedAt: new Date().toISOString(),
            guestPhone,
            pickup,
            drop: formatGuestTrackDropField(drop, viaStopsLabel),
            viaStops: viaStopsLabel || undefined,
            tripType: tripTypeLabel,
            tripTypeLabel,
            departure,
            carsShown,
            vehicleFares,
            distanceKmOneWay: distRounded,
            durationMinutesOneWay: durRounded,
            tripModeTrack: tripMode,
            selectedCab: selectedCab?.name ?? null,
          })
        );
      }
    } catch {
      /* ignore quota / private mode */
    }
  }

  // Helper function to proceed with the search after distance checks
  async function proceedWithSearch() {
    const blockedRouteMessage = getRestrictedAirportRouteBlock(pickupLocation, dropLocation, tripType);
    if (blockedRouteMessage) {
      notifyRestrictedAirportRoute(blockedRouteMessage);
      return;
    }
    if (tripType !== 'tour') {
    const dropTourText = dropLocation
      ? `${dropLocation.name || ''} ${dropLocation.address || ''}`
      : '';
    const pickupTourText = pickupLocation
      ? `${pickupLocation.name || ''} ${pickupLocation.address || ''}`
      : '';
    if (locationLooksLikeArakuTour(dropTourText) || locationLooksLikeArakuTour(pickupTourText)) {
      navigate('/tours/araku-valley-tour', { replace: true });
      return;
    }

    // Check if drop location is Lambasingi - redirect to Lambasingi tour page
       if (dropLocation && dropLocation.name) {
        const dropLocationName = dropLocation.name.toLowerCase().trim();
      const lambasingiKeywords = ['lambasingi', 'kothapalli', 'lambasingi hill top view'];
        
      if (lambasingiKeywords.some(keyword => dropLocationName.includes(keyword))) {
          navigate('/tours/lambasingi-tour', { replace: true });
          return;
        }
      }

    // Check if drop location is Paderu/Vanajangi area - redirect to Vanajangi tour page
    if (dropLocation && dropLocation.name) {
      const dropLocationName = dropLocation.name.toLowerCase().trim();
      const vanajangiKeywords = [
        'paderu', 'vanajangi', 'vanajangi view point', 'vanajangi viewpoint',
        'paderu town', 'paderu village', 'paderu mandal',
        'thotapalli', 'thotapalli reservoir', 'thotapalli dam',
        'munchingput', 'munchingput mandal', 'munchingput village',
        'gudem', 'gudem sathupalli', 'gudem sathupalli mandal',
        'hukumpeta', 'hukumpeta mandal', 'hukumpeta village',
        'dumbriguda', 'dumbriguda mandal', 'dumbriguda village',
        'pedabayalu', 'pedabayalu mandal', 'pedabayalu village',
        'golugonda', 'golugonda mandal', 'golugonda village',
        'nathavaram', 'nathavaram mandal', 'nathavaram village',
        'chintapalli', 'chintapalli mandal', 'chintapalli village',
        'koyyuru', 'koyyuru mandal', 'koyyuru village',
        'maddimadugu', 'maddimadugu mandal', 'maddimadugu village',
        'guduru', 'guduru mandal', 'guduru village',
        'yellavaram', 'yellavaram mandal', 'yellavaram village',
        'sabari', 'sabari river', 'sabari valley',
        'sileru', 'sileru river', 'sileru valley',
        'gosthani', 'gosthani river', 'gosthani valley',
        'tribal', 'tribal areas', 'tribal villages',
        'agency', 'agency areas', 'agency villages'
      ];
      
      // Check for exact matches and partial matches
      const isVanajangiLocation = vanajangiKeywords.some(keyword => {
        const match = dropLocationName.includes(keyword) || keyword.includes(dropLocationName);
        if (match) {
          console.log('Vanajangi keyword match:', keyword, 'in location:', dropLocationName);
        }
        return match;
      });
      
      if (isVanajangiLocation) {
        console.log('Vanajangi location detected in drop location:', dropLocationName);
        navigate('/tours/vanajangi-tour', { replace: true });
        return;
      }
    }

    // Check if pickup location is Paderu/Vanajangi area - redirect to Vanajangi tour page
    if (pickupLocation && pickupLocation.name) {
      const pickupLocationName = pickupLocation.name.toLowerCase().trim();
      const vanajangiKeywords = [
        'paderu', 'vanajangi', 'vanajangi view point', 'vanajangi viewpoint',
        'paderu town', 'paderu village', 'paderu mandal',
        'thotapalli', 'thotapalli reservoir', 'thotapalli dam',
        'munchingput', 'munchingput mandal', 'munchingput village',
        'gudem', 'gudem sathupalli', 'gudem sathupalli mandal',
        'hukumpeta', 'hukumpeta mandal', 'hukumpeta village',
        'dumbriguda', 'dumbriguda mandal', 'dumbriguda village',
        'pedabayalu', 'pedabayalu mandal', 'pedabayalu village',
        'golugonda', 'golugonda mandal', 'golugonda village',
        'nathavaram', 'nathavaram mandal', 'nathavaram village',
        'chintapalli', 'chintapalli mandal', 'chintapalli village',
        'koyyuru', 'koyyuru mandal', 'koyyuru village',
        'maddimadugu', 'maddimadugu mandal', 'maddimadugu village',
        'guduru', 'guduru mandal', 'guduru village',
        'yellavaram', 'yellavaram mandal', 'yellavaram village',
        'sabari', 'sabari river', 'sabari valley',
        'sileru', 'sileru river', 'sileru valley',
        'gosthani', 'gosthani river', 'gosthani valley',
        'tribal', 'tribal areas', 'tribal villages',
        'agency', 'agency areas', 'agency villages'
      ];
      
      // Check for exact matches and partial matches
      const isVanajangiLocation = vanajangiKeywords.some(keyword => {
        const match = pickupLocationName.includes(keyword) || keyword.includes(pickupLocationName);
        if (match) {
          console.log('Vanajangi keyword match:', keyword, 'in location:', pickupLocationName);
        }
        return match;
      });
      
      if (isVanajangiLocation) {
        console.log('Vanajangi location detected in pickup location:', pickupLocationName);
        navigate('/tours/vanajangi-tour', { replace: true });
        return;
      }
    }

    }

    const cachedGuestPhone =
      typeof sessionStorage !== 'undefined'
        ? sessionStorage.getItem(SESSION_GUEST_TRACK_PHONE_KEY)?.trim() || ''
        : '';
    const mustCollectPhone =
      !skipPhoneGateRef.current &&
      user?.role !== 'super_admin' &&
      !cachedGuestPhone;

    if (mustCollectPhone) {
      setShowGuestPhoneModal(true);
      return;
    }
    skipPhoneGateRef.current = false;

    if (user?.role !== 'super_admin' && cachedGuestPhone && !skipNextGuestTrackRef.current) {
      await runGuestSearchTracking(cachedGuestPhone);
    }
    skipNextGuestTrackRef.current = false;

    if (onSearch) onSearch({
      pickupLocation,
      dropLocation,
      intermediateStops: filledStops,
      pickupDate,
      returnDate,
      tripType,
      tripMode,
      hourlyPackage,
      selectedCab
    });
    resetPageScroll();
    setIsLoading(true);
    
    // If trip type is tour, go to chosen package detail or browse all tours
    if (tripType === 'tour') {
      if (!isWithinTourPickupRadius(pickupLocation)) {
        toast({
          title: 'Pickup too far for tours',
          description:
            'Tour pickup must be within 20 km of Vizag Taxi Hub. Please choose a closer location.',
          variant: 'destructive',
          duration: 4000,
        });
        setIsLoading(false);
        return;
      }
      if (dropLocation?.id?.startsWith('tour_')) {
        const tourKey = dropLocation.id.replace(/^tour_/, '');
        navigate(getTourUrl({ tourId: tourKey, tourName: dropLocation.name }), {
          state: { pickupLocation, pickupDate },
        });
      } else {
        navigate('/tours', {
          state: {
            pickupLocation,
            pickupDate,
          },
        });
      }
      setTimeout(() => setIsLoading(false), 300);
      return;
    }
    
    // For other trip types, continue with existing flow
    // Immediately switch to step 2 (hide banner), then finish any animations
    setCurrentStep(2);
    if (onStepChange) onStepChange(2);
    onTripEditOpenChange?.(false);

    // Offer campaign is loaded by the step-2 effect (also covers homepage Hero remount)

    // If we're in sliding search mode, hide the search widget after updating
    if (isSlidingSearch) {
      setTimeout(() => {
        setIsSlidingSearch(false);
      }, 2000); // Increased delay to allow the search to complete and animation to be visible
    }
    
    setTimeout(() => {
      setIsLoading(false);
    }, 300);
  }

  async function handleGuestPhoneModalSubmit() {
    if (guestPhoneDigits.length !== guestPhoneCountry.maxLength) {
      toast({
        title: 'Invalid number',
        description: `Enter a valid ${guestPhoneCountry.maxLength}-digit number for ${guestPhoneCountry.name}.`,
        variant: 'destructive',
        duration: 3000,
      });
      return;
    }
    const guestPhone = `${guestPhoneCountry.dialCode}${guestPhoneDigits}`;
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(SESSION_GUEST_TRACK_PHONE_KEY, guestPhone);
      }
    } catch {
      /* ignore */
    }

    await runGuestSearchTracking(guestPhone);
    skipNextGuestTrackRef.current = true;

    setGuestPhoneDigits('');
    setGuestPhoneCountry(defaultWhatsappCountry());
    setShowGuestPhoneModal(false);
    skipPhoneGateRef.current = true;
    void proceedWithSearch();
  }

  function handleDistanceCalculated(calculatedDistance: number, calculatedDuration: number) {
    // Only update distance for non-local trips
    if (tripType !== 'local') {
      const rk = buildGuestTrackRouteKey(pickupLocation, dropLocation, filledStops);
      if (rk) {
        routedKmForRouteRef.current = {
          key: rk,
          km: calculatedDistance,
          durationMinutes: calculatedDuration,
        };
      }
      setDistance(calculatedDistance);
      setDuration(calculatedDuration);
      setIsCalculatingDistance(false);
    }
  };

  function calculatePrice() {
    if (!selectedCab) return 0;
    const currentCab = selectedCab;
    
    let totalPrice = 0;
    
    if (tripType === 'airport') {
      totalPrice = getAirportTransferFare(currentCab, distance);
    } else if (tripType === 'local') {
      // For local trips, use only the package price (no driver allowance or extras)
      totalPrice = getLocalPackagePrice(hourlyPackage, currentCab.name);
      // Only add extra distance if it's specifically calculated for local trips
      // and is greater than the package limit
      const packageKm = hourlyPackage === '8hrs-80km' ? 80 : 100;
      if (distance > packageKm && tripType === 'local') {
        const extraKm = distance - packageKm;
        const extraKmRate = currentCab.pricePerKm;
        totalPrice += extraKm * extraKmRate;
      }
    } else if (tripType === 'outstation') {
      let basePrice = 0, perKmRate = 0, driverAllowance = 250, nightHaltCharge = 0;
      
      switch (currentCab.name.toLowerCase()) {
        case "sedan":
          basePrice = 4200;
          perKmRate = 14;
          nightHaltCharge = 700;
          break;
        case "ertiga":
          basePrice = 5400;
          perKmRate = 18;
          nightHaltCharge = 1000;
          break;
        case "innova crysta":
          basePrice = 6000;
          perKmRate = 20;
          nightHaltCharge = 1000;
          break;
        default:
          basePrice = currentCab.price;
          perKmRate = currentCab.pricePerKm;
          nightHaltCharge = 700;
      }
      
      if (tripMode === 'one-way') {
        const days = 1;
        const totalMinKm = days * 300;
        const effectiveDistance = distance * 2;
        const extraKm = Math.max(effectiveDistance - totalMinKm, 0);
        const totalBaseFare = basePrice;
        const totalDistanceFare = extraKm * perKmRate;
        const totalDriverAllowance = driverAllowance;
        
        totalPrice = totalBaseFare + totalDistanceFare + totalDriverAllowance;
      } else {
        const days = countOutstationBillingDays(pickupDate, returnDate);
        const totalMinKm = days * 300;
        const effectiveDistance = distance * 2;
        const extraKm = Math.max(effectiveDistance - totalMinKm, 0);
        const totalBaseFare = days * basePrice;
        const totalDistanceFare = extraKm * perKmRate;
        const totalDriverAllowance = days * driverAllowance;
        const totalNightHalt = (days - 1) * nightHaltCharge;
        
        totalPrice = totalBaseFare + totalDistanceFare + totalDriverAllowance + totalNightHalt;
      }
    }
    
    return Math.ceil(totalPrice / 10) * 10;
  };

  let totalPrice = calculatePrice();
  /** Prefer BookingSummary's calculated total; fall back to Hero estimate only while fare is still loading. */
  const payReadyTotal = finalTotal > 0 ? finalTotal : totalPrice;
  const bookingPaybarRef = useRef<HTMLDivElement>(null);
  const showMobileBookingPaybar =
    currentStep === 2 &&
    !showGuestDetailsForm &&
    !isSlidingSearch &&
    !!selectedCab &&
    payReadyTotal > 0 &&
    !restrictedAirportRouteMessage;

  // After cab search on mobile: compact AI FAB + lift above sticky Part Pay / Book Now
  const showMobileBookingResults =
    currentStep === 2 && !showGuestDetailsForm && !isSlidingSearch;

  useLayoutEffect(() => {
    if (typeof document === 'undefined') return;
    const panels = document.querySelectorAll<HTMLElement>('.pac-container');
    if (showGuestDetailsForm) {
      setShowGuestPhoneModal(false);
      panels.forEach((el) => {
        el.remove();
      });
      return;
    }
    panels.forEach((el) => {
      el.style.removeProperty('visibility');
      el.style.removeProperty('pointer-events');
    });
  }, [showGuestDetailsForm]);

  useLayoutEffect(() => {
    if (showMobileBookingResults) {
      document.documentElement.dataset.vthBookingUi = 'results';
    } else {
      delete document.documentElement.dataset.vthBookingUi;
    }
    return () => {
      delete document.documentElement.dataset.vthBookingUi;
    };
  }, [showMobileBookingResults]);

  useLayoutEffect(() => {
    if (!showMobileBookingPaybar) {
      document.documentElement.style.setProperty('--vth-chat-clearance', '0px');
      return;
    }
    const el = bookingPaybarRef.current;
    if (!el) {
      document.documentElement.style.setProperty('--vth-chat-clearance', '0px');
      return;
    }
    const publish = () => {
      const h = Math.ceil(el.getBoundingClientRect().height);
      document.documentElement.style.setProperty('--vth-chat-clearance', `${Math.max(0, h)}px`);
    };
    publish();
    const ro = new ResizeObserver(publish);
    ro.observe(el);
    return () => {
      ro.disconnect();
      document.documentElement.style.setProperty('--vth-chat-clearance', '0px');
    };
  }, [showMobileBookingPaybar, bookingPaymentMode, offerApplied, offerCampaign, payReadyTotal]);
  const websiteFareBase =
    websiteFareTotal > 0
      ? websiteFareTotal
      : !offerApplied && finalTotal > 0
        ? finalTotal
        : totalPrice;
  const offerCategoryKey = resolveOfferCampaignCategory(tripType, tripMode);
  const offerTravelYmd = toOfferTravelDateYmd(pickupDate);
  const offerTravelHm = toOfferTravelTimeHm(pickupDate);
  const offerVehicleId = normalizeOfferTargetId(selectedCab?.vehicleId || selectedCab?.id || null);
  const offerTourId = normalizeOfferTargetId(
    dropLocation?.id?.startsWith('tour_') ? dropLocation.id.slice('tour_'.length) : null
  );
  const offerTripRoute = useMemo(
    () => toOfferTripRoute(pickupLocation, dropLocation),
    [
      pickupLocation?.name,
      pickupLocation?.address,
      pickupLocation?.lat,
      pickupLocation?.lng,
      dropLocation?.name,
      dropLocation?.address,
      dropLocation?.lat,
      dropLocation?.lng,
    ]
  );
  const offerDiscountAmount =
    offerApplied && offerCampaign
      ? Math.max(
          0,
          offerCampaign.pricing?.savings ??
            computeOfferPricing(offerCampaign, websiteFareBase || 0).savings
        )
      : 0;
  const offerDiscountCode =
    offerApplied && offerCampaign ? offerCampaign.coupon_code : null;
  const displayDistance = tripMode === 'round-trip' ? distance * 2 : distance;
  const displayDuration = tripMode === 'round-trip' ? duration * 2 : duration;

  const handleBaseFareChange = useCallback((total: number) => {
    const next = Math.max(0, Number(total) || 0);
    setWebsiteFareTotal((prev) => (prev === next ? prev : next));
    if (offerApplied && offerCampaign && next > 0) {
      const pricing = computeOfferPricing(offerCampaign, next);
      setOfferCampaign((prev) => {
        if (
          prev &&
          prev.pricing?.offer_fare === pricing.offer_fare &&
          prev.pricing?.savings === pricing.savings &&
          prev.pricing?.website_fare === pricing.website_fare
        ) {
          return prev;
        }
        return prev ? { ...prev, pricing } : prev;
      });
      setFinalTotal((prev) => (prev === pricing.offer_fare ? prev : pricing.offer_fare));
      return;
    }
    setFinalTotal((prev) => (prev === next ? prev : next));
  }, [offerApplied, offerCampaign]);

  const applyOfferCampaign = (c: OfferCampaignPublic) => {
    if (!isOfferRouteEligible(c, offerTripRoute, true)) {
      const route = formatOfferRouteScope(c);
      toast({
        title: 'Coupon not valid for this trip',
        description: route
          ? `This offer is only valid from ${route}`
          : 'This offer is only valid for the campaign pickup and destination',
        variant: 'destructive',
        duration: 4000,
      });
      return;
    }
    if (
      !isOfferTravelDateEligible(c, offerTravelYmd) ||
      !isOfferTravelTimeEligible(c, offerTravelHm, true)
    ) {
      const when = formatOfferCouponWorksOn(c);
      toast({
        title: 'Invalid or expired coupon for this trip',
        description: when
          ? `This code works for ${when}.`
          : 'Change your pickup date or time to use this coupon',
        variant: 'destructive',
        duration: 6000,
      });
      return;
    }
    const base = websiteFareTotal > 0 ? websiteFareTotal : totalPrice;
    const pricing =
      c.pricing && c.pricing.website_fare > 0
        ? c.pricing
        : computeOfferPricing(c, base || 0);
    setOfferCampaign({ ...c, pricing });
    offerCampaignIdRef.current = c.id;
    setOfferApplied(true);
    if (pricing.offer_fare >= 0 && base > 0) {
      setFinalTotal(pricing.offer_fare);
    }
    toast({
      title: 'Coupon applied',
      description: `${c.coupon_code} · you save ₹${pricing.savings.toLocaleString('en-IN')}`,
      duration: 3000,
    });
  };

  const removeOfferCampaign = () => {
    setOfferApplied(false);
    setOfferRedemptionId(null);
    setFinalTotal(websiteFareTotal > 0 ? websiteFareTotal : totalPrice);
  };

  async function handleGuestDetailsSubmit(guestDetails: any) {
    try {
      setIsLoading(true);
      const authToken = localStorage.getItem('authToken');
      
      // Use the totalPrice passed from GuestDetailsForm
      let latestTotal = guestDetails.totalPrice;
      let discountAmount = 0;
      let redemptionId: number | null = null;
      const websiteFare =
        websiteFareTotal > 0 ? websiteFareTotal : Number(guestDetails.totalPrice) || 0;

      if (
        offerApplied &&
        offerCampaign &&
        resolveOfferCampaignCategory(tripType, tripMode) &&
        websiteFare > 0 &&
        guestDetails.phone
      ) {
        try {
          const applied = await offerCampaignAPI.public.applyCoupon({
            coupon_code: offerCampaign.coupon_code,
            customer_phone: String(guestDetails.phone),
            website_fare: websiteFare,
            travel_date: toOfferTravelDateYmd(pickupDate),
            travel_time: toOfferTravelTimeHm(pickupDate),
            vehicle_id: offerVehicleId,
            tour_id: offerTourId,
            trip_route: offerTripRoute,
          });
          redemptionId = applied.redemption_id;
          setOfferRedemptionId(applied.redemption_id);
          latestTotal = applied.pricing.offer_fare;
          discountAmount = applied.pricing.savings;
        } catch (offerErr) {
          console.warn('Offer apply failed, continuing at regular fare', offerErr);
          setOfferApplied(false);
        }
      }

      const bookingData: BookingRequest = {
        pickupLocation: pickupLocation ? `${pickupLocation.name}, ${pickupLocation.address}` : '',
        dropLocation: dropLocation ? `${dropLocation.name}, ${dropLocation.address}` : '',
        pickupDate: formatDateForAPI(pickupDate) || '',
        returnDate: returnDate ? formatDateForAPI(returnDate) : null,
        cabType: selectedCab?.name || '',
        vehicleType: selectedCab?.name || '',
        distance: distance,
        tripType: tripType,
        tripMode: tripMode,
        totalAmount: latestTotal,
        passengerName: guestDetails.name,
        passengerPhone: guestDetails.phone,
        passengerCountryCode: guestDetails.countryCode,
        passengerEmail: guestDetails.email,
        additionalRequirements: [
          guestDetails.additionalRequirements?.trim() || '',
          formatViaStopsLabel(filledStops) ? `Via/Stops: ${formatViaStopsLabel(filledStops)}` : '',
        ]
          .filter(Boolean)
          .join('\n') || undefined,
        via_stops: formatViaStopsLabel(filledStops) || undefined,
        gstEnabled: !!guestDetails.gstEnabled,
        gstDetails: guestDetails.gstEnabled ? {
          gstNumber: guestDetails.gstNumber,
          companyName: guestDetails.companyName,
          companyAddress: guestDetails.companyAddress,
          companyEmail: guestDetails.companyEmail,
        } : undefined,
        hourlyPackage: tripType === 'local' ? hourlyPackage : null,
      };

      const response = await bookingAPI.createBooking(bookingData);
      const bookingId =
        response.data?.data?.id ?? response.data?.id ?? response.id ?? response.booking_id;

      if (redemptionId && discountAmount > 0) {
        try {
          await offerCampaignAPI.public.completeRedemption(
            redemptionId,
            String(bookingId ?? '')
          );
        } catch {
          /* payment may complete later */
        }
      }
      
      const bookingDataForStorage = {
        bookingId,
        bookingNumber: response.data?.data?.bookingNumber ?? response.data?.bookingNumber ?? response.bookingNumber ?? response.data?.booking_number ?? response.booking_number,
        pickupLocation,
        dropLocation,
        intermediateStops: filledStops,
        via_stops: formatViaStopsLabel(filledStops) || undefined,
        pickupDate: formatDateForAPI(pickupDate),
        returnDate: returnDate ? formatDateForAPI(returnDate) : null,
        selectedCab,
        distance,
        totalPrice: websiteFare || latestTotal,
        discountAmount,
        finalPrice: latestTotal,
        offerCoupon: discountAmount > 0 && offerCampaign ? offerCampaign.coupon_code : null,
        offerRedemptionId: redemptionId,
        guestDetails,
        tripType,
        tripMode,
      };
      sessionStorage.setItem('bookingDetails', JSON.stringify(bookingDataForStorage));

      // Redirect to payment page instead of confirmation
      navigate("/payment");
    } catch (error) {
      console.error('Error creating booking:', error);
      toast({
        title: "Booking Failed",
        description: error instanceof Error ? error.message : "Failed to create booking. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const persistBookingPaymentMode = (mode: 'partial' | 'full') => {
    setBookingPaymentMode(mode);
    sessionStorage.setItem('paymentMode', mode);
  };

  function handleBookNow() {
    if (restrictedAirportRouteMessage) {
      notifyRestrictedAirportRoute(restrictedAirportRouteMessage);
      return;
    }
    if (!isFormValid || !selectedCab) {
      toast({
        title: "Missing information",
        description: "Please complete all required fields",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    sessionStorage.setItem('paymentMode', bookingPaymentMode);
    setShowGuestDetailsForm(true);

    // Scroll to top so user sees "Complete Your Booking" (reliable on mobile and desktop)
    setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }, 200);
  };

  function handleBackToSelection() {
    setShowGuestDetailsForm(false);
    setCurrentStep(2);
    if (onStepChange) onStepChange(2);
  };

  // Custom handler for tab (trip type) changes
  const handleTabChange = (type: TripSelectorTab) => {
    setTripType(type === 'custom' ? 'custom' : type);
    setRestrictedRouteNotice(null);
    setDistance(0);
    setDuration(0);
    
    setIntermediateStops([]);
    sessionStorage.removeItem('intermediateStops');

    if (!visibleTabs || visibleTabs.length > 1) {
      setDropLocation(null);
      sessionStorage.removeItem('dropLocation');
      sessionStorage.setItem('userClearedDropLocation', 'true');
      window.setTimeout(() => {
        sessionStorage.removeItem('userClearedDropLocation');
      }, 1000);
    }

    if (type === 'airport' && !pickupLocation && vizagAirportLocations.length > 0) {
      const defaultAirport =
        vizagAirportLocations.find((loc) => loc.id === 'vizag_city_airport') ??
        vizagAirportLocations[0];
      setPickupLocation(defaultAirport);
      sessionStorage.setItem('pickupLocation', JSON.stringify(defaultAirport));
      setAirportDirectionLabel('From Airport');
    }
    
    // Reset the tab switching flag immediately
    setIsTabSwitching(false);
  };

  // Add a wrapper to setSelectedCab that also scrolls to summary
  const setSelectedCab = (cab: CabType) => {
    setSelectedCabState(cab);
    // Use requestAnimationFrame to ensure DOM has updated, then smooth scroll to booking summary
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        bookingSummaryRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
          inline: 'nearest'
        });
      });
    });
  };

  // Test helper for locked-page redirects only (debug)
  const testAutomaticSwitching = () => {
    const lockedTab =
      visibleTabs && visibleTabs.length === 1 ? (visibleTabs[0] as CustomerTripService) : null;
    if (!lockedTab || lockedTab === 'tour') return;
    const inferred = inferTripServiceType(pickupLocation, dropLocation);
    if (!inferred || inferred === 'tour' || inferred === lockedTab) return;
    if (lockedTab === 'local' && inferred === 'airport') return;
    redirectToInferredServicePage(inferred);
  };

  useEffect(() => {
    if (!isSearchActive) {
      setCurrentStep(1);
      return;
    }
    const hasPickup = Boolean(pickupLocation?.name);
    const hasDrop = Boolean(dropLocation?.name);
    const canShowResults = tripType === 'local' ? hasPickup : hasPickup && hasDrop;
    if (canShowResults) {
      setCurrentStep(2);
      resetPageScroll();
    } else {
      setCurrentStep(1);
    }
  }, [isSearchActive, pickupLocation, dropLocation, tripType]);

  /**
   * Load / refresh the active offer whenever results are shown.
   * Homepage used to remount Hero on `?search=1`, dropping in-flight offer loads;
   * this effect also covers direct `?search=1` landings and trip-type / date changes.
   */
  useEffect(() => {
    const onResults = currentStep >= 2 || Boolean(isSearchActive);
    if (!onResults) return;

    const offerCategory = resolveOfferCampaignCategory(tripType, tripMode);
    if (!offerCategory) {
      setOfferCampaign(null);
      offerCampaignIdRef.current = null;
      setOfferApplied(false);
      setOfferRedemptionId(null);
      setOfferPopupOpen(false);
      return;
    }

    const travelYmd = offerTravelYmd;
    let cancelled = false;
    void (async () => {
      const result = await loadOfferCampaignForSearch(
        offerCategory,
        0,
        travelYmd,
        offerVehicleId,
        offerTourId,
        offerTripRoute,
        offerTravelHm
      );
      if (cancelled) return;

      if (!result.campaign) {
        setOfferCampaign(null);
        offerCampaignIdRef.current = null;
        setOfferApplied(false);
        setOfferRedemptionId(null);
        setFinalTotal(websiteFareTotal > 0 ? websiteFareTotal : totalPrice);
        return;
      }

      const next = result.campaign;
      const pending = readHomePendingOffer();
      const homeApplied =
        Boolean(pending) &&
        pending!.id === next.id &&
        pending!.category === next.category;
      const sameCampaign = offerCampaignIdRef.current === next.id;

      if (homeApplied) {
        setOfferCampaign(next);
        offerCampaignIdRef.current = next.id;
        setOfferApplied(
          isOfferRouteEligible(next, offerTripRoute, true) &&
            isOfferTravelTimeEligible(next, offerTravelHm, true)
        );
        clearHomePendingOffer();
        return;
      }

      if (sameCampaign) {
        if (
          !isOfferRouteEligible(next, offerTripRoute, true) ||
          !isOfferTravelTimeEligible(next, offerTravelHm, true)
        ) {
          setOfferApplied(false);
          setOfferRedemptionId(null);
          setFinalTotal(websiteFareTotal > 0 ? websiteFareTotal : totalPrice);
        }
        return;
      }

      setOfferCampaign(next);
      offerCampaignIdRef.current = next.id;
      setOfferApplied(false);
      setOfferRedemptionId(null);
      if (result.shouldShowPopup) {
        setOfferPopupOpen(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentStep, isSearchActive, tripType, tripMode, offerTravelYmd, offerTravelHm, offerVehicleId, offerTourId, offerTripRoute]);

  // Notify parent on initial step as well
  useEffect(() => {
    if (onStepChange) onStepChange(currentStep);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  // Update selectedCab when available vehicles change due to date filtering
  useEffect(() => {
    if (!pickupDate || !vehiclesLoaded) return;

    const availableVehicles = heroBookingCabList;

    if (normalizedLockSlug) {
      if (availableVehicles.length === 0) {
        setSelectedCabState(null);
      } else if (!selectedCab || !availableVehicles.some((v) => v.id === selectedCab.id)) {
        setSelectedCabState(availableVehicles[0]);
      }
      return;
    }

    if (selectedCab) {
      const isSelectedCabAvailable = availableVehicles.some(vehicle => vehicle.id === selectedCab.id);

      if (!isSelectedCabAvailable && availableVehicles.length > 0) {
        setSelectedCab(availableVehicles[0]);
      } else if (availableVehicles.length === 0) {
        setSelectedCab(null);
      }
    }
  }, [
    pickupDate,
    returnDate,
    selectedCab,
    vehiclesLoaded,
    normalizedLockSlug,
    heroBookingCabList,
  ]);

  useEffect(() => {
    if (
      isMobile &&
      isLoaded && // Only run when Google Maps API is loaded
      (tripType === 'outstation' || tripType === 'airport' || tripType === 'custom') &&
      pickupLocation &&
      dropLocation
    ) {
      setIsCalculatingDistance(true);
      measureBookedRoute(pickupLocation, dropLocation)
        .then(result => {
          if (result.status === 'OK') {
            const rk = buildGuestTrackRouteKey(pickupLocation, dropLocation, filledStops);
            if (rk) {
              routedKmForRouteRef.current = {
                key: rk,
                km: result.distance,
                durationMinutes: result.duration,
              };
            }
            setDistance(result.distance);
            setDuration(result.duration);
          }
        })
        .finally(() => setIsCalculatingDistance(false));
    }
    // Only run when these change
  }, [isMobile, isLoaded, tripType, pickupLocation, dropLocation, filledStops, measureBookedRoute]);

  const canSubmitGuestPhone = guestPhoneDigits.length === guestPhoneCountry.maxLength;
  const isPremiumHomeShell = !hideBackground && !embedCompactLayout && !isSearchActive;
  const axisHomeLayout = isHomePremiumHero && currentStep === 1;
  const showHomeHeroBanner = axisHomeLayout;
  const showPremiumHomeBookingStack =
    isPremiumHomeShell && (currentStep === 1 || (isSlidingSearch && currentStep === 2));

  return (
    <div className="relative">
      {/* Mobile Edit Form Overlay — above fixed site navbar (z-[9999]) */}
      {isMobile && showMobileEditForm && (
        <div className="fixed inset-0 z-[10050] overflow-y-auto overscroll-contain bg-white" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="sticky top-0 z-10 flex flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowMobileEditForm(false);
                onTripEditOpenChange?.(false);
              }}
              className="text-gray-600"
            >
              <X className="mr-2 h-5 w-5" />
              Cancel
            </Button>
            <h2 className="text-lg font-semibold">Edit Booking</h2>
            <div className="w-16"></div> {/* Spacer for center alignment */}
          </div>
          
                     <div className="px-2 pb-28 pt-4">
            {/* Trip Type Selector */}
            <div className="mb-1 w-full">
              <TabTripSelector
                selectedTab={ensureCustomerTripType(tripType)}
                tripMode={tripMode}
                onTabChange={handleTabChange}
                onTripModeChange={handleTripModeChangeWithAdvance}
                tripModeFocusRef={mobileTripModeFocusRef}
                visibleTabs={visibleTabs}
                showTripModeToggle
                tripModeToggleMobileOnly
                hideUrbaniaPromo
                hidePromoSlider
                suppressMobileCardChrome={heroMobileFormShellWrap}
                urbaniaMobileTripTiles={heroMobileTicketStyle}
              />
            </div>

            <div
              key={`booking-form-${editTrigger}`}
              className={
                heroMobileFormShellWrap
                  ? heroMobileTicketShellFormWrapClass
                  : 'mb-4 rounded-2xl border border-gray-200 bg-white px-3 pb-3 pt-3 shadow-md shadow-gray-900/5'
              }
            >
              <div
                className={cn(
                  'flex flex-col',
                  heroMobileTicketStyle
                    ? cn(
                        'divide-y divide-gray-200 overflow-hidden',
                        heroMobileFormShellWrap
                          ? 'rounded-lg border-0 bg-transparent'
                          : 'rounded-xl border border-gray-200 bg-white shadow-sm'
                      )
                    : 'gap-3'
                )}
              >
                {heroMobileTicketStyle && showFromToFields ? (
                  <div className="flex min-h-0 items-stretch bg-white">
                    <div className="relative w-[14px] shrink-0 self-stretch py-1.5" aria-hidden>
                      <div className="absolute left-1/2 top-[1.25rem] h-2 w-2 -translate-x-1/2 rounded-full border-2 border-blue-600 bg-white" />
                      <div className="absolute bottom-[1.25rem] left-1/2 h-2 w-2 -translate-x-1/2 rounded-full border-2 border-blue-600 bg-white" />
                      <div className="absolute left-1/2 top-[1.85rem] bottom-[1.85rem] w-0 -translate-x-1/2 border-l-2 border-dashed border-blue-500/55" />
                    </div>
                    <div className="min-w-0 flex-1 divide-y divide-gray-200">
                      <LocationInput
                        key={`pickup-mobile-${editTrigger}-${pickupLocation?.id || 'empty'}`}
                        variant={heroMobileFieldVariant}
                        className={heroTicketCellPad}
                        label="From"
                        placeholder="Enter pickup location"
                        value={pickupInputValue}
                        onLocationChange={handlePickupLocationChange}
                        isPickupLocation={true}
                        tripType={tripType}
                        hideLeadingIcon
                      />
                      {tripType === 'outstation' && intermediateStops.length === 0 && (
                        <OutstationAddStopLink
                          stopCount={0}
                          onAdd={handleAddOutstationStop}
                          variant="card"
                        />
                      )}
                      {tripType === 'outstation' && (
                        <OutstationStopRows
                          stops={intermediateStops}
                          onChange={handleOutstationStopChange}
                          onRemove={handleRemoveOutstationStop}
                          layout="ticket"
                          fieldVariant={heroMobileFieldVariant}
                          cellClassName={heroTicketCellPad}
                          editTrigger={editTrigger}
                        />
                      )}
                      <LocationInput
                        key={`drop-mobile-${tripType}-${editTrigger}-${dropLocation?.id || 'empty'}`}
                        variant={heroMobileFieldVariant}
                        className={heroTicketCellPad}
                        label={dropFieldLabel}
                        placeholder={dropFieldPlaceholder}
                        value={dropInputValue}
                        onLocationChange={handleDropLocationChange}
                        isPickupLocation={false}
                        tripType={tripType}
                        hideLeadingIcon
                        hideRestrictedAirportDrops={hideRestrictedAirportDrops}
                        onRequestOutstationSwitch={
                          tripType === 'airport' ? switchAirportTripToOutstation : undefined
                        }
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <LocationInput
                      key={`pickup-mobile-${editTrigger}-${pickupLocation?.id || 'empty'}`}
                      variant={heroMobileFieldVariant}
                      className={heroTicketCellPad}
                      label="From"
                      placeholder="Enter pickup location"
                      value={pickupInputValue}
                      onLocationChange={handlePickupLocationChange}
                      isPickupLocation={true}
                      tripType={tripType}
                    />

                    {tripType === 'outstation' && intermediateStops.length === 0 && (
                      <OutstationAddStopLink
                        stopCount={0}
                        onAdd={handleAddOutstationStop}
                        variant="card"
                      />
                    )}
                    {tripType === 'outstation' && (
                      <OutstationStopRows
                        stops={intermediateStops}
                        onChange={handleOutstationStopChange}
                        onRemove={handleRemoveOutstationStop}
                        layout="stacked"
                        fieldVariant={heroMobileFieldVariant}
                        cellClassName={heroTicketCellPad}
                        editTrigger={editTrigger}
                      />
                    )}

                    {showFromToFields && (
                      <LocationInput
                        key={`drop-mobile-${tripType}-${editTrigger}-${dropLocation?.id || 'empty'}`}
                        variant={heroMobileFieldVariant}
                        className={heroTicketCellPad}
                        label={dropFieldLabel}
                        placeholder={dropFieldPlaceholder}
                        value={dropInputValue}
                        onLocationChange={handleDropLocationChange}
                        isPickupLocation={false}
                        tripType={tripType}
                        hideRestrictedAirportDrops={hideRestrictedAirportDrops}
                        onRequestOutstationSwitch={
                          tripType === 'airport' ? switchAirportTripToOutstation : undefined
                        }
                      />
                    )}
                  </>
                )}

                {tripType === 'outstation' && intermediateStops.length > 0 && (
                  <OutstationAddStopLink
                    stopCount={intermediateStops.length}
                    onAdd={handleAddOutstationStop}
                    more
                    className="px-2 py-2"
                  />
                )}

                {tripType === 'tour' && (
                  <div
                    className={cn(
                      'w-full',
                      heroTourLocalRowClass,
                      heroMobileTicketStyle && heroTicketSelectRowFocusClass
                    )}
                  >
                    {heroMobileTicketStyle && (
                      <TourTabIcon className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" aria-hidden />
                    )}
                    <div
                      className={cn(
                        heroMobileTicketStyle ? 'min-w-0 flex-1 flex flex-col gap-0.5' : 'w-full'
                      )}
                    >
                      {heroMobileTicketStyle ? (
                        <span className="text-[11px] font-medium leading-none text-gray-500">Tour package</span>
                      ) : (
                        <label className="mb-1 block text-[11px] font-medium tracking-wide text-slate-500 pointer-events-none">
                          Tour package
                        </label>
                      )}
                      <Select
                        value={
                          dropLocation?.id?.startsWith('tour_')
                            ? dropLocation.id.slice('tour_'.length)
                            : undefined
                        }
                        onValueChange={(tourId) => {
                          if (tourId === '__all_tours__') {
                            navigate('/tours', { state: { pickupLocation, pickupDate } });
                            return;
                          }
                          const t = sortedHeroTours.find((x) => x.tourId === tourId);
                          applyHeroTourPackageSelection(t ?? null);
                        }}
                        disabled={heroTourListLoading}
                      >
                        <SelectTrigger
                          className={cn(
                            heroMobileTicketStyle
                              ? heroUrbaniaMobileTourSelectTrigger
                              : heroMobileTourSelectTriggerDefault
                          )}
                        >
                          <SelectValue
                            placeholder={
                              heroTourListLoading ? 'Loading packages…' : 'Select a tour package'
                            }
                          />
                        </SelectTrigger>
                        <SelectContent
                          {...(heroMobileTicketStyle
                            ? heroUrbaniaMobileSelectContentProps
                            : heroTourPackageSelectContentProps)}
                        >
                          {sortedHeroTours.map((t) => (
                            <SelectItem key={t.tourId} value={t.tourId}>
                              {t.tourName}
                            </SelectItem>
                          ))}
                          <SelectItem value="__all_tours__">All packages — browse full list</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {tripType === 'local' && (
                  <div
                    className={cn(
                      'w-full',
                      heroTourLocalRowClass,
                      heroMobileTicketStyle && heroTicketSelectRowFocusClass
                    )}
                  >
                    {heroMobileTicketStyle && (
                      <Clock className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" aria-hidden />
                    )}
                    <div
                      className={cn(
                        heroMobileTicketStyle ? 'min-w-0 flex-1 flex flex-col gap-0.5' : 'w-full'
                      )}
                    >
                      {heroMobileTicketStyle ? (
                        <span className="text-[11px] font-medium leading-none text-gray-500">Package</span>
                      ) : (
                        <label className="mb-1 block text-[11px] font-medium tracking-wide text-slate-500 pointer-events-none">
                          Package
                        </label>
                      )}
                      {heroMobileTicketStyle ? (
                        <Select value={hourlyPackage} onValueChange={setHourlyPackage}>
                          <SelectTrigger className={heroUrbaniaMobileTourSelectTrigger} aria-label="Hourly package">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent {...heroUrbaniaMobileSelectContentProps}>
                            {hourlyPackageOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Select value={hourlyPackage} onValueChange={setHourlyPackage}>
                          <SelectTrigger
                            className={cn(heroMobileTourSelectTriggerDefault, 'pr-8')}
                            aria-label="Hourly package"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent {...heroTourPackageSelectContentProps}>
                            {hourlyPackageOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                )}

                <DateTimePicker
                  variant={heroMobileFieldVariant}
                  className={heroTicketCellPad}
                  label="Trip start"
                  date={pickupDate}
                  onDateChange={handlePickupDateChange}
                  minDate={getMinimumAllowedDate()}
                />

                {tripType === 'outstation' && tripMode === 'round-trip' && (
                  <DateTimePicker
                    variant={heroMobileFieldVariant}
                    className={heroTicketCellPad}
                    label="Return trip"
                    date={returnDate}
                    onDateChange={handleReturnDateChange}
                    minDate={pickupDate}
                    disabled={!isReturnTimeEnabled}
                  />
                )}
              </div>
            </div>

            <Button
              onClick={() => {
                setShowMobileEditForm(false);
                onTripEditOpenChange?.(false);
                handleContinue();
              }}
              className="flex h-12 w-full items-center justify-center rounded-xl bg-blue-600 px-6 text-sm font-extrabold uppercase tracking-wide text-white shadow-md hover:bg-blue-700"
              disabled={!isFormValid}
            >
              Update search
            </Button>
          </div>
        </div>
      )}
      
      {/* Booking Widget Section */}
      <section
        id="booking-widget"
        className={cn(
          axisHomeLayout && 'premium-hero-section',
          !isSearchActive && currentStep === 1
            ? embedCompactLayout
              ? 'relative z-20 py-0'
              : axisHomeLayout
                ? 'relative z-20 w-full py-0 max-lg:py-1 max-lg:pb-2 lg:pb-14'
                : 'relative z-20 py-1 sm:absolute sm:inset-0 sm:flex sm:items-center sm:justify-center sm:z-30 sm:py-0'
            : 'relative z-20 py-0 sm:py-0',
          (currentStep === 1 || isSlidingSearch) && embedCompactLayout
            ? 'hero-embed-page-spacing'
            : hideBackground && (currentStep === 1 || isSlidingSearch)
              ? 'hero-edit-form-spacing'
              : isSearchActive || currentStep === 2 || showGuestDetailsForm
                ? 'hero-booking-flow-spacing'
                : '',
          embedStretchToShell ? 'hero-embed-pay-footer-compact' : '',
          'w-full px-0 sm:px-0',
          isSlidingSearch && !isSearchActive ? 'animate-slide-down' : ''
        )}
      >
        <div
          className={
            embedStretchToShell
              ? 'w-full'
              : cn(
                  'w-full',
                  axisHomeLayout
                    ? 'max-w-none px-0'
                    : cn('sm:container sm:mx-auto sm:px-4', heroMobileUnifiedShell ? 'max-lg:px-0' : 'max-lg:px-2'),
                )
          }
        >
          <div
            className={
              embedStretchToShell
                ? 'w-full'
                : cn(
                    'w-full sm:mx-auto',
                    axisHomeLayout
                      ? 'premium-hero-shell w-full px-0'
                      : cn('sm:container sm:px-4', heroMobileUnifiedShell ? 'max-lg:px-0' : 'max-lg:px-2'),
                  )
            }
          >
            {showHomeHeroBanner && (
              <div className="hidden lg:block">
                <HomeHeroBanner />
              </div>
            )}
            <div
              className={cn(
                showPremiumHomeBookingStack &&
                  cn(
                    'premium-hero-booking-wrap premium-home-stack home-page-container',
                    isSlidingSearch && currentStep === 2 && 'premium-hero-booking-wrap--inline-edit',
                  ),
              )}
            >
            <div
              className={
                urbaniaMobileEmbedShell
                  ? cn(
                      'p-3 lg:rounded-3xl lg:border lg:border-gray-100 lg:bg-white lg:shadow-2xl',
                      urbaniaUnifiedShell
                        ? 'max-lg:overflow-visible max-lg:rounded-none max-lg:border-0 max-lg:bg-transparent max-lg:p-0 max-lg:shadow-none'
                        : cn(heroMobileTicketShellCardClass, heroMobileTicketShellPaddingClass)
                    )
                    : showPremiumHomeBookingStack
                    ? cn(
                        'premium-booking-card premium-booking-card--glass animate-booking-slide-up w-full p-3.5 sm:p-4 lg:p-4',
                        // Classic home ticket chrome below lg — desktop keeps glass card
                        heroMobileTicketShellCardClass,
                        heroMobileTicketShellPaddingHomeClass,
                        'max-lg:animate-none',
                      )
                    : heroMobileUnifiedShell
                      ? cn(
                          'p-3 lg:rounded-3xl lg:border lg:border-gray-100 lg:bg-white lg:shadow-2xl',
                          heroMobileTicketShellCardClass,
                          heroMobileTicketShellPaddingHomeClass
                        )
                      : cn(
                          'max-lg:bg-white lg:bg-white rounded-none sm:rounded-3xl shadow-none sm:shadow-[0_20px_60px_-15px_rgba(37,99,235,0.12)] border-0 sm:border sm:border-blue-100 p-3 max-lg:p-0 max-lg:py-2',
                          embedDesktopCardLayout &&
                            'lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none',
                        )
              }
            >
              
              
              {!showGuestDetailsForm ? (
                <>
                  {(currentStep === 1 || isSlidingSearch) && (
                    <div
                      className={cn(
                        'space-y-6 sm:space-y-8 lg:space-y-0',
                        heroMobileTicketStyle
                          ? urbaniaUnifiedShell || heroMobileUnifiedShell || isServiceLandingEmbed
                            ? 'max-lg:space-y-2'
                            : 'max-lg:space-y-0.5'
                          : 'max-lg:space-y-1.5'
                      )}
                    >
                      {/* Promo slider removed on home — Custom Itinerary is a 5th tab instead */}
                      <div
                        className={cn(
                          'w-full max-lg:mb-0 max-lg:min-w-0 lg:mb-4',
                          embedDesktopCardLayout && 'lg:hidden lg:mb-0',
                        )}
                      >
                        <TabTripSelector
                          selectedTab={ensureCustomerTripType(tripType)}
                          tripMode={tripMode}
                          onTabChange={handleTabChange}
                          onTripModeChange={handleTripModeChangeWithAdvance}
                          tripModeFocusRef={mobileTripModeFocusRef}
                          visibleTabs={visibleTabs}
                          airportDirectionLabel={tripType === 'airport' ? airportDirectionLabel : undefined}
                          onAirportDirectionChange={
                            tripType === 'airport'
                              ? (direction) => {
                                  handleAirportDirectionChange(direction);
                                  advanceAfterTripModeSelected();
                                }
                              : undefined
                          }
                          showTripModeToggle
                          tripModeToggleMobileOnly
                          hideUrbaniaPromo
                          hidePromoSlider
                          suppressMobileCardChrome={heroMobileFormShellWrap}
                          urbaniaMobileTripTiles={heroMobileTicketStyle}
                        />
                      </div>

                      {/* MOBILE/TABLET: current form - hidden on desktop (lg) */}
                      <div className="lg:hidden max-lg:min-w-0">
                      <div
                        key={`booking-form-mobile-${editTrigger}`}
                        className={
                          heroMobileFormShellWrap
                            ? heroMobileTicketShellFormWrapClass
                            : 'mb-4 rounded-2xl border border-gray-200 bg-white px-3 pb-3 pt-3 shadow-md shadow-gray-900/5'
                        }
                      >
                        <div
                          className={cn(
                            'flex flex-col',
                            heroMobileTicketStyle
                              ? cn(
                                  'divide-y divide-gray-200 overflow-hidden',
                                  heroMobileFormShellWrap
                                    ? 'rounded-lg border-0 bg-transparent'
                                    : 'rounded-xl border border-gray-200 bg-white shadow-sm'
                                )
                              : 'gap-3'
                          )}
                        >
                          {heroMobileTicketStyle && showFromToFields ? (
                            <div className="flex min-h-0 items-stretch bg-white">
                              <div className="relative w-[14px] shrink-0 self-stretch py-1.5" aria-hidden>
                                <div className="absolute left-1/2 top-[1.25rem] h-2 w-2 -translate-x-1/2 rounded-full border-2 border-blue-600 bg-white" />
                                <div className="absolute bottom-[1.25rem] left-1/2 h-2 w-2 -translate-x-1/2 rounded-full border-2 border-blue-600 bg-white" />
                                <div className="absolute left-1/2 top-[1.85rem] bottom-[1.85rem] w-0 -translate-x-1/2 border-l-2 border-dashed border-blue-500/55" />
                              </div>
                              <div className="min-w-0 flex-1 divide-y divide-gray-200">
                                <LocationInput
                                  key={`pickup-${editTrigger}-${pickupLocation?.id || 'empty'}`}
                                  variant={heroMobileFieldVariant}
                                  className={heroTicketCellPad}
                                  label="From"
                                  placeholder="Enter pickup location"
                                  value={pickupInputValue}
                                  onLocationChange={handlePickupLocationChange}
                                  isPickupLocation={true}
                                  tripType={tripType}
                                  hideLeadingIcon
                                />
                                {tripType === 'outstation' && intermediateStops.length === 0 && (
                                  <OutstationAddStopLink
                                    stopCount={0}
                                    onAdd={handleAddOutstationStop}
                                    variant="card"
                                  />
                                )}
                                {tripType === 'outstation' && (
                                  <OutstationStopRows
                                    stops={intermediateStops}
                                    onChange={handleOutstationStopChange}
                                    onRemove={handleRemoveOutstationStop}
                                    layout="ticket"
                                    fieldVariant={heroMobileFieldVariant}
                                    cellClassName={heroTicketCellPad}
                                    editTrigger={editTrigger}
                                  />
                                )}
                                <LocationInput
                                  key={`drop-${tripType}-${editTrigger}-${dropLocation?.id || 'empty'}`}
                                  ref={(instance) => {
                                    dropLocationInputRefs.current.mobile = instance;
                                  }}
                                  variant={heroMobileFieldVariant}
                                  className={heroTicketCellPad}
                                  label={dropFieldLabel}
                                  placeholder={dropFieldPlaceholder}
                                  value={dropInputValue}
                                  onLocationChange={handleDropLocationChange}
                                  isPickupLocation={false}
                                  tripType={tripType}
                                  hideLeadingIcon
                                  hideRestrictedAirportDrops={hideRestrictedAirportDrops}
                                  onRequestOutstationSwitch={
                                    tripType === 'airport' ? switchAirportTripToOutstation : undefined
                                  }
                                />
                              </div>
                            </div>
                          ) : (
                            <>
                              <LocationInput
                                key={`pickup-${editTrigger}-${pickupLocation?.id || 'empty'}`}
                                variant={heroMobileFieldVariant}
                                className={heroTicketCellPad}
                                label="From"
                                placeholder="Enter pickup location"
                                value={pickupInputValue}
                                onLocationChange={handlePickupLocationChange}
                                isPickupLocation={true}
                                tripType={tripType}
                              />

                              {tripType === 'outstation' && intermediateStops.length === 0 && (
                                <OutstationAddStopLink
                                  stopCount={0}
                                  onAdd={handleAddOutstationStop}
                                  variant="card"
                                />
                              )}
                              {tripType === 'outstation' && (
                                <OutstationStopRows
                                  stops={intermediateStops}
                                  onChange={handleOutstationStopChange}
                                  onRemove={handleRemoveOutstationStop}
                                  layout="stacked"
                                  fieldVariant={heroMobileFieldVariant}
                                  cellClassName={heroTicketCellPad}
                                  editTrigger={editTrigger}
                                />
                              )}

                              {showFromToFields && (
                                <LocationInput
                                  key={`drop-${tripType}-${editTrigger}-${dropLocation?.id || 'empty'}`}
                                  ref={(instance) => {
                                    dropLocationInputRefs.current.mobile = instance;
                                  }}
                                  variant={heroMobileFieldVariant}
                                  className={heroTicketCellPad}
                                  label={dropFieldLabel}
                                  placeholder={dropFieldPlaceholder}
                                  value={dropInputValue}
                                  onLocationChange={handleDropLocationChange}
                                  isPickupLocation={false}
                                  tripType={tripType}
                                  hideRestrictedAirportDrops={hideRestrictedAirportDrops}
                                  onRequestOutstationSwitch={
                                    tripType === 'airport' ? switchAirportTripToOutstation : undefined
                                  }
                                />
                              )}
                            </>
                          )}

                          {tripType === 'outstation' && intermediateStops.length > 0 && (
                            <OutstationAddStopLink
                              stopCount={intermediateStops.length}
                              onAdd={handleAddOutstationStop}
                              more
                              className="px-2 py-2"
                            />
                          )}

                          {tripType === 'tour' && (
                            <div
                              className={cn(
                                'w-full',
                                heroTourLocalRowClass,
                                heroMobileTicketStyle && heroTicketSelectRowFocusClass
                              )}
                            >
                              {heroMobileTicketStyle && (
                                <TourTabIcon className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" aria-hidden />
                              )}
                              <div
                                className={cn(
                                  heroMobileTicketStyle
                                    ? 'min-w-0 flex-1 flex flex-col gap-0.5'
                                    : 'w-full'
                                )}
                              >
                                {heroMobileTicketStyle ? (
                                  <span className="text-[11px] font-medium leading-none text-gray-500">Tour package</span>
                                ) : (
                                  <label className="mb-1 block text-[11px] font-medium tracking-wide text-slate-500 pointer-events-none">
                                    Tour package
                                  </label>
                                )}
                                <Select
                                  value={
                                    dropLocation?.id?.startsWith('tour_')
                                      ? dropLocation.id.slice('tour_'.length)
                                      : undefined
                                  }
                                  onValueChange={(tourId) => {
                                    if (tourId === '__all_tours__') {
                                      navigate('/tours', { state: { pickupLocation, pickupDate } });
                                      return;
                                    }
                                    const t = sortedHeroTours.find((x) => x.tourId === tourId);
                                    applyHeroTourPackageSelection(t ?? null);
                                  }}
                                  disabled={heroTourListLoading}
                                >
                                  <SelectTrigger
                                    ref={(el) => {
                                      tourPackageTriggerRefs.current.mobile = el;
                                    }}
                                    className={cn(
                                      heroMobileTicketStyle
                                        ? heroUrbaniaMobileTourSelectTrigger
                                        : heroMobileTourSelectTriggerDefault
                                    )}
                                  >
                                    <SelectValue
                                      placeholder={
                                        heroTourListLoading ? 'Loading packages…' : 'Select a tour package'
                                      }
                                    />
                                  </SelectTrigger>
                                  <SelectContent
                          {...(heroMobileTicketStyle
                            ? heroUrbaniaMobileSelectContentProps
                            : heroTourPackageSelectContentProps)}
                        >
                                    {sortedHeroTours.map((t) => (
                                      <SelectItem key={t.tourId} value={t.tourId}>
                                        {t.tourName}
                                      </SelectItem>
                                    ))}
                                    <SelectItem value="__all_tours__">All packages — browse full list</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          )}

                          {tripType === 'local' && (
                            <div
                              className={cn(
                                'w-full',
                                heroTourLocalRowClass,
                                heroMobileTicketStyle && heroTicketSelectRowFocusClass
                              )}
                            >
                              {heroMobileTicketStyle && (
                                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" aria-hidden />
                              )}
                              <div
                                className={cn(
                                  heroMobileTicketStyle
                                    ? 'min-w-0 flex-1 flex flex-col gap-0.5'
                                    : 'w-full'
                                )}
                              >
                                {heroMobileTicketStyle ? (
                                  <span className="text-[11px] font-medium leading-none text-gray-500">Package</span>
                                ) : (
                                  <label className="mb-1 block text-[11px] font-medium tracking-wide text-slate-500 pointer-events-none">
                                    Package
                                  </label>
                                )}
                                <Select
                                  value={hourlyPackage}
                                  onValueChange={(value) => {
                                    setHourlyPackage(value);
                                    advanceAfterTripModeSelected();
                                  }}
                                >
                                  <SelectTrigger
                                    ref={(el) => {
                                      packageSelectRefs.current.mobile = el as unknown as HTMLSelectElement;
                                    }}
                                    className={
                                      heroMobileTicketStyle
                                        ? heroUrbaniaMobileTourSelectTrigger
                                        : cn(heroMobileTourSelectTriggerDefault, 'pr-8')
                                    }
                                    aria-label="Hourly package"
                                  >
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent
                                    {...(heroMobileTicketStyle
                                      ? heroUrbaniaMobileSelectContentProps
                                      : heroTourPackageSelectContentProps)}
                                  >
                                    {hourlyPackageOptions.map((option) => (
                                      <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          )}

                          <DateTimePicker
                            ref={(instance) => {
                              departurePickerRefs.current.mobile = instance;
                            }}
                            variant={heroMobileFieldVariant}
                            className={heroTicketCellPad}
                            label="Trip start"
                            date={pickupDate}
                            onDateChange={handlePickupDateChange}
                            onDateApplied={advanceAfterDepartureApplied}
                            minDate={getMinimumAllowedDate()}
                          />

                          {tripType === 'outstation' && tripMode === 'round-trip' && (
                            <DateTimePicker
                              ref={(instance) => {
                                returnPickerRefs.current.mobile = instance;
                              }}
                              variant={heroMobileFieldVariant}
                              className={heroTicketCellPad}
                              label="Return trip"
                              date={returnDate}
                              onDateChange={handleReturnDateChange}
                              onDateApplied={advanceAfterReturnApplied}
                              minDate={pickupDate}
                              disabled={!isReturnTimeEnabled}
                            />
                          )}
                        </div>

                        {vehicleEmbedConfig && (
                          <div className="mt-1.5 lg:hidden">
                            <VehicleEmbedMobileFeatureBar
                              labels={vehicleEmbedConfig.featureStripLabels}
                              ariaLabel={vehicleEmbedConfig.featureBarAriaLabel}
                            />
                          </div>
                        )}

                        {validationError && (
                          <div className="mt-2 rounded-lg bg-red-50 px-2 py-1.5 text-sm text-red-600">{validationError}</div>
                        )}

                        {isCalculatingDistance && (
                          <div className="flex items-center justify-center py-2">
                            <div className="mr-3 h-6 w-6 animate-spin rounded-full border-b-2 border-blue-500"></div>
                            <p className="font-medium text-gray-600">Calculating route distance...</p>
                          </div>
                        )}

                        <Button
                          ref={(el) => {
                            searchButtonRefs.current.mobile = el;
                          }}
                          onClick={handleContinue}
                          disabled={!pickupLocation || !pickupLocation.name || isCalculatingDistance || isLoading || !isFormValid}
                          className={cn(
                            'axis-search-btn mt-4 flex h-11 w-full items-center justify-center px-4 text-sm uppercase tracking-wide shadow-md disabled:opacity-60',
                            (urbaniaMobileEmbedShell || heroMobileUnifiedShell || isServiceLandingEmbed) && 'max-lg:mt-2'
                          )}
                        >
                          {isLoading ? (
                            <div className="flex items-center normal-case">
                              <div className="mr-3 h-5 w-5 animate-spin rounded-full border-b-2 border-white"></div>
                              <span>Searching…</span>
                            </div>
                          ) : (
                            <span className="flex items-center gap-2">
                              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                                <path
                                  fillRule="evenodd"
                                  d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              {vehicleEmbedConfig?.searchButtonLabel ?? 'Search'}
                            </span>
                          )}
                        </Button>
                        {visibleRestrictedAirportMessage && (
                          <RestrictedAirportRouteNotice message={visibleRestrictedAirportMessage} />
                        )}
                        {showHomeHeroBanner && <MobileTrustBanner />}
                        {isVehicleEmbedLock && (
                          <p className="mt-2.5 flex flex-wrap items-center justify-center gap-x-2 px-1 text-center text-[11px] leading-snug text-slate-600 lg:hidden">
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
                            <span>100% Safe Booking</span>
                            <span className="text-slate-400" aria-hidden>
                              ·
                            </span>
                            <span>No Hidden Charges</span>
                          </p>
                        )}
                      </div>
                      </div>

                      {/* DESKTOP ONLY: horizontal row, or stacked card for Local marketing hero */}
                      <div
                        className={cn('hidden lg:block', embedDesktopCardLayout ? 'mt-0' : '!mt-3')}
                        style={embedDesktopCardLayout ? undefined : { marginTop: '12px' }}
                      >
                        {embedDesktopCardLayout && (
                          <h2 className="mb-4 text-left text-xl font-bold tracking-tight text-slate-900">
                            {embedDesktopCardTitle || 'Book Your Cab'}
                          </h2>
                        )}
                        <div
                          className={
                            embedDesktopCardLayout
                              ? 'flex flex-col gap-3'
                              : 'flex flex-row flex-nowrap items-end gap-4'
                          }
                        >
                          <div className={embedDesktopCardLayout ? 'w-full min-w-0' : 'min-w-0 flex-1'}>
                            <LocationInput
                              key={`pickup-desk-${editTrigger}-${pickupLocation?.id || 'empty'}`}
                              label="Pickup location"
                              placeholder={
                                embedDesktopCardLayout ? 'Enter pickup location' : 'Enter a location'
                              }
                              value={pickupInputValue}
                              onLocationChange={handlePickupLocationChange}
                              isPickupLocation={true}
                              tripType={tripType}
                              variant="desktop"
                            />
                          </div>
                          {showFromToFields && (
                            <div className={embedDesktopCardLayout ? 'w-full min-w-0' : 'min-w-0 flex-1'}>
                              <LocationInput
                                key={`drop-desk-${tripType}-${editTrigger}-${dropLocation?.id || 'empty'}`}
                                ref={(instance) => {
                                  dropLocationInputRefs.current.desktop = instance;
                                }}
                                label={dropFieldDesktopLabel}
                                placeholder={
                                  tripType === 'local'
                                    ? 'Enter last drop location'
                                    : embedDesktopCardLayout
                                      ? 'Enter drop location'
                                      : 'Enter a location'
                                }
                                value={dropInputValue}
                                onLocationChange={handleDropLocationChange}
                                isPickupLocation={false}
                                tripType={tripType}
                                variant="desktop"
                                hideRestrictedAirportDrops={hideRestrictedAirportDrops}
                                onRequestOutstationSwitch={
                                  tripType === 'airport' ? switchAirportTripToOutstation : undefined
                                }
                              />
                            </div>
                          )}
                          {tripType === 'tour' && (
                            <div className="flex-1 min-w-0 min-w-[10rem] flex flex-col gap-1">
                              <label className="text-xs text-gray-600 font-medium pointer-events-none">
                                Tour package
                              </label>
                              <Select
                                value={
                                  dropLocation?.id?.startsWith('tour_')
                                    ? dropLocation.id.slice('tour_'.length)
                                    : undefined
                                }
                                onValueChange={(tourId) => {
                                  if (tourId === '__all_tours__') {
                                    navigate('/tours', { state: { pickupLocation, pickupDate } });
                                    return;
                                  }
                                  const t = sortedHeroTours.find((x) => x.tourId === tourId);
                                  applyHeroTourPackageSelection(t ?? null);
                                }}
                                disabled={heroTourListLoading}
                              >
                                <SelectTrigger
                                  ref={(el) => {
                                    tourPackageTriggerRefs.current.desktop = el;
                                  }}
                                  className={cn(
                                    'flex h-[2.75rem] w-full items-center rounded-xl border border-slate-200/90 bg-white text-sm font-bold shadow-sm',
                                    'hover:bg-slate-50/80',
                                    'focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0',
                                    'focus-visible:border-slate-300 focus-visible:shadow-[0_0_0_3px_rgba(15,23,42,0.06)]',
                                    'data-[state=open]:border-slate-300 data-[state=open]:shadow-[0_0_0_3px_rgba(15,23,42,0.06)]',
                                    'data-[placeholder]:font-semibold data-[placeholder]:text-gray-500 disabled:opacity-60'
                                  )}
                                >
                                  <SelectValue
                                    placeholder={
                                      heroTourListLoading ? 'Loading packages…' : 'Select package'
                                    }
                                  />
                                </SelectTrigger>
                                <SelectContent {...heroTourPackageSelectContentProps}>
                                  {sortedHeroTours.map((t) => (
                                    <SelectItem key={t.tourId} value={t.tourId}>
                                      {t.tourName}
                                    </SelectItem>
                                  ))}
                                  <SelectItem value="__all_tours__">All packages — browse full list</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                          {(tripType === 'outstation' || tripType === 'airport' || tripType === 'custom' || tripType === 'tour') && (
                            <div
                              className={cn(
                                'flex flex-col gap-1',
                                embedDesktopCardLayout ? 'w-full' : 'flex-shrink-0',
                              )}
                            >
                              <span className="text-xs text-gray-600 font-medium pointer-events-none">Trip</span>
                              <div
                                className={cn(
                                  'axis-trip-toggle',
                                  embedDesktopCardLayout && 'w-full',
                                )}
                              >
                                {tripType === 'airport' ? (
                                  <>
                                    <button
                                      ref={desktopTripModeFocusRef}
                                      type="button"
                                      onClick={() => {
                                        handleAirportDirectionChange('from-airport');
                                        advanceAfterTripModeSelected();
                                      }}
                                      data-active={airportDirectionLabel === 'From Airport' ? 'true' : 'false'}
                                      className="axis-trip-toggle-btn flex-1 whitespace-nowrap text-xs"
                                    >
                                      From Airport
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        handleAirportDirectionChange('to-airport');
                                        advanceAfterTripModeSelected();
                                      }}
                                      data-active={airportDirectionLabel === 'To Airport' ? 'true' : 'false'}
                                      className="axis-trip-toggle-btn flex-1 whitespace-nowrap text-xs"
                                    >
                                      To Airport
                                    </button>
                                  </>
                                ) : (
                                  [{ label: 'One Way', value: 'one-way' }, { label: 'Round Trip', value: 'round-trip' }].map((option, optionIndex) => (
                                    <button
                                      key={option.value}
                                      ref={optionIndex === 0 ? desktopTripModeFocusRef : undefined}
                                      type="button"
                                      onClick={() => handleTripModeChangeWithAdvance(option.value as 'one-way' | 'round-trip')}
                                      data-active={tripMode === option.value ? 'true' : 'false'}
                                      className="axis-trip-toggle-btn flex-1 whitespace-nowrap text-xs"
                                    >
                                      {option.label}
                                    </button>
                                  ))
                                )}
                              </div>
                            </div>
                          )}
                          {embedDesktopCardLayout && tripType === 'local' ? (
                            <div className="grid w-full grid-cols-2 gap-3">
                              <div className="flex min-w-0 flex-col gap-1">
                                <label className="text-xs font-medium text-slate-500">Package</label>
                                <Select
                                  value={hourlyPackage}
                                  onValueChange={(value) => {
                                    setHourlyPackage(value);
                                    advanceAfterTripModeSelected();
                                  }}
                                >
                                  <SelectTrigger
                                    ref={(el) => {
                                      packageSelectRefs.current.desktop = el as unknown as HTMLSelectElement;
                                    }}
                                    aria-label="Hourly package"
                                    className={cn(
                                      'flex h-[2.75rem] w-full items-center rounded-xl border border-slate-200/90 bg-white pl-3 pr-9 text-sm font-bold shadow-sm',
                                      'hover:bg-slate-50/80',
                                      'focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0',
                                      'focus-visible:border-slate-300 focus-visible:shadow-[0_0_0_3px_rgba(15,23,42,0.06)]',
                                      'data-[state=open]:border-slate-300 data-[state=open]:shadow-[0_0_0_3px_rgba(15,23,42,0.06)]'
                                    )}
                                  >
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent {...heroTourPackageSelectContentProps}>
                                    {hourlyPackageOptions.map((opt) => (
                                      <SelectItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="min-w-0">
                                <DateTimePicker
                                  ref={(instance) => {
                                    departurePickerRefs.current.desktop = instance;
                                  }}
                                  date={pickupDate}
                                  onDateChange={handlePickupDateChange}
                                  onDateApplied={advanceAfterDepartureApplied}
                                  minDate={getMinimumAllowedDate()}
                                  label="Date & Time"
                                  variant="desktop"
                                />
                              </div>
                            </div>
                          ) : embedDesktopCardLayout ? (
                            <div
                              className={cn(
                                'grid w-full gap-3',
                                tripType === 'outstation' && tripMode === 'round-trip'
                                  ? 'grid-cols-2'
                                  : 'grid-cols-1',
                              )}
                            >
                              <div className="min-w-0">
                                <DateTimePicker
                                  ref={(instance) => {
                                    departurePickerRefs.current.desktop = instance;
                                  }}
                                  date={pickupDate}
                                  onDateChange={handlePickupDateChange}
                                  onDateApplied={advanceAfterDepartureApplied}
                                  minDate={getMinimumAllowedDate()}
                                  label="Date & Time"
                                  variant="desktop"
                                />
                              </div>
                              {tripType === 'outstation' && tripMode === 'round-trip' && (
                                <div className="min-w-0">
                                  <DateTimePicker
                                    ref={(instance) => {
                                      returnPickerRefs.current.desktop = instance;
                                    }}
                                    date={returnDate}
                                    onDateChange={handleReturnDateChange}
                                    onDateApplied={advanceAfterReturnApplied}
                                    minDate={pickupDate}
                                    label="Return"
                                    disabled={!isReturnTimeEnabled}
                                    variant="desktop"
                                  />
                                </div>
                              )}
                            </div>
                          ) : (
                            <>
                              {tripType === 'local' && (
                                <div className="flex min-w-0 flex-1 flex-col gap-1">
                                  <label className="text-xs font-medium text-slate-500">Package</label>
                                  <Select
                                    value={hourlyPackage}
                                    onValueChange={(value) => {
                                      setHourlyPackage(value);
                                      advanceAfterTripModeSelected();
                                    }}
                                  >
                                    <SelectTrigger
                                      ref={(el) => {
                                        packageSelectRefs.current.desktop = el as unknown as HTMLSelectElement;
                                      }}
                                      aria-label="Hourly package"
                                      className={cn(
                                        'flex h-[2.75rem] w-full items-center rounded-xl border border-slate-200/90 bg-white pl-3 pr-9 text-sm font-bold shadow-sm',
                                        'hover:bg-slate-50/80',
                                        'focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0',
                                        'focus-visible:border-slate-300 focus-visible:shadow-[0_0_0_3px_rgba(15,23,42,0.06)]',
                                        'data-[state=open]:border-slate-300 data-[state=open]:shadow-[0_0_0_3px_rgba(15,23,42,0.06)]'
                                      )}
                                    >
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent {...heroTourPackageSelectContentProps}>
                                      {hourlyPackageOptions.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                          {opt.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                              <div className="min-w-0 min-w-[11rem] flex-1">
                                <DateTimePicker
                                  ref={(instance) => {
                                    departurePickerRefs.current.desktop = instance;
                                  }}
                                  date={pickupDate}
                                  onDateChange={handlePickupDateChange}
                                  onDateApplied={advanceAfterDepartureApplied}
                                  minDate={getMinimumAllowedDate()}
                                  label="Departure"
                                  variant="desktop"
                                />
                              </div>
                              {tripType === 'outstation' && tripMode === 'round-trip' && (
                                <div className="min-w-0 min-w-[11rem] flex-1">
                                  <DateTimePicker
                                    ref={(instance) => {
                                      returnPickerRefs.current.desktop = instance;
                                    }}
                                    date={returnDate}
                                    onDateChange={handleReturnDateChange}
                                    onDateApplied={advanceAfterReturnApplied}
                                    minDate={pickupDate}
                                    label="Return"
                                    disabled={!isReturnTimeEnabled}
                                    variant="desktop"
                                  />
                                </div>
                              )}
                            </>
                          )}
                          <div className={embedDesktopCardLayout ? 'w-full' : 'flex-shrink-0'}>
                            <Button
                              ref={(el) => {
                                searchButtonRefs.current.desktop = el;
                              }}
                              onClick={handleContinue}
                              disabled={!pickupLocation || !pickupLocation.name || isCalculatingDistance || isLoading || !isFormValid}
                              className={cn(
                                'axis-search-btn flex h-[2.75rem] items-center gap-2 px-6 py-2.5 text-sm',
                                embedDesktopCardLayout && 'mt-1 h-12 w-full justify-center text-base font-semibold',
                              )}
                            >
                              {isLoading ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                  <span>Searching...</span>
                                </>
                              ) : embedDesktopCardLayout ? (
                                <>
                                  <Search className="h-4 w-4" />
                                  <span>Search Cabs</span>
                                </>
                              ) : (
                                <>
                                  <span>Search</span>
                                  <ChevronRight className="w-4 h-4" />
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                        {tripType === 'outstation' && (
                          <div className="mt-2 flex w-full flex-col gap-2">
                            {intermediateStops.length === 0 ? (
                              <OutstationAddStopLink
                                stopCount={0}
                                onAdd={handleAddOutstationStop}
                                variant="card"
                                className="px-0"
                              />
                            ) : (
                              <>
                                <div
                                  className={cn(
                                    embedDesktopCardLayout
                                      ? 'flex flex-col gap-3'
                                      : 'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3'
                                  )}
                                >
                                  <OutstationStopRows
                                    stops={intermediateStops}
                                    onChange={handleOutstationStopChange}
                                    onRemove={handleRemoveOutstationStop}
                                    layout="desktop"
                                    fieldVariant="desktop"
                                    editTrigger={editTrigger}
                                  />
                                </div>
                                <OutstationAddStopLink
                                  stopCount={intermediateStops.length}
                                  onAdd={handleAddOutstationStop}
                                  more
                                />
                              </>
                            )}
                          </div>
                        )}
                        {validationError && (
                          <div className="text-red-600 text-sm mt-3 py-2">{validationError}</div>
                        )}
                        {visibleRestrictedAirportMessage && (
                          <RestrictedAirportRouteNotice message={visibleRestrictedAirportMessage} />
                        )}
                      </div>

                      {isCalculatingDistance && (
                        <div className="flex items-center justify-center py-4 lg:py-3">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-3"></div>
                          <p className="text-gray-600 font-medium text-sm">Calculating route distance...</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 2 - Cab Selection */}
                  {currentStep === 2 && !isSlidingSearch && (
                    <>
                      {/* Step Indicator - Mobile Only */}
                      <div className="md:hidden mb-2 mt-0">
                        <StepIndicator 
                          currentStep={1}
                          steps={[
                            { number: 1, title: "Select Vehicle", isCompleted: false },
                            { number: 2, title: "Passenger Info", isCompleted: false },
                            { number: 3, title: "Payment", isCompleted: false }
                          ]}
                          onStepClick={(stepNumber) => {
                            if (stepNumber === 1) {
                              // Already on vehicle selection step
                            }
                          }}
                        />
                      </div>
                      
                      {/* Trip summary — white card (mobile web reference) */}
                      <div className="mb-2 w-full max-w-full overflow-hidden rounded-xl border border-gray-200 bg-white px-4 py-2.5 shadow-sm lg:mb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleBookingSummaryBack}
                              className="text-gray-700 hover:text-blue-600 focus:outline-none"
                              title={summaryBackHref ? 'Back' : 'Back to home'}
                            >
                              <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div className="flex flex-col min-w-0 flex-1">
                              <div className="flex flex-col md:flex-row md:items-center md:gap-1 gap-0.5">
                                <span className="font-bold text-sm sm:text-base text-gray-900 break-words">
                                  {pickupLocation?.name || 'Pickup'}
                                </span>
                                {pickupLocation && dropLocation && (
                                  <>
                                    <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 hidden md:block" />
                                    <span className="font-bold text-sm sm:text-base text-gray-900 break-words md:truncate md:max-w-[180px]">
                                      <span className="text-gray-500 font-normal md:hidden">to </span>
                                      {dropLocation?.name || 'Drop'}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          {/* Always Visible Edit Button */}
                          <button
                            onClick={() => {
                              if (isMobile) {
                                setShowMobileEditForm(true);
                              } else {
                                setIsSlidingSearch(true);
                                setShowGuestDetailsForm(false);
                                if (isSearchActive) {
                                  resetPageScroll();
                                } else {
                                  requestAnimationFrame(() => {
                                    scrollToBookingWidget({ smooth: true });
                                  });
                                }
                              }
                              if (onEditStart) onEditStart();
                              onTripEditOpenChange?.(true);
                            }}
                            className="text-blue-600 hover:text-blue-700 focus:outline-none p-2 rounded-lg hover:bg-blue-50 transition-colors flex-shrink-0"
                            title="Edit booking details"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                        </div>
                        {pickupDate && (
                          <div className="mt-1 text-xs font-medium text-gray-500">
                            <span>{pickupDate.toLocaleString(undefined, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        )}
                      </div>
                      {/* Step 2: Urbania shell — explicit 50%/50% minus horizontal gap (flex-1 can skew tracks) */}
                      <div
                        className={`${
                          embedStretchToShell
                            ? 'flex w-full animate-fade-in flex-col gap-y-3 text-xs lg:flex-row lg:flex-nowrap lg:items-start lg:gap-x-6 lg:gap-y-0 xl:gap-x-8 lg:text-[12px]'
                            : `grid animate-fade-in grid-cols-1 gap-8 text-xs lg:text-[12px] lg:[grid-template-columns:62%_38%]`
                        } ${
                          selectedCab
                            ? embedStretchToShell
                              ? 'max-lg:pb-2 lg:pb-0'
                              : 'pb-52 lg:pb-0'
                            : ''
                        }`}
                      >
                        <div
                          className={
                            embedStretchToShell
                              ? 'max-lg:order-1 min-w-0 w-full space-y-3 lg:order-none lg:w-[calc(50%-0.75rem)] lg:max-w-[calc(50%-0.75rem)] lg:flex-none xl:w-[calc(50%-1rem)] xl:max-w-[calc(50%-1rem)]'
                              : 'lg:col-span-1 space-y-3'
                          }
                        >
                          {(((tripType === 'outstation' || tripType === 'airport' || tripType === 'custom') &&
                            distance > 0 &&
                            duration > 0) ||
                          (!isMobile &&
                            (tripType === 'outstation' || tripType === 'airport' || tripType === 'custom') &&
                            pickupLocation &&
                            dropLocation)) &&
                          !restrictedAirportRouteMessage ? (
                          <div
                            className={`bg-white rounded-xl shadow-card p-2${embedStretchToShell ? ' w-full max-w-full' : ''}`}
                          >
                            {(tripType === 'outstation' || tripType === 'airport' || tripType === 'custom') && distance > 0 && duration > 0 && (
                              <div className="text-xs text-gray-500 font-medium">
                                Rates for {displayDistance} Kms approx distance | {Math.round(displayDuration / 60)} hr(s) approx time
                              </div>
                            )}
                            {!isMobile && (tripType === 'outstation' || tripType === 'airport' || tripType === 'custom') && pickupLocation && dropLocation && (
                              <div className={`mt-3 app-card${embedStretchToShell ? ' w-full max-w-full' : ''}`}>
                                <Suspense
                                  fallback={
                                    <div
                                      className="flex h-[400px] items-center justify-center rounded-md bg-gray-100 text-sm text-gray-500"
                                      aria-hidden
                                    >
                                      Loading map…
                                    </div>
                                  }
                                >
                                  <GoogleMapComponent
                                    key={`${tripType}-${pickupLocation?.name || ''}-${filledStops.map((s) => s.id || s.name).join('|')}-${dropLocation?.name || ''}`}
                                    pickupLocation={pickupLocation}
                                    dropLocation={dropLocation}
                                    waypoints={filledStops}
                                    tripType={tripType}
                                    onDistanceCalculated={handleDistanceCalculated}
                                  />
                                </Suspense>
                              </div>
                            )}
                          </div>
                          ) : null}
                          <div className={`text-xs lg:text-[12px]${embedStretchToShell ? ' w-full max-w-full' : ''}`}>
                          {restrictedAirportRouteMessage ? (
                            <div className="relative z-[10041] rounded-xl border border-red-200 bg-red-50 p-4 text-left shadow-sm">
                              <p className="text-base font-semibold text-red-800">Route unavailable</p>
                              <p className="mt-2 text-sm leading-relaxed text-red-700">
                                {restrictedAirportRouteMessage}
                              </p>
                              <a
                                href={`tel:${RESTRICTED_AIRPORT_ROUTE_PHONE_TEL}`}
                                className="mt-4 inline-flex h-11 items-center justify-center rounded-xl bg-red-700 px-4 text-sm font-bold text-white"
                              >
                                Call {RESTRICTED_AIRPORT_ROUTE_PHONE_DISPLAY}
                              </a>
                            </div>
                          ) : !vehiclesLoaded ? (
                              <div className="flex items-center justify-center p-4">
                                <div className="text-gray-500">Loading vehicles...</div>
                              </div>
                            ) : (
                              <CabOptions 
                                cabTypes={heroBookingCabList} 
                                selectedCab={selectedCab} 
                                onSelectCab={setSelectedCab} 
                                distance={distance} 
                                tripType={tripType === 'custom' ? 'outstation' : tripType} 
                                tripMode={tripMode}
                                hourlyPackage={hourlyPackage}
                                pickupDate={pickupDate}
                                returnDate={returnDate}
                                isCalculatingFares={isCalculatingDistance}
                              />
                            )}
                          </div>
                        </div>
                        {!restrictedAirportRouteMessage && (
                        <div
                          className={
                            embedStretchToShell
                              ? 'max-lg:order-2 min-w-0 w-full text-xs lg:order-none lg:w-[calc(50%-0.75rem)] lg:max-w-[calc(50%-0.75rem)] lg:flex-none lg:text-[14px] xl:w-[calc(50%-1rem)] xl:max-w-[calc(50%-1rem)]'
                              : 'lg:col-span-1 text-xs lg:text-[14px] lg:pr-6 max-w-md mobile-nav-fix'
                          }
                        >
                          <div
                            ref={bookingSummaryRef}
                            id="booking-summary"
                            className={`text-xs lg:text-[12px] ${embedStretchToShell ? 'w-full max-w-none' : ''}`}
                          >
                            <BookingSummary 
                              pickupLocation={pickupLocation!} 
                              dropLocation={dropLocation} 
                              intermediateStops={filledStops} 
                              pickupDate={pickupDate} 
                              returnDate={returnDate} 
                              selectedCab={selectedCab} 
                              distance={distance} 
                              tripType={tripType} 
                              tripMode={tripMode} 
                              totalPrice={totalPrice}
                              hourlyPackage={hourlyPackage}
                              onFinalTotalChange={handleBaseFareChange}
                              onEditPickupLocation={handleEditPickupLocation}
                              onEditPickupDate={handleEditPickupDate}
                              hideInclusionsExclusions={true}
                              discountAmount={offerDiscountAmount}
                              discountCode={offerDiscountCode}
                              couponSlot={
                                <BookingCouponSection
                                  category={offerCategoryKey || tripType}
                                  websiteFare={websiteFareBase}
                                  travelDate={pickupDate}
                                  vehicleId={offerVehicleId}
                                  tourId={offerTourId}
                                  tripRoute={offerTripRoute}
                                  suggestedCampaign={offerCampaign}
                                  applied={offerApplied}
                                  appliedCampaign={offerCampaign}
                                  onApply={applyOfferCampaign}
                                  onRemove={removeOfferCampaign}
                                />
                              }
                            />
                          </div>
                          {selectedCab && payReadyTotal > 0 && (
                            <div className="mt-3 hidden lg:block">
                              <BookingPaymentFooter
                                finalTotal={payReadyTotal}
                                mode={bookingPaymentMode}
                                onModeChange={persistBookingPaymentMode}
                                onBookNow={handleBookNow}
                                isLoading={isLoading}
                                disabled={!isFormValid || !selectedCab}
                              />
                            </div>
                          )}
                        </div>
                        )}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="animate-fade-in w-full px-1 sm:px-2">
                  {/* Step Indicator - Mobile Only */}
                  <div className="md:hidden mb-4 mt-0">
                    <StepIndicator 
                      currentStep={2}
                      steps={[
                        { number: 1, title: "Select Vehicle", isCompleted: true },
                        { number: 2, title: "Passenger Info", isCompleted: false },
                        { number: 3, title: "Payment", isCompleted: false }
                      ]}
                      onStepClick={(stepNumber) => {
                        if (stepNumber === 1) {
                          // Go back to vehicle selection (step 2)
                          setShowGuestDetailsForm(false);
                          setCurrentStep(2);
                        }
                      }}
                    />
                  </div>
                  
                  {/* RedBus-style Trip Summary Card - Mobile Only */}
                  <div className="md:hidden mb-4">
                    <div className="bg-white rounded-lg shadow-sm border p-4">
                      <div className="text-center mb-3">
                        <span className="text-sm font-semibold text-gray-800">
                          {tripType === 'outstation' ? (tripMode === 'one-way' ? 'One Way' : 'Round Trip') : 
                           tripType === 'local' ? 'Local' : 
                           tripType === 'airport' ? 'Airport Transfer' :
                           tripType === 'tour' ? 'Tour' : 'Trip'}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        {/* Pickup Info */}
                        <div className="flex-1 text-left">
                          <div className="font-semibold text-gray-900 text-sm">
                            {pickupDate?.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} · {pickupDate?.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}
                          </div>
                          <div className="text-xs text-gray-600 mt-1">{pickupLocation?.name || 'Pickup Location'}</div>
                          <div className="mt-2">
                            <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs">
                              <Car className="w-3 h-3 mr-1" />
                              {selectedCab?.name || 'Vehicle'}
                            </span>
                          </div>
                        </div>
                        
                        {/* Arrow */}
                        <div className="mx-4">
                          <ArrowRight className="w-4 h-4 text-gray-400" />
                        </div>
                        
                        {/* Drop Info */}
                        <div className="flex-1 text-right">
                          <div className="font-semibold text-gray-900 text-sm">
                            {(() => {
                              // For round trips, show the return date; for one-way trips, calculate estimated drop time
                              if (tripType === 'outstation' && tripMode === 'round-trip' && returnDate) {
                                return returnDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ' · ' + 
                                       returnDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
                              } else {
                                // Calculate estimated drop time based on distance and average speed
                                const estimatedTravelTime = distance ? Math.ceil(distance / 50) : 2; // Assuming 50 km/h average speed
                                const estimatedDropTime = new Date(pickupDate || new Date());
                                estimatedDropTime.setHours(estimatedDropTime.getHours() + estimatedTravelTime);
                                
                                return estimatedDropTime.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ' · ' + 
                                       estimatedDropTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
                              }
                            })()}
                          </div>
                          <div className="text-xs text-gray-600 mt-1">{dropLocation?.name || 'Destination'}</div>
                          <div className="mt-2">
                            <button 
                              onClick={() => {
                                setShowBookingSummaryModal(true);
                                setTimeout(() => setAnimateBookingSummaryModal(true), 10);
                              }}
                              className="text-blue-600 hover:text-blue-800 text-xs underline"
                            >
                              View details
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Guest Details Form - Centered on mobile, normal on md+ */}
                  <div className="w-full flex justify-center md:block">
                      <div className="bg-white rounded-xl md:shadow-card md:border md:p-6 mb-4 w-full max-w-full md:max-w-full p-0 shadow-none border-none">
                        {/* Mobile: No large heading, step indicator is sufficient */}
                        <div className="md:flex md:items-center md:justify-between md:mb-4 hidden">
                        <h3 className="text-xl font-semibold">Complete Your Booking</h3>
                      </div>
                      
                      <BookingCouponSection
                        className="mb-4"
                        category={offerCategoryKey || tripType}
                        websiteFare={websiteFareBase}
                        travelDate={pickupDate}
                        vehicleId={offerVehicleId}
                        tourId={offerTourId}
                        tripRoute={offerTripRoute}
                        suggestedCampaign={offerCampaign}
                        applied={offerApplied}
                        appliedCampaign={offerCampaign}
                        onApply={applyOfferCampaign}
                        onRemove={removeOfferCampaign}
                      />
                      <GuestDetailsForm 
                        onSubmit={handleGuestDetailsSubmit}
                        totalPrice={payReadyTotal}
                        onBack={handleBackToSelection}
                        isLoading={isLoading}
                        paymentEnabled={true}
                      />
                    </div>
                  </div>
                  
                  {/* Mobile Booking Summary - Hidden by default, shown in modal */}
                  <div className="w-full hidden md:block">
                    <BookingSummary
                      pickupLocation={pickupLocation!}
                      dropLocation={dropLocation}
                      intermediateStops={filledStops}
                      pickupDate={pickupDate}
                      returnDate={returnDate}
                      selectedCab={selectedCab}
                      distance={distance}
                      totalPrice={totalPrice}
                      tripType={tripType}
                      tripMode={tripMode}
                      hourlyPackage={hourlyPackage}
                      onFinalTotalChange={handleBaseFareChange}
                      onEditPickupLocation={handleEditPickupLocation}
                      onEditPickupDate={handleEditPickupDate}
                      hideInclusionsExclusions={false}
                      discountAmount={offerDiscountAmount}
                      discountCode={offerDiscountCode}
                      couponSlot={
                        <BookingCouponSection
                          category={offerCategoryKey || tripType}
                          websiteFare={websiteFareBase}
                          travelDate={pickupDate}
                          vehicleId={offerVehicleId}
                          tourId={offerTourId}
                          tripRoute={offerTripRoute}
                          suggestedCampaign={offerCampaign}
                          applied={offerApplied}
                          appliedCampaign={offerCampaign}
                          onApply={applyOfferCampaign}
                          onRemove={removeOfferCampaign}
                        />
                      }
                    />
                    </div>
                  </div>
                </div>
              )}
            </div>
            {showHomeHeroBanner && !showGuestDetailsForm && (
              <div className="hidden lg:block">
                <HeroValueProps />
              </div>
            )}
            </div>
          </div>
        </div>
      </section>
      
      {/* Slide-up Booking Summary Modal - Mobile Only */}
      {showBookingSummaryModal && (
        <div className="fixed inset-0 z-[10050] md:hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => {
              setAnimateBookingSummaryModal(false);
              setTimeout(() => setShowBookingSummaryModal(false), 300);
            }}
          />
          
          {/* Modal Content */}
          <div className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl max-h-[75vh] flex flex-col transform transition-transform duration-300 ease-out ${animateBookingSummaryModal ? 'translate-y-0' : 'translate-y-full'}`}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
              <h3 className="text-lg font-semibold">Booking Details</h3>
              <button 
                onClick={() => {
                  setAnimateBookingSummaryModal(false);
                  setTimeout(() => setShowBookingSummaryModal(false), 300); // Match transition duration
                }}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Content */}
            <div className="overflow-y-auto flex-1 min-h-0 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              <div className="pb-20">
                <BookingSummary
                  pickupLocation={pickupLocation!}
                  dropLocation={dropLocation}
                  intermediateStops={filledStops}
                  pickupDate={pickupDate}
                  returnDate={returnDate}
                  selectedCab={selectedCab}
                  distance={distance}
                  totalPrice={totalPrice}
                  tripType={tripType}
                  tripMode={tripMode}
                  hourlyPackage={hourlyPackage}
                  onFinalTotalChange={handleBaseFareChange}
                  onEditPickupLocation={handleEditPickupLocation}
                  onEditPickupDate={handleEditPickupDate}
                  hideInclusionsExclusions={false}
                  discountAmount={offerDiscountAmount}
                  discountCode={offerDiscountCode}
                  couponSlot={
                    <BookingCouponSection
                      category={offerCategoryKey || tripType}
                      websiteFare={websiteFareBase}
                      travelDate={pickupDate}
                      vehicleId={offerVehicleId}
                      tourId={offerTourId}
                      tripRoute={offerTripRoute}
                      suggestedCampaign={offerCampaign}
                      applied={offerApplied}
                      appliedCampaign={offerCampaign}
                      onApply={applyOfferCampaign}
                      onRemove={removeOfferCampaign}
                    />
                  }
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile: Part / Full pay + Book Now — fixed above bottom nav (z above mobile tab bar) */}
      {showMobileBookingPaybar && (
          <div className="fixed inset-x-0 bottom-0 z-[60] max-md:bottom-16 lg:hidden">
            <div
              ref={bookingPaybarRef}
              className="border-t border-gray-200 bg-white px-3 pt-2 pb-2 shadow-[0_-8px_30px_rgba(15,23,42,0.12)] mobile-safe-bottom"
            >
              <BookingOfferStickyBanner
                campaign={offerCampaign}
                websiteFare={websiteFareBase}
                applied={offerApplied}
                onApply={applyOfferCampaign}
              />
              <BookingPaymentFooter
                finalTotal={payReadyTotal}
                mode={bookingPaymentMode}
                onModeChange={persistBookingPaymentMode}
                onBookNow={handleBookNow}
                isLoading={isLoading}
                disabled={!isFormValid || !selectedCab}
              />
            </div>
          </div>
        )}
      
      <OfferCampaignPopup
        category={offerCategoryKey || tripType}
        websiteFare={websiteFareBase || totalPrice || 0}
        open={offerPopupOpen}
        campaign={offerCampaign}
        onOpenChange={setOfferPopupOpen}
        onApply={applyOfferCampaign}
        onContinueRegular={removeOfferCampaign}
      />

      <Dialog
        open={showGuestPhoneModal}
        onOpenChange={(open) => {
          if (!open) {
            setShowGuestPhoneModal(false);
            setGuestPhoneDigits('');
            setGuestPhoneCountry(defaultWhatsappCountry());
          }
        }}
      >
        <DialogContent
          className="guest-wa-dialog w-[calc(100%-2rem)] max-w-[400px] gap-0 overflow-visible rounded-3xl border-0 bg-white p-0 shadow-[0_24px_64px_-16px_rgba(15,23,42,0.28)] sm:w-full"
          showClose
        >
          <div className="relative overflow-hidden rounded-t-3xl bg-[linear-gradient(165deg,#e8f3ff_0%,#f0f7ff_42%,#ffffff_100%)] px-5 pb-4 pt-6 sm:px-6 sm:pt-7">
            <div
              className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-[#25D366]/15 blur-2xl"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -left-8 top-8 h-28 w-28 rounded-full bg-blue-500/10 blur-2xl"
              aria-hidden
            />

            <div className="relative flex flex-col items-center text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#25D366] shadow-[0_10px_24px_-8px_rgba(37,211,102,0.65)]">
                <FaWhatsapp className="h-7 w-7 text-white" aria-hidden />
              </div>
              <DialogHeader className="space-y-1.5 text-center sm:text-center">
                <DialogTitle className="text-[1.35rem] font-bold tracking-tight text-slate-900">
                  Continue with WhatsApp
                </DialogTitle>
                <DialogDescription className="mx-auto max-w-[20rem] text-[13px] leading-relaxed text-slate-600">
                  Enter your number to unlock cab fares. We&apos;ll send trip updates on WhatsApp.
                </DialogDescription>
              </DialogHeader>

              {pickupLocation?.name && dropLocation?.name ? (
                <div className="mt-3.5 inline-flex max-w-full items-center gap-1.5 rounded-full border border-blue-100 bg-white/90 px-3 py-1.5 text-[12px] font-medium text-slate-700 shadow-sm">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-blue-600" aria-hidden />
                  <span className="truncate">{pickupLocation.name}</span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                  <span className="truncate">{dropLocation.name}</span>
                </div>
              ) : null}
            </div>
          </div>

          <div className="relative z-10 space-y-4 overflow-visible rounded-b-3xl bg-white px-5 pb-5 pt-1 sm:px-6 sm:pb-6">
            <WhatsAppCountryPhoneRow
              idPrefix="hero-guest-wa"
              selectedCountry={guestPhoneCountry}
              onCountryChange={(c) => {
                setGuestPhoneCountry(c);
                setGuestPhoneDigits('');
              }}
              phoneDigits={guestPhoneDigits}
              onPhoneDigitsChange={setGuestPhoneDigits}
            />

            <ul className="flex flex-col gap-1.5 text-[11px] text-slate-500 sm:text-xs">
              <li className="flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-blue-600" aria-hidden />
                Used only for booking updates — no spam
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-blue-600" aria-hidden />
                Instant WhatsApp confirmation after you book
              </li>
            </ul>

            <DialogFooter className="mt-0 flex flex-col gap-0 sm:justify-stretch">
              <Button
                type="button"
                disabled={!canSubmitGuestPhone}
                className={cn(
                  'h-12 w-full rounded-full text-[15px] font-bold tracking-wide shadow-sm transition-all',
                  canSubmitGuestPhone
                    ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md'
                    : 'cursor-not-allowed bg-slate-200 text-slate-500 opacity-100 hover:bg-slate-200',
                )}
                onClick={handleGuestPhoneModalSubmit}
              >
                <Search className="mr-2 h-4 w-4" aria-hidden />
                Search Cabs
              </Button>
              <p className="mt-3 text-center text-[11px] leading-snug text-slate-500">
                By continuing, you agree to our{' '}
                <Link
                  to="/terms-conditions"
                  className="font-medium text-blue-600 underline-offset-2 hover:underline"
                  onClick={() => setShowGuestPhoneModal(false)}
                >
                  Terms
                </Link>{' '}
                &amp;{' '}
                <Link
                  to="/privacy-policy"
                  className="font-medium text-blue-600 underline-offset-2 hover:underline"
                  onClick={() => setShowGuestPhoneModal(false)}
                >
                  Privacy Policy
                </Link>
                .
              </p>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mobile Navigation Bar */}
      <MobileNavigation />
    </div>
  );
}