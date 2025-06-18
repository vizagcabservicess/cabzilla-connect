
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Calendar, MapPin, Clock, Users, Car } from 'lucide-react';
import { CabType } from '@/types/cab';
import { format } from 'date-fns';
import { calculateOutstationRoundTripFare } from '@/lib/fareCalculationService';
import { getOutstationFaresForVehicle } from '@/services/fareService';

interface BookingSummaryProps {
  selectedCab: CabType;
  pickupDate?: Date;
  returnDate?: Date;
  tripType: string;
  tripMode?: string;
  totalPrice: number;
  hourlyPackage?: string;
  distance?: number;
  pickupLocation: any;
  dropLocation: any;
  onFinalTotalChange?: (total: number) => void;
}

export const BookingSummary: React.FC<BookingSummaryProps> = ({
  selectedCab,
  pickupDate,
  returnDate,
  tripType,
  tripMode,
  totalPrice,
  hourlyPackage,
  distance = 0,
  pickupLocation,
  dropLocation,
  onFinalTotalChange
}) => {
  const [fareBreakdown, setFareBreakdown] = useState<any>(null);
  const [calculatedTotal, setCalculatedTotal] = useState<number>(totalPrice);

  useEffect(() => {
    async function calculateRoundTripFare() {
      // Apply fare calculation only for outstation round trips
      if (
        tripType === 'outstation' &&
        (tripMode === 'round-trip') &&
        pickupDate &&
        returnDate &&
        distance > 0
      ) {
        try {
          const outstationFares = await getOutstationFaresForVehicle(selectedCab.id);
          const perKmRate = outstationFares.pricePerKm;
          const nightAllowancePerNight = outstationFares.nightHaltCharge;
          const driverAllowancePerDay = outstationFares.driverAllowance;
          const actualDistance = distance * 2;
          
          const fareResult = calculateOutstationRoundTripFare({
            pickupDate,
            returnDate,
            actualDistance,
            perKmRate,
            nightAllowancePerNight,
            driverAllowancePerDay
          });
          
          setFareBreakdown(fareResult);
          setCalculatedTotal(fareResult.totalFare);
          
          // Update the Book Now button fare only for outstation round trips
          onFinalTotalChange?.(fareResult.totalFare);
        } catch (error) {
          console.error('Error calculating round trip fare:', error);
          setCalculatedTotal(totalPrice);
        }
      } else {
        // For all other trip types, use the original total price
        setCalculatedTotal(totalPrice);
      }
    }
    
    calculateRoundTripFare();
  }, [selectedCab.id, pickupDate, returnDate, distance, tripType, tripMode, totalPrice, onFinalTotalChange]);

  const displayTotal = tripType === 'outstation' && tripMode === 'round-trip' 
    ? calculatedTotal 
    : totalPrice;

  return (
    <div id="booking-summary" className="sticky top-8">
      <Card className="shadow-lg border-2">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-bold text-gray-900">Booking Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Vehicle Info */}
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
            <Car className="h-5 w-5 text-blue-600" />
            <div>
              <h3 className="font-semibold text-gray-900">{selectedCab.name}</h3>
              <p className="text-sm text-gray-600">{selectedCab.capacity || 4} seats</p>
            </div>
          </div>

          {/* Trip Details */}
          <div className="space-y-3">
            {pickupDate && (
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium">Pickup Date</p>
                  <p className="text-sm text-gray-600">{format(pickupDate, 'EEE, MMM dd, yyyy - h:mm a')}</p>
                </div>
              </div>
            )}
            
            {returnDate && (
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium">Return Date</p>
                  <p className="text-sm text-gray-600">{format(returnDate, 'EEE, MMM dd, yyyy - h:mm a')}</p>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Fare Breakdown for Outstation Round Trip */}
          {tripType === 'outstation' && tripMode === 'round-trip' && fareBreakdown && (
            <div className="space-y-2">
              <h4 className="font-semibold text-gray-900">Fare Breakdown</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Calendar Days</span>
                  <span>{fareBreakdown.calendarDays}</span>
                </div>
                <div className="flex justify-between">
                  <span>Included KM</span>
                  <span>{fareBreakdown.includedKM}</span>
                </div>
                <div className="flex justify-between">
                  <span>Actual KM (2-way)</span>
                  <span>{distance * 2}</span>
                </div>
                <div className="flex justify-between">
                  <span>Extra KM</span>
                  <span>{fareBreakdown.extraDistance}</span>
                </div>
                <div className="flex justify-between">
                  <span>Extra KM Charges</span>
                  <span>₹{fareBreakdown.extraDistanceCharges}</span>
                </div>
                <div className="flex justify-between">
                  <span>Base Fare</span>
                  <span>₹{fareBreakdown.baseFare}</span>
                </div>
                <div className="flex justify-between">
                  <span>Night Allowance</span>
                  <span>₹{fareBreakdown.nightAllowance}</span>
                </div>
                <div className="flex justify-between">
                  <span>Driver Allowance</span>
                  <span>₹{fareBreakdown.driverAllowance}</span>
                </div>
              </div>
              <Separator />
            </div>
          )}

          {/* Basic fare breakdown for other trip types */}
          {!(tripType === 'outstation' && tripMode === 'round-trip') && (
            <div className="space-y-2">
              <div className="flex justify-between text-lg font-semibold">
                <span>Base fare</span>
                <span>₹{totalPrice.toLocaleString()}</span>
              </div>
              {hourlyPackage && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Package</span>
                  <span>{hourlyPackage}</span>
                </div>
              )}
            </div>
          )}

          {/* Total Price */}
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-900">Total Price</span>
              <span className="text-2xl font-bold text-green-600">
                ₹{displayTotal.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="text-xs text-gray-500 text-center">
            *All prices are inclusive of taxes
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
