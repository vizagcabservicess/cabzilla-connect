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
import { useFare } from '../hooks/useFare';
import { normalizeVehicleId } from '@/utils/safeStringUtils';

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
  const { fareData, isLoading } = useFare(
    selectedCab?.id || '',
    tripType,
    distance,
    tripType === 'local' ? '8hrs-80km' : undefined
  );

  const [baseFare, setBaseFare] = useState<number>(0);
  const [driverAllowance, setDriverAllowance] = useState<number>(250);
  const [nightCharges, setNightCharges] = useState<number>(0);
  const [extraDistance, setExtraDistance] = useState<number>(0);
  const [extraDistanceFare, setExtraDistanceFare] = useState<number>(0);
  const [perKmRate, setPerKmRate] = useState<number>(0);
  const [effectiveDistance, setEffectiveDistance] = useState<number>(distance);
  const [calculatedFare, setCalculatedFare] = useState<number>(0);
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

  useEffect(() => {
    totalPriceRef.current = totalPrice;

    if (totalPrice > 0) {
      console.log(`BookingSummary: Setting calculated fare to match parent total price: ${totalPrice}`);
      setCalculatedFare(totalPrice);

      // Also store the fare in localStorage for CabList to access
      if (selectedCab) {
        try {
          const localStorageKey = `fare_${tripType}_${normalizeVehicleId(selectedCab.id)}`;
          localStorage.setItem(localStorageKey, totalPrice.toString());
          console.log(`BookingSummary: Stored fare in localStorage: ${localStorageKey} = ${totalPrice}`);

          // Dispatch event to notify CabList of updated fare
          window.dispatchEvent(new CustomEvent('booking-summary-fare-updated', {
            detail: {
              cabType: normalizeVehicleId(selectedCab.id),
              fare: totalPrice,
              tripType: tripType,
              timestamp: Date.now()
            }
          }));
        } catch (error) {
          console.error('Error storing fare in localStorage:', error);
        }
      }

      const estimatedBaseFare = totalPrice - driverAllowance - nightCharges - extraDistanceFare;
      if (estimatedBaseFare > 0) {
        setBaseFare(estimatedBaseFare);
      }
    }
  }, [totalPrice, driverAllowance, nightCharges, extraDistanceFare, selectedCab, tripType]);

  useEffect(() => {
    if (selectedCab && selectedCabIdRef.current !== selectedCab.id) {
      console.log('BookingSummary: Selected cab changed to', selectedCab.name, '- resetting calculation state');

      if (calculationTimeoutRef.current) {
        clearTimeout(calculationTimeoutRef.current);
      }

      selectedCabIdRef.current = selectedCab.id;

      calculationInProgressRef.current = false;
      calculationAttemptsRef.current = 0;
      lastUpdateTimeRef.current = 0;
      pendingCalculationRef.current = true;

      setShowDetailsLoading(true);

      if (totalPrice > 0) {
        setCalculatedFare(totalPrice);

        // Store the fare in localStorage for CabList to access
        try {
          const localStorageKey = `fare_${tripType}_${normalizeVehicleId(selectedCab.id)}`;
          localStorage.setItem(localStorageKey, totalPrice.toString());
          console.log(`BookingSummary: Stored fare in localStorage: ${localStorageKey} = ${totalPrice}`);

          // Dispatch event to notify CabList of updated fare
          window.dispatchEvent(new CustomEvent('booking-summary-fare-updated', {
            detail: {
              cabType: normalizeVehicleId(selectedCab.id),
              fare: totalPrice,
              tripType: tripType,
              timestamp: Date.now()
            }
          }));
        } catch (error) {
          console.error('Error storing fare in localStorage:', error);
        }
      }

      calculationTimeoutRef.current = setTimeout(() => {
        recalculateFareDetails();
      }, 100);

      const handleDirectFareUpdate = (event: CustomEvent) => {
        if (event.detail && event.detail.cabType === selectedCab.id && event.detail.fare > 0) {
          console.log(`BookingSummary: Received direct fare update for ${selectedCab.id}: ${event.detail.fare}`);
          setCalculatedFare(event.detail.fare);
          totalPriceRef.current = event.detail.fare;

          // Store this fare in localStorage for CabList to access
          try {
            const localStorageKey = `fare_${tripType}_${normalizeVehicleId(selectedCab.id)}`;
            localStorage.setItem(localStorageKey, event.detail.fare.toString());
            console.log(`BookingSummary: Stored direct fare in localStorage: ${localStorageKey} = ${event.detail.fare}`);
          } catch (error) {
            console.error('Error storing fare in localStorage:', error);
          }

          const estimatedBaseFare = event.detail.fare - driverAllowance - nightCharges - extraDistanceFare;
          if (estimatedBaseFare > 0) {
            setBaseFare(estimatedBaseFare);
          }

          setShowDetailsLoading(false);
        }
      };

      window.addEventListener('cab-selected-with-fare', handleDirectFareUpdate as EventListener);
      window.addEventListener('fare-calculated', handleDirectFareUpdate as EventListener);

      return () => {
        window.removeEventListener('cab-selected-with-fare', handleDirectFareUpdate as EventListener);
        window.removeEventListener('fare-calculated', handleDirectFareUpdate as EventListener);
      };
    }
  }, [selectedCab, totalPrice, driverAllowance, nightCharges, extraDistanceFare, tripType]);

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

      setShowDetailsLoading(true);

      if (totalPrice > 0) {
        setCalculatedFare(totalPrice);
      }

      calculationTimeoutRef.current = setTimeout(() => {
        recalculateFareDetails();
      }, 100);
    }
  }, [distance, tripMode, totalPrice]);

  useEffect(() => {
    if (!selectedCab || !fareData) return;

    setBaseFare(fareData.basePrice || 0);
    setDriverAllowance(fareData.breakdown.driverAllowance || 250);
    setNightCharges(fareData.breakdown.nightCharges || 0);
    setExtraDistanceFare(fareData.breakdown.extraDistanceFare || 0);
    setCalculatedFare(fareData.totalPrice);

    if (tripType === 'local' && fareData.breakdown.packageLabel) {
      setBaseFare(fareData.basePrice);
      setDriverAllowance(0);
      setNightCharges(0);
      setExtraDistanceFare(0);
    }
  }, [fareData, selectedCab, tripType]);

  const recalculateFareDetails = async (): Promise<void> => {
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
    console.log(`BookingSummary: Calculating fare details for ${selectedCab?.name} (attempt ${calculationAttemptsRef.current}/${maxCalculationAttempts})`);

    try {
      if (totalPrice > 0 && calculationAttemptsRef.current === 1) {
        setCalculatedFare(totalPrice);
      }

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
          const outstationFares = await getOutstationFaresForVehicle(normalizeVehicleId(selectedCab.id));
          console.log('BookingSummary: Retrieved outstation fares:', outstationFares);

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

          newPerKmRate = normalizeVehicleId(selectedCab.id).includes('sedan') ? 12 : 
                        normalizeVehicleId(selectedCab.id).includes('ertiga') ? 14 : 
                        normalizeVehicleId(selectedCab.id).includes('innova') ? 16 : 15;

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
        const airportFares = await getAirportFaresForVehicle(normalizeVehicleId(selectedCab.id));
        console.log('BookingSummary: Retrieved airport fares:', airportFares);

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
        const localFares = await getLocalFaresForVehicle(normalizeVehicleId(selectedCab.id));
        console.log('BookingSummary: Retrieved local fares:', localFares);

        if (localFares.price8hrs80km > 0) {
          newBaseFare = localFares.price8hrs80km;
        } else if (selectedCab.localPackageFares?.price8hrs80km) {
          newBaseFare = selectedCab.localPackageFares.price8hrs80km;
        } else {
          if (normalizeVehicleId(selectedCab.id).includes('sedan')) newBaseFare = 1500;
          else if (normalizeVehicleId(selectedCab.id).includes('ertiga')) newBaseFare = 1800;
          else if (normalizeVehicleId(selectedCab.id).includes('innova')) newBaseFare = 2200;
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

      const finalFare = (totalPrice > 0) ? totalPrice : newCalculatedFare;
      setCalculatedFare(finalFare);
      totalPriceRef.current = finalFare;

      // Update localStorage with the calculated fare
      try {
        const localStorageKey = `fare_${tripType}_${normalizeVehicleId(selectedCab.id)}`;
        localStorage.setItem(localStorageKey, finalFare.toString());
        console.log(`BookingSummary: Stored calculated fare in localStorage: ${localStorageKey} = ${finalFare}`);

        // For airport transfers, dispatch a fare-calculated event to update cab cards
        if (tripType === 'airport') {
          window.dispatchEvent(new CustomEvent('fare-calculated', {
            detail: {
              cabId: normalizeVehicleId(selectedCab.id),
              tripType: tripType,
              tripMode: tripMode,
              calculated: true,
              fare: finalFare,
              timestamp: Date.now()
            }
          }));
        }
      } catch (error) {
        console.error('Error storing fare in localStorage:', error);
      }

      if (Math.abs(newCalculatedFare - totalPrice) > 10 && totalPrice > 0 && !isNaN(newCalculatedFare)) {
        console.log(`BookingSummary: Significant fare difference detected - calculated: ${newCalculatedFare}, parent: ${totalPrice}`);

        // CRITICAL FIX: Emit a custom event for significant fare differences
        // CabList and CabOptions will listen for this event to update their displayed fares
        window.dispatchEvent(new CustomEvent('significant-fare-difference', {
          detail: {
            cabId: normalizeVehicleId(selectedCab.id),
            calculatedFare: newCalculatedFare,
            parentFare: totalPrice,
            tripType: tripType,
            tripMode: tripMode,
            timestamp: Date.now()
          }
        }));

        // For airport transfers, we need to make sure the calculated fare is used
        if (tripType === 'airport' && Math.abs(newCalculatedFare - totalPrice) > 50) {
          console.log(`BookingSummary: Using calculated fare ${newCalculatedFare} for airport transfer instead of ${totalPrice}`);
          setCalculatedFare(newCalculatedFare);
          totalPriceRef.current = newCalculatedFare;

          // Store this calculated fare in localStorage and re-emit
          const localStorageKey = `fare_${tripType}_${normalizeVehicleId(selectedCab.id)}`;
          localStorage.setItem(localStorageKey, newCalculatedFare.toString());

          // Emit an event for the CabList to update with this calculated fare
          window.dispatchEvent(new CustomEvent('fare-calculated', {
            detail: {
              cabId: normalizeVehicleId(selectedCab.id),
              tripType: tripType,
              tripMode: tripMode,
              calculated: true,
              fare: newCalculatedFare,
              timestamp: Date.now()
            }
          }));
        }
      }
    } catch (error) {
      console.error('Error calculating fare details:', error);
      setCalculatedFare(totalPrice > 0 ? totalPrice : totalPriceRef.current);
    } finally {
      setIsRefreshing(false);
      setShowDetailsLoading(false);
      calculationInProgressRef.current = false;

      if (pendingCalculationRef.current) {
        console.log('BookingSummary: Another calculation is pending, scheduling retry');
        calculationTimeoutRef.current = setTimeout(() => {
          recalculateFareDetails();
        }, 150);
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

          // Store this fare in localStorage
          try {
            const localStorageKey = `fare_${tripType}_${normalizeVehicleId(customEvent.detail.cabType)}`;
            localStorage.setItem(localStorageKey, customEvent.detail.fare.toString());
            console.log(`BookingSummary: Stored selected cab fare in localStorage: ${localStorageKey} = ${customEvent.detail.fare}`);

            // Broadcast the fare calculation back to CabList
            if (tripType === 'airport') {
              window.dispatchEvent(new CustomEvent('fare-calculated', {
                detail: {
                  cabId: normalizeVehicleId(customEvent.detail.cabType),
                  tripType: tripType,
                  tripMode: tripMode,
                  calculated: true,
                  fare: customEvent.detail.fare,
                  timestamp: Date.now()
                }
              }));
            }
          } catch (error) {
            console.error('Error storing fare in localStorage:', error);
          }

          setShowDetailsLoading(false);
        }
        return;
      }

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
        setShowDetailsLoading(true);
        if (calculationTimeoutRef.current) {
          clearTimeout(calculationTimeoutRef.current);
        }
        calculationTimeoutRef.current = setTimeout(() => {
          recalculateFareDetails();
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

      if (calculationTimeoutRef.current) {
        clearTimeout(calculationTimeoutRef.current);
      }

      calculationTimeoutRef.current = setTimeout(() => {
        recalculateFareDetails();
      }, 100);
    };

    const initialLoadTimer = setTimeout(() => {
      if (totalPrice > 0) {
        setCalculatedFare(totalPrice);
        totalPriceRef.current = totalPrice;

        // Store this fare in localStorage for CabList to access
        if (selectedCab) {
          try {
            const localStorageKey = `fare_${tripType}_${normalizeVehicleId(selectedCab.id)}`;
            localStorage.setItem(localStorageKey, totalPrice.toString());
            console.log(`BookingSummary: Stored initial fare in localStorage: ${localStorageKey} = ${totalPrice}`);

            // For airport transfers, dispatch fare event immediately
            if (tripType === 'airport') {
              window.dispatchEvent(new CustomEvent('fare-calculated', {
                detail: {
                  cabId: normalizeVehicleId(selectedCab.id),
                  tripType: tripType,
                  tripMode: tripMode,
                  calculated: true,
                  fare: totalPrice,
                  timestamp: Date.now()
                }
              }));
            }
          } catch (error) {
            console.error('Error storing fare in localStorage:', error);
          }
        }

        recalculateFareDetails();
      } else {
        recalculateFareDetails();
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
  }, [totalPrice, selectedCab, tripType, tripMode]);

  useEffect(() => {
    const checkPendingInterval = setInterval(() => {
      if (pendingCalculationRef.current && !calculationInProgressRef.current && calculationAttemptsRef.current < maxCalculationAttempts) {
        console.log('BookingSummary: Processing pending calculation...');

        if (calculationTimeoutRef.current) {
          clearTimeout(calculationTimeoutRef.current);
        }

        calculationTimeoutRef.current = setTimeout(() => {
          recalculateFareDetails();
        }, 10);
      }
    }, 1000);

    return () => clearInterval(checkPendingInterval);
  }, []);

  if (!pickupLocation || (!dropLocation && tripType !== 'local' && tripType !== 'tour') || !pickupDate || !selectedCab) {
    return <div className="p-4 bg-gray-100 rounded-lg">Booking information not available</div>;
  }

  let finalTotal = totalPrice > 0 ? totalPrice : calculatedFare;

  // For local packages, use the price from local_package_fares table
  if (tripType === 'local' && selectedCab) {
    const localStorageKey = `fare_local_${normalizeVehicleId(selectedCab.id)}`;
    const storedFare = localStorage.getItem(localStorageKey);
    if (storedFare) {
      const parsedFare = parseInt(storedFare, 10);
      if (parsedFare > 0) {
        finalTotal = parsedFare;
      }
    }
  }

  // Ensure we have a valid total
  if (finalTotal <= 0 && selectedCab) {
    if (selectedCab.price) {
      finalTotal = selectedCab.price;
    } else {
      // Use prices from the database as shown in the screenshot
      if (tripType === 'local') {
        if (normalizeVehicleId(selectedCab.id).includes('sedan')) finalTotal = 2500;
        else if (normalizeVehicleId(selectedCab.id).includes('ertiga')) finalTotal = 3200;
        else if (normalizeVehicleId(selectedCab.id).includes('innova')) finalTotal = 6000;
      } else {
        finalTotal = tripType === 'airport' ? 1000 : 2500;
      }
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
          <div className={`space-y-3 transition-opacity duration-300 ${isRefreshing || showDetailsLoading ? 'opacity-50' : 'opacity-100'}`}>
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

            <Separator />

            <div className="flex justify-between text-lg font-bold pt-2">
              <span>Total Amount</span>
              <span>
                {isLoading ? (
                  <span className="text-gray-400">Calculating...</span>
                ) : (
                  `₹${(fareData?.totalPrice || 0).toLocaleString()}`
                )}
              </</span>
            </div>
          </div>
        </div>
      </div>

      {(isRefreshing || showDetailsLoading) && (
        <div className="absolute inset-0 bg-white/5 flex items-center justify-center rounded-lg pointer-events-none">
          <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
        </div>
      )}
    </div>
  );
// Add final useEffect for fare calculations
  useEffect(() => {
    const calculateFares = async () => {
      if (!selectedCab?.id) {
        console.log('BookingSummary: No cab selected, skipping fare calculation');
        return;
      }

      try {
        await recalculateFareDetails();
      } catch (error) {
        console.error('BookingSummary: Error calculating fares:', error);
      }
    };

    calculateFares();
  }, [selectedCab?.id, distance, tripType, tripMode]);

  return (
    <div className="bg-white rounded-lg shadow-md p-6 relative">
      {/* Rest of the JSX */}
    </div>
  );
};

export default BookingSummary;