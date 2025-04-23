
import { useState, useEffect } from 'react';
import { Location } from '@/lib/locationData';
import { CabType } from '@/types/cab';
import { TripMode } from '@/lib/tripTypes';

interface FareDetails {
  baseFare: number;
  driverAllowance?: number;
  extraDistanceFare?: number;
  nightCharges?: number;
  tollCharges?: number;
  stateTaxes?: number;
  waitingCharge?: number;
  distanceFare?: number;
  totalPrice: number;
}

export function useFareDetails(
  pickupPlaceId?: string,
  dropoffPlaceId?: string,
  selectedCab?: CabType | null,
  tripType?: string,
  selectedDateTime?: Date | null
) {
  const [fareData, setFareData] = useState<FareDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const calculateFareDetails = async () => {
      if (!pickupPlaceId || !dropoffPlaceId || !selectedCab || !tripType) {
        setIsLoading(false);
        // Provide default fare data when inputs are missing
        setFareData({
          baseFare: 0,
          totalPrice: 0
        });
        return;
      }

      setIsLoading(true);
      
      try {
        // Look for fare data in localStorage based on cab and trip type
        const fareKey = `fare_${tripType}_${selectedCab.id.toLowerCase()}`;
        const storedFareData = localStorage.getItem(fareKey);
        
        if (storedFareData) {
          const parsedData = JSON.parse(storedFareData);
          const fare = parseFloat(parsedData.fare || parsedData);
          
          // Create a basic fare structure based on the available data
          const fareDetails: FareDetails = {
            baseFare: parsedData.breakdown?.basePrice || fare * 0.7, // Estimate if not available
            totalPrice: fare
          };
          
          // Add outstation specific details if available
          if (tripType === 'outstation') {
            fareDetails.driverAllowance = parsedData.breakdown?.driverAllowance || 250;
            fareDetails.extraDistanceFare = parsedData.breakdown?.extraDistanceFare || 0;
            fareDetails.nightCharges = parsedData.breakdown?.nightCharges || 0;
            fareDetails.tollCharges = parsedData.breakdown?.tollCharges || 0;
            fareDetails.stateTaxes = parsedData.breakdown?.stateTaxes || 0;
          }
          
          // Add local specific details if available
          if (tripType === 'local' || tripType === 'airport') {
            fareDetails.waitingCharge = parsedData.breakdown?.waitingCharge || 0;
            fareDetails.distanceFare = parsedData.breakdown?.distanceFare || 0;
          }
          
          setFareData(fareDetails);
        } else {
          // Create default fare data if nothing is found
          const baseFare = selectedCab.price || 2000;
          setFareData({
            baseFare,
            totalPrice: baseFare,
            driverAllowance: tripType === 'outstation' ? 250 : undefined
          });
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error calculating fare details:', error);
        setError(error instanceof Error ? error : new Error('Unknown error calculating fare'));
        // Provide fallback fare data in case of errors
        setFareData({
          baseFare: selectedCab?.price || 2000,
          totalPrice: selectedCab?.price || 2000
        });
        setIsLoading(false);
      }
    };

    calculateFareDetails();
  }, [pickupPlaceId, dropoffPlaceId, selectedCab, tripType, selectedDateTime]);

  return { fareData, isLoading, error };
}
