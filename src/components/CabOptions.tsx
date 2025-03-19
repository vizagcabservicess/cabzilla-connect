
import { useState, useEffect, useCallback, useMemo } from 'react';
import { CabType } from '@/types/cab';
import { formatPrice } from '@/lib/cabData';
import { TripType, TripMode } from '@/lib/tripTypes';
import { getLocalPackagePrice } from '@/lib/packageData';
import { calculateAirportFare, calculateFare } from '@/lib/fareCalculationService';
import { loadCabTypes, reloadCabTypes } from '@/lib/cabData';
import { Users, Briefcase, Info, Check, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

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
  const [expandedCab, setExpandedCab] = useState<string | null>(null);
  const [selectedCabId, setSelectedCabId] = useState<string | null>(selectedCab?.id || null);
  const [cabFares, setCabFares] = useState<Record<string, number>>({});
  const [lastTripIdentifier, setLastTripIdentifier] = useState<string>('');
  const [lastCalculationTimestamp, setLastCalculationTimestamp] = useState<number>(0);
  const [cabTypes, setCabTypes] = useState<CabType[]>(initialCabTypes);
  const [isLoadingCabs, setIsLoadingCabs] = useState(false);
  const [isRefreshingCabs, setIsRefreshingCabs] = useState(false);
  const [isCalculatingFares, setIsCalculatingFares] = useState(false);
  const [refreshSuccessful, setRefreshSuccessful] = useState<boolean | null>(null);

  const currentTripIdentifier = `${tripType}-${tripMode}-${hourlyPackage || 'none'}-${distance}`;
  
  const calculationCache = useMemo(() => new Map<string, number>(), []);
  
  useEffect(() => {
    async function fetchCabTypes() {
      setIsLoadingCabs(true);
      try {
        const dynamicCabTypes = await loadCabTypes();
        console.log('Loaded dynamic cab types:', dynamicCabTypes);
        if (Array.isArray(dynamicCabTypes) && dynamicCabTypes.length > 0) {
          setCabTypes(dynamicCabTypes);
          setRefreshSuccessful(true);
        } else {
          console.warn('API returned empty vehicle data, using initial cab types');
          setRefreshSuccessful(false);
        }
      } catch (error) {
        console.error('Error loading dynamic cab types:', error);
        toast.error('Could not load vehicle data. Using default values.');
        setRefreshSuccessful(false);
      } finally {
        setIsLoadingCabs(false);
      }
    }
    
    fetchCabTypes();
  }, [initialCabTypes]);

  const refreshCabTypes = useCallback(async () => {
    setIsRefreshingCabs(true);
    try {
      const timestamp = Date.now();
      console.log(`Refreshing cab types with timestamp: ${timestamp}`);
      
      sessionStorage.removeItem('cabFares');
      sessionStorage.removeItem('calculatedFares');
      localStorage.removeItem('cabTypes');
      
      const freshCabTypes = await reloadCabTypes();
      console.log('Refreshed cab types:', freshCabTypes);
      
      if (Array.isArray(freshCabTypes) && freshCabTypes.length > 0) {
        setCabTypes(freshCabTypes);
        toast.success('Vehicle data refreshed successfully');
        setRefreshSuccessful(true);
        
        // Reset selection and fares after refresh
        setSelectedCabId(null);
        setCabFares({});
        if (selectedCab) {
          onSelectCab(null as any);
        }
        
        setLastCalculationTimestamp(Date.now());
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
    setCabFares({});
    setSelectedCabId(null);
    
    if (selectedCab) {
      onSelectCab(null as any);
    }
    
    sessionStorage.removeItem('cabFares');
    sessionStorage.removeItem('selectedCab');
    sessionStorage.removeItem('calculatedFares');
    
    setLastCalculationTimestamp(Date.now());
  }, [tripType, tripMode, hourlyPackage, onSelectCab, selectedCab]);

  useEffect(() => {
    if (lastTripIdentifier && lastTripIdentifier !== currentTripIdentifier) {
      console.log('Trip parameters changed, resetting selections and fares');
      console.log('Previous:', lastTripIdentifier);
      console.log('Current:', currentTripIdentifier);
      
      setSelectedCabId(null);
      setCabFares({});
      
      if (selectedCab) {
        onSelectCab(null as any);
      }
      
      sessionStorage.removeItem('cabFares');
      sessionStorage.removeItem('selectedCab');
      sessionStorage.removeItem('calculatedFares');
    }
    
    setLastTripIdentifier(currentTripIdentifier);
  }, [tripType, tripMode, hourlyPackage, distance, currentTripIdentifier, lastTripIdentifier, onSelectCab, selectedCab]);

  const calculateCabFare = useCallback(async (cab: CabType): Promise<number> => {
    try {
      const cacheKey = `${cab.id}-${tripType}-${tripMode}-${hourlyPackage || 'none'}-${distance}-${pickupDate?.toISOString() || 'nodate'}-${returnDate?.toISOString() || 'nodate'}`;
      
      if (calculationCache.has(cacheKey)) {
        return calculationCache.get(cacheKey) || 0;
      }
      
      let fare = 0;
      
      if (tripType === 'airport') {
        fare = calculateAirportFare(cab.name, distance);
      } else if (tripType === 'local' && hourlyPackage) {
        const baseFare = getLocalPackagePrice(hourlyPackage, cab.name);
        const packageKm = hourlyPackage === '8hrs-80km' ? 80 : 100;
        
        if (distance > packageKm && distance < 300) {
          const extraKm = distance - packageKm;
          const totalFare = baseFare + (extraKm * cab.pricePerKm);
          console.log(`Added ${extraKm}km extra at ${cab.pricePerKm}/km = ${extraKm * cab.pricePerKm}`);
          fare = Math.ceil(totalFare / 10) * 10;
        } else {
          fare = baseFare;
        }
      } else {
        // Use the new calculation service for outstation trips
        fare = await calculateFare({
          cabType: cab,
          distance,
          tripType,
          tripMode,
          hourlyPackage,
          pickupDate,
          returnDate
        });
      }
      
      calculationCache.set(cacheKey, fare);
      console.log(`Calculated fare for ${cab.name}: ₹${fare}`);
      
      return fare;
    } catch (error) {
      console.error(`Error in calculateCabFare for ${cab.name}:`, error);
      return 0;
    }
  }, [tripType, tripMode, hourlyPackage, distance, pickupDate, returnDate, calculationCache]);

  useEffect(() => {
    if (distance > 0 && !isCalculatingFares && cabTypes.length > 0) {
      console.log(`Calculating fares for ${tripType} trip, ${distance}km, package: ${hourlyPackage || 'none'}`);
      
      const newFares: Record<string, number> = {};
      
      const calculateFares = async () => {
        setIsCalculatingFares(true);
        
        try {
          if (distance > 500) {
            toast.info('Calculating fares for long distance...', {
              duration: 3000
            });
          }
          
          console.log(`Starting fare calculation for ${cabTypes.length} cab types`);
          
          if (distance > 500) {
            for (const cab of cabTypes) {
              try {
                newFares[cab.id] = await calculateCabFare(cab);
                setCabFares(prev => ({...prev, [cab.id]: newFares[cab.id]}));
              } catch (error) {
                console.error(`Error calculating fare for ${cab.name}:`, error);
                newFares[cab.id] = 0;
              }
            }
          } else {
            // Use Promise.all for parallel calculation of fares to improve performance
            const farePromises = cabTypes.map(async (cab) => {
              try {
                return { id: cab.id, fare: await calculateCabFare(cab) };
              } catch (error) {
                console.error(`Error calculating fare for ${cab.name}:`, error);
                return { id: cab.id, fare: 0 };
              }
            });
            
            const results = await Promise.all(farePromises);
            results.forEach(result => {
              newFares[result.id] = result.fare;
            });
            
            setCabFares(newFares);
          }
          
          console.log('All fares calculated:', newFares);
          
          const fareData = {
            timestamp: Date.now(),
            tripType,
            tripMode,
            hourlyPackage,
            distance,
            fares: newFares
          };
          
          sessionStorage.setItem('calculatedFares', JSON.stringify(fareData));
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
  }, [distance, tripType, tripMode, hourlyPackage, pickupDate, returnDate, cabTypes, lastCalculationTimestamp, calculateCabFare, isCalculatingFares]);

  useEffect(() => {
    if (selectedCab) {
      setSelectedCabId(selectedCab.id);
    }
  }, [selectedCab]);

  const toggleExpand = (id: string) => {
    setExpandedCab(expandedCab === id ? null : id);
  };

  const handleSelectCab = (cab: CabType) => {
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
          {isCalculatingFares && distance > 500 && (
            <div className="bg-blue-50 p-3 rounded-md flex items-center justify-center mb-3">
              <div className="animate-spin mr-2 h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-blue-600 text-sm">Calculating fares for long distance...</span>
            </div>
          )}
          
          {cabTypes.map((cab) => {
            const fare = cabFares[cab.id] || 0;
            const isSelected = selectedCabId === cab.id;
            
            let fareDetails = "";
            if (tripType === 'airport') {
              fareDetails = "Airport transfer";
            } else if (tripType === 'local' && hourlyPackage) {
              const packageInfo = hourlyPackage === '8hrs-80km' ? '8 hrs / 80 km' : '10 hrs / 100 km';
              fareDetails = packageInfo;
            } else if (tripType === 'outstation') {
              const totalDistance = distance;
              const effectiveDistance = distance * 2;
              const allocatedKm = 300;
              const extraKm = tripMode === 'one-way' 
                ? Math.max(0, effectiveDistance - allocatedKm)
                : Math.max(0, effectiveDistance - (allocatedKm * (returnDate ? Math.max(1, differenceInDays(returnDate, pickupDate || new Date()) + 1) : 1)));
                
              fareDetails = tripMode === 'one-way' 
                ? `One way - ${totalDistance}km (${extraKm > 0 ? extraKm + 'km extra' : 'within base km'})` 
                : `Round trip - ${totalDistance * 2}km total`;
            }

            return (
              <div 
                key={cab.id}
                className={cn(
                  "border rounded-lg overflow-hidden transition-all duration-300",
                  isSelected 
                    ? "border-blue-500 shadow-md bg-blue-50 transform scale-[1.02]" 
                    : "border-gray-200 hover:border-gray-300 bg-white"
                )}
              >
                <div 
                  className="p-4 cursor-pointer relative"
                  onClick={() => handleSelectCab(cab)}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1">
                      <Check size={16} />
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={cn(
                        "w-12 h-12 rounded-md flex items-center justify-center bg-cover bg-center",
                        isSelected ? "bg-blue-100" : "bg-gray-100"
                      )} style={{backgroundImage: cab.image && !cab.image.includes('undefined') ? `url(${cab.image})` : 'none'}}>
                        {(!cab.image || cab.image.includes('undefined')) && (
                          <span className={isSelected ? "text-blue-500 text-xs" : "text-gray-500 text-xs"}>
                            {cab.name.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div>
                        <h4 className="font-semibold text-base text-gray-800">{cab.name}</h4>
                        <p className="text-xs text-gray-500">{cab.description}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className={cn(
                        "text-lg font-bold",
                        isSelected ? "text-blue-600" : "text-gray-800"
                      )}>
                        {fare > 0 ? formatPrice(fare) : (
                          <span className="text-sm text-gray-400">Calculating...</span>
                        )}
                      </div>
                      <div className="text-xs text-blue-600">
                        {fareDetails}
                      </div>
                      <div className="flex items-center text-xs text-gray-400">
                        <span className="text-green-600 mr-1 text-[10px]">✓</span>
                        Includes taxes & fees (Tolls & Permits Extra)
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mt-2">
                    <div className="flex items-center text-xs bg-gray-100 px-2 py-1 rounded">
                      <Users size={12} className="mr-1" />
                      {cab.capacity} persons
                    </div>
                    <div className="flex items-center text-xs bg-gray-100 px-2 py-1 rounded">
                      <Briefcase size={12} className="mr-1" />
                      {cab.luggageCapacity} bags
                    </div>
                    {cab.ac && (
                      <div className="flex items-center text-xs bg-gray-100 px-2 py-1 rounded">
                        <Check size={12} className="mr-1" />
                        AC
                      </div>
                    )}
                    {cab.amenities && cab.amenities.length > 0 && (
                      <div className="flex items-center text-xs bg-gray-100 px-2 py-1 rounded" 
                           onClick={(e) => { e.stopPropagation(); toggleExpand(cab.id); }}>
                        <Info size={12} className="mr-1" />
                        {expandedCab === cab.id ? 'Hide details' : 'More details'}
                      </div>
                    )}
                  </div>
                  
                  {expandedCab === cab.id && cab.amenities && cab.amenities.length > 0 && (
                    <div className="mt-3 pt-3 border-t text-sm text-gray-600">
                      <div className="font-medium mb-1">Amenities:</div>
                      <div className="flex flex-wrap gap-1">
                        {cab.amenities.map((amenity, index) => (
                          <span key={index} className="bg-gray-50 text-xs px-2 py-1 rounded">
                            {amenity}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
