import { useState, useEffect, useCallback, useMemo } from 'react';
import { CabType } from '@/types/cab';
import { loadCabTypes, reloadCabTypes } from '@/lib/cabData';
import { TripType, TripMode } from '@/lib/tripTypes';
import { calculateFare } from '@/lib/fareCalculationService';
import { toast } from 'sonner';
import { fareService } from '@/services/fareService';

export function useCabOptions({
  initialCabTypes,
  selectedCab,
  onSelectCab,
  distance,
  tripType = 'outstation',
  tripMode = 'one-way',
  pickupDate,
  returnDate,
  hourlyPackage
}: {
  initialCabTypes: CabType[];
  selectedCab: CabType | null;
  onSelectCab: (cab: CabType) => void;
  distance: number;
  tripType?: TripType;
  tripMode?: TripMode;
  pickupDate?: Date;
  returnDate?: Date;
  hourlyPackage?: string;
}) {
  const [selectedCabId, setSelectedCabId] = useState<string | null>(selectedCab?.id || null);
  const [cabFares, setCabFares] = useState<Record<string, number>>({});
  const [cabTypes, setCabTypes] = useState<CabType[]>(initialCabTypes);
  const [isLoadingCabs, setIsLoadingCabs] = useState(false);
  const [isRefreshingCabs, setIsRefreshingCabs] = useState(false);
  const [isCalculatingFares, setIsCalculatingFares] = useState(false);
  const [refreshSuccessful, setRefreshSuccessful] = useState<boolean | null>(null);
  const [lastCalculationParams, setLastCalculationParams] = useState<string>('');

  const currentCalculationParams = useMemo(() => {
    return `${tripType}-${tripMode}-${hourlyPackage || 'none'}-${distance}-${pickupDate?.getTime() || 0}-${returnDate?.getTime() || 0}`;
  }, [tripType, tripMode, hourlyPackage, distance, pickupDate, returnDate]);
  
  useEffect(() => {
    const fetchCabTypes = async () => {
      if (cabTypes.length > 0) return; // Skip if we already have cab types
      
      setIsLoadingCabs(true);
      try {
        console.log('Loading dynamic cab types...', Date.now());
        fareService.clearCache(); // Fixed: No arguments
        
        const cacheBuster = new Date().getTime();
        const dynamicCabTypes = await loadCabTypes(`?_t=${cacheBuster}`);
        console.log('Loaded dynamic cab types:', dynamicCabTypes);
        
        if (Array.isArray(dynamicCabTypes) && dynamicCabTypes.length > 0) {
          const validCabTypes = dynamicCabTypes.map(cab => ({
            ...cab,
            id: cab.id || cab.vehicleId || `cab-${Math.random().toString(36).substring(2, 10)}`,
            name: cab.name || (cab.id ? cab.id.charAt(0).toUpperCase() + cab.id.slice(1).replace('_', ' ') : 'Unknown')
          }));
          
          console.log('Processed cab types:', validCabTypes);
          setCabTypes(validCabTypes);
          setRefreshSuccessful(true);
        } else {
          console.warn('API returned empty vehicle data, using initial cab types');
          setCabTypes(initialCabTypes);
          setRefreshSuccessful(false);
        }
      } catch (error) {
        console.error('Error loading dynamic cab types:', error);
        toast.error('Could not load vehicle data. Using default values.');
        setCabTypes(initialCabTypes);
        setRefreshSuccessful(false);
      } finally {
        setIsLoadingCabs(false);
      }
    };
    
    fetchCabTypes();
  }, [initialCabTypes, cabTypes.length]);

  const refreshCabTypes = useCallback(async () => {
    setIsRefreshingCabs(true);
    setCabFares({});
    
    try {
      sessionStorage.removeItem('cabFares');
      sessionStorage.removeItem('calculatedFares');
      localStorage.removeItem('cabTypes');
      
      fareService.clearCache(); // Fixed: No arguments
      
      console.log('Forcing cab types refresh...', Date.now());
      const cacheBuster = new Date().getTime();
      const freshCabTypes = await reloadCabTypes(`?_t=${cacheBuster}`);
      
      if (Array.isArray(freshCabTypes) && freshCabTypes.length > 0) {
        const validCabTypes = freshCabTypes.map(cab => ({
          ...cab,
          id: cab.id || cab.vehicleId || `cab-${Math.random().toString(36).substring(2, 10)}`,
          name: cab.name || (cab.id ? cab.id.charAt(0).toUpperCase() + cab.id.slice(1).replace('_', ' ') : 'Unknown')
        }));
        
        setCabTypes(validCabTypes);
        toast.success('Vehicle data refreshed successfully');
        setRefreshSuccessful(true);
        
        setSelectedCabId(null);
        if (selectedCab) {
          onSelectCab(null as any);
        }
      } else {
        console.warn('API returned empty vehicle data on refresh');
        toast.error('No vehicle data available. Using default values.');
        setRefreshSuccessful(false);
      }
    } catch (error) {
      console.error('Error refreshing cab types:', error);
      toast.error('Failed to refresh vehicle data');
      setRefreshSuccessful(false);
    } finally {
      setIsRefreshingCabs(false);
    }
  }, [onSelectCab, selectedCab]);

  useEffect(() => {
    if (lastCalculationParams && lastCalculationParams !== currentCalculationParams) {
      console.log('Trip parameters changed, resetting selections and fares');
      setSelectedCabId(null);
      setCabFares({});
      
      if (selectedCab) {
        onSelectCab(null as any);
      }
      
      refreshCabTypes().catch(err => {
        console.error('Failed to refresh cab types on trip parameter change:', err);
      });
    }
    
    setLastCalculationParams(currentCalculationParams);
  }, [currentCalculationParams, lastCalculationParams, onSelectCab, selectedCab, refreshCabTypes]);

  useEffect(() => {
    if (distance <= 0 || !Array.isArray(cabTypes) || cabTypes.length === 0 || isCalculatingFares) {
      console.log(`Skipping fare calculation: distance=${distance}, cabTypes=${cabTypes?.length}, isCalculating=${isCalculatingFares}`);
      return;
    }
    
    console.log(`Calculating fares for ${tripType} trip, ${distance}km, package: ${hourlyPackage || 'none'}`);
    
    const calculateFares = async () => {
      setIsCalculatingFares(true);
      
      try {
        if (distance > 500) {
          toast.info('Calculating fares for long distance...', {
            duration: 3000
          });
        }
        
        console.log(`Starting fare calculation for ${cabTypes.length} cab types`);
        
        const validCabs = cabTypes.filter(cab => {
          if (!cab || typeof cab !== 'object' || !cab.id) {
            console.warn('Skipping invalid cab object:', cab);
            return false;
          }
          
          if (typeof cab.price !== 'number') cab.price = 0;
          if (typeof cab.pricePerKm !== 'number') cab.pricePerKm = 0;
          if (typeof cab.nightHaltCharge !== 'number') cab.nightHaltCharge = 0;
          if (typeof cab.driverAllowance !== 'number') cab.driverAllowance = 0;
          
          return true;
        });
        
        console.log(`Proceeding with ${validCabs.length} valid cabs for fare calculation`);
        
        if (validCabs.length === 0) {
          console.error('No valid cab types to calculate fares for');
          toast.error('No valid vehicle types available. Try refreshing.');
          return;
        }
        
        try {
          const fares = await fareService.calculateFaresForCabs(
            validCabs,
            distance,
            tripType,
            tripMode,
            hourlyPackage,
            pickupDate,
            returnDate
          );
          
          console.log('All fares calculated:', fares);
          setCabFares(fares);
        } catch (fareError) {
          console.error('Error in fare calculation service:', fareError);
          const manualFares: Record<string, number> = {};
          
          for (const cab of validCabs) {
            try {
              const fare = await calculateFare({
                cabType: cab,
                distance,
                tripType,
                tripMode,
                hourlyPackage,
                pickupDate,
                returnDate
              });
              manualFares[cab.id] = fare;
            } catch (err) {
              console.error(`Error calculating fare for ${cab.name}:`, err);
              manualFares[cab.id] = 0;
            }
          }
          
          setCabFares(manualFares);
        }
      } catch (error) {
        console.error('Error in fare calculation loop:', error);
        toast.error('Error calculating fares. Please try refreshing.');
      } finally {
        setIsCalculatingFares(false);
      }
    };
    
    calculateFares();
  }, [cabTypes, distance, tripType, tripMode, hourlyPackage, pickupDate, returnDate]);

  useEffect(() => {
    if (selectedCab) {
      setSelectedCabId(selectedCab.id);
    }
  }, [selectedCab]);

  const handleSelectCab = useCallback((cab: CabType) => {
    setSelectedCabId(cab.id);
    onSelectCab(cab);
    
    const cabData = {
      cab: cab,
      tripType: tripType,
      tripMode: tripMode,
      hourlyPackage: hourlyPackage,
      fare: cabFares[cab.id]
    };
    
    sessionStorage.setItem('selectedCab', JSON.stringify(cabData));
    
    const bookingSummary = document.getElementById('booking-summary');
    if (bookingSummary) {
      setTimeout(() => {
        bookingSummary.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [cabFares, hourlyPackage, onSelectCab, tripMode, tripType]);

  const getFareDetails = useCallback((cab: CabType): string => {
    return fareService.getFareExplanation(
      distance,
      tripType,
      tripMode,
      hourlyPackage,
      pickupDate,
      returnDate
    );
  }, [distance, tripType, tripMode, hourlyPackage, pickupDate, returnDate]);

  return {
    cabTypes,
    selectedCabId,
    cabFares,
    isLoadingCabs,
    isRefreshingCabs,
    isCalculatingFares,
    refreshSuccessful,
    refreshCabTypes,
    handleSelectCab,
    getFareDetails
  };
}
