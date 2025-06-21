
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { LocationInput } from './LocationInput';
import { TabTripSelector } from './TabTripSelector';
import { RadioGroupTripMode } from './RadioGroupTripMode';
import { DateTimePicker } from './DateTimePicker';
import { Button } from '@/components/ui/button';
import { CabOptions } from './CabOptions';
import { Search, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Location } from '@/types/location';
import { TripType } from '@/types/trip';

interface HeroProps {
  onSearch?: () => void;
}

type TripMode = 'one-way' | 'round-trip';

export function Hero({ onSearch }: HeroProps) {
  const navigate = useNavigate();
  const [tripType, setTripType] = useState<TripType>('outstation');
  const [tripMode, setTripMode] = useState<TripMode>('one-way');
  const [pickupLocation, setPickupLocation] = useState<Location | null>(null);
  const [dropLocation, setDropLocation] = useState<Location | null>(null);
  const [pickupDate, setPickupDate] = useState<Date>(new Date());
  const [returnDate, setReturnDate] = useState<Date | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Handle prefill data from route pages
  useEffect(() => {
    const handleRoutePrefill = (event: CustomEvent) => {
      const data = event.detail;
      if (data) {
        setTripType(data.tripType || 'outstation');
        setTripMode(data.tripMode || 'one-way');
        setPickupLocation(data.pickupLocation);
        setDropLocation(data.dropLocation);
        setPickupDate(data.pickupDate || new Date());
        
        // Auto-trigger search if specified
        if (data.autoTriggerSearch) {
          setTimeout(() => {
            handleSearch();
          }, 500);
        }
      }
    };

    // Check for stored prefill data
    const storedData = sessionStorage.getItem('routePrefillData');
    if (storedData) {
      try {
        const data = JSON.parse(storedData);
        handleRoutePrefill({ detail: data } as CustomEvent);
        sessionStorage.removeItem('routePrefillData');
      } catch (error) {
        console.error('Error parsing prefill data:', error);
      }
    }

    // Listen for route prefill events
    window.addEventListener('routePrefill', handleRoutePrefill as EventListener);

    return () => {
      window.removeEventListener('routePrefill', handleRoutePrefill as EventListener);
    };
  }, []);

  const handleSearch = async () => {
    if (!pickupLocation) {
      alert('Please select pickup location');
      return;
    }

    if (tripType !== 'local' && !dropLocation) {
      alert('Please select drop location');
      return;
    }

    setIsLoading(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setShowResults(true);
      onSearch?.();
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewSearch = () => {
    setShowResults(false);
    setPickupLocation(null);
    setDropLocation(null);
    setPickupDate(new Date());
    setReturnDate(null);
  };

  const isSearchDisabled = !pickupLocation || (tripType !== 'local' && !dropLocation);

  return (
    <section className="py-8 md:py-12">
      <div className="container mx-auto px-4">
        {!showResults ? (
          <Card className="max-w-4xl mx-auto shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
            <CardContent className="p-6 md:p-8">
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-full mb-4">
                  <MapPin className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-600">BOOK YOUR RIDE</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                  Where would you like to go?
                </h2>
                <p className="text-gray-600">
                  Choose your trip type and destinations for the best cab options
                </p>
              </div>

              <div className="space-y-6">
                <TabTripSelector 
                  selectedTrip={tripType} 
                  onTripChange={setTripType}
                />

                {(tripType === 'outstation' || tripType === 'airport') && (
                  <RadioGroupTripMode
                    selectedMode={tripMode}
                    onModeChange={setTripMode}
                  />
                )}

                <div className="grid md:grid-cols-2 gap-4">
                  <LocationInput
                    label="Pickup Location"
                    placeholder="Enter pickup location"
                    value={pickupLocation}
                    onChange={setPickupLocation}
                    tripType={tripType}
                    isPickup={true}
                  />
                  
                  {tripType !== 'local' && (
                    <LocationInput
                      label="Drop Location"
                      placeholder="Enter destination"
                      value={dropLocation}
                      onChange={setDropLocation}
                      tripType={tripType}
                      isPickup={false}
                    />
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <DateTimePicker
                    label="Pickup Date & Time"
                    value={pickupDate}
                    onChange={setPickupDate}
                  />
                  
                  {tripMode === 'round-trip' && (
                    <DateTimePicker
                      label="Return Date & Time"
                      value={returnDate}
                      onChange={setReturnDate}
                      minDate={pickupDate}
                    />
                  )}
                </div>

                <Button 
                  onClick={handleSearch}
                  disabled={isSearchDisabled || isLoading}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-4 text-lg font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Searching...
                    </div>
                  ) : (
                    <>
                      <Search className="mr-2 h-5 w-5" />
                      Search Cabs
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <CabOptions
            tripType={tripType}
            tripMode={tripMode}
            pickupLocation={pickupLocation!}
            dropLocation={dropLocation}
            pickupDate={pickupDate}
            returnDate={returnDate}
            onNewSearch={handleNewSearch}
          />
        )}
      </div>
    </section>
  );
}
