
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
          // Include GST for local package
          const priceWithGST = Math.round(localPrice * 1.05);
          setCalculatedFare(priceWithGST);
        } else if (totalPrice > 0) {
          // Fallback to totalPrice if available
          setCalculatedFare(totalPrice);
        } else if (selectedCab.price) {
          // Use the cab's base price as a last resort
          const basePrice = selectedCab.price;
          const priceWithGST = Math.round(basePrice * 1.05);
          setCalculatedFare(priceWithGST);
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
  let effectiveDistance = 0;
  let extraDistance = 0;
  let extraDistanceFare = 0;
  let perKmRate = selectedCab.pricePerKm || 14;
  
  // Calculate fare breakdown based on trip type
  if (tripType === 'outstation') {
    // For outstation trips
    baseFare = Math.max(selectedCab.price || 3000, calculatedFare * 0.7);
    driverAllowance = selectedCab.driverAllowance || 250;
    
    // Calculate effective distance considering driver return for one-way trips
    effectiveDistance = tripMode === 'one-way' ? Math.min(distance * 2, 600) : Math.min(distance, 600);
    
    // Extra distance charges
    const allocatedKm = 300;
    extraDistance = Math.max(0, effectiveDistance - allocatedKm);
    extraDistanceFare = extraDistance * perKmRate;
    
    // Night charges for pickups during night hours
    nightCharges = (pickupDate && (pickupDate.getHours() >= 22 || pickupDate.getHours() <= 5)) 
                  ? Math.round(baseFare * 0.1) 
                  : 0;
    
    // Additional charges for round trips
    if (tripMode === 'round-trip') {
      additionalCharges = Math.round(baseFare * 0.8);
      additionalChargesLabel = 'Return Journey Charge';
    }
  } 
  else if (tripType === 'airport') {
    // For airport transfers, use tiered pricing based on distance
    if (distance <= 10) {
      baseFare = Math.round(calculatedFare * 0.8);
    } else if (distance <= 20) {
      baseFare = Math.round(calculatedFare * 0.75);
    } else {
      baseFare = Math.round(calculatedFare * 0.7);
    }
    
    // Minimum base fare
    if (baseFare < 240) baseFare = 240;
    
    // Airport fee and driver allowance
    additionalCharges = Math.round(calculatedFare * 0.1);
    additionalChargesLabel = 'Airport Fee';
    driverAllowance = Math.round(calculatedFare * 0.1);
    
    // Minimum airport fee and driver allowance
    if (additionalCharges < 30) additionalCharges = 30;
    if (driverAllowance < 30) driverAllowance = 30;
  } 
  else if (tripType === 'local') {
    // For local packages
    baseFare = Math.round(calculatedFare / 1.05); // Remove GST to get base fare
    additionalChargesLabel = '08hrs 80KM Package';
  } 
  else if (tripType === 'tour') {
    // For tour packages
    baseFare = Math.round(calculatedFare * 0.7);
    additionalCharges = Math.round(calculatedFare * 0.3);
    additionalChargesLabel = 'Tour Package Fee';
  }

  // Calculate GST (5%)
  const gst = Math.round(baseFare * 0.05);
  const finalGst = tripType === 'airport' && gst < 15 ? 15 : gst;
  
  // Calculate final total
  let finalTotal = baseFare + finalGst;
  
  if (tripType === 'airport') {
    // Special handling for airport transfers
    const calculatedTotal = baseFare + driverAllowance + additionalCharges + finalGst;
    
    // If there's a large discrepancy, use the provided total price
    if (Math.abs(calculatedTotal - calculatedFare) > 10) {
      finalTotal = calculatedFare;
    } else {
      finalTotal = calculatedTotal;
    }
  } else {
    // For other trip types
    finalTotal = baseFare + driverAllowance + nightCharges + additionalCharges + finalGst;
  }

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
                  <span className="text-gray-700">Base fare ({tripMode === 'one-way' ? '300 km included' : '300 km per day'})</span>
                  <span className="font-semibold">₹{baseFare.toLocaleString()}</span>
                </div>
                
                <div className="text-gray-600 text-sm ml-1">
                  Total distance: {distance} km 
                  {tripMode === 'one-way' && (
                    <span> (effective: {effectiveDistance} km with driver return)</span>
                  )}
                </div>
                
                {extraDistance > 0 && (
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
                
                {tripMode === 'round-trip' && additionalCharges > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-700">{additionalChargesLabel}</span>
                    <span className="font-semibold">₹{additionalCharges.toLocaleString()}</span>
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
                
                <div className="flex justify-between">
                  <span className="text-gray-700">{additionalChargesLabel}</span>
                  <span className="font-semibold">₹{additionalCharges.toLocaleString()}</span>
                </div>
                
                {tripType === 'airport' && (
                  <div className="flex justify-between">
                    <span className="text-gray-700">Driver allowance</span>
                    <span className="font-semibold">₹{driverAllowance.toLocaleString()}</span>
                  </div>
                )}
              </>
            )}
            
            <div className="flex justify-between">
              <span className="text-gray-700">GST (5%)</span>
              <span className="font-semibold">₹{finalGst.toLocaleString()}</span>
            </div>
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
                ? 'Fare includes return journey. Driver allowance included for overnight stays.'
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
