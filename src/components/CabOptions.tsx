
import React, { useState, useEffect } from 'react';
import { CabType, FareCalculationParams } from '@/types/cab';
import { CabOptionCard } from './CabOptionCard';
import { TripType, TripMode } from '@/lib/tripTypes';
import { calculateFare } from '@/lib/fareCalculationService';
import { formatTravelTime } from '@/lib/locationData';

interface CabOptionsProps {
  cabTypes: CabType[];
  selectedCab: CabType | null;
  onSelectCab: (cab: CabType) => void;
  distance: number;
  tripType: TripType;
  tripMode: TripMode;
  hourlyPackage?: string;
  pickupDate?: Date;
  returnDate?: Date | null;
}

export function CabOptions({
  cabTypes,
  selectedCab,
  onSelectCab,
  distance,
  tripType,
  tripMode,
  hourlyPackage,
  pickupDate,
  returnDate
}: CabOptionsProps) {
  const [fares, setFares] = useState<Record<string, number>>({});
  const [fareDetails, setFareDetails] = useState<Record<string, string>>({});
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [pendingFareUpdates, setPendingFareUpdates] = useState<Record<string, number>>({});
  
  // Track when fares are being calculated
  useEffect(() => {
    const calculateFares = async () => {
      if (distance <= 0) {
        setFares({});
        return;
      }
      
      setIsCalculating(true);
      
      try {
        // Object to store all fare calculations
        const calculatedFares: Record<string, number> = {};
        const calculatedFareDetails: Record<string, string> = {};
        
        // Calculate fare for each cab type
        for (const cab of cabTypes) {
          try {
            const params: FareCalculationParams = {
              cabType: cab,
              distance,
              tripType,
              tripMode,
              hourlyPackage,
              pickupDate,
              returnDate,
            };
            
            const fare = await calculateFare(params);
            calculatedFares[cab.id] = fare;
            
            // Set fare details based on trip type
            if (tripType === 'airport') {
              calculatedFareDetails[cab.id] = 'Airport transfer';
            } else if (tripType === 'local') {
              calculatedFareDetails[cab.id] = hourlyPackage || '8hrs-80km';
            } else if (tripType === 'outstation') {
              const tripDuration = returnDate ? `${Math.max(1, Math.ceil((returnDate.getTime() - pickupDate.getTime()) / (24 * 60 * 60 * 1000)))} days` : `${formatTravelTime(distance * 2)}`;
              calculatedFareDetails[cab.id] = tripMode === 'round-trip' ? `Round trip (${tripDuration})` : 'One-way trip';
            }
            
            console.log(`CabOptions: Calculated fare for ${cab.name}: ${fare}, Trip: ${tripType}, Mode: ${tripMode}`);
          } catch (error) {
            console.error(`Error calculating fare for ${cab.name}:`, error);
            calculatedFares[cab.id] = 0;
          }
        }
        
        setFares(calculatedFares);
        setFareDetails(calculatedFareDetails);
      } catch (error) {
        console.error('Error calculating fares:', error);
      } finally {
        setIsCalculating(false);
      }
    };
    
    calculateFares();
  }, [cabTypes, distance, tripType, tripMode, hourlyPackage, pickupDate, returnDate]);
  
  // Listen for fare calculation events
  useEffect(() => {
    const handleFareCalculated = (event: CustomEvent) => {
      const { cabId, fare: calculatedFare } = event.detail;
      
      // Store the pending update
      setPendingFareUpdates(prev => ({
        ...prev,
        [cabId]: calculatedFare
      }));
    };
    
    window.addEventListener('fare-calculated', handleFareCalculated as EventListener);
    
    return () => {
      window.removeEventListener('fare-calculated', handleFareCalculated as EventListener);
    };
  }, []);
  
  // Apply pending fare updates when they come in
  useEffect(() => {
    if (Object.keys(pendingFareUpdates).length > 0) {
      console.log('CabOptions: Applying pending fare updates:', pendingFareUpdates);
      
      setFares(prev => ({
        ...prev,
        ...pendingFareUpdates
      }));
      
      // Clear the pending updates
      setPendingFareUpdates({});
    }
  }, [pendingFareUpdates]);
  
  // Listen for cab selection with fare events
  useEffect(() => {
    const handleCabSelected = (event: CustomEvent) => {
      const { cabType, cabName, fare } = event.detail;
      
      console.log(`CabOptions: Cab selected event received: ${cabName} with fare ${fare}`);
      
      // Update the fares state with this info
      setFares(prev => ({
        ...prev,
        [cabType]: fare
      }));
    };
    
    window.addEventListener('cab-selected-with-fare', handleCabSelected as EventListener);
    
    return () => {
      window.removeEventListener('cab-selected-with-fare', handleCabSelected as EventListener);
    };
  }, []);

  return (
    <div className="mt-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Select a cab</h3>
        <div className="text-sm text-gray-500">
          {isCalculating ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-500 mr-2"></div>
              Calculating fares...
            </div>
          ) : distance > 0 ? (
            <span>{distance} km total distance</span>
          ) : null}
        </div>
      </div>
      
      <div className="space-y-4">
        {cabTypes.map((cab) => (
          <CabOptionCard
            key={cab.id}
            cab={cab}
            fare={fares[cab.id] || 0}
            isSelected={selectedCab?.id === cab.id}
            onSelect={onSelectCab}
            fareDetails={fareDetails[cab.id] || ''}
            isCalculating={isCalculating}
          />
        ))}
      </div>
    </div>
  );
}
