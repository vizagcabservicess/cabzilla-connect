
import React, { useEffect, useState, useRef } from 'react';
import { formatPrice } from '@/lib';
import { BookingSummaryHelper } from './BookingSummaryHelper';
import { toast } from 'sonner';
import axios from 'axios';
import { getApiUrl, forceRefreshHeaders } from '@/config/api';

interface BookingSummaryProps {
  selectedCab: any;
  pickupLocation: string;
  pickupDate: Date;
  returnDate?: Date;
  tripType: string;
  distance: number;
  hourlyPackage?: string;
  tripMode?: string;
  dropLocation?: string;
  isCalculatingFares?: boolean;
}

export const BookingSummary: React.FC<BookingSummaryProps> = ({
  selectedCab,
  pickupLocation,
  pickupDate,
  returnDate,
  tripType,
  distance,
  hourlyPackage,
  tripMode = 'one-way',
  dropLocation,
  isCalculatingFares = false
}) => {
  const [packageFare, setPackageFare] = useState<number>(0);
  const [driverAllowance, setDriverAllowance] = useState<number>(0);
  const [nightCharges, setNightCharges] = useState<number>(0);
  const [extraDistanceFare, setExtraDistanceFare] = useState<number>(0);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [isFetchingFare, setIsFetchingFare] = useState<boolean>(false);
  const [lastSelectedCabId, setLastSelectedCabId] = useState<string>("");
  const [lastUpdate, setLastUpdate] = useState<number>(0);
  
  // References to track current state in callbacks and prevent stale closures
  const selectedCabRef = useRef(selectedCab);
  const hourlyPackageRef = useRef(hourlyPackage);
  const fareUpdateInProgressRef = useRef(false);
  const mountedRef = useRef(true);

  // Normalize vehicle ID to ensure consistency
  const normalizeVehicleId = (id: string): string => {
    if (!id) return '';
    return id.toLowerCase().replace(/\s+/g, '_');
  };

  // Generate a formatted date for display
  const formatDisplayDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    return date.toLocaleDateString(undefined, options);
  };

  // Format time separately for better control
  const formatDisplayTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Update refs when props change
  useEffect(() => {
    selectedCabRef.current = selectedCab;
    hourlyPackageRef.current = hourlyPackage;
  }, [selectedCab, hourlyPackage]);

  // Clear localStorage for current cab when the selection changes
  useEffect(() => {
    if (selectedCab && selectedCab.id !== lastSelectedCabId) {
      // Clean up localStorage when cab selection changes
      try {
        if (lastSelectedCabId) {
          const normalizedLastCabId = normalizeVehicleId(lastSelectedCabId);
          localStorage.removeItem(`fare_local_${normalizedLastCabId}`);
        }
      } catch (e) {
        console.warn('Failed to clear localStorage:', e);
      }
      
      setLastSelectedCabId(selectedCab.id);
    }
  }, [selectedCab, lastSelectedCabId]);

  // Direct fare fetch from API for consistency
  const fetchDirectFare = async (vehicleId: string, packageId: string) => {
    if (!vehicleId || !packageId) return 0;
    
    // Set flag to prevent concurrent fetches
    if (fareUpdateInProgressRef.current) {
      console.log(`BookingSummary: Fare update already in progress, skipping fetch for ${vehicleId}`);
      return 0;
    }
    
    fareUpdateInProgressRef.current = true;
    console.log(`BookingSummary: Fetching local fares for ${vehicleId} with package: ${packageId}, timestamp: ${Date.now()}`);
    setIsFetchingFare(true);
    
    try {
      // Normalize vehicle ID for API request
      const normalizedVehicleId = normalizeVehicleId(vehicleId);
      const apiUrl = getApiUrl(`api/admin/direct-local-fares.php?vehicle_id=${normalizedVehicleId}`);
      
      console.log(`Fetching price from API: ${apiUrl}`);
      
      const response = await axios.get(apiUrl, {
        headers: forceRefreshHeaders,
        timeout: 8000
      });
      
      // Critical: verify the selected cab hasn't changed during the API call
      if (!selectedCabRef.current || selectedCabRef.current.id !== vehicleId || !mountedRef.current) {
        console.log(`BookingSummary: Selected cab changed during API call (from ${vehicleId} to ${selectedCabRef.current?.id || 'none'}), discarding results`);
        return 0;
      }
      
      if (response.data && response.data.fares && response.data.fares.length > 0) {
        const fareData = response.data.fares[0];
        console.log(`BookingSummary: Retrieved local fares from service for ${normalizedVehicleId}:`, fareData);
        
        // Extract the right price for the selected package
        let price = 0;
        if (packageId.includes('4hrs-40km')) {
          price = Number(fareData.price4hrs40km || 0);
        } else if (packageId.includes('8hrs-80km')) {
          price = Number(fareData.price8hrs80km || 0);
        } else if (packageId.includes('10hrs-100km')) {
          price = Number(fareData.price10hrs100km || 0);
        }
        
        if (price > 0) {
          console.log(`BookingSummary: Calculated fare details for ${normalizedVehicleId}:`, {
            baseFare: price,
            driverAllowance: 0,
            nightCharges: 0,
            extraDistance: 0,
            extraDistanceFares: 0
          });
          
          // One final check that the cab and package haven't changed
          if (selectedCabRef.current?.id === vehicleId && hourlyPackageRef.current === packageId && mountedRef.current) {
            return price;
          } else {
            console.log(`BookingSummary: Cab or package changed after API call completed, discarding results`);
            return 0;
          }
        } else {
          console.warn(`No valid price found for ${vehicleId} with package ${packageId}`);
          return 0;
        }
      }
      
      console.warn('No fare data found from direct API fetch');
      return 0;
      
    } catch (error) {
      console.error('Error fetching fare directly:', error);
      return 0;
    } finally {
      if (mountedRef.current) {
        setIsFetchingFare(false);
      }
      fareUpdateInProgressRef.current = false;
    }
  };

  // Calculate initial fare based on selected cab
  useEffect(() => {
    const calculateFare = async () => {
      if (!selectedCab) return;

      setLastSelectedCabId(selectedCab.id);
      
      if (tripType === 'local' && hourlyPackage) {
        setIsFetchingFare(true);
        
        // Clean localStorage for this specific vehicle to ensure we're using the latest value
        try {
          const normalizedVehicleId = normalizeVehicleId(selectedCab.id);
          localStorage.removeItem(`fare_local_${normalizedVehicleId}`);
        } catch (e) {
          console.warn('Failed to clear localStorage:', e);
        }
        
        const directFare = await fetchDirectFare(selectedCab.id, hourlyPackage);
        
        // Verify again that the selected cab hasn't changed during the API call
        if (!mountedRef.current || selectedCabRef.current?.id !== selectedCab.id) {
          console.log(`BookingSummary: Selected cab changed after API call completed, not updating UI`);
          if (mountedRef.current) {
            setIsFetchingFare(false);
          }
          return;
        }
        
        if (directFare > 0) {
          setPackageFare(directFare);
          setTotalAmount(directFare);
          setLastUpdate(Date.now());
          console.log(`BookingSummary: Set fare for ${selectedCab.id}: ${directFare} (refreshed from database)`);
          
          // Dispatch event to notify other components with cab ID for verification
          window.dispatchEvent(new CustomEvent('booking-summary-fare-updated', {
            detail: {
              cabType: selectedCab.id,
              cabId: normalizeVehicleId(selectedCab.id),
              fare: directFare,
              tripType: 'local',
              packageId: hourlyPackage,
              timestamp: Date.now(),
              source: 'direct-api-booking-summary',
              selectedCabId: selectedCab.id,
              originalVehicleId: selectedCab.id
            }
          }));
        } else {
          console.warn(`Failed to get fare for ${selectedCab.id} from API`);
        }
        setIsFetchingFare(false);
      }
    };

    calculateFare();
  }, [selectedCab, tripType, hourlyPackage]);

  // Force refresh the fare when cab selection or package changes
  useEffect(() => {
    if (selectedCab && tripType === 'local' && hourlyPackage) {
      // Reset fare state when cab or package changes
      setPackageFare(0);
      setTotalAmount(0);
      setIsFetchingFare(true);
      
      // Clean localStorage for this specific vehicle to ensure we're using the latest value
      try {
        const normalizedVehicleId = normalizeVehicleId(selectedCab.id);
        localStorage.removeItem(`fare_local_${normalizedVehicleId}`);
      } catch (e) {
        console.warn('Failed to clear localStorage:', e);
      }
      
      // Schedule a fresh API fetch with delay to avoid race conditions
      const fetchTimeout = setTimeout(async () => {
        const directFare = await fetchDirectFare(selectedCab.id, hourlyPackage);
        
        // Verify cab still matches before updating state
        if (mountedRef.current && selectedCabRef.current?.id === selectedCab.id && hourlyPackageRef.current === hourlyPackage) {
          if (directFare > 0) {
            setPackageFare(directFare);
            setTotalAmount(directFare);
            setLastUpdate(Date.now());
            console.log(`BookingSummary: Refreshed fare for ${selectedCab.id}: ${directFare}`);
          }
        } else {
          console.log(`BookingSummary: Selected cab changed during refresh, discarding update`);
        }
        
        if (mountedRef.current) {
          setIsFetchingFare(false);
        }
      }, 300);
      
      return () => clearTimeout(fetchTimeout);
    }
  }, [selectedCab?.id, hourlyPackage]);

  // Listen for fare updates from other components, verifying cab ID match
  useEffect(() => {
    const handleFareUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      const eventData = customEvent.detail;
      
      if (eventData && eventData.cabId && eventData.fare !== undefined) {
        // Critical: Only process events for the currently selected cab
        if (!selectedCab) return;

        const normalizedSelectedCabId = normalizeVehicleId(selectedCab.id);
        const eventCabId = eventData.cabId.toLowerCase();
        const originalSelectedCabId = eventData.originalVehicleId 
          ? normalizeVehicleId(eventData.originalVehicleId)
          : (eventData.selectedCabId ? normalizeVehicleId(eventData.selectedCabId) : null);
        
        // First check exact match with original vehicle ID (most reliable)
        const isExactMatch = originalSelectedCabId && originalSelectedCabId === selectedCab.id;
        
        // Then check normalized IDs
        const isNormalizedMatch = normalizedSelectedCabId === eventCabId;
        
        // Check if this event is for our currently selected cab
        const isForCurrentCab = isExactMatch || isNormalizedMatch;
        
        if (isForCurrentCab) {
          console.log(`BookingSummary: Received fare update matching current cab (${normalizedSelectedCabId}): ${eventData.fare} from ${eventData.source || 'unknown'}`);
          
          if (eventData.fare > 0) {
            setPackageFare(eventData.fare);
            setTotalAmount(eventData.fare);
            setLastUpdate(Date.now());
          }
        } else {
          // Log but ignore fare updates for other cabs
          console.log(`BookingSummary: Ignoring fare update for ${eventCabId} as it doesn't match current cab (${normalizedSelectedCabId})`);
        }
      }
    };
    
    // Register listeners for various fare update events
    window.addEventListener('booking-summary-update', handleFareUpdate as EventListener);
    window.addEventListener('booking-summary-fare-updated', handleFareUpdate as EventListener);
    
    return () => {
      window.removeEventListener('booking-summary-update', handleFareUpdate as EventListener);
      window.removeEventListener('booking-summary-fare-updated', handleFareUpdate as EventListener);
    };
  }, [selectedCab]);

  if (!selectedCab) {
    return <div className="text-center py-8">Please select a cab to view booking summary</div>;
  }

  // Directly show the package price for local packages
  const renderLocalPackageDetails = () => {
    return (
      <>
        <div className="flex justify-between items-center py-2 border-b">
          <div>{hourlyPackage?.replace(/-/g, ' ').replace('hrs', 'hrs ').toUpperCase()} Package</div>
          <div>{isFetchingFare ? 'Loading...' : formatPrice(packageFare)}</div>
        </div>
      </>
    );
  };

  return (
    <div className="bg-white rounded-lg p-5 shadow-sm mb-4">
      <h2 className="text-xl font-bold mb-4">Booking Summary</h2>
      
      <div className="space-y-4 mb-6">
        <div className="flex items-start gap-2">
          <div className="text-blue-500 mt-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <div className="text-gray-600 text-sm">PICKUP</div>
            <div>{pickupLocation}</div>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <div className="text-blue-500 mt-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <div className="text-gray-600 text-sm">PICKUP DATE & TIME</div>
            <div>{formatDisplayDate(pickupDate)}</div>
            <div>{formatDisplayTime(pickupDate)}</div>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <div className="text-blue-500 mt-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <div>
            <div className="text-gray-600 text-sm">CAB TYPE</div>
            <div className="flex items-center">
              {selectedCab.name} • {selectedCab.capacity} persons • {selectedCab.luggageCapacity} bags 
            </div>
          </div>
        </div>
      </div>

      {/* Package Fare Details */}
      {tripType === 'local' && renderLocalPackageDetails()}

      {/* Total Amount */}
      <div className="flex justify-between items-center py-4 border-t border-b font-semibold">
        <div>Total Amount</div>
        <div>{isFetchingFare ? 'Calculating...' : formatPrice(totalAmount)}</div>
      </div>

      {/* BookingSummaryHelper for synchronizing fares */}
      <BookingSummaryHelper 
        tripType={tripType} 
        selectedCabId={selectedCab?.id} 
        totalPrice={totalAmount}
        hourlyPackage={hourlyPackage}
      />
    </div>
  );
};
