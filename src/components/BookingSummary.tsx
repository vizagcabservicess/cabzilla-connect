
import React, { useState, useEffect, useRef } from 'react';
import { CabType, LocalFare } from '@/types/cab';
import { formatPrice } from '@/lib/index';
import fareStateManager from '@/services/FareStateManager';

interface BookingSummaryProps {
  pickupLocation: any;
  dropLocation: any;
  pickupDate?: Date;
  returnDate?: Date | null;
  selectedCab: CabType | null;
  distance: number;
  totalPrice: number;
  tripType: string;
  tripMode?: 'one-way' | 'round-trip';
}

export const BookingSummary = ({
  pickupLocation,
  dropLocation,
  pickupDate,
  returnDate,
  selectedCab,
  distance,
  totalPrice: initialPrice,
  tripType,
  tripMode = 'one-way',
}: BookingSummaryProps) => {
  const [totalPrice, setTotalPrice] = useState<number>(initialPrice);
  const [baseFare, setBaseFare] = useState<number>(0);
  const [extraDistanceFare, setExtraDistanceFare] = useState<number>(0);
  const [driverAllowance, setDriverAllowance] = useState<number>(0);
  const [nightCharges, setNightCharges] = useState<number>(0);
  const [effectiveDistance, setEffectiveDistance] = useState<number>(distance);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  const lastUpdateRef = useRef<number>(0);
  const fareUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    const handleFareUpdate = (event: CustomEvent) => {
      if (!selectedCab) return;
      
      const { cabType, fare, timestamp = Date.now() } = event.detail || {};
      
      if (cabType === selectedCab.id && fare && fare > 0) {
        const now = Date.now();
        if (now - lastUpdateRef.current < 500) return;
        
        lastUpdateRef.current = now;
        console.log(`BookingSummary: Received fare update for ${cabType}: ${fare}`);
        
        if (fareUpdateTimeoutRef.current) {
          clearTimeout(fareUpdateTimeoutRef.current);
        }
        
        fareUpdateTimeoutRef.current = setTimeout(() => {
          setTotalPrice(fare);
          updateFareDetails(fare, tripType, distance, selectedCab);
        }, 100);
      }
    };

    window.addEventListener('cab-selected-with-fare', handleFareUpdate as EventListener);
    window.addEventListener('fare-calculated', handleFareUpdate as EventListener);
    
    return () => {
      window.removeEventListener('cab-selected-with-fare', handleFareUpdate as EventListener);
      window.removeEventListener('fare-calculated', handleFareUpdate as EventListener);
      if (fareUpdateTimeoutRef.current) {
        clearTimeout(fareUpdateTimeoutRef.current);
      }
    };
  }, [selectedCab, tripType, distance]);

  useEffect(() => {
    if (selectedCab && selectedCab.id) {
      setIsLoading(true);
      
      const loadFareForSelectedCab = async () => {
        try {
          let fare = initialPrice;
          
          if (fare <= 0) {
            if (tripType === 'outstation') {
              fare = await fareStateManager.calculateOutstationFare({
                vehicleId: selectedCab.id,
                distance,
                tripMode,
                pickupDate
              });
            } else if (tripType === 'local') {
              const hourlyPackage = localStorage.getItem('hourlyPackage') || '8hrs-80km';
              fare = await fareStateManager.calculateLocalFare({
                vehicleId: selectedCab.id,
                hourlyPackage
              });
            } else if (tripType === 'airport') {
              fare = await fareStateManager.calculateAirportFare({
                vehicleId: selectedCab.id,
                distance
              });
            }
          }
          
          if (fare > 0) {
            setTotalPrice(fare);
            updateFareDetails(fare, tripType, distance, selectedCab);
          } else {
            setTotalPrice(initialPrice > 0 ? initialPrice : 0);
            updateFareDetails(initialPrice > 0 ? initialPrice : 0, tripType, distance, selectedCab);
          }
        } catch (error) {
          console.error('Error loading fare for selected cab:', error);
          setTotalPrice(initialPrice > 0 ? initialPrice : 0);
          updateFareDetails(initialPrice > 0 ? initialPrice : 0, tripType, distance, selectedCab);
        } finally {
          setIsLoading(false);
        }
      };
      
      loadFareForSelectedCab();
    }
  }, [initialPrice, selectedCab, tripType, distance, tripMode, pickupDate]);

  const updateFareDetails = async (fare: number, tripType: string, distance: number, cab: CabType) => {
    setIsLoading(true);
    
    try {
      const effectiveDist = tripType === 'outstation' && tripMode === 'one-way' 
        ? distance * 2 
        : distance;
      
      setEffectiveDistance(effectiveDist);
      
      if (tripType === 'outstation' && cab.id) {
        const outstationFare = await fareStateManager.getOutstationFareForVehicle(cab.id);
        
        if (outstationFare) {
          const driverAllowanceAmount = outstationFare.driverAllowance || 300;
          setDriverAllowance(driverAllowanceAmount);
          
          const minimumKm = 300;
          
          const hasNightSurcharge = pickupDate && 
            (pickupDate.getHours() >= 22 || pickupDate.getHours() <= 5);
          
          const nightChargeAmount = hasNightSurcharge ? Math.round((fare - driverAllowanceAmount) * 0.1) : 0;
          setNightCharges(nightChargeAmount);
          
          if (effectiveDist > minimumKm) {
            const extraKm = effectiveDist - minimumKm;
            const perKmRate = tripMode === 'one-way' ? 
              outstationFare.pricePerKm : 
              outstationFare.roundTripPricePerKm;
            
            const extraFare = extraKm * perKmRate;
            setExtraDistanceFare(extraFare);
            setBaseFare(fare - extraFare - driverAllowanceAmount - nightChargeAmount);
          } else {
            setExtraDistanceFare(0);
            setBaseFare(fare - driverAllowanceAmount - nightChargeAmount);
          }
          
          setIsLoading(false);
          return;
        }
      } else if (tripType === 'local' && cab.id) {
        const localFare: LocalFare | null = await fareStateManager.getLocalFareForVehicle(cab.id);
        
        if (localFare) {
          // Fix: Use optional chaining and default value for driverAllowance
          const driverAllowanceAmount = localFare?.driverAllowance ?? 250;
          setDriverAllowance(driverAllowanceAmount);
          
          setBaseFare(fare - driverAllowanceAmount);
          setExtraDistanceFare(0);
          setNightCharges(0);
          
          setIsLoading(false);
          return;
        }
      } else if (tripType === 'airport') {
        // For airport transfers, we don't add driver allowance or other charges
        setBaseFare(fare);
        setExtraDistanceFare(0);
        setNightCharges(0);
        setDriverAllowance(0);
        
        setIsLoading(false);
        return;
      }
      
      // Default handling for cases not covered above
      const isAirportTransfer = tripType === 'airport';
      // No driver allowance for airport transfers
      const driverAllowanceAmount = isAirportTransfer ? 0 : (cab.driverAllowance || 250);
      setDriverAllowance(driverAllowanceAmount);
      
      if (tripType === 'local') {
        setBaseFare(fare - driverAllowanceAmount);
        setExtraDistanceFare(0);
        setNightCharges(0);
      } else if (tripType === 'outstation') {
        const minimumKm = 300;
        const perKmRate = cab.outstationFares?.pricePerKm || 
                         (cab.id?.includes('sedan') ? 11 : 
                          cab.id?.includes('ertiga') ? 14 : 
                          cab.id?.includes('innova') ? 18 : 15);
        
        const hasNightSurcharge = pickupDate && 
          (pickupDate.getHours() >= 22 || pickupDate.getHours() <= 5);
        
        const nightChargeAmount = hasNightSurcharge ? Math.round((fare - driverAllowanceAmount) * 0.1) : 0;
        setNightCharges(nightChargeAmount);
        
        if (effectiveDist > minimumKm) {
          const extraKm = effectiveDist - minimumKm;
          const extraFare = extraKm * perKmRate;
          setExtraDistanceFare(extraFare);
          setBaseFare(fare - extraFare - driverAllowanceAmount - nightChargeAmount);
        } else {
          setExtraDistanceFare(0);
          setBaseFare(fare - driverAllowanceAmount - nightChargeAmount);
        }
      } else if (isAirportTransfer) {
        setBaseFare(fare);
        setExtraDistanceFare(0);
        setNightCharges(0);
      } else {
        setBaseFare(fare);
        setExtraDistanceFare(0);
        setNightCharges(0);
      }
    } catch (error) {
      console.error('Error calculating fare details:', error);
      
      setBaseFare(fare);
      setExtraDistanceFare(0);
      setDriverAllowance(0);
      setNightCharges(0);
    }
    
    setIsLoading(false);
  };

  if (!selectedCab || !pickupLocation) {
    return null;
  }

  const pickupName = pickupLocation?.name || pickupLocation?.address || 'Not specified';
  const dropName = dropLocation?.name || dropLocation?.address || (tripType === 'local' ? 'Local package' : 'Not specified');
  
  const formatDate = (date?: Date | null) => {
    if (!date) return 'Not specified';
    return new Intl.DateTimeFormat('en-IN', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(new Date(date));
  };

  const formattedPickupDate = formatDate(pickupDate);
  const formattedReturnDate = formatDate(returnDate);
  const tripTypeDisplay = tripType === 'outstation' 
    ? `${tripMode === 'round-trip' ? 'Round Trip' : 'One Way'} - ${distance} km`
    : tripType === 'airport' 
      ? `Airport Transfer - ${distance} km` 
      : `Local Package (${distance}km)`;
  
  const driverAllowanceValue = driverAllowance || 0;
  const extraDistanceKm = effectiveDistance > 300 ? effectiveDistance - 300 : 0;
  const nightChargesValue = nightCharges || 0;
  const baseFareValue = baseFare || (totalPrice - driverAllowanceValue - extraDistanceFare - nightChargesValue);
  
  const showDriverAllowance = tripType !== 'airport' && driverAllowanceValue > 0;
  const showExtraDistance = extraDistanceKm > 0 && extraDistanceFare > 0;
  const showNightCharges = nightChargesValue > 0;

  return (
    <div id="booking-summary" className="bg-white rounded-lg shadow-md p-6 max-w-lg mx-auto">
      <h2 className="text-lg font-semibold mb-4">Booking Summary</h2>
      
      {isLoading && (
        <div className="absolute inset-0 bg-white/50 flex items-center justify-center rounded-lg z-10">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}
      
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-gray-500">Trip Type</h3>
          <p className="font-medium">{tripTypeDisplay}</p>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500">From</h3>
            <p className="font-medium">{pickupName}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">To</h3>
            <p className="font-medium">{dropName}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Pickup Date</h3>
            <p className="font-medium">{formattedPickupDate}</p>
          </div>
          
          {tripMode === 'round-trip' && (
            <div>
              <h3 className="text-sm font-medium text-gray-500">Return Date</h3>
              <p className="font-medium">{formattedReturnDate}</p>
            </div>
          )}
        </div>
        
        <div>
          <h3 className="text-sm font-medium text-gray-500">Vehicle</h3>
          <div className="flex items-center gap-2 mt-1">
            {selectedCab?.image ? (
              <img 
                src={selectedCab.image} 
                alt={selectedCab.name} 
                className="w-16 h-10 object-contain bg-gray-100 rounded p-1" 
              />
            ) : (
              <div className="w-16 h-10 bg-gray-100 rounded flex items-center justify-center">
                <span className="text-xs text-gray-500">No image</span>
              </div>
            )}
            <span className="font-medium">{selectedCab?.name || 'Not selected'}</span>
          </div>
        </div>
        
        <div className="border-t border-gray-200 pt-4 mt-4">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Fare Details</h3>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Base Fare</span>
              <span className="font-medium">₹{baseFareValue}</span>
            </div>
            
            {showExtraDistance && (
              <div className="flex justify-between">
                <span className="text-gray-600">Extra Distance ({extraDistanceKm} km)</span>
                <span className="font-medium">₹{extraDistanceFare}</span>
              </div>
            )}
            
            {showDriverAllowance && (
              <div className="flex justify-between">
                <span className="text-gray-600">Driver Allowance</span>
                <span className="font-medium">₹{driverAllowanceValue}</span>
              </div>
            )}
            
            {showNightCharges && (
              <div className="flex justify-between">
                <span className="text-gray-600">Night Charges</span>
                <span className="font-medium">₹{nightChargesValue}</span>
              </div>
            )}
            
            <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between font-medium">
              <span>Total Fare</span>
              <span className="text-primary-600">₹{totalPrice}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
