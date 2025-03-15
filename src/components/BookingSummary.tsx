import { useState, useEffect } from 'react';
import { CabType, formatPrice, TripType, TripMode, extraCharges, oneWayRates } from '@/lib/cabData';
import { Location, isVizagLocation } from '@/lib/locationData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tag, X, CheckCircle, Calendar, MapPin, Users, ArrowRight, ArrowLeftRight } from 'lucide-react';
import { format, differenceInCalendarDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface PromoCode {
  code: string;
  discount: number;
  validUntil: Date;
}

interface BookingSummaryProps {
  pickupLocation: Location | null;
  dropLocation: Location | null;
  pickupDate: Date | undefined;
  returnDate?: Date | null;
  selectedCab: CabType | null;
  distance: number;
  totalPrice: number;
  tripType?: TripType;
  tripMode?: TripMode;
}

export function BookingSummary({
  pickupLocation,
  dropLocation,
  pickupDate,
  returnDate,
  selectedCab,
  distance,
  totalPrice,
  tripType = 'outstation',
  tripMode = 'one-way',
}: BookingSummaryProps) {
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);
  const navigate = useNavigate();
  const [bookingId, setBookingId] = useState<string>('');

  useEffect(() => {
    const generateBookingId = () => {
      const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let result = 'BK';
      for (let i = 0; i < 8; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      return result;
    };
    
    setBookingId(generateBookingId());
  }, []);

  if (!pickupLocation || !pickupDate || !selectedCab) {
    return null;
  }

  const days = tripMode === "round-trip" && returnDate
    ? Math.max(1, differenceInCalendarDays(returnDate, pickupDate) + 1)
    : 1;

  const renderFareBreakdown = () => {
    if (tripType === 'airport') {
      return (
        <>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Base fare (airport transfer)</span>
            <span className="text-gray-800">{formatPrice(totalPrice)}</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-gray-600">Distance: {distance} km</span>
            <span className="text-gray-600"></span>
          </div>
          <div className="text-xs text-blue-600 mt-1">
            Note: Toll & parking charges extra
          </div>
        </>
      );
    }
    
    if (tripType === 'local') {
      const cabId = selectedCab.id as keyof typeof extraCharges;
      const extraRates = extraCharges[cabId];
      
      return (
        <>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Package base fare</span>
            <span className="text-gray-800">{formatPrice(totalPrice)}</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-gray-600">Including {distance} km</span>
            <span className="text-gray-600"></span>
          </div>
          <div className="text-xs text-blue-600 mt-1">
            Extra charges: ₹{extraRates?.perHour}/hr, ₹{extraRates?.perKm}/km
          </div>
        </>
      );
    }
    
    if (tripType === 'outstation') {
      const allocatedKm = 300;
      const effectiveDistance = tripMode === "one-way" ? distance * 2 : distance * 2;
      const extraKm = Math.max(effectiveDistance - (allocatedKm * 2), 0);

      let baseRate = 0, perKmRate = 0, driverAllowance = 250, nightHaltCharge = 0;

      switch (selectedCab.name.toLowerCase()) {
        case "sedan":
          baseRate = 4200;
          perKmRate = 14;
          nightHaltCharge = 700;
          break;
        case "ertiga":
          baseRate = 5400;
          perKmRate = 18;
          nightHaltCharge = 1000;
          break;
        case "innova crysta":
          baseRate = 6000;
          perKmRate = 20;
          nightHaltCharge = 1000;
          break;
      }

      const oneWayRate = selectedCab ? 
        oneWayRates[selectedCab.id as keyof typeof oneWayRates] || 13 : 13;

      const totalBaseFare = tripMode === "one-way" ? baseRate : days * baseRate;
      const totalDistanceFare = extraKm * (tripMode === "one-way" ? oneWayRate : perKmRate);
      const totalNightHalt = tripMode === "round-trip" ? (days - 1) * nightHaltCharge : 0;
      
      return (
        <>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">
              Base fare {tripMode === "round-trip" ? `(${days} days, ${allocatedKm} km)` : `(${allocatedKm*2} km included)`}
            </span>
            <span className="text-gray-800">₹{totalBaseFare.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-gray-600">
              {tripMode === "one-way" 
                ? `Distance: ${distance} km (${effectiveDistance} km for fare)`
                : `Distance: ${effectiveDistance} km`}
            </span>
            <span className="text-gray-600"></span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-gray-600">
              Extra distance fare ({extraKm} km × ₹{tripMode === "one-way" ? oneWayRate : perKmRate})
            </span>
            <span className="text-gray-800">₹{totalDistanceFare.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-gray-600">Driver allowance</span>
            <span className="text-gray-800">₹{driverAllowance}</span>
          </div>
          {tripMode === 'round-trip' && (
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-600">Night halt charges</span>
              <span className="text-gray-800">₹{totalNightHalt.toLocaleString('en-IN')}</span>
            </div>
          )}
        </>
      );
    }
    
    return null;
  };

  return (
    <div id="booking-summary" className="bg-white rounded-lg shadow-card border border-gray-200 overflow-hidden">
      <div className="p-5 border-b border-gray-200">
        <h3 className="text-xl font-semibold text-gray-800">Booking Summary</h3>
        <div className="mt-1 text-sm text-blue-600 font-medium flex items-center">
          <div className="flex items-center mr-2">
            {bookingId && <span className="text-xs bg-blue-50 px-2 py-1 rounded-md">#{bookingId}</span>}
          </div>
          {tripType === 'outstation' && (
            tripMode === 'one-way' ? (
              <><ArrowRight size={14} className="mr-1" /> One Way Trip</>
            ) : (
              <><ArrowLeftRight size={14} className="mr-1" /> Round Trip</>
            )
          )}
          {tripType === 'airport' && (
            <><ArrowRight size={14} className="mr-1" /> Airport Transfer</>
          )}
          {tripType === 'local' && (
            <><ArrowRight size={14} className="mr-1" /> Local Hourly Rental</>
          )}
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div className="flex items-start space-x-3">
          <MapPin className="text-blue-500 mt-1 flex-shrink-0" size={18} />
          <div>
            <p className="text-xs text-gray-500">PICKUP</p>
            <p className="font-medium text-gray-800">{pickupLocation.name}</p>
          </div>
        </div>
        
        {dropLocation && (
          <div className="flex items-start space-x-3">
            <MapPin className="text-blue-500 mt-1 flex-shrink-0" size={18} />
            <div>
              <p className="text-xs text-gray-500">DROP-OFF</p>
              <p className="font-medium text-gray-800">{dropLocation.name}</p>
            </div>
          </div>
        )}

        <div className="flex items-start space-x-3">
          <Calendar className="text-blue-500 mt-1 flex-shrink-0" size={18} />
          <div>
            <p className="text-xs text-gray-500">PICKUP DATE & TIME</p>
            <p className="font-medium text-gray-800">{format(pickupDate, 'EEEE, MMMM d, yyyy')}</p>
            <p className="text-xs text-gray-600">{format(pickupDate, 'h:mm a')}</p>
          </div>
        </div>

        {tripMode === "round-trip" && returnDate && (
          <div className="flex items-start space-x-3">
            <Calendar className="text-blue-500 mt-1 flex-shrink-0" size={18} />
            <div>
              <p className="text-xs text-gray-500">RETURN DATE & TIME</p>
              <p className="font-medium text-gray-800">{format(returnDate, 'EEEE, MMMM d, yyyy')}</p>
              <p className="text-xs text-gray-600">{format(returnDate, 'h:mm a')}</p>
            </div>
          </div>
        )}
         <div className="flex items-start space-x-3">
          <Users className="text-blue-500 mt-1 flex-shrink-0" size={18} />
          <div>
            <p className="text-xs text-gray-500">CAB TYPE</p>
            <p className="font-medium text-gray-800">{selectedCab.name}</p>
            <p className="text-xs text-gray-600">{selectedCab.capacity} persons • {selectedCab.luggage} bags</p>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4 mt-4">
          {renderFareBreakdown()}
        </div>

        <div className="border-t border-gray-200 pt-4 flex justify-between items-center">
          <span className="font-semibold text-gray-800">Total Amount</span>
          <span className="font-semibold text-xl text-gray-800">{formatPrice(totalPrice)}</span>
        </div>
      </div>
    </div>
  );
}
