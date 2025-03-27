
import { useState, useEffect } from 'react';
import { Location } from '@/lib/locationData';
import { CabType } from '@/types/cab';
import { TripType } from '@/lib/tripTypes';
import { formatPrice } from '@/lib/cabData';
import { format } from 'date-fns';
import { Car, MapPin, Calendar, User, Info } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { getLocalPackagePrice } from '@/lib/packageData';

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
  
  // Listen for fare update events and update the calculated fare
  useEffect(() => {
    // Initialize with the provided total price
    setCalculatedFare(totalPrice > 0 ? totalPrice : selectedCab?.price || 0);
    
    const handleLocalFaresUpdated = (event: Event) => {
      console.log('BookingSummary: Detected local fares updated event');
      if (selectedCab && tripType === 'local') {
        // For local trips, use the totalPrice from props or the updated fare
        const customEvent = event as CustomEvent;
        if (customEvent.detail?.vehicleId === selectedCab.id && customEvent.detail?.packages) {
          const packages = customEvent.detail.packages;
          const hourlyPackageId = '8hrs-80km';
          const updatedFare = packages[hourlyPackageId] || totalPrice;
          console.log(`Using updated local fare for ${selectedCab.id}: ${updatedFare}`);
          setCalculatedFare(updatedFare > 0 ? updatedFare : totalPrice);
        } else {
          setCalculatedFare(totalPrice > 0 ? totalPrice : selectedCab?.price || 0);
        }
      }
    };
    
    const handleCabSelectedForLocal = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('BookingSummary: Detected cab-selected-for-local event', customEvent.detail);
      
      if (selectedCab && tripType === 'local' && customEvent.detail) {
        if (customEvent.detail.cabType === selectedCab.id && customEvent.detail.fare && customEvent.detail.fare > 0) {
          console.log(`Using fare from cab-selected event: ${customEvent.detail.fare}`);
          setCalculatedFare(customEvent.detail.fare);
        }
      }
    };
    
    const handleTripFaresUpdated = (event: Event) => {
      console.log('BookingSummary: Detected trip-fares-updated event');
      if (selectedCab && (tripType === 'outstation' || tripType === 'airport')) {
        // For outstation/airport trips, use the totalPrice from props which should be updated
        setCalculatedFare(totalPrice > 0 ? totalPrice : selectedCab?.price || 0);
      }
    };
    
    const handleFareCacheCleared = () => {
      console.log('BookingSummary: Detected fare-cache-cleared event');
      // When cache is cleared, use the latest total price
      setCalculatedFare(totalPrice > 0 ? totalPrice : selectedCab?.price || 0);
    };
    
    // Add event listeners for fare updates
    window.addEventListener('local-fares-updated', handleLocalFaresUpdated);
    window.addEventListener('cab-selected-for-local', handleCabSelectedForLocal);
    window.addEventListener('trip-fares-updated', handleTripFaresUpdated);
    window.addEventListener('airport-fares-updated', handleTripFaresUpdated);
    window.addEventListener('fare-cache-cleared', handleFareCacheCleared);
    
    return () => {
      // Clean up event listeners
      window.removeEventListener('local-fares-updated', handleLocalFaresUpdated);
      window.removeEventListener('cab-selected-for-local', handleCabSelectedForLocal);
      window.removeEventListener('trip-fares-updated', handleTripFaresUpdated);
      window.removeEventListener('airport-fares-updated', handleTripFaresUpdated);
      window.removeEventListener('fare-cache-cleared', handleFareCacheCleared);
    };
  }, [totalPrice, selectedCab, tripType]);

  // For local packages, always try to get the latest price
  useEffect(() => {
    if (selectedCab && selectedCab.id && tripType === 'local') {
      try {
        const hourlyPackageId = '8hrs-80km';
        const localPrice = getLocalPackagePrice(hourlyPackageId, selectedCab.id);
        console.log(`Retrieved local price for ${selectedCab.id}: ${localPrice}`);
        
        if (localPrice > 0) {
          // Use direct local price without GST
          setCalculatedFare(localPrice);
        } else if (totalPrice > 0) {
          // Fallback to totalPrice if available
          setCalculatedFare(totalPrice);
        } else if (selectedCab.price) {
          // Use the cab's base price as a last resort
          setCalculatedFare(selectedCab.price);
        }
      } catch (error) {
        console.error('Error getting local package price:', error);
        // Fallback to total price if available
        setCalculatedFare(totalPrice > 0 ? totalPrice : selectedCab.price || 0);
      }
    }
  }, [selectedCab, tripType, totalPrice]);

  // If essential information is missing, show a placeholder
  if (!pickupLocation || (!dropLocation && tripType !== 'local' && tripType !== 'tour') || !pickupDate || !selectedCab) {
    return <div className="p-4 bg-gray-100 rounded-lg">Booking information not available</div>;
  }

  // Initialize fare breakdown variables
  let baseFare = 0;
  let driverAllowance = 0;
  let nightCharges = 0;
  let additionalCharges = 0;
  let additionalChargesLabel = '';
  let effectiveDistance = distance;
  let extraDistance = 0;
  let extraDistanceFare = 0;
  let perKmRate = 0;
  const minimumKm = 300; // Minimum 300km for one-way trips
  
  // Calculate fare breakdown based on trip type
  if (tripType === 'outstation') {
    console.log(`Calculating outstation fare for ${tripMode} trip, distance: ${distance}km`);
    
    // Set the base pricing values from the cab type if available
    if (selectedCab.outstationFares) {
      perKmRate = tripMode === 'one-way' ? 
        selectedCab.outstationFares.pricePerKm : 
        selectedCab.outstationFares.roundTripPricePerKm || selectedCab.outstationFares.pricePerKm;
      
      driverAllowance = selectedCab.outstationFares.driverAllowance || 250;
      console.log(`Using outstation fares: perKmRate=${perKmRate}, driverAllowance=${driverAllowance}`);
    } else {
      // Fallback values if outstationFares not available
      perKmRate = tripMode === 'one-way' ? 16 : 14;
      driverAllowance = 250;
      console.log(`Using fallback outstation fares: perKmRate=${perKmRate}, driverAllowance=${driverAllowance}`);
    }
    
    if (tripMode === 'one-way') {
      // For one-way trips, ensure minimum 300 km billing
      effectiveDistance = Math.max(distance, minimumKm);
      
      // Always calculate base fare for minimum 300 km
      baseFare = minimumKm * perKmRate;
      
      // Calculate extra distance if actual distance exceeds minimum
      if (distance > minimumKm) {
        extraDistance = distance - minimumKm;
        extraDistanceFare = extraDistance * perKmRate;
      } else {
        extraDistance = 0;
        extraDistanceFare = 0;
      }
      
      console.log(`One-way calculation: baseFare=${baseFare}, extraDistance=${extraDistance}, extraDistanceFare=${extraDistanceFare}`);
    } else {
      // For round trips, the effective distance is the one-way distance × 2
      effectiveDistance = distance * 2;
      
      // Calculate if the round trip meets minimum distance requirement
      if (effectiveDistance < minimumKm) {
        // If total round trip distance is less than minimum, charge for minimum km
        baseFare = minimumKm * perKmRate;
        extraDistance = 0;
        extraDistanceFare = 0;
      } else {
        // If total round trip distance exceeds minimum, charge for actual distance
        baseFare = effectiveDistance * perKmRate;
        extraDistance = 0;
        extraDistanceFare = 0;
      }
      
      console.log(`Round-trip calculation: baseFare=${baseFare}, effectiveDistance=${effectiveDistance}, perKmRate=${perKmRate}`);
    }
    
    // Night charges for pickups during night hours (10 PM to 5 AM)
    nightCharges = (pickupDate && (pickupDate.getHours() >= 22 || pickupDate.getHours() <= 5)) 
                  ? Math.round(baseFare * 0.1) 
                  : 0;
  } 
  else if (tripType === 'airport') {
    console.log(`Calculating airport fare for distance: ${distance}km`);
    
    // For airport transfers, use tiered pricing based on distance
    if (selectedCab.airportFares) {
      const airportFares = selectedCab.airportFares;
      
      if (distance <= 10) {
        baseFare = airportFares.tier1Price || airportFares.basePrice || 1000;
      } else if (distance <= 20) {
        baseFare = airportFares.tier2Price || airportFares.basePrice || 1200;
      } else if (distance <= 30) {
        baseFare = airportFares.tier3Price || airportFares.basePrice || 1500;
      } else {
        baseFare = airportFares.tier4Price || airportFares.basePrice || 2000;
      }
      
      // Airport fee and driver allowance
      additionalCharges = airportFares.extraKmCharge || 150;
      additionalChargesLabel = 'Airport Fee';
      driverAllowance = 250;
      
      // Extra distance charges for distances above 30km
      if (distance > 30) {
        extraDistance = distance - 30;
        extraDistanceFare = extraDistance * (airportFares.extraKmCharge || 14);
      }
      
      console.log(`Using airport fares: baseFare=${baseFare}, airportFee=${additionalCharges}, extraDistance=${extraDistance}, extraFare=${extraDistanceFare}`);
    } else {
      // Default airport pricing if no specific fares provided
      if (distance <= 10) {
        baseFare = 1000;
      } else if (distance <= 20) {
        baseFare = 1200;
      } else if (distance <= 30) {
        baseFare = 1500;
      } else {
        baseFare = 2000;
      }
      
      // Extra distance charges
      if (distance > 30) {
        extraDistance = distance - 30;
        extraDistanceFare = extraDistance * 14;
      }
      
      // Airport fee and driver allowance
      additionalCharges = 150;
      additionalChargesLabel = 'Airport Fee';
      driverAllowance = 250;
      
      console.log(`Using default airport fares: baseFare=${baseFare}, airportFee=${additionalCharges}, extraDistance=${extraDistance}, extraFare=${extraDistanceFare}`);
    }
  } 
  else if (tripType === 'local') {
    // For local packages
    console.log(`Calculating local package fare`);
    
    // Either use explicitly set fare or calculate from package
    if (calculatedFare > 0) {
      baseFare = calculatedFare;
    } else if (selectedCab.localPackageFares) {
      baseFare = selectedCab.localPackageFares.price8hrs80km || 1500;
    } else {
      // Default local package pricing
      if (selectedCab.id === 'sedan') {
        baseFare = 1500;
      } else if (selectedCab.id === 'ertiga') {
        baseFare = 1800;
      } else if (selectedCab.id === 'innova_crysta') {
        baseFare = 2200;
      } else {
        baseFare = 1500;
      }
    }
    
    additionalChargesLabel = '08hrs 80KM Package';
    console.log(`Local package fare: ${baseFare}`);
  } 
  else if (tripType === 'tour') {
    // For tour packages
    console.log(`Calculating tour package fare`);
    
    if (calculatedFare > 0) {
      baseFare = calculatedFare;
    } else {
      baseFare = 3000; // Default tour base fare
    }
    
    additionalCharges = 0; // No additional charges for tour packages
    additionalChargesLabel = 'Tour Package Fee';
  }

  // Calculate final total
  let finalTotal = baseFare + driverAllowance + nightCharges + additionalCharges + extraDistanceFare;
  
  // Make sure we always have a valid final total
  if (finalTotal <= 0 && calculatedFare > 0) {
    finalTotal = calculatedFare;
  } else if (finalTotal <= 0 && selectedCab.price) {
    finalTotal = selectedCab.price;
  } else if (finalTotal <= 0) {
    // Last resort fallback
    finalTotal = tripType === 'airport' ? 500 : tripType === 'local' ? 1500 : 2500;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
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
          <div className="space-y-3">
            {tripType === 'outstation' && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-700">Base fare ({minimumKm} km included)</span>
                  <span className="font-semibold">₹{baseFare.toLocaleString()}</span>
                </div>
                
                <div className="text-gray-600 text-sm ml-1">
                  {tripMode === 'one-way' ? (
                    <>Total distance: {distance} km (300 km minimum fare applied)</>
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
                <span className="text-gray-700">{additionalChargesLabel}</span>
                <span className="font-semibold">₹{baseFare.toLocaleString()}</span>
              </div>
            )}
            
            {(tripType === 'airport' || tripType === 'tour') && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-700">Base fare</span>
                  <span className="font-semibold">₹{baseFare.toLocaleString()}</span>
                </div>
                
                {additionalCharges > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-700">{additionalChargesLabel}</span>
                    <span className="font-semibold">₹{additionalCharges.toLocaleString()}</span>
                  </div>
                )}
                
                {extraDistance > 0 && tripType === 'airport' && (
                  <div className="flex justify-between">
                    <span className="text-gray-700">Extra distance fare ({extraDistance} km × ₹{selectedCab.airportFares?.extraKmCharge || 14})</span>
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
                ? 'Minimum 300 km fare applies for one-way trips. Driver allowance included.'
                : tripType === 'tour'
                ? 'All-inclusive tour package fare includes driver allowance and wait charges.'
                : tripType === 'local'
                ? 'Package includes 8 hours and 80 km. Additional charges apply beyond package limits.'
                : 'Base fare for one-way trip. Additional wait charges may apply.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingSummary;
