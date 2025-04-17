
import React, { useEffect, useState, useRef, useCallback } from 'react';
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
  const abortControllersRef = useRef<Record<string, AbortController>>({});

  // Normalize vehicle ID consistently across the application with stricter rules
  const normalizeVehicleId = (id: string): string => {
    if (!id) return '';
    // Convert to lowercase, remove any spaces, and replace any special characters
    return id.toLowerCase().replace(/[\s.,-]+/g, '_').replace(/__+/g, '_');
  };

  // Verify if two vehicle IDs match, using strict normalization
  const doVehicleIdsMatch = (id1: string, id2: string): boolean => {
    if (!id1 || !id2) return false;
    return normalizeVehicleId(id1) === normalizeVehicleId(id2);
  };

  // Update refs when props change
  useEffect(() => {
    selectedCabIdRef.current = selectedCabId;
    hourlyPackageRef.current = hourlyPackage;
  }, [selectedCabId, hourlyPackage]);

  // Fetch local package fares directly from the API
  const fetchLocalFare = useCallback(async (vehicleId: string): Promise<number> => {
    try {
      // Cancel any existing request for this cab
      if (abortControllersRef.current[vehicleId]) {
        abortControllersRef.current[vehicleId].abort();
      }
      
      // Create a new abort controller
      abortControllersRef.current[vehicleId] = new AbortController();
      
      // Track which cab is currently loading
      setLoadingCabIds(prev => [...prev, vehicleId]);
      
      const normalizedVehicleId = normalizeVehicleId(vehicleId);
      console.log(`CabList: Fetching local fares for vehicle ${normalizedVehicleId} with timestamp: ${Date.now()}`);
      const apiUrl = getApiUrl(`api/admin/direct-local-fares.php?vehicle_id=${normalizedVehicleId}`);
      
      console.log(`CabList: Fetching price from API: ${apiUrl}`);
      const response = await axios.get(apiUrl, {
        headers: {
          ...forceRefreshHeaders,
          'X-Request-ID': `fare-${normalizedVehicleId}-${Date.now()}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        timeout: 8000,
        signal: abortControllersRef.current[vehicleId].signal
      });
      
      if (response.data && response.data.fares && response.data.fares.length > 0) {
        const fareData = response.data.fares[0];
        console.log('CabList: Local fares for vehicle', normalizedVehicleId, ':', fareData);
        
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
          console.log(`CabList: Retrieved fare directly from database API: ₹${price} for ${normalizedVehicleId}`);
          
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
              originalCabId: vehicleId, // Include the original cab ID for verification
              vehicleName: fareData.vehicle_name // Include vehicle name for debugging
            }
          }));
          
          // If this is the selected cab, also dispatch a special event for the booking summary
          if (doVehicleIdsMatch(vehicleId, selectedCabIdRef.current)) {
            window.dispatchEvent(new CustomEvent('booking-summary-update', {
              detail: {
                cabId: normalizedVehicleId,
                tripType: 'local',
                packageId: hourlyPackage,
                fare: price,
                source: 'direct-api-cablist-selected',
                timestamp: Date.now(),
                originalCabId: vehicleId,
                vehicleName: fareData.vehicle_name
              }
            }));
          }
          
          return price;
        }
      }
      
      console.warn(`CabList: No valid price found for ${vehicleId} with package ${hourlyPackage}`);
      return 0;
    } catch (error) {
      if (axios.isCancel(error)) {
        console.log(`CabList: Request for ${vehicleId} was cancelled`);
      } else {
        console.error('CabList: Error fetching local fare:', error);
      }
      return 0;
    } finally {
      // Remove cab from loading state
      setLoadingCabIds(prev => prev.filter(id => id !== vehicleId));
      
      // Clean up the abort controller
      delete abortControllersRef.current[vehicleId];
    }
  }, [hourlyPackage]);

  // Manually refresh prices
  const handleRefreshPrices = async () => {
    toast.info('Refreshing fares from database...');
    setRefreshTrigger(Date.now());
    
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
          const normalizedCabId = normalizeVehicleId(selectedCabId);
          window.dispatchEvent(new CustomEvent('booking-summary-update', {
            detail: {
              cabId: normalizedCabId,
              tripType: 'local',
              packageId: hourlyPackage,
              fare: fare,
              source: 'refresh-button',
              timestamp: Date.now(),
              originalCabId: selectedCabId
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
      fetchLocalFare(selectedCabId);
    }
  }, [selectedCabId, hourlyPackage, fetchLocalFare]);

  // Refresh fares when tripType, hourlyPackage, or refreshTrigger changes
  useEffect(() => {
    if (tripType === 'local' && hourlyPackage) {
      console.log(`CabList: Trip parameters changed, refreshing all fares`);
      
      // Refresh all cabs
      cabTypes.forEach(cab => {
        fetchLocalFare(cab.id);
      });
    }
  }, [tripType, hourlyPackage, refreshTrigger, cabTypes, fetchLocalFare]);

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
