
import React from 'react';
import { CabType } from '@/lib/cabData';
import { Location } from '@/lib/locationData';
import { format } from 'date-fns';
import { MapPin, Calendar, Clock, Car, IndianRupee } from 'lucide-react';

interface BookingSummaryProps {
  pickupLocation: Location | null;
  dropLocation: Location | null;
  pickupDate: Date | undefined;
  returnDate?: Date | undefined;
  selectedCab: CabType | null;
  distance: number;
  totalPrice: number;
  tripType: string;
  tripMode?: string; // Make tripMode optional
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
  tripMode = 'one-way' // Default value for tripMode
}: BookingSummaryProps) => {
  // Ensure we have data to display
  if (!pickupLocation || (!dropLocation && tripType !== 'local' && tripType !== 'tour') || !pickupDate || !selectedCab) {
    return <div className="p-4 bg-gray-100 rounded-lg">Booking information not available</div>;
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
          <h3 className="font-medium text-gray-700 mb-2">Price Details</h3>
          
          <div className="flex items-start gap-2">
            <IndianRupee className="h-5 w-5 text-green-500 mt-0.5" />
            <div>
              <p className="text-sm text-gray-500">TOTAL FARE</p>
              <p className="font-bold text-xl">₹{totalPrice.toLocaleString()}</p>
            </div>
          </div>
          
          <p className="text-xs text-gray-500 mt-2">
            {tripType === 'outstation' && tripMode === 'round-trip'
              ? 'Includes return journey fare'
              : tripType === 'tour'
              ? 'All-inclusive tour package fare'
              : 'Base fare for one-way trip'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default BookingSummary;
