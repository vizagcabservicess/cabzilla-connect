import { useState, useEffect, useRef } from 'react';
import { Location } from '@/lib/locationData';
import { CabType } from '@/types/cab';
import { TripType } from '@/lib/tripTypes';
import { formatPrice } from '@/lib/cabData';
import { format } from 'date-fns';
import { Car, MapPin, Calendar, User, Info, ChevronDown, ChevronUp, Tag, Users, Briefcase, Fuel, Check, X, Edit2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { getLocalPackagePrice } from '@/lib/packageData';
import { calculateFare, calculateOutstationRoundTripFare } from '@/lib/fareCalculationService';
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
  hourlyPackage: string;
  onFinalTotalChange?: (total: number) => void;
  onEditPickupLocation?: () => void;
  onEditPickupDate?: () => void;
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
  hourlyPackage,
  onFinalTotalChange,
  onEditPickupLocation,
  onEditPickupDate
}: BookingSummaryProps) => {
  console.log(`BookingSummary: Rendering with package ${hourlyPackage}`);

  const { fareData, isLoading } = useFare(
    selectedCab?.id || '',
    tripType,
    distance,
    tripType === 'local' ? hourlyPackage : undefined,
    pickupDate
  );

  const [calculatedFare, setCalculatedFare] = useState<number>(0);
  const [baseFare, setBaseFare] = useState<number>(0);
  const [driverAllowance, setDriverAllowance] = useState<number>(250);
  const [nightCharges, setNightCharges] = useState<number>(0);
  const [extraDistanceFare, setExtraDistanceFare] = useState<number>(0);
  const [extraDistance, setExtraDistance] = useState<number>(0);
  const [perKmRate, setPerKmRate] = useState<number>(0);
  const [effectiveDistance, setEffectiveDistance] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [showDetailsLoading, setShowDetailsLoading] = useState<boolean>(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [outstationBreakdown, setOutstationBreakdown] = useState<any>(null);

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

  // Local package limits
  const localPackageLimits: Record<string, { km: number; hours: number }> = {
    '4hrs-40km': { km: 40, hours: 4 },
    '8hrs-80km': { km: 80, hours: 8 },
    '10hrs-100km': { km: 100, hours: 10 },
  };
  const selectedPackage = localPackageLimits[hourlyPackage] || { km: 80, hours: 8 };

  // Calculate extra km/hours for local trips
  let extraKm = 0;
  let extraHours = 0;
  let extraKmFare = 0;
  let extraHourFare = 0;
  let localBaseFare = fareData?.breakdown?.basePrice || 0;
  let localTotal = totalPrice;

  if (tripType === 'local') {
    extraKm = Math.max(0, distance - selectedPackage.km);
    // For now, use 0 for extra hours unless you have a way to get trip duration
    extraHours = 0; // You can update this if you have trip duration
    const extraKmCharge = fareData?.breakdown?.extraKmCharge || 0;
    const extraHourCharge = fareData?.breakdown?.extraHourCharge || 0;
    extraKmFare = extraKm * extraKmCharge;
    extraHourFare = extraHours * extraHourCharge;
    localTotal = localBaseFare + extraKmFare + extraHourFare;
  }

  // Calculate total for airport trips as sum of visible breakdown items
  let airportTotal = 0;
  if (tripType === 'airport') {
    const base = fareData?.breakdown?.basePrice || 0;
    const airportFee = fareData?.breakdown?.airportFee || 0;
    const extra = fareData?.breakdown?.extraDistanceFare || 0;
    airportTotal = base + airportFee + extra;
  }

  // Patch: For tour bookings, use selectedCab.price or tour pricing
  let tourBaseFare = 0;
  if (tripType === 'tour' && selectedCab) {
    // Try selectedCab.price first
    if (typeof selectedCab.price === 'number' && selectedCab.price > 0) {
      tourBaseFare = selectedCab.price;
    }
  }

  function getFareKey({ tripType, cabId, packageType }: { tripType: string, cabId: string, packageType?: string }) {
    if (tripType === "outstation") {
      return `fare_outstation_${cabId}`;
    }
    if (tripType === "local") {
      return `fare_local_${cabId}_${packageType || ""}`;
    }
    if (tripType === "airport") {
      return `fare_airport_${cabId}`;
    }
    return `fare_${tripType}_${cabId}`;
  }

  useEffect(() => {
    totalPriceRef.current = totalPrice;

    if (totalPrice > 0) {
      setCalculatedFare(totalPrice);

      if (selectedCab) {
        try {
          const normalizedId = normalizeVehicleId(selectedCab.id);
          const fareKey = getFareKey({ tripType, cabId: normalizedId });
          localStorage.setItem(fareKey, String(calculatedFare));
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith(`fare_outstation_${normalizedId}_`)) {
              localStorage.removeItem(key);
            }
          });
          window.dispatchEvent(new CustomEvent("fare-calculated", {
            detail: {
              cabId: normalizedId,
              tripType,
              calculated: true,
              fare: calculatedFare,
              timestamp: Date.now(),
            }
          }));
          const wrongKey = `fare_outstation_${normalizedId}_${hourlyPackage}`;
          if (wrongKey !== fareKey) localStorage.removeItem(wrongKey);
        } catch (error) {
          console.error('Error storing fare in localStorage:', error);
        }
      }

      const estimatedBaseFare = totalPrice - driverAllowance - nightCharges - extraDistanceFare;
      if (estimatedBaseFare > 0) {
        setBaseFare(estimatedBaseFare);
      }
    }
  }, [totalPrice, driverAllowance, nightCharges, extraDistanceFare, selectedCab, tripType, calculatedFare]);

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

        try {
          const normalizedId = normalizeVehicleId(selectedCab.id);
          const fareKey = getFareKey({ tripType, cabId: normalizedId });
          localStorage.setItem(fareKey, String(calculatedFare));
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith(`fare_outstation_${normalizedId}_`)) {
              localStorage.removeItem(key);
            }
          });
          window.dispatchEvent(new CustomEvent("fare-calculated", {
            detail: {
              cabId: normalizedId,
              tripType,
              calculated: true,
              fare: calculatedFare,
              timestamp: Date.now(),
            }
          }));
          const wrongKey = `fare_outstation_${normalizedId}_${hourlyPackage}`;
          if (wrongKey !== fareKey) localStorage.removeItem(wrongKey);
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

          try {
            const normalizedId = normalizeVehicleId(selectedCab.id);
            const fareKey = getFareKey({ tripType, cabId: normalizedId });
            localStorage.setItem(fareKey, String(event.detail.fare));
            Object.keys(localStorage).forEach(key => {
              if (key.startsWith(`fare_outstation_${normalizedId}_`)) {
                localStorage.removeItem(key);
              }
            });
            window.dispatchEvent(new CustomEvent("fare-calculated", {
              detail: {
                cabId: normalizedId,
                tripType,
                calculated: true,
                fare: event.detail.fare,
                timestamp: Date.now(),
              }
            }));
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
  }, [selectedCab, totalPrice, driverAllowance, nightCharges, extraDistanceFare, tripType, calculatedFare, hourlyPackage]);

  useEffect(() => {
    if (
      lastDistanceRef.current !== distance || 
      lastTripModeRef.current !== tripMode
    ) {
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

    if (tripType === 'local' && fareData?.breakdown?.packageLabel) {
      setBaseFare(fareData.totalPrice);
      setDriverAllowance(0);
      setNightCharges(0);
      setExtraDistanceFare(0);
      setCalculatedFare(fareData.totalPrice);
    } else {
      setBaseFare(fareData.basePrice || 0);
      setDriverAllowance(fareData.breakdown.driverAllowance || 250);
      setNightCharges(fareData.breakdown.nightCharges || 0);
      setExtraDistanceFare(fareData.breakdown.extraDistanceFare || 0);
      setCalculatedFare(fareData.totalPrice);
    }
  }, [fareData, selectedCab, tripType]);

  useEffect(() => {
    if (tripType === 'local' && hourlyPackage) {
      console.log('BookingSummary: Package changed to:', hourlyPackage);
      if (selectedCab) {
        const normalizedId = normalizeVehicleId(selectedCab.id);
        const bookingSummaryKey = `booking_summary_fare_${tripType}_${normalizedId}_${hourlyPackage}`;
        localStorage.removeItem(bookingSummaryKey);
        console.log(`BookingSummary: Cleared stored fare for package change: ${bookingSummaryKey}`);
      }
      setShowDetailsLoading(true);
      if (calculationTimeoutRef.current) {
        clearTimeout(calculationTimeoutRef.current);
      }
      calculationTimeoutRef.current = setTimeout(() => {
        recalculateFareDetails();
      }, 100);
    }
  }, [hourlyPackage, tripType, selectedCab]);

  useEffect(() => {
    if (selectedCab && fareData?.totalPrice > 0) {
      try {
        const normalizedId = normalizeVehicleId(selectedCab.id);
        const fareKey = getFareKey({ tripType, cabId: normalizedId });
        localStorage.setItem(fareKey, String(fareData.totalPrice));
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith(`fare_outstation_${normalizedId}_`)) {
            localStorage.removeItem(key);
          }
        });
        console.log(`BookingSummary: Stored fare with package: ${fareKey} = ${fareData.totalPrice}`);

        window.dispatchEvent(new CustomEvent("fare-calculated", {
          detail: {
            cabId: normalizedId,
            tripType,
            calculated: true,
            fare: fareData.totalPrice,
            timestamp: Date.now(),
          }
        }));
      } catch (error) {
        console.error('Error storing fare in localStorage:', error);
      }
    }
  }, [fareData, selectedCab, tripType]);

  useEffect(() => {
    if (tripType !== 'outstation' || !selectedCab) return;

      async function calculateOutstationBreakdown() {
        try {
          const normalizedId = normalizeVehicleId(selectedCab.id);
          const outstationFares = await getOutstationFaresForVehicle(normalizedId);

          // Only apply for round-trip
          if (tripMode === 'round-trip' && pickupDate && returnDate && selectedCab) {
            const perKmRate = outstationFares.pricePerKm;
            const nightAllowancePerNight = outstationFares.nightHaltCharge;
            const driverAllowancePerDay = outstationFares.driverAllowance;
            const actualDistance = distance * 2;
            const fareResult = calculateOutstationRoundTripFare({
              pickupDate,
              returnDate,
              actualDistance,
              perKmRate,
              nightAllowancePerNight,
              driverAllowancePerDay
            });
            setBaseFare(fareResult.baseFare);
            setDriverAllowance(fareResult.driverAllowance);
            setNightCharges(fareResult.nightAllowance);
            setExtraDistance(fareResult.extraDistance);
            setExtraDistanceFare(fareResult.extraDistanceCharges);
            setPerKmRate(perKmRate);
            setEffectiveDistance(fareResult.includedKM);
            setCalculatedFare(fareResult.totalFare);
            // Store breakdown for UI
            setOutstationBreakdown(fareResult);
            return;
          }

          // ... existing one-way or fallback logic below ...
        } catch (err) {
          console.error('[BookingSummary][OUTSTATION]: Calculation error', err);
          setCalculatedFare(totalPrice);
        }
      }

      calculateOutstationBreakdown();
  }, [tripType, selectedCab, distance, pickupDate, tripMode, hourlyPackage, totalPrice]);

  const recalculateFareDetails = async (): Promise<void> => {
    if (calculationInProgressRef.current) {
      console.log('BookingSummary: Calculation already in progress, skipping duplicate calculation');
      return;
    }

    if (tripType === 'local' && fareData?.totalPrice > 0) {
      console.log('BookingSummary: Using fare from useFare hook for local package:', fareData.totalPrice, 'Package:', hourlyPackage);
      setCalculatedFare(fareData.totalPrice);
      setBaseFare(fareData.basePrice);
      setDriverAllowance(0);
      setNightCharges(0);
      setExtraDistanceFare(0);
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

          newPerKmRate = outstationFares.pricePerKm || 15;
          newBaseFare = outstationFares.basePrice || minimumKm * newPerKmRate;
          newDriverAllowance = outstationFares.driverAllowance || 250;

          newEffectiveDistance = distance * 2;

          if (newEffectiveDistance > minimumKm) {
            newExtraDistance = newEffectiveDistance - minimumKm;
            newExtraDistanceFare = newExtraDistance * newPerKmRate;
          } else {
            newExtraDistance = 0;
            newExtraDistanceFare = 0;
          }

          if (pickupDate && (pickupDate.getHours() >= 22 || pickupDate.getHours() <= 5)) {
            newNightCharges = Math.round(newBaseFare * 0.1);
          } else {
            newNightCharges = 0;
          }
        } catch (error) {
          console.error('Error fetching outstation fares:', error);

          newPerKmRate = normalizeVehicleId(selectedCab.id).includes('sedan') ? 12 :
                        normalizeVehicleId(selectedCab.id).includes('ertiga') ? 14 :
                        normalizeVehicleId(selectedCab.id).includes('innova') ? 16 : 15;

          newBaseFare = minimumKm * newPerKmRate;
          newDriverAllowance = 250;
          newEffectiveDistance = distance * 2;
          if (newEffectiveDistance > minimumKm) {
            newExtraDistance = newEffectiveDistance - minimumKm;
            newExtraDistanceFare = newExtraDistance * newPerKmRate;
          }

          if (pickupDate && (pickupDate.getHours() >= 22 || pickupDate.getHours() <= 5)) {
            newNightCharges = Math.round(newBaseFare * 0.1);
          }
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
        } else if (distance <= 40) {
          newBaseFare = airportFares.tier4Price || airportFares.basePrice || 2000;
          newExtraDistance = 0;
          newExtraDistanceFare = 0;
        } else {
          newBaseFare = airportFares.tier4Price || airportFares.basePrice || 2000;
          newExtraDistance = distance - 40;
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

      try {
        const normalizedId = normalizeVehicleId(selectedCab.id);
        const fareKey = getFareKey({ tripType, cabId: normalizedId });
        localStorage.setItem(fareKey, String(finalFare));
        console.log(`BookingSummary: Stored calculated fare in localStorage: ${fareKey} = ${finalFare}`);

        if (tripType === 'airport') {
          window.dispatchEvent(new CustomEvent("fare-calculated", {
            detail: {
              cabId: normalizedId,
              tripType: tripType,
              tripMode: tripMode,
              calculated: true,
              fare: finalFare,
              timestamp: Date.now(),
            }
          }));
        }
      } catch (error) {
        console.error('Error storing fare in localStorage:', error);
      }

      if (Math.abs(newCalculatedFare - totalPrice) > 10 && totalPrice > 0 && !isNaN(newCalculatedFare)) {
        console.log(`BookingSummary: Significant fare difference detected - calculated: ${newCalculatedFare}, parent: ${totalPrice}`);

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

        if (tripType === 'airport' && Math.abs(newCalculatedFare - totalPrice) > 50) {
          console.log(`BookingSummary: Using calculated fare ${newCalculatedFare} for airport transfer instead of ${totalPrice}`);
          setCalculatedFare(newCalculatedFare);
          totalPriceRef.current = newCalculatedFare;

          const normalizedId = normalizeVehicleId(selectedCab.id);
          const fareKey = getFareKey({ tripType, cabId: normalizedId });
          localStorage.setItem(fareKey, String(newCalculatedFare));
          window.dispatchEvent(new CustomEvent("fare-calculated", {
            detail: {
              cabId: normalizedId,
              tripType: tripType,
              tripMode: tripMode,
              calculated: true,
              fare: newCalculatedFare,
              timestamp: Date.now(),
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

          try {
            const normalizedId = normalizeVehicleId(customEvent.detail.cabType);
            const fareKey = getFareKey({ tripType, cabId: normalizedId });
            localStorage.setItem(fareKey, String(customEvent.detail.fare));
            console.log(`BookingSummary: Stored selected cab fare in localStorage: ${fareKey} = ${customEvent.detail.fare}`);

            if (tripType === 'airport') {
              window.dispatchEvent(new CustomEvent("fare-calculated", {
                detail: {
                  cabId: normalizedId,
                  tripType: tripType,
                  tripMode: tripMode,
                  calculated: true,
                  fare: customEvent.detail.fare,
                  timestamp: Date.now(),
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

        if (selectedCab) {
          try {
            const normalizedId = normalizeVehicleId(selectedCab.id);
            const fareKey = getFareKey({ tripType, cabId: normalizedId });
            localStorage.setItem(fareKey, String(totalPrice));
            console.log(`BookingSummary: Stored initial fare in localStorage: ${fareKey} = ${totalPrice}`);

            if (tripType === 'airport') {
              window.dispatchEvent(new CustomEvent("fare-calculated", {
                detail: {
                  cabId: normalizedId,
                  tripType: tripType,
                  tripMode: tripMode,
                  calculated: true,
                  fare: totalPrice,
                  timestamp: Date.now(),
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

  const sumBreakdown = (breakdown: any) => {
    if (!breakdown) return 0;
    const fields = [
      'basePrice',
      'driverAllowance',
      'nightCharges',
      'extraDistanceFare',
      'extraHourCharge',
      'airportFee',
    ];
    let total = 0;
    for (const key of fields) {
      const val = breakdown[key];
      if (typeof val === 'number' && !isNaN(val)) {
        total += val;
      }
    }
    return total;
  };

  useEffect(() => {
    if (onFinalTotalChange) {
      if (tripType === 'local') {
        onFinalTotalChange(localTotal);
      } else if (tripType === 'outstation' && tripMode === 'round-trip' && outstationBreakdown) {
        onFinalTotalChange(outstationBreakdown.totalFare);
      } else {
        onFinalTotalChange(sumBreakdown(fareData?.breakdown || {}));
      }
    }
  }, [localTotal, fareData?.breakdown, tripType, tripMode, outstationBreakdown, onFinalTotalChange]);

  if (!pickupLocation || (!dropLocation && tripType !== 'local' && tripType !== 'tour') || !pickupDate || !selectedCab) {
    return <div className="p-4 bg-gray-100 rounded-lg">Booking information not available</div>;
  }

  const breakdown = fareData?.breakdown || {};
  const finalTotal = fareData?.totalPrice || totalPrice;

  let summaryBaseFare = breakdown.basePrice || 0;
  let summaryDriverAllowance = breakdown.driverAllowance || 0;
  let summaryNightAllowance = breakdown.nightCharges || 0;
  let summaryExtraDistanceCharges = breakdown.extraDistanceFare || 0;
  let summaryTotal = sumBreakdown(breakdown);

  if (tripType === 'outstation' && tripMode === 'round-trip' && outstationBreakdown) {
    summaryBaseFare = outstationBreakdown.baseFare;
    summaryDriverAllowance = outstationBreakdown.driverAllowance;
    summaryNightAllowance = outstationBreakdown.nightAllowance;
    summaryExtraDistanceCharges = outstationBreakdown.extraDistanceCharges;
    summaryTotal = outstationBreakdown.totalFare;
  }

  return (
    <div className="text-[14px] md:text-[14px]">
      <div className="bg-white rounded-lg shadow-md p-4 md:p-5 relative">
        <h2 className="text-[14px] md:text-[15px] font-semibold mb-3 text-left">Booking Summary</h2>

        <div className="space-y-3">
          <div className="border-b pb-3">
            <div className="flex items-start gap-2 mb-2">
              <Calendar className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="text-left">
                <p className="text-[12px] text-gray-500 text-left">TRIP TYPE</p>
                <p className="font-semibold text-[14px] capitalize text-left">
                  {tripType === 'outstation' ? `${tripType} (${tripMode})` : tripType}
                  {tripType === 'local' && ` - ${hourlyPackage}`}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 mb-2">
              <MapPin className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="text-left">
                <p className="text-[12px] text-gray-500 text-left">{(tripType === 'outstation' && tripMode === 'round-trip') ? 'ACTUAL DISTANCE' : 'TOTAL DISTANCE'}</p>
                <p className="font-semibold text-left text-[14px]">
                  {(tripType === 'outstation' && tripMode === 'round-trip')
                    ? `${distance * 2} KM`
                    : (tripType === 'outstation' || tripType === 'airport') && distance === 0 && pickupLocation && dropLocation
                      ? <span className="text-blue-500 animate-pulse">Calculating...</span>
                      : `${distance} KM`}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 mb-2">
              <MapPin className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="text-left flex-1">
                <p className="text-[12px] text-gray-500 text-left">PICKUP</p>
                <p className="font-semibold text-left text-[14px]">{pickupLocation.address || pickupLocation.name}</p>
              </div>
              {onEditPickupLocation && (
                <button
                  onClick={onEditPickupLocation}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  title="Edit pickup location"
                >
                  <Edit2 className="h-4 w-4 text-gray-500 hover:text-blue-500" />
                </button>
              )}
            </div>

            {tripType !== 'local' && tripType !== 'tour' && dropLocation && (
              <div className="flex items-start gap-2">
                <MapPin className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="text-left">
                  <p className="text-[12px] text-gray-500 text-left">DROP-OFF</p>
                  <p className="font-semibold text-left text-[14px]">{dropLocation.address || dropLocation.name}</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-2 mt-3">
              <Calendar className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-[12px] text-gray-500 text-left">PICKUP DATE</p>
                <p className="font-semibold text-[14px]">
                  {pickupDate ? format(pickupDate, 'EEE, MMM d, yyyy - h:mm a') : 'Not selected'}
                </p>
              </div>
              {onEditPickupDate && (
                <button
                  onClick={onEditPickupDate}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  title="Edit pickup date"
                >
                  <Edit2 className="h-4 w-4 text-gray-500 hover:text-blue-500" />
                </button>
              )}
            </div>

            {tripType === 'outstation' && tripMode === 'round-trip' && returnDate && (
              <div className="flex items-start gap-2 mt-4">
                <Calendar className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[12px] text-gray-500">RETURN DATE</p>
                  <p className="font-semibold text-[14px]">
                    {format(returnDate, 'EEE, MMM d, yyyy - h:mm a')}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="border-b pb-3">
            <div className="flex items-center gap-2">
              <Car className="h-5 w-5 text-blue-500" />
              <p className="font-semibold text-[14px]">{selectedCab.name}</p>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4 text-gray-500" />
                <span className="text-[14px] text-gray-600">{selectedCab.capacity} Seats</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {tripType === 'local' ? (
              <>
                <div className="flex justify-between items-center mb-2">
                  <p className="text-gray-600 text-[14px]">Base fare</p>
                  <p className="font-semibold text-[14px]">{formatPrice(breakdown.basePrice || 0)}</p>
                </div>
                {extraKmFare > 0 && (
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-gray-600 text-[14px]">Extra km charges</p>
                    <p className="text-[14px]">{formatPrice(extraKmFare)}</p>
                  </div>
                )}
                {extraHourFare > 0 && (
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-gray-600 text-[14px]">Extra hour charges</p>
                    <p className="text-[14px]">{formatPrice(extraHourFare)}</p>
                  </div>
                )}
                <Separator className="my-3" />
                <div className="flex justify-between items-center">
                  <p className="font-semibold text-[14px]">Total Price</p>
                  <p className="font-bold text-[14px]">{formatPrice(localTotal)}</p>
                </div>
              </>
            ) : tripType === 'tour' ? (
              <>
                <div className="flex justify-between items-center mb-2">
                  <p className="text-gray-600 text-[14px]">Base fare</p>
                  <p className="font-semibold text-[14px]">{formatPrice(tourBaseFare)}</p>
                </div>
                <Separator className="my-3" />
                <div className="flex justify-between items-center">
                  <p className="font-semibold text-[14px]">Total Price</p>
                  <p className="font-bold text-[14px]">{formatPrice(tourBaseFare)}</p>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between items-center mb-2">
                  <p className="text-gray-600 text-[14px]">Base fare</p>
                  <p className="font-semibold text-[14px]">{formatPrice(summaryBaseFare)}</p>
                </div>
                {summaryDriverAllowance > 0 && (
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-gray-600 text-[14px]">Driver allowance</p>
                    <p className="font-semibold text-[14px]">{formatPrice(summaryDriverAllowance)}</p>
                  </div>
                )}
                {summaryNightAllowance > 0 && (
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-gray-600 text-[14px]">Night allowance</p>
                    <p className="text-[14px]">{formatPrice(summaryNightAllowance)}</p>
                  </div>
                )}
                {summaryExtraDistanceCharges > 0 && (
                  <div className="flex justify-between items-center mb-2 group">
                    <div className="flex items-center gap-1">
                      <p className="text-gray-600 text-[14px]">Extra distance charges{typeof extraDistance === 'number' && extraDistance > 0 ? ` (${extraDistance} KM)` : ''}</p>
                    </div>
                    <p className="text-[14px]">{formatPrice(summaryExtraDistanceCharges)}</p>
                  </div>
                )}
                <Separator className="my-3" />
                <div className="flex justify-between items-center">
                  <p className="font-semibold text-[14px]">Total Price</p>
                  <p className="font-bold text-[14px]">{formatPrice(summaryTotal)}</p>
                </div>
              </>
            )}
            {isLoading && (
              <div className="mt-3 text-center">
                <p className="text-sm text-blue-500 animate-pulse">Calculating latest fare...</p>
              </div>
            )}
          </div>
          <div className="text-[12px] text-gray-500 mt-2">Parking and tolls fees are extra.</div>
        </div>
      </div>
    </div>
  );
};
