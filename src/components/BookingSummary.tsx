
import React from 'react';
import { CabType } from '@/lib/cabData';
import { Location } from '@/lib/locationData';
import { format } from 'date-fns';
import { MapPin, Calendar, Clock, Car, IndianRupee, Info } from 'lucide-react';

interface BookingSummaryProps {
  pickupLocation: Location | null;
  dropLocation: Location | null;
  pickupDate: Date | undefined;
  returnDate?: Date | undefined;
  selectedCab: CabType | null;
  distance: number;
  totalPrice: number;
  tripType: string;
  tripMode?: string;
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

  // Calculate fare components
  const baseFare = selectedCab ? Math.round(distance * selectedCab.perKmRate) : 0;
  const driverAllowance = tripType === 'outstation' ? (selectedCab?.driverAllowance || 0) : 0;
  const nightCharges = (pickupDate && pickupDate.getHours() >= 22 || pickupDate?.getHours() <= 5) ? Math.round(baseFare * 0.1) : 0;
  const gst = Math.round(totalPrice * 0.05); // 5% GST
  
  // Additional charges based on trip type
  let additionalCharges = 0;
  let additionalChargesLabel = '';
  
  if (tripType === 'outstation' && tripMode === 'round-trip') {
    additionalCharges = Math.round(baseFare * 0.8); // 80% of base fare for return journey
    additionalChargesLabel = 'Return Journey Charge';
  } else if (tripType === 'airport') {
    additionalCharges = 100; // Airport fee
    additionalChargesLabel = 'Airport Fee';
  } else if (tripType === 'tour') {
    additionalCharges = 500; // Tour package fee
    additionalChargesLabel = 'Tour Package Fee';
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold mb-4">Booking Summary</h2>
      
      <div className="space-y-4">
        <div className="border-b pb-4">
          <h3 className="font-medium text-gray-700 mb-2">Trip Details</h3>
          <div className="flex items-start gap-2">
            <MapPin className="h-5 w-5 text-blue-500 mt-0.5" />
            <div>
              <p className="text-sm text-gray-500">PICKUP LOCATION</p>
              <p className="font-medium">{pickupLocation.address || pickupLocation.name}</p>
            </div>
          </div>
          
          {tripType !== 'local' && tripType !== 'tour' && dropLocation && (
            <div className="flex items-start gap-2 mt-3">
              <MapPin className="h-5 w-5 text-red-500 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">DROP LOCATION</p>
                <p className="font-medium">{dropLocation.address || dropLocation.name}</p>
              </div>
            </div>
          )}
          
          <div className="flex items-start gap-2 mt-3">
            <Calendar className="h-5 w-5 text-green-500 mt-0.5" />
            <div>
              <p className="text-sm text-gray-500">PICKUP DATE & TIME</p>
              <p className="font-medium">
                {pickupDate ? format(pickupDate, 'MM/dd/yyyy, hh:mm a') : 'Not specified'}
              </p>
            </div>
          </div>
          
          {tripMode === 'round-trip' && returnDate && (
            <div className="flex items-start gap-2 mt-3">
              <Calendar className="h-5 w-5 text-orange-500 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">RETURN DATE & TIME</p>
                <p className="font-medium">
                  {format(returnDate, 'MM/dd/yyyy, hh:mm a')}
                </p>
              </div>
            </div>
          )}
        </div>
        
        <div className="border-b pb-4">
          <h3 className="font-medium text-gray-700 mb-2">Cab Details</h3>
          
          <div className="flex items-start gap-2">
            <Car className="h-5 w-5 text-blue-500 mt-0.5" />
            <div>
              <p className="text-sm text-gray-500">CAB TYPE</p>
              <p className="font-medium">{selectedCab.name}</p>
            </div>
          </div>
          
          <div className="flex items-start gap-2 mt-3">
            <Clock className="h-5 w-5 text-purple-500 mt-0.5" />
            <div>
              <p className="text-sm text-gray-500">ESTIMATED DISTANCE</p>
              <p className="font-medium">{distance} km</p>
            </div>
          </div>
        </div>
        
        <div>
          <h3 className="font-medium text-gray-700 mb-2">Fare Breakup</h3>
          
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Base Fare ({distance} km × ₹{selectedCab.perKmRate}/km)</span>
              <span>₹{baseFare}</span>
            </div>
            
            {driverAllowance > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Driver Allowance</span>
                <span>₹{driverAllowance}</span>
              </div>
            )}
            
            {nightCharges > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Night Charges (10%)</span>
                <span>₹{nightCharges}</span>
              </div>
            )}
            
            {additionalCharges > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{additionalChargesLabel}</span>
                <span>₹{additionalCharges}</span>
              </div>
            )}
            
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">GST (5%)</span>
              <span>₹{gst}</span>
            </div>
            
            <div className="border-t pt-2 mt-2 flex justify-between font-bold">
              <span>Total Fare</span>
              <span className="text-xl">₹{totalPrice.toLocaleString()}</span>
            </div>
          </div>
          
          <div className="bg-blue-50 p-3 rounded-md flex items-start gap-2 text-sm text-gray-700">
            <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <p>
              {tripType === 'outstation' && tripMode === 'round-trip'
                ? 'Fare includes return journey. Driver allowance included for overnight stays.'
                : tripType === 'tour'
                ? 'All-inclusive tour package fare includes driver allowance and wait charges.'
                : tripType === 'local'
                ? 'Fare for local travel within city limits. Includes wait time as per package.'
                : 'Base fare for one-way trip. Additional wait charges may apply.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingSummary;
