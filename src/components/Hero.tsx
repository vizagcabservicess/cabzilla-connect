
import { useState, useEffect } from 'react';
import { LocationInput } from './LocationInput';
import { DateTimePicker } from './DateTimePicker';
import { CabOptions } from './CabOptions';
import { BookingSummary } from './BookingSummary';
import { Location, getDistanceBetweenLocations, vizagLocations, apDestinations, calculateAirportFare } from '@/lib/locationData';
import { CabType, cabTypes, TripMode, TripType, hourlyPackages, getLocalPackagePrice } from '@/lib/cabData';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { addDays, differenceInCalendarDays } from 'date-fns';
import { TabTripSelector } from './TabTripSelector';
import GoogleMapComponent from './GoogleMapComponent';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { GuestDetailsForm } from './GuestDetailsForm';

// Available hourly packages with updated pricing structure
const hourlyPackageOptions = [
  { value: "8hrs-80km", label: "8 Hours / 80 KM" },
  { value: "10hrs-100km", label: "10 Hours / 100 KM" }
];

// Airport location (Visakhapatnam Airport)
const airportLocation = vizagLocations.find(loc => loc.type === 'airport');

export function Hero() {
  const { toast } = useToast();
  
  const [pickupLocation, setPickupLocation] = useState<Location | null>(null);
  const [dropLocation, setDropLocation] = useState<Location | null>(null);
  const [pickupDate, setPickupDate] = useState<Date>(addDays(new Date(), 1));
  const [returnDate, setReturnDate] = useState<Date | null>(null);
  const [selectedCab, setSelectedCab] = useState<CabType | null>(null);
  const [distance, setDistance] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isFormValid, setIsFormValid] = useState<boolean>(false);
  const [tripType, setTripType] = useState<TripType>('outstation');
  const [tripMode, setTripMode] = useState<TripMode>('one-way');
  const [hourlyPackage, setHourlyPackage] = useState<string>(hourlyPackageOptions[0].value);
  const [showGuestDetailsForm, setShowGuestDetailsForm] = useState<boolean>(false);
  
  // Define airport transfer specific modes
  const isToAirport = tripType === 'airport' && tripMode === 'one-way';
  const isFromAirport = tripType === 'airport' && tripMode === 'round-trip';

  // Handle trip type change
  useEffect(() => {
    // Reset locations when trip type changes
    setPickupLocation(null);
    setDropLocation(null);
    
    // Set airport as pickup/drop based on trip mode for airport transfers
    if (tripType === 'airport') {
      if (isToAirport) {
        setDropLocation(airportLocation || null);
      } else if (isFromAirport) {
        setPickupLocation(airportLocation || null);
      }
    }
    
    // For local trips, we don't need drop location
    if (tripType === 'local') {
      // Default to first location in Vizag
      const defaultLocation = vizagLocations.find(loc => loc.id.includes('vizag'));
      setPickupLocation(defaultLocation || null);
      setDropLocation(null);
    }
  }, [tripType, tripMode, isToAirport, isFromAirport]);

  // Calculate distance when locations change
  useEffect(() => {
    if (tripType === 'local') {
      // For local trips, distance depends on the package
      const packageDistance = hourlyPackage === '8hrs-80km' ? 80 : 100;
      setDistance(packageDistance);
    } else if (pickupLocation && dropLocation) {
      // Use Google Maps for distance calculation
      // The actual distance will be set by the GoogleMapComponent callback
      const staticDistance = getDistanceBetweenLocations(pickupLocation.id, dropLocation.id);
      setDistance(staticDistance); // This will be overridden by the actual distance from Google Maps
    } else {
      setDistance(0);
    }
  }, [pickupLocation, dropLocation, tripType, hourlyPackage]);

  // Update form validity
  useEffect(() => {
    if (tripType === 'local' && pickupLocation && pickupDate) {
      setIsFormValid(true);
    } else if (tripType === 'outstation' && pickupLocation && dropLocation && pickupDate) {
      if (tripMode === "round-trip" && !returnDate) {
        setIsFormValid(false);
      } else {
        setIsFormValid(true);
      }
    } else if (tripType === 'airport' && pickupLocation && dropLocation && pickupDate) {
      setIsFormValid(true);
    } else {
      setIsFormValid(false);
    }
    
    if (!selectedCab && cabTypes.length > 0) {
      setSelectedCab(cabTypes[0]);
    }
  }, [pickupLocation, dropLocation, pickupDate, returnDate, tripMode, tripType, selectedCab]);

  const handleContinue = () => {
    if (currentStep === 1 && isFormValid) {
      setCurrentStep(2);
    }
  };

  // Handle distance calculation from Google Maps
  const handleDistanceCalculated = (calculatedDistance: number, calculatedDuration: number) => {
    console.log(`Distance from Google Maps: ${calculatedDistance}km, Duration: ${calculatedDuration}min`);
    setDistance(calculatedDistance);
    setDuration(calculatedDuration);
  };

  // Calculate price based on trip type, cab, and distance
  const calculatePrice = () => {
    if (!selectedCab) return 0;
    
    let totalPrice = 0;
    
    // Airport transfer pricing
    if (tripType === 'airport') {
      totalPrice = calculateAirportFare(selectedCab.name, distance);
    }
    // Local trip pricing with updated structure
    else if (tripType === 'local') {
      totalPrice = getLocalPackagePrice(hourlyPackage, selectedCab.name);
      
      // Add cost for extra kilometers if applicable
      const packageKm = hourlyPackage === '8hrs-80km' ? 80 : 100;
      if (distance > packageKm) {
        const extraKm = distance - packageKm;
        const extraKmRate = selectedCab.pricePerKm;
        totalPrice += extraKm * extraKmRate;
      }
    }
    // Outstation trip pricing
    else if (tripType === 'outstation') {
      // Get pricing factors based on cab type
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
      }
      
      if (tripMode === 'round-trip' && returnDate) {
        const days = Math.max(1, differenceInCalendarDays(returnDate, pickupDate) + 1);
        const totalMinKm = days * 300;
        const extraKm = Math.max(distance - totalMinKm, 0);
        const totalBaseFare = days * basePrice;
        const totalDistanceFare = extraKm * perKmRate;
        const totalDriverAllowance = days * driverAllowance;
        const totalNightHalt = (days - 1) * nightHaltCharge;
        
        totalPrice = totalBaseFare + totalDistanceFare + totalDriverAllowance + totalNightHalt;
      } else { // one-way
        const extraKm = Math.max(distance - 300, 0);
        const distanceFare = extraKm * perKmRate;
        
        totalPrice = basePrice + distanceFare + driverAllowance;
      }
    }
    
    return totalPrice;
  };

  const totalPrice = calculatePrice();

  // Handle booking now button click
  const handleBookNow = () => {
    if (!isFormValid || !selectedCab) {
      toast({
        title: "Missing information",
        description: "Please complete all required fields",
        variant: "destructive"
      });
      return;
    }
    
    setShowGuestDetailsForm(true);
  };
  
  // Handle guest details submission
  const handleGuestDetailsSubmit = (guestDetails: any) => {
    // Create booking data
    const bookingData = {
      pickupLocation,
      dropLocation,
      pickupDate: pickupDate?.toISOString(),
      returnDate: returnDate?.toISOString(),
      selectedCab,
      distance,
      totalPrice,
      guestDetails,
      tripType,
      tripMode,
    };

    // Store booking details in session storage
    sessionStorage.setItem('bookingDetails', JSON.stringify(bookingData));
    
    // Show success message
    toast({
      title: "Booking Confirmed!",
      description: "Your cab has been booked successfully",
    });
    
    // Reset the form
    setCurrentStep(1);
    setShowGuestDetailsForm(false);
    setPickupLocation(null);
    setDropLocation(null);
    setPickupDate(addDays(new Date(), 1));
    setReturnDate(null);
    setSelectedCab(cabTypes[0]);
  };

  return (
    <section className="min-h-screen bg-gradient-to-b from-cabBlue-50 to-white py-16 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h5 className="text-cabBlue-600 font-semibold text-sm uppercase tracking-wider mb-3">
            Book a Cab in Minutes
          </h5>
          <h1 className="text-4xl md:text-5xl font-bold text-cabGray-800 mb-4">
            Your Journey, Our Priority
          </h1>
        </div>

        {!showGuestDetailsForm ? (
          <>
            {currentStep === 1 && (
              <div className="bg-white rounded-xl shadow-card border p-8">
                <TabTripSelector
                  selectedTab={tripType}
                  tripMode={tripMode}
                  onTabChange={setTripType}
                  onTripModeChange={setTripMode}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  <LocationInput
                    label="PICKUP LOCATION"
                    placeholder="Enter pickup location"
                    value={pickupLocation}
                    onChange={setPickupLocation}
                    readOnly={isFromAirport}
                    isPickupLocation={true}
                    isAirportTransfer={tripType === 'airport'}
                  />
                  
                  {(tripType === 'outstation' || tripType === 'airport') && (
                    <LocationInput
                      label="DROP LOCATION"
                      placeholder="Enter drop location"
                      value={dropLocation}
                      onChange={setDropLocation}
                      readOnly={isToAirport}
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
                        <SelectTrigger className="w-full">
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

                <div className="mt-8 flex justify-end">
                  <Button
                    onClick={handleContinue}
                    disabled={!isFormValid}
                    className={`px-10 py-6 rounded-md ${
                      isFormValid
                        ? "bg-blue-500 text-white"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    SEARCH <ChevronRight className="ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white rounded-xl shadow-card p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-semibold">Trip Details</h3>
                      <Button variant="outline" size="sm" onClick={() => setCurrentStep(1)}>
                        Edit
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                      <div>
                        <p className="text-xs">PICKUP LOCATION</p>
                        <p className="font-medium">{pickupLocation?.name}</p>
                      </div>
                      {(tripType === 'outstation' || tripType === 'airport') && (
                        <div>
                          <p className="text-xs">DROP LOCATION</p>
                          <p className="font-medium">{dropLocation?.name}</p>
                        </div>
                      )}
                      {tripType === 'local' && (
                        <div>
                          <p className="text-xs">PACKAGE</p>
                          <p className="font-medium">
                            {hourlyPackageOptions.find(pkg => pkg.value === hourlyPackage)?.label}
                          </p>
                        </div>
                      )}
                      <div className="col-span-2 border-t pt-3 mt-2 flex justify-between">
                        <div>
                          <p className="text-xs">PICKUP DATE & TIME</p>
                          <p className="font-medium">{pickupDate?.toLocaleString()}</p>
                        </div>
                        {(tripType === 'outstation' || tripType === 'airport') && (
                          <div>
                            <p className="text-xs">ESTIMATED DISTANCE</p>
                            <p className="font-medium">{distance} km</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Display the map only for outstation and airport trips */}
                    {(tripType === 'outstation' || tripType === 'airport') && pickupLocation && dropLocation && (
                      <div className="mt-6">
                        <GoogleMapComponent
                          pickupLocation={pickupLocation}
                          dropLocation={dropLocation}
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
                    />
                  </div>
                </div>
                <div className="lg:col-span-1">
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
                  />
                  
                  <Button 
                    onClick={handleBookNow}
                    className="w-full mt-4 py-6 text-base"
                    disabled={!isFormValid || !selectedCab}
                  >
                    Book Now
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <GuestDetailsForm 
                onSubmit={handleGuestDetailsSubmit}
                totalPrice={totalPrice}
              />
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
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
