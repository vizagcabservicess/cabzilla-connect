import { useState, useEffect, useRef } from 'react';
import { Location } from '@/lib/locationData';
import { CabType } from '@/types/cab';
import { TripType } from '@/lib/tripTypes';
import { formatPrice } from '@/lib/cabData';
import { format } from 'date-fns';
import { Car, MapPin, Calendar, User, Info } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { getLocalPackagePrice } from '@/lib/packageData';
import { calculateFare } from '@/lib/fareCalculationService';
import { getOutstationFaresForVehicle, getLocalFaresForVehicle, getAirportFaresForVehicle } from '@/services/fareService';

interface BookingSummaryProps {
  pickupLocation: Location | null;
  dropLocation: Location | null;
  pickupDate: Date | undefined;
  returnDate?: Date | null;
  selectedCab: CabType | null;
  distance: number;
  totalPrice: number;
  tripType: TripType;
  tripMode?: 'one-way' | 'round-trip';
}

export const BookingSummary = ({
  pickupLocation,
  dropLocation,
  pickupDate,
  returnDate,
  selectedCab,
  distance,
  totalPrice,
  tripType,
  tripMode = 'one-way'
}: BookingSummaryProps) => {
  const [calculatedFare, setCalculatedFare] = useState<number>(totalPrice);
  const [baseFare, setBaseFare] = useState<number>(0);
  const [driverAllowance, setDriverAllowance] = useState<number>(250);
  const [nightCharges, setNightCharges] = useState<number>(0);
  const [extraDistance, setExtraDistance] = useState<number>(0);
  const [extraDistanceFare, setExtraDistanceFare] = useState<number>(0);
  const [perKmRate, setPerKmRate] = useState<number>(0);
  const [effectiveDistance, setEffectiveDistance] = useState<number>(distance);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const lastUpdateTimeRef = useRef<number>(0);
  const calculationInProgressRef = useRef<boolean>(false);
  const calculationAttemptsRef = useRef<number>(0);
  const maxCalculationAttempts = 5;
  const selectedCabIdRef = useRef<string | null>(selectedCab?.id || null);
  const lastDistanceRef = useRef<number>(distance);
  const lastTripModeRef = useRef<string>(tripMode);
  const pendingCalculationRef = useRef<boolean>(false);

  useEffect(() => {
    if (selectedCab && selectedCabIdRef.current !== selectedCab.id) {
      console.log('BookingSummary: Selected cab changed to', selectedCab.name, '- forcing immediate recalculation');
      
      selectedCabIdRef.current = selectedCab.id;
      calculationInProgressRef.current = false;
      calculationAttemptsRef.current = 0;
      lastUpdateTimeRef.current = 0;
      pendingCalculationRef.current = true;
      
      setBaseFare(0);
      setExtraDistance(0);
      setExtraDistanceFare(0);
      
      setTimeout(() => {
        recalculateFareDetails();
      }, 50);
    }
  }, [selectedCab]);

  useEffect(() => {
    if (
      lastDistanceRef.current !== distance || 
      lastTripModeRef.current !== tripMode
    ) {
      console.log(`BookingSummary: Distance (${lastDistanceRef.current} → ${distance}) or trip mode (${lastTripModeRef.current} → ${tripMode}) changed - forcing recalculation`);
      
      lastDistanceRef.current = distance;
      lastTripModeRef.current = tripMode;
      calculationInProgressRef.current = false;
      calculationAttemptsRef.current = 0;
      pendingCalculationRef.current = true;
      
      setTimeout(() => {
        recalculateFareDetails();
      }, 50);
    }
  }, [distance, tripMode]);

  const recalculateFareDetails = async () => {
    if (!selectedCab) return;
    
    if (calculationInProgressRef.current) {
      console.log('BookingSummary: Calculation already in progress, marking pending calculation for retry');
      pendingCalculationRef.current = true;
      return;
    }
    
    const now = Date.now();
    if (now - lastUpdateTimeRef.current < 500 && !pendingCalculationRef.current) {
      console.log('BookingSummary: Throttling recalculation, last update was too recent');
      pendingCalculationRef.current = true;
      setTimeout(recalculateFareDetails, 500);
      return;
    }
    
    if (calculationAttemptsRef.current >= maxCalculationAttempts) {
      console.log(`BookingSummary: Reached maximum calculation attempts (${maxCalculationAttempts}), skipping`);
      return;
    }
    
    calculationInProgressRef.current = true;
    pendingCalculationRef.current = false;
    calculationAttemptsRef.current += 1;
    lastUpdateTimeRef.current = now;
    setIsRefreshing(true);
    console.log('BookingSummary: Recalculating fare details for', selectedCab.name);
    
    try {
      let newBaseFare = 0;
      let newDriverAllowance = 250;
      let newNightCharges = 0;
      let newExtraDistance = 0;
      let newExtraDistanceFare = 0;
      let newPerKmRate = 0;
      let newEffectiveDistance = distance;
      const minimumKm = 300;
      
      if (tripType === 'outstation') {
        try {
          const outstationFares = await getOutstationFaresForVehicle(selectedCab.id);
          console.log('BookingSummary: Retrieved fresh outstation fares:', outstationFares);
          
          if (tripMode === 'one-way') {
            newPerKmRate = outstationFares.pricePerKm || 15;
            
            newBaseFare = outstationFares.basePrice || minimumKm * newPerKmRate;
            newEffectiveDistance = distance * 2;
            
            if (newEffectiveDistance > minimumKm) {
              newExtraDistance = newEffectiveDistance - minimumKm;
              newExtraDistanceFare = newExtraDistance * newPerKmRate;
            }
            
            newDriverAllowance = outstationFares.driverAllowance || 250;
            
            if (pickupDate && (pickupDate.getHours() >= 22 || pickupDate.getHours() <= 5)) {
              newNightCharges = Math.round(newBaseFare * 0.1);
            }
          } else {
            newPerKmRate = outstationFares.roundTripPricePerKm || outstationFares.pricePerKm * 0.85 || 12;
            newDriverAllowance = outstationFares.driverAllowance || 250;
            
            newEffectiveDistance = distance * 2;
            
            newBaseFare = outstationFares.roundTripBasePrice || outstationFares.basePrice * 0.9 || minimumKm * newPerKmRate;
            
            if (newEffectiveDistance > minimumKm) {
              newExtraDistance = newEffectiveDistance - minimumKm;
              newExtraDistanceFare = newExtraDistance * newPerKmRate;
            }
            
            if (pickupDate && (pickupDate.getHours() >= 22 || pickupDate.getHours() <= 5)) {
              newNightCharges = Math.round(newBaseFare * 0.1);
            }
          }
        } catch (error) {
          console.error('Error fetching outstation fares:', error);
          newPerKmRate = selectedCab.id.includes('sedan') ? 12 : 
                        selectedCab.id.includes('ertiga') ? 14 : 
                        selectedCab.id.includes('innova') ? 16 : 15;
          
          if (tripMode === 'one-way') {
            newBaseFare = minimumKm * newPerKmRate;
            newEffectiveDistance = distance * 2;
            
            if (newEffectiveDistance > minimumKm) {
              newExtraDistance = newEffectiveDistance - minimumKm;
              newExtraDistanceFare = newExtraDistance * newPerKmRate;
            }
          } else {
            newEffectiveDistance = distance * 2;
            newPerKmRate = newPerKmRate * 0.85;
            newBaseFare = minimumKm * newPerKmRate;
            
            if (newEffectiveDistance > minimumKm) {
              newExtraDistance = newEffectiveDistance - minimumKm;
              newExtraDistanceFare = newExtraDistance * newPerKmRate;
            }
          }
          
          newDriverAllowance = 250;
        }
      } else if (tripType === 'airport') {
        const airportFares = await getAirportFaresForVehicle(selectedCab.id);
        console.log('BookingSummary: Retrieved fresh airport fares:', airportFares);
        
        if (distance <= 10) {
          newBaseFare = airportFares.tier1Price || airportFares.basePrice || 1000;
        } else if (distance <= 20) {
          newBaseFare = airportFares.tier2Price || airportFares.basePrice || 1200;
        } else if (distance <= 30) {
          newBaseFare = airportFares.tier3Price || airportFares.basePrice || 1500;
        } else {
          newBaseFare = airportFares.tier4Price || airportFares.basePrice || 2000;
          
          newExtraDistance = distance - 30;
          newExtraDistanceFare = newExtraDistance * (airportFares.extraKmCharge || 14);
          newPerKmRate = airportFares.extraKmCharge || 14;
        }
        
        newDriverAllowance = 250;
      } else if (tripType === 'local') {
        const localFares = await getLocalFaresForVehicle(selectedCab.id);
        console.log('BookingSummary: Retrieved fresh local fares:', localFares);
        
        if (localFares.price8hrs80km > 0) {
          newBaseFare = localFares.price8hrs80km;
        } else if (selectedCab.localPackageFares?.price8hrs80km) {
          newBaseFare = selectedCab.localPackageFares.price8hrs80km;
        } else {
          if (selectedCab.name.toLowerCase().includes('sedan')) newBaseFare = 1500;
          else if (selectedCab.name.toLowerCase().includes('ertiga')) newBaseFare = 1800;
          else if (selectedCab.name.toLowerCase().includes('innova')) newBaseFare = 2200;
          else newBaseFare = 1500;
        }
        
        newDriverAllowance = 0;
      }
      
      console.log('BookingSummary: Calculated fare details:', {
        baseFare: newBaseFare,
        driverAllowance: newDriverAllowance,
        nightCharges: newNightCharges,
        extraDistance: newExtraDistance,
        extraDistanceFare: newExtraDistanceFare,
        perKmRate: newPerKmRate,
        effectiveDistance: newEffectiveDistance,
        totalFare: newBaseFare + newDriverAllowance + newNightCharges + newExtraDistanceFare
      });
      
      setBaseFare(newBaseFare);
      setDriverAllowance(newDriverAllowance);
      setNightCharges(newNightCharges);
      setExtraDistance(newExtraDistance);
      setExtraDistanceFare(newExtraDistanceFare);
      setPerKmRate(newPerKmRate);
      setEffectiveDistance(newEffectiveDistance);
      
      const newCalculatedFare = newBaseFare + newDriverAllowance + newNightCharges + newExtraDistanceFare;
      setCalculatedFare(newCalculatedFare);
      
      window.dispatchEvent(new CustomEvent('fare-calculated', {
        detail: {
          cabId: selectedCab.id,
          tripType,
          tripMode,
          calculated: true,
          fare: newCalculatedFare
        }
      }));
    } catch (error) {
      console.error('Error recalculating fare details:', error);
      setCalculatedFare(totalPrice);
    } finally {
      setIsRefreshing(false);
      calculationInProgressRef.current = false;
      
      if (pendingCalculationRef.current) {
        console.log('BookingSummary: Another calculation is pending, scheduling retry');
        setTimeout(recalculateFareDetails, 100);
      }
    }
  };

  const handleCabSelected = (event: Event) => {
    const customEvent = event as CustomEvent;
    if (customEvent.detail && customEvent.detail.cabType) {
      console.log('BookingSummary: Detected cab selection event:', customEvent.detail);
      
      calculationInProgressRef.current = false;
      calculationAttemptsRef.current = 0;
      lastUpdateTimeRef.current = 0;
      pendingCalculationRef.current = true;
      
      if (selectedCabIdRef.current !== customEvent.detail.cabType) {
        selectedCabIdRef.current = customEvent.detail.cabType;
        
        setTimeout(() => {
          recalculateFareDetails();
        }, 10);
      }
    }
  };

  useEffect(() => {
    const resetAttemptsTimer = setInterval(() => {
      calculationAttemptsRef.current = 0;
    }, 30000);
    
    const handleEventsWithThrottling = () => {
      const now = Date.now();
      if (now - lastUpdateTimeRef.current < 1000) {
        console.log('BookingSummary: Throttling event handler');
        pendingCalculationRef.current = true;
        return;
      }
      
      if (calculationAttemptsRef.current < maxCalculationAttempts) {
        calculationInProgressRef.current = false;
        pendingCalculationRef.current = true;
        
        setTimeout(() => {
          recalculateFareDetails();
        }, 10);
      } else {
        console.log('BookingSummary: Skipping event handler, too many attempts');
      }
    };
    
    const initialLoadTimer = setTimeout(() => {
      recalculateFareDetails();
    }, 100);
    
    window.addEventListener('local-fares-updated', handleEventsWithThrottling);
    window.addEventListener('cab-selected-for-local', handleEventsWithThrottling);
    window.addEventListener('trip-fares-updated', handleEventsWithThrottling);
    window.addEventListener('airport-fares-updated', handleEventsWithThrottling);
    window.addEventListener('fare-cache-cleared', handleEventsWithThrottling);
    window.addEventListener('fare-calculated', handleEventsWithThrottling);
    window.addEventListener('cab-selected', handleCabSelected);
    
    return () => {
      clearTimeout(initialLoadTimer);
      clearInterval(resetAttemptsTimer);
      window.removeEventListener('local-fares-updated', handleEventsWithThrottling);
      window.removeEventListener('cab-selected-for-local', handleEventsWithThrottling);
      window.removeEventListener('trip-fares-updated', handleEventsWithThrottling);
      window.removeEventListener('airport-fares-updated', handleEventsWithThrottling);
      window.removeEventListener('fare-cache-cleared', handleEventsWithThrottling);
      window.removeEventListener('fare-calculated', handleEventsWithThrottling);
      window.removeEventListener('cab-selected', handleCabSelected);
    };
  }, []);

  useEffect(() => {
    calculationInProgressRef.current = false;
    calculationAttemptsRef.current = 0;
    pendingCalculationRef.current = true;
    
    const timer = setTimeout(() => {
      recalculateFareDetails();
    }, 50);
    
    return () => clearTimeout(timer);
  }, [tripType, tripMode, distance, pickupDate, returnDate, totalPrice]);

  useEffect(() => {
    const checkPendingInterval = setInterval(() => {
      if (pendingCalculationRef.current && !calculationInProgressRef.current) {
        console.log('BookingSummary: Processing pending calculation...');
        recalculateFareDetails();
      }
    }, 500);
    
    return () => clearInterval(checkPendingInterval);
  }, []);

  if (!pickupLocation || (!dropLocation && tripType !== 'local' && tripType !== 'tour') || !pickupDate || !selectedCab) {
    return <div className="p-4 bg-gray-100 rounded-lg">Booking information not available</div>;
  }

  let finalTotal = baseFare + driverAllowance + nightCharges + extraDistanceFare;
  
  if (finalTotal <= 0 && calculatedFare > 0) {
    finalTotal = calculatedFare;
  } else if (finalTotal <= 0 && selectedCab.price) {
    finalTotal = selectedCab.price;
  } else if (finalTotal <= 0) {
    finalTotal = tripType === 'airport' ? 500 : tripType === 'local' ? 1500 : 2500;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 relative">
      <h2 className="text-xl font-bold mb-4">Booking Summary</h2>
      
      <div className="space-y-4">
        <div className="border-b pb-4">
          <div className="flex items-start gap-2 mb-3">
            <MapPin className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-gray-500">PICKUP</p>
              <p className="font-medium">{pickupLocation.address || pickupLocation.name}</p>
            </div>
          </div>
          
          {tripType !== 'local' && tripType !== 'tour' && dropLocation && (
            <div className="flex items-start gap-2 mb-3">
              <MapPin className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-500">DROP-OFF</p>
                <p className="font-medium">{dropLocation.address || dropLocation.name}</p>
              </div>
            </div>
          )}
          
          <div className="flex items-start gap-2 mb-3">
            <Calendar className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-gray-500">PICKUP DATE & TIME</p>
              <p className="font-medium">
                {pickupDate ? format(pickupDate, 'EEEE, MMMM d, yyyy') : 'Not specified'}
                <br/>
                {pickupDate ? format(pickupDate, 'h:mm a') : ''}
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-2">
            <User className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-gray-500">CAB TYPE</p>
              <p className="font-medium">
                {selectedCab.name}
                <span className="text-sm text-gray-500"> • {selectedCab.capacity} persons • {selectedCab.luggageCapacity} bags</span>
              </p>
            </div>
          </div>
        </div>
        
        <div>
          <div className={`space-y-3 transition-opacity duration-300 ${isRefreshing ? 'opacity-50' : 'opacity-100'}`}>
            {tripType === 'outstation' && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-700">Base fare (300 km included)</span>
                  <span className="font-semibold">₹{baseFare.toLocaleString()}</span>
                </div>
                
                <div className="text-gray-600 text-sm ml-1">
                  {tripMode === 'one-way' ? (
                    <>Total distance: {distance} km (effective: {effectiveDistance} km with driver return)</>
                  ) : (
                    <>Total distance: {distance} km (effective: {effectiveDistance} km round trip)</>
                  )}
                </div>
                
                {extraDistance > 0 && extraDistanceFare > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-700">Extra distance fare ({extraDistance} km × ₹{perKmRate})</span>
                    <span className="font-semibold">₹{extraDistanceFare.toLocaleString()}</span>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span className="text-gray-700">Driver allowance</span>
                  <span className="font-semibold">₹{driverAllowance.toLocaleString()}</span>
                </div>
                
                {nightCharges > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-700">Night charges</span>
                    <span className="font-semibold">₹{nightCharges.toLocaleString()}</span>
                  </div>
                )}
              </>
            )}
            
            {tripType === 'local' && (
              <div className="flex justify-between">
                <span className="text-gray-700">08hrs 80KM Package</span>
                <span className="font-semibold">₹{baseFare.toLocaleString()}</span>
              </div>
            )}
            
            {(tripType === 'airport' || tripType === 'tour') && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-700">Base fare</span>
                  <span className="font-semibold">₹{baseFare.toLocaleString()}</span>
                </div>
                
                {extraDistance > 0 && tripType === 'airport' && (
                  <div className="flex justify-between">
                    <span className="text-gray-700">Extra distance fare ({extraDistance} km × ₹{perKmRate})</span>
                    <span className="font-semibold">₹{extraDistanceFare.toLocaleString()}</span>
                  </div>
                )}
                
                {tripType === 'airport' && (
                  <div className="flex justify-between">
                    <span className="text-gray-700">Driver allowance</span>
                    <span className="font-semibold">₹{driverAllowance.toLocaleString()}</span>
                  </div>
                )}
              </>
            )}
          </div>
          
          <div className="border-t mt-4 pt-4">
            <div className="flex justify-between text-xl font-bold">
              <span>Total Amount</span>
              <span>₹{finalTotal.toLocaleString()}</span>
            </div>
          </div>
          
          <div className="bg-blue-50 p-3 rounded-md flex items-start gap-2 text-sm text-gray-700 mt-4">
            <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <p>
              {tripType === 'outstation' && tripMode === 'round-trip'
                ? 'Fare includes round trip journey (both ways). Driver allowance included for overnight stays.'
                : tripType === 'outstation' && tripMode === 'one-way'
                ? 'Minimum 300 km fare applies for one-way trips. Driver allowance included for return journey.'
                : tripType === 'tour'
                ? 'All-inclusive tour package fare includes driver allowance and wait charges.'
                : tripType === 'local'
                ? 'Package includes 8 hours and 80 km. Additional charges apply beyond package limits.'
                : 'Base fare for one-way trip. Additional wait charges may apply.'}
            </p>
          </div>
        </div>
      </div>
      
      {isRefreshing && (
        <div className="absolute inset-0 bg-white/5 flex items-center justify-center rounded-lg pointer-events-none">
          <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
        </div>
      )}
    </div>
  );
};

export default BookingSummary;
