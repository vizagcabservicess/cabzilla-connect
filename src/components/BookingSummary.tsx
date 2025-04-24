
import { formatPrice } from '@/lib/cabData';
import { Calendar, MapPin, Car, CircleDollarSign, Check, Layers, Clock } from 'lucide-react';
import { formatTravelTime } from '@/lib/locationData';
import { CabType } from '@/types/cab';
import { Location } from '@/lib/locationData';
import { hourlyPackages } from '@/lib/packageData';
import { useEffect, useState } from 'react';
import { getReliableFare, syncFareForBookingConfirmation } from '@/utils/fareSync';

interface BookingSummaryProps {
  pickupLocation: Location;
  dropLocation?: Location | null;
  pickupDate?: Date;
  returnDate?: Date | null;
  selectedCab: CabType;
  distance: number;
  tripType: string;
  tripMode: string;
  hourlyPackage?: string;
  totalPrice: number;
}

export function BookingSummary({
  pickupLocation,
  dropLocation,
  pickupDate,
  returnDate,
  selectedCab,
  distance,
  tripType,
  tripMode,
  hourlyPackage,
  totalPrice: initialTotalPrice,
}: BookingSummaryProps) {
  const [totalPrice, setTotalPrice] = useState(initialTotalPrice);
  const [showTravelTime, setShowTravelTime] = useState(false);
  
  const formatDate = (date?: Date): string => {
    if (!date) return '';
    
    return new Intl.DateTimeFormat('en-IN', {
      weekday: 'short',
      day: 'numeric', 
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };
  
  const getHourlyPackageLabel = (packageId?: string): string => {
    if (!packageId) return '';
    const pkg = hourlyPackages.find((p) => p.id === packageId);
    return pkg ? pkg.name : packageId;
  };

  // Ensure consistent fare display across the application
  useEffect(() => {
    if (selectedCab && tripType) {
      // Get the reliable fare from storage mechanisms
      const syncedFare = syncFareForBookingConfirmation(selectedCab.id, tripType, initialTotalPrice);
      
      // If there's a significant difference between the parent component's fare and stored fare
      if (Math.abs(syncedFare - initialTotalPrice) > 10) {
        console.log(`BookingSummary: Significant fare difference detected - calculated: ${initialTotalPrice}, synced: ${syncedFare}`);
        
        // Use the synced fare
        setTotalPrice(syncedFare);
        
        // Store the fare in localStorage for consistency
        try {
          const localStorageKey = `fare_${tripType}_${selectedCab.id.toLowerCase()}`;
          localStorage.setItem(localStorageKey, syncedFare.toString());
          console.log(`BookingSummary: Updated fare in localStorage: ${localStorageKey} = ${syncedFare}`);
          
          // Store in simplified key as well
          const simplifiedKey = `${tripType}_fare_${selectedCab.id.toLowerCase()}`;
          localStorage.setItem(simplifiedKey, JSON.stringify({
            fare: syncedFare,
            timestamp: Date.now(),
            source: 'bookingSummary',
            tripType
          }));
        } catch (error) {
          console.error('BookingSummary: Error storing fare:', error);
        }
      } else {
        // If no significant difference, use the initial price
        setTotalPrice(initialTotalPrice);
      }
    }
  }, [selectedCab, tripType, initialTotalPrice]);
  
  // Listen for fare calculation events
  useEffect(() => {
    const handleFareCalculated = (event: any) => {
      try {
        const { cabId, fare, tripType: eventTripType } = event.detail;
        
        if (cabId === selectedCab.id && eventTripType === tripType && fare > 0) {
          console.log(`BookingSummary: Received fare calculation event: ${cabId} = ${fare}`);
          
          // Only update if significant difference
          if (Math.abs(fare - totalPrice) > 10) {
            console.log(`BookingSummary: Updating fare from event: ${fare} (was ${totalPrice})`);
            setTotalPrice(fare);
          }
          
          // Store in localStorage for consistency
          try {
            const localStorageKey = `fare_${tripType}_${selectedCab.id.toLowerCase()}`;
            localStorage.setItem(localStorageKey, fare.toString());
            console.log(`BookingSummary: Stored calculated fare in localStorage: ${localStorageKey} = ${fare}`);
          } catch (error) {
            console.error('BookingSummary: Error storing fare:', error);
          }
        }
      } catch (error) {
        console.error('BookingSummary: Error handling fare event:', error);
      }
    };
    
    window.addEventListener('fare-calculated', handleFareCalculated);
    
    return () => {
      window.removeEventListener('fare-calculated', handleFareCalculated);
    };
  }, [selectedCab, tripType, totalPrice]);

  // If the parent component updates the totalPrice directly
  useEffect(() => {
    if (Math.abs(initialTotalPrice - totalPrice) > 10) {
      setTotalPrice(initialTotalPrice);
      console.log(`BookingSummary: Updated total price from parent: ${initialTotalPrice}`);
    }
  }, [initialTotalPrice]);

  return (
    <div className="bg-white rounded-lg shadow border p-6 sticky top-4">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Booking Summary</h2>
      
      <div className="space-y-4">
        <div className="flex items-start">
          <MapPin className="h-5 w-5 mr-3 text-gray-500 mt-0.5" />
          <div>
            <p className="text-sm text-gray-500">PICKUP LOCATION</p>
            <p className="font-medium">{pickupLocation?.name}</p>
          </div>
        </div>
        
        {dropLocation && (
          <div className="flex items-start">
            <MapPin className="h-5 w-5 mr-3 text-gray-500 mt-0.5" />
            <div>
              <p className="text-sm text-gray-500">DROP LOCATION</p>
              <p className="font-medium">{dropLocation?.name}</p>
            </div>
          </div>
        )}
        
        {pickupDate && (
          <div className="flex items-start">
            <Calendar className="h-5 w-5 mr-3 text-gray-500 mt-0.5" />
            <div>
              <p className="text-sm text-gray-500">PICKUP DATE & TIME</p>
              <p className="font-medium">{formatDate(pickupDate)}</p>
            </div>
          </div>
        )}
        
        {returnDate && (
          <div className="flex items-start">
            <Calendar className="h-5 w-5 mr-3 text-gray-500 mt-0.5" />
            <div>
              <p className="text-sm text-gray-500">RETURN DATE & TIME</p>
              <p className="font-medium">{formatDate(returnDate)}</p>
            </div>
          </div>
        )}
        
        <div className="flex items-start">
          <Car className="h-5 w-5 mr-3 text-gray-500 mt-0.5" />
          <div>
            <p className="text-sm text-gray-500">VEHICLE TYPE</p>
            <p className="font-medium">{selectedCab?.name}</p>
          </div>
        </div>
        
        {tripType && (
          <div className="flex items-start">
            <Layers className="h-5 w-5 mr-3 text-gray-500 mt-0.5" />
            <div>
              <p className="text-sm text-gray-500">TRIP TYPE</p>
              <div className="flex items-center">
                <p className="font-medium capitalize">{tripType}</p>
                {tripMode === 'round-trip' && (
                  <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded">
                    Round Trip
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
        
        {hourlyPackage && tripType === 'local' && (
          <div className="flex items-start">
            <Clock className="h-5 w-5 mr-3 text-gray-500 mt-0.5" />
            <div>
              <p className="text-sm text-gray-500">PACKAGE</p>
              <p className="font-medium">{getHourlyPackageLabel(hourlyPackage)}</p>
            </div>
          </div>
        )}
        
        {distance > 0 && (
          <div 
            className="flex items-start cursor-pointer"
            onClick={() => setShowTravelTime(!showTravelTime)}
          >
            <MapPin className="h-5 w-5 mr-3 text-gray-500 mt-0.5" />
            <div>
              <p className="text-sm text-gray-500">
                {showTravelTime ? "ESTIMATED TIME" : "DISTANCE"}
              </p>
              <p className="font-medium">
                {showTravelTime 
                  ? formatTravelTime(distance * 3) 
                  : `${distance} km`
                }
              </p>
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-6 pt-4 border-t border-gray-100">
        <div className="flex justify-between items-center">
          <p className="text-gray-700 font-medium">Total Fare</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatPrice(totalPrice)}
          </p>
        </div>
        
        <ul className="mt-3 space-y-1">
          <li className="flex items-center text-sm text-gray-500">
            <Check className="h-4 w-4 mr-2 text-green-500" />
            Free Cancellation
          </li>
          <li className="flex items-center text-sm text-gray-500">
            <Check className="h-4 w-4 mr-2 text-green-500" />
            Sanitized Cabs
          </li>
          <li className="flex items-center text-sm text-gray-500">
            <Check className="h-4 w-4 mr-2 text-green-500" />
            24/7 Customer Support
          </li>
        </ul>
      </div>
    </div>
  );
}
