
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

// Helper function to normalize vehicle IDs
const normalizeVehicleId = (vehicleId: string): string => {
  if (!vehicleId) return '';
  
  // Handle special cases of common vehicle IDs for better matching
  const id = vehicleId.toLowerCase().trim().replace(/\s+/g, '_');
  
  // Map common variants to standardized IDs
  const idMappings: Record<string, string> = {
    'sedan': 'sedan',
    'dzire': 'sedan',
    'swift_dzire': 'sedan',
    'etios': 'sedan',
    'amaze': 'sedan',
    'ertiga': 'ertiga',
    'marazzo': 'ertiga',
    'suv': 'ertiga',
    'innova': 'innova_crysta',
    'innova_crysta': 'innova_crysta',
    'crysta': 'innova_crysta',
    'hycross': 'innova_crysta',
    'mpv': 'innova_crysta',
    'tempo': 'tempo_traveller',
    'tempo_traveller': 'tempo_traveller',
    'traveller': 'tempo_traveller'
  };
  
  return idMappings[id] || id;
};

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
      
      const { cabType, cabId, normalizedCabId, fare, timestamp = Date.now() } = event.detail || {};
      const relevantCabId = cabType || cabId;
      
      // Check if this update is for our selected cab (using both original and normalized IDs)
      const isForCurrentCab = relevantCabId === selectedCab.id || 
                             normalizeVehicleId(relevantCabId) === normalizeVehicleId(selectedCab.id);
      
      if (isForCurrentCab && fare && fare > 0) {
        const now = Date.now();
        if (now - lastUpdateRef.current < 500) return;
        
        lastUpdateRef.current = now;
        console.log(`BookingSummary: Received fare update for ${relevantCabId}: ${fare}`);
        
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
          
          // If initial price is 0 or invalid, try to calculate a fresh fare
          if (fare <= 0) {
            const normalizedVehicleId = normalizeVehicleId(selectedCab.id);
            console.log(`BookingSummary: Calculating fresh fare for ${selectedCab.id} (normalized to ${normalizedVehicleId})`);
            
            if (tripType === 'outstation') {
              fare = await fareStateManager.calculateOutstationFare({
                vehicleId: normalizedVehicleId,
                distance,
                tripMode,
                pickupDate
              });
            } else if (tripType === 'local') {
              const hourlyPackage = localStorage.getItem('hourlyPackage') || '8hrs-80km';
              fare = await fareStateManager.calculateLocalFare({
                vehicleId: normalizedVehicleId,
                hourlyPackage
              });
            } else if (tripType === 'airport') {
              fare = await fareStateManager.calculateAirportFare({
                vehicleId: normalizedVehicleId,
                distance
              });
            }
          }
          
          console.log(`BookingSummary: Loaded fare for ${selectedCab.id}: ${fare}`);
          
          if (fare > 0) {
            setTotalPrice(fare);
            updateFareDetails(fare, tripType, distance, selectedCab);
          } else {
            console.warn(`BookingSummary: Invalid fare (${fare}), using initial price of ${initialPrice}`);
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
      const isAirportTransfer = tripType === 'airport';
      const normalizedVehicleId = normalizeVehicleId(cab.id);
      
      console.log(`BookingSummary: Updating fare details for ${cab.id} (normalized to ${normalizedVehicleId}), trip type ${tripType}`);
      
      // Calculate effective distance based on trip type and mode
      const effectiveDist = tripType === 'outstation' && tripMode === 'round-trip' 
        ? distance * 2 
        : distance;
      
      setEffectiveDistance(effectiveDist);
      
      // For airport transfers, no driver allowance or night charges
      if (isAirportTransfer) {
        console.log(`BookingSummary: Airport transfer - no driver allowance or night charges`);
        setBaseFare(fare);
        setExtraDistanceFare(0);
        setDriverAllowance(0);
        setNightCharges(0);
        setIsLoading(false);
        return;
      }
      
      if (tripType === 'outstation' && cab.id) {
        try {
          const outstationFare = await fareStateManager.getOutstationFareForVehicle(normalizedVehicleId);
          
          if (outstationFare) {
            console.log(`BookingSummary: Using outstation fare data for ${normalizedVehicleId}:`, outstationFare);
            
            // For outstation, include driver allowance
            const driverAllowanceAmount = outstationFare.driverAllowance || 300;
            setDriverAllowance(driverAllowanceAmount);
            
            const minimumKm = tripMode === 'one-way' ? 250 : 300;
            
            const hasNightSurcharge = pickupDate && 
              (pickupDate.getHours() >= 22 || pickupDate.getHours() <= 5);
            
            const nightChargeAmount = hasNightSurcharge ? 
              Math.round((fare - driverAllowanceAmount) * 0.1) : 0;
            setNightCharges(nightChargeAmount);
            
            if (effectiveDist > minimumKm) {
              const extraKm = effectiveDist - minimumKm;
              const perKmRate = tripMode === 'one-way' ? 
                outstationFare.pricePerKm : 
                (outstationFare.roundTripPricePerKm || outstationFare.pricePerKm * 0.9);
              
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
        } catch (err) {
          console.error(`Error getting outstation fare data for ${normalizedVehicleId}:`, err);
        }
      } else if (tripType === 'local' && cab.id) {
        try {
          const localFare: LocalFare | null = await fareStateManager.getLocalFareForVehicle(normalizedVehicleId);
          
          if (localFare) {
            console.log(`BookingSummary: Using local fare data for ${normalizedVehicleId}:`, localFare);
            
            const driverAllowanceAmount = localFare?.driverAllowance ?? 250;
            setDriverAllowance(driverAllowanceAmount);
            
            setBaseFare(fare - driverAllowanceAmount);
            setExtraDistanceFare(0);
            setNightCharges(0);
            
            setIsLoading(false);
            return;
          }
        } catch (err) {
          console.error(`Error getting local fare data for ${normalizedVehicleId}:`, err);
        }
      }
      
      // Fallback calculations if we couldn't get specific fare data
      console.log(`BookingSummary: Using fallback calculations for ${normalizedVehicleId}`);
      
      // Set driver allowance based on vehicle type
      let driverAllowanceAmount = 0;
      
      if (isAirportTransfer) {
        driverAllowanceAmount = 0; // No driver allowance for airport transfers
      } else if (normalizedVehicleId === 'sedan') {
        driverAllowanceAmount = 250;
      } else if (normalizedVehicleId === 'ertiga') {
        driverAllowanceAmount = 300;
      } else if (normalizedVehicleId === 'innova_crysta') {
        driverAllowanceAmount = 350;
      } else if (normalizedVehicleId === 'tempo_traveller') {
        driverAllowanceAmount = 400;
      } else {
        driverAllowanceAmount = cab.driverAllowance || 250;
      }
      
      setDriverAllowance(driverAllowanceAmount);
      
      if (tripType === 'local') {
        setBaseFare(fare - driverAllowanceAmount);
        setExtraDistanceFare(0);
        setNightCharges(0);
      } else if (tripType === 'outstation') {
        const minimumKm = tripMode === 'one-way' ? 250 : 300;
        
        // Set per km rate based on vehicle type
        let perKmRate = 0;
        if (normalizedVehicleId === 'sedan') {
          perKmRate = 12;
        } else if (normalizedVehicleId === 'ertiga') {
          perKmRate = 15;
        } else if (normalizedVehicleId === 'innova_crysta') {
          perKmRate = 18;
        } else if (normalizedVehicleId === 'tempo_traveller') {
          perKmRate = 25;
        } else {
          perKmRate = cab.outstationFares?.pricePerKm || 15;
        }
        
        // Adjust for round trip
        if (tripMode === 'round-trip') {
          perKmRate = perKmRate * 0.9; // 10% discount for round trip
        }
        
        const hasNightSurcharge = pickupDate && 
          (pickupDate.getHours() >= 22 || pickupDate.getHours() <= 5);
        
        const nightChargeAmount = hasNightSurcharge ? 
          Math.round((fare - driverAllowanceAmount) * 0.1) : 0;
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
      } else {
        setBaseFare(fare);
        setExtraDistanceFare(0);
        setNightCharges(0);
      }
    } catch (error) {
      console.error('Error calculating fare details:', error);
      
      // Simple fallback if everything fails
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
  const extraDistanceKm = effectiveDistance > (tripType === 'outstation' && tripMode === 'one-way' ? 250 : 300) ? 
    effectiveDistance - (tripType === 'outstation' && tripMode === 'one-way' ? 250 : 300) : 0;
  const nightChargesValue = nightCharges || 0;
  const baseFareValue = baseFare || (totalPrice - driverAllowanceValue - extraDistanceFare - nightChargesValue);
  
  // Only show driver allowance for non-airport trips
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
