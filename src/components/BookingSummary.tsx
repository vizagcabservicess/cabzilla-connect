
import { useState, useEffect } from 'react';
import { Location } from '@/lib/locationData';
import { CabType } from '@/types/cab';
import { TripType } from '@/lib/tripTypes';
import { formatPrice } from '@/lib/cabData';
import { format } from 'date-fns';
import { Car, MapPin, Calendar } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

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
  // Ensure we have data to display
  if (!pickupLocation || (!dropLocation && tripType !== 'local' && tripType !== 'tour') || !pickupDate || !selectedCab) {
    return <div className="p-4 bg-gray-100 rounded-lg">Booking information not available</div>;
  }

  // Calculate fare components based on trip type
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
    // Base fare is the cab's base price
    baseFare = selectedCab.price;
    driverAllowance = 250; // Default driver allowance
    
    // Calculate effective distance (with driver return for one-way)
    effectiveDistance = tripMode === 'one-way' ? distance * 2 : distance * 2;
    const allocatedKm = 300; // Base kilometers included
    extraDistance = Math.max(0, effectiveDistance - allocatedKm);
    extraDistanceFare = extraDistance * perKmRate;
    
    nightCharges = (pickupDate && (pickupDate.getHours() >= 22 || pickupDate.getHours() <= 5)) ? Math.round(baseFare * 0.1) : 0;
    
    if (tripMode === 'round-trip') {
      additionalCharges = Math.round(baseFare * 0.8); // 80% of base fare for return journey
      additionalChargesLabel = 'Return Journey Charge';
    }
  } else if (tripType === 'airport') {
    // For airport transfers, use a simplified structure
    baseFare = Math.round(totalPrice * 0.8); // 80% of total as base fare
    additionalCharges = Math.round(totalPrice * 0.1); // 10% as airport fee
    additionalChargesLabel = 'Airport Fee';
    driverAllowance = Math.round(totalPrice * 0.1); // 10% as driver allowance
  } else if (tripType === 'local') {
    // For local trips, show the package details
    baseFare = totalPrice;
    additionalChargesLabel = '08hrs 80KM Package';
    // No extra charges breakdown for local packages
  } else if (tripType === 'tour') {
    baseFare = Math.round(totalPrice * 0.7);
    additionalCharges = Math.round(totalPrice * 0.3);
    additionalChargesLabel = 'Tour Package Fee';
  }

  const gst = Math.round(totalPrice * 0.05); // 5% GST

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
          {/* Show fare breakdown similar to image */}
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
            
            {/* Add GST for all trip types */}
            <div className="flex justify-between">
              <span className="text-gray-700">GST (5%)</span>
              <span className="font-semibold">₹{gst.toLocaleString()}</span>
            </div>
          </div>
          
          <div className="border-t mt-4 pt-4">
            <div className="flex justify-between text-xl font-bold">
              <span>Total Amount</span>
              <span>₹{totalPrice.toLocaleString()}</span>
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
