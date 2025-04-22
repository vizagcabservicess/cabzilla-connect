
import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { MapPin, Calendar, User, RefreshCcw } from 'lucide-react';
import { Separator } from './ui/separator';
import { useFare } from '@/hooks/useFare';

interface Location {
  name: string;
  address: string;
  lat?: number;
  lng?: number;
}

interface CabType {
  id: string;
  name: string;
  capacity: number;
  luggageCapacity: number;
}

interface BookingSummaryProps {
  pickupLocation: Location | null;
  dropLocation: Location | null;
  pickupDate: Date | null;
  selectedCab: CabType | null;
  tripType: string;
  tripMode?: string;
  distance: number;
  packageType?: string;
  fare?: number;
  onFareUpdated?: (fare: number) => void;
}

const BookingSummary: React.FC<BookingSummaryProps> = ({
  pickupLocation,
  dropLocation,
  pickupDate,
  selectedCab,
  tripType,
  tripMode = 'one-way',
  distance,
  packageType = '8hrs-80km',
  fare: parentFare = 0,
  onFareUpdated
}) => {
  // State for fare calculation
  const [fareData, setFareData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDetailsLoading, setShowDetailsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Use the fare calculation hook
  const { 
    fetchFare, 
    getLocalFaresForVehicle,
    getOutstationFaresForVehicle,
    getAirportFaresForVehicle
  } = useFare();

  // Calculate baseline fare details
  const [baseFare, setBaseFare] = useState(0);
  const [driverAllowance, setDriverAllowance] = useState(0);
  const [nightCharges, setNightCharges] = useState(0);
  const [extraDistance, setExtraDistance] = useState(0);
  const [extraDistanceFare, setExtraDistanceFare] = useState(0);
  const [perKmRate, setPerKmRate] = useState(0);
  const [effectiveDistance, setEffectiveDistance] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);

  // Calculate fare for the selected cab
  const calculateFareDetails = useCallback(async () => {
    if (!selectedCab) return;
    
    setShowDetailsLoading(true);
    setErrorMessage(null);

    try {
      // Fetch the fare details using the appropriate API based on trip type
      let result;
      
      if (tripType === 'local') {
        // Fetch local fare for selected vehicle
        const localFare = await getLocalFaresForVehicle(selectedCab.id);
        console.log('BookingSummary: Retrieved local fares:', localFare);

        // Determine the package price
        let packagePrice = 0;
        if (packageType?.includes('4hrs')) {
          packagePrice = localFare.price4hrs40km || 0;
        } else if (packageType?.includes('10hrs')) {
          packagePrice = localFare.price10hrs100km || 0;
        } else {
          packagePrice = localFare.price8hrs80km || 0;
        }

        // Set component display values
        setBaseFare(packagePrice);
        setDriverAllowance(0);
        setNightCharges(0);
        setExtraDistance(0);
        setExtraDistanceFare(0);
        setPerKmRate(localFare.priceExtraKm || 0);
        setEffectiveDistance(packageType?.includes('4hrs') ? 40 : 
                           packageType?.includes('10hrs') ? 100 : 80);
      
        // Get full fare calculation
        result = await fetchFare(selectedCab.id, tripType, distance, packageType);
      } 
      else if (tripType === 'outstation') {
        // Fetch outstation fare for selected vehicle
        const outstationFare = await getOutstationFaresForVehicle(selectedCab.id);
        console.log('BookingSummary: Retrieved outstation fares:', outstationFare);

        // For outstation trips, determine one-way vs round trip
        const baseDistance = 300; // Standard included distance 
        const isOneWay = tripMode === 'one-way';
        
        // Calculate effective distance based on trip mode
        const effectiveDist = isOneWay ? 
          Math.max(distance, distance * 1.8) : // One-way includes 80% return
          Math.max(distance, distance * 2);    // Round trip doubles the distance
        
        setEffectiveDistance(effectiveDist);
        
        // Set base values for display
        setBaseFare(outstationFare.base_price || 0);
        setDriverAllowance(outstationFare.driver_allowance || 0);
        setPerKmRate(outstationFare.price_per_km || 0);
        
        // Calculate extra distance beyond the base
        const extra = Math.max(0, effectiveDist - baseDistance);
        setExtraDistance(extra);
        setExtraDistanceFare(extra * outstationFare.price_per_km);
        
        // Get full fare calculation
        result = await fetchFare(selectedCab.id, tripType, effectiveDist, packageType);
      } 
      else if (tripType === 'airport') {
        // Fetch airport fare for selected vehicle
        const airportFare = await getAirportFaresForVehicle(selectedCab.id);
        console.log('BookingSummary: Retrieved airport fares:', airportFare);
        
        // Set airport-specific values
        setBaseFare(airportFare.base_price || 0);
        setDriverAllowance(airportFare.driver_allowance || 0);
        
        // Extra distance calculation for airport trips
        if (distance > 10) {
          const extra = distance - 10;
          setExtraDistance(extra);
          setPerKmRate(airportFare.price_per_km || 0);
          setExtraDistanceFare(extra * (airportFare.price_per_km || 0));
        } else {
          setExtraDistance(0);
          setExtraDistanceFare(0);
        }
        
        // Get full fare calculation
        result = await fetchFare(selectedCab.id, tripType, distance, packageType);
      }

      // Store the complete fare data
      if (result && result.fareData) {
        setFareData(result.fareData);
        setTotalPrice(result.fareData.totalPrice);
        
        // Notify parent if it requested fare updates
        if (onFareUpdated) {
          onFareUpdated(result.fareData.totalPrice);
        }
        
        console.log('BookingSummary: Using fare from useFare hook for', tripType, 'package:', result.fareData.totalPrice);
      }
    } catch (error) {
      console.error('Error calculating fare details:', error);
      setErrorMessage('Failed to calculate fare details');
    } finally {
      setShowDetailsLoading(false);
    }
  }, [
    selectedCab, 
    tripType, 
    tripMode, 
    distance, 
    packageType, 
    fetchFare, 
    getLocalFaresForVehicle,
    getOutstationFaresForVehicle, 
    getAirportFaresForVehicle,
    onFareUpdated
  ]);

  // Calculate fare when selected cab, trip type, or distance changes
  useEffect(() => {
    if (selectedCab) {
      calculateFareDetails();
    }
  }, [selectedCab, tripType, tripMode, distance, packageType, calculateFareDetails]);

  // Manual refresh button handler
  const handleRefresh = () => {
    setIsRefreshing(true);
    calculateFareDetails().finally(() => {
      setIsRefreshing(false);
    });
  };

  if (!pickupLocation || (!dropLocation && tripType !== 'local') || !pickupDate || !selectedCab) {
    return <div className="p-4 bg-gray-100 rounded-lg">Booking information not available</div>;
  }

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
                  <span className="font-semibold">₹{baseFare.toLocaleString()}</span>
                </div>
                
                <div className="text-gray-600 text-sm ml-1">
                  {tripMode === 'one-way' ? (
                    <>Total distance: {distance} km (effective: {effectiveDistance} km with driver return)</>
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
                <span className="text-gray-700">
                  {packageType === '4hrs-40km' ? '04hrs 40KM Package' : 
                   packageType === '10hrs-100km' ? '10hrs 100KM Package' : 
                   '08hrs 80KM Package'}
                </span>
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
                
                {tripType === 'airport' && driverAllowance > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-700">Driver allowance</span>
                    <span className="font-semibold">₹{driverAllowance.toLocaleString()}</span>
                  </div>
                )}
              </>
            )}
            
            <Separator />
            
            <div className="flex justify-between text-lg font-bold pt-2">
              <span>Total Amount</span>
              <span>
                {isLoading ? (
                  <span className="text-gray-400">Calculating...</span>
                ) : (
                  `₹${(fareData?.totalPrice || 0).toLocaleString()}`
                )}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {(isRefreshing || showDetailsLoading) && (
        <div className="absolute inset-0 bg-white/5 flex items-center justify-center rounded-lg pointer-events-none">
          <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
        </div>
      )}

      {/* Manual refresh button for fare calculation */}
      <button 
        onClick={handleRefresh}
        className="absolute top-2 right-2 text-gray-400 hover:text-blue-500 transition-colors"
        title="Refresh fare calculation"
      >
        <RefreshCcw size={16} />
      </button>
    </div>
  );
};

export default BookingSummary;
