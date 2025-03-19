
import { useState, useEffect, useCallback, useMemo } from 'react';
import { CabType } from '@/types/cab';
import { formatPrice } from '@/lib/cabData';
import { TripType, TripMode } from '@/lib/tripTypes';
import { calculateFare } from '@/lib/fareCalculationService';
import { loadCabTypes, reloadCabTypes } from '@/lib/cabData';
import { RefreshCw } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { CabOptionCard } from './CabOptionCard';

interface CabOptionsProps {
  cabTypes: CabType[];
  selectedCab: CabType | null;
  onSelectCab: (cab: CabType) => void;
  distance: number;
  tripType?: TripType;
  tripMode?: TripMode;
  pickupDate?: Date;
  returnDate?: Date;
  hourlyPackage?: string;
}

export function CabOptions({
  cabTypes: initialCabTypes,
  selectedCab,
  onSelectCab,
  distance,
  tripType = 'outstation',
  tripMode = 'one-way',
  pickupDate,
  returnDate,
  hourlyPackage
}: CabOptionsProps) {
  const [selectedCabId, setSelectedCabId] = useState<string | null>(selectedCab?.id || null);
  const [cabFares, setCabFares] = useState<Record<string, number>>({});
  const [cabTypes, setCabTypes] = useState<CabType[]>(initialCabTypes);
  const [isLoadingCabs, setIsLoadingCabs] = useState(false);
  const [isRefreshingCabs, setIsRefreshingCabs] = useState(false);
  const [isCalculatingFares, setIsCalculatingFares] = useState(false);
  const [refreshSuccessful, setRefreshSuccessful] = useState<boolean | null>(null);
  const [lastCalculationParams, setLastCalculationParams] = useState<string>('');

  // Create a memoized calculation parameters string to detect changes
  const currentCalculationParams = useMemo(() => {
    return `${tripType}-${tripMode}-${hourlyPackage || 'none'}-${distance}-${pickupDate?.getTime() || 0}-${returnDate?.getTime() || 0}`;
  }, [tripType, tripMode, hourlyPackage, distance, pickupDate, returnDate]);
  
  // Load cab types once on component mount
  useEffect(() => {
    const fetchCabTypes = async () => {
      if (cabTypes.length > 0) return; // Skip if we already have cab types
      
      setIsLoadingCabs(true);
      try {
        const dynamicCabTypes = await loadCabTypes();
        console.log('Loaded dynamic cab types:', dynamicCabTypes);
        if (Array.isArray(dynamicCabTypes) && dynamicCabTypes.length > 0) {
          setCabTypes(dynamicCabTypes);
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

  // Function to manually refresh cab types
  const refreshCabTypes = useCallback(async () => {
    setIsRefreshingCabs(true);
    setCabFares({}); // Clear fares when refreshing
    
    try {
      // Clear caches to force refresh
      sessionStorage.removeItem('cabFares');
      sessionStorage.removeItem('calculatedFares');
      localStorage.removeItem('cabTypes');
      
      const freshCabTypes = await reloadCabTypes();
      console.log('Refreshed cab types:', freshCabTypes);
      
      if (Array.isArray(freshCabTypes) && freshCabTypes.length > 0) {
        setCabTypes(freshCabTypes);
        toast.success('Vehicle data refreshed successfully');
        setRefreshSuccessful(true);
        
        // Reset selection when refreshing
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

  // Reset selections when trip parameters change
  useEffect(() => {
    if (lastCalculationParams && lastCalculationParams !== currentCalculationParams) {
      console.log('Trip parameters changed, resetting selections and fares');
      setSelectedCabId(null);
      setCabFares({});
      
      if (selectedCab) {
        onSelectCab(null as any);
      }
    }
    
    setLastCalculationParams(currentCalculationParams);
  }, [currentCalculationParams, lastCalculationParams, onSelectCab, selectedCab]);

  // Calculate fares for all cab types when distance or trip parameters change
  useEffect(() => {
    if (distance > 0 && cabTypes.length > 0 && !isCalculatingFares) {
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
          
          // Calculate fares in parallel for better performance
          const farePromises = cabTypes.map(async (cab) => {
            try {
              return { 
                id: cab.id, 
                fare: await calculateFare({
                  cabType: cab,
                  distance,
                  tripType,
                  tripMode,
                  hourlyPackage,
                  pickupDate,
                  returnDate
                })
              };
            } catch (error) {
              console.error(`Error calculating fare for ${cab.name}:`, error);
              return { id: cab.id, fare: 0 };
            }
          });
          
          const results = await Promise.all(farePromises);
          const newFares: Record<string, number> = {};
          
          results.forEach(result => {
            newFares[result.id] = result.fare;
          });
          
          setCabFares(newFares);
          console.log('All fares calculated:', newFares);
        } catch (error) {
          console.error('Error calculating fares:', error);
          toast.error('Error calculating fares');
        } finally {
          setIsCalculatingFares(false);
        }
      };
      
      calculateFares();
    } else if (distance === 0) {
      setCabFares({});
    }
  }, [cabTypes, distance, tripType, tripMode, hourlyPackage, pickupDate, returnDate]);

  // Update selectedCabId when selectedCab changes (from parent)
  useEffect(() => {
    if (selectedCab) {
      setSelectedCabId(selectedCab.id);
    }
  }, [selectedCab]);

  // Handle cab selection
  const handleSelectCab = (cab: CabType) => {
    setSelectedCabId(cab.id);
    onSelectCab(cab);
    
    // Store selection in session storage
    const cabData = {
      cab: cab,
      tripType: tripType,
      tripMode: tripMode,
      hourlyPackage: hourlyPackage,
      fare: cabFares[cab.id]
    };
    
    sessionStorage.setItem('selectedCab', JSON.stringify(cabData));
    
    // Scroll to booking summary if it exists
    const bookingSummary = document.getElementById('booking-summary');
    if (bookingSummary) {
      setTimeout(() => {
        bookingSummary.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  // Generate fare details for display
  const getFareDetails = (cab: CabType): string => {
    if (tripType === 'airport') {
      return "Airport transfer";
    } else if (tripType === 'local' && hourlyPackage) {
      const packageInfo = hourlyPackage === '8hrs-80km' ? '8 hrs / 80 km' : '10 hrs / 100 km';
      return packageInfo;
    } else if (tripType === 'outstation') {
      const totalDistance = distance;
      const effectiveDistance = distance;
      const allocatedKm = 300;
      const extraKm = tripMode === 'one-way' 
        ? Math.max(0, effectiveDistance - allocatedKm)
        : Math.max(0, effectiveDistance - (allocatedKm * (returnDate ? Math.max(1, differenceInDays(returnDate, pickupDate || new Date()) + 1) : 1)));
            
      return tripMode === 'one-way' 
        ? `One way - ${totalDistance}km (${extraKm > 0 ? extraKm + 'km extra' : 'within base km'})` 
        : `Round trip - ${totalDistance}km total`;
    }
    return "";
  };

  if (isLoadingCabs) {
    return (
      <div className="space-y-4 mt-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-800">Loading cab options...</h3>
        </div>
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-gray-800">Select a cab type</h3>
        <div className="flex items-center gap-2">
          <div className="text-xs text-gray-500">{cabTypes.length} cab types available</div>
          <Button 
            variant="outline"
            size="sm"
            onClick={refreshCabTypes}
            disabled={isRefreshingCabs}
            className={`h-8 px-2 ${refreshSuccessful === false ? 'border-red-300' : ''}`}
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshingCabs ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>
      
      {refreshSuccessful === false && (
        <div className="bg-yellow-50 p-2 rounded-md text-yellow-700 text-sm mb-4">
          Unable to load updated vehicle data. Using cached data.
        </div>
      )}
      
      {cabTypes.length === 0 ? (
        <div className="p-8 text-center border rounded-lg bg-gray-50">
          <p className="text-gray-500">No vehicles available. Please try refreshing.</p>
          <Button 
            variant="default"
            onClick={refreshCabTypes}
            disabled={isRefreshingCabs}
            className="mt-4"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshingCabs ? 'animate-spin' : ''}`} />
            Refresh Vehicles
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {isCalculatingFares && (
            <div className="bg-blue-50 p-3 rounded-md flex items-center justify-center mb-3">
              <div className="animate-spin mr-2 h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-blue-600 text-sm">Calculating fares...</span>
            </div>
          )}
          
          {cabTypes.map((cab) => (
            <CabOptionCard 
              key={cab.id}
              cab={cab}
              fare={cabFares[cab.id] || 0}
              isSelected={selectedCabId === cab.id}
              onSelect={handleSelectCab}
              fareDetails={getFareDetails(cab)}
              isCalculating={isCalculatingFares}
            />
          ))}
        </div>
      )}
    </div>
  );
}
