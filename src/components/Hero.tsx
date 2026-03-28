import { useState, useEffect, useRef, useCallback } from 'react';
import { LocationInput } from './LocationInput';
import { DateTimePicker } from './DateTimePicker';
import { CabOptions } from './CabOptions';
import { BookingSummary } from './BookingSummary';
import { 
  vizagLocations, 
  calculateAirportFare,
  Location
} from '@/lib/locationData';
import { convertToApiLocation, createLocationChangeHandler, isLocationInVizag } from '@/lib/locationUtils';
import { cabTypes, formatPrice, loadCabTypes } from '@/lib/cabData';
import { hourlyPackages, getLocalPackagePrice } from '@/lib/packageData';
import { TripType, TripMode, ensureCustomerTripType } from '@/lib/tripTypes';
import { CabType } from '@/types/cab';
import { filterAvailableVehicles } from '@/utils/vehicleAvailability';
import { ChevronRight, ArrowLeft, ArrowRight, X, MapPin, Edit, Users, Car } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { addDays, differenceInCalendarDays } from 'date-fns';
import { TabTripSelector } from './TabTripSelector';
import GoogleMapComponent from './GoogleMapComponent';
import { useIsMobile } from '@/hooks/use-mobile';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { GuestDetailsForm } from './GuestDetailsForm';
import { BookingPaymentFooter } from './BookingPaymentFooter';
import { StepIndicator } from './StepIndicator';
import { useNavigate, useLocation } from 'react-router-dom';
import { bookingAPI } from '@/services/api';
import { BookingRequest } from '@/types/api';
import { MobileNavigation } from './MobileNavigation';
import { calculateDistanceMatrix } from '@/lib/distanceService';

import { useGoogleMaps } from '@/providers/GoogleMapsProvider';
import { formatDateForAPI } from '@/lib/dateUtils';

const hourlyPackageOptions = [
  { value: "8hrs-80km", label: "8 Hours / 80 KM" },
  { value: "10hrs-100km", label: "10 Hours / 100 KM" }
];

const airportLocation = vizagLocations.find(loc => loc.type === 'airport');



export function Hero({ onSearch, isSearchActive, visibleTabs, hideBackground, onEditStart, onStepChange }: { onSearch?: (searchData: any) => void; isSearchActive?: boolean; visibleTabs?: Array<'outstation' | 'local' | 'airport' | 'tour'>; hideBackground?: boolean; onEditStart?: () => void; onStepChange?: (step: number) => void }) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const bookingSummaryRef = useRef<HTMLDivElement>(null);
  const { isLoaded } = useGoogleMaps();
  
  const loadFromSessionStorage = () => {
    try {
      // Check for route prefill data first
      const routePrefillData = sessionStorage.getItem('routePrefillData');
      if (routePrefillData) {
        const prefillData = JSON.parse(routePrefillData);
        // sessionStorage.removeItem('routePrefillData'); // Do NOT clear after use
        return {
          pickupLocation: prefillData.pickupLocation,
          dropLocation: prefillData.dropLocation,
          pickupDate: prefillData.pickupDate ? (() => {
            const parsedDate = new Date(prefillData.pickupDate);
            const now = new Date();
            const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
            
            // Check if prefill date is still valid (at least 1 hour in advance)
            if (parsedDate < oneHourFromNow) {
              // If prefill date is too close to current time, update to minimum allowed time
              return oneHourFromNow;
            }
            
            // Preserve the prefill date if it's still valid
            return parsedDate;
          })() : (() => {
            const now = new Date();
            const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
            return oneHourFromNow;
          })(),
          returnDate: prefillData.returnDate ? new Date(prefillData.returnDate) : null,
          tripType: prefillData.tripType || 'outstation',
          tripMode: prefillData.tripMode || 'one-way',
          hourlyPackage: prefillData.hourlyPackage || hourlyPackageOptions[0].value,
          selectedCab: prefillData.selectedCab || null,
          autoTriggerSearch: prefillData.autoTriggerSearch
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
        pickupLocation: pickupData ? JSON.parse(pickupData) as Location : null,
        dropLocation: dropData ? JSON.parse(dropData) as Location : null,
        pickupDate: pickupDateStr ? (() => {
          const parsedDate = new Date(JSON.parse(pickupDateStr));
          const now = new Date();
          const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
          
          // Check if stored date is still valid (at least 1 hour in advance)
          if (parsedDate < oneHourFromNow) {
            // If stored date is too close to current time, update to minimum allowed time
            return oneHourFromNow;
          }
          
          // Preserve the stored date if it's still valid
          return parsedDate;
        })() : (() => {
          const now = new Date();
          const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
          return oneHourFromNow;
        })(),
        returnDate: returnDateStr ? new Date(JSON.parse(returnDateStr)) : null,
        tripType: tripTypeData as TripType || defaultTripType,
        tripMode: tripModeData as TripMode || 'one-way',
        hourlyPackage: hourlyPkgData || hourlyPackageOptions[0].value,
        selectedCab: cabData ? JSON.parse(cabData) as CabType : null,
        autoTriggerSearch: false
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
        autoTriggerSearch: false
      };
    }
  };
  
  const savedData = loadFromSessionStorage();
  
  // Handle navigation state from edit functionality
  const navigationState = location.state as any;
  const editModeData = navigationState && navigationState.tripType === 'tour' ? {
    pickupLocation: navigationState.pickupLocation ? { name: navigationState.pickupLocation, isInVizag: true } : savedData.pickupLocation,
    tripType: 'tour' as TripType
  } : {};
  
  const [pickupLocation, setPickupLocation] = useState<Location | null>(editModeData.pickupLocation || savedData.pickupLocation);
  const [dropLocation, setDropLocation] = useState<Location | null>(savedData.dropLocation);
  const [pickupDate, setPickupDate] = useState<Date>(savedData.pickupDate || new Date());
  const [returnDate, setReturnDate] = useState<Date | null>(savedData.returnDate);
  
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
    setReturnDate(newDate || null);
  }, [returnDate]);
  // Don't auto-select first vehicle - user must explicitly select to see booking summary
  const [selectedCab, setSelectedCabState] = useState<CabType | null>(savedData.selectedCab || null);
  const [distance, setDistance] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [currentStep, setCurrentStep] = useState<number>(isSearchActive ? 2 : 1);
  const [isFormValid, setIsFormValid] = useState<boolean>(false);
  const [showBookingSummaryModal, setShowBookingSummaryModal] = useState<boolean>(false);
  const [animateBookingSummaryModal, setAnimateBookingSummaryModal] = useState<boolean>(false);
  const [tripType, setTripType] = useState<TripType>(editModeData.tripType || savedData.tripType);
  const [tripMode, setTripMode] = useState<TripMode>(savedData.tripMode);
  const [hourlyPackage, setHourlyPackage] = useState<string>(savedData.hourlyPackage);
  const [showGuestDetailsForm, setShowGuestDetailsForm] = useState<boolean>(false);
  const [isCalculatingDistance, setIsCalculatingDistance] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [finalTotal, setFinalTotal] = useState<number>(0);
  const [bookingPaymentMode, setBookingPaymentMode] = useState<'partial' | 'full'>(() => {
    if (typeof sessionStorage === 'undefined') return 'partial';
    const m = sessionStorage.getItem('paymentMode');
    return m === 'full' ? 'full' : 'partial';
  });
  const [validationError, setValidationError] = useState<string | null>(null);
  const [minTravelHours, setMinTravelHours] = useState<number>(0);
  const [isCheckingTravelTime, setIsCheckingTravelTime] = useState<boolean>(false);
  const [isReturnTimeEnabled, setIsReturnTimeEnabled] = useState<boolean>(false);
  const [minValidReturnTime, setMinValidReturnTime] = useState<Date | null>(null);
  const [isVideoLoaded, setIsVideoLoaded] = useState<boolean>(false);
  const [showMobileEditForm, setShowMobileEditForm] = useState<boolean>(false);
  // Add new state for airport direction label
  const [airportDirectionLabel, setAirportDirectionLabel] = useState<string>('');
  const [isTabSwitching, setIsTabSwitching] = useState<boolean>(false);
  const [isSlidingSearch, setIsSlidingSearch] = useState<boolean>(false);
  const [dynamicVehicles, setDynamicVehicles] = useState<CabType[]>([]);
  const [vehiclesLoaded, setVehiclesLoaded] = useState<boolean>(false);
  const [editTrigger, setEditTrigger] = useState<number>(0);

  // Helper function to get minimum allowed date (current date + 1 hour for today, or current date for future dates)
  const getMinimumAllowedDate = () => {
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    return oneHourFromNow;
  };

  // Edit handlers for booking summary
  const handleEditPickupLocation = () => {
    // Force LocationInput components to completely re-mount by changing their keys
    setEditTrigger(prev => prev + 1);
    setIsSlidingSearch(true);
    setShowGuestDetailsForm(false);
    if (onEditStart) onEditStart();
  };

  const handleEditPickupDate = () => {
    // Force LocationInput components to completely re-mount by changing their keys
    setEditTrigger(prev => prev + 1);
    setIsSlidingSearch(true);
    setShowGuestDetailsForm(false);
    if (onEditStart) onEditStart();
  };

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


  // Listen for route prefill events
  useEffect(() => {
    const handleRoutePrefill = (event: CustomEvent) => {
      const { pickupLocation: pickup, dropLocation: drop, tripType: type, tripMode: mode } = event.detail;
      setPickupLocation(pickup);
      setDropLocation(drop);
      setTripType(type);
      setTripMode(mode);
      // Don't reset pickup date when switching tabs - preserve user's selection
      // setPickupDate(new Date());
      
      // Auto-trigger search after a short delay
      setTimeout(() => {
        if (pickup && drop) {
          setCurrentStep(2);
        }
      }, 500);
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

  // Handle autoTriggerSearch functionality
  useEffect(() => {
    const hasRoutePrefillData = !!sessionStorage.getItem('routePrefillData');
    const shouldAutoSearch = savedData.autoTriggerSearch || hasRoutePrefillData;

    if (shouldAutoSearch && pickupLocation && dropLocation && isFormValid) {
      // Auto-trigger search after a short delay to ensure all state is properly set
      const timer = setTimeout(() => {
        setCurrentStep(2);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [savedData.autoTriggerSearch, pickupLocation, dropLocation, isFormValid]);

  // Clear routePrefillData after processing to prevent stale data
  useEffect(() => {
    const routePrefillData = sessionStorage.getItem('routePrefillData');
    if (routePrefillData) {
      // Clear the prefill data after a short delay to ensure it's been processed
      const timer = setTimeout(() => {
        sessionStorage.removeItem('routePrefillData');
      }, 200);
      
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
      // Enable return date picker immediately when locations are filled (don't block on API)
      setIsReturnTimeEnabled(true);
      const fallbackMinReturn = new Date(pickupDate.getTime() + 60 * 60 * 1000); // 1 hour after pickup
      setMinValidReturnTime(prev => prev ?? fallbackMinReturn);
      setIsCheckingTravelTime(true);
      (async () => {
        try {
          console.log('[TRAVEL TIME CALC] Calling calculateDistanceMatrix...');
          const result = await calculateDistanceMatrix(pickupLocation, dropLocation);
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
  }, [pickupLocation, dropLocation, pickupDate, tripType, tripMode]);

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
    if ((tripType === 'outstation' || tripType === 'airport') && !dropLocation) valid = false;
    if (!pickupDate) valid = false;
    if (tripType === 'outstation' && tripMode === 'round-trip' && !returnDate) valid = false;
    setIsFormValid(valid);
  }, [pickupLocation, dropLocation, pickupDate, returnDate, tripType, tripMode]);

  // Add function to check if a location is Vizag Airport
  const isVizagAirport = (location: Location | null): boolean => {
    if (!location) return false;
    
    const isAirport = location.name === 'Visakhapatnam International Airport' || 
                     location.id === 'vizag_airport' ||
                     location.name.toLowerCase().includes('airport');
    
    return isAirport;
  };

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
    
    if (location.isInVizag === undefined) {
      location.isInVizag = isLocationInVizag(location);
    }
    setPickupLocation(location);
  };
  
  const handleDropLocationChange = (location: Location) => {
    // Check if location is null, undefined, or empty (cleared)
    const isLocationCleared = !location || !location.name || location.name === '';
    
    if (isLocationCleared) {
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
    
    if (location.isInVizag === undefined) {
      location.isInVizag = isLocationInVizag(location);
    }
    setDropLocation(location);
  };

  // Automatic tab switching based on distance between pickup and drop locations
  useEffect(() => {
    if (pickupLocation && dropLocation && !isTabSwitching) {
      if (pickupLocation.lat && pickupLocation.lng && dropLocation.lat && dropLocation.lng) {
        const toRad = (value: number) => (value * Math.PI) / 180;
        const R = 6371;
        const dLat = toRad(dropLocation.lat - pickupLocation.lat);
        const dLng = toRad(dropLocation.lng - pickupLocation.lng);
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(toRad(pickupLocation.lat)) *
            Math.cos(toRad(dropLocation.lat)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const calculatedDistance = R * c;
        
        if (tripType === 'outstation' && calculatedDistance <= 35) {
          setIsTabSwitching(true); // Set flag to prevent re-triggering
          // toast({
          //   title: "Trip Type Updated",
          //   description: `Distance between locations is ${calculatedDistance.toFixed(1)}km (within 35km). We've updated your trip type to Airport Transfer for better rates.`,
          //   duration: 3000,
          // });
          setTripType('airport');
          // Reset flag after a short delay
          setTimeout(() => setIsTabSwitching(false), 1000);
        } else if (tripType === 'airport' && calculatedDistance > 35) {
          setIsTabSwitching(true); // Set flag to prevent re-triggering
          // toast({
          //   title: "Trip Type Updated",
          //   description: `Distance between locations is ${calculatedDistance.toFixed(1)}km (beyond 35km). We've updated your trip type to Outstation for better rates.`,
          //   duration: 3000,
          // });
          setTripType('outstation');
          // Reset flag after a short delay
          setTimeout(() => setIsTabSwitching(false), 1000);
        }
      }
    }
  }, [pickupLocation, dropLocation, tripType, toast, isTabSwitching]);

  useEffect(() => {
    sessionStorage.setItem('tripType', tripType);
    sessionStorage.setItem('tripMode', tripMode);
    
    if (tripType === 'airport' && airportLocation) {
      // Reset airport direction label when switching to airport tab
      updateAirportDirectionLabel(pickupLocation, dropLocation);
    } else {
      // Clear airport direction label for non-airport trips
      setAirportDirectionLabel('');
      
      // Only clear airport locations when switching to local or tour tabs
      // Don't clear when switching between outstation and airport for automatic switching
      if (tripType === 'local' || tripType === 'tour') {
        // Clear drop location if it's the airport when switching away from airport tab
        if (dropLocation && shouldTreatAsAirport(dropLocation)) {
          setDropLocation(null);
          sessionStorage.removeItem('dropLocation');
        }
        
        // Clear pickup location if it's the airport when switching away from airport tab
        if (pickupLocation && shouldTreatAsAirport(pickupLocation)) {
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
  }, [pickupLocation, dropLocation]);

  // Handle airport-specific logic when locations change
  useEffect(() => {
    if (tripType === 'airport' && airportLocation) {
      // Check if user recently cleared locations to prevent automatic setting
      const userClearedDropLocation = sessionStorage.getItem('userClearedDropLocation') === 'true';
      const userClearedPickupLocation = sessionStorage.getItem('userClearedPickupLocation') === 'true';
      
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

  // Update sessionStorage when pickupDate is automatically adjusted due to 1-hour rule
  useEffect(() => {
    if (pickupDate) {
      const now = new Date();
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
      
      // If the current pickupDate is less than 1 hour from now, update it
      if (pickupDate < oneHourFromNow) {
        setPickupDate(oneHourFromNow);
      }
    }
  }, []); // Run once on mount to check and update if needed

  useEffect(() => {
    sessionStorage.setItem('hourlyPackage', hourlyPackage);
  }, [hourlyPackage]);

  useEffect(() => {
    if (tripType === 'local') {
      const selectedPackage = hourlyPackage === '8hrs-80km' ? 80 : 100;
      setDistance(selectedPackage);
      setDropLocation(null);
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

    // Check distance between pickup and drop locations before proceeding
    if (pickupLocation && dropLocation && (tripType === 'outstation' || tripType === 'airport')) {
      
      // Calculate distance using Haversine formula
      if (pickupLocation.lat && pickupLocation.lng && dropLocation.lat && dropLocation.lng) {
        const toRad = (value: number) => (value * Math.PI) / 180;
        const R = 6371; // Earth radius in km
        const dLat = toRad(dropLocation.lat - pickupLocation.lat);
        const dLng = toRad(dropLocation.lng - pickupLocation.lng);
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(toRad(pickupLocation.lat)) *
            Math.cos(toRad(dropLocation.lat)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const calculatedDistance = R * c;
        
        // If distance is within 35km and currently on outstation tab, switch to airport
        if (calculatedDistance <= 35 && tripType === 'outstation') {
          toast({
            title: "Trip Type Updated",
            description: `Distance between locations is ${calculatedDistance.toFixed(1)}km (within 35km). We've updated your trip type to Airport Transfer for better rates.`,
            duration: 4000,
          });
          setTripType('airport');
          
          // Wait a moment for the trip type change to take effect, then proceed
          setTimeout(() => {
            proceedWithSearch();
          }, 500);
          return;
        }
        
        // If distance is beyond 35km and currently on airport tab, switch to outstation
        if (calculatedDistance > 35 && tripType === 'airport') {
          toast({
            title: "Trip Type Updated",
            description: `Distance between locations is ${calculatedDistance.toFixed(1)}km (beyond 35km). We've updated your trip type to Outstation for better rates.`,
            duration: 4000,
          });
          setTripType('outstation');
          
          // Wait a moment for the trip type change to take effect, then proceed
          setTimeout(() => {
            proceedWithSearch();
          }, 500);
          return;
        }
      } else {
        // Fallback: Use isLocationInVizag function if coordinates are not available
        const isDropInVizag = isLocationInVizag(dropLocation);
        
        // If drop location is within Vizag and currently on outstation tab, switch to airport
        if (isDropInVizag && tripType === 'outstation') {
          toast({
            title: "Trip Type Updated",
            description: "Drop location is within Visakhapatnam city limits. We've updated your trip type to Airport Transfer for better rates.",
            duration: 4000,
          });
          setTripType('airport');
          
          // Wait a moment for the trip type change to take effect, then proceed
          setTimeout(() => {
            proceedWithSearch();
          }, 500);
          return;
        }
        
        // If drop location is outside Vizag and currently on airport tab, switch to outstation
        if (!isDropInVizag && tripType === 'airport') {
          toast({
            title: "Trip Type Updated",
            description: "Drop location is outside Visakhapatnam city limits. We've updated your trip type to Outstation for better rates.",
            duration: 4000,
          });
          setTripType('outstation');
          
          // Wait a moment for the trip type change to take effect, then proceed
          setTimeout(() => {
            proceedWithSearch();
          }, 500);
          return;
        }
      }
    }

    // If no distance check needed or distance check passed, proceed normally
    proceedWithSearch();
  };

  // Helper function to proceed with the search after distance checks
  function proceedWithSearch() {
    // Check if drop location is Araku Valley - redirect to tour page
    if (dropLocation && dropLocation.name) {
      const dropLocationName = dropLocation.name.toLowerCase().trim();
      const arakuKeywords = [
        'araku', 'araku valley', 'araku valley station',
        'damuku viewpoint', 'galikonda viewpoint', 'chaparai', 'chaparai waterfalls', 
'katiki waterfalls', 'coffee plantation', 'coffee estates', 'coffee museum',
'tribal museum', 'padmapuram garden', 'padmapuram gardens',
        'borra caves', 'borra guhalu', 'anjadevudu waterfalls',
        // Additional locations from the map
        'ananthagiri', 'ananthagiri water falls', 'ananthagiri adventure hill',
        'tokuru', 'rayavalasa', 'sariapalle', 'haritha jungle bells tyda',
        'patakota', 'boodi', 'kasipatnam', 'kasipatnam siva temple tree',
        'bowdara', 'devarapalle', 'baski', 'puttapadu', 'boorja',
        'ravvalaguda', 'madagada', 'pakanaguda', 'hattaguda',
        'kaala naag view point', 'tadaka', 'bondam', 'rega', 'etor',
        'aguru', 'rajupaka', 'gummakota sivalayam', 'lothug',
        'giri grama darshini', 'bethastha',
        // Common variations and misspellings
        'anantagiri', 'anantagiri', 'ananthagiri falls', 'ananthagiri waterfall',
        'borra cave', 'borra', 'caves', 'katiki', 'katiki falls',
        'coffee', 'plantation', 'estate', 'museum', 'tribal',
        'padmapuram', 'garden', 'gardens', 'viewpoint', 'view point',
        'damuku', 'galikonda', 'chaparai', 'waterfalls', 'water falls'
      ];
      
      // Check for exact matches and partial matches
      const isArakuLocation = arakuKeywords.some(keyword => {
        const match = dropLocationName.includes(keyword) || keyword.includes(dropLocationName);
        if (match) {
          console.log('Araku Valley keyword match:', keyword, 'in location:', dropLocationName);
        }
        return match;
      });
      
      if (isArakuLocation) {
        console.log('Araku Valley location detected in drop location:', dropLocationName);
        navigate('/tours/araku-valley-tour', { replace: true });
        return;
      }
    }

    // Check if pickup location is also Araku Valley - redirect to tour page
    if (pickupLocation && pickupLocation.name) {
      const pickupLocationName = pickupLocation.name.toLowerCase().trim();
      const arakuKeywords = [
        'araku', 'araku valley', 'araku valley station',
        'damuku viewpoint', 'galikonda viewpoint', 'chaparai', 'chaparai waterfalls', 
        'katiki waterfalls', 'coffee plantation', 'coffee estates', 'coffee museum',
        'tribal museum', 'padmapuram garden', 'padmapuram gardens',
        'borra caves', 'borra guhalu', 'anjadevudu waterfalls',
        // Additional locations from the map
        'ananthagiri', 'ananthagiri water falls', 'ananthagiri adventure hill',
        'tokuru', 'rayavalasa', 'sariapalle', 'haritha jungle bells tyda',
        'patakota', 'boodi', 'kasipatnam', 'kasipatnam siva temple tree',
        'bowdara', 'devarapalle', 'baski', 'puttapadu', 'boorja',
        'ravvalaguda', 'madagada', 'pakanaguda', 'hattaguda',
        'kaala naag view point', 'tadaka', 'bondam', 'rega', 'etor',
        'aguru', 'rajupaka', 'gummakota sivalayam', 'lothug',
        'giri grama darshini', 'bethastha',
        // Common variations and misspellings
        'anantagiri', 'anantagiri', 'ananthagiri falls', 'ananthagiri waterfall',
        'borra cave', 'borra', 'caves', 'katiki', 'katiki falls',
        'coffee', 'plantation', 'estate', 'museum', 'tribal',
        'padmapuram', 'garden', 'gardens', 'viewpoint', 'view point',
        'damuku', 'galikonda', 'chaparai', 'waterfalls', 'water falls'
      ];
      
      // Check for exact matches and partial matches
      const isArakuLocation = arakuKeywords.some(keyword => {
        const match = pickupLocationName.includes(keyword) || keyword.includes(pickupLocationName);
        if (match) {
          console.log('Araku Valley keyword match:', keyword, 'in location:', pickupLocationName);
        }
        return match;
      });
      
      if (isArakuLocation) {
        console.log('Araku Valley location detected in pickup location:', pickupLocationName);
        navigate('/tours/araku-valley-tour', { replace: true });
        return;
      }
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

    if (onSearch) onSearch({
      pickupLocation,
      dropLocation,
      pickupDate,
      returnDate,
      tripType,
      tripMode,
      hourlyPackage,
      selectedCab
    });
    setIsLoading(true);
    
    // If trip type is tour, navigate to the tour page with location and date params
    if (tripType === 'tour') {
      navigate('/tours', { 
        state: { 
          pickupLocation, 
          pickupDate 
        } 
      });
      return;
    }
    
    // For other trip types, continue with existing flow
    // Immediately switch to step 2 (hide banner), then finish any animations
    setCurrentStep(2);
    if (onStepChange) onStepChange(2);
    
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

  function handleDistanceCalculated(calculatedDistance: number, calculatedDuration: number) {
    // Only update distance for non-local trips
    if (tripType !== 'local') {
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
      totalPrice = calculateAirportFare(currentCab.name, distance);
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
        const days = Math.max(1, differenceInCalendarDays(returnDate || pickupDate, pickupDate) + 1);
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
  const displayDistance = tripMode === 'round-trip' ? distance * 2 : distance;
  const displayDuration = tripMode === 'round-trip' ? duration * 2 : duration;

  async function handleGuestDetailsSubmit(guestDetails: any) {
    try {
      setIsLoading(true);
      const authToken = localStorage.getItem('authToken');
      
      // Use the totalPrice passed from GuestDetailsForm
      const latestTotal = guestDetails.totalPrice;
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
        additionalRequirements: guestDetails.additionalRequirements,
        // pass GST details if captured
        gstEnabled: !!guestDetails.gstEnabled,
        gstDetails: guestDetails.gstEnabled ? {
          gstNumber: guestDetails.gstNumber,
          companyName: guestDetails.companyName,
          companyAddress: guestDetails.companyAddress,
          companyEmail: guestDetails.companyEmail,
        } : undefined,
        hourlyPackage: tripType === 'local' ? hourlyPackage : null,
        // Prevent tour bookings through Hero component - should redirect to tour pages
        tourId: tripType === 'tour' ? 'INVALID_TOUR_FROM_HERO' : undefined
      };

      const response = await bookingAPI.createBooking(bookingData);
      
      const bookingDataForStorage = {
        bookingId: response.data?.data?.id ?? response.data?.id ?? response.id ?? response.booking_id,
        bookingNumber: response.data?.data?.bookingNumber ?? response.data?.bookingNumber ?? response.bookingNumber ?? response.data?.booking_number ?? response.booking_number,
        pickupLocation,
        dropLocation,
        pickupDate: formatDateForAPI(pickupDate),
        returnDate: returnDate ? formatDateForAPI(returnDate) : null,
        selectedCab,
        distance,
        totalPrice: latestTotal,
        discountAmount: 0,
        finalPrice: latestTotal,
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
  const handleTabChange = (type: TripType) => {
    
    setTripType(type);
    setDistance(0);
    setDuration(0);
    
    // Only clear drop location if we're not in a single-tab mode (Hero widgets)
    if (!visibleTabs || visibleTabs.length > 1) {
      // Clear drop location for local and tour tabs
      if (type === 'local' || type === 'tour') {
        setDropLocation(null);
        sessionStorage.removeItem('dropLocation');
      }
      // Clear drop location when manually switching from airport to outstation
      else if (type === 'outstation' && tripType === 'airport') {
        setDropLocation(null);
        sessionStorage.removeItem('dropLocation');
      }
      // For other cases, preserve drop location for automatic switching
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

  // Test function to manually trigger automatic switching (for debugging)
  const testAutomaticSwitching = () => {
    if (pickupLocation && dropLocation) {
      const isDropInVizag = isLocationInVizag(dropLocation);
      
      if (tripType === 'outstation' && isDropInVizag) {
        setTripType('airport');
      } else if (tripType === 'airport' && !isDropInVizag) {
        setTripType('outstation');
      }
    }
  };

  useEffect(() => {
    if (isSearchActive) {
      setCurrentStep(2);
    } else {
      setCurrentStep(1);
    }
  }, [isSearchActive]);

  // Notify parent on initial step as well
  useEffect(() => {
    if (onStepChange) onStepChange(currentStep);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  // Update selectedCab when available vehicles change due to date filtering
  useEffect(() => {
    if (pickupDate && vehiclesLoaded) {
      const availableVehicles = filterAvailableVehicles(dynamicVehicles, pickupDate, returnDate || undefined);
      
      if (selectedCab) {
        const isSelectedCabAvailable = availableVehicles.some(vehicle => vehicle.id === selectedCab.id);
        
        if (!isSelectedCabAvailable && availableVehicles.length > 0) {
          // If selected cab is not available, select the first available one
          setSelectedCab(availableVehicles[0]);
        } else if (availableVehicles.length === 0) {
          // If no vehicles are available, clear selection
          setSelectedCab(null);
        }
      }
      // Don't auto-select when none selected - user must explicitly choose a vehicle
    }
  }, [pickupDate, returnDate, selectedCab, dynamicVehicles, vehiclesLoaded]);

  useEffect(() => {
    if (
      isMobile &&
      isLoaded && // Only run when Google Maps API is loaded
      (tripType === 'outstation' || tripType === 'airport') &&
      pickupLocation &&
      dropLocation
    ) {
      setIsCalculatingDistance(true);
      calculateDistanceMatrix(pickupLocation, dropLocation)
        .then(result => {
          if (result.status === 'OK') {
            setDistance(result.distance);
            setDuration(result.duration);
          }
        })
        .finally(() => setIsCalculatingDistance(false));
    }
    // Only run when these change
  }, [isMobile, isLoaded, tripType, pickupLocation, dropLocation]);

  return (
    <div className="relative">
      {/* Mobile Edit Form Overlay */}
      {isMobile && showMobileEditForm && (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMobileEditForm(false)}
              className="text-gray-600"
            >
              <X className="w-5 h-5 mr-2" />
              Cancel
            </Button>
            <h2 className="font-semibold text-lg">Edit Booking</h2>
            <div className="w-16"></div> {/* Spacer for center alignment */}
          </div>
          
                     <div className="px-2 pb-28 pt-4">
            {/* Trip Type Selector */}
            <div className="mb-1 w-full">
              <TabTripSelector
                selectedTab={ensureCustomerTripType(tripType)}
                tripMode={tripMode}
                onTabChange={handleTabChange}
                onTripModeChange={setTripMode}
                visibleTabs={visibleTabs}
                showTripModeToggle
                tripModeToggleMobileOnly
              />
            </div>

            <div key={`booking-form-${editTrigger}`} className="mb-4 rounded-2xl border border-gray-200 bg-white px-3 pb-3 pt-3 shadow-md shadow-gray-900/5">
              <div className="flex flex-col gap-3">
                <LocationInput
                  key={`pickup-mobile-${editTrigger}-${pickupLocation?.id || 'empty'}`}
                  variant="app"
                  label="From"
                  placeholder="Enter pickup location"
                  value={pickupLocation ? { ...pickupLocation } : undefined}
                  onLocationChange={handlePickupLocationChange}
                  isPickupLocation={true}
                  tripType={tripType}
                />

                {(tripType === 'outstation' || tripType === 'airport') && (
                  <LocationInput
                    key={`drop-mobile-${tripType}-${editTrigger}-${dropLocation?.id || 'empty'}`}
                    variant="app"
                    label="To"
                    placeholder="Enter drop location"
                    value={dropLocation ? { ...dropLocation } : undefined}
                    onLocationChange={handleDropLocationChange}
                    isPickupLocation={false}
                    tripType={tripType}
                  />
                )}

                <DateTimePicker
                  variant="app"
                  label="Trip start"
                  date={pickupDate}
                  onDateChange={setPickupDate}
                  minDate={getMinimumAllowedDate()}
                />

                {tripType === 'outstation' && tripMode === 'round-trip' && (
                  <DateTimePicker
                    variant="app"
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
                setCurrentStep(2);
              }}
              className="flex h-12 w-full items-center justify-center rounded-xl bg-blue-600 px-6 text-sm font-extrabold uppercase tracking-wide text-white shadow-md hover:bg-blue-700"
              disabled={!isFormValid}
            >
              Update search
            </Button>
          </div>
        </div>
      )}
      
      {/* Hero Banner Section - Only show when not in search mode */}
      {!isSearchActive && currentStep === 1 && !hideBackground && (
        <section className="hidden sm:block relative min-h-[50vh] sm:min-h-[70vh] flex items-center justify-center overflow-hidden">
        {/* Background Video/Image */}
        <div className="absolute inset-0 z-0">
      
          
          {/* Fallback Image */}
          <div 
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${isVideoLoaded ? 'opacity-0' : 'opacity-100'}`}
            style={{
              backgroundImage: "url('https://vizagtaxihub.com/uploads/banner-vth.jpg')"
            }}
          />
          
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 container mx-auto px-4 text-white">
          
        </div>
      </section>
      )}

      {/* Booking Widget Section - Mobile: positioned after banner, Desktop: centered in banner */}
      <section id="booking-widget" className={`
        ${!isSearchActive && currentStep === 1 
          ? 'relative z-20 py-1 sm:absolute sm:inset-0 sm:flex sm:items-center sm:justify-center sm:z-30 sm:py-0' 
          : 'relative z-20 py-0 sm:py-0'
        } ${((isSearchActive || hideBackground) && (currentStep === 1 || isSlidingSearch)) ? 'hero-edit-form-spacing' : ''} w-full px-0 sm:px-0 ${isSlidingSearch ? 'animate-slide-down' : ''}`}>
        <div className="w-full max-lg:px-2 sm:container sm:mx-auto sm:px-4">
          <div className="w-full sm:max-w-6xl sm:mx-auto">
            <div className={`max-lg:bg-white lg:bg-white rounded-none sm:rounded-3xl shadow-none sm:shadow-2xl border-0 sm:border sm:border-gray-100 p-3 max-lg:p-0 max-lg:py-2`}>
              
              
              {!showGuestDetailsForm ? (
                <>
                  {(currentStep === 1 || isSlidingSearch) && (
                    <div className="max-lg:space-y-1.5 space-y-6 sm:space-y-8">
                      {/* Trip Type Selector (tabs + trip mode on mobile) */}
                      <div className="w-full max-lg:mb-0 lg:mb-4">
                        <TabTripSelector
                          selectedTab={ensureCustomerTripType(tripType)}
                          tripMode={tripMode}
                          onTabChange={handleTabChange}
                          onTripModeChange={setTripMode}
                          visibleTabs={visibleTabs}
                          airportDirectionLabel={tripType === 'airport' ? airportDirectionLabel : undefined}
                          onAirportDirectionChange={tripType === 'airport' ? handleAirportDirectionChange : undefined}
                          showTripModeToggle
                          tripModeToggleMobileOnly
                        />
                      </div>

                      {/* MOBILE/TABLET: current form - hidden on desktop (lg) */}
                      <div className="lg:hidden">
                      <div
                        key={`booking-form-mobile-${editTrigger}`}
                        className="mb-4 rounded-2xl border border-gray-200 bg-white px-3 pb-3 pt-3 shadow-md shadow-gray-900/5"
                      >
                        <div className="flex flex-col gap-3">
                          <LocationInput
                            key={`pickup-${editTrigger}-${pickupLocation?.id || 'empty'}`}
                            variant="app"
                            label="From"
                            placeholder="Enter pickup location"
                            value={pickupLocation ? { ...pickupLocation } : undefined}
                            onLocationChange={handlePickupLocationChange}
                            isPickupLocation={true}
                            tripType={tripType}
                          />

                          {(tripType === 'outstation' || tripType === 'airport') && (
                            <LocationInput
                              key={`drop-${tripType}-${editTrigger}-${dropLocation?.id || 'empty'}`}
                              variant="app"
                              label="To"
                              placeholder="Enter drop location"
                              value={dropLocation ? { ...dropLocation } : undefined}
                              onLocationChange={handleDropLocationChange}
                              isPickupLocation={false}
                              tripType={tripType}
                            />
                          )}

                          {tripType === 'local' && (
                            <div className="w-full">
                              <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-blue-600 pointer-events-none">
                                Package
                              </label>
                              <div className="flex min-h-[3rem] items-center rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 shadow-sm">
                                <Select value={hourlyPackage} onValueChange={setHourlyPackage}>
                                  <SelectTrigger className="h-11 w-full border-0 bg-transparent text-[1rem] font-semibold text-gray-900 shadow-none focus:ring-0">
                                    <SelectValue placeholder="Choose hourly package" />
                                  </SelectTrigger>
                                  <SelectContent>
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
                            variant="app"
                            label="Trip start"
                            date={pickupDate}
                            onDateChange={setPickupDate}
                            minDate={getMinimumAllowedDate()}
                          />

                          {tripType === 'outstation' && tripMode === 'round-trip' && (
                            <DateTimePicker
                              variant="app"
                              label="Return trip"
                              date={returnDate}
                              onDateChange={handleReturnDateChange}
                              minDate={pickupDate}
                              disabled={!isReturnTimeEnabled}
                            />
                          )}
                        </div>

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
                          onClick={handleContinue}
                          disabled={!pickupLocation || !pickupLocation.name || isCalculatingDistance || isLoading || !isFormValid}
                          className="mt-4 flex h-11 w-full items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-extrabold uppercase tracking-wide text-white shadow-md transition-all duration-300 hover:bg-blue-700 disabled:opacity-60"
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
                              Search
                            </span>
                          )}
                        </Button>
                      </div>
                      </div>

                      {/* DESKTOP ONLY: single horizontal row (reference design) - !mt-5 overrides parent space-y */}
                      <div className="hidden lg:block !mt-5" style={{ marginTop: '20px' }}>
                        <div className="flex flex-row items-end gap-4 flex-nowrap">
                          <div className="flex-1 min-w-0">
                            <LocationInput
                              key={`pickup-desk-${editTrigger}-${pickupLocation?.id || 'empty'}`}
                              label="Pickup location"
                              placeholder="Enter a location"
                              value={pickupLocation ? { ...pickupLocation } : undefined}
                              onLocationChange={handlePickupLocationChange}
                              isPickupLocation={true}
                              tripType={tripType}
                              variant="desktop"
                            />
                          </div>
                          {(tripType === 'outstation' || tripType === 'airport') && (
                            <div className="flex-1 min-w-0">
                              <LocationInput
                                key={`drop-desk-${tripType}-${editTrigger}-${dropLocation?.id || 'empty'}`}
                                label="Drop location"
                                placeholder="Enter a location"
                                value={dropLocation ? { ...dropLocation } : undefined}
                                onLocationChange={handleDropLocationChange}
                                isPickupLocation={false}
                                tripType={tripType}
                                variant="desktop"
                              />
                            </div>
                          )}
                          {(tripType === 'outstation' || tripType === 'airport' || tripType === 'tour') && (
                            <div className="flex flex-col gap-1 flex-shrink-0">
                              <span className="text-xs text-gray-600 font-medium pointer-events-none">Trip</span>
                              <div className="flex rounded-md overflow-hidden border border-gray-200 bg-gray-100 p-0.5">
                                {tripType === 'airport' ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleAirportDirectionChange('from-airport')}
                                      className={`px-3 py-2 text-xs font-medium transition-colors flex-1 whitespace-nowrap ${airportDirectionLabel === 'From Airport' ? 'bg-blue-600 text-white rounded-md shadow-sm' : 'text-gray-700 hover:text-gray-900'}`}
                                    >
                                      From Airport
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleAirportDirectionChange('to-airport')}
                                      className={`px-3 py-2 text-xs font-medium transition-colors flex-1 whitespace-nowrap ${airportDirectionLabel === 'To Airport' ? 'bg-blue-600 text-white rounded-md shadow-sm' : 'text-gray-700 hover:text-gray-900'}`}
                                    >
                                      To Airport
                                    </button>
                                  </>
                                ) : (
                                  [{ label: 'One Way', value: 'one-way' }, { label: 'Round Trip', value: 'round-trip' }].map((option) => (
                                    <button
                                      key={option.value}
                                      type="button"
                                      onClick={() => setTripMode(option.value as 'one-way' | 'round-trip')}
                                      className={`px-3 py-2 text-sm font-medium transition-colors ${tripMode === option.value ? 'bg-blue-600 text-white rounded-md shadow-sm' : 'text-gray-700 hover:text-gray-900'}`}
                                    >
                                      {option.label}
                                    </button>
                                  ))
                                )}
                              </div>
                            </div>
                          )}
                          {tripType === 'local' && (
                            <div className="flex-1 min-w-0 flex flex-col gap-1">
                              <label className="text-xs text-gray-600 font-medium">Package</label>
                              <Select value={hourlyPackage} onValueChange={setHourlyPackage}>
                                <SelectTrigger className="h-[2.75rem] border border-gray-200 rounded-md bg-white text-sm font-bold">
                                  <SelectValue placeholder="Package" />
                                </SelectTrigger>
                                <SelectContent>
                                  {hourlyPackageOptions.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                          <div className="flex-1 min-w-0 min-w-[11rem]">
                            <DateTimePicker
                              date={pickupDate}
                              onDateChange={setPickupDate}
                              minDate={getMinimumAllowedDate()}
                              label="Departure"
                              variant="desktop"
                            />
                          </div>
                          {tripType === 'outstation' && tripMode === 'round-trip' && (
                            <div className="flex-1 min-w-0 min-w-[11rem]">
                              <DateTimePicker
                                date={returnDate}
                                onDateChange={handleReturnDateChange}
                                minDate={pickupDate}
                                label="Return"
                                disabled={!isReturnTimeEnabled}
                                variant="desktop"
                              />
                            </div>
                          )}
                          <div className="flex-shrink-0">
                            <Button
                              onClick={handleContinue}
                              disabled={!pickupLocation || !pickupLocation.name || isCalculatingDistance || isLoading || !isFormValid}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 h-[2.75rem] rounded-md text-sm font-medium flex items-center gap-2"
                            >
                              {isLoading ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                  <span>Searching...</span>
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
                        {validationError && (
                          <div className="text-red-600 text-sm mt-3 py-2">{validationError}</div>
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
                      <div className="md:hidden mb-4 mt-0">
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
                      <div className="mb-4 w-full max-w-full overflow-hidden rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                sessionStorage.removeItem('routePrefillData');
                                sessionStorage.removeItem('pickupLocation');
                                sessionStorage.removeItem('dropLocation');
                                sessionStorage.removeItem('pickupDate');
                                sessionStorage.removeItem('returnDate');
                                navigate('/');
                              }}
                              className="text-gray-700 hover:text-blue-600 focus:outline-none"
                              title="Back to home"
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
                                // Keep in step 2, don't change step
                                setShowGuestDetailsForm(false);
                              }
                              if (onEditStart) onEditStart();
                            }}
                            className="text-blue-600 hover:text-blue-700 focus:outline-none p-2 rounded-lg hover:bg-blue-50 transition-colors flex-shrink-0"
                            title="Edit booking details"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                        </div>
                         {/* Date and Time */}
                        <div className="text-xs text-gray-500 font-medium">
                          {pickupDate && (
                          <div className="text-xs text-gray-500 font-medium mb-2">
                            <span>{pickupDate.toLocaleString(undefined, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          </div>)}
                                          
                        </div>
                      </div>
                      {/* Step 2 Main Grid — extra bottom padding on mobile when vehicle chosen (sticky pay bar) */}
                      <div
                        className={`grid grid-cols-1 lg:[grid-template-columns:62%_38%] gap-8 animate-fade-in text-xs lg:text-[12px] ${
                          selectedCab ? 'pb-52 lg:pb-0' : ''
                        }`}
                      >
                        <div className="lg:col-span-1 space-y-6">
                          <div className="bg-white rounded-xl shadow-card p-2">
                            <div className="flex items-center justify-between mb-2">
                              {/* <h3 className="text-xs lg:text-[16px] font-semibold text-left">Trip Details</h3> */}
                              {/* <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => isMobile ? setShowMobileEditForm(true) : setCurrentStep(1)} 
                                className="mobile-button text-xs lg:text-[11px]"
                              >
                                Edit
                              </Button> */}
                            </div>
                            {/* Hide this section on mobile, show only on desktop/tablet */}
                            {/*
                            <div className="hidden md:block">
                              <div className="grid grid-cols-2 gap-y-1 gap-x-3">
                                <div>
                                  <p className="text-[10px] text-left">PICKUP LOCATION</p>
                                  <p className="font-medium text-left text-xs lg:text-[12px]">{pickupLocation?.name}</p>
                                </div>
                                {(tripType === 'outstation' || tripType === 'airport') && (
                                  <div>
                                    <p className="text-[10px] text-left">DROP LOCATION</p>
                                    <p className="font-medium text-left text-xs lg:text-[12px]">{dropLocation?.name}</p>
                                  </div>
                                )}
                                {tripType === 'local' && (
                                  <div>
                                    <p className="text-[10px] text-left">PACKAGE</p>
                                    <p className="font-medium text-left text-xs lg:text-[12px]">
                                      {hourlyPackageOptions.find(pkg => pkg.value === hourlyPackage)?.label}
                                    </p>
                                  </div>
                                )}
                                <div className="col-span-2 border-t pt-1 mt-1 flex justify-between">
                                  <div>
                                    <p className="text-[10px] text-left">PICKUP DATE & TIME</p>
                                    <p className="font-medium text-left text-xs lg:text-[12px]">{pickupDate?.toLocaleString()}</p>
                                  </div>
                                  {tripMode === 'round-trip' && returnDate && (
                                    <div>
                                      <p className="text-[10px] text-left">RETURN DATE & TIME</p>
                                      <p className="font-medium text-left text-xs lg:text-[12px]">{returnDate?.toLocaleString()}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            */}
                               {/* Distance and Time Info - moved below edit module */}
                        {(tripType === 'outstation' || tripType === 'airport') && distance > 0 && duration > 0 && (
                          <div className="text-xs text-gray-500 font-medium">
                            Rates for {displayDistance} Kms approx distance | {Math.round(displayDuration / 60)} hr(s) approx time
                          </div>
                        )}
                            {!isMobile && (tripType === 'outstation' || tripType === 'airport') && pickupLocation && dropLocation && (
                              <div className="mt-3 app-card">
                                <GoogleMapComponent
                                  key={`${tripType}-${pickupLocation?.name || ''}-${dropLocation?.name || ''}`}
                                  pickupLocation={pickupLocation}
                                  dropLocation={dropLocation}
                                  tripType={tripType}
                                  onDistanceCalculated={handleDistanceCalculated}
                                />
                              </div>
                            )}
                          </div>
                          <div className="text-xs lg:text-[12px]">
                            {!vehiclesLoaded ? (
                              <div className="flex items-center justify-center p-4">
                                <div className="text-gray-500">Loading vehicles...</div>
                              </div>
                            ) : (
                              <CabOptions 
                                cabTypes={filterAvailableVehicles(dynamicVehicles, pickupDate, returnDate || undefined)} 
                                selectedCab={selectedCab} 
                                onSelectCab={setSelectedCab} 
                                distance={distance} 
                                tripType={tripType} 
                                tripMode={tripMode}
                                hourlyPackage={hourlyPackage}
                                pickupDate={pickupDate}
                                returnDate={returnDate}
                                isCalculatingFares={false}
                              />
                            )}
                          </div>
                        </div>
                        <div className="lg:col-span-1 text-xs lg:text-[14px] lg:pr-6 max-w-md mobile-nav-fix">
                          <div ref={bookingSummaryRef} id="booking-summary" className="text-xs lg:text-[12px]">
                            <BookingSummary 
                              pickupLocation={pickupLocation!} 
                              dropLocation={dropLocation} 
                              pickupDate={pickupDate} 
                              returnDate={returnDate} 
                              selectedCab={selectedCab} 
                              distance={distance} 
                              tripType={tripType} 
                              tripMode={tripMode} 
                              totalPrice={totalPrice}
                              hourlyPackage={hourlyPackage}
                              onFinalTotalChange={setFinalTotal}
                              onEditPickupLocation={handleEditPickupLocation}
                              onEditPickupDate={handleEditPickupDate}
                              hideInclusionsExclusions={true}
                            />
                          </div>
                          {selectedCab && finalTotal > 0 && (
                            <div className="mt-3 hidden lg:block">
                              <BookingPaymentFooter
                                finalTotal={finalTotal}
                                mode={bookingPaymentMode}
                                onModeChange={persistBookingPaymentMode}
                                onBookNow={handleBookNow}
                                isLoading={isLoading}
                                disabled={!isFormValid || !selectedCab}
                              />
                            </div>
                          )}
                        </div>
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
                      
                      <GuestDetailsForm 
                        onSubmit={handleGuestDetailsSubmit}
                        totalPrice={finalTotal}
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
                      pickupDate={pickupDate}
                      returnDate={returnDate}
                      selectedCab={selectedCab}
                      distance={distance}
                      totalPrice={totalPrice}
                      tripType={tripType}
                      tripMode={tripMode}
                      hourlyPackage={hourlyPackage}
                      onFinalTotalChange={setFinalTotal}
                      onEditPickupLocation={handleEditPickupLocation}
                      onEditPickupDate={handleEditPickupDate}
                      hideInclusionsExclusions={false}
                    />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
      
      {/* Slide-up Booking Summary Modal - Mobile Only */}
      {showBookingSummaryModal && (
        <div className="fixed inset-0 z-50 md:hidden">
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
                  pickupDate={pickupDate}
                  returnDate={returnDate}
                  selectedCab={selectedCab}
                  distance={distance}
                  totalPrice={totalPrice}
                  tripType={tripType}
                  tripMode={tripMode}
                  hourlyPackage={hourlyPackage}
                  onFinalTotalChange={setFinalTotal}
                  onEditPickupLocation={handleEditPickupLocation}
                  onEditPickupDate={handleEditPickupDate}
                  hideInclusionsExclusions={false}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile: Part / Full pay + Book Now — fixed above bottom nav once a vehicle is selected */}
      {currentStep === 2 &&
        !showGuestDetailsForm &&
        !isSlidingSearch &&
        selectedCab &&
        finalTotal > 0 && (
          <div className="fixed inset-x-0 bottom-0 z-40 max-md:bottom-16 lg:hidden">
            <div className="border-t border-gray-200 bg-white px-3 pt-3 pb-2 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] mobile-safe-bottom">
              <BookingPaymentFooter
                finalTotal={finalTotal}
                mode={bookingPaymentMode}
                onModeChange={persistBookingPaymentMode}
                onBookNow={handleBookNow}
                isLoading={isLoading}
                disabled={!isFormValid || !selectedCab}
              />
            </div>
          </div>
        )}
      
      {/* Mobile Navigation Bar */}
      <MobileNavigation />
    </div>
  );
}

<style>
{`
.package-select-lg-margin { margin-top: 0; }
@media (min-width: 1024px) { .package-select-lg-margin { margin-top: -18.5px; } }
`}
</style>