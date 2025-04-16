
import React, { useEffect, useState } from 'react';
import { CabType } from '@/types/cab';
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, RefreshCw } from "lucide-react";
import { getApiUrl } from '@/config/api';
import { normalizePackageId, normalizeVehicleId } from '@/lib/packageData';
import { toast } from 'sonner';
import axios from 'axios';

interface CabListProps {
  cabTypes: CabType[];
  selectedCabId: string | null;
  onSelectCab: (cab: CabType) => void;
  distance: number;
  tripType: string;
  tripMode?: string;
  hourlyPackage?: string;
  pickupDate?: Date;
  returnDate?: Date | null;
  cabPrices?: Record<string, number>; 
  isCalculating?: boolean; 
  errors?: Record<string, string>;
}

export const CabList: React.FC<CabListProps> = ({
  cabTypes,
  selectedCabId,
  cabPrices = {}, 
  isCalculating = false,
  errors: cabErrors = {},
  onSelectCab: handleSelectCab,
  distance,
  tripType,
  hourlyPackage,
}) => {
  const [localFares, setLocalFares] = useState<Record<string, number>>(cabPrices);
  const [lastFareUpdate, setLastFareUpdate] = useState<number>(Date.now());
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Helper function for formatting the fare details
  const getFareDetails = (cab: CabType): string => {
    if (tripType === 'local') {
      return 'Local package';
    } else if (tripType === 'airport') {
      return 'Airport transfer';
    } else {
      return tripType === 'round-trip' ? 'Round trip' : 'One way';
    }
  };
  
  const fetchFareFromAPI = async (vehicleId: string, packageId?: string) => {
    if (!tripType || tripType !== 'local' || !packageId) return null;
    
    // Normalize cab ID and package ID for consistent lookups
    const normalizedCabId = normalizeVehicleId(vehicleId);
    const normalizedPackageId = normalizePackageId(packageId);
    
    // Check first if we have this fare in localStorage
    const storageKey = `selected_fare_${normalizedCabId}_${normalizedPackageId}`;
    const cachedFare = localStorage.getItem(storageKey);
    
    if (cachedFare && !isRefreshing) {
      const price = parseFloat(cachedFare);
      if (!isNaN(price) && price > 0) {
        console.log(`Using cached fare for ${normalizedCabId}: ${price}`);
        return price;
      }
    }
    
    try {
      // Try several possible API endpoints to maximize chances of success
      const endpoints = [
        `${getApiUrl('api/local-package-fares.php')}?vehicle_id=${normalizedCabId}&package_id=${normalizedPackageId}`,
        `${getApiUrl('api/admin/direct-local-fares.php')}?vehicle_id=${normalizedCabId}`,
        `/api/local-package-fares.php?vehicle_id=${normalizedCabId}&package_id=${normalizedPackageId}`,
        `/api/admin/direct-local-fares.php?vehicle_id=${normalizedCabId}`
      ];
      
      let price = 0;
      let success = false;
      
      for (const endpoint of endpoints) {
        try {
          console.log(`Trying endpoint: ${endpoint}`);
          const response = await axios.get(endpoint, {
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache',
              'X-Force-Refresh': 'true'
            },
            timeout: 3000
          });
          
          if (response.data) {
            if (response.data.price && response.data.price > 0) {
              price = Number(response.data.price);
              success = true;
              console.log(`Successfully fetched data from endpoint: ${endpoint}`);
              break;
            } else if (response.data.fares && Array.isArray(response.data.fares)) {
              const matchingFare = response.data.fares.find((f: any) => 
                (f.vehicleId === normalizedCabId || f.vehicle_id === normalizedCabId)
              );
              
              if (matchingFare) {
                if (normalizedPackageId.includes('4hrs-40km') && matchingFare.price_4hrs_40km) {
                  price = Number(matchingFare.price_4hrs_40km);
                } else if (normalizedPackageId.includes('8hrs-80km') && matchingFare.price_8hrs_80km) {
                  price = Number(matchingFare.price_8hrs_80km);
                } else if (normalizedPackageId.includes('10hrs-100km') && matchingFare.price_10hrs_100km) {
                  price = Number(matchingFare.price_10hrs_100km);
                }
                
                if (price > 0) {
                  success = true;
                  console.log(`Successfully fetched fare from endpoint: ${endpoint}`);
                  break;
                }
              }
            }
          }
        } catch (error) {
          console.log(`Error with endpoint ${endpoint}:`, error);
          continue; // Try next endpoint
        }
      }
      
      if (success && price > 0) {
        // Save to localStorage for future use
        localStorage.setItem(storageKey, price.toString());
        return price;
      }
      
      // If all API attempts fail, use fallback pricing
      return getFallbackPrice(normalizedCabId, normalizedPackageId);
    } catch (error) {
      console.error(`Error fetching fare for ${vehicleId}:`, error);
      return getFallbackPrice(normalizedCabId, normalizedPackageId);
    }
  };
  
  // Helper function to provide reliable fallback pricing when APIs fail
  const getFallbackPrice = (cabId: string, packageId: string) => {
    // Vehicle-specific pricing table for fallback
    const fallbackPrices: Record<string, Record<string, number>> = {
      'sedan': {
        '4hrs-40km': 1400,
        '8hrs-80km': 2400,
        '10hrs-100km': 3000
      },
      'ertiga': {
        '4hrs-40km': 1800,
        '8hrs-80km': 3000,
        '10hrs-100km': 3600
      },
      'innova_crysta': {
        '4hrs-40km': 2400,
        '8hrs-80km': 4000,
        '10hrs-100km': 4800
      },
      'innova_hycross': {
        '4hrs-40km': 2600,
        '8hrs-80km': 4200,
        '10hrs-100km': 5000
      },
      'tempo_traveller': {
        '4hrs-40km': 3000,
        '8hrs-80km': 5000,
        '10hrs-100km': 6000
      },
      'luxury': {
        '4hrs-40km': 2800,
        '8hrs-80km': 4500,
        '10hrs-100km': 5500
      },
      'dzire_cng': {
        '4hrs-40km': 1400,
        '8hrs-80km': 2400,
        '10hrs-100km': 3000
      },
      'etios': {
        '4hrs-40km': 1400,
        '8hrs-80km': 2400,
        '10hrs-100km': 3000
      }
    };
    
    // Find the most specific matching vehicle type
    let matchingVehicleType = 'sedan'; // Default fallback
    
    for (const vehicleType of Object.keys(fallbackPrices)) {
      if (cabId.includes(vehicleType)) {
        matchingVehicleType = vehicleType;
        break;
      }
    }
    
    // Special case for MPV which is often Hycross
    if (cabId === 'mpv') {
      matchingVehicleType = 'innova_hycross';
    }
    
    console.log(`No valid price received from API, using fallback calculation`);
    const fallbackFare = fallbackPrices[matchingVehicleType][packageId] || 3000;
    console.log(`Final price for ${cabId}, ${packageId}: ${fallbackFare}`);
    
    // Save the fallback fare
    localStorage.setItem(`selected_fare_${cabId}_${packageId}`, fallbackFare.toString());
    console.log(`Stored fare in localStorage: fare_local_${cabId}_${packageId} = ${fallbackFare}`);
    
    return fallbackFare;
  };
  
  // Initialize fares when component loads or when hourly package changes
  useEffect(() => {
    if (tripType === 'local' && hourlyPackage) {
      console.log(`Hourly package changed to ${hourlyPackage}, updating fares for all cabs`);
      
      const normalizedPackageId = normalizePackageId(hourlyPackage);
      
      // Update fares for each cab with the new package
      const updateFares = async () => {
        for (const cab of cabTypes) {
          try {
            const normalizedCabId = normalizeVehicleId(cab.id);
            const price = await fetchFareFromAPI(cab.id, normalizedPackageId);
            
            if (price && price > 0) {
              console.log(`Set fare for ${normalizedCabId}: ${price} (refreshed from API)`);
              
              setLocalFares(prev => ({
                ...prev,
                [normalizedCabId]: price
              }));
              
              // Save to localStorage
              localStorage.setItem(`selected_fare_${normalizedCabId}_${normalizedPackageId}`, price.toString());
            }
          } catch (error) {
            console.error(`Error updating fare for ${cab.id}:`, error);
          }
        }
        
        setIsRefreshing(false);
      };
      
      updateFares();
    }
  }, [hourlyPackage, tripType, cabTypes, isRefreshing]);
  
  // Update fares when cab is selected
  useEffect(() => {
    if (selectedCabId && tripType === 'local' && hourlyPackage) {
      const normalizedCabId = normalizeVehicleId(selectedCabId);
      const normalizedPackageId = normalizePackageId(hourlyPackage);
      
      fetchFareFromAPI(selectedCabId, normalizedPackageId)
        .then(price => {
          if (price && price > 0) {
            console.log(`CabList: Updating fare for ${normalizedCabId} to ${price}`);
            
            setLocalFares(prev => ({
              ...prev,
              [normalizedCabId]: price
            }));
          }
        });
    }
  }, [selectedCabId, tripType, hourlyPackage]);
  
  // Listen for fare updates from other components
  useEffect(() => {
    const handleFareCalculated = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.cabId && customEvent.detail.fare) {
        const { cabId, fare } = customEvent.detail;
        
        if (customEvent.detail.tripType === tripType) {
          console.log(`CabList: Updating fare for ${cabId} to ${fare} from event (source: ${customEvent.detail.source || 'unknown'})`);
          
          setLocalFares(prev => ({
            ...prev,
            [cabId]: fare
          }));
          
          setLastFareUpdate(Date.now());
        }
      }
    };
    
    window.addEventListener('fare-calculated', handleFareCalculated as EventListener);
    
    return () => {
      window.removeEventListener('fare-calculated', handleFareCalculated as EventListener);
    };
  }, [tripType]);
  
  // Initial sync with cabPrices from props
  useEffect(() => {
    setLocalFares(cabPrices);
  }, [cabPrices]);
  
  const formatPrice = (price?: number) => {
    if (!price && price !== 0) return "Price unavailable";
    return `₹${price.toLocaleString('en-IN')}`;
  };
  
  const handleRefreshFares = () => {
    setIsRefreshing(true);
    toast.info("Refreshing fares...");
    
    // This will trigger the useEffect for fetching fares
    setLastFareUpdate(Date.now());
  };

  if (cabTypes.length === 0) {
    return (
      <div className="text-center p-4">
        <p className="text-lg font-semibold">No vehicles available</p>
        <p className="text-muted-foreground">Please try selecting a different trip type.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button 
          onClick={handleRefreshFares}
          className="text-sm flex items-center px-3 py-1 rounded border bg-muted hover:bg-muted/80"
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh Fares
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cabTypes.map((cab) => {
          const isSelected = selectedCabId === cab.id;
          const normalizedCabId = normalizeVehicleId(cab.id);
          const cabFare = localFares[normalizedCabId] || localFares[cab.id] || cabPrices[normalizedCabId] || cabPrices[cab.id] || 0;
          const hasError = cabErrors[cab.id];
          
          return (
            <Card
              key={cab.id}
              className={`relative border overflow-hidden transition-all duration-200 h-full ${
                isSelected
                  ? "border-primary shadow-md ring-1 ring-primary"
                  : "hover:border-primary/50 hover:shadow-sm"
              }`}
            >
              <CardContent className="p-4 h-full flex flex-col">
                <div className="relative mb-4 pb-[56.25%] overflow-hidden rounded-md bg-muted">
                  <img
                    src={cab.image || "/cars/sedan.png"}
                    alt={cab.name}
                    className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500"
                  />
                </div>

                <h3 className="text-lg font-semibold leading-tight">{cab.name}</h3>
                <p className="text-muted-foreground text-sm mb-2">
                  {getFareDetails(cab)}
                </p>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-secondary/40 rounded px-2 py-1">
                    <p className="text-xs text-muted-foreground">Capacity</p>
                    <p className="font-medium">{cab.capacity} People</p>
                  </div>
                  <div className="bg-secondary/40 rounded px-2 py-1">
                    <p className="text-xs text-muted-foreground">Luggage</p>
                    <p className="font-medium">{cab.luggageCapacity} Bags</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 mt-auto mb-3">
                  {cab.amenities?.slice(0, 3).map((amenity, index) => (
                    <span
                      key={index}
                      className="text-xs px-2 py-1 bg-secondary/40 rounded-full"
                    >
                      {amenity}
                    </span>
                  ))}
                  {cab.amenities && cab.amenities.length > 3 && (
                    <span className="text-xs px-2 py-1 bg-secondary/40 rounded-full">
                      +{cab.amenities.length - 3} more
                    </span>
                  )}
                </div>

                <div
                  onClick={() => {
                    if (!isCalculating) {
                      handleSelectCab(cab);
                      
                      if (tripType === 'local' && hourlyPackage && cabFare > 0) {
                        const normalizedPackageId = normalizePackageId(hourlyPackage);
                        localStorage.setItem(`selected_fare_${normalizedCabId}_${normalizedPackageId}`, cabFare.toString());
                        
                        toast.success(`Selected ${cab.name} - ${formatPrice(cabFare)}`, {
                          id: `cab-selection-${normalizedCabId}`,
                          duration: 3000
                        });
                      }
                    }
                  }}
                  className={`flex items-center justify-between p-3 mt-auto w-full rounded-md cursor-pointer transition-colors font-medium ${
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80"
                  }`}
                >
                  <span>
                    {isSelected ? "Selected" : "Select"}
                  </span>
                  <span className="font-semibold">
                    {isCalculating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : hasError ? (
                      <span className="text-xs text-destructive">{hasError}</span>
                    ) : cabFare > 0 ? (
                      formatPrice(cabFare)
                    ) : (
                      <span className="text-xs">Getting price...</span>
                    )}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default CabList;
