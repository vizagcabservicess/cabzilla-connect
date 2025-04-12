
import React, { useState, useEffect } from 'react';
import { Location } from '@/lib/locationData';
import { CabType, FareCalculationParams } from '@/types/cab';
import { TripType, TripMode } from '@/lib/tripTypes';
import { formatPrice } from '@/lib/cabData';
import { calculateFare } from '@/lib/fareCalculationService';

interface BookingSummaryProps {
  pickupLocation: Location;
  dropLocation?: Location | null;
  pickupDate?: Date;
  returnDate?: Date | null;
  selectedCab: CabType;
  distance: number;
  totalPrice: number;
  tripType: TripType;
  tripMode: TripMode;
  hourlyPackage?: string;
  discountAmount?: number;
}

export function BookingSummary({
  pickupLocation,
  dropLocation,
  pickupDate,
  returnDate,
  selectedCab,
  distance,
  totalPrice,
  tripType,
  tripMode,
  hourlyPackage,
  discountAmount = 0
}: BookingSummaryProps) {
  const [calculatedFare, setCalculatedFare] = useState<number>(totalPrice);
  const [baseFare, setBaseFare] = useState<number>(0);
  const [driverAllowance, setDriverAllowance] = useState<number>(250);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [fareUpdated, setFareUpdated] = useState<boolean>(false);

  // Reset fare updated flag when cab changes
  useEffect(() => {
    console.log('BookingSummary: selectedCab changed to:', selectedCab.name);
    setFareUpdated(false);
  }, [selectedCab.id]);

  // Listen for fare calculation events to update the summary
  useEffect(() => {
    const handleFareCalculated = (event: CustomEvent) => {
      const { cabId, fare, tripType: eventTripType, breakdown } = event.detail;
      
      // Only update if this event is for our selected cab
      if (cabId === selectedCab.id && eventTripType === tripType) {
        console.log('BookingSummary: Received fare calculation event:', event.detail);
        setCalculatedFare(fare);
        
        // Update fare breakdown if available
        if (breakdown) {
          setBaseFare(breakdown.baseFare || fare - driverAllowance);
          setDriverAllowance(breakdown.driverAllowance || 250);
        } else {
          // If no breakdown, calculate base fare by subtracting driver allowance
          setBaseFare(fare - driverAllowance);
        }
        
        setFareUpdated(true);
      }
    };

    window.addEventListener('fare-calculated', handleFareCalculated as EventListener);
    
    return () => {
      window.removeEventListener('fare-calculated', handleFareCalculated as EventListener);
    };
  }, [selectedCab.id, tripType, driverAllowance]);

  // Recalculate fare when key parameters change
  useEffect(() => {
    const calculateFareForSummary = async () => {
      if (!selectedCab || !pickupDate) return;
      
      setIsCalculating(true);
      
      try {
        console.log('BookingSummary: Calculating fare with params:', {
          cabType: selectedCab.name,
          distance,
          tripType,
          tripMode,
          hourlyPackage,
        });
        
        const params: FareCalculationParams = {
          cabType: selectedCab,
          distance,
          tripType,
          tripMode,
          hourlyPackage,
          pickupDate,
          returnDate,
          forceRefresh: true
        };
        
        const fare = await calculateFare(params);
        
        console.log(`BookingSummary: Calculated fare: ${fare} for ${selectedCab.name}`);
        
        // For airport trips, breakdown the fare into base and driver allowance
        if (tripType === 'airport') {
          setBaseFare(fare - driverAllowance);
        } else {
          // For other trip types, use the breakdown from the calculator
          const baseAmount = fare - driverAllowance;
          setBaseFare(baseAmount);
        }
        
        setCalculatedFare(fare);
        setFareUpdated(true);
      } catch (error) {
        console.error('BookingSummary: Error calculating fare:', error);
      } finally {
        setIsCalculating(false);
      }
    };
    
    // Only calculate if we have the basic required data and fare hasn't been set yet
    if (selectedCab && distance > 0 && pickupDate && !fareUpdated) {
      calculateFareForSummary();
    }
  }, [selectedCab, distance, tripType, tripMode, hourlyPackage, pickupDate, returnDate, fareUpdated, driverAllowance]);
  
  // Update total price when totalPrice prop changes
  useEffect(() => {
    if (totalPrice > 0 && !fareUpdated) {
      setCalculatedFare(totalPrice);
      // Estimate the base fare by subtracting driver allowance
      setBaseFare(totalPrice - driverAllowance);
    }
  }, [totalPrice, fareUpdated, driverAllowance]);

  const finalAmount = calculatedFare - discountAmount;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <h3 className="text-xl font-semibold mb-4">Booking Summary</h3>
      
      <div className="space-y-4 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-gray-500 text-sm">PICKUP LOCATION</p>
            <p className="font-medium">{pickupLocation?.name || pickupLocation?.address}</p>
          </div>
          {dropLocation && (
            <div className="text-right">
              <p className="text-gray-500 text-sm">DROP LOCATION</p>
              <p className="font-medium">{dropLocation?.name || dropLocation?.address}</p>
            </div>
          )}
        </div>
        
        <div className="flex justify-between items-start">
          <div>
            <p className="text-gray-500 text-sm">PICKUP DATE & TIME</p>
            <p className="font-medium">
              {pickupDate?.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
              <br />
              {pickupDate?.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
          {returnDate && tripMode === 'round-trip' && (
            <div className="text-right">
              <p className="text-gray-500 text-sm">RETURN DATE & TIME</p>
              <p className="font-medium">
                {returnDate?.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
                <br />
                {returnDate?.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          )}
        </div>
        
        <div className="py-2">
          <p className="text-gray-500 text-sm">CAB TYPE</p>
          <p className="font-medium flex items-center">
            {selectedCab.name} • {selectedCab.capacity} persons • {selectedCab.luggageCapacity} bags
          </p>
        </div>
      </div>
      
      <div className="border-t border-gray-200 pt-4 space-y-2">
        <div className="flex justify-between">
          <span>Base fare</span>
          <span>₹{baseFare}</span>
        </div>
        
        <div className="flex justify-between">
          <span>Driver allowance</span>
          <span>₹{driverAllowance}</span>
        </div>
        
        {discountAmount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Discount</span>
            <span>-₹{discountAmount}</span>
          </div>
        )}
      </div>
      
      <div className="border-t border-gray-200 mt-4 pt-4">
        <div className="flex justify-between items-center">
          <span className="text-lg font-bold">Total Amount</span>
          <span className="text-lg font-bold">₹{finalAmount}</span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {tripType === 'airport' 
            ? 'Base fare for airport transfer. Additional wait charges may apply.'
            : tripType === 'local'
              ? `Base fare for ${hourlyPackage} package. Extra charges for additional hours/km.`
              : tripType === 'outstation' && tripMode === 'round-trip'
                ? 'Base fare for round-trip. Additional night halt charges may apply.'
                : 'Base fare for one-way trip. Additional wait charges may apply.'}
        </p>
      </div>
    </div>
  );
}
