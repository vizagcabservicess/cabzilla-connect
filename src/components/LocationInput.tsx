import React, { useState, useEffect, useLayoutEffect, useRef, useId, forwardRef, useImperativeHandle } from 'react';
import { createPortal } from 'react-dom';
import { Input } from "@/components/ui/input";
import { useGoogleMaps } from "@/providers/GoogleMapsProvider";
import { ArrowLeft, X, MapPin } from "lucide-react";
import { toast } from "sonner";
import { locationMatchesSearchQuery, resolveCanonicalVizagAirport, type Location } from '@/lib/locationData';
import { TOUR_PICKUP_RADIUS_KM, isWithinTourPickupRadius } from '@/lib/locationUtils';
import type { TripType } from '@/lib/tripTypes';
import { BHOGAPURAM_AIRPORT, BHOGAPURAM_AIRPORT_CATCHMENT_KM, isAirportTransferOtherEnd, isVizagAirportLocation } from '@/lib/inferTripService';
import { isRestrictedAirportDrop } from '@/lib/restrictedAirportRoutes';
import { cn } from '@/lib/utils';

export type LocationInputHandle = {
  focus: () => void;
};

// Vizag coordinates
const VIZAG_LAT = 17.6868;
const VIZAG_LNG = 83.2185;
const MAX_DISTANCE_KM = 35;

const PREDICTION_DEBOUNCE_MS = 320;

const SELECT_FROM_LIST_MESSAGE_DEFAULT = 'Please select a location from the suggestions list';
const LOCAL_LAST_DROP_MESSAGE =
  'Last drop must be within 35 km of Visakhapatnam. Outstation places cannot be used on the Local tab.';

const EMPTY_LOCATION: Location = {
  id: '',
  name: '',
  address: '',
  lat: 0,
  lng: 0,
  city: '',
  state: '',
  type: 'other',
  popularityScore: 50,
};

// Helper to calculate distance between two lat/lng points (Haversine formula)
function getDistanceFromLatLng(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Helper to check if a location is within distance from Vizag
function isWithinVizagRange(lat: number, lng: number, maxDistance: number = MAX_DISTANCE_KM): boolean {
  return getDistanceFromLatLng(VIZAG_LAT, VIZAG_LNG, lat, lng) <= maxDistance;
}

function isVizagAirportPlace(args: {
  name?: string;
  address?: string;
  id?: string;
  lat?: number;
  lng?: number;
}): boolean {
  return isVizagAirportLocation({
    id: args.id || '',
    name: args.name || '',
    address: args.address || '',
    city: '',
    state: '',
    lat: args.lat ?? 0,
    lng: args.lng ?? 0,
    type: `${args.name || ''}`.toLowerCase().includes('airport')
      ? 'airport'
      : 'other',
    popularityScore: 0,
  });
}

function canonicalizePickedLocation(location: Location, typedQuery: string): Location {
  return resolveCanonicalVizagAirport(location, typedQuery);
}

/** Google attaches one `.pac-container` per Autocomplete — hide stale panels so only the focused field shows a list. */
function restorePacContainerVisibility(el: HTMLElement): void {
  el.style.removeProperty('visibility');
  el.style.removeProperty('pointer-events');
}

function hideAllPacContainers(): void {
  if (typeof document === 'undefined') return;
  document.querySelectorAll<HTMLElement>('.pac-container').forEach((el) => {
    restorePacContainerVisibility(el);
    el.style.display = 'none';
  });
}

interface LocationInputProps {
  id?: string;
  label?: string;
  value?: Location | string;
  onChange?: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  suggestions?: Location[];
  disabled?: boolean;
  className?: string;
  location?: Location;
  onLocationChange?: (location: Location) => void;
  isPickupLocation?: boolean;
  /** When true, drop (or any field) uses the same 35 km Vizag radius as pickup. */
  restrictToVizagRadius?: boolean;
  tripType?: TripType;
  readOnly?: boolean;
  /** mobile = floating label; desktop = label + bordered row; app = native-app style (uppercase label, gray row, pin icon); infield = small grey label inside row (Urbania-style) */
  variant?: 'mobile' | 'desktop' | 'app' | 'infield';
  /** When pair uses an external dashed rail between From/To (Urbania stacked ticket); omit inset pin icon. */
  hideLeadingIcon?: boolean;
  /** When airport drop is outside Vizag radius, parent should switch trip type to outstation. */
  onRequestOutstationSwitch?: () => void;
  /** Hide curated Vizianagaram / Srikakulam / Odisha drops when pickup is the airport. */
  hideRestrictedAirportDrops?: boolean;
  /** Airport tab endpoint: Vizag city airport or Alluri Sitarama Raju (Bhogapuram). */
  airportOnly?: boolean;
  /** Hide the built-in clear X when the parent renders its own remove control. */
  hideClearButton?: boolean;
}

export const LocationInput = forwardRef<LocationInputHandle, LocationInputProps>(function LocationInput({
  id,
  label,
  value,
  onChange,
  required = false,
  placeholder = "Enter location",
  suggestions = [],
  disabled = false,
  className = "",
  location,
  onLocationChange,
  isPickupLocation = false,
  restrictToVizagRadius = false,
  tripType,
  readOnly = false,
  variant = 'mobile',
  hideLeadingIcon = false,
  onRequestOutstationSwitch,
  hideRestrictedAirportDrops = false,
  airportOnly = false,
  hideClearButton = false,
}, ref) {
  const enforceVizag35Km =
    isPickupLocation || restrictToVizagRadius || tripType === 'local';
  const isLocalLastDrop = tripType === 'local' && !isPickupLocation;
  const isTourPickup = tripType === 'tour' && isPickupLocation;
  const vizagBiasRadiusKm = isTourPickup
    ? TOUR_PICKUP_RADIUS_KM
    : tripType === 'airport' && !isPickupLocation
      ? BHOGAPURAM_AIRPORT_CATCHMENT_KM
      : MAX_DISTANCE_KM;
  const selectFromListMessage = airportOnly
    ? 'Select Alluri Sitarama Raju International Airport or Vizag City Airport (NAD)'
    : isTourPickup
    ? 'Select a pickup within 20 km of Vizag Taxi Hub.'
    : isLocalLastDrop
    ? LOCAL_LAST_DROP_MESSAGE
    : enforceVizag35Km
    ? 'Select a valid location from suggestions (within 35 KM radius).'
    : SELECT_FROM_LIST_MESSAGE_DEFAULT;

  /** Parent handlers (e.g. Hero) are often inline — must not be Autocomplete effect deps or Places re-inits every render → duplicate .pac-container */
  const onLocationChangeRef = useRef(onLocationChange);
  const onChangeRef = useRef(onChange);
  const onRequestOutstationSwitchRef = useRef(onRequestOutstationSwitch);
  useEffect(() => {
    onLocationChangeRef.current = onLocationChange;
    onChangeRef.current = onChange;
    onRequestOutstationSwitchRef.current = onRequestOutstationSwitch;
  }, [onLocationChange, onChange, onRequestOutstationSwitch]);

  const isDesktopVariant = variant === 'desktop';
  const isAppVariant = variant === 'app';
  const isInfieldVariant = variant === 'infield';
  const [mobileSearchSheetOpen, setMobileSearchSheetOpen] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<Location[]>([]);
  const [inputValue, setInputValue] = useState<string>("");
  const valueRef = useRef<Location | string | undefined>(value);
  const locationRef = useRef(location);
  const initializedRef = useRef(false);
  const { isLoaded, google, error } = useGoogleMaps();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const fieldTriggerRef = useRef<HTMLButtonElement | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const lastTypedQueryRef = useRef('');
  const [isFocused, setIsFocused] = useState(false);
  const [isDesktop, setIsDesktop] = useState(typeof window !== 'undefined' ? window.innerWidth >= 1024 : false);
  /** Mobile ticket-style row: open a dedicated fullscreen search (Urbania `infield` on narrow viewports). */
  const fullscreenMobileSearchSheet =
    isInfieldVariant && !isDesktop && !disabled && !readOnly;

  useImperativeHandle(ref, () => ({
    focus: () => {
      if (disabled || readOnly) return;
      if (fullscreenMobileSearchSheet) {
        setMobileSearchSheetOpen(true);
        fieldTriggerRef.current?.focus();
        return;
      }
      inputRef.current?.focus();
      inputRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    },
  }), [disabled, readOnly, fullscreenMobileSearchSheet]);
  const [predictionsLoading, setPredictionsLoading] = useState(false);
  const [noGooglePredictions, setNoGooglePredictions] = useState(false);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const predictionsRequestSeq = useRef(0);
  /** Full input row (pin + field); Google `.pac-container` is on `body` — we sync its box to this. */
  const pacAnchorRef = useRef<HTMLDivElement | null>(null);
  /** Bottom edge of fullscreen search pill — `.pac-container` opens below here (mobile Urbania sheet). */
  const sheetPacBottomRef = useRef<HTMLDivElement | null>(null);
  const pacHintDomId = useId().replace(/:/g, '');

  useEffect(() => {
    function handleResize() {
      setIsDesktop(window.innerWidth >= 1024);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Initialize input value from either value or location only on first render
  // or when value/location changes from external sources
  useEffect(() => {
    // Always update when value/location changes, regardless of initialization state
    // Update refs
    valueRef.current = value;
    const effectiveLocation =
      location ??
      (typeof value === 'object' && value !== null ? (value as Location) : undefined);
    locationRef.current = effectiveLocation;
    
    // Set input value based on value or location (without triggering onChange)
    let newInputValue = "";
    if (typeof value === 'string') {
      newInputValue = value;
    } else if (value && typeof value === 'object') {
      newInputValue = value.name || value.address || "";
    } else if (location) {
      newInputValue = location.name || location.address || "";
    } else {
      // Clear input when value is undefined/null
      newInputValue = "";
    }

    const inputEl = inputRef.current;
    if (typeof document !== 'undefined' && inputEl && document.activeElement === inputEl) {
      initializedRef.current = true;
      return;
    }

    setInputValue(newInputValue);
    
    // Mark as initialized
    initializedRef.current = true;
  }, [value, location]); // Removed label dependency to reduce re-renders
  
     // Filter suggestions based on input value
     useEffect(() => {
     if (airportOnly && suggestions.length > 0) {
       const airports = suggestions.filter((suggestion) => isVizagAirportLocation(suggestion));
       const q = inputValue.trim();
       const matched = q
         ? airports.filter((suggestion) => locationMatchesSearchQuery(suggestion, q))
         : airports;
       setFilteredSuggestions(matched.length > 0 ? matched : airports);
       return;
     }

     if (inputValue && inputValue.length >= 2 && suggestions.length > 0) {
       const isAirportTransfer = tripType === 'airport';
       const isTourTrip = tripType === 'tour';
       
       // First filter by input match (faster than distance calculation)
       let filtered = suggestions.filter((suggestion) =>
         locationMatchesSearchQuery(suggestion, inputValue)
       );

       if (airportOnly) {
         filtered = filtered.filter((suggestion) => isVizagAirportLocation(suggestion));
         if (filtered.length === 0) {
           filtered = suggestions.filter((suggestion) => isVizagAirportLocation(suggestion));
         }
       }

       if (hideRestrictedAirportDrops) {
         filtered = filtered.filter((suggestion) => !isRestrictedAirportDrop(suggestion));
       }
       
       // Then apply distance filtering only if needed
       if (isTourPickup) {
         filtered = filtered.filter((suggestion) => isWithinTourPickupRadius(suggestion));
       } else if (enforceVizag35Km || isAirportTransfer || isTourTrip) {
         filtered = filtered.filter(suggestion => {
           if (isLocalLastDrop) {
             return isWithinVizagRange(suggestion.lat, suggestion.lng);
           }
           if (isVizagAirportLocation(suggestion)) return true;
           if (
             isAirportTransfer &&
             !isPickupLocation &&
             isAirportTransferOtherEnd(suggestion)
           ) {
             return true;
           }
           return isWithinVizagRange(suggestion.lat, suggestion.lng);
         });
       }
       
       setFilteredSuggestions(filtered);
     } else {
       setFilteredSuggestions([]);
     }
   }, [inputValue, suggestions, enforceVizag35Km, tripType, hideRestrictedAirportDrops, isPickupLocation, airportOnly, isTourPickup, isLocalLastDrop]);

  useEffect(() => {
    if (!isLoaded || !google) return;
    autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
    return () => {
      autocompleteServiceRef.current = null;
    };
  }, [isLoaded, google]);

  useEffect(() => {
    if (!isLoaded || !google || !autocompleteServiceRef.current) return;

    const q = inputValue.trim();
    if (airportOnly || readOnly || q.length < 2 || !isFocused) {
      setPredictionsLoading(false);
      setNoGooglePredictions(false);
      return;
    }

    setPredictionsLoading(true);
    setNoGooglePredictions(false);
    const seq = ++predictionsRequestSeq.current;

    const timer = window.setTimeout(() => {
      const isOutstationDrop =
        (tripType === 'outstation' || tripType === 'custom') && !isPickupLocation;
      const request: google.maps.places.AutocompletionRequest & { strictBounds?: boolean } = {
        input: q,
        componentRestrictions: { country: 'in' },
        types: ['geocode', 'establishment'],
      };

      if (!isOutstationDrop) {
        const biasCenter =
          tripType === 'airport' && !isPickupLocation
            ? new google.maps.LatLng(BHOGAPURAM_AIRPORT.lat, BHOGAPURAM_AIRPORT.lng)
            : new google.maps.LatLng(VIZAG_LAT, VIZAG_LNG);
        const circle = new google.maps.Circle({
          center: biasCenter,
          radius: vizagBiasRadiusKm * 1000,
        });
        request.bounds = circle.getBounds() as google.maps.LatLngBounds;
        if (enforceVizag35Km) {
          request.strictBounds = true;
        }
      }

      autocompleteServiceRef.current!.getPlacePredictions(request, (predictions, status) => {
        if (seq !== predictionsRequestSeq.current) return;
        setPredictionsLoading(false);
        const s = status as unknown as string;
        const ok = s === google.maps.places.PlacesServiceStatus.OK;
        const zero = s === google.maps.places.PlacesServiceStatus.ZERO_RESULTS;
        if (!ok && !zero) {
          setNoGooglePredictions(false);
          return;
        }
        const has = !!(predictions && predictions.length > 0);
        setNoGooglePredictions(!has);
      });
    }, PREDICTION_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [inputValue, isFocused, isLoaded, google, enforceVizag35Km, tripType, isPickupLocation, airportOnly, readOnly, vizagBiasRadiusKm]);

  // Keep Google Places `.pac-container` aligned to this field so it does not spill into sibling columns (desktop row) or fullscreen sheet.
  useEffect(() => {
    if (typeof document === 'undefined' || !isFocused) return;

    let cancelled = false;
    const alignPac = () => {
      if (cancelled) return;
      const sheetMode = fullscreenMobileSearchSheet && mobileSearchSheetOpen;
      const anchor = sheetMode ? sheetPacBottomRef.current : pacAnchorRef.current;
      if (!anchor) return;
      document.querySelectorAll<HTMLElement>('.pac-container').forEach(restorePacContainerVisibility);
      const candidates = Array.from(document.querySelectorAll<HTMLElement>('.pac-container')).filter((el) => {
        const st = window.getComputedStyle(el);
        return st.display !== 'none' && st.visibility !== 'hidden' && el.getBoundingClientRect().height > 0;
      });
      const pac = candidates.length > 0 ? candidates[candidates.length - 1] : null;
      if (!pac) return;

      candidates.forEach((el) => {
        if (el !== pac) el.style.display = 'none';
      });
      pac.style.removeProperty('display');

      const s = pac.style;

      if (sheetMode) {
        const rect = anchor.getBoundingClientRect();
        const vv = window.visualViewport;
        const viewportWidth = vv?.width ?? window.innerWidth;
        const viewportOffsetLeft = vv?.offsetLeft ?? 0;
        const margin = 12;
        const w = Math.max(200, Math.round(viewportWidth - margin * 2));
        const left = Math.round(viewportOffsetLeft + margin);
        const top = Math.round(rect.bottom + 6);

        s.setProperty('position', 'fixed', 'important');
        s.setProperty('box-sizing', 'border-box', 'important');
        s.setProperty('width', `${w}px`, 'important');
        s.setProperty('min-width', `${w}px`, 'important');
        s.setProperty('max-width', `${w}px`, 'important');
        s.setProperty('left', `${left}px`, 'important');
        s.setProperty('top', `${top}px`, 'important');
        s.setProperty('right', 'auto', 'important');
        s.setProperty('transform', 'none', 'important');
      } else {
        const rect = anchor.getBoundingClientRect();
        const vv = window.visualViewport;
        const viewportWidth = vv?.width ?? window.innerWidth;
        const viewportOffsetLeft = vv?.offsetLeft ?? 0;
        const margin = 8;
        const w = Math.max(200, Math.round(Math.min(rect.width, viewportWidth - margin * 2)));
        const rawLeft = Math.round(rect.left);
        const left = Math.max(
          viewportOffsetLeft + margin,
          Math.min(rawLeft, viewportOffsetLeft + viewportWidth - w - margin),
        );
        const top = Math.round(rect.bottom + 2);

        s.setProperty('position', 'fixed', 'important');
        s.setProperty('box-sizing', 'border-box', 'important');
        s.setProperty('width', `${w}px`, 'important');
        s.setProperty('min-width', `${w}px`, 'important');
        s.setProperty('max-width', `${w}px`, 'important');
        s.setProperty('left', `${left}px`, 'important');
        s.setProperty('top', `${top}px`, 'important');
        s.setProperty('right', 'auto', 'important');
        s.setProperty('transform', 'none', 'important');
      }
    };

    alignPac();
    window.addEventListener('resize', alignPac);
    window.addEventListener('scroll', alignPac, true);
    window.visualViewport?.addEventListener('resize', alignPac);
    window.visualViewport?.addEventListener('scroll', alignPac);

    const mo = new MutationObserver(alignPac);
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });

    const interval = window.setInterval(alignPac, 150);

    return () => {
      cancelled = true;
      window.removeEventListener('resize', alignPac);
      window.removeEventListener('scroll', alignPac, true);
      window.visualViewport?.removeEventListener('resize', alignPac);
      window.visualViewport?.removeEventListener('scroll', alignPac);
      mo.disconnect();
      window.clearInterval(interval);
    };
  }, [isFocused, fullscreenMobileSearchSheet, mobileSearchSheetOpen]);

  // RedBus-style hint inside Google's open suggestion panel (DOM — `.pac-container` is not React-rendered).
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const removeHint = () => {
      document.getElementById(pacHintDomId)?.remove();
    };

    const committed =
      location ??
      (typeof value === 'object' && value !== null ? (value as Location) : undefined);
    const selectionInvalid = inputValue.trim().length > 0 && !committed?.id;

    const emptyPanelOpen =
      isFocused &&
      noGooglePredictions &&
      !predictionsLoading &&
      inputValue.trim().length >= 2;

    if (!isFocused || !selectionInvalid || emptyPanelOpen) {
      removeHint();
      return;
    }

    let cancelled = false;

    const syncHint = () => {
      if (cancelled) return;
      const candidates = Array.from(document.querySelectorAll<HTMLElement>('.pac-container')).filter((el) => {
        const st = window.getComputedStyle(el);
        return st.display !== 'none' && st.visibility !== 'hidden' && el.getBoundingClientRect().height > 0;
      });
      const pac = candidates.length > 0 ? candidates[candidates.length - 1] : null;
      if (!pac || !pac.querySelector('.pac-item')) {
        removeHint();
        return;
      }

      let hint = document.getElementById(pacHintDomId) as HTMLDivElement | null;
      if (!hint || !pac.contains(hint)) {
        if (hint) hint.remove();
        hint = document.createElement('div');
        hint.id = pacHintDomId;
        hint.setAttribute('role', 'status');
        hint.setAttribute('aria-live', 'polite');
        hint.style.cssText = [
          'box-sizing:border-box',
          'padding:10px 12px',
          'border-bottom:1px solid rgb(254 226 226)',
          'background:rgb(254 242 242)',
          'color:rgb(220 38 38)',
          'font-size:12px',
          'line-height:1.4',
          'text-align:center',
          'font-family:inherit',
        ].join(';');
        hint.textContent = selectFromListMessage;
      }

      if (pac.firstChild !== hint) {
        pac.insertBefore(hint, pac.firstChild);
      }
    };

    syncHint();
    const mo = new MutationObserver(syncHint);
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });
    const interval = window.setInterval(syncHint, 150);

    return () => {
      cancelled = true;
      removeHint();
      mo.disconnect();
      window.clearInterval(interval);
    };
  }, [isFocused, location, value, noGooglePredictions, predictionsLoading, inputValue, pacHintDomId, selectFromListMessage]);
  
  useEffect(() => {
    if (!mobileSearchSheetOpen) return;
    const scrollY = window.scrollY;
    const prevOverflow = document.body.style.overflow;
    const prevPosition = document.body.style.position;
    const prevTop = document.body.style.top;
    const prevWidth = document.body.style.width;

    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.position = prevPosition;
      document.body.style.top = prevTop;
      document.body.style.width = prevWidth;
      window.scrollTo(0, scrollY);
    };
  }, [mobileSearchSheetOpen]);

  useEffect(() => {
    if (!mobileSearchSheetOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileSearchSheetOpen(false);
        setIsFocused(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileSearchSheetOpen]);

  useEffect(() => {
    if (airportOnly || readOnly) {
      hideAllPacContainers();
    }
  }, [airportOnly, readOnly]);

  // Initialize Google Maps Autocomplete when ready (re-attaches when mobile sheet opens / input remounts).
  useLayoutEffect(() => {
    if (!isLoaded || !google) return;

    const collapsedInfieldSheet =
      fullscreenMobileSearchSheet && !mobileSearchSheetOpen;
    if (collapsedInfieldSheet || readOnly || disabled || airportOnly) {
      return undefined;
    }

    const el = inputRef.current;
    if (!el) return undefined;

    if (autocompleteRef.current && google.maps?.event) {
      google.maps.event.clearInstanceListeners(autocompleteRef.current);
      autocompleteRef.current = null;
    }

    let ac: google.maps.places.Autocomplete | null = null;

    try {
      const isOutstationDrop =
        (tripType === 'outstation' || tripType === 'custom') && !isPickupLocation;

      const options: google.maps.places.AutocompleteOptions = {
        types: ['geocode', 'establishment'],
        componentRestrictions: { country: 'in' },
      };

      if (!isOutstationDrop) {
        const biasCenter =
          tripType === 'airport' && !isPickupLocation
            ? new google.maps.LatLng(BHOGAPURAM_AIRPORT.lat, BHOGAPURAM_AIRPORT.lng)
            : new google.maps.LatLng(VIZAG_LAT, VIZAG_LNG);
        const circle = new google.maps.Circle({
          center: biasCenter,
          radius: vizagBiasRadiusKm * 1000,
        });
        const bounds = circle.getBounds() as google.maps.LatLngBounds;
        options.bounds = bounds;
        options.strictBounds = enforceVizag35Km;
      }

      ac = new google.maps.places.Autocomplete(el, options);

      ac.addListener('place_changed', () => {
        setNoGooglePredictions(false);
        setPredictionsLoading(false);
        const place = ac?.getPlace();
        if (place && place.geometry?.location) {
          const typedQuery = lastTypedQueryRef.current || inputRef.current?.value || '';

          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();

          const isAirportTransfer = tripType === 'airport';
          const placeIsVizagAirport = isVizagAirportPlace({
            name: place.name,
            address: place.formatted_address,
            id: place.place_id,
            lat,
            lng,
          });

          if (isTourPickup && !isWithinTourPickupRadius({ lat, lng })) {
            toast('Tour pickup must be within 20 km of Vizag Taxi Hub. Please choose a closer location.');
            setInputValue('');
            if (onChangeRef.current) onChangeRef.current('');
            if (onLocationChangeRef.current) onLocationChangeRef.current(EMPTY_LOCATION);
            return;
          }

          if (isLocalLastDrop && !isWithinVizagRange(lat, lng)) {
            toast(LOCAL_LAST_DROP_MESSAGE);
            setInputValue('');
            if (onChangeRef.current) onChangeRef.current('');
            if (onLocationChangeRef.current) onLocationChangeRef.current(EMPTY_LOCATION);
            return;
          }

          if (enforceVizag35Km && !isTourPickup && !isLocalLastDrop && !isWithinVizagRange(lat, lng) && !placeIsVizagAirport) {
            toast('Selected location is outside the 35km radius from Visakhapatnam. Please select a location within Visakhapatnam city limits.');
            setInputValue('');
            if (onChangeRef.current) onChangeRef.current('');
            if (onLocationChangeRef.current) onLocationChangeRef.current(EMPTY_LOCATION);
            return;
          }

          if (isAirportTransfer && !enforceVizag35Km && !isAirportTransferOtherEnd({
            id: place.place_id || '',
            name: place.name || '',
            address: place.formatted_address || '',
            city: '',
            state: '',
            lat,
            lng,
            type: 'other',
            popularityScore: 0,
          }) && !placeIsVizagAirport) {
            toast("Selected location is outside the airport transfer area. We'll automatically switch to Outstation for this trip.");
            onRequestOutstationSwitchRef.current?.();
          }

          const picked: Location = {
              id: place.place_id || place.formatted_address || '',
              name: place.name || place.formatted_address || '',
              address: place.formatted_address || '',
              lat,
              lng,
              isInVizag: isWithinVizagRange(lat, lng),
              city: '',
              state: '',
              type: `${place.name || ''}`.toLowerCase().includes('airport')
                ? 'airport'
                : 'other',
              popularityScore: 50,
            };
            const resolved = canonicalizePickedLocation(picked, typedQuery);
            setInputValue(resolved.name || resolved.address || '');
            if (onChangeRef.current) {
              onChangeRef.current(resolved.name || resolved.address || '');
            }
            onLocationChangeRef.current?.(resolved);
          setMobileSearchSheetOpen(false);
        }
      });

      autocompleteRef.current = ac;
    } catch (err) {
      console.error('Failed to initialize Google Maps Autocomplete:', err);
      toast('Error initializing location search. Please try refreshing the page.');
    }

    return () => {
      if (ac && google.maps?.event) {
        google.maps.event.clearInstanceListeners(ac);
      }
      autocompleteRef.current = null;
      hideAllPacContainers();
    };
  }, [
    isLoaded,
    google,
    isPickupLocation,
    restrictToVizagRadius,
    tripType,
    mobileSearchSheetOpen,
    fullscreenMobileSearchSheet,
    airportOnly,
    readOnly,
    disabled,
    vizagBiasRadiusKm,
    isTourPickup,
    isLocalLastDrop,
    enforceVizag35Km,
  ]);

  const closeMobileSearchSheet = () => {
    setMobileSearchSheetOpen(false);
    setIsFocused(false);
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const native = e.nativeEvent as InputEvent;
    if (native.inputType) {
      lastTypedQueryRef.current = newValue;
    }
    const prevLoc = locationRef.current;
    const prevDisplay = (prevLoc?.name || prevLoc?.address || '').trim();
    if (onLocationChange && prevLoc?.id && newValue.trim() !== prevDisplay) {
      onLocationChange(EMPTY_LOCATION);
    }

    setInputValue(newValue);
    
    // Call the original onChange if provided
    if (onChange) {
      onChange(newValue);
    }
    
    // Only show suggestions if there's input and we have suggestions
    setShowSuggestions(newValue.length > 0 && suggestions.length > 0);
  };
  
     const handleSuggestionClick = (suggestion: Location) => {
     const isAirportTransfer = tripType === 'airport';
     const resolved = canonicalizePickedLocation(
       suggestion,
       lastTypedQueryRef.current || inputValue
     );
     
     if (isTourPickup && !isWithinTourPickupRadius(resolved)) {
       toast('Tour pickup must be within 20 km of Vizag Taxi Hub. Please choose a closer location.');
       return;
     }

     if (isLocalLastDrop && !isWithinVizagRange(resolved.lat, resolved.lng)) {
       toast(LOCAL_LAST_DROP_MESSAGE);
       return;
     }
     
     // Pickup: must be within 35km of Vizag (airport campus itself is allowed)
     if (enforceVizag35Km && !isTourPickup && !isLocalLastDrop && !isWithinVizagRange(resolved.lat, resolved.lng) && !isVizagAirportLocation(resolved)) {
       toast("Selected location is outside the 35km radius from Visakhapatnam. Please select a location within Visakhapatnam city limits.");
       return;
     }
     
     if (isAirportTransfer && !enforceVizag35Km && !isAirportTransferOtherEnd(resolved) && !isVizagAirportLocation(resolved)) {
       toast("Selected location is outside the airport transfer area. We'll automatically switch to Outstation for this trip.");
       onRequestOutstationSwitchRef.current?.();
     }
    setInputValue(resolved.name || resolved.address || "");
    
    // Call the original onChange if provided
    if (onChange) {
      onChange(resolved.name || resolved.address || "");
    }
    
    // Call onLocationChange if provided
    if (onLocationChange) {
      onLocationChange(resolved);
    }
    
    setShowSuggestions(false);
    if (fullscreenMobileSearchSheet) {
      setMobileSearchSheetOpen(false);
    }
  };
  
  const handleInputBlur = () => {
    // Delay hiding suggestions to allow clicking on them
    window.setTimeout(() => setShowSuggestions(false), 200);
  };

     // Determine subtitle text based on props
   const getSubtitleText = () => {
     const isAirportTransfer = tripType === 'airport';

     if (airportOnly) {
       return '';
     }
     if (isTourPickup) {
       return 'Pickup must be within 20 km of Vizag Taxi Hub.';
     }
     if (isLocalLastDrop) {
       return 'Last drop must be a local Vizag location (within 35 KM).';
     }
     if (enforceVizag35Km) {
       return 'Select a valid location from suggestions (within 35 KM radius).';
     } else if (isAirportTransfer) {
       return 'Airport transfers include Vizag, Vizianagaram, Srikakulam, and nearby.';
     }
     // For outstation drop locations, no subtitle needed
     return "";
   };
  
  const subtitleText = getSubtitleText();

  const committedLocation =
    location ??
    (typeof value === 'object' && value !== null ? (value as Location) : undefined);

  /** Custom empty panel only when Google Places is unavailable — otherwise it stacks on `.pac-container`. */
  const showEmptyGoogleDropdown =
    !isLoaded &&
    !google &&
    isFocused &&
    noGooglePredictions &&
    !predictionsLoading &&
    inputValue.trim().length >= 2;

  // Google `.pac-container` is the only list when Places is loaded. Curated
  // suggestions otherwise stack as a second dropdown on the Airport tab.
  const showCuratedSuggestionList =
    showSuggestions && filteredSuggestions.length > 0 && (!isLoaded || airportOnly);

  const showSelectionInvalid = inputValue.trim().length > 0 && !committedLocation?.id;

  /** Shared markup for curated suggestions (no curated “recent/popular” — only typed matches). */
  const suggestionsListMarkup = (
    <>
      {showSelectionInvalid && (
        <div
          className="border-b border-red-100 bg-red-50/70 px-3 py-2.5 text-center text-xs leading-snug text-red-600"
          role="status"
        >
          {selectFromListMessage}
        </div>
      )}
      {filteredSuggestions.map((suggestion) => (
        <div
          key={suggestion.id}
          className="cursor-pointer border-b border-gray-100 p-3 last:border-0 hover:bg-gray-100"
          onMouseDown={() => handleSuggestionClick(suggestion)}
        >
          <div className="font-medium">{suggestion.name}</div>
          {suggestion.address && suggestion.address !== suggestion.name && (
            <div className="text-sm text-gray-500">{suggestion.address}</div>
          )}
        </div>
      ))}
    </>
  );

  const emptyGooglePanelMarkup = (
    <>
      {showSelectionInvalid && (
        <div className="border-b border-red-100 bg-red-50/70 px-4 py-3 text-center sm:px-5">
          <p className="text-xs leading-snug text-red-600">{selectFromListMessage}</p>
        </div>
      )}
      <div className="px-5 py-5 text-center sm:px-6 sm:py-6">
        <p className="text-[15px] font-bold leading-snug tracking-tight text-gray-900 sm:text-[17px]">
          No Results Found
        </p>
        <p className="mx-auto mt-2.5 max-w-[min(100%,20rem)] text-sm leading-relaxed text-gray-500">
          for <span className="font-medium text-gray-600">&quot;{inputValue.trim()}&quot;</span>
        </p>
      </div>
    </>
  );
  
  return (
    <>
    <div className={cn("relative", className)}>
      {error && (
        <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
          <strong>Location search limited:</strong> {error.message}
          <br />
          <span className="text-xs">You can still type locations manually.</span>
        </div>
      )}

      {/* Desktop / app: static label above (not infield — label lives inside the row) */}
      {(isDesktopVariant || (isAppVariant && !isInfieldVariant)) && label && (
        <label
          htmlFor={id}
          className={cn(
            "block pointer-events-none font-medium",
            isAppVariant
              ? "mb-1 text-[11px] font-bold uppercase tracking-wide text-blue-600"
              : "mb-1.5 text-xs text-gray-600"
          )}
        >
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}
      {/* Mobile: floating label when focused/has value */}
      {!isDesktopVariant && !isAppVariant && !isInfieldVariant && label && (isFocused || inputValue) && (
        <label
          htmlFor={id}
          className="absolute left-10 -top-2.5 text-xs bg-white px-1 text-blue-600 z-10 pointer-events-none transition-all duration-200"
          style={{ background: 'white', paddingLeft: '0.25rem', paddingRight: '0.25rem', zIndex: 10 }}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div
        ref={pacAnchorRef}
        className={cn(
          "ios-search-input-wrapper relative",
          isDesktopVariant &&
            cn(
              "flex min-h-[2.75rem] items-center rounded-md border border-gray-200 bg-white pl-3",
              "transition-[border-color,box-shadow] duration-150",
              "focus-within:border-blue-500",
              isFocused && "border-blue-500"
            ),
          isAppVariant &&
            !isInfieldVariant &&
            cn(
              "flex min-h-[3rem] items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1.5 shadow-sm",
              "transition-[border-color,box-shadow] duration-150",
              "focus-within:border-blue-500",
              isFocused && "border-blue-500"
            ),
          isInfieldVariant &&
            "flex min-h-[2.75rem] items-start gap-2 rounded-none border-0 bg-transparent py-1 shadow-none"
        )}
      >
        {((isDesktopVariant || (isAppVariant && !isInfieldVariant)) && !hideLeadingIcon) && (
          <MapPin className={cn("flex-shrink-0 text-gray-400", isAppVariant ? "h-5 w-5" : "mr-2 h-4 w-4")} aria-hidden />
        )}
        {isInfieldVariant && !hideLeadingIcon && (
          <MapPin className="h-4 w-4 shrink-0 self-center text-gray-500" aria-hidden />
        )}
        <div
          className={cn(
            "min-w-0 flex-1",
            (isDesktopVariant || (isAppVariant && !isInfieldVariant)) && "flex items-center relative",
            isInfieldVariant && "relative flex min-h-0 flex-col gap-0 leading-none"
          )}
        >
          {isInfieldVariant && label && (
            <label htmlFor={id} className="pointer-events-none text-[11px] font-medium leading-none text-gray-500">
              {label}
              {required && <span className="ml-0.5 text-red-500">*</span>}
            </label>
          )}
          <div className={cn(isInfieldVariant ? "relative mt-0.5 w-full" : "relative w-full")}>
        {fullscreenMobileSearchSheet ? (
          <button
            type="button"
            ref={fieldTriggerRef}
            aria-haspopup="dialog"
            aria-expanded={mobileSearchSheetOpen}
            disabled={disabled}
            className={cn(
              "-ml-0.5 w-full min-h-0 rounded-md py-0 pr-10 text-left outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
              "touch-manipulation text-base leading-tight",
              inputValue ? "font-bold text-gray-900" : "font-normal text-gray-500"
            )}
            onClick={() => {
              setMobileSearchSheetOpen(true);
              queueMicrotask(() => setIsFocused(true));
            }}
            >
            <span className="block w-full break-words text-left leading-snug line-clamp-2">
              {inputValue || placeholder || 'Enter location'}
            </span>
          </button>
        ) : (
        <Input
          id={id}
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          placeholder={
            isDesktopVariant
              ? placeholder || "Enter a location"
              : isAppVariant && !isInfieldVariant
                ? placeholder || "Enter location"
                : isInfieldVariant
                  ? placeholder || "Enter location"
                  : !isFocused && !inputValue
                    ? label
                    : ""
          }
          disabled={disabled}
          readOnly={readOnly}
          style={{
            fontSize: isDesktopVariant
              ? isDesktop
                ? "0.9375rem"
                : "1rem"
              : isAppVariant
                ? "1rem"
                : isDesktop
                  ? "1.2rem"
                  : "1rem",
            height: isAppVariant && !isInfieldVariant ? "auto" : isDesktopVariant ? "2.75rem" : isInfieldVariant ? "auto" : "3.5rem",
            minHeight: isAppVariant ? (isInfieldVariant ? "1.25rem" : "2.5rem") : undefined,
          }}
          className={cn(
            "pr-10 ios-search-input outline-none focus:outline-none focus-visible:outline-none",
            "focus:ring-0 focus-visible:ring-0 focus:ring-offset-0 focus-visible:ring-offset-0",
            readOnly && "cursor-default bg-transparent",
            isDesktopVariant || (isAppVariant && !isInfieldVariant)
              ? cn(
                  "border-0 bg-transparent font-semibold text-gray-900 shadow-none placeholder:text-gray-500",
                  isAppVariant && !isInfieldVariant && "px-0 pr-10"
                )
              : isInfieldVariant && !isDesktop
                  ? cn(
                      "rounded-none border-0 bg-transparent px-0 py-0 text-base font-bold leading-tight text-gray-900 shadow-none placeholder:font-normal placeholder:text-gray-500"
                    )
                  : isInfieldVariant
                    ? cn(
                        "rounded-none border-0 bg-transparent px-0 py-0 text-xl font-semibold shadow-none placeholder:font-normal placeholder:text-gray-500"
                      )
                    : "border-gray-300 font-bold focus:border-blue-500 focus:ring-blue-500"
          )}
          onFocus={() => {
            hideAllPacContainers();
            setShowSuggestions(inputValue.length > 0 && suggestions.length > 0);
            setIsFocused(true);
          }}
          onBlur={() => {
            handleInputBlur();
            window.setTimeout(() => {
              setIsFocused(false);
              hideAllPacContainers();
            }, 200);
          }}
        />
        )}
        {inputValue && !readOnly && !hideClearButton && (
          <button
            type="button"
            className={cn(
              "absolute z-[1] text-gray-400 hover:text-gray-600 focus:outline-none p-2",
              isInfieldVariant ? "right-0 top-1/2 -translate-y-1/2" : "right-2 top-1/2 -translate-y-1/2"
            )}
            onClick={(e) => {
              e.stopPropagation();
              setInputValue("");
              if (onChange) onChange("");
              if (onLocationChange) {
                onLocationChange(EMPTY_LOCATION);
              }
              setShowSuggestions(false);
              setNoGooglePredictions(false);
            }}
            tabIndex={-1}
            aria-label="Clear location"
          >
            <X className="w-4 h-4" />
          </button>
        )}
          </div>
        </div>
      </div>
      {!isDesktopVariant && subtitleText && !fullscreenMobileSearchSheet && (
        <p
          className={cn(
            "text-left text-xs text-gray-500",
            isAppVariant || isInfieldVariant ? "mt-1" : "mt-1.5"
          )}
        >
          {subtitleText}
        </p>
      )}
      {showCuratedSuggestionList && !mobileSearchSheetOpen && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
          {suggestionsListMarkup}
        </div>
      )}

      {showEmptyGoogleDropdown && !mobileSearchSheetOpen && (
        <div
          className={cn(
            "absolute z-[1001] mt-1.5 w-full overflow-hidden rounded-2xl border border-gray-200/90 bg-white",
            "shadow-[0_8px_30px_rgba(15,23,42,0.08),0_2px_8px_rgba(15,23,42,0.04)]",
            "animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200"
          )}
          role="status"
        >
          {emptyGooglePanelMarkup}
        </div>
      )}
    </div>
    {fullscreenMobileSearchSheet &&
    mobileSearchSheetOpen &&
    typeof document !== 'undefined'
      ? createPortal(
        <div
          className="location-search-sheet fixed inset-0 z-[10070] flex w-full max-w-[100vw] flex-col overflow-x-clip bg-white"
          role="dialog"
          aria-modal="true"
          aria-label={label ? `Search ${label}` : 'Search location'}
        >
          <div className="shrink-0 border-b border-gray-100 px-3 pb-3 pt-[max(12px,env(safe-area-inset-top))]">
            <div
              ref={sheetPacBottomRef}
              className="flex min-h-[2.875rem] items-center gap-1 rounded-full bg-gray-100 px-1 py-1 pl-1"
            >
              <button
                type="button"
                className="shrink-0 rounded-full p-2.5 text-gray-800 transition-colors hover:bg-gray-200/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                aria-label="Back"
                onClick={() => closeMobileSearchSheet()}
              >
                <ArrowLeft className="h-5 w-5" aria-hidden />
              </button>
              <Input
                id={`${id ?? 'location'}-fullscreen-search`}
                ref={(el) => {
                  inputRef.current = el;
                }}
                value={inputValue}
                autoCapitalize="words"
                autoCorrect="off"
                autoComplete="off"
                onChange={handleInputChange}
                placeholder={placeholder || 'Search location'}
                disabled={disabled}
                className="h-11 min-h-0 flex-1 border-0 bg-transparent px-1 text-base shadow-none outline-none placeholder:text-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0"
                style={{ fontSize: '16px' }}
                autoFocus
                onFocus={() => {
                  hideAllPacContainers();
                  setShowSuggestions(inputValue.length > 0 && suggestions.length > 0);
                  setIsFocused(true);
                }}
                onBlur={() => {
                  handleInputBlur();
                  window.setTimeout(() => {
                    setIsFocused(false);
                    hideAllPacContainers();
                  }, 200);
                }}
              />
            </div>
          </div>
          {subtitleText ? (
            <p className="px-4 pt-2 text-xs text-gray-500">{subtitleText}</p>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-3">
            {showCuratedSuggestionList && (
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">{suggestionsListMarkup}</div>
            )}
            {showEmptyGoogleDropdown && (
              <div
                className="relative z-[1] overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.08),0_2px_8px_rgba(15,23,42,0.04)]"
                role="status"
              >
                {emptyGooglePanelMarkup}
              </div>
            )}
          </div>
        </div>,
        document.body
      )
      : null}
    </>
  );
});