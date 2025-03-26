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
  
  useEffect(() => {
    setCalculatedFare(totalPrice);
    
    const handleLocalFaresUpdated = () => {
      console.log('BookingSummary: Detected local fares updated event');
      if (selectedCab && tripType === 'local') {
        setCalculatedFare(prevFare => {
          return totalPrice;
        });
      }
    };
    
    const handleCabSelectedForLocal = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('BookingSummary: Detected cab-selected-for-local event', customEvent.detail);
      
      if (selectedCab && tripType === 'local' && customEvent.detail) {
        if (customEvent.detail.fare && customEvent.detail.fare > 0) {
          setCalculatedFare(customEvent.detail.fare);
        } else {
          setCalculatedFare(totalPrice);
        }
      }
    };
    
    const handleTripFaresUpdated = () => {
      console.log('BookingSummary: Detected trip-fares-updated event');
      if (selectedCab && tripType === 'outstation') {
        setCalculatedFare(totalPrice);
      }
    };
    
    const handleFareCacheCleared = () => {
      console.log('BookingSummary: Detected fare-cache-cleared event');
      setCalculatedFare(totalPrice);
    };
    
    window.addEventListener('local-fares-updated', handleLocalFaresUpdated);
    window.addEventListener('cab-selected-for-local', handleCabSelectedForLocal);
    window.addEventListener('trip-fares-updated', handleTripFaresUpdated);
    window.addEventListener('fare-cache-cleared', handleFareCacheCleared);
    
    return () => {
      window.removeEventListener('local-fares-updated', handleLocalFaresUpdated);
      window.removeEventListener('cab-selected-for-local', handleCabSelectedForLocal);
      window.removeEventListener('trip-fares-updated', handleTripFaresUpdated);
      window.removeEventListener('fare-cache-cleared', handleFareCacheCleared);
    };
  }, [totalPrice, selectedCab, tripType]);

  useEffect(() => {
    if (selectedCab) {
      if (tripType === 'local' && selectedCab.id) {
        try {
          const hourlyPackageId = '8hrs-80km';
          const localPrice = getLocalPackagePrice(hourlyPackageId, selectedCab.id);
          console.log(`Retrieved local price for ${selectedCab.id}: ${localPrice}`);
          
          const priceWithGST = Math.round(localPrice * 1.05);
          setCalculatedFare(priceWithGST);
        } catch (error) {
          console.error('Error getting local package price:', error);
          setCalculatedFare(totalPrice);
        }
      } else {
        setCalculatedFare(totalPrice);
      }
    }
  }, [selectedCab, tripType, totalPrice]);

  if (!pickupLocation || (!dropLocation && tripType !== 'local' && tripType !== 'tour') || !pickupDate || !selectedCab) {
    return <div className="p-4 bg-gray-100 rounded-lg">Booking information not available</div>;
  }

  let baseFare = 0;
  let driverAllowance = 0;
  let nightCharges = 0;
  let additionalCharges = 0;
  let additionalChargesLabel = '';
  let effectiveDistance = 0;
  let extraDistance = 0;
  let extraDistanceFare = 0;
  let perKmRate = selectedCab.pricePerKm;
  
  if (tripType === 'outstation') {
    baseFare = selectedCab.price;
    driverAllowance = 250;
    
    effectiveDistance = tripMode === 'one-way' ? distance * 2 : distance * 2;
    const allocatedKm = 300;
    extraDistance = Math.max(0, effectiveDistance - allocatedKm);
    extraDistanceFare = extraDistance * perKmRate;
    
    nightCharges = (pickupDate && (pickupDate.getHours() >= 22 || pickupDate.getHours() <= 5)) ? Math.round(baseFare * 0.1) : 0;
    
    if (tripMode === 'round-trip') {
      additionalCharges = Math.round(baseFare * 0.8);
      additionalChargesLabel = 'Return Journey Charge';
    }
  } else if (tripType === 'airport') {
    baseFare = Math.round(calculatedFare * 0.8);
    additionalCharges = Math.round(calculatedFare * 0.1);
    additionalChargesLabel = 'Airport Fee';
    driverAllowance = Math.round(calculatedFare * 0.1);
    
    if (baseFare < 100) baseFare = Math.max(336, Math.round(calculatedFare * 0.8));
    if (additionalCharges < 10) additionalCharges = Math.max(42, Math.round(calculatedFare * 0.1));
    if (driverAllowance < 10) driverAllowance = Math.max(42, Math.round(calculatedFare * 0.1));
  } else if (tripType === 'local') {
    baseFare = Math.round(calculatedFare / 1.05);
    additionalChargesLabel = '08hrs 80KM Package';
  } else if (tripType === 'tour') {
    baseFare = Math.round(calculatedFare * 0.7);
    additionalCharges = Math.round(calculatedFare * 0.3);
    additionalChargesLabel = 'Tour Package Fee';
  }

  const gst = Math.round(baseFare * 0.05);
  const finalGst = tripType === 'airport' && gst < 10 ? Math.max(17, gst) : gst;
  let finalTotal = baseFare + finalGst;
  
  if (tripType === 'airport') {
    if (Math.abs(finalTotal - calculatedFare) > 10) {
      finalTotal = calculatedFare;
    }
  } else {
    finalTotal = baseFare + driverAllowance + nightCharges + additionalCharges + finalGst;
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
                
                <div className="flex justify-between">
                  <span className="text-gray-700">Driver allowance</span>
                  <span className="font-semibold">₹{driverAllowance.toLocaleString()}</span>
                </div>
              </>
            )}
            
            <div className="flex justify-between">
              <span className="text-gray-700">GST (5%)</span>
              <span className="font-semibold">₹{gst.toLocaleString()}</span>
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
