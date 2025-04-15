import React, { useEffect, useState, useCallback } from 'react';
import { CabType } from '@/types/cab';
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import axios from 'axios';
import { getApiUrl } from '@/config/api';

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
      const normalizedCabId = cabId.toLowerCase().replace(/\s+/g, '_');
      const apiUrl = getApiUrl() || '';
      const endpoint = `${apiUrl}/api/admin/direct-local-fares.php?vehicle_id=${normalizedCabId}`;
      
      console.log(`CabList: Directly fetching fare from database for ${normalizedCabId}`);
      const response = await axios.get(endpoint, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'X-Force-Refresh': 'true'
        },
        timeout: 5000
      });
      
      if (response.data && response.data.fares && Array.isArray(response.data.fares) && response.data.fares.length > 0) {
        const fareData = response.data.fares[0];
        
        let price = 0;
        if (packageId.includes('4hrs-40km')) {
          price = Number(fareData.price4hrs40km || 0);
        } else if (packageId.includes('8hrs-80km')) {
          price = Number(fareData.price8hrs80km || 0);
        } else if (packageId.includes('10hrs-100km')) {
          price = Number(fareData.price10hrs100km || 0);
        }
        
        if (price > 0) {
          console.log(`CabList: Retrieved fare directly from database API for ${normalizedCabId}: ₹${price}`);
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
            setLocalFares(prev => ({
              ...prev,
              [selectedCabId.toLowerCase().replace(/\s+/g, '_')]: price
            }));
            
            window.dispatchEvent(new CustomEvent('fare-calculated', {
              detail: {
                cabId: selectedCabId.toLowerCase().replace(/\s+/g, '_'),
                tripType: 'local',
                calculated: true,
                fare: price,
                packageId: hourlyPackage,
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
        const { cabId, fare, source } = customEvent.detail;
        
        if (customEvent.detail.tripType === tripType) {
          console.log(`CabList: Updating fare for ${cabId} to ${fare} from event (source: ${source || 'unknown'})`);
          
          setLocalFares(prev => ({
            ...prev,
            [cabId]: fare
          }));
          
          setLastFareUpdate(Date.now());
        }
      }
    };
    
    const handleFareSyncRequired = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.cabId && customEvent.detail.databaseFare) {
        const { cabId, databaseFare, tripType: eventTripType } = customEvent.detail;
        
        if (eventTripType === tripType) {
          console.log(`CabList: Synchronizing fare for ${cabId} to database value: ${databaseFare}`);
          
          setLocalFares(prev => ({
            ...prev,
            [cabId]: databaseFare
          }));
          
          setLastFareUpdate(Date.now());
        }
      }
    };
    
    const handleBookingSummaryFareUpdated = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.cabId && customEvent.detail.updatedFare) {
        const { cabId, updatedFare, tripType: eventTripType } = customEvent.detail;
        
        if (eventTripType === tripType) {
          console.log(`CabList: Updating fare from booking summary for ${cabId}: ${updatedFare}`);
          
          setLocalFares(prev => ({
            ...prev,
            [cabId]: updatedFare
          }));
          
          setLastFareUpdate(Date.now());
        }
      }
    };
    
    window.addEventListener('fare-calculated', handleFareCalculated);
    window.addEventListener('fare-sync-required', handleFareSyncRequired);
    window.addEventListener('booking-summary-fare-updated', handleBookingSummaryFareUpdated);
    
    return () => {
      window.removeEventListener('fare-calculated', handleFareCalculated);
      window.removeEventListener('fare-sync-required', handleFareSyncRequired);
      window.removeEventListener('booking-summary-fare-updated', handleBookingSummaryFareUpdated);
    };
  }, [tripType]);
  
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
              setLocalFares(prev => ({
                ...prev,
                [cab.id.toLowerCase().replace(/\s+/g, '_')]: price
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
        const cabFare = localFares[cabId] || cabFares[cab.id] || 0;
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
                onClick={() => !isCalculatingFares && handleSelectCab(cab)}
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
