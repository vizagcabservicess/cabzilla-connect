import React, { useState, useEffect, useRef, useId } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGoogleMaps } from "@/providers/GoogleMapsProvider";
import { X, MapPin } from "lucide-react";
import { toast } from "sonner";
import type { Location } from '@/lib/locationData';
import type { TripType } from '@/lib/tripTypes';
import { cn } from '@/lib/utils';

// Vizag coordinates
const VIZAG_LAT = 17.6868;
const VIZAG_LNG = 83.2185;
const MAX_DISTANCE_KM = 35;

const PREDICTION_DEBOUNCE_MS = 320;

const SELECT_FROM_LIST_MESSAGE_DEFAULT = 'Please select a location from the suggestions list';

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
  tripType?: TripType;
  readOnly?: boolean;
  /** mobile = floating label; desktop = label + bordered row; app = native-app style (uppercase label, gray row, pin icon) */
  variant?: 'mobile' | 'desktop' | 'app';
}

export function LocationInput({
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
  tripType,
  readOnly = false,
  variant = 'mobile',
}: LocationInputProps) {
  const selectFromListMessage = isPickupLocation
    ? 'Select a valid pickup from suggestions (within 35 KM radius).'
    : SELECT_FROM_LIST_MESSAGE_DEFAULT;

  const isDesktopVariant = variant === 'desktop';
  const isAppVariant = variant === 'app';
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<Location[]>([]);
  const [inputValue, setInputValue] = useState<string>("");
  const valueRef = useRef<Location | string | undefined>(value);
  const locationRef = useRef(location);
  const initializedRef = useRef(false);
  const { isLoaded, google, error } = useGoogleMaps();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const autocompleteInitializedRef = useRef(false);
  const initializationAttemptsRef = useRef(0);
  const [isFocused, setIsFocused] = useState(false);
  const [isDesktop, setIsDesktop] = useState(typeof window !== 'undefined' ? window.innerWidth >= 1024 : false);
  const [predictionsLoading, setPredictionsLoading] = useState(false);
  const [noGooglePredictions, setNoGooglePredictions] = useState(false);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const predictionsRequestSeq = useRef(0);
  /** Full input row (pin + field); Google `.pac-container` is on `body` — we sync its box to this. */
  const pacAnchorRef = useRef<HTMLDivElement | null>(null);
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
     if (inputValue && inputValue.length >= 2 && suggestions.length > 0) {
       const isAirportTransfer = tripType === 'airport';
       const isTourTrip = tripType === 'tour';
       
       // First filter by input match (faster than distance calculation)
       let filtered = suggestions.filter(suggestion => {
         return (suggestion.name || "").toLowerCase().includes(inputValue.toLowerCase());
       });
       
       // Then apply distance filtering only if needed
       if (isPickupLocation || isAirportTransfer || isTourTrip) {
         filtered = filtered.filter(suggestion => {
           return isWithinVizagRange(suggestion.lat, suggestion.lng);
         });
       }
       
       setFilteredSuggestions(filtered);
     } else {
       setFilteredSuggestions([]);
     }
   }, [inputValue, suggestions, isPickupLocation, tripType]);

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
    if (q.length < 2 || !isFocused) {
      setPredictionsLoading(false);
      setNoGooglePredictions(false);
      return;
    }

    setPredictionsLoading(true);
    setNoGooglePredictions(false);
    const seq = ++predictionsRequestSeq.current;

    const timer = window.setTimeout(() => {
      const isOutstationDrop = tripType === 'outstation' && !isPickupLocation;
      const request: google.maps.places.AutocompletionRequest & { strictBounds?: boolean } = {
        input: q,
        componentRestrictions: { country: 'in' },
        types: ['geocode', 'establishment'],
      };

      if (!isOutstationDrop) {
        const vizagCenter = new google.maps.LatLng(VIZAG_LAT, VIZAG_LNG);
        const circle = new google.maps.Circle({
          center: vizagCenter,
          radius: MAX_DISTANCE_KM * 1000,
        });
        request.bounds = circle.getBounds() as google.maps.LatLngBounds;
        if (isPickupLocation) {
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
  }, [inputValue, isFocused, isLoaded, google, isPickupLocation, tripType]);

  // Keep Google Places `.pac-container` aligned to this field so it does not spill into sibling columns (desktop row).
  useEffect(() => {
    if (typeof document === 'undefined' || !isFocused) return;

    let cancelled = false;
    const alignPac = () => {
      if (cancelled) return;
      const anchor = pacAnchorRef.current;
      if (!anchor) return;
      const candidates = Array.from(document.querySelectorAll<HTMLElement>('.pac-container')).filter((el) => {
        const st = window.getComputedStyle(el);
        return st.display !== 'none' && st.visibility !== 'hidden' && el.getBoundingClientRect().height > 0;
      });
      const pac = candidates.length > 0 ? candidates[candidates.length - 1] : null;
      if (!pac) return;

      const rect = anchor.getBoundingClientRect();
      const w = Math.max(200, Math.round(rect.width));
      const left = Math.round(rect.left);
      const top = Math.round(rect.bottom + 2);

      const s = pac.style;
      s.setProperty('position', 'fixed', 'important');
      s.setProperty('box-sizing', 'border-box', 'important');
      s.setProperty('width', `${w}px`, 'important');
      s.setProperty('min-width', `${w}px`, 'important');
      s.setProperty('max-width', `${w}px`, 'important');
      s.setProperty('left', `${left}px`, 'important');
      s.setProperty('top', `${top}px`, 'important');
      s.setProperty('right', 'auto', 'important');
      s.setProperty('transform', 'none', 'important');
    };

    alignPac();
    window.addEventListener('resize', alignPac);
    window.addEventListener('scroll', alignPac, true);

    const mo = new MutationObserver(alignPac);
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });

    const interval = window.setInterval(alignPac, 150);

    return () => {
      cancelled = true;
      window.removeEventListener('resize', alignPac);
      window.removeEventListener('scroll', alignPac, true);
      mo.disconnect();
      window.clearInterval(interval);
    };
  }, [isFocused]);

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
  
  // Initialize Google Maps Autocomplete when ready
  useEffect(() => {
    if (!isLoaded || !google || !inputRef.current || autocompleteInitializedRef.current) return;
    
    try {
      // For outstation drop: no bounds = India-wide search (Kakinada, Vijayawada, etc.)
      // For pickup / airport drop / tour: bias toward Vizag (35km)
      const isOutstationDrop = tripType === 'outstation' && !isPickupLocation;

      const options: google.maps.places.AutocompleteOptions = {
        types: ["geocode", "establishment"],
        componentRestrictions: { country: "in" },
      };

      if (!isOutstationDrop) {
        const vizagCenter = new google.maps.LatLng(VIZAG_LAT, VIZAG_LNG);
        const circle = new google.maps.Circle({
          center: vizagCenter,
          radius: MAX_DISTANCE_KM * 1000,
        });
        const bounds = circle.getBounds() as google.maps.LatLngBounds;
        options.bounds = bounds;
        options.strictBounds = isPickupLocation; // Only enforce strict bounds for pickup
      }

      autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current as HTMLInputElement, options);
      
      // Add place_changed listener
      autocompleteRef.current.addListener("place_changed", () => {
        setNoGooglePredictions(false);
        setPredictionsLoading(false);
        const place = autocompleteRef.current?.getPlace();
        if (place && place.geometry?.location) {
          setInputValue(place.name || place.formatted_address || "");
          
          if (onChange && place.formatted_address) {
            onChange(place.formatted_address);
          }
          
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          
          // Check if within range for pickup locations
          const isAirportTransfer = tripType === 'airport';
          const isTourTrip = tripType === 'tour';
          
          // For tour trips, pickup location must be within 35km (matches ToursPage)
          if (isTourTrip && isPickupLocation && !isWithinVizagRange(lat, lng, 35)) {
            toast("Selected location is outside the 35km radius from Visakhapatnam. Please select a location within Visakhapatnam city limits.");
            setInputValue("");
            if (onChange) onChange("");
            if (onLocationChange) onLocationChange(EMPTY_LOCATION);
            return;
          }
          
          // For regular pickup locations (non-tour), validate 35km radius
          if (isPickupLocation && !isTourTrip && !isWithinVizagRange(lat, lng)) {
            toast("Selected location is outside the 35km radius from Visakhapatnam. Please select a location within Visakhapatnam city limits.");
            setInputValue("");
            if (onChange) onChange("");
            if (onLocationChange) onLocationChange(EMPTY_LOCATION);
            return;
          }
          
          // For airport transfers, allow drop locations outside range to trigger automatic switching
          if (isAirportTransfer && !isPickupLocation && !isWithinVizagRange(lat, lng)) {
            toast("Selected location is outside the 35km radius from Visakhapatnam. We'll automatically switch to Outstation for this trip.");
          }
          
          if (onLocationChange) {
            onLocationChange({
              id: place.place_id || place.formatted_address || "",
              name: place.name || place.formatted_address || "",
              address: place.formatted_address || "",
              lat: lat,
              lng: lng,
              isInVizag: isWithinVizagRange(lat, lng),
              city: '',
              state: '',
              type: 'other',
              popularityScore: 50
            });
          }
        }
      });
      
      autocompleteInitializedRef.current = true;
      initializationAttemptsRef.current = 0;
    } catch (error) {
      console.error("Failed to initialize Google Maps Autocomplete:", error);
      initializationAttemptsRef.current++;
      if (initializationAttemptsRef.current < 3) {
        setTimeout(() => {
          autocompleteInitializedRef.current = false;
        }, 500 * initializationAttemptsRef.current);
      } else {
        toast("Error initializing location search. Please try refreshing the page.");
        console.error("Failed to initialize Google Maps Autocomplete after multiple attempts:", error);
      }
    }
     }, [isLoaded, google, inputRef.current, isPickupLocation, tripType, onLocationChange, onChange]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
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
     const isTourTrip = tripType === 'tour';
     
     // Validate location before accepting it
     // For tour trips, pickup location must be within 35km (matches ToursPage)
     if (isTourTrip && isPickupLocation && !isWithinVizagRange(suggestion.lat, suggestion.lng, 35)) {
       toast("Selected location is outside the 35km radius from Visakhapatnam. Please select a location within Visakhapatnam city limits.");
       return;
     }
     
     // For regular pickup locations (non-tour), validate 35km radius
     if (isPickupLocation && !isTourTrip && !isWithinVizagRange(suggestion.lat, suggestion.lng)) {
       toast("Selected location is outside the 35km radius from Visakhapatnam. Please select a location within Visakhapatnam city limits.");
       return;
     }
     
     if (isAirportTransfer && !isPickupLocation && !isWithinVizagRange(suggestion.lat, suggestion.lng)) {
       toast("Selected location is outside the 35km radius from Visakhapatnam. We'll automatically switch to Outstation for this trip.");
     }
    setInputValue(suggestion.name || suggestion.address || "");
    
    // Call the original onChange if provided
    if (onChange) {
      onChange(suggestion.name || suggestion.address || "");
    }
    
    // Call onLocationChange if provided
    if (onLocationChange) {
      onLocationChange(suggestion);
    }
    
    setShowSuggestions(false);
  };
  
  const handleInputBlur = () => {
    // Delay hiding suggestions to allow clicking on them
    window.setTimeout(() => setShowSuggestions(false), 200);
  };

     // Determine subtitle text based on props
   const getSubtitleText = () => {
     const isAirportTransfer = tripType === 'airport';

     if (isPickupLocation) {
       return 'Select a valid pickup from suggestions (within 35 KM radius).';
     } else if (isAirportTransfer) {
       return "Please select a location within 35km of Visakhapatnam";
     }
     // For outstation drop locations, no subtitle needed
     return "";
   };
  
  const subtitleText = getSubtitleText();

  const committedLocation =
    location ??
    (typeof value === 'object' && value !== null ? (value as Location) : undefined);

  const showEmptyGoogleDropdown =
    isFocused &&
    noGooglePredictions &&
    !predictionsLoading &&
    inputValue.trim().length >= 2;

  const showSelectionInvalid = inputValue.trim().length > 0 && !committedLocation?.id;
  
  return (
    <div className={cn("relative", className)}>
      {error && (
        <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
          <strong>Location search limited:</strong> {error.message}
          <br />
          <span className="text-xs">You can still type locations manually.</span>
        </div>
      )}

      {/* Desktop / app: static label above */}
      {(isDesktopVariant || isAppVariant) && label && (
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
      {!isDesktopVariant && !isAppVariant && label && (isFocused || inputValue) && (
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
          isDesktopVariant && "border border-gray-200 rounded-md bg-white flex items-center pl-3 min-h-[2.75rem]",
          isAppVariant &&
            "flex min-h-[3rem] items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1.5 shadow-sm"
        )}
      >
        {(isDesktopVariant || isAppVariant) && (
          <MapPin className={cn("flex-shrink-0 text-gray-400", isAppVariant ? "h-5 w-5" : "mr-2 h-4 w-4")} aria-hidden />
        )}
        <div className={cn("min-w-0 flex-1", (isDesktopVariant || isAppVariant) && "flex items-center")}>
        <Input
          id={id}
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          placeholder={
            isDesktopVariant
              ? placeholder || "Enter a location"
              : isAppVariant
                ? placeholder || "Enter location"
                : !isFocused && !inputValue
                  ? label
                  : ""
          }
          disabled={disabled}
          readOnly={readOnly}
          style={{
            fontSize: isDesktopVariant ? "0.9375rem" : isAppVariant ? "1rem" : isDesktop ? "1.2rem" : "1rem",
            height: isAppVariant ? "auto" : isDesktopVariant ? "2.75rem" : "3.5rem",
            minHeight: isAppVariant ? "2.5rem" : undefined,
          }}
          className={cn(
            "pr-10 ios-search-input",
            isDesktopVariant || isAppVariant
              ? cn(
                  "border-0 bg-transparent font-semibold text-gray-900 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-gray-500",
                  isAppVariant && "px-0 pr-10"
                )
              : "border-gray-300 font-bold focus:border-blue-500 focus:ring-blue-500"
          )}
          onFocus={() => { setShowSuggestions(inputValue.length > 0 && suggestions.length > 0); setIsFocused(true); }}
          onBlur={() => {
            handleInputBlur();
            window.setTimeout(() => setIsFocused(false), 200);
          }}
        />
        {inputValue && !readOnly && (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none p-2"
            onClick={() => {
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
      {!isDesktopVariant && subtitleText && (
        <p className={cn("text-left text-xs text-gray-500", isAppVariant ? "mt-1" : "mt-1.5")}>{subtitleText}</p>
      )}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
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
              className="p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-0"
              onMouseDown={() => handleSuggestionClick(suggestion)}
            >
              <div className="font-medium">{suggestion.name}</div>
              {suggestion.address && suggestion.address !== suggestion.name && (
                <div className="text-sm text-gray-500">{suggestion.address}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {showEmptyGoogleDropdown && (
        <div
          className={cn(
            "absolute z-[1001] w-full mt-1.5 overflow-hidden rounded-2xl border border-gray-200/90 bg-white",
            "shadow-[0_8px_30px_rgba(15,23,42,0.08),0_2px_8px_rgba(15,23,42,0.04)]",
            "animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200"
          )}
          role="status"
        >
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
              for{' '}
              <span className="font-medium text-gray-600">&quot;{inputValue.trim()}&quot;</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}