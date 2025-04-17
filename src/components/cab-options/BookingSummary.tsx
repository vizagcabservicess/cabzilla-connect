
import React, { useEffect, useState, useRef, useCallback } from 'react';
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
  const selectedCabIdRef = useRef<string | null>(selectedCab?.id || null);
  const hourlyPackageRef = useRef(hourlyPackage);
  const fareUpdateInProgressRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastEventTimestampRef = useRef<number>(0);
  const debugInfoRef = useRef<{
    lastEvent?: string, 
    lastFare?: number, 
    lastSource?: string,
    lastNormalizedId?: string,
    lastSelectedId?: string,
    lastEventTimestamp?: number
  }>({});

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

  // Normalize vehicle ID consistently across the application with stricter rules
  const normalizeVehicleId = (id: string | null): string => {
    if (!id) return '';
    // Convert to lowercase, remove any spaces, and replace any special characters
    return id.toLowerCase().replace(/[\s.,-]+/g, '_').replace(/__+/g, '_');
  };

  // Verify if two vehicle IDs match, using strict normalization
  const doVehicleIdsMatch = (id1: string | null, id2: string | null): boolean => {
    if (!id1 || !id2) return false;
    return normalizeVehicleId(id1) === normalizeVehicleId(id2);
  };

  // Update refs when props change
  useEffect(() => {
    // Check if cab has changed
    const cabChanged = selectedCab?.id !== selectedCabIdRef.current;
    
    if (cabChanged) {
      console.log(`BookingSummary: Selected cab changed from ${selectedCabIdRef.current} to ${selectedCab?.id}`);
      
      // Cancel any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      
      // Reset all state
      setPackageFare(0);
      setTotalAmount(0);
      setDriverAllowance(0);
      setNightCharges(0);
      setExtraDistanceFare(0);
      setLastSelectedCabId(selectedCab?.id || "");
      fareUpdateInProgressRef.current = false;
      
      // Reset debug info
      debugInfoRef.current = {
        lastNormalizedId: selectedCab?.id ? normalizeVehicleId(selectedCab.id) : '',
        lastSelectedId: selectedCab?.id || '',
        lastEventTimestamp: 0
      };
      
      // Reset last event timestamp
      lastEventTimestampRef.current = 0;
    }
    
    // Update all references
    selectedCabRef.current = selectedCab;
    selectedCabIdRef.current = selectedCab?.id || null;
    hourlyPackageRef.current = hourlyPackage;
    
  }, [selectedCab, hourlyPackage]);

  // Direct fare fetch from API for consistency - core function to get correct fare
  const fetchDirectFare = useCallback(async (vehicleId: string, packageId: string) => {
    if (!vehicleId || !packageId) return 0;
    
    // Set flag to prevent concurrent fetches
    if (fareUpdateInProgressRef.current) {
      console.log(`BookingSummary: Fare update already in progress, skipping fetch for ${vehicleId}`);
      return 0;
    }
    
    // Verify cab ID still matches before starting fetch
    if (!doVehicleIdsMatch(selectedCabIdRef.current, vehicleId)) {
      console.log(`BookingSummary: Selected cab changed before fetch started, aborting`);
      return 0;
    }
    
    fareUpdateInProgressRef.current = true;
    const normalizedVehicleId = normalizeVehicleId(vehicleId);
    console.log(`BookingSummary: Fetching local fares for ${normalizedVehicleId} with package: ${packageId}, timestamp: ${Date.now()}`);
    setIsFetchingFare(true);
    
    // Cancel any existing requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create a new abort controller
    abortControllerRef.current = new AbortController();
    
    // Store the actual vehicle ID we're fetching for (to verify it hasn't changed)
    const fetchingForVehicleId = vehicleId;
    const currentTimestamp = Date.now();
    
    try {
      // Normalize vehicle ID for API request
      const apiUrl = getApiUrl(`api/admin/direct-local-fares.php?vehicle_id=${normalizedVehicleId}`);
      
      console.log(`BookingSummary: Fetching price from API: ${apiUrl}`);
      
      const response = await axios.get(apiUrl, {
        headers: {
          ...forceRefreshHeaders,
          'X-Request-ID': `fare-${normalizedVehicleId}-${currentTimestamp}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        timeout: 8000,
        signal: abortControllerRef.current.signal
      });
      
      // Critical: verify the selected cab hasn't changed during the API call
      // Only proceed if we're still fetching for the right vehicle
      if (!doVehicleIdsMatch(selectedCabRef.current?.id, fetchingForVehicleId)) {
        console.log(`BookingSummary: Selected cab changed during API call (from ${fetchingForVehicleId} to ${selectedCabRef.current?.id || 'none'}), discarding results`);
        setIsFetchingFare(false);
        fareUpdateInProgressRef.current = false;
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
            extraDistanceFares: 0,
            vehicleName: fareData.vehicle_name
          });
          
          // One final check that the cab and package haven't changed
          if (doVehicleIdsMatch(selectedCabRef.current?.id, fetchingForVehicleId) && 
              hourlyPackageRef.current === packageId) {
            
            // Only update if this is newer than our last event
            if (currentTimestamp > lastEventTimestampRef.current) {
              lastEventTimestampRef.current = currentTimestamp;
              
              debugInfoRef.current = {
                lastEvent: 'direct-api-fetch',
                lastFare: price,
                lastSource: 'direct-api-fetch',
                lastNormalizedId: normalizedVehicleId,
                lastSelectedId: vehicleId,
                lastEventTimestamp: currentTimestamp
              };
              
              // Broadcast the fare to ensure all components are in sync
              window.dispatchEvent(new CustomEvent('booking-summary-fare-updated', {
                detail: {
                  cabId: normalizedVehicleId,
                  originalCabId: fetchingForVehicleId,
                  tripType: 'local',
                  packageId: packageId,
                  fare: price,
                  source: 'direct-api-booking-summary',
                  timestamp: currentTimestamp,
                  vehicleName: fareData.vehicle_name
                }
              }));
            } else {
              console.log(`BookingSummary: Skipping event dispatch - older than last event`);
            }
            
            return price;
          } else {
            console.log(`BookingSummary: Cab or package changed after API call completed, discarding results`);
            return 0;
          }
        } else {
          console.warn(`BookingSummary: No valid price found for ${vehicleId} with package ${packageId}`);
          return 0;
        }
      }
      
      console.warn('BookingSummary: No fare data found from direct API fetch');
      return 0;
      
    } catch (error) {
      if (axios.isCancel(error)) {
        console.log('BookingSummary: Request was cancelled');
      } else {
        console.error('BookingSummary: Error fetching fare directly:', error);
      }
      return 0;
    } finally {
      setIsFetchingFare(false);
      fareUpdateInProgressRef.current = false;
    }
  }, []);

  // Calculate initial fare based on selected cab
  useEffect(() => {
    const calculateFare = async () => {
      if (!selectedCab) return;

      setLastSelectedCabId(selectedCab.id);
      
      if (tripType === 'local' && hourlyPackage) {
        setIsFetchingFare(true);
        const directFare = await fetchDirectFare(selectedCab.id, hourlyPackage);
        
        // Verify again that the selected cab hasn't changed during the API call
        if (!doVehicleIdsMatch(selectedCabRef.current?.id, selectedCab.id)) {
          console.log(`BookingSummary: Selected cab changed after API call completed, not updating UI`);
          setIsFetchingFare(false);
          return;
        }
        
        if (directFare > 0) {
          setPackageFare(directFare);
          setTotalAmount(directFare);
          setLastUpdate(Date.now());
          console.log(`BookingSummary: Set fare for ${selectedCab.id}: ${directFare} (refreshed from database)`);
          
          // Dispatch event to notify other components with cab ID for verification
          const normalizedCabId = normalizeVehicleId(selectedCab.id);
          const currentTimestamp = Date.now();
          
          // Only dispatch if this is newer than our last event
          if (currentTimestamp > lastEventTimestampRef.current) {
            lastEventTimestampRef.current = currentTimestamp;
            
            window.dispatchEvent(new CustomEvent('booking-summary-fare-updated', {
              detail: {
                cabType: selectedCab.id,
                cabId: normalizedCabId,
                fare: directFare,
                tripType: 'local',
                packageId: hourlyPackage,
                timestamp: currentTimestamp,
                source: 'direct-api-booking-summary',
                originalCabId: selectedCab.id, // Original ID for verification
                vehicleName: selectedCab.name // Include vehicle name for debugging
              }
            }));
            
            debugInfoRef.current = {
              lastEvent: 'direct-calculation',
              lastFare: directFare,
              lastSource: 'direct-api-booking-summary',
              lastNormalizedId: normalizedCabId,
              lastSelectedId: selectedCab.id,
              lastEventTimestamp: currentTimestamp
            };
          } else {
            console.log(`BookingSummary: Skipping event dispatch - older than last event`);
          }
        } else {
          console.warn(`BookingSummary: Failed to get fare for ${selectedCab.id} from API`);
        }
        setIsFetchingFare(false);
      }
    };

    calculateFare();
  }, [selectedCab, tripType, hourlyPackage, fetchDirectFare]);

  // Force refresh the fare when cab selection or package changes
  useEffect(() => {
    if (selectedCab && tripType === 'local' && hourlyPackage) {
      // Reset fare state when cab or package changes
      setPackageFare(0);
      setTotalAmount(0);
      setIsFetchingFare(true);
      
      // Schedule a fresh API fetch with delay to avoid race conditions
      const fetchTimeout = setTimeout(async () => {
        const directFare = await fetchDirectFare(selectedCab.id, hourlyPackage);
        
        // Verify cab still matches before updating state
        if (doVehicleIdsMatch(selectedCabRef.current?.id, selectedCab.id) && 
            hourlyPackageRef.current === hourlyPackage) {
          if (directFare > 0) {
            setPackageFare(directFare);
            setTotalAmount(directFare);
            setLastUpdate(Date.now());
            console.log(`BookingSummary: Refreshed fare for ${selectedCab.id}: ${directFare}`);
            
            debugInfoRef.current = {
              lastEvent: 'refresh-when-changed',
              lastFare: directFare,
              lastSource: 'package-changed',
              lastNormalizedId: normalizeVehicleId(selectedCab.id),
              lastSelectedId: selectedCab.id,
              lastEventTimestamp: Date.now()
            };
          }
        } else {
          console.log(`BookingSummary: Selected cab changed during refresh, discarding update`);
        }
        
        setIsFetchingFare(false);
      }, 300);
      
      return () => clearTimeout(fetchTimeout);
    }
  }, [selectedCab?.id, hourlyPackage, fetchDirectFare]);

  // Listen for fare updates from other components, implementing strict event acceptance
  useEffect(() => {
    const handleFareUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      const eventData = customEvent.detail;
      
      if (!eventData || !eventData.cabId || eventData.fare === undefined || !selectedCab) {
        return;
      }
      
      // Get the normalized IDs for strict comparison
      const normalizedSelectedCabId = normalizeVehicleId(selectedCab.id);
      const eventCabId = normalizeVehicleId(eventData.cabId);
      const originalCabId = eventData.originalCabId ? normalizeVehicleId(eventData.originalCabId) : '';
      
      console.log(`BookingSummary: Received fare update event from ${eventData.source || 'unknown'} with:`, {
        selectedCab: selectedCab.name,
        normalizedSelectedCabId,
        eventCabId,
        originalCabId,
        eventSource: eventData.source,
        vehicleName: eventData.vehicleName || 'N/A',
        eventTimestamp: eventData.timestamp,
        lastEventTimestamp: lastEventTimestampRef.current
      });
      
      // STRICT MATCHING: Both eventCabId AND originalCabId must match the current selectedCab
      // This prevents any mismatched fare updates
      const isExactCabIdMatch = normalizedSelectedCabId === eventCabId;
      const isExactOriginalCabIdMatch = originalCabId && (normalizedSelectedCabId === originalCabId);
      
      // Only accept if either is a match AND (most importantly) BOTH are not in conflict
      const isForCurrentCab = (isExactCabIdMatch || isExactOriginalCabIdMatch) && 
                              // Verify that if both are provided, they point to the same cab
                              (!originalCabId || eventCabId === originalCabId || 
                               normalizeVehicleId(originalCabId) === eventCabId);
      
      // Timestamp check: only accept newer events
      const isNewerEvent = eventData.timestamp > lastEventTimestampRef.current;
      
      if (isForCurrentCab) {
        if (isNewerEvent) {
          console.log(`BookingSummary: Accepting fare update for ${selectedCab.name} (${normalizedSelectedCabId}): ₹${eventData.fare} from ${eventData.source || 'unknown'}`);
          
          // Update timestamp reference
          lastEventTimestampRef.current = eventData.timestamp;
          
          // Additional verification - log vehicle name if available
          if (eventData.vehicleName) {
            console.log(`BookingSummary: Event contains vehicle name: ${eventData.vehicleName}`);
          }
          
          if (eventData.fare > 0) {
            setPackageFare(eventData.fare);
            setTotalAmount(eventData.fare);
            setLastUpdate(eventData.timestamp);
            
            debugInfoRef.current = {
              lastEvent: 'event-update',
              lastFare: eventData.fare,
              lastSource: eventData.source || 'unknown',
              lastNormalizedId: eventCabId,
              lastSelectedId: selectedCab.id,
              lastEventTimestamp: eventData.timestamp
            };
          }
        } else {
          console.log(`BookingSummary: Ignoring outdated fare update for ${selectedCab.name}`, {
            eventTimestamp: eventData.timestamp,
            lastEventTimestamp: lastEventTimestampRef.current
          });
        }
      } else {
        // Log but ignore fare updates for other cabs
        console.log(`BookingSummary: Rejecting fare update for ${eventData.vehicleName || eventCabId} as it doesn't match current cab (${selectedCab.name} / ${normalizedSelectedCabId})`);
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

      {/* Debug info in development mode */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-3 text-xs text-gray-500 border-t pt-2">
          <div>Selected Cab ID: {selectedCab.id}</div>
          <div>Normalized ID: {normalizeVehicleId(selectedCab.id)}</div>
          <div>Last Update: {new Date(lastUpdate).toLocaleTimeString()}</div>
          <div>Source: {debugInfoRef.current.lastSource || 'N/A'}</div>
          <div>Last Event: {debugInfoRef.current.lastEvent || 'N/A'}</div>
          <div>Last Event Time: {debugInfoRef.current.lastEventTimestamp ? new Date(debugInfoRef.current.lastEventTimestamp).toLocaleTimeString() : 'N/A'}</div>
        </div>
      )}

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
