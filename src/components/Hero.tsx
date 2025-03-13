import { useState, useEffect } from 'react';
import { LocationInput } from './LocationInput';
import { DateTimePicker } from './DateTimePicker';
import { CabOptions } from './CabOptions';
import { BookingSummary } from './BookingSummary';
import { Location, getDistanceBetweenLocations } from '@/lib/locationData';
import { CabType, cabTypes, TripMode, LocalTripPurpose, hourlyPackages, TripType } from '@/lib/cabData';
import { ChevronRight, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { addDays } from 'date-fns';
import { TripModeSelector } from './TripModeSelector';
import { LocalTripSelector } from './LocalTripSelector';
import { TabTripSelector } from './TabTripSelector';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export function Hero() {
  const [pickupLocation, setPickupLocation] = useState<Location | null>(null);
  const [dropLocation, setDropLocation] = useState<Location | null>(null);
  const [pickupDate, setPickupDate] = useState<Date | undefined>(addDays(new Date(), 1));
  const [selectedCab, setSelectedCab] = useState<CabType | null>(null);
  const [distance, setDistance] = useState<number>(0);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isFormValid, setIsFormValid] = useState<boolean>(false);
  const [tripType, setTripType] = useState<TripType>('outstation');
  const [tripMode, setTripMode] = useState<TripMode>('one-way');
  const [tripPurpose, setTripPurpose] = useState<LocalTripPurpose>('business');
  const [hourlyPackage, setHourlyPackage] = useState(hourlyPackages[0].id);
  
  // Validate form when any input changes
  useEffect(() => {
    if (
      pickupLocation && 
      ((tripType !== 'local' && dropLocation) || tripType === 'local') && 
      pickupDate
    ) {
      setIsFormValid(true);
      
      // Calculate distance between locations
      if (tripType === 'local') {
        // For local trips, use the hourly package kilometers
        const selectedPackage = hourlyPackages.find(pkg => pkg.id === hourlyPackage);
        if (selectedPackage) {
          setDistance(selectedPackage.kilometers);
        }
      } else if (pickupLocation && dropLocation) {
        const calculatedDistance = getDistanceBetweenLocations(
          pickupLocation.id,
          dropLocation.id
        );
        setDistance(calculatedDistance);
      }
      
      // Auto-select the first cab option if none selected
      if (!selectedCab && cabTypes.length > 0) {
        setSelectedCab(cabTypes[0]);
      }
    } else {
      setIsFormValid(false);
    }
  }, [pickupLocation, dropLocation, pickupDate, selectedCab, tripType, hourlyPackage]);
  
  const handleContinue = () => {
    if (currentStep === 1 && isFormValid) {
      setCurrentStep(2);
    }
  };
  
  const handleTripTypeChange = (type: TripType) => {
    setTripType(type);
    
    // Reset values
    if (type === 'local') {
      setDropLocation(null);
      setHourlyPackage(hourlyPackages[0].id);
    }
  };
  
  const totalPrice = selectedCab 
    ? selectedCab.price + (distance * selectedCab.pricePerKm) 
    : 0;
  
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-16 pb-16 bg-gradient-to-b from-cabBlue-50 to-white overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-0 left-0 w-full h-48 bg-cabBlue-500 opacity-5"></div>
      <div className="absolute -top-24 right-1/4 w-72 h-72 rounded-full bg-cabBlue-500 opacity-5 blur-3xl"></div>
      <div className="absolute bottom-12 -left-24 w-80 h-80 rounded-full bg-cabBlue-500 opacity-5 blur-3xl"></div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col items-center text-center mb-8 animate-fade-in">
          <h5 className="text-cabBlue-600 font-semibold text-sm uppercase tracking-wider mb-3">
            Book a Cab in Minutes
          </h5>
          <h1 className="text-4xl md:text-5xl font-bold text-cabGray-800 mb-4 leading-tight">
            Your Journey, Our Priority
          </h1>
          <p className="text-cabGray-600 max-w-2xl mx-auto text-lg">
            Reliable cab service with transparent pricing and professional drivers.
            Book now for a comfortable and safe journey.
          </p>
        </div>
        
        <div className="max-w-6xl mx-auto">
          {currentStep === 1 ? (
            <div className="bg-white rounded-xl shadow-card border border-cabGray-100 p-5 md:p-8 animate-slide-up">
              <TabTripSelector 
                selectedTab={tripType}
                tripMode={tripMode}
                onTabChange={handleTripTypeChange}
                onTripModeChange={setTripMode}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <LocationInput
                  label="Pickup Location"
                  placeholder="Enter pickup location"
                  value={pickupLocation}
                  onChange={setPickupLocation}
                  isPickupLocation={true}
                />
                
                {tripType === 'local' ? (
                  <LocalTripSelector 
                    tripPurpose={tripPurpose}
                    onTripPurposeChange={setTripPurpose}
                    hourlyPackage={hourlyPackage}
                    onHourlyPackageChange={setHourlyPackage}
                  />
                ) : (
                  <LocationInput
                    label="Drop Location"
                    placeholder="Enter drop location"
                    value={dropLocation}
                    onChange={setDropLocation}
                    isPickupLocation={false}
                  />
                )}
                
                <DateTimePicker
                  label="Pickup Date & Time"
                  date={pickupDate}
                  onDateChange={setPickupDate}
                  minDate={new Date()}
                  className="md:col-span-2"
                />
              </div>
              
              <div className="mt-8 flex justify-end">
                <Button
                  onClick={handleContinue}
                  disabled={!isFormValid}
                  className="px-10 py-6 bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white font-semibold text-lg rounded-md"
                >
                  SEARCH <ChevronRight size={18} className="ml-1" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-slide-up">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-xl shadow-card border border-cabGray-100 p-5 md:p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold text-cabGray-800">Trip Details</h3>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setCurrentStep(1)}
                    >
                      Edit
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6">
                    <div>
                      <p className="text-xs text-cabGray-500 mb-1">PICKUP LOCATION</p>
                      <p className="font-medium text-cabGray-800">{pickupLocation?.name}</p>
                      <p className="text-xs text-cabGray-600">{pickupLocation?.city}, {pickupLocation?.state}</p>
                    </div>
                    
                    {tripType === 'local' ? (
                      <div>
                        <p className="text-xs text-cabGray-500 mb-1">TRIP DETAILS</p>
                        <p className="font-medium text-cabGray-800">
                          {tripPurpose === 'business' && 'Business Trip'}
                          {tripPurpose === 'personal' && 'Personal Trip'}
                          {tripPurpose === 'city-tour' && 'City Tour'}
                        </p>
                        <p className="text-xs text-cabGray-600">
                          {hourlyPackages.find(pkg => pkg.id === hourlyPackage)?.name}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs text-cabGray-500 mb-1">DROP LOCATION</p>
                        <p className="font-medium text-cabGray-800">{dropLocation?.name}</p>
                        <p className="text-xs text-cabGray-600">{dropLocation?.city}, {dropLocation?.state}</p>
                      </div>
                    )}
                    
                    <div className="md:col-span-2 border-t border-cabGray-100 pt-3 mt-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-cabGray-500 mb-1">PICKUP DATE & TIME</p>
                          <p className="font-medium text-cabGray-800">
                            {pickupDate ? new Intl.DateTimeFormat('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: 'numeric',
                              hour12: true
                            }).format(pickupDate) : 'Not selected'}
                          </p>
                        </div>
                        
                        <div className="flex items-center justify-center rounded-full bg-cabBlue-100 w-10 h-10 text-cabBlue-600">
                          <ArrowRight size={18} />
                        </div>
                        
                        <div className="text-right">
                          <p className="text-xs text-cabGray-500 mb-1">ESTIMATED DISTANCE</p>
                          <p className="font-medium text-cabGray-800">{distance} km</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-xl shadow-card border border-cabGray-100 p-5 md:p-6">
                  <CabOptions 
                    cabTypes={cabTypes}
                    selectedCab={selectedCab}
                    onSelectCab={setSelectedCab}
                    distance={distance}
                    tripType={tripType}
                  />
                </div>
              </div>
              
              <div className="lg:col-span-1">
                <BookingSummary
                  pickupLocation={pickupLocation}
                  dropLocation={dropLocation}
                  pickupDate={pickupDate}
                  selectedCab={selectedCab}
                  distance={distance}
                  totalPrice={totalPrice}
                  tripType={tripType}
                  tripMode={tripMode}
                  tripPurpose={tripPurpose}
                  hourlyPackage={hourlyPackage}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
