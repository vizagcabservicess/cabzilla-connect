import { useState, useEffect, useRef } from 'react';
import { LocationInput } from './LocationInput';
import { DateTimePicker } from './DateTimePicker';
import { CabOptions } from './CabOptions';
import { BookingSummary } from './BookingSummary';
import { 
  isVizagLocation, 
  areBothLocationsInVizag, 
  vizagLocations, 
  apDestinations, 
  calculateAirportFare,
  Location
} from '@/lib/locationData';
import { CabType, cabTypes, TripMode, TripType, hourlyPackages, getLocalPackagePrice } from '@/lib/cabData';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { addDays, differenceInCalendarDays, isSameDay } from 'date-fns';
import { TabTripSelector } from './TabTripSelector';
import GoogleMapComponent from './GoogleMapComponent';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { GuestDetailsForm } from './GuestDetailsForm';
import { useNavigate } from 'react-router-dom';

const hourlyPackageOptions = [
  { value: "8hrs-80km", label: "8 Hours / 80 KM" },
  { value: "10hrs-100km", label: "10 Hours / 100 KM" }
];

const airportLocation = vizagLocations.find(loc => loc.type === 'airport');

export function Hero() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const bookingSummaryRef = useRef<HTMLDivElement>(null);
  
  const loadFromSessionStorage = () => {
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
      pickupDate: pickupDateStr ? new Date(pickupDateStr) : addDays(new Date(), 1),
      returnDate: returnDateStr ? new Date(returnDateStr) : null,
      tripType: tripTypeData as TripType || 'outstation',
      tripMode: tripModeData as TripMode || 'one-way',
      hourlyPackage: hourlyPkgData || hourlyPackageOptions[0].value,
      selectedCab: cabData ? JSON.parse(cabData) as CabType : null
    };
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
    }
  }, [pickupLocation, dropLocation, tripType, toast]);

  useEffect(() => {
    sessionStorage.setItem('tripType', tripType);
    sessionStorage.setItem('tripMode', tripMode);
    
    if (tripType === 'airport' && airportLocation) {
    }
    
    if (tripType === 'local') {
      if (!pickupLocation) {
        const defaultLocation = vizagLocations.find(loc => loc.id.includes('vizag'));
        if (defaultLocation) {
          setPickupLocation(defaultLocation);
          sessionStorage.setItem('pickupLocation', JSON.stringify(defaultLocation));
        }
      }
      setDropLocation(null);
      sessionStorage.removeItem('dropLocation');
    }
  }, [tripType, tripMode, pickupLocation]);

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
      sessionStorage.setItem('pickupDate', pickupDate.toISOString());
    }
    if (returnDate) {
      sessionStorage.setItem('returnDate', returnDate.toISOString());
    } else {
      sessionStorage.removeItem('returnDate');
    }
  }, [pickupDate, returnDate]);

  useEffect(() => {
    sessionStorage.setItem('hourlyPackage', hourlyPackage);
  }, [hourlyPackage]);

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
  }, [pickupLocation, dropLocation, pickupDate, returnDate, tripMode, tripType]);

  const handleContinue = () => {
    if (!isFormValid) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields before continuing.",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }
    
    if (currentStep === 1) {
      setCurrentStep(2);
    }
  };

  const handleDistanceCalculated = (calculatedDistance: number, calculatedDuration: number) => {
    setDistance(calculatedDistance);
    setDuration(calculatedDuration);
    setIsCalculatingDistance(false);
  };

  const calculatePrice = () => {
    if (!selectedCab) return 0;
    
    let totalPrice = 0;
    
    if (tripType === 'airport') {
      totalPrice = calculateAirportFare(selectedCab.name, distance);
    } else if (tripType === 'local') {
      totalPrice = getLocalPackagePrice(hourlyPackage, selectedCab.name);
      
      const packageKm = hourlyPackage === '8hrs-80km' ? 80 : 100;
      if (distance > packageKm) {
        const extraKm = distance - packageKm;
        const extraKmRate = selectedCab.pricePerKm;
        totalPrice += extraKm * extraKmRate;
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
        const effectiveDistance = distance;
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

  const totalPrice = calculatePrice();

  const handleGuestDetailsSubmit = (guestDetails: any) => {
    const bookingData = {
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

    sessionStorage.setItem('bookingDetails', JSON.stringify(bookingData));
    
    toast({
      title: "Booking Confirmed!",
      description: "Your cab has been booked successfully",
      duration: 3000,
    });
    
    navigate("/booking-confirmation");
  };

  const handleBookNow = () => {
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

  const handleBackToSelection = () => {
    setShowGuestDetailsForm(false);
    setCurrentStep(2);
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
                    isPickupLocation={true}
                    isAirportTransfer={tripType === 'airport'}
                  />
                  
                  {(tripType === 'outstation' || tripType === 'airport') && (
                    <LocationInput
                      label="DROP LOCATION"
                      placeholder="Enter drop location"
                      value={dropLocation}
                      onChange={setDropLocation}
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

                {isCalculatingDistance && (
                  <div className="mt-6 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-3"></div>
                    <p className="text-gray-600">Calculating route distance...</p>
                  </div>
                )}

                <div className="mt-8 flex justify-end">
                  <Button
                    onClick={handleContinue}
                    disabled={!isFormValid || isCalculatingDistance}
                    className={`px-10 py-6 rounded-md ${
                      isFormValid && !isCalculatingDistance
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
                        {tripMode === 'round-trip' && returnDate && (
                          <div>
                            <p className="text-xs">RETURN DATE & TIME</p>
                            <p className="font-medium">{returnDate?.toLocaleString()}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
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
                      pickupDate={pickupDate}
                      returnDate={returnDate}
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
                    />
                  </div>
                  
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
              <div className="bg-white rounded-xl shadow-card border p-6 mb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold">Complete Your Booking</h3>
                </div>
                
                <GuestDetailsForm 
                  onSubmit={handleGuestDetailsSubmit}
                  totalPrice={totalPrice}
                  onBack={handleBackToSelection}
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
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
