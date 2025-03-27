
import { useState, useEffect } from 'react';
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
  const [baseFare, setBaseFare] = useState<number>(0);
  const [driverAllowance, setDriverAllowance] = useState<number>(250);
  const [nightCharges, setNightCharges] = useState<number>(0);
  const [extraDistance, setExtraDistance] = useState<number>(0);
  const [extraDistanceFare, setExtraDistanceFare] = useState<number>(0);
  const [perKmRate, setPerKmRate] = useState<number>(0);
  const [effectiveDistance, setEffectiveDistance] = useState<number>(distance);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  
  // Function to fetch pricing details and calculate fare components
  const recalculateFareDetails = async () => {
    if (!selectedCab) return;
    
    setIsRefreshing(true);
    console.log('BookingSummary: Recalculating fare details for', selectedCab.name);
    
    try {
      // Initialize variables
      let newBaseFare = 0;
      let newDriverAllowance = 250;
      let newNightCharges = 0;
      let newExtraDistance = 0;
      let newExtraDistanceFare = 0;
      let newPerKmRate = 0;
      let newEffectiveDistance = distance;
      const minimumKm = 300; // Minimum 300km for one-way trips
      
      // Recalculate for outstation trips
      if (tripType === 'outstation') {
        // Always fetch fresh fares from vehicle_pricing
        const outstationFares = await getOutstationFaresForVehicle(selectedCab.id);
        console.log('BookingSummary: Retrieved fresh outstation fares:', outstationFares);
        
        if (tripMode === 'one-way') {
          newPerKmRate = outstationFares.pricePerKm;
          
          // Always ensure minimum 300 km for one-way trips
          newEffectiveDistance = Math.max(distance, minimumKm);
          
          // Calculate base fare for minimum 300 km
          newBaseFare = minimumKm * newPerKmRate;
          
          // Calculate extra distance if actual distance exceeds minimum
          if (distance > minimumKm) {
            newExtraDistance = distance - minimumKm;
            newExtraDistanceFare = newExtraDistance * newPerKmRate;
          }
          
          // Set driver allowance
          newDriverAllowance = outstationFares.driverAllowance || 250;
          
          // Recalculate night charges
          if (pickupDate && (pickupDate.getHours() >= 22 || pickupDate.getHours() <= 5)) {
            newNightCharges = Math.round(newBaseFare * 0.1);
          }
        } else {
          // For round trips
          newPerKmRate = outstationFares.roundTripPricePerKm || outstationFares.pricePerKm * 0.85;
          newDriverAllowance = outstationFares.driverAllowance || 250;
          
          // Calculate effective distance (round trip)
          newEffectiveDistance = distance * 2;
          
          // Base fare calculation
          if (newEffectiveDistance < minimumKm) {
            // If total round trip distance is less than minimum, charge for minimum
            newBaseFare = minimumKm * newPerKmRate;
          } else {
            // If total round trip distance exceeds minimum, charge for actual distance
            newBaseFare = newEffectiveDistance * newPerKmRate;
          }
          
          // Recalculate night charges
          if (pickupDate && (pickupDate.getHours() >= 22 || pickupDate.getHours() <= 5)) {
            newNightCharges = Math.round(newBaseFare * 0.1);
          }
        }
      }
      else if (tripType === 'airport') {
        // Fetch airport fares
        const airportFares = await getAirportFaresForVehicle(selectedCab.id);
        console.log('BookingSummary: Retrieved fresh airport fares:', airportFares);
        
        if (distance <= 10) {
          newBaseFare = airportFares.tier1Price || airportFares.basePrice || 1000;
        } else if (distance <= 20) {
          newBaseFare = airportFares.tier2Price || airportFares.basePrice || 1200;
        } else if (distance <= 30) {
          newBaseFare = airportFares.tier3Price || airportFares.basePrice || 1500;
        } else {
          newBaseFare = airportFares.tier4Price || airportFares.basePrice || 2000;
          
          // Extra distance charges for distances above 30km
          newExtraDistance = distance - 30;
          newExtraDistanceFare = newExtraDistance * (airportFares.extraKmCharge || 14);
          newPerKmRate = airportFares.extraKmCharge || 14;
        }
        
        newDriverAllowance = 250;
      }
      else if (tripType === 'local') {
        // Fetch local fares
        const localFares = await getLocalFaresForVehicle(selectedCab.id);
        console.log('BookingSummary: Retrieved fresh local fares:', localFares);
        
        if (localFares.price8hrs80km > 0) {
          newBaseFare = localFares.price8hrs80km;
        } else if (selectedCab.localPackageFares?.price8hrs80km) {
          newBaseFare = selectedCab.localPackageFares.price8hrs80km;
        } else {
          // Default local fare
          if (selectedCab.name.toLowerCase().includes('sedan')) newBaseFare = 1500;
          else if (selectedCab.name.toLowerCase().includes('ertiga')) newBaseFare = 1800;
          else if (selectedCab.name.toLowerCase().includes('innova')) newBaseFare = 2200;
          else newBaseFare = 1500;
        }
        
        newDriverAllowance = 0; // No separate driver allowance for local trips
      }
      
      // Update state with new calculations
      setBaseFare(newBaseFare);
      setDriverAllowance(newDriverAllowance);
      setNightCharges(newNightCharges);
      setExtraDistance(newExtraDistance);
      setExtraDistanceFare(newExtraDistanceFare);
      setPerKmRate(newPerKmRate);
      setEffectiveDistance(newEffectiveDistance);
      
      // Calculate total fare
      const newCalculatedFare = newBaseFare + newDriverAllowance + newNightCharges + newExtraDistanceFare;
      setCalculatedFare(newCalculatedFare);
      
      console.log('BookingSummary: Updated fare details', {
        baseFare: newBaseFare,
        driverAllowance: newDriverAllowance,
        nightCharges: newNightCharges,
        extraDistance: newExtraDistance,
        extraDistanceFare: newExtraDistanceFare,
        perKmRate: newPerKmRate,
        effectiveDistance: newEffectiveDistance,
        totalFare: newCalculatedFare
      });
    } catch (error) {
      console.error('Error recalculating fare details:', error);
      // Fallback to the provided total price
      setCalculatedFare(totalPrice);
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Listen for fare update events and update the calculated fare
  useEffect(() => {
    // Initialize the fare components on first load
    recalculateFareDetails();
    
    const handleLocalFaresUpdated = (event: Event) => {
      console.log('BookingSummary: Detected local fares updated event');
      recalculateFareDetails();
    };
    
    const handleCabSelectedForLocal = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('BookingSummary: Detected cab-selected-for-local event', customEvent.detail);
      recalculateFareDetails();
    };
    
    const handleTripFaresUpdated = (event: Event) => {
      console.log('BookingSummary: Detected trip-fares-updated event');
      recalculateFareDetails();
    };
    
    const handleFareCacheCleared = () => {
      console.log('BookingSummary: Detected fare-cache-cleared event');
      recalculateFareDetails();
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
  }, [selectedCab, tripType, tripMode, distance, pickupDate, returnDate, totalPrice]);
  
  // If another component updates the totalPrice, consider it
  useEffect(() => {
    if (totalPrice > 0 && Math.abs(totalPrice - calculatedFare) > 100) {
      console.log(`BookingSummary: totalPrice changed significantly: ${calculatedFare} -> ${totalPrice}`);
      setCalculatedFare(totalPrice);
      // Recalculate fare details
      recalculateFareDetails();
    }
  }, [totalPrice]);
  
  // If essential information is missing, show a placeholder
  if (!pickupLocation || (!dropLocation && tripType !== 'local' && tripType !== 'tour') || !pickupDate || !selectedCab) {
    return <div className="p-4 bg-gray-100 rounded-lg">Booking information not available</div>;
  }

  // Calculate final total
  let finalTotal = baseFare + driverAllowance + nightCharges + extraDistanceFare;
  
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
                  <span className="text-gray-700">Base fare (300 km included)</span>
                  <span className="font-semibold">₹{baseFare.toLocaleString()}</span>
                </div>
                
                <div className="text-gray-600 text-sm ml-1">
                  {tripMode === 'one-way' ? (
                    <>Total distance: {distance} km (300 km minimum fare applied)</>
                  ) : (
                    <>Total distance: {distance} km (effective: {effectiveDistance} km round trip)</>
                  )}
                </div>
                
                {extraDistance > 0 && extraDistanceFare > 0 && (
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
                <span className="text-gray-700">08hrs 80KM Package</span>
                <span className="font-semibold">₹{baseFare.toLocaleString()}</span>
              </div>
            )}
            
            {(tripType === 'airport' || tripType === 'tour') && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-700">Base fare</span>
                  <span className="font-semibold">₹{baseFare.toLocaleString()}</span>
                </div>
                
                {extraDistance > 0 && tripType === 'airport' && (
                  <div className="flex justify-between">
                    <span className="text-gray-700">Extra distance fare ({extraDistance} km × ₹{perKmRate})</span>
                    <span className="font-semibold">₹{extraDistanceFare.toLocaleString()}</span>
                  </div>
                )}
                
                {tripType === 'airport' && (
                  <div className="flex justify-between">
                    <span className="text-gray-700">Driver allowance</span>
                    <span className="font-semibold">₹{driverAllowance.toLocaleString()}</span>
                  </div>
                )}
              </>
            )}
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
                ? 'Fare includes round trip journey (both ways). Driver allowance included for overnight stays.'
                : tripType === 'outstation' && tripMode === 'one-way'
                ? 'Minimum 300 km fare applies for one-way trips. Driver allowance included.'
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
