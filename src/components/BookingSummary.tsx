
import { useState, useEffect, useRef } from 'react';
import { Location } from '@/lib/locationData';
import { CabType } from '@/types/cab';
import { TripType } from '@/lib/tripTypes';
import { formatPrice } from '@/lib/cabData';
import { format } from 'date-fns';
import { Car, MapPin, Calendar, User, Info } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useTripFare, TripFareType } from '@/hooks/useTripFare';
import { Skeleton } from '@/components/ui/skeleton';

interface BookingSummaryProps {
  pickupLocation: Location | null;
  dropLocation: Location | null;
  pickupDate: Date | undefined;
  returnDate?: Date | undefined | null;
  selectedCab: CabType | null;
  distance: number;
  totalPrice: number;
  tripType: TripType;
  tripMode?: 'one-way' | 'round-trip';
  hourlyPackage?: string;
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
  tripMode = 'one-way',
  hourlyPackage
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
  const [showDetailsLoading, setShowDetailsLoading] = useState<boolean>(false);
  
  const lastUpdateTimeRef = useRef<number>(0);
  const calculationInProgressRef = useRef<boolean>(false);
  const calculationAttemptsRef = useRef<number>(0);
  const maxCalculationAttempts = 3;
  const selectedCabIdRef = useRef<string | null>(selectedCab?.id || null);
  const lastDistanceRef = useRef<number>(distance);
  const lastTripModeRef = useRef<string>(tripMode);
  const pendingCalculationRef = useRef<boolean>(false);
  const totalPriceRef = useRef<number>(totalPrice);
  const calculationTimeoutRef = useRef<any>(null);
  const requestIdRef = useRef<number>(0);

  // Map trip type to fare hook type
  const mapTripType = (type: string): TripFareType => {
    if (type === 'local') return 'local';
    if (type === 'airport') return 'airport';
    return 'outstation';
  };

  // Use our new fare hook
  const { 
    fetchFare, 
    isLoading: isLoadingFare 
  } = useTripFare(mapTripType(tripType));

  useEffect(() => {
    totalPriceRef.current = totalPrice;
    if (totalPrice > 0 && calculatedFare === 0) {
      setCalculatedFare(totalPrice);
    }
  }, [totalPrice, calculatedFare]);

  useEffect(() => {
    if (selectedCab && selectedCabIdRef.current !== selectedCab.id) {
      console.log('BookingSummary: Selected cab changed to', selectedCab.name, '- resetting calculation state');
      
      if (calculationTimeoutRef.current) {
        clearTimeout(calculationTimeoutRef.current);
      }
      
      selectedCabIdRef.current = selectedCab.id;
      
      // Clear previous fare and show loading state immediately
      setCalculatedFare(0);
      setBaseFare(0);
      setDriverAllowance(250);
      setNightCharges(0);
      setExtraDistance(0);
      setExtraDistanceFare(0);
      setShowDetailsLoading(true);
      
      calculationInProgressRef.current = false;
      calculationAttemptsRef.current = 0;
      lastUpdateTimeRef.current = 0;
      pendingCalculationRef.current = true;
      
      // Increment request ID
      const requestId = ++requestIdRef.current;
      
      // Fetch fresh fare with a slight delay to allow UI to update
      calculationTimeoutRef.current = setTimeout(() => {
        recalculateFareDetails(requestId);
      }, 100);
    }
  }, [selectedCab]);

  useEffect(() => {
    if (
      lastDistanceRef.current !== distance || 
      lastTripModeRef.current !== tripMode
    ) {
      console.log(`BookingSummary: Distance (${lastDistanceRef.current} → ${distance}) or trip mode (${lastTripModeRef.current} → ${tripMode}) changed`);
      
      lastDistanceRef.current = distance;
      lastTripModeRef.current = tripMode;
      
      calculationInProgressRef.current = false;
      calculationAttemptsRef.current = 0;
      pendingCalculationRef.current = true;
      
      if (calculationTimeoutRef.current) {
        clearTimeout(calculationTimeoutRef.current);
      }
      
      // Clear previous fare and show loading state
      setCalculatedFare(0);
      setShowDetailsLoading(true);
      
      // Increment request ID
      const requestId = ++requestIdRef.current;
      
      calculationTimeoutRef.current = setTimeout(() => {
        recalculateFareDetails(requestId);
      }, 100);
    }
  }, [distance, tripMode]);

  const recalculateFareDetails = async (requestId: number) => {
    if (!selectedCab) {
      console.log('BookingSummary: No cab selected, skipping calculation');
      setShowDetailsLoading(false);
      return;
    }
    
    // If this is not the latest request, ignore it
    if (requestId !== requestIdRef.current) {
      console.log(`BookingSummary: Ignoring stale calculation request ${requestId} (current: ${requestIdRef.current})`);
      return;
    }
    
    if (calculationInProgressRef.current) {
      console.log('BookingSummary: Calculation already in progress, marking for retry');
      pendingCalculationRef.current = true;
      return;
    }
    
    if (calculationAttemptsRef.current >= maxCalculationAttempts) {
      console.log(`BookingSummary: Reached max calculation attempts (${maxCalculationAttempts}), using current totalPrice: ${totalPriceRef.current}`);
      setCalculatedFare(totalPriceRef.current || totalPrice);
      setShowDetailsLoading(false);
      pendingCalculationRef.current = false;
      return;
    }
    
    calculationInProgressRef.current = true;
    pendingCalculationRef.current = false;
    calculationAttemptsRef.current += 1;
    lastUpdateTimeRef.current = Date.now();
    setIsRefreshing(true);
    console.log(`BookingSummary: Calculating fare details for ${selectedCab.name} (attempt ${calculationAttemptsRef.current}/${maxCalculationAttempts})`);
    
    try {
      // Prepare additional params based on trip type
      let additionalParams: Record<string, string> = {};
      
      if (tripType === 'local' && hourlyPackage) {
        additionalParams.package = hourlyPackage;
      } else if (tripType === 'outstation') {
        additionalParams.distance = String(distance);
        additionalParams.trip_mode = tripMode;
      } else if (tripType === 'airport') {
        additionalParams.distance = String(distance);
      }
      
      // Fetch the fare from our hook
      const fare = await fetchFare(
        selectedCab.id,
        mapTripType(tripType),
        additionalParams,
        true // force refresh
      );
      
      // If this is not the latest request, ignore the result
      if (requestId !== requestIdRef.current) {
        console.log(`BookingSummary: Ignoring stale calculation result for request ${requestId}`);
        return;
      }
      
      // Calculate fare details based on trip type
      let newBaseFare = 0;
      let newDriverAllowance = 250;
      let newNightCharges = 0;
      let newExtraDistance = 0;
      let newExtraDistanceFare = 0;
      let newPerKmRate = 0;
      let newEffectiveDistance = distance;
      const minimumKm = 300;
      
      if (tripType === 'outstation') {
        // For outstation, calculate base fare, driver allowance, and extra distance
        if (tripMode === 'one-way') {
          // Use per km rate from the cab's outstation fares if available
          newPerKmRate = selectedCab.outstationFares?.pricePerKm || 15;
          newBaseFare = selectedCab.outstationFares?.basePrice || (minimumKm * newPerKmRate);
          
          // For one-way trips, effective distance is doubled for driver return
          newEffectiveDistance = distance * 2;
          
          if (newEffectiveDistance > minimumKm) {
            newExtraDistance = newEffectiveDistance - minimumKm;
            newExtraDistanceFare = newExtraDistance * newPerKmRate;
          }
          
          newDriverAllowance = selectedCab.outstationFares?.driverAllowance || 250;
          
          // Add night charges if pickup is during night hours
          if (pickupDate && (pickupDate.getHours() >= 22 || pickupDate.getHours() <= 5)) {
            newNightCharges = Math.round(newBaseFare * 0.1);
          }
        } else {
          // For round trips
          newPerKmRate = selectedCab.outstationFares?.roundTripPricePerKm || 
                         (selectedCab.outstationFares?.pricePerKm ? selectedCab.outstationFares.pricePerKm * 0.85 : 12);
          
          newDriverAllowance = selectedCab.outstationFares?.driverAllowance || 250;
          
          // For round trips, effective distance is also doubled
          newEffectiveDistance = distance * 2;
          
          newBaseFare = selectedCab.outstationFares?.roundTripBasePrice || 
                        (selectedCab.outstationFares?.basePrice ? selectedCab.outstationFares.basePrice * 0.9 : minimumKm * newPerKmRate);
          
          if (newEffectiveDistance > minimumKm) {
            newExtraDistance = newEffectiveDistance - minimumKm;
            newExtraDistanceFare = newExtraDistance * newPerKmRate;
          }
          
          // Add night charges if pickup is during night hours
          if (pickupDate && (pickupDate.getHours() >= 22 || pickupDate.getHours() <= 5)) {
            newNightCharges = Math.round(newBaseFare * 0.1);
          }
        }
      } else if (tripType === 'airport') {
        // For airport transfers, use tiered pricing
        if (selectedCab.airportFares) {
          if (distance <= 10) {
            newBaseFare = selectedCab.airportFares.tier1Price || selectedCab.airportFares.basePrice;
          } else if (distance <= 20) {
            newBaseFare = selectedCab.airportFares.tier2Price || selectedCab.airportFares.basePrice;
          } else if (distance <= 30) {
            newBaseFare = selectedCab.airportFares.tier3Price || selectedCab.airportFares.basePrice;
          } else {
            newBaseFare = selectedCab.airportFares.tier4Price || selectedCab.airportFares.basePrice;
            
            // Add extra distance charges for distances beyond 30km
            newExtraDistance = distance - 30;
            newPerKmRate = selectedCab.airportFares.extraKmCharge;
            newExtraDistanceFare = newExtraDistance * newPerKmRate;
          }
        } else {
          // Default airport fares if not available in cab
          if (distance <= 10) {
            newBaseFare = 800;
          } else if (distance <= 20) {
            newBaseFare = 1200;
          } else if (distance <= 30) {
            newBaseFare = 1800;
          } else {
            newBaseFare = 2500;
            
            // Add extra distance charges for distances beyond 30km
            newExtraDistance = distance - 30;
            newPerKmRate = 14;
            newExtraDistanceFare = newExtraDistance * newPerKmRate;
          }
        }
        
        newDriverAllowance = 250;
      } else if (tripType === 'local') {
        // For local packages, the fare is the package price
        newBaseFare = fare;
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
      
      // Update state with calculated values
      setBaseFare(newBaseFare);
      setDriverAllowance(newDriverAllowance);
      setNightCharges(newNightCharges);
      setExtraDistance(newExtraDistance);
      setExtraDistanceFare(newExtraDistanceFare);
      setPerKmRate(newPerKmRate);
      setEffectiveDistance(newEffectiveDistance);
      
      // Calculate total fare
      const newCalculatedFare = fare > 0 ? fare : (newBaseFare + newDriverAllowance + newNightCharges + newExtraDistanceFare);
      setCalculatedFare(newCalculatedFare);
      
      // Update total price ref
      totalPriceRef.current = newCalculatedFare;
      
      // Dispatch fare calculated event if there's a significant difference
      if (Math.abs(newCalculatedFare - totalPrice) > 10) {
        window.dispatchEvent(new CustomEvent('fare-calculated', {
          detail: {
            cabId: selectedCab.id,
            tripType,
            tripMode,
            calculated: true,
            fare: newCalculatedFare
          }
        }));
      }
    } catch (error) {
      console.error('Error calculating fare details:', error);
      setCalculatedFare(totalPrice > 0 ? totalPrice : totalPriceRef.current);
    } finally {
      // Only update states if this is still the latest request
      if (requestId === requestIdRef.current) {
        setIsRefreshing(false);
        setShowDetailsLoading(false);
        calculationInProgressRef.current = false;
        
        if (pendingCalculationRef.current) {
          console.log('BookingSummary: Another calculation is pending, scheduling retry');
          calculationTimeoutRef.current = setTimeout(() => {
            recalculateFareDetails(requestIdRef.current);
          }, 150);
        }
      }
    }
  };

  const handleCabSelected = (event: Event) => {
    const customEvent = event as CustomEvent;
    if (customEvent.detail && customEvent.detail.cabType) {
      console.log('BookingSummary: Detected cab selection event:', customEvent.detail);
      
      if (selectedCabIdRef.current === customEvent.detail.cabType) {
        console.log('BookingSummary: Same cab selected, using fare from event if available');
        
        if (customEvent.detail.fare && customEvent.detail.fare > 0) {
          setCalculatedFare(customEvent.detail.fare);
          totalPriceRef.current = customEvent.detail.fare;
          setShowDetailsLoading(false);
        }
        return;
      }
      
      // Clear previous fare and show loading
      setCalculatedFare(0);
      setShowDetailsLoading(true);
      
      calculationInProgressRef.current = false;
      calculationAttemptsRef.current = 0;
      lastUpdateTimeRef.current = 0;
      pendingCalculationRef.current = true;
      selectedCabIdRef.current = customEvent.detail.cabType;
      
      if (customEvent.detail.fare && customEvent.detail.fare > 0) {
        setCalculatedFare(customEvent.detail.fare);
        totalPriceRef.current = customEvent.detail.fare;
        setShowDetailsLoading(false);
      } else {
        // Increment request ID
        const requestId = ++requestIdRef.current;
        
        if (calculationTimeoutRef.current) {
          clearTimeout(calculationTimeoutRef.current);
        }
        calculationTimeoutRef.current = setTimeout(() => {
          recalculateFareDetails(requestId);
        }, 10);
      }
    }
  };

  useEffect(() => {
    const resetAttemptsTimer = setInterval(() => {
      calculationAttemptsRef.current = 0;
    }, 15000);
    
    const handleEventsWithThrottling = () => {
      const now = Date.now();
      if (now - lastUpdateTimeRef.current < 500) {
        console.log('BookingSummary: Throttling event handler');
        pendingCalculationRef.current = true;
        return;
      }
      
      if (calculationAttemptsRef.current >= maxCalculationAttempts) {
        console.log('BookingSummary: Skipping event handler, too many attempts');
        setShowDetailsLoading(false);
        return;
      }
      
      calculationInProgressRef.current = false;
      pendingCalculationRef.current = true;
      setShowDetailsLoading(true);
      
      // Increment request ID
      const requestId = ++requestIdRef.current;
      
      if (calculationTimeoutRef.current) {
        clearTimeout(calculationTimeoutRef.current);
      }
      
      calculationTimeoutRef.current = setTimeout(() => {
        recalculateFareDetails(requestId);
      }, 100);
    };
    
    const initialLoadTimer = setTimeout(() => {
      // Increment request ID
      const requestId = ++requestIdRef.current;
      
      if (totalPrice > 0) {
        setCalculatedFare(totalPrice);
        totalPriceRef.current = totalPrice;
        recalculateFareDetails(requestId);
      } else {
        recalculateFareDetails(requestId);
      }
    }, 100);
    
    window.addEventListener('local-fares-updated', handleEventsWithThrottling);
    window.addEventListener('cab-selected-for-local', handleEventsWithThrottling);
    window.addEventListener('trip-fares-updated', handleEventsWithThrottling);
    window.addEventListener('airport-fares-updated', handleEventsWithThrottling);
    window.addEventListener('fare-cache-cleared', handleEventsWithThrottling);
    window.addEventListener('cab-selected', handleCabSelected);
    
    return () => {
      clearTimeout(initialLoadTimer);
      clearInterval(resetAttemptsTimer);
      if (calculationTimeoutRef.current) {
        clearTimeout(calculationTimeoutRef.current);
      }
      window.removeEventListener('local-fares-updated', handleEventsWithThrottling);
      window.removeEventListener('cab-selected-for-local', handleEventsWithThrottling);
      window.removeEventListener('trip-fares-updated', handleEventsWithThrottling);
      window.removeEventListener('airport-fares-updated', handleEventsWithThrottling);
      window.removeEventListener('fare-cache-cleared', handleEventsWithThrottling);
      window.removeEventListener('cab-selected', handleCabSelected);
    };
  }, [totalPrice]);

  useEffect(() => {
    const checkPendingInterval = setInterval(() => {
      if (pendingCalculationRef.current && !calculationInProgressRef.current && calculationAttemptsRef.current < maxCalculationAttempts) {
        console.log('BookingSummary: Processing pending calculation...');
        
        // Increment request ID
        const requestId = ++requestIdRef.current;
        
        if (calculationTimeoutRef.current) {
          clearTimeout(calculationTimeoutRef.current);
        }
        
        calculationTimeoutRef.current = setTimeout(() => {
          recalculateFareDetails(requestId);
        }, 10);
      }
    }, 1000);
    
    return () => clearInterval(checkPendingInterval);
  }, []);

  if (!pickupLocation || (!dropLocation && tripType !== 'local' && tripType !== 'tour') || !pickupDate || !selectedCab) {
    return <div className="p-4 bg-gray-100 rounded-lg">Booking information not available</div>;
  }

  let finalTotal = calculatedFare;
  
  if (finalTotal <= 0) {
    finalTotal = baseFare + driverAllowance + nightCharges + extraDistanceFare;
    
    if (finalTotal <= 0 && totalPrice > 0) {
      finalTotal = totalPrice;
    } else if (finalTotal <= 0 && selectedCab.price) {
      finalTotal = selectedCab.price;
    } else if (finalTotal <= 0) {
      finalTotal = tripType === 'airport' ? 500 : tripType === 'local' ? 1500 : 2500;
    }
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
          
          {tripType === 'outstation' && tripMode === 'round-trip' && returnDate && (
            <div className="flex items-start gap-2 mb-3">
              <Calendar className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-500">RETURN DATE & TIME</p>
                <p className="font-medium">
                  {format(returnDate, 'EEEE, MMMM d, yyyy')}
                  <br/>
                  {format(returnDate, 'h:mm a')}
                </p>
              </div>
            </div>
          )}
        </div>
        
        <div className="border-b pb-4">
          <div className="flex items-start gap-2 mb-3">
            <Car className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-gray-500">SELECTED CAB</p>
              <p className="font-medium">{selectedCab.name}</p>
            </div>
          </div>
          
          <div className="flex items-start gap-2 mb-3">
            <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-gray-500">TRIP DETAILS</p>
              <p className="font-medium">
                {tripType.charAt(0).toUpperCase() + tripType.slice(1)} - {tripMode === 'round-trip' ? 'Round Trip' : 'One Way'}
                <br/>
                {tripType === 'local' && hourlyPackage && `Package: ${hourlyPackage}`}
                <br/>
                Distance: {distance} km {tripMode === 'round-trip' && `(${2 * distance} km round trip)`}
              </p>
            </div>
          </div>
        </div>
        
        <div className="border-b pb-4">
          <h3 className="font-semibold mb-2">Fare Breakdown</h3>
          
          {isRefreshing || showDetailsLoading || isLoadingFare ? (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="flex justify-between items-center">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="flex justify-between items-center">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          ) : (
            <>
              {tripType === 'outstation' && (
                <>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-600">Base fare</span>
                    <span className="font-medium">{formatPrice(baseFare)}</span>
                  </div>
                  
                  {extraDistance > 0 && (
                    <div className="flex justify-between py-1">
                      <span className="text-gray-600">
                        Extra distance ({extraDistance} km @ {formatPrice(perKmRate)}/km)
                      </span>
                      <span className="font-medium">{formatPrice(extraDistanceFare)}</span>
                    </div>
                  )}
                  
                  {driverAllowance > 0 && (
                    <div className="flex justify-between py-1">
                      <span className="text-gray-600">Driver allowance</span>
                      <span className="font-medium">{formatPrice(driverAllowance)}</span>
                    </div>
                  )}
                  
                  {nightCharges > 0 && (
                    <div className="flex justify-between py-1">
                      <span className="text-gray-600">Night charges</span>
                      <span className="font-medium">{formatPrice(nightCharges)}</span>
                    </div>
                  )}
                </>
              )}
              
              {tripType === 'airport' && (
                <>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-600">Base fare</span>
                    <span className="font-medium">{formatPrice(baseFare)}</span>
                  </div>
                  
                  {extraDistance > 0 && (
                    <div className="flex justify-between py-1">
                      <span className="text-gray-600">
                        Extra distance ({extraDistance} km @ {formatPrice(perKmRate)}/km)
                      </span>
                      <span className="font-medium">{formatPrice(extraDistanceFare)}</span>
                    </div>
                  )}
                  
                  {driverAllowance > 0 && (
                    <div className="flex justify-between py-1">
                      <span className="text-gray-600">Driver allowance</span>
                      <span className="font-medium">{formatPrice(driverAllowance)}</span>
                    </div>
                  )}
                </>
              )}
              
              {tripType === 'local' && (
                <div className="flex justify-between py-1">
                  <span className="text-gray-600">
                    {hourlyPackage || '8hrs-80km'} package
                  </span>
                  <span className="font-medium">{formatPrice(calculatedFare)}</span>
                </div>
              )}
            </>
          )}
        </div>
        
        <div className="pt-2">
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold">Total</span>
            {isRefreshing || showDetailsLoading || isLoadingFare ? (
              <Skeleton className="h-6 w-24" />
            ) : (
              <span className="text-xl font-bold">{formatPrice(finalTotal)}</span>
            )}
          </div>
          
          {isRefreshing || showDetailsLoading || isLoadingFare ? (
            <div className="text-xs text-blue-600 flex items-center mt-2">
              <div className="animate-spin mr-1 h-3 w-3 border-b-2 border-blue-600"></div>
              Updating fare...
            </div>
          ) : (
            <p className="text-xs text-gray-500 mt-1">
              Inclusive of all taxes. No hidden charges.
            </p>
          )}
        </div>
        
        {(tripType === 'outstation' || tripType === 'airport') && (
          <div className="text-xs text-gray-500 mt-2 p-2 bg-gray-50 rounded-md">
            <p className="mb-1">Notes:</p>
            <ul className="list-disc pl-4 space-y-1">
              {tripType === 'outstation' && (
                <>
                  <li>Toll charges, state permit fees will be charged extra as applicable.</li>
                  <li>Minimum billable distance is {minimumKm} km.</li>
                </>
              )}
              {tripType === 'airport' && (
                <>
                  <li>Airport parking charges will be extra as applicable.</li>
                  <li>Waiting charges may apply after 30 minutes of free waiting.</li>
                </>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
