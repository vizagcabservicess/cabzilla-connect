
import React, { useEffect, useState, useCallback } from 'react';
import { CabType } from '@/types/cab';
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import axios from 'axios';
import { getApiUrl } from '@/config/api';
import { toast } from 'sonner';

interface CabListProps {
  cabTypes: CabType[];
  selectedCabId: string | null;
  cabFares: Record<string, number>;
  isCalculatingFares: boolean;
  cabErrors?: Record<string, string>;
  handleSelectCab: (cab: CabType) => void;
  getFareDetails: (cab: CabType) => string;
  tripType?: string;
  hourlyPackage?: string;
}

export const CabList: React.FC<CabListProps> = ({
  cabTypes,
  selectedCabId,
  cabFares,
  isCalculatingFares,
  cabErrors = {},
  handleSelectCab,
  getFareDetails,
  tripType,
  hourlyPackage
}) => {
  const [localFares, setLocalFares] = useState<Record<string, number>>(cabFares);
  const [lastFareUpdate, setLastFareUpdate] = useState<number>(Date.now());
  
  const fetchFareFromDatabase = useCallback(async (cabId: string, packageId?: string) => {
    if (!tripType || tripType !== 'local' || !packageId) return null;
    
    try {
      // First try with direct-booking-data.php
      const normalizedCabId = cabId.toLowerCase().replace(/\s+/g, '_');
      const apiUrl = getApiUrl(`api/user/direct-booking-data.php?check_sync=true&vehicle_id=${normalizedCabId}&package_id=${packageId}`);
      
      console.log(`CabList: Fetching fare from primary API for ${normalizedCabId} - ${packageId}`);
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
          console.log(`CabList: Retrieved fare from primary API: ₹${price} for ${normalizedCabId} - ${packageId}`);
          
          // Broadcast the source of this fare for debugging and consistency tracking
          window.dispatchEvent(new CustomEvent('fare-source-update', {
            detail: {
              cabId: normalizedCabId,
              packageId: packageId,
              fare: price,
              source: 'direct-booking-data',
              apiUrl: apiUrl,
              timestamp: Date.now()
            }
          }));
          
          // Save the selected fare in localStorage for consistency
          localStorage.setItem(`selected_fare_${normalizedCabId}_${packageId}`, price.toString());
          
          return price;
        }
      } else if (response.data && response.data.data) {
        // Handle alternative response format
        const data = response.data.data;
        let price = 0;
        
        if (packageId.includes('4hrs-40km') && data.price4hrs40km) {
          price = Number(data.price4hrs40km);
        } else if (packageId.includes('8hrs-80km') && data.price8hrs80km) {
          price = Number(data.price8hrs80km);
        } else if (packageId.includes('10hrs-100km') && data.price10hrs100km) {
          price = Number(data.price10hrs100km);
        }
        
        if (price > 0) {
          console.log(`CabList: Retrieved fare from alternate format: ₹${price} for ${normalizedCabId} - ${packageId}`);
          
          // Broadcast the source of this fare
          window.dispatchEvent(new CustomEvent('fare-source-update', {
            detail: {
              cabId: normalizedCabId,
              packageId: packageId,
              fare: price,
              source: 'direct-booking-data-alternate',
              apiUrl: apiUrl,
              timestamp: Date.now()
            }
          }));
          
          // Save the selected fare in localStorage for consistency
          localStorage.setItem(`selected_fare_${normalizedCabId}_${packageId}`, price.toString());
          
          return price;
        }
      }
      
      // If primary API fails, try local-package-fares.php
      const localFaresUrl = getApiUrl(`api/local-package-fares.php?vehicle_id=${normalizedCabId}&package_id=${packageId}`);
      
      console.log(`CabList: Trying local-package-fares API for ${normalizedCabId} - ${packageId}`);
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
          console.log(`CabList: Retrieved fare from local-package-fares API: ₹${price} for ${normalizedCabId} - ${packageId}`);
          
          // Broadcast the source of this fare
          window.dispatchEvent(new CustomEvent('fare-source-update', {
            detail: {
              cabId: normalizedCabId,
              packageId: packageId,
              fare: price,
              source: 'local-package-fares',
              apiUrl: localFaresUrl,
              timestamp: Date.now()
            }
          }));
          
          // Save the selected fare in localStorage for consistency
          localStorage.setItem(`selected_fare_${normalizedCabId}_${packageId}`, price.toString());
          
          return price;
        }
      }
      
      // If that fails too, try fallback API
      const fallbackApiUrl = getApiUrl(`api/admin/direct-local-fares.php?vehicle_id=${normalizedCabId}`);
      
      console.log(`CabList: Trying fallback API for ${normalizedCabId}`);
      const fallbackResponse = await axios.get(fallbackApiUrl, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'X-Force-Refresh': 'true'
        },
        timeout: 5000
      });
      
      if (fallbackResponse.data && fallbackResponse.data.fares && Array.isArray(fallbackResponse.data.fares) && fallbackResponse.data.fares.length > 0) {
        const fareData = fallbackResponse.data.fares[0];
        
        let price = 0;
        if (packageId.includes('4hrs-40km')) {
          price = Number(fareData.price4hrs40km || 0);
        } else if (packageId.includes('8hrs-80km')) {
          price = Number(fareData.price8hrs80km || 0);
        } else if (packageId.includes('10hrs-100km')) {
          price = Number(fareData.price10hrs100km || 0);
        }
        
        if (price > 0) {
          console.log(`CabList: Retrieved fare from fallback API: ₹${price} for ${normalizedCabId}`);
          
          // Broadcast the source of this fare
          window.dispatchEvent(new CustomEvent('fare-source-update', {
            detail: {
              cabId: normalizedCabId,
              packageId: packageId,
              fare: price,
              source: 'direct-local-fares',
              apiUrl: fallbackApiUrl,
              timestamp: Date.now()
            }
          }));
          
          // Save the selected fare in localStorage for consistency
          localStorage.setItem(`selected_fare_${normalizedCabId}_${packageId}`, price.toString());
          
          return price;
        }
      }
      
      return null;
    } catch (error) {
      console.error(`CabList: Error fetching fare for ${cabId}:`, error);
      return null;
    }
  }, [tripType]);
  
  useEffect(() => {
    if (selectedCabId && tripType === 'local' && hourlyPackage) {
      fetchFareFromDatabase(selectedCabId, hourlyPackage)
        .then(price => {
          if (price && price > 0) {
            const normalizedCabId = selectedCabId.toLowerCase().replace(/\s+/g, '_');
            
            setLocalFares(prev => ({
              ...prev,
              [normalizedCabId]: price
            }));
            
            // Save to localStorage for the BookingSummary to use
            localStorage.setItem(`selected_fare_${normalizedCabId}_${hourlyPackage}`, price.toString());
            
            // Broadcast to ensure other components use the same price
            window.dispatchEvent(new CustomEvent('fare-calculated', {
              detail: {
                cabId: normalizedCabId,
                tripType: 'local',
                calculated: true,
                fare: price,
                packageId: hourlyPackage,
                source: 'database-direct-cablist',
                timestamp: Date.now()
              }
            }));
            
            // Also send a global fare update for all components
            window.dispatchEvent(new CustomEvent('global-fare-update', {
              detail: {
                cabId: normalizedCabId,
                tripType: 'local',
                packageId: hourlyPackage,
                fare: price,
                source: 'database-direct-cablist',
                timestamp: Date.now()
              }
            }));
          }
        });
    }
  }, [selectedCabId, tripType, hourlyPackage, fetchFareFromDatabase]);
  
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
    
    const handleBookingSummaryFareUpdated = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.cabId && customEvent.detail.fare) {
        const { cabId, fare, tripType: eventTripType, packageId } = customEvent.detail;
        
        if (eventTripType === tripType) {
          console.log(`CabList: Updating fare from booking summary for ${cabId}: ${fare}`);
          
          setLocalFares(prev => ({
            ...prev,
            [cabId]: fare
          }));
          
          // Save to localStorage for consistency across components
          if (packageId) {
            localStorage.setItem(`selected_fare_${cabId}_${packageId}`, fare.toString());
          }
          
          setLastFareUpdate(Date.now());
          
          // If we're getting frequent price updates for a cab that's different from what we had,
          // inform the user
          if (cabId === selectedCabId?.toLowerCase().replace(/\s+/g, '_')) {
            const selectedCabFare = cabFares[cabId];
            if (Math.abs(selectedCabFare - fare) > 100) {
              toast.info(`Price updated: ₹${fare}`, {
                id: `price-update-${cabId}`,
                duration: 3000
              });
            }
          }
        }
      }
    };
    
    const handleCabSelection = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.cabId && customEvent.detail.fare) {
        const { cabId, fare, packageId } = customEvent.detail;
        
        if (tripType === 'local' && packageId) {
          console.log(`CabList: Saving selected fare for ${cabId} with package ${packageId}: ₹${fare}`);
          
          // Save the selected fare in localStorage
          localStorage.setItem(`selected_fare_${cabId}_${packageId}`, fare.toString());
        }
      }
    };
    
    window.addEventListener('fare-calculated', handleFareCalculated as EventListener);
    window.addEventListener('global-fare-update', handleGlobalFareUpdate as EventListener);
    window.addEventListener('fare-sync-required', handleFareSyncRequired as EventListener);
    window.addEventListener('booking-summary-update', handleBookingSummaryFareUpdated as EventListener);
    window.addEventListener('booking-summary-fare-updated', handleBookingSummaryFareUpdated as EventListener);
    window.addEventListener('cab-selected', handleCabSelection as EventListener);
    
    return () => {
      window.removeEventListener('fare-calculated', handleFareCalculated as EventListener);
      window.removeEventListener('global-fare-update', handleGlobalFareUpdate as EventListener);
      window.removeEventListener('fare-sync-required', handleFareSyncRequired as EventListener);
      window.removeEventListener('booking-summary-update', handleBookingSummaryFareUpdated as EventListener);
      window.removeEventListener('booking-summary-fare-updated', handleBookingSummaryFareUpdated as EventListener);
      window.removeEventListener('cab-selected', handleCabSelection as EventListener);
    };
  }, [tripType, selectedCabId, cabFares]);
  
  useEffect(() => {
    setLocalFares(cabFares);
  }, [cabFares]);
  
  useEffect(() => {
    if (tripType === 'local' && hourlyPackage) {
      const fetchAllFares = async () => {
        console.log(`CabList: Pre-fetching fares for all cabs with package ${hourlyPackage}`);
        
        for (const cab of cabTypes) {
          try {
            const price = await fetchFareFromDatabase(cab.id, hourlyPackage);
            if (price && price > 0) {
              const normalizedCabId = cab.id.toLowerCase().replace(/\s+/g, '_');
              
              setLocalFares(prev => ({
                ...prev,
                [normalizedCabId]: price
              }));
              
              // Save the selected fare in localStorage
              localStorage.setItem(`selected_fare_${normalizedCabId}_${hourlyPackage}`, price.toString());
              
              // Broadcast the prices to ensure consistency across components
              window.dispatchEvent(new CustomEvent('global-fare-update', {
                detail: {
                  cabId: normalizedCabId,
                  tripType: 'local',
                  packageId: hourlyPackage,
                  fare: price,
                  source: 'database-direct-cablist-prefetch',
                  timestamp: Date.now()
                }
              }));
            }
          } catch (error) {
            console.error(`Error pre-fetching fare for ${cab.id}:`, error);
          }
        }
      };
      
      fetchAllFares();
    }
  }, [tripType, hourlyPackage, cabTypes, fetchFareFromDatabase]);
  
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
        const cabId = cab.id.toLowerCase().replace(/\s+/g, '_');
        const cabFare = localFares[cabId] || localFares[cab.id] || cabFares[cabId] || cabFares[cab.id] || 0;
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
                    
                    // When a cab is selected, store its price in localStorage for BookingSummary
                    if (tripType === 'local' && hourlyPackage && cabFare > 0) {
                      const normalizedCabId = cab.id.toLowerCase().replace(/\s+/g, '_');
                      console.log(`CabList: Saving selected fare for ${normalizedCabId}: ₹${cabFare}`);
                      
                      localStorage.setItem(`selected_fare_${normalizedCabId}_${hourlyPackage}`, cabFare.toString());
                      
                      // Dispatch an event to notify other components of the selection
                      window.dispatchEvent(new CustomEvent('cab-selected', {
                        detail: {
                          cabId: normalizedCabId,
                          cabName: cab.name,
                          tripType: tripType,
                          packageId: hourlyPackage,
                          fare: cabFare,
                          timestamp: Date.now()
                        }
                      }));
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
