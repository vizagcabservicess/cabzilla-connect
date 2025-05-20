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
import { ChevronRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { addDays, differenceInCalendarDays } from 'date-fns';
import { TabTripSelector } from './TabTripSelector';
import GoogleMapComponent from './GoogleMapComponent';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { GuestDetailsForm } from './GuestDetailsForm';
import { useNavigate } from 'react-router-dom';
import { bookingAPI } from '@/services/api';
import { BookingRequest } from '@/types/api';
import { MobileNavigation } from './MobileNavigation';

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

export function Hero() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const bookingSummaryRef = useRef<HTMLDivElement>(null);
  
  const loadFromSessionStorage = () => {
    try {
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
        selectedCab: cabData ? JSON.parse(cabData) as CabType : null
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
        selectedCab: null
      };
    }
  };
  
  const savedData = loadFromSessionStorage();
  
  const [pickupLocation, setPickupLocation] = useState<Location | null>(savedData.pickupLocation);
  const [dropLocation, setDropLocation] = useState<Location | null>(savedData.dropLocation);
  const [pickupDate, setPickupDate] = useState<Date>(savedData.pickupDate);
  const [returnDate, setReturnDate] = useState<Date | null>(savedData.returnDate);
  const [selectedCab, setSelectedCab] = useState<CabType | null>(savedData.selectedCab || (cabTypes.length > 0 ? cabTypes[0] : null));
  const [distance, setDistance] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isFormValid, setIsFormValid] = useState<boolean>(false);
  const [tripType, setTripType] = useState<TripType>(savedData.tripType);
  const [tripMode, setTripMode] = useState<TripMode>(savedData.tripMode);
  const [hourlyPackage, setHourlyPackage] = useState<string>(savedData.hourlyPackage);
  const [showGuestDetailsForm, setShowGuestDetailsForm] = useState<boolean>(false);
  const [isCalculatingDistance, setIsCalculatingDistance] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

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
  
  const handleDropLocationChange = (location: Location | null) => {
    // Allow clearing the drop location
    if (!location) {
      setDropLocation(null);
      // Re-evaluate trip type logic when drop location is cleared
      if (tripType === 'airport' || tripType === 'outstation') {
        // If pickup is in Vizag, allow switching to Airport tab
        if (pickupLocation && isLocationInVizag(pickupLocation)) {
          setTripType('airport');
        }
      }
      return;
    }
    // Make sure isInVizag is determined if not already set
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
      if (!pickupLocation) {
        const defaultLocation = vizagLocations.find(loc => loc.id.includes('vizag'));
        if (defaultLocation) {
          setPickupLocation(defaultLocation);
          sessionStorage.setItem('pickupLocation', JSON.stringify(defaultLocation));
        }
      }
      // For local trips, we don't need drop location
      setDropLocation(null);
      sessionStorage.removeItem('dropLocation');
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
    
    setIsLoading(true);
    
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
      
      const bookingData: BookingRequest = {
        pickupLocation: pickupLocation?.address || pickupLocation?.name || '',
        dropLocation: dropLocation?.address || dropLocation?.name || '',
        pickupDate: pickupDate?.toISOString() || '',
        returnDate: returnDate?.toISOString() || null,
        cabType: selectedCab?.name || '',
        distance: distance,
        tripType: tripType,
        tripMode: tripMode,
        totalAmount: totalPrice,
        passengerName: guestDetails.name,
        passengerPhone: guestDetails.phone,
        passengerEmail: guestDetails.email,
        hourlyPackage: tripType === 'local' ? hourlyPackage : null
      };

      const bookingDataForStorage = {
        pickupLocation,
        dropLocation,
        pickupDate: pickupDate?.toISOString(),
        returnDate: returnDate?.toISOString(),
        selectedCab,
        distance,
        totalPrice,
        discountAmount: 0,
        finalPrice: totalPrice,
        guestDetails,
        tripType,
        tripMode,
      };
      sessionStorage.setItem('bookingDetails', JSON.stringify(bookingDataForStorage));

      const response = await bookingAPI.createBooking(bookingData);
      
      console.log('Booking created:', response);
      
      toast({
        title: "Booking Confirmed!",
        description: "Your cab has been booked successfully",
        duration: 3000,
      });
      
      navigate("/booking-confirmation");
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
    setTripType(type);
    setDistance(0);
    setDuration(0);
    // Always clear drop location for Local and Tour
    if (type === 'local' || type === 'tour') {
      setDropLocation(null);
    }
    // For airport, clear drop location if pickup is not in Vizag
    if (type === 'airport') {
      if (!pickupLocation || !isLocationInVizag(pickupLocation)) {
        setDropLocation(null);
      }
    }
  };

  return (
    <section className="relative min-h-screen bg-gradient-to-b from-gray-50 to-white py-8">
      <div className="container mx-auto px-4">
        <div className={`text-center mb-8 transition-all duration-300 ${currentStep > 1 ? 'md:text-left' : ''}`}>
          {currentStep > 1 && (
            <button 
              onClick={() => setCurrentStep(1)} 
              className="flex items-center text-blue-600 mb-2 md:hidden animate-fade-in"
            >
              <ArrowLeft size={16} className="mr-1" />
              <span>Back</span>
            </button>
          )}
          <h5 className={`text-cabBlue-600 font-semibold text-sm uppercase tracking-wider mb-3 animate-slide-in ${currentStep > 1 ? 'md:hidden' : ''}`}>
            Book a Cab in Minutes
          </h5>
          <h1 className={`text-3xl md:text-4xl font-bold text-cabGray-800 mb-4 animate-slide-in ${currentStep > 1 ? 'text-2xl md:text-3xl' : ''}`}>
            {currentStep === 1 ? 'Your Journey, Our Priority' : 'Complete Your Booking'}
          </h1>
        </div>

        {!showGuestDetailsForm ? (
          <>
            {currentStep === 1 && (
              <div className="bg-white rounded-xl shadow-card border p-6 md:p-8 animate-fade-in">
                <TabTripSelector
                  selectedTab={ensureCustomerTripType(tripType)}
                  tripMode={tripMode}
                  onTabChange={handleTabChange}
                  onTripModeChange={setTripMode}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  <LocationInput
                    label="PICKUP LOCATION"
                    placeholder="Enter pickup location"
                    value={pickupLocation ? convertToApiLocation(pickupLocation) : undefined}
                    onLocationChange={handlePickupLocationChange}
                    isPickupLocation={true}
                    isAirportTransfer={tripType === 'airport'}
                  />
                  
                  {(tripType === 'outstation' || tripType === 'airport') && (
                    <LocationInput
                      label="DROP LOCATION"
                      placeholder="Enter drop location"
                      value={dropLocation ? convertToApiLocation(dropLocation) : undefined}
                      onLocationChange={handleDropLocationChange}
                      isPickupLocation={false}
                      isAirportTransfer={tripType === 'airport'}
                    />
                  )}
                  
                  {tripType === 'local' && (
                    <div className="space-y-2">
                      <Label>HOURLY PACKAGE</Label>
                      <Select
                        value={hourlyPackage}
                        onValueChange={setHourlyPackage}
                      >
                        <SelectTrigger className="w-full mobile-input">
                          <SelectValue placeholder="Select package" />
                        </SelectTrigger>
                        <SelectContent>
                          {hourlyPackageOptions.map((pkg) => (
                            <SelectItem key={pkg.value} value={pkg.value}>
                              {pkg.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  <DateTimePicker
                    label="PICKUP DATE & TIME"
                    date={pickupDate}
                    onDateChange={setPickupDate}
                    minDate={new Date()}
                  />

                  {tripType === 'outstation' && tripMode === 'round-trip' && (
                    <DateTimePicker
                      label="RETURN DATE & TIME"
                      date={returnDate}
                      onDateChange={setReturnDate}
                      minDate={pickupDate}
                    />
                  )}
                </div>

                {isCalculatingDistance && (
                  <div className="mt-6 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-3"></div>
                    <p className="text-gray-600">Calculating route distance...</p>
                  </div>
                )}

                <div className="mt-8 flex justify-end">
                  <Button
                    onClick={handleContinue}
                    disabled={!isFormValid || isCalculatingDistance || !pickupLocation || !(pickupLocation.name || pickupLocation.address) || isLoading}
                    className={`px-10 py-6 rounded-md mobile-button ${
                      isFormValid && !isCalculatingDistance && pickupLocation && (pickupLocation.name || pickupLocation.address) && !isLoading
                        ? ""
                        : "opacity-70 cursor-not-allowed"
                    }`}
                  >
                    {isLoading ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        <span>SEARCHING</span>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <span>SEARCH</span> <ChevronRight className="ml-1" />
                      </div>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8 animate-fade-in">
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white rounded-xl shadow-card p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-semibold text-left">Trip Details</h3>
                      <Button variant="outline" size="sm" onClick={() => setCurrentStep(1)} className="mobile-button">
                        Edit
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                      <div>
                        <p className="text-xs text-left">PICKUP LOCATION</p>
                        <p className="font-medium text-left">{pickupLocation?.name}</p>
                      </div>
                      {(tripType === 'outstation' || tripType === 'airport') && (
                        <div>
                          <p className="text-xs text-left">DROP LOCATION</p>
                          <p className="font-medium text-left">{dropLocation?.name}</p>
                        </div>
                      )}
                      {tripType === 'local' && (
                        <div>
                          <p className="text-xs text-left">PACKAGE</p>
                          <p className="font-medium text-left">
                            {hourlyPackageOptions.find(pkg => pkg.value === hourlyPackage)?.label}
                          </p>
                        </div>
                      )}
                      <div className="col-span-2 border-t pt-3 mt-2 flex justify-between">
                        <div>
                          <p className="text-xs text-left">PICKUP DATE & TIME</p>
                          <p className="font-medium text-left">{pickupDate?.toLocaleString()}</p>
                        </div>
                        {tripMode === 'round-trip' && returnDate && (
                          <div>
                            <p className="text-xs text-left">RETURN DATE & TIME</p>
                            <p className="font-medium text-left">{returnDate?.toLocaleString()}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {(tripType === 'outstation' || tripType === 'airport') && pickupLocation && dropLocation && (
                      <div className="mt-6 app-card">
                        <GoogleMapComponent
                          key={`${tripType}-${pickupLocation?.name || ''}-${dropLocation?.name || ''}`}
                          pickupLocation={pickupLocation}
                          dropLocation={dropLocation}
                          tripType={tripType}
                          onDistanceCalculated={handleDistanceCalculated}
                        />
                      </div>
                    )}
                    
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
                <div className="lg:col-span-1">
                  <div ref={bookingSummaryRef} id="booking-summary">
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
                    />
                  </div>
                  
                  <Button 
                    onClick={handleBookNow}
                    className="w-full mt-4 py-6 text-base mobile-button"
                    disabled={!isFormValid || !selectedCab || isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        <span>Processing...</span>
                      </div>
                    ) : "Book Now"}
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="grid md:grid-cols-2 gap-6 animate-fade-in">
            <div>
              <div className="bg-white rounded-xl shadow-card border p-6 mb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold">Complete Your Booking</h3>
                </div>
                
                <GuestDetailsForm 
                  onSubmit={handleGuestDetailsSubmit}
                  totalPrice={totalPrice}
                  onBack={handleBackToSelection}
                  isLoading={isLoading}
                />
              </div>
            </div>
            
            <div>
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
              />
            </div>
          </div>
        )}
      </div>
      
      {/* Mobile Navigation Bar */}
      <MobileNavigation />
    </section>
  );
}
