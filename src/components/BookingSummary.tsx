
import React, { useState, useEffect } from 'react';
import { CabType } from '@/types/cab';
import { TripType } from '@/types/trip';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Calendar, MapPin, Users, Clock, IndianRupee } from 'lucide-react';
import { format } from 'date-fns';
import { calculateOutstationRoundTripFare } from '@/lib/fareCalculationService';
import { getOutstationFaresForVehicle } from '@/services/fareService';

interface BookingSummaryProps {
  selectedCab: CabType;
  pickupDate?: Date;
  returnDate?: Date;
  tripType: TripType | string;
  tripMode?: string;
  totalPrice: number;
  hourlyPackage?: string;
  distance?: number;
  pickupLocation: any;
  dropLocation: any;
  onFinalTotalChange?: (newTotal: number) => void;
}

export function BookingSummary({
  selectedCab,
  pickupDate,
  returnDate,
  tripType,
  tripMode = 'one-way',
  totalPrice,
  hourlyPackage,
  distance = 0,
  pickupLocation,
  dropLocation,
  onFinalTotalChange
}: BookingSummaryProps) {
  const [fareBreakdown, setFareBreakdown] = useState<any>(null);
  const [finalTotal, setFinalTotal] = useState(totalPrice);

  useEffect(() => {
    async function calculateRoundTripFare() {
      if (
        tripType === 'outstation' &&
        (tripMode === 'round' || tripMode === 'round-trip') &&
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
          setFinalTotal(fareResult.totalFare);
          
          // Call the callback to update parent component
          if (onFinalTotalChange) {
            onFinalTotalChange(fareResult.totalFare);
          }
        } catch (error) {
          console.error('Error calculating round trip fare:', error);
          setFinalTotal(totalPrice);
        }
      } else {
        setFinalTotal(totalPrice);
      }
    }

    calculateRoundTripFare();
  }, [selectedCab.id, pickupDate, returnDate, distance, tripType, tripMode, totalPrice, onFinalTotalChange]);

  const displayTotal = tripType === 'outstation' && (tripMode === 'round' || tripMode === 'round-trip') && fareBreakdown
    ? fareBreakdown.totalFare
    : totalPrice;

  return (
    <Card className="w-full max-w-md mx-auto" id="booking-summary">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IndianRupee className="h-5 w-5" />
          Booking Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Vehicle Details */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
            {selectedCab.image ? (
              <img src={selectedCab.image} alt={selectedCab.name} className="w-full h-full object-contain rounded-lg" />
            ) : (
              <span className="text-lg font-bold text-gray-600">{selectedCab.name.charAt(0)}</span>
            )}
          </div>
          <div>
            <h3 className="font-semibold">{selectedCab.name}</h3>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users className="h-4 w-4" />
              <span>{selectedCab.capacity || 4} Seats</span>
            </div>
          </div>
        </div>

        {/* Trip Details */}
        <div className="space-y-3">
          {pickupDate && (
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-sm font-medium">Pickup</p>
                <p className="text-sm text-gray-600">{format(pickupDate, 'EEE, MMM dd, yyyy - h:mm a')}</p>
              </div>
            </div>
          )}

          {returnDate && (
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-sm font-medium">Return</p>
                <p className="text-sm text-gray-600">{format(returnDate, 'EEE, MMM dd, yyyy - h:mm a')}</p>
              </div>
            </div>
          )}

          {hourlyPackage && (
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-sm font-medium">Package</p>
                <p className="text-sm text-gray-600">{hourlyPackage}</p>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Fare Breakdown for Outstation Round Trip */}
        {tripType === 'outstation' && (tripMode === 'round' || tripMode === 'round-trip') && fareBreakdown && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Fare Breakdown</h4>
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

        {/* Price Summary */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold">Total Price</span>
            <span className="text-2xl font-bold text-green-600">₹{displayTotal.toLocaleString()}</span>
          </div>
          <p className="text-xs text-gray-500">*All taxes included</p>
        </div>
      </CardContent>
    </Card>
  );
}
