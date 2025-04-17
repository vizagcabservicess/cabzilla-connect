
import React, { useEffect, useState } from 'react';
import { CabType } from '@/types/cab';
import { formatPrice } from '@/lib';
import { RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { getApiUrl } from '@/config/api';

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
  isCalculating = false
}) => {
  const [cabPrices, setCabPrices] = useState<Record<string, number>>({});
  const [isLoadingPrices, setIsLoadingPrices] = useState<boolean>(false);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [loadingCabIds, setLoadingCabIds] = useState<string[]>([]);

  // Fetch local package fares directly from the API
  const fetchLocalFare = async (vehicleId: string): Promise<number> => {
    try {
      // Track which cab is currently loading
      setLoadingCabIds(prev => [...prev, vehicleId]);
      
      console.log(`Fetching local fares for vehicle ${vehicleId} with timestamp: ${Date.now()}`);
      const apiUrl = getApiUrl(`api/admin/direct-local-fares.php?vehicle_id=${vehicleId}`);
      
      const response = await axios.get(apiUrl, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'X-Force-Refresh': 'true'
        },
        timeout: 5000
      });
      
      if (response.data && response.data.fares && response.data.fares.length > 0) {
        const fareData = response.data.fares[0];
        console.log('Local fares for vehicle', vehicleId, ':', fareData);
        
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
          return price;
        }
      }
      
      console.warn(`No valid price found for ${vehicleId} with package ${hourlyPackage}`);
      return 0;
    } catch (error) {
      console.error('Error fetching local fare:', error);
      return 0;
    } finally {
      // Remove cab from loading state
      setLoadingCabIds(prev => prev.filter(id => id !== vehicleId));
    }
  };

  // Calculate prices for all cabs
  const calculatePrices = async () => {
    if (!tripType || (tripType === 'local' && !hourlyPackage)) return;
    
    setIsLoadingPrices(true);
    const prices: Record<string, number> = {};
    
    try {
      // For local packages, fetch prices directly from the API
      if (tripType === 'local' && hourlyPackage) {
        // Fetch fares for all cabs in parallel
        const fetchPromises = cabTypes.map(async (cab) => {
          const fare = await fetchLocalFare(cab.id);
          return { cabId: cab.id, fare };
        });
        
        // Wait for all fetches to complete
        const results = await Promise.all(fetchPromises);
        
        // Process results
        for (const { cabId, fare } of results) {
          if (fare > 0) {
            prices[cabId] = fare;
            
            // Update the cab type price property directly
            const cabIndex = cabTypes.findIndex(cab => cab.id === cabId);
            if (cabIndex >= 0) {
              cabTypes[cabIndex].price = fare;
            }
            
            // Dispatch a fare update event
            window.dispatchEvent(new CustomEvent('fare-calculated', {
              detail: {
                cabId,
                tripType,
                calculated: true,
                fare,
                timestamp: Date.now()
              }
            }));
          }
        }
      }
    } catch (error) {
      console.error('Error calculating prices:', error);
      toast.error('Error calculating prices. Please try again.');
    } finally {
      setCabPrices(prices);
      setIsLoadingPrices(false);
    }
  };

  // Calculate prices on initial render and when relevant props change
  useEffect(() => {
    calculatePrices();
  }, [tripType, hourlyPackage, distance, refreshTrigger]);

  // Handle cab selection and broadcast the event
  const handleSelectCab = (cab: CabType) => {
    onSelectCab(cab);
    
    // Get the current fare for the selected cab
    const currentFare = cabPrices[cab.id] || cab.price;
    
    // Store the selected fare in localStorage for persistence
    if (tripType === 'local' && hourlyPackage && currentFare) {
      const normalizedCabId = cab.id.toLowerCase().replace(/\s+/g, '_');
      localStorage.setItem(`selected_fare_${normalizedCabId}_${hourlyPackage}`, currentFare.toString());
      
      // Dispatch an event to notify other components about the cab selection
      window.dispatchEvent(new CustomEvent('cab-selected', {
        detail: {
          cabId: normalizedCabId,
          tripType,
          packageId: hourlyPackage,
          fare: currentFare,
          timestamp: Date.now()
        }
      }));
    }
  };

  // Manually refresh prices
  const handleRefreshPrices = () => {
    toast.info('Refreshing fares from database...');
    setRefreshTrigger(Date.now());
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
      {/* Refresh button */}
      <div className="col-span-full flex justify-end mb-2">
        <button 
          onClick={handleRefreshPrices}
          disabled={isLoadingPrices}
          className="flex items-center text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400"
        >
          <RefreshCcw className={`w-4 h-4 mr-1 ${isLoadingPrices ? 'animate-spin' : ''}`} />
          Refresh Prices
        </button>
      </div>

      {cabTypes.map((cab) => {
        const isSelected = cab.id === selectedCabId;
        const price = cabPrices[cab.id] || cab.price || 0;
        const isLoading = loadingCabIds.includes(cab.id) || isCalculating;
        
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
              <p className="text-sm text-gray-500 mb-2">Local package</p>
              
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
                    onClick={() => handleSelectCab(cab)}
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
