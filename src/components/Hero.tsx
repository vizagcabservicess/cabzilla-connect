import { useState, useEffect } from 'react';
import { LocationInput } from './LocationInput';
import { DateTimePicker } from './DateTimePicker';
import { CabOptions } from './CabOptions';
import { BookingSummary } from './BookingSummary';
import { Location, getDistanceBetweenLocations } from '@/lib/locationData';
import { CabType, cabTypes, TripMode, TripType } from '@/lib/cabData';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { addDays, differenceInCalendarDays } from 'date-fns';
import { TabTripSelector } from './TabTripSelector';

export function Hero() {
  const [pickupLocation, setPickupLocation] = useState<Location | null>(null);
  const [dropLocation, setDropLocation] = useState<Location | null>(null);
  const [pickupDate, setPickupDate] = useState<Date>(addDays(new Date(), 1));
  const [returnDate, setReturnDate] = useState<Date | null>(null);
  const [selectedCab, setSelectedCab] = useState<CabType | null>(null);
  const [distance, setDistance] = useState<number>(0);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isFormValid, setIsFormValid] = useState<boolean>(false);
  const [tripType, setTripType] = useState<TripType>('outstation');
  const [tripMode, setTripMode] = useState<TripMode>('one-way');

  useEffect(() => {
    if (pickupLocation && dropLocation && pickupDate) {
      setDistance(getDistanceBetweenLocations(pickupLocation.id, dropLocation.id));
      if (tripMode === "round-trip" && !returnDate) {
        setIsFormValid(false);
      } else {
        setIsFormValid(true);
      }
      if (!selectedCab && cabTypes.length > 0) setSelectedCab(cabTypes[0]);
    } else {
      setIsFormValid(false);
    }
  }, [pickupLocation, dropLocation, pickupDate, returnDate, tripMode, selectedCab]);

  const handleContinue = () => {
    if (currentStep === 1 && isFormValid) {
      setCurrentStep(2);
    }
  };

  const calculatePrice = () => {
    if (!selectedCab) return 0;

    const basePrice = selectedCab.price;
    const perKmRate = 14;
    const minKmPerDay = 300;

    if (tripType === 'outstation' && tripMode === 'round-trip' && returnDate) {
      const days = differenceInCalendarDays(returnDate, pickupDate) + 1;
      const totalMinKm = days * minKmPerDay;
      const extraKm = Math.max(distance * 2 - totalMinKm, 0);
      const totalBaseFare = days * basePrice;
      const totalDistanceFare = extraKm * perKmRate;
      const driverAllowance = days * 250;
      return totalBaseFare + totalDistanceFare + driverAllowance;
    }

    if (tripType === 'outstation' && tripMode === 'one-way') {
      const distanceFare = Math.max(distance - minKmPerDay, 0) * 13;
      const driverAllowance = 250;
      return basePrice + distanceFare + driverAllowance;
    }

    return basePrice + distance * selectedCab.pricePerKm;
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
              />
              <LocationInput
                label="DROP LOCATION"
                placeholder="Enter drop location"
                value={dropLocation}
                onChange={setDropLocation}
              />
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
                  <div>
                    <p className="text-xs">DROP LOCATION</p>
                    <p className="font-medium">{dropLocation?.name}</p>
                  </div>
                  <div className="col-span-2 border-t pt-3 mt-2 flex justify-between">
                    <div>
                      <p className="text-xs">PICKUP DATE & TIME</p>
                      <p className="font-medium">{pickupDate?.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs">ESTIMATED DISTANCE</p>
                      <p className="font-medium">{distance} km</p>
                    </div>
                  </div>
                </div>
                <CabOptions cabTypes={cabTypes} selectedCab={selectedCab} onSelectCab={setSelectedCab} distance={distance} tripType={tripType} />
              </div>
            </div>
            <div className="lg:col-span-1">
              <BookingSummary pickupLocation={pickupLocation!} dropLocation={dropLocation!} pickupDate={pickupDate} returnDate={returnDate!} selectedCab={selectedCab!} distance={distance} tripType={tripType} tripMode={tripMode} totalPrice={totalPrice} />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
