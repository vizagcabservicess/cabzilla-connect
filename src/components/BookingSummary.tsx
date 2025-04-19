import React, { useEffect, useState } from 'react';
import { Separator } from "@/components/ui/separator";
import { MapPin, Calendar, Route, CarFront, IndianRupee } from "lucide-react";
import { formatDate, formatTime } from "@/lib/dateUtils";
import { CabType } from "@/types/cab";
import { Location } from "@/lib/locationData";
import { formatPrice } from "@/lib/cabData";
import { useFare, FareType, TripDirectionType } from '@/hooks/useFare';

interface BookingSummaryProps {
  pickupLocation: Location | null;
  dropLocation: Location | null;
  pickupDate: Date | null;
  returnDate?: Date | null;
  selectedCab: CabType | null;
  distance: number;
  tripType: string;
  tripMode: TripDirectionType;
  totalPrice?: number;
  hourlyPackage?: string;
}

export function BookingSummary({
  pickupLocation,
  dropLocation,
  pickupDate,
  returnDate,
  selectedCab,
  distance,
  tripType,
  tripMode,
  totalPrice: staticTotalPrice,
  hourlyPackage
}: BookingSummaryProps) {
  // Added state for dynamic fare
  const [dynamicTotalPrice, setDynamicTotalPrice] = useState<number | null>(null);
  const [isLoadingFare, setIsLoadingFare] = useState(false);
  const { fetchFare } = useFare();

  // Effect to fetch dynamic fare when component loads or inputs change
  useEffect(() => {
    const fetchDynamicFare = async () => {
      if (!selectedCab) return;
      
      setIsLoadingFare(true);
      try {
        console.log("BookingSummary: Fetching dynamic fare for", selectedCab.id);
        const fareDetails = await fetchFare({
          vehicleId: selectedCab.id,
          tripType: tripType as FareType,
          distance,
          tripMode,
          packageId: hourlyPackage,
          pickupDate: pickupDate || undefined,
          returnDate: returnDate || undefined
        });
        
        console.log("BookingSummary: Received dynamic fare:", fareDetails);
        
        // Process the fare based on trip type
        let calculatedFare = 0;
        
        if (tripType === 'local' && hourlyPackage) {
          // Local trips with hourly packages
          if (hourlyPackage === '4hrs-40km' && fareDetails.price4hrs40km) {
            calculatedFare = fareDetails.price4hrs40km;
          } else if (hourlyPackage === '8hrs-80km' && fareDetails.price8hrs80km) {
            calculatedFare = fareDetails.price8hrs80km;
          } else if (hourlyPackage === '10hrs-100km' && fareDetails.price10hrs100km) {
            calculatedFare = fareDetails.price10hrs100km;
          } else {
            calculatedFare = fareDetails.totalPrice || fareDetails.price || fareDetails.basePrice || 0;
          }
        } else {
          // Other trip types
          calculatedFare = fareDetails.totalPrice || fareDetails.price || fareDetails.basePrice || 0;
        }
        
        if (calculatedFare > 0) {
          setDynamicTotalPrice(calculatedFare);
        }
      } catch (error) {
        console.error("Error fetching dynamic fare:", error);
      } finally {
        setIsLoadingFare(false);
      }
    };
    
    fetchDynamicFare();
  }, [selectedCab, tripType, distance, tripMode, hourlyPackage, fetchFare, pickupDate, returnDate]);

  // Use dynamic price if available, otherwise fall back to static price
  const displayPrice = dynamicTotalPrice || staticTotalPrice || 0;
  
  // Generate details based on trip type
  const getTripDetails = () => {
    if (tripType === 'local') {
      const packageDisplay = hourlyPackage ? hourlyPackage.replace('-', ' / ') : '8hrs / 80km';
      return `Local package (${packageDisplay})`;
    } else if (tripType === 'outstation') {
      return `${tripMode === 'round-trip' ? 'Round trip' : 'One way'} - ${distance} km`;
    } else if (tripType === 'airport') {
      return `Airport transfer - ${distance} km`;
    } else if (tripType === 'tour') {
      return `Guided tour - ${distance} km`;
    }
    return `${distance} km journey`;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <h2 className="font-semibold text-lg mb-4">Booking Summary</h2>
      
      <div className="space-y-4">
        {pickupLocation && (
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-gray-500">PICKUP LOCATION</p>
              <p className="font-medium">{pickupLocation.name}</p>
            </div>
          </div>
        )}
        
        {dropLocation && (
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-gray-500">DROP LOCATION</p>
              <p className="font-medium">{dropLocation.name}</p>
            </div>
          </div>
        )}
        
        {pickupDate && (
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-gray-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-gray-500">PICKUP DATE & TIME</p>
              <p className="font-medium">{formatDate(pickupDate)} at {formatTime(pickupDate)}</p>
            </div>
          </div>
        )}
        
        {returnDate && (
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-gray-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-gray-500">RETURN DATE & TIME</p>
              <p className="font-medium">{formatDate(returnDate)} at {formatTime(returnDate)}</p>
            </div>
          </div>
        )}
        
        <div className="flex items-start gap-3">
          <Route className="h-5 w-5 text-gray-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm text-gray-500">TRIP DETAILS</p>
            <p className="font-medium">{getTripDetails()}</p>
          </div>
        </div>
        
        {selectedCab && (
          <div className="flex items-start gap-3">
            <CarFront className="h-5 w-5 text-gray-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-gray-500">SELECTED CAB</p>
              <p className="font-medium">{selectedCab.name}</p>
              <p className="text-xs text-gray-500">
                {selectedCab.capacity} seater • {selectedCab.luggageCapacity} luggage
              </p>
            </div>
          </div>
        )}
      </div>
      
      <Separator className="my-4" />
      
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-gray-500">TOTAL FARE</p>
          <div className="flex items-center">
            <IndianRupee className="h-4 w-4 mr-1" />
            <p className="text-xl font-bold">
              {isLoadingFare ? 'Calculating...' : formatPrice(displayPrice)}
            </p>
          </div>
          <p className="text-xs text-gray-500">All inclusive</p>
        </div>
      </div>
    </div>
  );
}
