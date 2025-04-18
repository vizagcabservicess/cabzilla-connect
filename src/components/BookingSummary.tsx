
import React, { useState, useEffect, useCallback } from 'react';
import { Location } from '@/lib/locationData';
import { CabType } from '@/types/cab';
import { formatPrice } from '@/lib/cabData';
import { TripType, TripMode } from '@/lib/tripTypes';
import { useFare, FareType } from '@/hooks/useFare';
import { toast } from 'sonner';

interface BookingSummaryProps {
  pickupLocation: Location | null;
  dropLocation: Location | null;
  pickupDate?: Date;
  returnDate?: Date;
  selectedCab: CabType | null;
  distance: number;
  totalPrice: number;
  tripType: TripType;
  tripMode: TripMode;
  hourlyPackage?: string;
  isPreview?: boolean;
}

export function BookingSummary({
  pickupLocation,
  dropLocation,
  pickupDate,
  returnDate,
  selectedCab,
  distance,
  totalPrice,
  tripType,
  tripMode,
  hourlyPackage,
  isPreview = false
}: BookingSummaryProps) {
  const [displayPrice, setDisplayPrice] = useState<number>(totalPrice);
  const [lastCalculationTime, setLastCalculationTime] = useState<number>(0);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [initialized, setInitialized] = useState<boolean>(false);
  const [fareBreakdown, setFareBreakdown] = useState<Record<string, number | string>>({});
  
  // Initialize the fare hook
  const { 
    fetchFare, 
    clearCache,
    loading,
    isFareLoading
  } = useFare();
  
  // Map trip type to FareType
  const mapTripType = (type: TripType): FareType => {
    if (type === 'local') return 'local';
    if (type === 'airport') return 'airport';
    if (type === 'tour') return 'tour';
    return 'outstation';
  };
  
  // Get the package details for local trips
  const getLocalPackageDetails = () => {
    if (tripType === 'local' && hourlyPackage) {
      const packageMap: Record<string, string> = {
        '4hrs-40km': '4hrs-40km package',
        '8hrs-80km': '8hrs-80km package',
        '10hrs-100km': '10hrs-100km package'
      };
      return packageMap[hourlyPackage] || `${hourlyPackage} package`;
    }
    return '';
  };
  
  // Calculate and update fare
  const calculateAndUpdateFare = useCallback(async (forceRefresh = false) => {
    if (!selectedCab || !pickupLocation || (tripType !== 'local' && !dropLocation) || distance <= 0) {
      return;
    }
    
    const now = Date.now();
    if (!forceRefresh && now - lastCalculationTime < 5000) {
      console.log('Throttling fare calculation in BookingSummary');
      return;
    }
    
    setLastCalculationTime(now);
    
    try {
      // Check if fare is cached in localStorage first
      let cachedFare = 0;
      if (tripType === 'local' && hourlyPackage) {
        const localStorageKey = `local_fare_${selectedCab.id}_${hourlyPackage}`;
        const storedPrice = localStorage.getItem(localStorageKey);
        if (storedPrice) {
          cachedFare = parseInt(storedPrice, 10);
        }
      } else if (tripType === 'outstation') {
        const outstationKey = `outstation_${selectedCab.id}_${distance}_${tripMode}`;
        const storedFare = localStorage.getItem(outstationKey);
        if (storedFare) {
          cachedFare = parseInt(storedFare, 10);
        }
      }
      
      if (!forceRefresh && cachedFare > 0) {
        setDisplayPrice(cachedFare);
        console.log(`Using cached fare from localStorage: ₹${cachedFare}`);
        
        // Set simple breakdown for cached fare
        if (tripType === 'local') {
          setFareBreakdown({
            [hourlyPackage || '8hrs-80km']: cachedFare
          });
        } else if (tripType === 'outstation') {
          setFareBreakdown({
            [`${tripMode === 'round-trip' ? 'Round trip' : 'One way'} - ${distance} km`]: cachedFare
          });
        } else {
          setFareBreakdown({
            'Total fare': cachedFare
          });
        }
        
        return;
      }
      
      // Fetch fresh fare from API
      const fareDetails = await fetchFare({
        vehicleId: selectedCab.id,
        tripType: mapTripType(tripType),
        distance,
        tripMode: tripMode as 'one-way' | 'round-trip',
        packageId: hourlyPackage,
        pickupDate,
        returnDate
      }, forceRefresh);
      
      if (fareDetails.totalPrice > 0) {
        setDisplayPrice(fareDetails.totalPrice);
        
        // Update breakdown from fare details
        if (fareDetails.breakdown) {
          setFareBreakdown(fareDetails.breakdown);
        } else {
          // Set simple breakdown
          if (tripType === 'local') {
            setFareBreakdown({
              [hourlyPackage || '8hrs-80km']: fareDetails.totalPrice
            });
          } else if (tripType === 'outstation') {
            setFareBreakdown({
              [`${tripMode === 'round-trip' ? 'Round trip' : 'One way'} - ${distance} km`]: fareDetails.totalPrice
            });
          } else {
            setFareBreakdown({
              'Total fare': fareDetails.totalPrice
            });
          }
        }
        
        // Cache to localStorage for consistent display
        if (tripType === 'local' && hourlyPackage) {
          localStorage.setItem(`local_fare_${selectedCab.id}_${hourlyPackage}`, fareDetails.totalPrice.toString());
        } else if (tripType === 'outstation') {
          const outstationKey = `outstation_${selectedCab.id}_${distance}_${tripMode}`;
          localStorage.setItem(outstationKey, fareDetails.totalPrice.toString());
        }
      } else if (totalPrice > 0) {
        setDisplayPrice(totalPrice);
        setFareBreakdown({
          'Total fare': totalPrice
        });
      }
    } catch (error) {
      console.error('Error calculating fare in BookingSummary:', error);
      
      if (totalPrice > 0) {
        setDisplayPrice(totalPrice);
        setFareBreakdown({
          'Total fare': totalPrice
        });
      }
    }
  }, [selectedCab, pickupLocation, dropLocation, distance, tripType, tripMode, hourlyPackage, pickupDate, returnDate, totalPrice, lastCalculationTime, fetchFare]);
  
  // Initialize the fare on component mount and when cab/trip details change
  useEffect(() => {
    if (selectedCab && distance > 0) {
      if (!initialized) {
        setInitialized(true);
        calculateAndUpdateFare(false);
      } else if (
        Math.abs(totalPrice - displayPrice) > 100 || 
        totalPrice <= 0 && displayPrice <= 0
      ) {
        calculateAndUpdateFare(false);
      }
    }
  }, [selectedCab, distance, totalPrice, displayPrice, initialized, calculateAndUpdateFare]);
  
  // Reset state when cab changes
  useEffect(() => {
    if (selectedCab) {
      // Reset state for new cab
      setRetryCount(0);
    }
  }, [selectedCab]);
  
  // Retry calculation if fare is zero
  useEffect(() => {
    if (initialized && displayPrice <= 0 && selectedCab && distance > 0 && retryCount < 3) {
      const retryTimer = setTimeout(() => {
        console.log(`Retrying fare calculation (attempt ${retryCount + 1})`);
        setRetryCount(prev => prev + 1);
        calculateAndUpdateFare(true);
      }, 2000 * (retryCount + 1));
      
      return () => clearTimeout(retryTimer);
    }
  }, [displayPrice, initialized, retryCount, selectedCab, distance, calculateAndUpdateFare]);
  
  // Handle refresh price button click
  const handleRefreshPrice = () => {
    if (isFareLoading(selectedCab?.id || '')) return;
    
    clearCache();
    setRetryCount(0);
    setDisplayPrice(0);
    setInitialized(false);
    
    toast.info("Refreshing fare calculation...");
    
    setTimeout(() => {
      calculateAndUpdateFare(true);
    }, 500);
  };
  
  // Determine if fare is loading
  const isCalculatingFare = isFareLoading(selectedCab?.id || '');
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold mb-6">Booking Summary</h2>
      
      <div className="space-y-4">
        <div className="flex items-start">
          <div className="mt-1 text-blue-500 flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-gray-500">PICKUP LOCATION</p>
            <p className="font-medium">{pickupLocation?.name || pickupLocation?.address || 'Not specified'}</p>
          </div>
        </div>
        
        {tripType !== 'local' && (
          <div className="flex items-start">
            <div className="mt-1 text-blue-500 flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-500">DROP LOCATION</p>
              <p className="font-medium">{dropLocation?.name || dropLocation?.address || 'Not specified'}</p>
            </div>
          </div>
        )}
        
        <div className="flex items-start">
          <div className="mt-1 text-blue-500 flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-gray-500">PICKUP DATE & TIME</p>
            <p className="font-medium">
              {pickupDate ? new Intl.DateTimeFormat('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
                hour12: true
              }).format(pickupDate) : 'Not specified'}
            </p>
          </div>
        </div>
        
        {tripType === 'outstation' && tripMode === 'round-trip' && returnDate && (
          <div className="flex items-start">
            <div className="mt-1 text-blue-500 flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-500">RETURN DATE & TIME</p>
              <p className="font-medium">
                {new Intl.DateTimeFormat('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: 'numeric',
                  hour12: true
                }).format(returnDate)}
              </p>
            </div>
          </div>
        )}
        
        <div className="flex items-start">
          <div className="mt-1 text-blue-500 flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-gray-500">SELECTED CAB</p>
            <p className="font-medium">{selectedCab?.name || 'Not selected'}</p>
          </div>
        </div>
        
        <div className="flex items-start">
          <div className="mt-1 text-blue-500 flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-gray-500">TRIP DETAILS</p>
            <p className="font-medium">
              {tripType.charAt(0).toUpperCase() + tripType.slice(1)}
              {tripType === 'outstation' && ` - ${tripMode === 'round-trip' ? 'Round Trip' : 'One Way'}`}
              {tripType === 'local' && ` - ${getLocalPackageDetails()}`}
            </p>
            <p className="text-sm">Distance: {distance} km</p>
          </div>
        </div>
      </div>
      
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h3 className="text-lg font-semibold mb-4 flex justify-between items-center">
          Fare Breakdown
          <button 
            onClick={handleRefreshPrice}
            className="text-xs text-blue-600 hover:text-blue-800 flex items-center" 
            disabled={isCalculatingFare}
          >
            {isCalculatingFare ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Calculating...
              </span>
            ) : (
              <span className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </span>
            )}
          </button>
        </h3>
        
        {Object.entries(fareBreakdown).map(([label, value]) => (
          <div key={label} className="flex justify-between items-center py-2">
            <span>{label}</span>
            <span className="font-semibold">
              {isCalculatingFare ? (
                <div className="h-6 w-20 bg-gray-200 rounded animate-pulse"></div>
              ) : (
                typeof value === 'number' ? formatPrice(value) : value
              )}
            </span>
          </div>
        ))}
        
        <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
          <span className="text-lg font-bold">Total</span>
          <span className="text-lg font-bold">
            {isCalculatingFare ? (
              <div className="h-7 w-24 bg-gray-200 rounded animate-pulse"></div>
            ) : (
              formatPrice(displayPrice)
            )}
          </span>
        </div>
        
        <p className="text-xs text-gray-500 mt-2">
          Inclusive of all taxes. No hidden charges.
        </p>
      </div>
    </div>
  );
}
