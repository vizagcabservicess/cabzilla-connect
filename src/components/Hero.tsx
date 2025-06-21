import React, { useState, useEffect } from 'react';
import { LocationInput } from './LocationInput';
import { DateTimePicker } from './DateTimePicker';
import { TabTripSelector } from './TabTripSelector';
import { CabOptions } from './CabOptions';
import { Location } from '@/types/location';
import { TripType, TripMode } from '@/types/trip';
import { LocalTripSelector } from './LocalTripSelector';
import { Button } from './ui/button';
import { MapPin, Search } from 'lucide-react';

interface HeroProps {
  onSearch?: () => void;
  showOnlySearchWidget?: boolean;
}

export function Hero({ onSearch, showOnlySearchWidget }: HeroProps) {
  const [pickupLocation, setPickupLocation] = useState<Location | null>(null);
  const [dropLocation, setDropLocation] = useState<Location | null>(null);
  const [pickupDate, setPickupDate] = useState<Date>(new Date());
  const [returnDate, setReturnDate] = useState<Date | null>(null);
  const [tripType, setTripType] = useState<TripType>('outstation');
  const [tripMode, setTripMode] = useState<TripMode>('one-way');
  const [localPackage, setLocalPackage] = useState<string>('');
  const [showCabOptions, setShowCabOptions] = useState(false);

  // Handle prefill data from route page
  useEffect(() => {
    const handleRoutePrefill = (event: CustomEvent) => {
      const prefillData = event.detail;
      console.log('Hero received prefill data:', prefillData);
      
      if (prefillData.pickupLocation) {
        setPickupLocation(prefillData.pickupLocation);
      }
      if (prefillData.dropLocation) {
        setDropLocation(prefillData.dropLocation);
      }
      if (prefillData.pickupDate) {
        setPickupDate(new Date(prefillData.pickupDate));
      }
      if (prefillData.tripType) {
        setTripType(prefillData.tripType);
      }
      if (prefillData.tripMode) {
        setTripMode(prefillData.tripMode);
      }
      
      // Auto-trigger search if requested
      if (prefillData.autoTriggerSearch) {
        console.log('Auto-triggering search...');
        setTimeout(() => {
          setShowCabOptions(true);
        }, 500);
      }
    };

    // Check for stored prefill data on component mount
    const storedPrefill = sessionStorage.getItem('routePrefillData');
    if (storedPrefill) {
      try {
        const prefillData = JSON.parse(storedPrefill);
        console.log('Loading stored prefill data:', prefillData);
        handleRoutePrefill({ detail: prefillData } as CustomEvent);
        // Clear the stored data after using it
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

  const handleSearch = () => {
    console.log('Search triggered with:', {
      pickupLocation,
      dropLocation,
      pickupDate,
      returnDate,
      tripType,
      tripMode,
      localPackage
    });

    if (tripType === 'local' && !localPackage) {
      alert('Please select a local package');
      return;
    }

    if (!pickupLocation) {
      alert('Please select a pickup location');
      return;
    }

    if (tripType === 'outstation' && !dropLocation) {
      alert('Please select a drop location');
      return;
    }

    setShowCabOptions(true);
    onSearch?.();
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
      {/* Trip Type Selector */}
      <div className="mb-6">
        <TabTripSelector 
          tripType={tripType}
          onTripTypeChange={setTripType}
        />
      </div>

      {/* Form Fields */}
      <div className="space-y-4">
        {/* Pickup Location */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <MapPin className="inline h-4 w-4 mr-1" />
            Pickup Location
          </label>
          <LocationInput
            value={pickupLocation}
            onChange={setPickupLocation}
            placeholder="Enter pickup location"
            tripType={tripType}
          />
        </div>

        {/* Drop Location (for outstation) */}
        {tripType === 'outstation' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin className="inline h-4 w-4 mr-1" />
              Drop Location
            </label>
            <LocationInput
              value={dropLocation}
              onChange={setDropLocation}
              placeholder="Enter drop location"
              tripType={tripType}
            />
          </div>
        )}

        {/* Local Package Selector */}
        {tripType === 'local' && (
          <LocalTripSelector
            selectedPackage={localPackage}
            onPackageChange={setLocalPackage}
          />
        )}

        {/* Date and Time */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Pickup Date & Time
          </label>
          <DateTimePicker
            value={pickupDate}
            onChange={setPickupDate}
          />
        </div>

        {/* Trip Mode (for outstation) */}
        {tripType === 'outstation' && (
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="tripMode"
                value="one-way"
                checked={tripMode === 'one-way'}
                onChange={(e) => setTripMode(e.target.value as TripMode)}
                className="mr-2"
              />
              One Way
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="tripMode"
                value="round-trip"
                checked={tripMode === 'round-trip'}
                onChange={(e) => setTripMode(e.target.value as TripMode)}
                className="mr-2"
              />
              Round Trip
            </label>
          </div>
        )}

        {/* Return Date (for round trip) */}
        {tripType === 'outstation' && tripMode === 'round-trip' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Return Date & Time
            </label>
            <DateTimePicker
              value={returnDate || new Date()}
              onChange={setReturnDate}
            />
          </div>
        )}

        {/* Search Button */}
        <Button 
          onClick={handleSearch}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg font-semibold"
        >
          <Search className="mr-2 h-5 w-5" />
          Search Cabs
        </Button>
      </div>

      {/* Cab Options */}
      {showCabOptions && (
        <div className="mt-8">
          <CabOptions
            pickupLocation={pickupLocation}
            dropLocation={dropLocation}
            pickupDate={pickupDate}
            returnDate={returnDate}
            tripType={tripType}
            tripMode={tripMode}
            localPackage={localPackage}
          />
        </div>
      )}
    </div>
  );
}
