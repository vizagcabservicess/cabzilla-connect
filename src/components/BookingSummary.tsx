
import React, { useEffect, useState, useRef } from 'react';
import { Location } from '@/lib/locationData';
import { formatPrice } from '@/lib/cabData';
import { CabType } from '@/types/cab';
import { format } from 'date-fns';
import { Info, MapPin, Calendar, TrendingUp, Truck, Users } from 'lucide-react';
import { TripType, TripMode } from '@/lib/tripTypes';
import { FareUpdateEvent } from '@/types/api';

interface BookingSummaryProps {
  pickupLocation: Location;
  dropLocation?: Location | null;
  pickupDate?: Date;
  returnDate?: Date | null;
  selectedCab?: CabType | null;
  distance: number;
  totalPrice?: number;
  tripType: TripType;
  tripMode: TripMode;
}

export function BookingSummary({ 
  pickupLocation, 
  dropLocation, 
  pickupDate, 
  returnDate, 
  selectedCab, 
  distance, 
  totalPrice = 0,
  tripType,
  tripMode
}: BookingSummaryProps) {
  const [displayPrice, setDisplayPrice] = useState<number>(totalPrice);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const lastUpdateTimeRef = useRef<number>(0);
  const cabIdRef = useRef<string | undefined>(selectedCab?.id);
  const initialMountRef = useRef<boolean>(true);
  
  // Process fare updates from events
  useEffect(() => {
    const handleFareUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<FareUpdateEvent>;
      
      if (!customEvent.detail) return;
      const { cabId, fare, timestamp } = customEvent.detail;
      
      // Only update if this is the selected cab and fare is valid
      if (selectedCab && cabId === selectedCab.id && fare > 0) {
        console.log(`BookingSummary: Received fare update for ${cabId}: ₹${fare}`);
        
        // Prevent too-frequent updates (debounce)
        if (timestamp - lastUpdateTimeRef.current < 300) {
          console.log('BookingSummary: Debouncing fare update (too frequent)');
          return;
        }
        
        // Visual feedback of updating
        setIsUpdating(true);
        
        // Update the display price
        setDisplayPrice(fare);
        lastUpdateTimeRef.current = timestamp;
        
        // Reset updating state after a short delay
        setTimeout(() => {
          setIsUpdating(false);
        }, 300);
      }
    };
    
    window.addEventListener('fare-updated', handleFareUpdated);
    
    return () => {
      window.removeEventListener('fare-updated', handleFareUpdated);
    };
  }, [selectedCab]);
  
  // Update display price when props change
  useEffect(() => {
    // On initial mount, take the provided totalPrice
    if (initialMountRef.current) {
      setDisplayPrice(totalPrice);
      initialMountRef.current = false;
    } 
    // If cab changed, definitely update the price
    else if (selectedCab?.id !== cabIdRef.current) {
      console.log(`BookingSummary: Cab changed from ${cabIdRef.current} to ${selectedCab?.id}, updating price to ${totalPrice}`);
      cabIdRef.current = selectedCab?.id;
      setDisplayPrice(totalPrice);
      setIsUpdating(true);
      setTimeout(() => setIsUpdating(false), 300);
    }
    // For non-initial renders, only update if there's a significant difference
    else if (Math.abs(totalPrice - displayPrice) > 1) {
      console.log(`BookingSummary: Price changed significantly (${displayPrice} → ${totalPrice}), updating`);
      setDisplayPrice(totalPrice);
      setIsUpdating(true);
      setTimeout(() => setIsUpdating(false), 300);
    }
  }, [totalPrice, selectedCab, displayPrice]);
  
  // Format date for display
  const formatDate = (date?: Date | null) => {
    if (!date) return '';
    return format(date, 'EEEE, MMMM d, yyyy h:mm a');
  };
  
  // Calculate the pricing breakdown based on trip type
  const getPricingBreakdown = () => {
    // Bail early if we don't have a selected cab
    if (!selectedCab) return null;
    
    if (tripType === 'outstation') {
      const baseKm = 300;
      const baseFare = displayPrice > 0 ? Math.round(displayPrice * 0.6) : 0;
      const driverAllowance = 250;
      const effectiveDistance = tripMode === 'one-way' ? distance * 2 : distance * 2;
      const extraDistance = Math.max(0, effectiveDistance - baseKm);
      const perKmRate = selectedCab.pricePerKm || 14;
      const extraDistanceFare = extraDistance * perKmRate;
      
      return (
        <>
          <div className="flex justify-between mt-3 text-sm">
            <span>Base fare ({baseKm} km included)</span>
            <span>₹{formatPrice(baseFare)}</span>
          </div>
          
          <div className="text-xs text-gray-500 mt-1">
            Total distance: {distance} km {tripMode === 'one-way' && 
              <span>(effective: {effectiveDistance} km with driver return)</span>
            }
          </div>
          
          {extraDistance > 0 && (
            <div className="flex justify-between mt-3 text-sm">
              <span>Extra distance fare ({extraDistance} km × ₹{perKmRate})</span>
              <span>₹{formatPrice(extraDistanceFare)}</span>
            </div>
          )}
          
          <div className="flex justify-between mt-3 text-sm">
            <span>Driver allowance</span>
            <span>₹{formatPrice(driverAllowance)}</span>
          </div>
        </>
      );
    }
    
    if (tripType === 'local') {
      // Local package logic
      const packageHours = 8; // default 8hrs-80km
      const packageKm = 80;
      const basePrice = Math.max(0, displayPrice - 200); // estimate
      
      return (
        <>
          <div className="flex justify-between mt-3 text-sm">
            <span>{packageHours} hours / {packageKm} km package</span>
            <span>₹{formatPrice(basePrice)}</span>
          </div>
          
          <div className="flex justify-between mt-3 text-sm">
            <span>Driver allowance</span>
            <span>₹200</span>
          </div>
        </>
      );
    }
    
    if (tripType === 'airport') {
      return (
        <>
          <div className="flex justify-between mt-3 text-sm">
            <span>Airport transfer base fare</span>
            <span>₹{formatPrice(displayPrice - 250)}</span>
          </div>
          
          <div className="flex justify-between mt-3 text-sm">
            <span>Driver allowance</span>
            <span>₹250</span>
          </div>
        </>
      );
    }
    
    if (tripType === 'tour') {
      // For tour packages, we show a simplified breakdown
      return (
        <>
          <div className="flex justify-between mt-3 text-sm">
            <span>Tour package base fare</span>
            <span>₹{formatPrice(displayPrice - 250)}</span>
          </div>
          
          <div className="flex justify-between mt-3 text-sm">
            <span>Driver allowance</span>
            <span>₹250</span>
          </div>
        </>
      );
    }
    
    return null;
  };
  
  return (
    <div className="bg-white border rounded-xl shadow-md overflow-hidden">
      <div className="bg-blue-50 p-4 border-b">
        <h3 className="text-lg font-semibold text-blue-800">Booking Summary</h3>
      </div>
      
      <div className="p-4 space-y-4">
        <div className="space-y-3">
          <div className="flex gap-3">
            <MapPin className="text-blue-600 shrink-0 mt-1" size={18} />
            <div>
              <p className="text-sm text-gray-500">PICKUP LOCATION</p>
              <p className="font-medium">{pickupLocation?.name || pickupLocation?.address}</p>
            </div>
          </div>
          
          {dropLocation && (
            <div className="flex gap-3">
              <MapPin className="text-blue-600 shrink-0 mt-1" size={18} />
              <div>
                <p className="text-sm text-gray-500">DROP LOCATION</p>
                <p className="font-medium">{dropLocation?.name || dropLocation?.address}</p>
              </div>
            </div>
          )}
        </div>
        
        <div className="border-t pt-4 space-y-3">
          <div className="flex gap-3">
            <Calendar className="text-blue-600 shrink-0 mt-1" size={18} />
            <div>
              <p className="text-sm text-gray-500">PICKUP DATE & TIME</p>
              <p className="font-medium">{formatDate(pickupDate)}</p>
            </div>
          </div>
          
          {tripMode === 'round-trip' && returnDate && (
            <div className="flex gap-3">
              <Calendar className="text-blue-600 shrink-0 mt-1" size={18} />
              <div>
                <p className="text-sm text-gray-500">RETURN DATE & TIME</p>
                <p className="font-medium">{formatDate(returnDate)}</p>
              </div>
            </div>
          )}
        </div>
        
        {selectedCab && (
          <div className="border-t pt-4 space-y-3">
            <div className="flex gap-3">
              <Truck className="text-blue-600 shrink-0 mt-1" size={18} />
              <div>
                <p className="text-sm text-gray-500">CAB TYPE</p>
                <p className="font-medium">{selectedCab.name}</p>
                <p className="text-xs text-gray-500">{selectedCab.description || `${selectedCab.capacity} persons • ${selectedCab.luggageCapacity} bags`}</p>
              </div>
            </div>
          </div>
        )}
        
        {distance > 0 && (
          <div className="border-t pt-4 space-y-3">
            <div className="flex gap-3">
              <TrendingUp className="text-blue-600 shrink-0 mt-1" size={18} />
              <div>
                <p className="text-sm text-gray-500">TRIP DISTANCE</p>
                <p className="font-medium">{distance} km</p>
              </div>
            </div>
          </div>
        )}
        
        <div className="border-t pt-4 mt-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold">Fare Breakdown</h4>
              {isUpdating && (
                <div className="flex items-center text-blue-600 text-xs">
                  <div className="animate-spin mr-1 h-3 w-3 border-b-2 border-blue-600"></div>
                  Updating...
                </div>
              )}
            </div>
            
            {selectedCab ? (
              <>
                {getPricingBreakdown()}
                
                <div className="border-t mt-4 pt-4 flex justify-between font-semibold">
                  <span>Total Amount</span>
                  <span className={`${isUpdating ? 'text-blue-600' : ''} transition-colors`}>
                    ₹{formatPrice(displayPrice)}
                  </span>
                </div>
                
                <div className="mt-3 text-xs flex items-start gap-1 text-gray-600">
                  <Info size={14} className="shrink-0 mt-0.5" />
                  <p>
                    {tripType === 'outstation' && tripMode === 'one-way' ? (
                      <>
                        Minimum 300 km fare applies for one-way trips.
                        Driver allowance included for return journey.
                      </>
                    ) : tripType === 'outstation' ? (
                      <>
                        Prices include driver allowance and all taxes.
                        Additional charges may apply for night rides.
                      </>
                    ) : tripType === 'tour' ? (
                      <>
                        Tour package prices include all tolls, permits, and driver allowance.
                      </>
                    ) : (
                      <>
                        All prices include taxes and fees (Tolls & Permits Extra).
                      </>
                    )}
                  </p>
                </div>
              </>
            ) : (
              <div className="text-center py-4 text-gray-500">
                Please select a cab to view pricing
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
