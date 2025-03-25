
import React, { useState, useEffect } from 'react';
import { MobileTripSelector } from './MobileTripSelector';
import { TripType, TripMode } from '@/lib/tripTypes';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { CabType } from '@/types/cab';
import { useCabOptionsHook } from '@/hooks/useCabOptionsHook';
import { Location } from '@/lib/locationData';
import { formatPrice } from '@/lib/cabData';

interface MobileCabSearchProps {
  initialTripType?: TripType;
  initialTripMode?: TripMode;
}

export function MobileCabSearch({ 
  initialTripType = 'outstation', 
  initialTripMode = 'one-way' 
}: MobileCabSearchProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Trip state
  const [tripType, setTripType] = useState<TripType>(initialTripType);
  const [tripMode, setTripMode] = useState<TripMode>(initialTripMode);
  const [distance, setDistance] = useState(0);
  
  // Locations
  const [pickup, setPickup] = useState<Location | null>(null);
  const [dropoff, setDropoff] = useState<Location | null>(null);
  
  // Dates
  const [pickupDate, setPickupDate] = useState<Date>(new Date());
  const [returnDate, setReturnDate] = useState<Date | null>(null);
  
  // Cab selection
  const [selectedCab, setSelectedCab] = useState<CabType | null>(null);
  
  // Fetch cab options
  const { cabOptions, isLoading, error, refresh } = useCabOptionsHook({
    tripType,
    tripMode,
    distance,
    forceFetch: true
  });
  
  // Debug vehicle data
  useEffect(() => {
    console.log('Available vehicles:', cabOptions.length, cabOptions);
  }, [cabOptions]);
  
  const handleTripTypeChange = (type: TripType) => {
    setTripType(type);
    setSelectedCab(null);
    
    // Reset locations for certain trip types
    if (type === 'local') {
      setDropoff(null);
    }
  };
  
  const handleTripModeChange = (mode: TripMode) => {
    setTripMode(mode);
    
    if (mode === 'round-trip' && !returnDate) {
      // Set default return date 1 day after pickup
      const newReturnDate = new Date(pickupDate);
      newReturnDate.setDate(newReturnDate.getDate() + 1);
      setReturnDate(newReturnDate);
    }
  };
  
  const handleSearch = () => {
    if (!pickup) {
      toast({
        title: "Missing pickup location",
        description: "Please select a pickup location",
        variant: "destructive"
      });
      return;
    }
    
    if (tripType !== 'local' && !dropoff) {
      toast({
        title: "Missing drop location",
        description: "Please select a drop location",
        variant: "destructive"
      });
      return;
    }
    
    // Calculate distance between locations if needed
    if (tripType !== 'local' && pickup && dropoff) {
      // Here we would normally calculate distance, but for simplicity
      // we'll set a placeholder value
      setDistance(150);
    }
    
    // Navigate to the results page
    navigate(`/cabs/${tripType}`);
  };
  
  return (
    <div className="mobile-cab-search">
      <MobileTripSelector
        selectedTab={tripType}
        tripMode={tripMode}
        onTabChange={handleTripTypeChange}
        onTripModeChange={handleTripModeChange}
        onSearch={handleSearch}
      />
    </div>
  );
}
