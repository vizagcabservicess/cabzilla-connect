
import React from 'react';
import { formatPrice } from '@/lib';
import { useBookingContext } from '@/context/BookingContext';
import { useFareDetails } from '@/hooks/useFareDetails';
import { Skeleton } from "@/components/ui/skeleton";

interface BookingSummaryProps {
  totalPrice: number;
  pickupLocation?: any;
  dropLocation?: any;
  pickupDate?: Date;
  returnDate?: Date | null;
  selectedCab?: any;
  distance?: number;
  tripType?: string;
  tripMode?: string;
  hourlyPackage?: string;
}

const BookingSummary = ({
  totalPrice,
  pickupLocation,
  dropLocation,
  pickupDate,
  returnDate,
  selectedCab,
  distance,
  tripType = "outstation",
  tripMode,
  hourlyPackage
}: BookingSummaryProps) => {
  // Attempt to use context, but don't throw an error if not available
  let contextData;
  try {
    contextData = useBookingContext();
  } catch (error) {
    // Context not available, will use only props
    contextData = null;
  }
  
  // Use props if provided, otherwise fall back to context if available
  // Must use .id, not .place_id, for the Location type
  const pickupLocationId = pickupLocation?.id || (contextData?.pickupLocation?.id);
  const dropLocationId = dropLocation?.id || (contextData?.dropoffLocation?.id);
  const cabId = selectedCab?.id || (contextData?.selectedCab?.id);
  const currentTripType = tripType || (contextData?.tripType || 'outstation');
  const selectedDateTime = pickupDate || (contextData?.selectedDateTime);
  
  const { fareData, isLoading } = useFareDetails(pickupLocationId, dropLocationId, selectedCab || (contextData?.selectedCab), currentTripType, selectedDateTime);

  if (isLoading) {
    return <div className="p-4 bg-gray-100 rounded-lg"><Skeleton className="w-full h-5"/></div>;
  }

  if (!fareData) {
    return <div className="p-4 bg-gray-100 rounded-lg">Booking information not available</div>;
  }

  const { baseFare, driverAllowance, extraDistanceFare, nightCharges, tollCharges, stateTaxes } = fareData;

  // OUTSTATION: Handle detailed total by summing all extra applicable fields.
  let finalTotal = totalPrice;
  if (currentTripType === "outstation") {
    finalTotal =
      (baseFare || 0) +
      (driverAllowance || 0) +
      (extraDistanceFare || 0) +
      (nightCharges || 0) +
      (tollCharges || 0) +
      (stateTaxes || 0);
  } else {
    finalTotal = fareData?.totalPrice || totalPrice;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 relative">
      <h2 className="text-xl font-semibold mb-4">Booking Summary</h2>
      <div className="space-y-2 mb-6">
        {/* Show breakdown for Outstation */}
        {currentTripType === "outstation" && (
          <>
            <div className="flex justify-between">
              <span>Base Fare</span>
              <span>
                {baseFare ? formatPrice(baseFare) : "--"}
              </span>
            </div>
            {typeof driverAllowance === "number" && (
              <div className="flex justify-between">
                <span>Driver Allowance</span>
                <span>{formatPrice(driverAllowance)}</span>
              </div>
            )}
            {typeof extraDistanceFare === "number" && extraDistanceFare > 0 && (
              <div className="flex justify-between">
                <span>Extra Distance Fare</span>
                <span>{formatPrice(extraDistanceFare)}</span>
              </div>
            )}
            {typeof nightCharges === "number" && nightCharges > 0 && (
              <div className="flex justify-between">
                <span>Night Charges</span>
                <span>{formatPrice(nightCharges)}</span>
              </div>
            )}
            {typeof tollCharges === "number" && tollCharges > 0 && (
              <div className="flex justify-between">
                <span>Toll Charges</span>
                <span>{formatPrice(tollCharges)}</span>
              </div>
            )}
            {typeof stateTaxes === "number" && stateTaxes > 0 && (
              <div className="flex justify-between">
                <span>State Taxes</span>
                <span>{formatPrice(stateTaxes)}</span>
              </div>
            )}
          </>
        )}
        {/* Show breakdown for Local and Airport */}
        {currentTripType !== "outstation" && fareData && (
          <>
            {fareData.baseFare && (
              <div className="flex justify-between">
                <span>Base Fare</span>
                <span>{formatPrice(fareData.baseFare)}</span>
              </div>
            )}
            {fareData.waitingCharge && (
              <div className="flex justify-between">
                <span>Waiting Charges</span>
                <span>{formatPrice(fareData.waitingCharge)}</span>
              </div>
            )}
            {fareData.distanceFare && (
              <div className="flex justify-between">
                <span>Distance Fare</span>
                <span>{formatPrice(fareData.distanceFare)}</span>
              </div>
            )}
          </>
        )}
      </div>
      
      <div className="flex justify-between font-bold text-lg border-t pt-4">
        <span>Total Amount</span>
        <span>{formatPrice(finalTotal)}</span>
      </div>
    </div>
  );
};

export default BookingSummary;

