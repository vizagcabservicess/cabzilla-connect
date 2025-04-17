
import React, { useEffect, useState, useRef } from 'react';
import { CabType } from '@/types/cab';
import { formatPrice } from '@/lib';
import { RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { getApiUrl, forceRefreshHeaders } from '@/config/api';

interface CabListProps {
  cabTypes: CabType[];
  selectedCabId: string;
  onSelectCab: (cab: CabType) => void;
  distance: number;
  tripType: string;
  tripMode: string;
  hourlyPackage?: string;
  pickupDate?: Date;
  returnDate?: Date;
  isCalculating?: boolean;
  // Add the missing props that CabOptions is trying to pass
  cabFares?: Record<string, number>;
  cabErrors?: Record<string, string>;
  getFareDetails?: (cab: CabType) => string;
  handleSelectCab?: (cab: CabType) => void;
}

export const CabList: React.FC<CabListProps> = ({
  cabTypes,
  selectedCabId,
  onSelectCab,
  distance,
  tripType,
  tripMode,
  hourlyPackage,
  pickupDate,
  returnDate,
  isCalculating = false,
  cabFares = {},
  cabErrors = {},
  getFareDetails,
  handleSelectCab
}) => {
  const [loadingCabIds, setLoadingCabIds] = useState<string[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const selectedCabIdRef = useRef<string>(selectedCabId);
  const hourlyPackageRef = useRef<string | undefined>(hourlyPackage);
  const fareCache = useRef<Record<string, number>>({});
  const pendingRequestsRef = useRef<Record<string, AbortController>>({});

  // Update refs when props change
  useEffect(() => {
    selectedCabIdRef.current = selectedCabId;
    hourlyPackageRef.current = hourlyPackage;
  }, [selectedCabId, hourlyPackage]);

  // Normalize vehicle ID to ensure consistency
  const normalizeVehicleId = (id: string): string => {
    return id.toLowerCase().replace(/\s+/g, '_');
  };

  // Cancel pending requests for a specific vehicle or all vehicles
  const cancelPendingRequests = (vehicleId?: string) => {
    if (vehicleId) {
      // Cancel only for a specific vehicle
      if (pendingRequestsRef.current[vehicleId]) {
        pendingRequestsRef.current[vehicleId].abort();
        delete pendingRequestsRef.current[vehicleId];
      }
    } else {
      // Cancel all pending requests
      Object.values(pendingRequestsRef.current).forEach(controller => {
        controller.abort();
      });
      pendingRequestsRef.current = {};
    }
  };

  // Fetch local package fares directly from the API
  const fetchLocalFare = async (vehicleId: string): Promise<number> => {
    try {
      // Cancel any pending requests for this vehicle
      cancelPendingRequests(vehicleId);
      
      // Create a new abort controller for this request
      const abortController = new AbortController();
      pendingRequestsRef.current[vehicleId] = abortController;
      
      // Track which cab is currently loading
      setLoadingCabIds(prev => [...prev, vehicleId]);
      
      // Normalize the vehicle ID
      const normalizedVehicleId = normalizeVehicleId(vehicleId);
      
      console.log(`Fetching local fares for vehicle ${normalizedVehicleId} with timestamp: ${Date.now()}`);
      const apiUrl = getApiUrl(`api/admin/direct-local-fares.php?vehicle_id=${normalizedVehicleId}`);
      
      console.log(`Fetching price from API: ${apiUrl}`);
      const response = await axios.get(apiUrl, {
        headers: forceRefreshHeaders,
        timeout: 8000,
        signal: abortController.signal
      });
      
      // Verify the cab ID is still what we're interested in
      if (vehicleId !== selectedCabIdRef.current && vehicleId !== selectedCabId) {
        console.log(`CabList: Vehicle ${vehicleId} is no longer selected, discarding results`);
        return 0;
      }
      
      if (response.data && response.data.fares && response.data.fares.length > 0) {
        const fareData = response.data.fares[0];
        console.log('Local fares for vehicle', normalizedVehicleId, ':', fareData);
        
        // Extract the correct price based on the package
        let price = 0;
        if (hourlyPackage?.includes('4hrs-40km') && fareData.price4hrs40km) {
          price = Number(fareData.price4hrs40km);
        } else if (hourlyPackage?.includes('8hrs-80km') && fareData.price8hrs80km) {
          price = Number(fareData.price8hrs80km);
        } else if (hourlyPackage?.includes('10hrs-100km') && fareData.price10hrs100km) {
          price = Number(fareData.price10hrs100km);
        }
        
        if (price > 0) {
          console.log(`Retrieved fare directly from database API: ₹${price}`);
          
          // Cache the fare locally
          fareCache.current[normalizedVehicleId] = price;
          
          // Clear any previous stored fares for this vehicle to prevent conflicts
          try {
            localStorage.removeItem(`fare_local_${normalizedVehicleId}`);
          } catch (e) {
            console.warn('Failed to clear localStorage:', e);
          }
          
          // Store in localStorage with clear vehicle-specific key
          localStorage.setItem(`fare_local_${normalizedVehicleId}`, price.toString());
          
          // Broadcast the update to ensure consistency
          window.dispatchEvent(new CustomEvent('fare-calculated', {
            detail: {
              cabId: normalizedVehicleId,
              tripType: 'local',
              packageId: hourlyPackage,
              fare: price,
              calculated: true,
              source: 'direct-api-cablist',
              timestamp: Date.now(),
              selectedCabId: vehicleId, // Include the original cab ID for verification
              originalVehicleId: vehicleId // Extra verification field
            }
          }));
          
          return price;
        }
      }
      
      console.warn(`No valid price found for ${normalizedVehicleId} with package ${hourlyPackage}`);
      return 0;
    } catch (error) {
      if (axios.isCancel(error)) {
        console.log(`CabList: Request for ${vehicleId} was cancelled`);
      } else {
        console.error('Error fetching local fare:', error);
      }
      return 0;
    } finally {
      // Remove cab from loading state
      setLoadingCabIds(prev => prev.filter(id => id !== vehicleId));
      
      // Clean up the abort controller reference
      if (pendingRequestsRef.current[vehicleId]) {
        delete pendingRequestsRef.current[vehicleId];
      }
    }
  };

  // Manually refresh prices
  const handleRefreshPrices = async () => {
    toast.info('Refreshing fares from database...');
    setRefreshTrigger(Date.now());
    
    // Cancel all pending requests
    cancelPendingRequests();
    
    // Clear any existing fare cache first
    fareCache.current = {};
    
    // Clear any stored fares in localStorage that could cause conflicts
    if (tripType === 'local') {
      try {
        // Only clear fares for the current trip type to avoid affecting other bookings
        for (const cab of cabTypes) {
          const normalizedCabId = normalizeVehicleId(cab.id);
          localStorage.removeItem(`fare_local_${normalizedCabId}`);
        }
      } catch (e) {
        console.warn('Failed to clear localStorage:', e);
      }
    }
    
    // Refresh all vehicle fares in sequence
    for (const cab of cabTypes) {
      if (tripType === 'local' && hourlyPackage) {
        await fetchLocalFare(cab.id);
      }
    }
    
    // Special handling to ensure the selected cab fare is propagated to booking summary
    if (selectedCabId && tripType === 'local' && hourlyPackage) {
      const selectedCab = cabTypes.find(cab => cab.id === selectedCabId);
      if (selectedCab) {
        const fare = await fetchLocalFare(selectedCabId);
        if (fare > 0) {
          // Explicitly notify booking summary
          window.dispatchEvent(new CustomEvent('booking-summary-update', {
            detail: {
              cabId: normalizeVehicleId(selectedCabId),
              tripType: 'local',
              packageId: hourlyPackage,
              fare: fare,
              source: 'refresh-button',
              timestamp: Date.now(),
              selectedCabId: selectedCabId,
              originalVehicleId: selectedCabId
            }
          }));
        }
      }
    }
    
    toast.success('Fares refreshed successfully');
  };

  // When a cab is selected, ensure its fare is up-to-date
  useEffect(() => {
    if (selectedCabId && tripType === 'local' && hourlyPackage) {
      console.log(`CabList: Selected cab changed to ${selectedCabId}, refreshing fare`);
      
      // Cancel any pending requests that are not for the selected cab
      Object.keys(pendingRequestsRef.current).forEach(vehicleId => {
        if (vehicleId !== selectedCabId) {
          cancelPendingRequests(vehicleId);
        }
      });
      
      // Clear any previously stored fares for this specific vehicle to prevent confusion
      try {
        const normalizedCabId = normalizeVehicleId(selectedCabId);
        localStorage.removeItem(`fare_local_${normalizedCabId}`);
      } catch (e) {
        console.warn('Failed to clear localStorage:', e);
      }
      
      fetchLocalFare(selectedCabId);
    }
  }, [selectedCabId, hourlyPackage]);

  // Refresh fares when tripType, hourlyPackage, or refreshTrigger changes
  useEffect(() => {
    if (tripType === 'local' && hourlyPackage) {
      console.log(`CabList: Trip parameters changed, refreshing all fares`);
      
      // Cancel all pending requests
      cancelPendingRequests();
      
      // Clear any previously stored fares to prevent conflicts
      try {
        for (const cab of cabTypes) {
          const normalizedCabId = normalizeVehicleId(cab.id);
          localStorage.removeItem(`fare_local_${normalizedCabId}`);
        }
      } catch (e) {
        console.warn('Failed to clear localStorage:', e);
      }
      
      // Refresh all cabs
      cabTypes.forEach(cab => {
        fetchLocalFare(cab.id);
      });
    }
  }, [tripType, hourlyPackage, refreshTrigger]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      cancelPendingRequests();
    };
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
      {/* Refresh button */}
      <div className="col-span-full flex justify-end mb-2">
        <button 
          onClick={handleRefreshPrices}
          disabled={loadingCabIds.length > 0}
          className="flex items-center text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400"
        >
          <RefreshCcw className={`w-4 h-4 mr-1 ${loadingCabIds.length > 0 ? 'animate-spin' : ''}`} />
          Refresh Prices
        </button>
      </div>

      {cabTypes.map((cab) => {
        const isSelected = cab.id === selectedCabId;
        const price = cabFares[cab.id] || cab.price || 0;
        const isLoading = loadingCabIds.includes(cab.id) || isCalculating;
        const error = cabErrors?.[cab.id];
        
        return (
          <div 
            key={cab.id}
            className={`bg-white rounded-lg overflow-hidden shadow-sm transition-all ${
              isSelected ? 'ring-2 ring-blue-500' : 'hover:shadow-md'
            }`}
          >
            <div className="p-4">
              <div className="aspect-w-16 aspect-h-9 bg-gray-100 rounded-md mb-3 overflow-hidden">
                <img 
                  src={cab.image} 
                  alt={cab.name} 
                  className="object-contain w-full h-full" 
                />
              </div>
              
              <h3 className="text-lg font-medium">{cab.name}</h3>
              <p className="text-sm text-gray-500 mb-2">
                {getFareDetails ? getFareDetails(cab) : tripType === 'local' ? 'Local package' : 'Outstation'}
              </p>
              
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <div className="text-xs text-gray-500">Capacity</div>
                  <div>{cab.capacity} People</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Luggage</div>
                  <div>{cab.luggageCapacity} Bags</div>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 mb-3">
                {cab.amenities?.slice(0, 3).map((amenity, index) => (
                  <div key={index} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                    {amenity}
                  </div>
                ))}
                {cab.amenities && cab.amenities.length > 3 && (
                  <div className="text-xs text-gray-500 px-2 py-1">
                    +{cab.amenities.length - 3} more
                  </div>
                )}
              </div>
              
              {error && (
                <div className="text-xs text-red-500 mb-2">{error}</div>
              )}
              
              <div className="flex justify-between items-center mt-4">
                {isSelected ? (
                  <button 
                    className="px-4 py-2 bg-blue-500 text-white font-medium rounded w-full"
                    disabled
                  >
                    Selected
                  </button>
                ) : (
                  <button 
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded w-full"
                    onClick={() => {
                      if (handleSelectCab) {
                        handleSelectCab(cab);
                      } else {
                        onSelectCab(cab);
                      }
                    }}
                  >
                    Select
                  </button>
                )}
                <div className="text-lg font-semibold ml-2">
                  {isLoading ? (
                    <div className="h-6 animate-pulse bg-gray-200 rounded w-20"></div>
                  ) : (
                    formatPrice(price)
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
