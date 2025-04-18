
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { CabType } from '@/types/cab';
import { CabOptionCard } from '@/components/CabOptionCard';
import { useFare, FareType, TripDirectionType } from '@/hooks/useFare';

interface CabListProps {
  cabTypes: CabType[];
  selectedCabId: string | null;
  cabFares: Record<string, number>;
  isCalculatingFares: boolean;
  handleSelectCab: (cab: CabType) => void;
  getFareDetails: (cab: CabType) => string;
  tripType?: string;
  tripMode?: TripDirectionType;
  distance?: number;
  hourlyPackage?: string;
}

export function CabList({
  cabTypes,
  selectedCabId,
  cabFares,
  isCalculatingFares,
  handleSelectCab,
  getFareDetails,
  tripType = 'outstation',
  tripMode = 'one-way',
  distance = 0,
  hourlyPackage
}: CabListProps) {
  const [displayedFares, setDisplayedFares] = useState<Record<string, number>>({});
  const [fadeIn, setFadeIn] = useState<Record<string, boolean>>({});
  const [lastUpdateTimestamp, setLastUpdateTimestamp] = useState<number>(Date.now());
  
  // Use refs to prevent excessive re-renders
  const initializedRef = useRef(false);
  const pendingUpdatesRef = useRef<Record<string, number>>({});
  const updateTimeoutRef = useRef<number | null>(null);
  const isProcessingRef = useRef<boolean>(false);
  const throttleTimestampRef = useRef<Record<string, number>>({});
  
  // Map the tripType string to the FareType enum
  const mapTripType = (type: string): FareType => {
    if (type === 'local') return 'local';
    if (type === 'airport') return 'airport';
    if (type === 'tour') return 'tour';
    return 'outstation';
  };
  
  // Initialize the fare hook
  const { 
    fares, 
    loading, 
    fetchFare, 
    fetchFares,
    isFareLoading
  } = useFare();
  
  // Helper to normalize IDs for consistent comparison
  const normalizeId = (id: string): string => {
    if (!id) return '';
    return id.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  };
  
  // Set up initial fares when they become available
  useEffect(() => {
    if (!initializedRef.current && Object.keys(cabFares).length > 0) {
      console.log('CabList: Initial fare setup', cabFares);
      setDisplayedFares({...cabFares});
      initializedRef.current = true;
    }
  }, [cabFares]);
  
  // Process pending fare updates - throttled to prevent UI flickering
  const processPendingUpdates = useCallback(() => {
    if (Object.keys(pendingUpdatesRef.current).length === 0 || isProcessingRef.current) {
      return;
    }
    
    isProcessingRef.current = true;
    
    const now = Date.now();
    const newFadeIn: Record<string, boolean> = {};
    const updatedFares: Record<string, number> = {...displayedFares};
    let hasChanges = false;
    
    Object.entries(pendingUpdatesRef.current).forEach(([cabId, fare]) => {
      // Only update if fare is valid and different from current display
      if (fare > 0 && fare !== displayedFares[cabId]) {
        // Throttle individual cab updates to prevent flickering
        const lastUpdate = throttleTimestampRef.current[cabId] || 0;
        if (now - lastUpdate < 2000) {
          return;
        }
        
        newFadeIn[cabId] = true;
        updatedFares[cabId] = fare;
        throttleTimestampRef.current[cabId] = now;
        hasChanges = true;
        console.log(`CabList: Updating fare for ${cabId} to ${fare}`);
      }
    });
    
    pendingUpdatesRef.current = {};
    
    if (hasChanges) {
      setFadeIn(newFadeIn);
      setLastUpdateTimestamp(now);
      
      // Use minimal state updates for better performance
      setTimeout(() => {
        setDisplayedFares(updatedFares);
        
        setTimeout(() => {
          setFadeIn({});
          isProcessingRef.current = false;
        }, 400);
      }, 50);
    } else {
      isProcessingRef.current = false;
    }
  }, [displayedFares]);
  
  // Schedule an update with debouncing
  const scheduleUpdate = useCallback(() => {
    if (updateTimeoutRef.current !== null) {
      window.clearTimeout(updateTimeoutRef.current);
    }
    
    updateTimeoutRef.current = window.setTimeout(() => {
      processPendingUpdates();
      updateTimeoutRef.current = null;
    }, 300) as unknown as number;
  }, [processPendingUpdates]);
  
  // Fetch fares for all cab types when component mounts or trip details change
  useEffect(() => {
    if (cabTypes.length === 0 || distance <= 0) return;
    
    const fetchAllFares = async () => {
      const fareRequests = cabTypes.map(cab => ({
        vehicleId: cab.id,
        tripType: mapTripType(tripType),
        distance,
        tripMode: tripMode as TripDirectionType,
        packageId: hourlyPackage
      }));
      
      try {
        const results = await fetchFares(fareRequests);
        console.log("Fetched fares:", results);
        
        // Update fare display for each cab
        const updates: Record<string, number> = {};
        Object.entries(results).forEach(([cabId, fareDetails]) => {
          if (fareDetails.totalPrice > 0) {
            updates[cabId] = fareDetails.totalPrice;
          }
        });
        
        if (Object.keys(updates).length > 0) {
          pendingUpdatesRef.current = {...pendingUpdatesRef.current, ...updates};
          scheduleUpdate();
        }
      } catch (error) {
        console.error("Error fetching fares:", error);
      }
    };
    
    fetchAllFares();
    
    // Set up event listener for fare updates
    const handleFareCalculated = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.cabId && customEvent.detail.fare) {
        const { cabId, fare } = customEvent.detail;
        
        if (fare > 0) {
          // Throttle event handling
          const now = Date.now();
          const lastEventTime = throttleTimestampRef.current[`event_${cabId}`] || 0;
          if (now - lastEventTime < 3000) {
            return;
          }
          
          throttleTimestampRef.current[`event_${cabId}`] = now;
          pendingUpdatesRef.current[cabId] = fare;
          scheduleUpdate();
        }
      }
    };
    
    window.addEventListener('fare-calculated', handleFareCalculated);
    
    return () => {
      window.removeEventListener('fare-calculated', handleFareCalculated);
      
      if (updateTimeoutRef.current !== null) {
        window.clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [cabTypes, distance, tripType, tripMode, hourlyPackage, fetchFares, scheduleUpdate]);
  
  // Get the fare to display for a specific cab
  const getDisplayFare = useCallback((cab: CabType): number => {
    const normalizedId = normalizeId(cab.id);
    
    // Use fares from hook if available
    const fareDetails = fares[normalizedId];
    if (fareDetails && fareDetails.totalPrice > 0) {
      return fareDetails.totalPrice;
    }
    
    // Use displayed fares if available (what user currently sees)
    if (displayedFares[normalizedId] && displayedFares[normalizedId] > 0) {
      return displayedFares[normalizedId];
    }
    
    // Fall back to passed-in fares
    if (cabFares[normalizedId] && cabFares[normalizedId] > 0) {
      return cabFares[normalizedId];
    }
    
    // Try to get from localStorage for consistency
    if (tripType === 'local' && hourlyPackage) {
      const localStorageKey = `local_fare_${normalizedId}_${hourlyPackage}`;
      const storedPrice = localStorage.getItem(localStorageKey);
      if (storedPrice) {
        const price = parseInt(storedPrice, 10);
        if (price > 0) {
          return price;
        }
      }
    } else if (tripType === 'outstation') {
      const outstationKey = `outstation_${normalizedId}_${distance}_${tripMode}`;
      const storedFare = localStorage.getItem(outstationKey);
      if (storedFare) {
        const price = parseInt(storedFare, 10);
        if (price > 0) {
          return price;
        }
      }
    }
    
    // Use cab's default price if available
    if (cab.price && cab.price > 0) {
      return cab.price;
    }
    
    // Last resort - default fallback prices
    const fallbackPrices: Record<string, number> = {
      'sedan': 1500,
      'ertiga': 2000,
      'innova': 2500,
      'innova_crysta': 2500,
      'luxury': 3500,
      'tempo': 4000
    };
    
    const vehicleType = cab.id.toLowerCase();
    return fallbackPrices[vehicleType] || 2000;
  }, [fares, displayedFares, cabFares, tripType, tripMode, distance, hourlyPackage]);
  
  // Enhanced cab selection with fare fetching
  const enhancedSelectCab = useCallback((cab: CabType) => {
    // Don't dispatch events for same cab selection
    if (cab.id === selectedCabId) {
      handleSelectCab(cab);
      return;
    }
    
    handleSelectCab(cab);
    
    setFadeIn(prev => ({
      ...prev,
      [cab.id]: true
    }));
    
    // Fetch updated fare for the selected cab
    const fetchUpdatedFare = async () => {
      try {
        const fareParams = {
          vehicleId: cab.id,
          tripType: mapTripType(tripType),
          distance,
          tripMode: tripMode as TripDirectionType,
          packageId: hourlyPackage
        };
        
        // Force refresh for selected cab
        const fareDetails = await fetchFare(fareParams, true);
        
        if (fareDetails.totalPrice > 0) {
          pendingUpdatesRef.current[cab.id] = fareDetails.totalPrice;
          scheduleUpdate();
          
          // Simplified event with required data only
          window.dispatchEvent(new CustomEvent('cab-selected', {
            bubbles: true,
            detail: {
              cabType: cab.id,
              cabName: cab.name,
              fare: fareDetails.totalPrice,
              timestamp: Date.now()
            }
          }));
        }
      } catch (error) {
        console.error("Error fetching fare for selected cab:", error);
      }
    };
    
    fetchUpdatedFare();
    
    setTimeout(() => {
      setFadeIn(prev => ({
        ...prev,
        [cab.id]: false
      }));
    }, 500);
  }, [selectedCabId, handleSelectCab, fetchFare, tripType, tripMode, distance, hourlyPackage, scheduleUpdate]);
  
  return (
    <div className="space-y-3">
      {isCalculatingFares && (
        <div className="bg-blue-50 p-3 rounded-md flex items-center justify-center mb-3">
          <div className="animate-spin mr-2 h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-blue-600 text-sm">Calculating fares...</span>
        </div>
      )}
      
      {(!cabTypes || cabTypes.length === 0) ? (
        <div className="bg-amber-50 p-4 rounded-md text-amber-800 text-center">
          <p className="font-medium">No cab options available</p>
          <p className="text-sm mt-1">Please try refreshing the page or contact support if the issue persists.</p>
        </div>
      ) : (
        cabTypes.map((cab) => (
          <div 
            key={cab.id || `cab-${Math.random()}`}
            className={`transition-all duration-300 ${fadeIn[cab.id] ? 'bg-yellow-50' : ''}`}
            data-last-update={lastUpdateTimestamp}
          >
            <CabOptionCard 
              cab={cab}
              fare={getDisplayFare(cab)}
              isSelected={selectedCabId === cab.id}
              onSelect={() => enhancedSelectCab(cab)}
              fareDetails={getFareDetails(cab)}
              isCalculating={isCalculatingFares || isFareLoading(cab.id)}
            />
          </div>
        ))
      )}
    </div>
  );
}
