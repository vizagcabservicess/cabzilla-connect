import { useState, useEffect, useRef } from 'react';
import { Location } from '@/lib/locationData';
import { CabType } from '@/types/cab';
import { TripType } from '@/lib/tripTypes';
import { formatPrice } from '@/lib/cabData';
import { format } from 'date-fns';
import { Car, MapPin, Calendar, User, Info, ChevronDown, ChevronUp, Tag, Users, Briefcase, Fuel, Check, X, Edit2, MessageCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { getLocalPackagePrice } from '@/lib/packageData';
import { calculateFare, calculateOutstationRoundTripFare } from '@/lib/fareCalculationService';
import { getLocalFaresForVehicle, getAirportFaresForVehicle } from '@/services/fareService';
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
  hideInclusionsExclusions?: boolean;
  breakdown?: any; // Breakdown passed from selected cab - should be used instead of recalculating
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
  onEditPickupDate,
  hideInclusionsExclusions = false,
  breakdown: passedBreakdown
}: BookingSummaryProps) => {
  console.log(`BookingSummary: Rendering with package ${hourlyPackage}`);

  // Only recalculate if no breakdown was passed - this ensures consistency with the fare shown in the list
  const { fareData, isLoading } = useFare(
    selectedCab?.id || '',
    tripType,
    distance,
    tripType === 'local' ? hourlyPackage : (tripType === 'outstation' ? tripMode : undefined),
    pickupDate,
    tripType === 'outstation' && tripMode === 'round-trip' ? returnDate : undefined
  );

  // Debug: Log the fare data from useFare hook
  console.log('BookingSummary: useFare hook data:', {
    fareData,
    isLoading,
    tripType,
    tripMode,
    distance,
    selectedCabId: selectedCab?.id
  });

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
    // If breakdown was passed, use it instead of recalculating - ensures consistency
    if (passedBreakdown && selectedCab) {
      console.log('BookingSummary: Using passed breakdown to ensure consistency with cab list:', passedBreakdown);
      console.log('BookingSummary: Using totalPrice from prop:', totalPrice);
      
      if (tripType === 'local' && passedBreakdown?.packageLabel) {
        setBaseFare(totalPrice);
        setDriverAllowance(0);
        setNightCharges(0);
        setExtraDistanceFare(0);
        setCalculatedFare(totalPrice);
      } else {
        setBaseFare(passedBreakdown.basePrice || 0);
        // For airport trips, don't add driverAllowance if it's not in breakdown - use totalPrice as source of truth
        if (tripType === 'airport' && !passedBreakdown.driverAllowance) {
          setDriverAllowance(0);
        } else {
          setDriverAllowance(passedBreakdown.driverAllowance || 0);
        }
        setNightCharges(passedBreakdown.nightCharges || 0);
        setExtraDistanceFare(passedBreakdown.extraDistanceFare || 0);
        setCalculatedFare(totalPrice); // ALWAYS use the totalPrice prop which matches what was shown in list
        
        // Calculate extra distance from extraDistanceFare and extraKmCharge
        if (tripType === 'outstation' && tripMode === 'one-way' && passedBreakdown.extraDistanceFare && passedBreakdown.extraKmCharge) {
          const extraKmCharge = passedBreakdown.extraKmCharge;
          const extraDistanceFare = passedBreakdown.extraDistanceFare;
          const calculatedExtraKm = Math.round(extraDistanceFare / extraKmCharge);
          setExtraDistance(calculatedExtraKm);
          console.log('BookingSummary: Calculated extra distance for one-way:', calculatedExtraKm, 'km');
        }
      }
      return; // Don't process fareData if we have passedBreakdown
    }

    if (!selectedCab || !fareData) return;

    console.log('BookingSummary: Using fareData from useFare hook:', fareData);

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
      
      // Calculate extra distance from extraDistanceFare and extraKmCharge
      if (tripType === 'outstation' && tripMode === 'one-way' && fareData.breakdown.extraDistanceFare && fareData.breakdown.extraKmCharge) {
        const extraKmCharge = fareData.breakdown.extraKmCharge;
        const extraDistanceFare = fareData.breakdown.extraDistanceFare;
        // For one-way outstation, extraDistanceFare is already calculated as roundTripExtraKm * extraKmCharge
        // So we just need to divide by extraKmCharge (not 2*extraKmCharge) to get the round-trip extra km
        const calculatedExtraKm = Math.round(extraDistanceFare / extraKmCharge);
        setExtraDistance(calculatedExtraKm);
        console.log('BookingSummary: Calculated extra distance for one-way:', calculatedExtraKm, 'km');
      }
    }

    // For outstation one-way trips, ensure we're using the tier pricing
    if (tripType === 'outstation' && tripMode === 'one-way') {
      console.log('BookingSummary: Outstation one-way trip - using tier pricing from useFare hook');
      console.log('Tier used:', fareData.breakdown.tierUsed);
      console.log('Base price from tier:', fareData.basePrice);
    }
  }, [passedBreakdown, fareData, selectedCab, tripType, tripMode, totalPrice]);

  useEffect(() => {
    // Skip if breakdown was passed - don't recalculate on package change
    if (passedBreakdown) return;
    
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
  }, [passedBreakdown, hourlyPackage, tripType, selectedCab]);

  useEffect(() => {
    // Skip if breakdown was passed - don't store or dispatch events
    if (passedBreakdown) return;
    
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
  }, [passedBreakdown, fareData, selectedCab, tripType]);

  useEffect(() => {
    // Skip recalculation if breakdown was passed - use it as-is
    if (passedBreakdown) return;
    
    if (tripType !== 'outstation' || !selectedCab) return;

      async function calculateOutstationBreakdown() {
        try {
          // Only apply for round-trip
          if (tripMode === 'round-trip' && pickupDate && returnDate && selectedCab) {
            // Use the same fare data source as CabList component
            const perKmRate = selectedCab.pricePerKm ?? selectedCab.outstationFares?.pricePerKm ?? 15;
            const nightAllowancePerNight = selectedCab.nightHaltCharge ?? selectedCab.outstationFares?.nightHaltCharge ?? 0;
            const driverAllowancePerDay = selectedCab.driverAllowance ?? selectedCab.outstationFares?.driverAllowance ?? 250;
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
  }, [passedBreakdown, tripType, selectedCab, distance, pickupDate, tripMode, hourlyPackage, totalPrice, returnDate]);

  const recalculateFareDetails = async (): Promise<void> => {
    // Skip recalculation if breakdown was passed - use passed values as-is
    if (passedBreakdown) {
      console.log('BookingSummary: Skipping recalculation - using passed breakdown');
      return;
    }
    
    if (calculationInProgressRef.current) {
      console.log('BookingSummary: Calculation already in progress, skipping duplicate calculation');
      return;
    }

    if (!selectedCab) {
      console.warn('BookingSummary: Cannot calculate fare details - no cab selected');
      setShowDetailsLoading(false);
      return;
    }

    // For outstation one-way trips, use the fareData from useFare hook (which has tier pricing)
    if (tripType === 'outstation' && tripMode === 'one-way' && fareData?.totalPrice > 0) {
      console.log('BookingSummary: Using tier pricing from useFare hook for outstation one-way:', fareData.totalPrice);
      setCalculatedFare(fareData.totalPrice);
      setBaseFare(fareData.basePrice || 0);
      setDriverAllowance(fareData.breakdown.driverAllowance || 250);
      setNightCharges(fareData.breakdown.nightCharges || 0);
      setExtraDistanceFare(fareData.breakdown.extraDistanceFare || 0);
      
      // Calculate extra distance from extraDistanceFare and extraKmCharge
      if (fareData.breakdown.extraDistanceFare && fareData.breakdown.extraKmCharge) {
        const extraKmCharge = fareData.breakdown.extraKmCharge;
        const extraDistanceFare = fareData.breakdown.extraDistanceFare;
        // For one-way outstation, extraDistanceFare is already calculated as roundTripExtraKm * extraKmCharge
        // So we just need to divide by extraKmCharge (not 2*extraKmCharge) to get the round-trip extra km
        const calculatedExtraKm = Math.round(extraDistanceFare / extraKmCharge);
        setExtraDistance(calculatedExtraKm);
        console.log('BookingSummary: Calculated extra distance in recalculateFareDetails:', calculatedExtraKm, 'km');
      }
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
          // Use the same fare data source as CabList component
          const outstationFares = {
            basePrice: selectedCab.price ?? selectedCab.outstationFares?.basePrice ?? 4200,
            pricePerKm: selectedCab.pricePerKm ?? selectedCab.outstationFares?.pricePerKm ?? 15,
            nightHaltCharge: selectedCab.nightHaltCharge ?? selectedCab.outstationFares?.nightHaltCharge ?? 0,
            driverAllowance: selectedCab.driverAllowance ?? selectedCab.outstationFares?.driverAllowance ?? 250,
            extraKmCharge: selectedCab.pricePerKm ?? selectedCab.outstationFares?.pricePerKm ?? 15,
            tier1MinKm: 35,
            tier1MaxKm: 50,
            tier2MinKm: 51,
            tier2MaxKm: 75,
            tier3MinKm: 76,
            tier3MaxKm: 100,
            tier4MinKm: 101,
            tier4MaxKm: 149,
            tier1Price: 3500,
            tier2Price: 4200,
            tier3Price: 4900,
            tier4Price: 5600
          };
          console.log('BookingSummary: Using cab object fare data:', outstationFares);

          if (tripMode === 'one-way') {
            // Use dynamic tiered pricing for one-way outstation trips
            let basePrice = 0;
            let extraDistanceFare = 0;
            let extraKmCharge = outstationFares.extraKmCharge || outstationFares.pricePerKm;

            // Get tier distance ranges (with defaults)
            const tier1Min = outstationFares.tier1MinKm || 35;
            const tier1Max = outstationFares.tier1MaxKm || 50;
            const tier2Min = outstationFares.tier2MinKm || 51;
            const tier2Max = outstationFares.tier2MaxKm || 75;
            const tier3Min = outstationFares.tier3MinKm || 76;
            const tier3Max = outstationFares.tier3MaxKm || 100;
            const tier4Min = outstationFares.tier4MinKm || 101;
            const tier4Max = outstationFares.tier4MaxKm || 149;

            // Dynamic tiered pricing for distances 35km to 149km
            if (distance >= tier1Min && distance <= tier1Max) {
              basePrice = outstationFares.tier1Price || outstationFares.basePrice;
            } else if (distance >= tier2Min && distance <= tier2Max) {
              basePrice = outstationFares.tier2Price || (outstationFares.basePrice * 1.2);
            } else if (distance >= tier3Min && distance <= tier3Max) {
              basePrice = outstationFares.tier3Price || (outstationFares.basePrice * 1.4);
            } else if (distance >= tier4Min && distance <= tier4Max) {
              basePrice = outstationFares.tier4Price || (outstationFares.basePrice * 1.6);
            } else if (distance > tier4Max) {
              // For distances beyond tier4Max, use traditional calculation
              basePrice = outstationFares.basePrice;
              const extraKm = distance - tier4Max;
              extraDistanceFare = extraKm * extraKmCharge;
            } else {
              // For distances less than tier1Min, use traditional calculation
              basePrice = outstationFares.basePrice;
              const extraKm = Math.max(0, distance - tier1Min);
              extraDistanceFare = extraKm * extraKmCharge;
            }

            newBaseFare = basePrice;
            newExtraDistanceFare = extraDistanceFare;
            newPerKmRate = extraKmCharge;
            newDriverAllowance = outstationFares.driverAllowance || 250;
            
            // Calculate and store extra distance for one-way display
            let calculatedExtraKm = 0;
            const baseDistanceForCharging = 300; // Use 150km as base for charging, not tier4Max
            if (distance > tier4Max) {
              calculatedExtraKm = distance - baseDistanceForCharging;
            } else if (distance < tier1Min) {
              calculatedExtraKm = Math.max(0, distance - tier1Min);
            }
            newExtraDistance = calculatedExtraKm;

            if (pickupDate && (pickupDate.getHours() >= 22 || pickupDate.getHours() <= 5)) {
              newNightCharges = Math.round(newBaseFare * 0.1);
            } else {
              newNightCharges = 0;
            }
          } else {
            // Round trip calculation (existing logic)
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
    
    // Only sum these specific fields that are actual charges/amounts
    const chargeFields = [
      'basePrice',
      'driverAllowance',
      'nightCharges',
      'extraDistanceFare',
      'airportFee',
      'baseFare', // Round-trip uses baseFare
      'nightAllowance', // Round-trip uses nightAllowance
      'extraDistanceCharges' // Round-trip uses extraDistanceCharges
    ];
    
    let total = 0;
    for (const key of chargeFields) {
      const val = breakdown[key];
      if (typeof val === 'number' && !isNaN(val)) {
        total += val;
      }
    }
    
    // Handle extra hour charges only if extra hours are present
    if (breakdown.extraHourCharge && breakdown.extraHours && breakdown.extraHours > 0) {
      total += breakdown.extraHourCharge * breakdown.extraHours;
    }
    
    return total;
  };

  useEffect(() => {
    if (onFinalTotalChange) {
      // If breakdown was passed, use the totalPrice prop to ensure consistency
      if (passedBreakdown) {
        onFinalTotalChange(totalPrice);
      } else if (tripType === 'local') {
        onFinalTotalChange(localTotal);
      } else if (tripType === 'outstation' && tripMode === 'round-trip' && outstationBreakdown) {
        onFinalTotalChange(outstationBreakdown.totalFare);
      } else if (fareData?.totalPrice && fareData.totalPrice > 0) {
        onFinalTotalChange(fareData.totalPrice);
      } else {
        onFinalTotalChange(sumBreakdown(fareData?.breakdown || {}));
      }
    }
  }, [passedBreakdown, totalPrice, localTotal, fareData?.breakdown, fareData?.totalPrice, tripType, tripMode, outstationBreakdown, onFinalTotalChange]);

  if (!pickupLocation || (!dropLocation && tripType !== 'local' && tripType !== 'tour') || !pickupDate) {
    return <div className="p-4 bg-gray-100 rounded-lg">Booking information not available</div>;
  }

  // Prioritize passed breakdown to ensure consistency with fare shown in cab list
  // Only use fareData if no breakdown was passed
  const breakdown = passedBreakdown || fareData?.breakdown || {};
  const finalTotal = passedBreakdown ? totalPrice : (fareData?.totalPrice || totalPrice);

  let summaryBaseFare = breakdown.basePrice || 0;
  let summaryDriverAllowance = breakdown.driverAllowance || 0;
  let summaryNightAllowance = breakdown.nightCharges || 0;
  let summaryExtraDistanceCharges = breakdown.extraDistanceFare || 0;
  let summaryTotal = passedBreakdown ? sumBreakdown(passedBreakdown) : sumBreakdown(breakdown);
  
  // When breakdown is passed, use the exact totalPrice to ensure consistency with what was shown in the list
  // This is important because the breakdown might not include all components (e.g., airport trips don't include driverAllowance in breakdown from useFare)
  if (passedBreakdown && totalPrice > 0) {
    summaryTotal = totalPrice; // ALWAYS use the exact totalPrice that was shown in the list - this is the source of truth
    
    // For outstation one-way, ensure breakdown components are correctly extracted from passed breakdown
    // The totalPrice is the final fare shown in the list, so we must use it as-is
    if (tripType === 'outstation' && tripMode === 'one-way') {
      // Use breakdown as-is, but ensure total matches totalPrice
      summaryBaseFare = breakdown.basePrice || 0;
      summaryDriverAllowance = breakdown.driverAllowance || 0;
      summaryExtraDistanceCharges = breakdown.extraDistanceFare || 0;
      summaryNightAllowance = breakdown.nightCharges || 0;
      // Force total to match totalPrice (what was shown in list)
      summaryTotal = totalPrice;
    }
    
    // For airport trips, the breakdown from useFare doesn't include driverAllowance, 
    // but the totalPrice shown in list is the actual fare. So we should NOT add driverAllowance
    // If the breakdown components don't add up to totalPrice, that's okay - use totalPrice as source of truth
    if (tripType === 'airport') {
      // Don't add driverAllowance if it's not in the breakdown - the totalPrice is already correct
      // Calculate what's missing if breakdown doesn't add up to total
      const breakdownSum = summaryBaseFare + summaryExtraDistanceCharges + (breakdown.airportFee || 0);
      if (Math.abs(summaryTotal - breakdownSum) > 1) {
        // If there's a difference, don't add it as driverAllowance - just use the totalPrice as shown
        // This ensures consistency - what you see in the list is what you get
        summaryDriverAllowance = 0; // Don't show driverAllowance if it wasn't in the breakdown
      }
    }
  }

  if (tripType === 'outstation' && tripMode === 'round-trip' && outstationBreakdown) {
    summaryBaseFare = outstationBreakdown.baseFare;
    summaryDriverAllowance = outstationBreakdown.driverAllowance;
    summaryNightAllowance = outstationBreakdown.nightAllowance;
    summaryExtraDistanceCharges = outstationBreakdown.extraDistanceCharges;
    summaryTotal = outstationBreakdown.totalFare;
  }

  const canShareOnWhatsApp =
    !!pickupLocation && !!pickupDate && !!selectedCab && summaryTotal > 0;

  const buildBookingUrl = () => {
    if (typeof window === 'undefined') {
      return 'https://vizagtaxihub.com';
    }

    const origin = window.location.origin.includes('localhost')
      ? 'https://vizagtaxihub.com'
      : window.location.origin;

    // For outstation trips, build a prefilled URL so guests land on the outstation page
    if (tripType === 'outstation' && pickupLocation && dropLocation) {
      const slugify = (value: string) =>
        value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');

      const fromSlug = slugify(pickupLocation.name);
      const toSlug = slugify(dropLocation.name);

      // Route pattern in routes.tsx: 'outstation-taxi/:from-to-:to'
      const url = new URL(`${origin}/outstation-taxi/${fromSlug}-to-${toSlug}`);

      // Include coordinates so map and distance use exact pickup/drop positions
      const hasValidPickupCoords =
        typeof pickupLocation.lat === 'number' && !isNaN(pickupLocation.lat) &&
        typeof pickupLocation.lng === 'number' && !isNaN(pickupLocation.lng) &&
        !(pickupLocation.lat === 0 && pickupLocation.lng === 0);
      const hasValidDropCoords =
        typeof dropLocation.lat === 'number' && !isNaN(dropLocation.lat) &&
        typeof dropLocation.lng === 'number' && !isNaN(dropLocation.lng) &&
        !(dropLocation.lat === 0 && dropLocation.lng === 0);
      if (hasValidPickupCoords) {
        url.searchParams.set('fromLat', String(pickupLocation.lat));
        url.searchParams.set('fromLng', String(pickupLocation.lng));
      }
      if (hasValidDropCoords) {
        url.searchParams.set('toLat', String(dropLocation.lat));
        url.searchParams.set('toLng', String(dropLocation.lng));
      }

      if (pickupDate) {
        url.searchParams.set('date', pickupDate.toISOString());
      }
      if (tripMode) {
        url.searchParams.set('mode', tripMode);
      }
      // Include return date for round-trip so the link restores the correct return date
      if (tripMode === 'round-trip' && returnDate) {
        url.searchParams.set('returnDate', returnDate.toISOString());
      }
      url.searchParams.set('auto', '1');

      return url.toString();
    }

    // For local trips, use local-taxi page with query params
    if (tripType === 'local' && pickupLocation) {
      const slugify = (value: string) =>
        value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');

      const fromSlug = slugify(pickupLocation.name);
      const toSlug = slugify(dropLocation?.name || pickupLocation.name);

      // Use base /local-taxi route with query params, so it always matches
      const url = new URL(`${origin}/local-taxi`);
      url.searchParams.set('from', fromSlug);
      url.searchParams.set('to', toSlug);
      if (pickupDate) {
        url.searchParams.set('date', format(pickupDate, 'yyyy-MM-dd'));
      }
      url.searchParams.set('auto', '1');
      return url.toString();
    }

    // For airport trips, use airport-taxi page with query params
    if (tripType === 'airport' && pickupLocation && dropLocation) {
      const slugify = (value: string) =>
        value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');

      const fromSlug = slugify(pickupLocation.name);
      const toSlug = slugify(dropLocation.name);

      const url = new URL(`${origin}/airport-taxi`);
      url.searchParams.set('from', fromSlug);
      url.searchParams.set('to', toSlug);
      const hasValidPickupCoords =
        typeof pickupLocation.lat === 'number' && !isNaN(pickupLocation.lat) &&
        typeof pickupLocation.lng === 'number' && !isNaN(pickupLocation.lng) &&
        !(pickupLocation.lat === 0 && pickupLocation.lng === 0);
      const hasValidDropCoords =
        typeof dropLocation.lat === 'number' && !isNaN(dropLocation.lat) &&
        typeof dropLocation.lng === 'number' && !isNaN(dropLocation.lng) &&
        !(dropLocation.lat === 0 && dropLocation.lng === 0);
      if (hasValidPickupCoords) {
        url.searchParams.set('fromLat', String(pickupLocation.lat));
        url.searchParams.set('fromLng', String(pickupLocation.lng));
      }
      if (hasValidDropCoords) {
        url.searchParams.set('toLat', String(dropLocation.lat));
        url.searchParams.set('toLng', String(dropLocation.lng));
      }
      if (pickupDate) {
        url.searchParams.set('date', format(pickupDate, 'yyyy-MM-dd'));
      }
      url.searchParams.set('auto', '1');
      return url.toString();
    }

    // Fallback: use current page URL
    return window.location.href;
  };

  const buildWhatsAppMessage = () => {
    const tripLabel =
      tripType === 'outstation'
        ? `Outstation (${tripMode === 'round-trip' ? 'Round-Trip' : 'One-Way'})`
        : tripType === 'local'
        ? `Local - ${hourlyPackage || 'Package'}`
        : tripType.charAt(0).toUpperCase() + tripType.slice(1);

    const distanceText =
      tripType === 'outstation' && tripMode === 'round-trip'
        ? `${distance * 2} KM (actual distance)`
        : `${distance} KM`;

    const lines: (string | undefined)[] = [
      '🚖 Cab quote from Vizag Taxi Hub',
      '',
      `Trip: ${tripLabel}`,
      pickupLocation ? `Pickup: ${pickupLocation.name}` : undefined,
      pickupLocation?.address &&
        pickupLocation.address !== pickupLocation.name
        ? `Pickup address: ${pickupLocation.address}`
        : undefined,
      tripType !== 'local' &&
        tripType !== 'tour' &&
        dropLocation
        ? `Drop-off: ${dropLocation.name}`
        : undefined,
      dropLocation?.address &&
        dropLocation.address !== dropLocation.name
        ? `Drop-off address: ${dropLocation.address}`
        : undefined,
      pickupDate
        ? `Pickup date: ${format(pickupDate, 'EEE, MMM d, yyyy - h:mm a')}`
        : undefined,
      tripType === 'outstation' &&
        tripMode === 'round-trip' &&
        returnDate
        ? `Return date: ${format(returnDate, 'EEE, MMM d, yyyy - h:mm a')}`
        : undefined,
      distance > 0 ? `Total distance: ${distanceText}` : undefined,
      '',
      selectedCab ? `Vehicle: ${selectedCab.name}` : undefined,
      '',
      `Base fare: ${formatPrice(summaryBaseFare)}`,
      summaryDriverAllowance > 0
        ? `Driver allowance: ${formatPrice(summaryDriverAllowance)}`
        : undefined,
      summaryNightAllowance > 0
        ? `Night allowance: ${formatPrice(summaryNightAllowance)}`
        : undefined,
      summaryExtraDistanceCharges > 0
        ? `Extra distance charges: ${formatPrice(summaryExtraDistanceCharges)}${
            extraDistance > 0 ? ` (${extraDistance} KM)` : ''
          }`
        : undefined,
      '',
      `Total Price: ${formatPrice(summaryTotal)}`,
      '',
      'Parking and tolls fees are extra.',
      '',
      'View / book this trip:',
      buildBookingUrl()
    ];

    return lines.filter(Boolean).join('\n');
  };

  const handleWhatsappShare = () => {
    if (!canShareOnWhatsApp) return;
    const message = buildWhatsAppMessage();
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    if (typeof window !== 'undefined') {
      window.open(whatsappUrl, '_blank');
    }
  };

  // Compute dynamic values for inclusions/exclusions section
  let computedExtraKmCharge = 0;
  if (tripType === 'local') {
    // Prefer breakdown from fare engine, else fallback to vehicle local fares
    // Check all possible field name variations
    if (typeof breakdown?.extraKmCharge === 'number') {
      computedExtraKmCharge = breakdown.extraKmCharge as number;
    } else if (selectedCab?.localPackageFares?.priceExtraKm) {
      computedExtraKmCharge = selectedCab.localPackageFares.priceExtraKm;
    } else if (selectedCab?.localPackageFares?.extraKmRate) {
      computedExtraKmCharge = selectedCab.localPackageFares.extraKmRate;
    } else if (selectedCab?.localPackageFares?.extra_km_charge) {
      computedExtraKmCharge = selectedCab.localPackageFares.extra_km_charge;
    } else if (selectedCab?.localPackageFares?.price_extra_km) {
      computedExtraKmCharge = selectedCab.localPackageFares.price_extra_km;
    } else {
      computedExtraKmCharge = 12; // sensible default for local
    }
  } else if (tripType === 'airport') {
    if (typeof breakdown?.extraKmCharge === 'number') {
      computedExtraKmCharge = breakdown.extraKmCharge as number;
    } else if (selectedCab?.airportFares?.extraKmCharge) {
      computedExtraKmCharge = selectedCab.airportFares.extraKmCharge;
    } else {
      computedExtraKmCharge = 14; // airport default
    }
  } else if (tripType === 'outstation') {
    if (tripMode === 'one-way') {
      // One-way often uses a separate extra km rate
      if (typeof breakdown?.extraKmCharge === 'number') {
        computedExtraKmCharge = breakdown.extraKmCharge as number;
      } else if (selectedCab?.outstationFares?.extraKmCharge) {
        computedExtraKmCharge = selectedCab.outstationFares.extraKmCharge;
      } else if (selectedCab?.pricePerKm) {
        computedExtraKmCharge = selectedCab.pricePerKm;
      } else {
        computedExtraKmCharge = 15;
      }
    } else {
      // Round-trip typically uses perKm rate
      if (perKmRate && perKmRate > 0) {
        computedExtraKmCharge = perKmRate;
      } else if (selectedCab?.outstationFares?.pricePerKm) {
        computedExtraKmCharge = selectedCab.outstationFares.pricePerKm;
      } else if (selectedCab?.pricePerKm) {
        computedExtraKmCharge = selectedCab.pricePerKm;
      } else {
        computedExtraKmCharge = 15;
      }
    }
  }

  let includedKm = 0;
  if (tripType === 'local') {
    includedKm = selectedPackage.km;
  } else if (tripType === 'airport') {
    includedKm = 40; // tiers up to 40km are covered in base
  } else if (tripType === 'outstation') {
    if (tripMode === 'round-trip') {
      includedKm = distance * 2; // Actual round-trip distance
    } else if (tripMode === 'one-way') {
      // For one-way outstation, there is no included km in the base price
      // Extra charges apply from km 1 onwards based on the actual distance traveled
      includedKm = 0;
    }
  }

  // Normalize inclusions/exclusions from API/vehicle
  const normalizeList = (value: any): string[] => {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(Boolean).map(String);
    if (typeof value === 'string') return value.split(/\n|,/).map(s => s.trim()).filter(Boolean);
    return [];
  };

  const apiInclusions = normalizeList((selectedCab as any)?.inclusions);
  const apiExclusions = normalizeList((selectedCab as any)?.exclusions);

  // Build dynamic policy items list
  const policyItems: Array<{ text: string; isExclusion?: boolean }> = [];

  // Add inclusions
  if (apiInclusions.length > 0) {
    policyItems.push({ text: `Includes ${apiInclusions.join(', ')}`, isExclusion: false });
  }

  // Add exclusions
  if (apiExclusions.length > 0) {
    policyItems.push({ text: `Excludes ${apiExclusions.join(', ')}`, isExclusion: true });
  }

  // Dynamic extra distance and extra hour lines based on trip type
  if (tripType === 'local') {
    // Local: included km/hours + extra km and extra hour from API
    // Check all possible field name variations
    let extraHourFromApi = 0;
    if (typeof fareData?.breakdown?.extraHourCharge === 'number') {
      extraHourFromApi = fareData.breakdown.extraHourCharge;
    } else if (selectedCab?.localPackageFares?.priceExtraHour) {
      extraHourFromApi = selectedCab.localPackageFares.priceExtraHour;
    } else if (selectedCab?.localPackageFares?.extraHourRate) {
      extraHourFromApi = selectedCab.localPackageFares.extraHourRate;
    } else if (selectedCab?.localPackageFares?.extra_hour_charge) {
      extraHourFromApi = selectedCab.localPackageFares.extra_hour_charge;
    } else if (selectedCab?.localPackageFares?.price_extra_hour) {
      extraHourFromApi = selectedCab.localPackageFares.price_extra_hour;
    }

    // Include km and hours from the selected package
    if (includedKm > 0) {
      policyItems.push({ text: `${includedKm} Kms included.` });
    }
    if (selectedPackage.hours > 0) {
      policyItems.push({ text: `${selectedPackage.hours} hours included.` });
    }
    if (computedExtraKmCharge > 0) {
      policyItems.push({ text: `₹${computedExtraKmCharge}/Km will be charged for extra distance` });
    }
    if (extraHourFromApi > 0) {
      policyItems.push({ text: `₹${extraHourFromApi}/hour will be charged for extra hours` });
    }
  } else if (tripType === 'airport') {
    if (includedKm > 0) {
      policyItems.push({ text: `${includedKm} Kms included.` });
    }
    if (computedExtraKmCharge > 0) {
      policyItems.push({ text: `₹${computedExtraKmCharge}/Km will be charged for extra distance` });
    }
  } else if (tripType === 'outstation') {
    if (computedExtraKmCharge > 0) {
      if (tripMode === 'one-way') {
        policyItems.push({ text: `₹${computedExtraKmCharge}/Km will be charged for extra distance (charged on double distance i.e., distance × 2)` });
      } else {
        if (includedKm > 0) {
          policyItems.push({ text: `${includedKm} Kms included.` });
        }
        policyItems.push({ text: `₹${computedExtraKmCharge}/Km will be charged for extra distance` });
      }
    }
  }

  const tripTypeHeading =
    tripType === 'outstation'
      ? `Outstation (${tripMode === 'one-way' ? 'One-Way' : 'Round Trip'})`
      : tripType === 'airport'
        ? 'Airport Transfer'
        : tripType === 'local'
          ? `Local — ${hourlyPackage}`
          : tripType === 'tour'
            ? 'Tour'
            : tripType.charAt(0).toUpperCase() + tripType.slice(1);

  return (
    <div className="text-[14px] md:text-[14px] booking-summary-mobile">
      <div className="relative rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-5">
        <h2 className="mb-3 text-left text-[15px] font-semibold text-gray-900 md:text-[16px]">Booking Summary</h2>

        <div className="space-y-3">
          <div className="border-b border-gray-100 pb-3">
            <div className="divide-y divide-gray-100">
              <div className="flex items-start gap-2 py-3 first:pt-0">
                <Calendar className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-left text-[11px] font-medium uppercase tracking-wide text-gray-500">Trip type</p>
                  <p className="text-left text-[14px] font-semibold text-gray-900">{tripTypeHeading}</p>
                </div>
              </div>

              <div className="flex items-start gap-2 py-3">
                <MapPin className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-left text-[11px] font-medium uppercase tracking-wide text-gray-500">
                    {(tripType === 'outstation' && tripMode === 'round-trip') ? 'Actual distance' : 'Total distance'}
                  </p>
                  <p className="text-left text-[14px] font-semibold text-gray-900">
                    {(tripType === 'outstation' && tripMode === 'round-trip')
                      ? `${distance * 2} KM`
                      : (tripType === 'outstation' || tripType === 'airport') && distance === 0 && pickupLocation && dropLocation
                        ? <span className="animate-pulse text-blue-600">Calculating...</span>
                        : `${distance} KM`}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 py-3">
                <MapPin className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-left text-[11px] font-medium uppercase tracking-wide text-gray-500">Pickup</p>
                  <p className="text-left text-[14px] font-semibold text-gray-900">{pickupLocation.name}</p>
                  {pickupLocation.address && pickupLocation.address !== pickupLocation.name && (
                    <p className="mt-1 text-left text-[12px] text-gray-600">{pickupLocation.address}</p>
                  )}
                </div>
                {onEditPickupLocation && (
                  <button
                    type="button"
                    onClick={onEditPickupLocation}
                    className="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-50 hover:text-blue-600"
                    title="Edit pickup location"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              {tripType !== 'local' && tripType !== 'tour' && dropLocation && (
                <div className="flex items-start gap-2 py-3">
                  <MapPin className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-left text-[11px] font-medium uppercase tracking-wide text-gray-500">Drop-off</p>
                    <p className="text-left text-[14px] font-semibold text-gray-900">{dropLocation.name}</p>
                    {dropLocation.address && dropLocation.address !== dropLocation.name && (
                      <p className="mt-1 text-left text-[12px] text-gray-600">{dropLocation.address}</p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2 py-3">
                <Calendar className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-left text-[11px] font-medium uppercase tracking-wide text-gray-500">Pickup date</p>
                  <p className="text-[14px] font-semibold text-gray-900">
                    {pickupDate ? format(pickupDate, 'EEE, MMM d, yyyy - h:mm a') : 'Not selected'}
                  </p>
                </div>
                {onEditPickupDate && (
                  <button
                    type="button"
                    onClick={onEditPickupDate}
                    className="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-50 hover:text-blue-600"
                    title="Edit pickup date"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              {tripType === 'outstation' && tripMode === 'round-trip' && returnDate && (
                <div className="flex items-start gap-2 py-3">
                  <Calendar className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Return date</p>
                    <p className="text-[14px] font-semibold text-gray-900">
                      {format(returnDate, 'EEE, MMM d, yyyy - h:mm a')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="border-b pb-4">
            {!selectedCab ? (
              <div className="bg-gray-50 rounded-lg p-4 mb-3 text-center">
                <p className="text-sm text-gray-600">Select a vehicle to see fare details</p>
                <button
                  type="button"
                  disabled
                  className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-full text-[12px] font-medium bg-gray-200 text-gray-500 cursor-not-allowed"
                >
                  <MessageCircle className="w-4 h-4" />
                  Share summary on WhatsApp
                </button>
              </div>
            ) : (
            <div className="bg-blue-50 rounded-lg p-4 mb-3">
              <div className="flex items-center gap-4">
                {/* Car Image */}
                <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  {selectedCab.image ? (
                    <img 
                      src={selectedCab.image} 
                      alt={selectedCab.name}
                      className="w-12 h-12 object-contain rounded"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                        if (nextElement) {
                          nextElement.style.display = 'flex';
                        }
                      }}
                    />
                  ) : null}
                  <div className="w-12 h-12 bg-blue-100 rounded flex items-center justify-center" style={{ display: selectedCab.image ? 'none' : 'flex' }}>
                    <Car className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                
                {/* Vehicle Details */}
                <div className="flex-1">
                  <p className="font-bold text-xl text-gray-900 mb-1">{selectedCab.name}</p>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600 font-medium">{selectedCab.capacity} Seats</span>
                    </div>
                    {/* Fuel type intentionally hidden in booking summary */}
                    {selectedCab.amenities && selectedCab.amenities.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-gray-600 font-medium">{selectedCab.amenities[0]}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            )}
          </div>

          {selectedCab && (
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
            <div className="mt-3">
              <button
                type="button"
                onClick={handleWhatsappShare}
                disabled={!canShareOnWhatsApp}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-[12px] font-medium ${
                  canShareOnWhatsApp
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
              >
                <MessageCircle className="w-4 h-4" />
                Share summary on WhatsApp
              </button>
            </div>
            {isLoading && (
              <div className="mt-3 text-center">
                <p className="text-sm text-blue-500 animate-pulse">Calculating latest fare...</p>
              </div>
            )}
          </div>
          )}
          <div className="text-[12px] text-gray-500 mt-2">Parking and tolls fees are extra.</div>

          {/* Inclusions/Exclusions */}
          {!hideInclusionsExclusions && (
          <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold text-[14px]">Inclusions/Exclusions</p>
              <a
                href="/cancellation-refund-policy"
                className="text-blue-600 hover:text-blue-700 text-[12px] font-medium"
                target="_blank"
                rel="noreferrer"
              >
                View Policy
              </a>
            </div>
            <ul className="space-y-2">
              {policyItems.length > 0 ? (
                policyItems.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    {item.isExclusion ? (
                      <X className="h-4 w-4 text-red-500 mt-0.5" />
                    ) : (
                      <Check className="h-4 w-4 text-green-500 mt-0.5" />
                    )}
                    <span className="text-[13px]" dangerouslySetInnerHTML={{ __html: item.text.replace(/\n/g, '<br/>') }}></span>
                  </li>
                ))
              ) : (
                <>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-500 mt-0.5" />
                    <span className="text-[13px]"><span className="font-semibold">Toll charges, Parking, State Tax & Driver Allowance are excluded</span></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-500 mt-0.5" />
                    <span className="text-[13px]">Only one pickup and drop</span>
                  </li>
                </>
              )}
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-500 mt-0.5" />
                <span className="text-[13px]">
                  {tripType === 'outstation' && tripMode === 'round-trip' 
                    ? <>Waiting time upto <span className="font-semibold">12 hours per day</span> included. <span className="font-semibold">₹100.00/30 mins</span> after that</>
                    : <>Waiting time upto <span className="font-semibold">45 mins</span> included. <span className="font-semibold">₹100.00/30 mins</span> after that</>
                  }
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-500 mt-0.5" />
                <span className="text-[13px]">During ghat roads and standby AC will turned off</span>
              </li>
            </ul>
          </div>
          )}
        </div>
      </div>
    </div>
  );
};
