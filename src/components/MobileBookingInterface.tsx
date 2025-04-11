
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { LocationInput } from "@/components/LocationInput";
import { DateTimePicker } from "@/components/DateTimePicker";
import { Location } from '@/lib/locationData';
import { TripType, TripMode } from '@/lib/tripTypes';
import { convertToApiLocation } from '@/lib/locationUtils';
import { ChevronRight } from 'lucide-react';
import { safeGetFromSession, safeSetInSession } from '@/hooks/use-mobile';
import { addDays } from 'date-fns';

interface MobileBookingInterfaceProps {
  onSearch: (tripType: TripType) => void;
  isSearching?: boolean;
}

export function MobileBookingInterface({ onSearch, isSearching }: MobileBookingInterfaceProps) {
  // Trip type and mode state
  const [tripType, setTripType] = useState<TripType>(safeGetFromSession('tripType', 'outstation'));
  const [tripMode, setTripMode] = useState<TripMode>(safeGetFromSession('tripMode', 'one-way'));

  // Location state
  const [pickupLocation, setPickupLocation] = useState<Location | null>(safeGetFromSession('pickupLocation', null));
  const [dropLocation, setDropLocation] = useState<Location | null>(safeGetFromSession('dropLocation', null));
  
  // Date state - ensure we initialize with valid Date objects
  const defaultPickupDate = () => {
    try {
      const saved = safeGetFromSession('pickupDate', null);
      return saved ? new Date(saved) : addDays(new Date(), 1);
    } catch (e) {
      return addDays(new Date(), 1);
    }
  };
  
  const [pickupDate, setPickupDate] = useState<Date>(defaultPickupDate());
  const [isFormValid, setIsFormValid] = useState<boolean>(false);

  // Validate form whenever inputs change
  useEffect(() => {
    if (tripType === 'local' && pickupLocation && pickupDate) {
      setIsFormValid(true);
    } else if ((tripType === 'outstation' || tripType === 'airport') && 
               pickupLocation && dropLocation && pickupDate) {
      setIsFormValid(true);
    } else {
      setIsFormValid(false);
    }
  }, [pickupLocation, dropLocation, pickupDate, tripType]);

  // Save to session storage when values change
  useEffect(() => {
    safeSetInSession('tripType', tripType);
    safeSetInSession('tripMode', tripMode);
    
    if (pickupLocation) safeSetInSession('pickupLocation', pickupLocation);
    if (dropLocation) safeSetInSession('dropLocation', dropLocation);
    if (pickupDate) safeSetInSession('pickupDate', pickupDate.toISOString());
  }, [tripType, tripMode, pickupLocation, dropLocation, pickupDate]);

  const handlePickupLocationChange = (location: Location) => {
    if (!location) return;
    setPickupLocation(location);
  };
  
  const handleDropLocationChange = (location: Location) => {
    if (!location) return;
    setDropLocation(location);
  };

  const handleTripTypeChange = (type: TripType) => {
    setTripType(type);
    
    // Reset drop location for local trips
    if (type === 'local') {
      setDropLocation(null);
    }
  };

  const handleSearchClick = () => {
    // Pass the current tripType to ensure correct routing
    onSearch(tripType);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 mx-auto max-w-md">
      {/* Trip Type Tabs */}
      <div className="flex border border-gray-200 rounded-lg mb-4 overflow-hidden">
        <button
          className={`flex-1 py-2 text-sm font-medium ${
            tripType === 'outstation' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-50 text-gray-600'
          }`}
          onClick={() => handleTripTypeChange('outstation')}
        >
          Outstation
        </button>
        <button
          className={`flex-1 py-2 text-sm font-medium ${
            tripType === 'local' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-50 text-gray-600'
          }`}
          onClick={() => handleTripTypeChange('local')}
        >
          Local
        </button>
        <button
          className={`flex-1 py-2 text-sm font-medium ${
            tripType === 'airport' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-50 text-gray-600'
          }`}
          onClick={() => handleTripTypeChange('airport')}
        >
          Airport
        </button>
      </div>

      {/* Trip Mode Toggle (One Way / Round Trip) */}
      {tripType === 'outstation' && (
        <div className="flex border border-gray-200 rounded-lg mb-4 overflow-hidden">
          <button
            className={`flex-1 py-2 text-sm font-medium ${
              tripMode === 'one-way' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-gray-600'
            }`}
            onClick={() => setTripMode('one-way')}
          >
            One Way
          </button>
          <button
            className={`flex-1 py-2 text-sm font-medium ${
              tripMode === 'round-trip' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-gray-600'
            }`}
            onClick={() => setTripMode('round-trip')}
          >
            Round Trip
          </button>
        </div>
      )}

      {/* Pickup Location */}
      <div className="mb-4">
        <div className="uppercase text-xs font-semibold text-gray-700 mb-1">
          Pickup Location
        </div>
        <LocationInput
          placeholder="Select a location in Visakhapatnam"
          value={pickupLocation ? convertToApiLocation(pickupLocation) : undefined}
          onLocationChange={handlePickupLocationChange}
          isPickupLocation={true}
          className="border rounded-md py-2.5 text-sm"
        />
      </div>

      {/* Drop Location (not shown for Local trips) */}
      {tripType !== 'local' && (
        <div className="mb-4">
          <div className="uppercase text-xs font-semibold text-gray-700 mb-1">
            Drop Location
          </div>
          <LocationInput
            placeholder="Enter drop location"
            value={dropLocation ? convertToApiLocation(dropLocation) : undefined}
            onLocationChange={handleDropLocationChange}
            isPickupLocation={false}
            className="border rounded-md py-2.5 text-sm"
          />
        </div>
      )}

      {/* Pickup Date & Time */}
      <div className="mb-4">
        <div className="uppercase text-xs font-semibold text-gray-700 mb-1">
          Pickup Date & Time
        </div>
        <DateTimePicker
          date={pickupDate}
          onDateChange={(date) => date && setPickupDate(date)}
          minDate={new Date()}
        />
      </div>

      {/* Search Button - Updated styling to ensure it's visibly active when valid */}
      <Button 
        onClick={handleSearchClick} 
        disabled={!isFormValid || isSearching}
        className={`w-full py-5 text-md mt-2 ${
          isFormValid && !isSearching 
            ? "bg-blue-600 hover:bg-blue-700 text-white" 
            : "bg-gray-100 hover:bg-gray-200 text-gray-800"
        } flex items-center justify-center`}
        variant={isFormValid && !isSearching ? "default" : "secondary"}
      >
        {isSearching ? (
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-800 mr-2"></div>
            Please wait...
          </div>
        ) : (
          <div className="flex items-center">
            SEARCH <ChevronRight className="ml-1" size={18} />
          </div>
        )}
      </Button>
    </div>
  );
}
