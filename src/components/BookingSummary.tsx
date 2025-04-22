import { useState, useEffect, useRef } from 'react';
import { Location } from '@/lib/locationData';
import { CabType } from '@/types/cab';
import { TripType } from '@/lib/tripTypes';
import { formatPrice } from '@/lib/cabData';
import { format } from 'date-fns';
import { Car, MapPin, Calendar, User, Info } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { getLocalPackagePrice } from '@/lib/packageData';
import { calculateFare } from '@/lib/fareCalculationService';
import { getOutstationFaresForVehicle, getLocalFaresForVehicle, getAirportFaresForVehicle } from '@/services/fareService';
import { useFare } from '../hooks/useFare';
import { normalizeVehicleId } from '@/utils/safeStringUtils';

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
  hourlyPackage: string;
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
  tripMode = 'one-way',
  hourlyPackage
}: BookingSummaryProps) => {
  console.log('BookingSummary: Rendering with params:', {
    cabType: selectedCab?.name,
    distance,
    tripType,
    tripMode,
    hourlyPackage,
    totalPrice
  });

  const { fareData, isLoading } = useFare(
    selectedCab?.id || '',
    tripType,
    distance,
    tripType === 'local' ? hourlyPackage : undefined
  );

  const [calculatedFare, setCalculatedFare] = useState<number>(0);
  const [fareComponents, setFareComponents] = useState({
    baseFare: 0,
    driverAllowance: 250,
    nightCharges: 0,
    extraDistance: 0,
    extraDistanceFare: 0
  });

  useEffect(() => {
    if (!selectedCab) return;

    const calculateFareComponents = async () => {
      try {
        const outstationFares = await getOutstationFaresForVehicle(normalizeVehicleId(selectedCab.id));
        console.log('Retrieved outstation fares:', outstationFares);

        // Base fare from outstation_fares table
        const baseFare = outstationFares.basePrice || 5400; // Default to 5400 if not found
        
        // Calculate extra distance (over 300km)
        const effectiveDistance = tripMode === 'one-way' ? distance * 2 : distance;
        const extraKm = Math.max(0, effectiveDistance - 300);
        const pricePerKm = outstationFares.pricePerKm || 18;
        const extraDistanceFare = extraKm * pricePerKm;

        // Driver allowance
        const driverAllowance = outstationFares.driverAllowance || 250;

        // Night charges if pickup is between 10 PM and 5 AM
        let nightCharges = 0;
        if (pickupDate && (pickupDate.getHours() >= 22 || pickupDate.getHours() <= 5)) {
          nightCharges = Math.round(baseFare * 0.1);
        }

        // Calculate total
        const total = baseFare + extraDistanceFare + driverAllowance + nightCharges;

        console.log('Fare calculation components:', {
          baseFare,
          extraKm,
          pricePerKm,
          extraDistanceFare,
          driverAllowance,
          nightCharges,
          total
        });

        setFareComponents({
          baseFare,
          driverAllowance,
          nightCharges,
          extraDistance: extraKm,
          extraDistanceFare
        });

        setCalculatedFare(total);

        // Emit fare update event
        window.dispatchEvent(new CustomEvent('fare-update', {
          detail: {
            cabId: selectedCab.id,
            tripType,
            components: {
              baseFare,
              extraDistanceFare,
              driverAllowance,
              nightCharges
            },
            total,
            timestamp: Date.now()
          }
        }));

      } catch (error) {
        console.error('Error calculating fare components:', error);
      }
    };

    calculateFareComponents();
  }, [selectedCab, distance, tripMode, tripType, pickupDate]);

  if (!pickupLocation || (!dropLocation && tripType !== 'local' && tripType !== 'tour') || !pickupDate || !selectedCab) {
    return <div className="p-4 bg-gray-100 rounded-lg">Booking information not available</div>;
  }

  const finalTotal = fareData?.totalPrice || totalPrice;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 relative">
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
          <div className={`space-y-3 transition-opacity duration-300 ${isRefreshing || showDetailsLoading ? 'opacity-50' : 'opacity-100'}`}>
            {tripType === 'outstation' && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-700">Base fare (300 km included)</span>
                  <span className="font-semibold">₹{fareComponents.baseFare.toLocaleString()}</span>
                </div>

                {fareComponents.extraDistance > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-700">
                      Extra distance ({fareComponents.extraDistance} km × ₹18)
                    </span>
                    <span className="font-semibold">₹{fareComponents.extraDistanceFare.toLocaleString()}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-gray-700">Driver allowance</span>
                  <span className="font-semibold">₹{fareComponents.driverAllowance.toLocaleString()}</span>
                </div>

                {fareComponents.nightCharges > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-700">Night charges</span>
                    <span className="font-semibold">₹{fareComponents.nightCharges.toLocaleString()}</span>
                  </div>
                )}
              </>
            )}

            {tripType === 'local' && (
              <div className="flex justify-between">
                <span className="text-gray-700">
                  {fareData?.breakdown?.packageLabel || '8 Hours Package'} 
                  <span className="block text-sm text-gray-500">
                    Includes {fareData?.breakdown?.packageLabel?.split('-')[1] || '80 km'} and {fareData?.breakdown?.packageLabel?.split('-')[0] || '8 hrs'}
                  </span>
                </span>
                <span className="font-semibold">₹{finalTotal.toLocaleString()}</span>
              </div>
            )}

            {(tripType === 'airport' || tripType === 'tour') && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-700">Base fare</span>
                  <span className="font-semibold">₹{fareComponents.baseFare.toLocaleString()}</span>
                </div>

                {fareComponents.extraDistance > 0 && tripType === 'airport' && (
                  <div className="flex justify-between">
                    <span className="text-gray-700">Extra distance fare ({fareComponents.extraDistance} km × ₹18)</span>
                    <span className="font-semibold">₹{fareComponents.extraDistanceFare.toLocaleString()}</span>
                  </div>
                )}

                {tripType === 'airport' && (
                  <div className="flex justify-between">
                    <span className="text-gray-700">Driver allowance</span>
                    <span className="font-semibold">₹{fareComponents.driverAllowance.toLocaleString()}</span>
                  </div>
                )}
              </>
            )}

            <Separator />

            <div className="flex justify-between text-lg font-bold pt-2">
              <span>Total Amount</span>
              <span>₹{calculatedFare.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {(isRefreshing || showDetailsLoading) && (
        <div className="absolute inset-0 bg-white/5 flex items-center justify-center rounded-lg pointer-events-none">
          <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
        </div>
      )}
    </div>
  );
};
