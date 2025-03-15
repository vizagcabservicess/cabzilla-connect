
import { useState, useEffect } from 'react';
import { LocationInput } from './LocationInput';
import { DateTimePicker } from './DateTimePicker';
import { CabOptions } from './CabOptions';
import { BookingSummary } from './BookingSummary';
import { Location, getDistanceBetweenLocations, locationData } from '@/lib/locationData';
import { CabType, cabTypes, TripMode, TripType } from '@/lib/cabData';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { addDays, differenceInCalendarDays } from 'date-fns';
import { TabTripSelector } from './TabTripSelector';
import GoogleMapComponent from './GoogleMapComponent';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

// Available hourly packages
const hourlyPackages = [
  { value: "4hr_40km", label: "4 Hours / 40 KM" },
  { value: "8hr_80km", label: "8 Hours / 80 KM" },
  { value: "12hr_120km", label: "12 Hours / 120 KM" }
];

export function Hero() {
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
  const [hourlyPackage, setHourlyPackage] = useState<string>(hourlyPackages[0].value);
  
  // Airport location (Visakhapatnam Airport)
  const airportLocation = locationData.find(loc => loc.id === 'vizag_airport');

  // Set valid pickup locations based on trip type
  const validPickupLocations = tripType === 'airport' && tripMode === 'from_airport' 
    ? locationData.filter(loc => loc.id === 'vizag_airport')
    : locationData;

  // Set valid drop locations based on trip type
  const validDropLocations = tripType === 'airport' && tripMode === 'to_airport'
    ? locationData.filter(loc => loc.id === 'vizag_airport')
    : locationData;

  // Handle trip type change
  useEffect(() => {
    // Reset locations when trip type changes
    setPickupLocation(null);
    setDropLocation(null);
    
    // Set airport as pickup/drop based on trip mode for airport transfers
    if (tripType === 'airport') {
      if (tripMode === 'to_airport') {
        setDropLocation(airportLocation || null);
      } else if (tripMode === 'from_airport') {
        setPickupLocation(airportLocation || null);
      }
    }
    
    // For local trips, we don't need drop location
    if (tripType === 'local') {
      // Default to first location in Vizag
      const defaultLocation = locationData.find(loc => loc.id.includes('vizag'));
      setPickupLocation(defaultLocation || null);
      setDropLocation(null);
    }
  }, [tripType, tripMode]);

  // Calculate distance when locations change
  useEffect(() => {
    if (tripType === 'local') {
      // For local trips, distance depends on the package
      const packageDistance = hourlyPackage === '4hr_40km' ? 40 : 
                             hourlyPackage === '8hr_80km' ? 80 : 120;
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
    
    // Outstation trip pricing
    if (tripType === 'outstation') {
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
    // Airport transfer pricing
    else if (tripType === 'airport') {
      // Fixed rates for airport transfers
      switch (selectedCab.name.toLowerCase()) {
        case "sedan":
          totalPrice = 799;
          break;
        case "ertiga":
          totalPrice = 999;
          break;
        case "innova crysta":
          totalPrice = 1299;
          break;
      }
    }
    // Local trip pricing
    else if (tripType === 'local') {
      // Different rates based on hourly package and cab type
      if (hourlyPackage === '4hr_40km') {
        switch (selectedCab.name.toLowerCase()) {
          case "sedan":
            totalPrice = 1099;
            break;
          case "ertiga":
            totalPrice = 1399;
            break;
          case "innova crysta":
            totalPrice = 1699;
            break;
        }
      } else if (hourlyPackage === '8hr_80km') {
        switch (selectedCab.name.toLowerCase()) {
          case "sedan":
            totalPrice = 1999;
            break;
          case "ertiga":
            totalPrice = 2499;
            break;
          case "innova crysta":
            totalPrice = 2999;
            break;
        }
      } else if (hourlyPackage === '12hr_120km') {
        switch (selectedCab.name.toLowerCase()) {
          case "sedan":
            totalPrice = 2999;
            break;
          case "ertiga":
            totalPrice = 3499;
            break;
          case "innova crysta":
            totalPrice = 3999;
            break;
        }
      }
    }
    
    return totalPrice;
  };

  const totalPrice = calculatePrice();

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
                locations={validPickupLocations}
                disabled={tripType === 'airport' && tripMode === 'from_airport'}
              />
              
              {(tripType === 'outstation' || tripType === 'airport') && (
                <LocationInput
                  label="DROP LOCATION"
                  placeholder="Enter drop location"
                  value={dropLocation}
                  onChange={setDropLocation}
                  locations={validDropLocations}
                  disabled={tripType === 'airport' && tripMode === 'to_airport'}
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
                      {hourlyPackages.map((pkg) => (
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
                        {hourlyPackages.find(pkg => pkg.value === hourlyPackage)?.label}
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
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
