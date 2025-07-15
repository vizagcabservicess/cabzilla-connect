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
import { cabTypes, formatPrice } from '@/lib/cabData';
import { hourlyPackages, getLocalPackagePrice } from '@/lib/packageData';
import { TripType, TripMode, ensureCustomerTripType } from '@/lib/tripTypes';
import { CabType } from '@/types/cab';
import { ChevronRight, ArrowLeft, ArrowRight, X, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { addDays, differenceInCalendarDays } from 'date-fns';
import { TabTripSelector } from './TabTripSelector';
import GoogleMapComponent from './GoogleMapComponent';
import { useIsMobile } from '@/hooks/use-mobile';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { GuestDetailsForm } from './GuestDetailsForm';
import { useNavigate } from 'react-router-dom';
import { bookingAPI } from '@/services/api';
import { BookingRequest } from '@/types/api';
import { MobileNavigation } from './MobileNavigation';
import { calculateDistanceMatrix } from '@/lib/distanceService';
import { QuickActionBar } from './QuickActionBar';
import { useGoogleMaps } from '@/providers/GoogleMapsProvider';

const hourlyPackageOptions = [
  { value: "8hrs-80km", label: "8 Hours / 80 KM" },
  { value: "10hrs-100km", label: "10 Hours / 100 KM" }
];

const airportLocation = vizagLocations.find(loc => loc.type === 'airport');

function areBothLocationsInVizag(location1?: Location | null, location2?: Location | null): boolean {
  return !!(location1 && location2 && 
    isLocationInVizag(location1) && 
    isLocationInVizag(location2));
}

export function Hero({ onSearch, isSearchActive }: { onSearch?: (searchData: any) => void; isSearchActive?: boolean }) {
  console.log('Hero component rendered');
  const { toast } = useToast();
  const navigate = useNavigate();
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
          pickupDate: new Date(),
          returnDate: null,
          tripType: prefillData.tripType || 'outstation',
          tripMode: prefillData.tripMode || 'one-way',
          hourlyPackage: hourlyPackageOptions[0].value,
          selectedCab: null,
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
      
      return {
        pickupLocation: pickupData ? JSON.parse(pickupData) as Location : null,
        dropLocation: dropData ? JSON.parse(dropData) as Location : null,
        pickupDate: pickupDateStr ? new Date(JSON.parse(pickupDateStr)) : new Date(),
        returnDate: returnDateStr ? new Date(JSON.parse(returnDateStr)) : null,
        tripType: tripTypeData as TripType || 'outstation',
        tripMode: tripModeData as TripMode || 'one-way',
        hourlyPackage: hourlyPkgData || hourlyPackageOptions[0].value,
        selectedCab: cabData ? JSON.parse(cabData) as CabType : null,
        autoTriggerSearch: false
      };
    } catch (error) {
      console.error("Error loading data from session storage:", error);
      return {
        pickupLocation: null,
        dropLocation: null,
        pickupDate: new Date(),
        returnDate: null,
        tripType: 'outstation' as TripType,
        tripMode: 'one-way' as TripMode,
        hourlyPackage: hourlyPackageOptions[0].value,
        selectedCab: null,
        autoTriggerSearch: false
      };
    }
  };
  
  const savedData = loadFromSessionStorage();
  
  const [pickupLocation, setPickupLocation] = useState<Location | null>(savedData.pickupLocation);
  const [dropLocation, setDropLocation] = useState<Location | null>(savedData.dropLocation);
  const [pickupDate, setPickupDate] = useState<Date>(savedData.pickupDate);
  const [returnDate, setReturnDate] = useState<Date | null>(savedData.returnDate);
  const [selectedCab, setSelectedCabState] = useState<CabType | null>(savedData.selectedCab || (cabTypes.length > 0 ? cabTypes[0] : null));
  const [distance, setDistance] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [currentStep, setCurrentStep] = useState<number>(isSearchActive ? 2 : 1);
  const [isFormValid, setIsFormValid] = useState<boolean>(false);
  const [tripType, setTripType] = useState<TripType>(savedData.tripType);
  const [tripMode, setTripMode] = useState<TripMode>(savedData.tripMode);
  const [hourlyPackage, setHourlyPackage] = useState<string>(savedData.hourlyPackage);
  const [showGuestDetailsForm, setShowGuestDetailsForm] = useState<boolean>(false);
  const [isCalculatingDistance, setIsCalculatingDistance] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [finalTotal, setFinalTotal] = useState<number>(0);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [minTravelHours, setMinTravelHours] = useState<number>(0);
  const [isCheckingTravelTime, setIsCheckingTravelTime] = useState<boolean>(false);
  const [isReturnTimeEnabled, setIsReturnTimeEnabled] = useState<boolean>(false);
  const [minValidReturnTime, setMinValidReturnTime] = useState<Date | null>(null);
  const [isVideoLoaded, setIsVideoLoaded] = useState<boolean>(false);
  const [showMobileEditForm, setShowMobileEditForm] = useState<boolean>(false);
  const [isPackageFocused, setIsPackageFocused] = useState<boolean>(false);
  const [isDesktop, setIsDesktop] = useState(typeof window !== 'undefined' ? window.innerWidth >= 1024 : false);

  useEffect(() => {
    function handleResize() {
      setIsDesktop(window.innerWidth >= 1024);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  console.log('PREFILL:', { pickupLocation, dropLocation });

  // Listen for route prefill events
  useEffect(() => {
    const handleRoutePrefill = (event: CustomEvent) => {
      const { pickupLocation: pickup, dropLocation: drop, tripType: type, tripMode: mode } = event.detail;
      setPickupLocation(pickup);
      setDropLocation(drop);
      setTripType(type);
      setTripMode(mode);
      setPickupDate(new Date());
      
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

  // Always keep pickupDate enabled and default to now on mount/refresh
  useEffect(() => {
    if (!savedData.autoTriggerSearch) {
      setPickupDate(new Date());
    }
  }, []);

  // Reset/disable returnDate and errors when locations change
  useEffect(() => {
    if (tripType === 'outstation' && tripMode === 'round-trip') {
      setPickupDate(new Date());
      setReturnDate(null);
      setIsReturnTimeEnabled(false);
      setMinValidReturnTime(null);
      setValidationError(null);
    }
  }, []);

  // Only call travel time API and set returnDate when both locations are filled
  useEffect(() => {
    if (
      tripType === 'outstation' &&
      tripMode === 'round-trip'
    ) {
      // If either location is missing, disable and clear returnDate, do not call API
      if (!pickupLocation || !dropLocation) {
        setIsReturnTimeEnabled(false);
        setReturnDate(null);
        setMinValidReturnTime(null);
        setValidationError(null);
        setIsCheckingTravelTime(false);
        return;
      }
      // Both locations are filled, call API and set returnDate
      setIsCheckingTravelTime(true);
      (async () => {
        try {
          const result = await calculateDistanceMatrix(pickupLocation, dropLocation);
          if (result.status === 'OK') {
            const minMinutes = result.duration + 30;
            const minReturn = new Date(pickupDate.getTime() + minMinutes * 60 * 1000);
            setIsReturnTimeEnabled(true);
            setMinValidReturnTime(minReturn);
            // Always prefill returnDate with minReturn on every change
            setReturnDate(minReturn);
            setValidationError(null);
          } else {
            setIsReturnTimeEnabled(false);
            setMinValidReturnTime(null);
            setReturnDate(null);
            setValidationError('Could not validate travel time. Please try again.');
          }
        } catch (err) {
          setIsReturnTimeEnabled(false);
          setMinValidReturnTime(null);
          setReturnDate(null);
          setValidationError('Could not validate travel time. Please try again.');
        } finally {
          setIsCheckingTravelTime(false);
        }
      })();
    }
  // Only depend on pickupLocation, dropLocation, pickupDate, tripType, tripMode
  }, [pickupLocation, dropLocation, pickupDate, tripType, tripMode]);

  // Validate returnDate when user manually edits it
  useEffect(() => {
    if (
      tripType === 'outstation' &&
      tripMode === 'round-trip' &&
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

  const handlePickupLocationChange = (location: Location) => {
    if (!location) return; // Safety check
    
    // Make sure isInVizag is determined if not already set
    if (location.isInVizag === undefined) {
      location.isInVizag = isLocationInVizag(location);
    }
    
    console.log("Pickup location changed:", location);
    setPickupLocation(location);
  };
  
  const handleDropLocationChange = (location: Location) => {
    if (!location || !location.name) {
      setDropLocation(undefined);
      return;
    }
    if (location.isInVizag === undefined) {
      location.isInVizag = isLocationInVizag(location);
    }
    setDropLocation(location);
  };

  useEffect(() => {
    if (pickupLocation && dropLocation && tripType === 'outstation') {
      if (areBothLocationsInVizag(pickupLocation, dropLocation)) {
        toast({
          title: "Trip Type Updated",
          description: "Since both locations are within Visakhapatnam, we've updated your trip type to Airport Transfer.",
          duration: 3000,
        });
        setTripType('airport');
      }
    } else if (tripType === 'airport' && pickupLocation && dropLocation) {
      const isPickupInVizag = isLocationInVizag(pickupLocation);
      const isDropoffInVizag = isLocationInVizag(dropLocation);
      
      if (!isPickupInVizag || !isDropoffInVizag) {
        console.log("Locations not within Vizag city limits. Switching to outstation mode.");
        toast({
          title: "Trip Type Updated",
          description: "One of your locations is outside Vizag city limits. We've updated your trip type to Outstation.",
          duration: 3000,
        });
        setTripType('outstation');
        setTripMode('one-way');
      }
    }
  }, [pickupLocation, dropLocation, tripType, toast]);

  useEffect(() => {
    sessionStorage.setItem('tripType', tripType);
    sessionStorage.setItem('tripMode', tripMode);
    
    if (tripType === 'airport' && airportLocation) {
      // No automatic reset for airport transfers
      // We'll let user choose source/destination
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
    }
    if (dropLocation) {
      sessionStorage.setItem('dropLocation', JSON.stringify(dropLocation));
    }
  }, [pickupLocation, dropLocation]);

  useEffect(() => {
    if (pickupDate) {
      sessionStorage.setItem('pickupDate', JSON.stringify(pickupDate));
    }
    if (returnDate) {
      sessionStorage.setItem('returnDate', JSON.stringify(returnDate));
    } else {
      sessionStorage.removeItem('returnDate');
    }
  }, [pickupDate, returnDate]);

  useEffect(() => {
    sessionStorage.setItem('hourlyPackage', hourlyPackage);
  }, [hourlyPackage]);

  useEffect(() => {
    if (tripType === 'local') {
      // For local trips, reset the distance to match the selected package
      const selectedPackage = hourlyPackage === '8hrs-80km' ? 80 : 100;
      setDistance(selectedPackage);
      
      // Reset dropLocation for local trips
      setDropLocation(null);
      
      console.log(`Resetting distance for local trip to ${selectedPackage}km`);
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

    // Check if drop location is Araku Valley - redirect to tour page
    if (dropLocation && dropLocation.name) {
      const dropLocationName = dropLocation.name.toLowerCase().trim();
      const arakuKeywords = ['araku', 'araku valley', 'araku valley station','damuku viewpoint', 'galikonda viewpoint', 'chaparai', 'chaparai waterfalls', 
  'katiki waterfalls', 'coffee plantation', 'coffee estates', 'coffee museum',
  'tribal museum', 'padmapuram garden', 'padmapuram gardens',
  'borra caves', 'borra guhalu', 'anjadevudu waterfalls'];
      
      if (arakuKeywords.some(keyword => dropLocationName.includes(keyword))) {
        navigate('/tours/araku', { replace: true });
        return;
      }
    }
       // Check if drop location is Araku Valley - redirect to tour page
       if (dropLocation && dropLocation.name) {
        const dropLocationName = dropLocation.name.toLowerCase().trim();
        const arakuKeywords = ['lambasingi','kothapalli','Lambasingi Hill Top view'];
        
        if (arakuKeywords.some(keyword => dropLocationName.includes(keyword))) {
          navigate('/tours/lambasingi', { replace: true });
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
    setTimeout(() => {
      setCurrentStep(2);
      setIsLoading(false);
    }, 500); // Add a slight delay for animation effect
  };

  function handleDistanceCalculated(calculatedDistance: number, calculatedDuration: number) {
    // Only update distance for non-local trips
    if (tripType !== 'local') {
      setDistance(calculatedDistance);
      setDuration(calculatedDuration);
      setIsCalculatingDistance(false);
      console.log(`Distance calculated for ${tripType}: ${calculatedDistance}km, ${calculatedDuration} minutes`);
    }
  };

  function calculatePrice() {
    if (!selectedCab) return 0;
    
    let totalPrice = 0;
    
    if (tripType === 'airport') {
      totalPrice = calculateAirportFare(selectedCab.name, distance);
    } else if (tripType === 'local') {
      // For local trips, use only the package price (no driver allowance or extras)
      totalPrice = getLocalPackagePrice(hourlyPackage, selectedCab.name);
      // Only add extra distance if it's specifically calculated for local trips
      // and is greater than the package limit
      const packageKm = hourlyPackage === '8hrs-80km' ? 80 : 100;
      if (distance > packageKm && tripType === 'local') {
        const extraKm = distance - packageKm;
        const extraKmRate = selectedCab.pricePerKm;
        totalPrice += extraKm * extraKmRate;
        console.log(`Local package ${hourlyPackage}: Base ${packageKm}km, Extra ${extraKm}km at rate ${extraKmRate}`);
      }
    } else if (tripType === 'outstation') {
      let basePrice = 0, perKmRate = 0, driverAllowance = 250, nightHaltCharge = 0;
      
      switch (selectedCab.name.toLowerCase()) {
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
          basePrice = selectedCab.price;
          perKmRate = selectedCab.pricePerKm;
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

  async function handleGuestDetailsSubmit(guestDetails: any) {
    try {
      setIsLoading(true);
      const authToken = localStorage.getItem('authToken');
      console.log("Auth token available:", !!authToken);
      
      // Use the totalPrice passed from GuestDetailsForm
      const latestTotal = guestDetails.totalPrice;
      const bookingData: BookingRequest = {
        pickupLocation: pickupLocation?.address || pickupLocation?.name || '',
        dropLocation: dropLocation?.address || dropLocation?.name || '',
        pickupDate: pickupDate?.toISOString() || '',
        returnDate: returnDate?.toISOString() || null,
        cabType: selectedCab?.name || '',
        vehicleType: selectedCab?.name || '',
        distance: distance,
        tripType: tripType,
        tripMode: tripMode,
        totalAmount: latestTotal,
        passengerName: guestDetails.name,
        passengerPhone: guestDetails.phone,
        passengerEmail: guestDetails.email,
        hourlyPackage: tripType === 'local' ? hourlyPackage : null
      };

      const response = await bookingAPI.createBooking(bookingData);
      
      console.log('Booking created:', response);
      
      const bookingDataForStorage = {
        bookingId: response.id || response.booking_id,
        pickupLocation,
        dropLocation,
        pickupDate: pickupDate?.toISOString(),
        returnDate: returnDate?.toISOString(),
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
    
    setShowGuestDetailsForm(true);
    
    setTimeout(() => {
      const contactSection = document.querySelector('form');
      if (contactSection) {
        contactSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  function handleBackToSelection() {
    setShowGuestDetailsForm(false);
    setCurrentStep(2);
  };

  // Custom handler for tab (trip type) changes
  const handleTabChange = (type: TripType) => {
    console.log('Tab changed to:', type);
    setTripType(type);
    setDistance(0);
    setDuration(0);
    // Always clear drop location for Local and Tour
    if (type === 'local' || type === 'tour') {
      console.log('Clearing dropLocation due to tab change to:', type);
      setDropLocation(null);
    }
    // For airport, clear drop location if pickup is not in Vizag
    if (type === 'airport') {
      if (!pickupLocation || !isLocationInVizag(pickupLocation)) {
        console.log('Clearing dropLocation due to airport tab and pickup not in Vizag');
        setDropLocation(null);
      }
    }
  };

  // Add a wrapper to setSelectedCab that also scrolls to summary
  const setSelectedCab = (cab: CabType) => {
    setSelectedCabState(cab);
    setTimeout(() => {
      if (bookingSummaryRef.current) {
        bookingSummaryRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  useEffect(() => {
    if (isSearchActive) {
      setCurrentStep(2);
    } else {
      setCurrentStep(1);
    }
  }, [isSearchActive]);

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
    <div className="relative bg-[#f2f2f8]">
      {/* Mobile Edit Form Overlay */}
      {isMobile && showMobileEditForm && (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
          <div className=" top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
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
          
          <div className="p-4">
           
            
            {/* Trip Type Selector */}
            <div className="w-full mb-6">
              <TabTripSelector
                selectedTab={ensureCustomerTripType(tripType)}
                tripMode={tripMode}
                onTabChange={handleTabChange}
                onTripModeChange={setTripMode}
              />
            </div>

            {/* Main Booking Container */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-0 mb-6">
              <div className="flex flex-col items-stretch gap-0">
                {/* From Location */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 p-4">
                    {/* Removed icon and 'Enter' text */}
                    <div className="flex-1 min-w-0">
                      <LocationInput
                        key="pickup-mobile"
                        label="Pickup location"
                        placeholder=" Pickup location"
                        value={pickupLocation ? { ...pickupLocation } : undefined}
                        onLocationChange={handlePickupLocationChange}
                        isPickupLocation={true}
                        isAirportTransfer={tripType === 'airport'}
                        className="border-0 bg-transparent p-0 text-[1rem] lg:text-[1.2rem] font-semibold text-gray-900 placeholder:text-gray-400 focus:ring-0"
                      />
                    </div>
                  </div>
                </div>

                {/* To Location */}
                {(tripType === 'outstation' || tripType === 'airport') && (
                  <div className="flex-1 min-w-0 border-t border-gray-200">
                    <div className="flex items-center gap-2 p-4">
                      {/* Removed icon and 'Enter' text */}
                      <div className="flex-1 min-w-0">
                        <LocationInput
                          key="drop-mobile"
                          label="Drop location"
                          placeholder="Enter Drop location"
                          value={dropLocation ? { ...dropLocation } : undefined}
                          onLocationChange={handleDropLocationChange}
                          isPickupLocation={false}
                          isAirportTransfer={tripType === 'airport'}
                          className="border-0 bg-transparent p-0 text-[1rem] lg:text-[1.2rem] font-semibold text-gray-900 placeholder:text-gray-400 focus:ring-0"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Date Picker */}
                <div className="flex-1 min-w-0 border-t border-gray-200">
                  <div className="flex items-center gap-2 p-4">
                    <div className="flex-1 min-w-0">
                      <DateTimePicker
                        date={pickupDate}
                        onDateChange={setPickupDate}
                        minDate={new Date()}
                        className="h-auto border-0 bg-transparent p-0 text-[1rem] lg:text-[1.2rem] font-semibold text-gray-900 focus:ring-0"
                      />
                    </div>
                  </div>
                </div>

                {/* Return Date for Round Trip */}
                {tripType === 'outstation' && tripMode === 'round-trip' && (
                  <div className="flex-1 min-w-0 border-t border-gray-200">
                    <div className="flex items-center gap-2 p-4">
                      <div className="flex-1 min-w-0">
                        <DateTimePicker
                          date={returnDate}
                          onDateChange={setReturnDate}
                          minDate={pickupDate}
                          disabled={!isReturnTimeEnabled || isCheckingTravelTime}
                          className="h-auto border-0 bg-transparent p-0 text-[1rem] lg:text-[1.2rem] font-semibold text-gray-900 focus:ring-0"
                          label="Return date of journey"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Update Button */}
            <div className="flex justify-center">
              <Button
                onClick={() => {
                  setShowMobileEditForm(false);
                  setCurrentStep(2);
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg rounded-xl"
                disabled={!isFormValid}
              >
                Update Search
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Hero Banner Section - Only show when not in search mode */}
      {!isSearchActive && currentStep === 1 && (
        <section className="hidden sm:block relative min-h-[50vh] sm:min-h-[70vh] flex items-center justify-center overflow-hidden">
        {/* Background Video/Image */}
        <div className="absolute inset-0 z-0">
      
          
          {/* Fallback Image */}
          <div 
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${isVideoLoaded ? 'opacity-0' : 'opacity-100'}`}
            style={{
              backgroundImage: "url('https://vizagup.com/uploads/banner-vth.png')"
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
          : 'relative z-20 py-1 sm:pb-12 sm:pt-4'
        } w-full px-0 sm:px-0`}>
        <div className="w-full sm:container sm:mx-auto px-0 sm:px-4">
          <div className="w-full sm:max-w-6xl sm:mx-auto">
            <div className="bg-white rounded-none sm:rounded-3xl shadow-none sm:shadow-2xl border-0 sm:border sm:border-gray-100 p-3 sm:p-8">
              
              
              {!showGuestDetailsForm ? (
                <>
                  {currentStep === 1 && (
                    <div className="space-y-6 sm:space-y-8">
                      {/* Trip Type Selector */}
                      <div className="w-full mb-6">
                        <TabTripSelector
                          selectedTab={ensureCustomerTripType(tripType)}
                          tripMode={tripMode}
                          onTabChange={handleTabChange}
                          onTripModeChange={setTripMode}
                        />
                      </div>

                      {/* Main Booking Container - Bus booking style */}
                      <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-0 mb-6">
                        <div className="flex flex-col lg:flex-row items-stretch gap-0">
                          {/* From Location */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 p-4">
                              {/* Removed icon and 'Enter' text */}
                              <div className="flex-1 min-w-0">
                                <LocationInput
                                  key="pickup"
                                  label="Pickup location"
                                  placeholder="Enter Pickup location"
                                  value={pickupLocation ? { ...pickupLocation } : undefined}
                                  onLocationChange={handlePickupLocationChange}
                                  isPickupLocation={true}
                                  isAirportTransfer={tripType === 'airport'}
                                  className="border-0 bg-transparent p-0 text-[1rem] lg:text-[1.2rem] font-semibold text-gray-900 placeholder:text-gray-400 focus:ring-0"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Vertical Divider */}
                          {(tripType === 'outstation' || tripType === 'airport') && (
                            <div className="hidden lg:block w-px bg-gray-200 mx-2"></div>
                          )}

                          {/* To Location */}
                          {(tripType === 'outstation' || tripType === 'airport') && (
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 p-4">
                                {/* Removed icon and 'Enter' text */}
                                <div className="flex-1 min-w-0">
                                  <LocationInput
                                    key={dropLocation?.id || dropLocation?.name || 'drop'}
                                    label="Drop location"
                                    placeholder="Enter Drop location"
                                    value={dropLocation ? { ...dropLocation } : ""}
                                    onLocationChange={handleDropLocationChange}
                                    isPickupLocation={false}
                                    isAirportTransfer={tripType === 'airport'}
                                    className="border-0 bg-transparent p-0 text-[1rem] lg:text-[1.2rem] font-semibold text-gray-900 placeholder:text-gray-400 focus:ring-0"
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Package Selection for Local */}
                          {tripType === 'local' && (
                            <>
                              <div className="hidden lg:block w-px bg-gray-200 mx-2"></div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center relative w-full h-full p-4">
                                  {(isPackageFocused || hourlyPackage) && (
                                    <label
                                      className="absolute left-4 text-xs bg-white px-1 text-blue-600 z-10 pointer-events-none transition-all duration-200 font-semibold"
                                      style={{
                                        background: 'white',
                                        paddingLeft: '0.5rem',
                                        paddingRight: '0.25rem',
                                        zIndex: 10,
                                        top: '0.6rem', // Fine-tuned for alignment
                                        marginLeft: '0.75rem',
                                      }}
                                    >
                                      Package
                                    </label>
                                  )}
                                  <Select value={hourlyPackage} onValueChange={setHourlyPackage}>
                                    <SelectTrigger
                                      className="h-[3.5rem] pl-4 text-[1rem] lg:text-[1.2rem] flex items-center border border-gray-300 bg-white font-semibold"
                                      style={{
                                        alignItems: 'center',
                                        paddingTop: 0,
                                        paddingBottom: 0,
                                        lineHeight: '1.2',
                                        marginTop: isDesktop ? '-18.5px' : '0px',
                                      }}
                                      onFocus={() => setIsPackageFocused(true)}
                                      onBlur={() => setIsPackageFocused(false)}
                                    >
                                      <SelectValue placeholder="Package" />
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
                            </>
                          )}

                          {/* Vertical Divider */}
                          <div className="hidden lg:block w-px bg-gray-200 mx-2"></div>

                          {/* Date Picker */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 p-4">
                             
                              <div className="flex-1 min-w-0">
                                <DateTimePicker
                                  date={pickupDate}
                                  onDateChange={setPickupDate}
                                  minDate={new Date()}
                                  className="h-auto border-0 bg-transparent p-0 text-[1rem] lg:text-[1.2rem] font-semibold text-gray-900 focus:ring-0"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Return Date for Round Trip */}
                          {tripType === 'outstation' && tripMode === 'round-trip' && (
                            <>
                              <div className="hidden lg:block w-px bg-gray-200 mx-2"></div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 p-4">
                                  
                                  <div className="flex-1 min-w-0">
                                    <DateTimePicker
                                      date={returnDate}
                                      onDateChange={setReturnDate}
                                      minDate={pickupDate}
                                      disabled={!isReturnTimeEnabled || isCheckingTravelTime}
                                      className="h-auto border-0 bg-transparent p-0 text-[1rem] lg:text-[1.2rem] font-semibold text-gray-900 focus:ring-0"
                                    />
                                  </div>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                        
                        {/* Error Message */}
                        {validationError && (
                          <div className="text-red-600 text-sm mt-3 px-4 py-2 bg-red-50 rounded-lg">{validationError}</div>
                        )}
                      </div>

                     {/* Loading State */}
                     {isCalculatingDistance && (
                       <div className="flex items-center justify-center py-4">
                         <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-3"></div>
                         <p className="text-gray-600 font-medium">Calculating route distance...</p>
                       </div>
                     )}

                      {/* Search Button - Bus booking style */}
                      <div className="flex justify-center mt-6">
                        <Button
                          onClick={handleContinue}
                          disabled={!pickupLocation || !pickupLocation.name || isCalculatingDistance || isLoading || !isFormValid}
                          className="w-full sm:w-[300px] bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 text-base font-semibold rounded-full shadow-lg flex items-center justify-center transition-all duration-300 mb-6"
                          style={{ minHeight: '40px' }}
                        >
                          {isLoading ? (
                            <div className="flex items-center">
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                              <span>Searching...</span>
                            </div>
                          ) : (
                            <div className="flex items-center">
                              <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                              </svg>
                              Search Cabs
                            </div>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Step 2 - Cab Selection */}
                  {currentStep === 2 && (
                    <>
                      {/* Trip Summary Bar */}
                      <div className="mb-4 bg-[#f8faf5] border border-[#e0e7d9] rounded-xl w-full max-w-full overflow-hidden flex flex-col sm:flex-row flex-wrap items-start sm:items-center justify-between px-4 pr-12 py-3 shadow-sm">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 w-full min-w-0 overflow-hidden">
                            <button onClick={() => setCurrentStep(1)} className="text-gray-700 hover:text-blue-600 focus:outline-none mr-1">
                              <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div className="relative flex items-center w-full min-w-0 overflow-hidden">
                              <span className="font-bold text-sm sm:text-base text-gray-900 truncate overflow-hidden whitespace-nowrap flex-1 min-w-0 block">
                                {pickupLocation?.name || 'Pickup'}
                                {pickupLocation && dropLocation && (
                                  <>
                                    <ChevronRight className="inline w-4 h-4 mx-1 text-gray-400" />
                                    <span className="truncate max-w-[calc(100%-2.5rem)] align-middle inline-block">{dropLocation?.name || 'Drop'}</span>
                                  </>
                                )}
                              </span>
                              <button
                                onClick={() => isMobile ? setShowMobileEditForm(true) : setCurrentStep(1)}
                                className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-500 hover:text-blue-600 focus:outline-none w-8 h-8 flex items-center justify-center"
                                style={{ background: 'white' }} // for debug, remove later
                              >
                                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-edit"><path d="M11 4H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                              </button>
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 font-medium mb-2">
                            {pickupDate && (
                              <span>{pickupDate.toLocaleString(undefined, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                            )}
                          </div>
                        </div>
                        
                      </div>
                      {/* Step 2 Main Grid */}
                      <div className="grid grid-cols-1 lg:[grid-template-columns:65%_35%] gap-6 animate-fade-in text-xs lg:text-[12px]">
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
                            <CabOptions 
                              cabTypes={cabTypes} 
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
                          </div>
                        </div>
                        <div className="lg:col-span-1 text-xs lg:text-[14px]">
                          <div ref={bookingSummaryRef} id="booking-summary" className="text-xs lg:text-[12px]">
                            <BookingSummary 
                              pickupLocation={pickupLocation!} 
                              dropLocation={dropLocation} 
                              pickupDate={pickupDate} 
                              returnDate={returnDate} 
                              selectedCab={selectedCab!} 
                              distance={distance} 
                              tripType={tripType} 
                              tripMode={tripMode} 
                              totalPrice={totalPrice}
                              hourlyPackage={hourlyPackage}
                              onFinalTotalChange={setFinalTotal}
                            />
                          </div>
                          <Button 
                            onClick={handleBookNow}
                            className="w-full mt-2 py-3 text-base mobile-button text-xs lg:text-[16px]"
                            disabled={!isFormValid || !selectedCab || isLoading}
                          >
                            {isLoading ? (
                              <div className="flex items-center justify-center">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                <span>Processing...</span>
                              </div>
                            ) : `Book Now - ${formatPrice(finalTotal)}`}
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in w-full px-2 sm:px-0">
                  {/* Guest Details Form - Centered on mobile, normal on md+ */}
                  <div className="w-full flex justify-center md:block">
                    <div className="bg-white rounded-xl md:shadow-card md:border md:p-6 mb-4 w-full max-w-md md:max-w-full p-0 shadow-none border-none">
                      <div className="flex items-center justify-between mb-4">
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
                  
                  <div className="w-full">
                    <BookingSummary
                      pickupLocation={pickupLocation!}
                      dropLocation={dropLocation}
                      pickupDate={pickupDate}
                      returnDate={returnDate}
                      selectedCab={selectedCab!}
                      distance={distance}
                      totalPrice={totalPrice}
                      tripType={tripType}
                      tripMode={tripMode}
                      hourlyPackage={hourlyPackage}
                      onFinalTotalChange={setFinalTotal}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
      {/* Mobile Navigation Bar */}
      <MobileNavigation />
      <QuickActionBar />
    </div>
  );
}

<style>
{`
.package-select-lg-margin { margin-top: 0; }
@media (min-width: 1024px) { .package-select-lg-margin { margin-top: -18.5px; } }
`}
</style>
