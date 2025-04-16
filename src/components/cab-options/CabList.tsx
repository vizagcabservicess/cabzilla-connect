import React, { useEffect, useState, useCallback } from 'react';
import { CabType } from '@/types/cab';
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import axios from 'axios';
import { getApiUrl } from '@/config/api';
import { normalizePackageId, normalizeVehicleId } from '@/config/requestConfig';
import { toast } from 'sonner';

interface CabListProps {
  cabTypes: CabType[];
  selectedCabId: string | null;
  cabFares: Record<string, number>;
  isLoading: boolean;
  errors?: Record<string, string>;
  onSelectCab: (cab: CabType) => void;
  distance: number;
  tripType: string;
  tripMode?: string;
  hourlyPackage?: string;
  pickupDate?: Date;
  returnDate?: Date | null;
}

export const CabList: React.FC<CabListProps> = ({
  cabTypes,
  selectedCabId,
  cabFares,
  isLoading: isCalculatingFares,
  errors: cabErrors = {},
  onSelectCab: handleSelectCab,
  distance,
  tripType,
  hourlyPackage,
  // Other props can be destructured here if needed
}) => {
  const [localFares, setLocalFares] = useState<Record<string, number>>(cabFares);
  const [lastFareUpdate, setLastFareUpdate] = useState<number>(Date.now());
  const [requestRetryCount, setRequestRetryCount] = useState<Record<string, number>>({});
  
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
  
  const fetchFareFromDatabase = useCallback(async (cabId: string, packageId?: string) => {
    if (!tripType || tripType !== 'local' || !packageId) return null;
    
    // Normalize cab ID and package ID for consistent lookups
    const normalizedCabId = normalizeVehicleId(cabId);
    const normalizedPackageId = normalizePackageId(packageId);
    
    // This unique key tracks retry attempts for this specific request
    const requestKey = `${normalizedCabId}_${normalizedPackageId}`;
    
    // Track retry attempts
    const currentRetryCount = requestRetryCount[requestKey] || 0;
    if (currentRetryCount > 3) {
      console.log(`CabList: Maximum retry attempts reached for ${normalizedCabId}, using fallback pricing`);
      return useFallbackPricing(normalizedCabId, normalizedPackageId);
    }
    
    try {
      // First try with direct-booking-data.php
      const apiUrl = getApiUrl(`api/user/direct-booking-data.php?check_sync=true&vehicle_id=${normalizedCabId}&package_id=${normalizedPackageId}`);
      
      console.log(`CabList: Fetching fare from primary API for ${normalizedCabId} - ${normalizedPackageId}`);
      const response = await axios.get(apiUrl, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'X-Force-Refresh': 'true'
        },
        timeout: 5000
      });
      
      if (response.data && response.data.status === 'success' && response.data.price) {
        const price = Number(response.data.price);
        if (price > 0) {
          console.log(`CabList: Retrieved fare from primary API: ₹${price} for ${normalizedCabId} - ${normalizedPackageId}`);
          
          // Broadcast the source of this fare for debugging and consistency tracking
          window.dispatchEvent(new CustomEvent('fare-source-update', {
            detail: {
              cabId: normalizedCabId,
              packageId: normalizedPackageId,
              fare: price,
              source: 'direct-booking-data',
              apiUrl: apiUrl,
              timestamp: Date.now()
            }
          }));
          
          // Save the selected fare in localStorage for consistency
          localStorage.setItem(`selected_fare_${normalizedCabId}_${normalizedPackageId}`, price.toString());
          
          return price;
        }
      } else if (response.data && response.data.data) {
        // Handle alternative response format
        const data = response.data.data;
        let price = 0;
        
        if (normalizedPackageId.includes('4hrs-40km') && data.price4hrs40km) {
          price = Number(data.price4hrs40km);
        } else if (normalizedPackageId.includes('8hrs-80km') && data.price8hrs80km) {
          price = Number(data.price8hrs80km);
        } else if (normalizedPackageId.includes('10hrs-100km') && data.price10hrs100km) {
          price = Number(data.price10hrs100km);
        }
        
        if (price > 0) {
          console.log(`CabList: Retrieved fare from alternate format: ₹${price} for ${normalizedCabId} - ${normalizedPackageId}`);
          
          // Broadcast the source of this fare
          window.dispatchEvent(new CustomEvent('fare-source-update', {
            detail: {
              cabId: normalizedCabId,
              packageId: normalizedPackageId,
              fare: price,
              source: 'direct-booking-data-alternate',
              apiUrl: apiUrl,
              timestamp: Date.now()
            }
          }));
          
          // Save the selected fare in localStorage for consistency
          localStorage.setItem(`selected_fare_${normalizedCabId}_${normalizedPackageId}`, price.toString());
          
          return price;
        }
      }
      
      // If primary API fails, try local-package-fares.php
      const localFaresUrl = getApiUrl(`api/local-package-fares.php?vehicle_id=${normalizedCabId}&package_id=${normalizedPackageId}`);
      
      console.log(`CabList: Trying local-package-fares API for ${normalizedCabId} - ${normalizedPackageId}`);
      const localFaresResponse = await axios.get(localFaresUrl, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'X-Force-Refresh': 'true'
        },
        timeout: 5000
      });
      
      if (localFaresResponse.data && localFaresResponse.data.status === 'success' && localFaresResponse.data.price) {
        const price = Number(localFaresResponse.data.price);
        if (price > 0) {
          console.log(`CabList: Retrieved fare from local-package-fares API: ₹${price} for ${normalizedCabId} - ${normalizedPackageId}`);
          
          // Broadcast the source of this fare
          window.dispatchEvent(new CustomEvent('fare-source-update', {
            detail: {
              cabId: normalizedCabId,
              packageId: normalizedPackageId,
              fare: price,
              source: 'local-package-fares',
              apiUrl: localFaresUrl,
              timestamp: Date.now()
            }
          }));
          
          // Save the selected fare in localStorage for consistency
          localStorage.setItem(`selected_fare_${normalizedCabId}_${normalizedPackageId}`, price.toString());
          
          return price;
        }
      }
      
      // Try from local storage if API calls fail
      return checkLocalStorageFallback(normalizedCabId, normalizedPackageId);
      
    } catch (error) {
      console.error(`CabList: Error fetching fare for ${cabId}:`, error);
      
      // Increment retry count for this request
      setRequestRetryCount(prev => ({
        ...prev,
        [requestKey]: currentRetryCount + 1
      }));
      
      // Check local storage or use fallback pricing
      return checkLocalStorageFallback(normalizedCabId, normalizedPackageId);
    }
  }, [tripType, requestRetryCount]);
  
  // Helper function to check localStorage or use fallback pricing
  const checkLocalStorageFallback = (cabId: string, packageId: string) => {
    // Check from local storage first
    const selectedFareKey = `selected_fare_${cabId}_${packageId}`;
    const cachedFare = localStorage.getItem(selectedFareKey);
    if (cachedFare) {
      const parsedFare = parseFloat(cachedFare);
      if (!isNaN(parsedFare) && parsedFare > 0) {
        console.log(`CabList: Using cached fare: ₹${parsedFare} for ${cabId} - ${packageId}`);
        return parsedFare;
      }
    }
    
    // Use fallback pricing system if local storage doesn't have a valid fare
    return useFallbackPricing(cabId, packageId);
  };
  
  // Function to provide reliable fallback pricing when APIs fail
  const useFallbackPricing = (cabId: string, packageId: string) => {
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
      'tempo': {
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
    
    // Get the vehicle category pricing
    let matchingVehicleType = 'sedan'; // Default fallback
    
    // Find the most specific matching vehicle type
    for (const vehicleType of Object.keys(fallbackPrices)) {
      if (cabId.includes(vehicleType)) {
        matchingVehicleType = vehicleType;
        break;
      }
    }
    
    const fallbackFare = fallbackPrices[matchingVehicleType][packageId] || 3000;
    
    console.log(`CabList: Using fallback pricing: ₹${fallbackFare} for ${cabId} - ${packageId} (matched to ${matchingVehicleType})`);
    
    // Save the fallback fare
    localStorage.setItem(`selected_fare_${cabId}_${packageId}`, fallbackFare.toString());
    
    // Broadcast the fallback fare
    window.dispatchEvent(new CustomEvent('fare-source-update', {
      detail: {
        cabId: cabId,
        packageId: packageId,
        fare: fallbackFare,
        source: 'fallback-pricing',
        timestamp: Date.now()
      }
    }));
    
    return fallbackFare;
  };
  
  // Initialize fares for each cab when hourly package changes
  useEffect(() => {
    if (tripType === 'local' && hourlyPackage) {
      console.log(`CabList: Hourly package changed to ${hourlyPackage}, updating fares for all cabs`);
      
      const normalizedPackageId = normalizePackageId(hourlyPackage);
      console.log(`CabList: Normalized package ID: ${normalizedPackageId}`);
      
      // Update fares for each cab with the new package
      const updateFares = async () => {
        for (const cab of cabTypes) {
          try {
            const normalizedCabId = normalizeVehicleId(cab.id);
            
            // Check if we already have a fare for this cab and package
            const selectedFareKey = `selected_fare_${normalizedCabId}_${normalizedPackageId}`;
            const cachedFare = localStorage.getItem(selectedFareKey);
            
            if (cachedFare) {
              const parsedFare = parseFloat(cachedFare);
              if (!isNaN(parsedFare) && parsedFare > 0) {
                console.log(`CabList: Using cached fare: ₹${parsedFare} for ${normalizedCabId} - ${normalizedPackageId}`);
                
                setLocalFares(prev => ({
                  ...prev,
                  [normalizedCabId]: parsedFare
                }));
                continue;
              }
            }
            
            // Fetch fare from database
            const price = await fetchFareFromDatabase(cab.id, normalizedPackageId);
            if (price && price > 0) {
              console.log(`CabList: Updated fare for ${normalizedCabId} to ${price}`);
              
              setLocalFares(prev => ({
                ...prev,
                [normalizedCabId]: price
              }));
              
              // Save to localStorage
              localStorage.setItem(selectedFareKey, price.toString());
              
              // Broadcast for global consistency
              window.dispatchEvent(new CustomEvent('fare-calculated', {
                detail: {
                  cabId: normalizedCabId,
                  tripType: 'local',
                  calculated: true,
                  fare: price,
                  packageId: normalizedPackageId,
                  source: 'cab-list-package-update',
                  timestamp: Date.now()
                }
              }));
            }
          } catch (error) {
            console.error(`Error updating fare for ${cab.id}:`, error);
          }
        }
      };
      
      updateFares();
    }
  }, [hourlyPackage, tripType, cabTypes, fetchFareFromDatabase]);
  
  // Update fares when cab is selected
  useEffect(() => {
    if (selectedCabId && tripType === 'local' && hourlyPackage) {
      const normalizedCabId = normalizeVehicleId(selectedCabId);
      const normalizedPackageId = normalizePackageId(hourlyPackage);
      
      console.log(`CabList: Selected cab changed to ${normalizedCabId}, updating fare for package ${normalizedPackageId}`);
      
      fetchFareFromDatabase(selectedCabId, normalizedPackageId)
        .then(price => {
          if (price && price > 0) {
            console.log(`CabList: Updated fare for selected cab ${normalizedCabId} to ${price}`);
            
            setLocalFares(prev => ({
              ...prev,
              [normalizedCabId]: price
            }));
            
            // Save to localStorage
            localStorage.setItem(`selected_fare_${normalizedCabId}_${normalizedPackageId}`, price.toString());
            
            // Broadcast to ensure other components use the same price
            window.dispatchEvent(new CustomEvent('fare-calculated', {
              detail: {
                cabId: normalizedCabId,
                tripType: 'local',
                calculated: true,
                fare: price,
                packageId: normalizedPackageId,
                source: 'cab-list-selection',
                timestamp: Date.now()
              }
            }));
            
            // Also send a global fare update for all components
            window.dispatchEvent(new CustomEvent('global-fare-update', {
              detail: {
                cabId: normalizedCabId,
                tripType: 'local',
                packageId: normalizedPackageId,
                fare: price,
                source: 'cab-list-selection',
                timestamp: Date.now()
              }
            }));
          }
        });
    }
  }, [selectedCabId, tripType, hourlyPackage, fetchFareFromDatabase]);
  
  // Listen for fare updates from other components
  useEffect(() => {
    const handleFareCalculated = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.cabId && customEvent.detail.fare) {
        const { cabId, fare, source, packageId } = customEvent.detail;
        
        if (customEvent.detail.tripType === tripType) {
          console.log(`CabList: Updating fare for ${cabId} to ${fare} from event (source: ${source || 'unknown'})`);
          
          setLocalFares(prev => ({
            ...prev,
            [cabId]: fare
          }));
          
          // Save to localStorage for the BookingSummary to use
          if (packageId) {
            localStorage.setItem(`selected_fare_${cabId}_${packageId}`, fare.toString());
          }
          
          setLastFareUpdate(Date.now());
        }
      }
    };
    
    const handleGlobalFareUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.cabId && customEvent.detail.fare) {
        const { cabId, fare, source, packageId } = customEvent.detail;
        
        if (!customEvent.detail.tripType || customEvent.detail.tripType === tripType) {
          console.log(`CabList: Received global fare update: ${fare} for ${cabId} (source: ${source || 'unknown'})`);
          
          setLocalFares(prev => ({
            ...prev,
            [cabId]: fare
          }));
          
          // Save to localStorage for the BookingSummary to use
          if (packageId) {
            localStorage.setItem(`selected_fare_${cabId}_${packageId}`, fare.toString());
          }
          
          setLastFareUpdate(Date.now());
        }
      }
    };
    
    const handleFareSyncRequired = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.cabId && customEvent.detail.databaseFare) {
        const { cabId, databaseFare, tripType: eventTripType, packageId } = customEvent.detail;
        
        if (eventTripType === tripType) {
          console.log(`CabList: Synchronizing fare for ${cabId} to database value: ${databaseFare}`);
          
          setLocalFares(prev => ({
            ...prev,
            [cabId]: databaseFare
          }));
          
          // Save to localStorage for the BookingSummary to use
          if (packageId) {
            localStorage.setItem(`selected_fare_${cabId}_${packageId}`, databaseFare.toString());
          }
          
          setLastFareUpdate(Date.now());
        }
      }
    };
    
    const handlePackageSelected = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.packageId) {
        const { packageId } = customEvent.detail;
        console.log(`CabList: Package selected: ${packageId}`);
        
        // Update fares for all cabs with the new package
        if (tripType === 'local') {
          const normalizedPackageId = normalizePackageId(packageId);
          
          cabTypes.forEach(cab => {
            const normalizedCabId = normalizeVehicleId(cab.id);
            
            // Try to get fare from localStorage first
            const selectedFareKey = `selected_fare_${normalizedCabId}_${normalizedPackageId}`;
            const cachedFare = localStorage.getItem(selectedFareKey);
            
            if (cachedFare) {
              const parsedFare = parseFloat(cachedFare);
              if (!isNaN(parsedFare) && parsedFare > 0) {
                console.log(`CabList: Using cached fare for package change: ₹${parsedFare} for ${normalizedCabId}`);
                
                setLocalFares(prev => ({
                  ...prev,
                  [normalizedCabId]: parsedFare
                }));
              }
            } else {
              // Fetch from database if not in localStorage - add debounce to avoid too many requests
              setTimeout(() => {
                fetchFareFromDatabase(cab.id, normalizedPackageId)
                  .then(price => {
                    if (price && price > 0) {
                      console.log(`CabList: Updated fare for ${normalizedCabId} to ${price} for package ${normalizedPackageId}`);
                      
                      setLocalFares(prev => ({
                        ...prev,
                        [normalizedCabId]: price
                      }));
                      
                      // Save to localStorage
                      localStorage.setItem(selectedFareKey, price.toString());
                    }
                  })
                  .catch(error => {
                    console.error(`Error fetching fare for ${cab.id}:`, error);
                  });
              }, Math.random() * 1000); // Stagger requests to avoid overwhelming the server
            }
          });
          
          setLastFareUpdate(Date.now());
        }
      }
    };
    
    window.addEventListener('fare-calculated', handleFareCalculated as EventListener);
    window.addEventListener('global-fare-update', handleGlobalFareUpdate as EventListener);
    window.addEventListener('fare-sync-required', handleFareSyncRequired as EventListener);
    window.addEventListener('hourly-package-selected', handlePackageSelected as EventListener);
    
    return () => {
      window.removeEventListener('fare-calculated', handleFareCalculated as EventListener);
      window.removeEventListener('global-fare-update', handleGlobalFareUpdate as EventListener);
      window.removeEventListener('fare-sync-required', handleFareSyncRequired as EventListener);
      window.removeEventListener('hourly-package-selected', handlePackageSelected as EventListener);
    };
  }, [tripType, cabTypes, fetchFareFromDatabase]);
  
  // Initial sync with cabFares from props
  useEffect(() => {
    setLocalFares(cabFares);
  }, [cabFares]);
  
  const formatPrice = (price?: number) => {
    if (!price && price !== 0) return "Price unavailable";
    return `₹${price.toLocaleString('en-IN')}`;
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {cabTypes.map((cab) => {
        const isSelected = selectedCabId === cab.id;
        const normalizedCabId = normalizeVehicleId(cab.id);
        const cabFare = localFares[normalizedCabId] || localFares[cab.id] || cabFares[normalizedCabId] || cabFares[cab.id] || 0;
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
                  if (!isCalculatingFares) {
                    handleSelectCab(cab);
                    
                    // When a cab is selected, broadcast the selection event with fare info
                    if (tripType === 'local' && hourlyPackage && cabFare > 0) {
                      const normalizedPackageId = normalizePackageId(hourlyPackage);
                      console.log(`CabList: Cab selected: ${normalizedCabId} with fare ₹${cabFare} for package ${normalizedPackageId}`);
                      
                      // Ensure the fare is saved in localStorage with the standard format
                      localStorage.setItem(`selected_fare_${normalizedCabId}_${normalizedPackageId}`, cabFare.toString());
                      
                      // Dispatch a cab selection event
                      window.dispatchEvent(new CustomEvent('cab-selected', {
                        detail: {
                          cabId: normalizedCabId,
                          cabName: cab.name,
                          tripType: tripType,
                          packageId: normalizedPackageId,
                          fare: cabFare,
                          timestamp: Date.now()
                        }
                      }));
                      
                      // Also dispatch a fare update event
                      window.dispatchEvent(new CustomEvent('fare-calculated', {
                        detail: {
                          cabId: normalizedCabId,
                          tripType: 'local',
                          calculated: true,
                          fare: cabFare,
                          packageId: normalizedPackageId,
                          source: 'cab-selection',
                          timestamp: Date.now()
                        }
                      }));
                      
                      // Forcefully update BookingSummary component
                      window.dispatchEvent(new CustomEvent('booking-summary-update', {
                        detail: {
                          cabId: normalizedCabId,
                          tripType: tripType,
                          packageId: normalizedPackageId,
                          cabName: cab.name,
                          fare: cabFare,
                          source: 'cab-selection-direct',
                          timestamp: Date.now()
                        }
                      }));
                      
                      // Notify user with toast
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
                  {isCalculatingFares ? (
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
  );
}
