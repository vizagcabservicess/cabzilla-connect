import React, { useState, useEffect } from 'react';
import { Location } from '@/lib/locationData';
import { CabType } from '@/types/cab';
import { formatPrice } from '@/lib/cabData';
import { TripType, TripMode } from '@/lib/tripTypes';
import { useFare, FareType } from '@/hooks/useFare';

interface BookingSummaryProps {
  pickupLocation: Location | null;
  dropLocation: Location | null;
  pickupDate?: Date;
  returnDate?: Date;
  selectedCab: CabType | null;
  distance: number;
  totalPrice: number;
  tripType: TripType;
  tripMode: TripMode;
  hourlyPackage?: string;
  isPreview?: boolean;
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
  hourlyPackage,
  isPreview = false
}: BookingSummaryProps) {
  const [fareDetails, setFareDetails] = useState<Record<string, number>>({});
  const { fetchFare, isLoading } = useFare();
  
  useEffect(() => {
    const loadFare = async () => {
      if (!selectedCab) return;
      
      try {
        const result = await fetchFare({
          vehicleId: selectedCab.id,
          tripType: tripType as FareType,
          distance,
          tripMode: tripMode as 'one-way' | 'round-trip',
          packageId: hourlyPackage,
          pickupDate,
          returnDate
        });
        
        setFareDetails(result.breakdown || { 'Total fare': result.totalPrice });
      } catch (error) {
        console.error('Error fetching fare details:', error);
      }
    };
    
    loadFare();
  }, [selectedCab, tripType, tripMode, distance, hourlyPackage, pickupDate, returnDate, fetchFare]);
  
  const isCalculating = selectedCab ? isLoading(selectedCab.id) : false;
  const totalFare = Object.values(fareDetails).reduce((sum, value) => sum + value, 0);
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold mb-6">Booking Summary</h2>
      
      <div className="space-y-4">
        <div className="flex items-start">
          <div className="mt-1 text-blue-500 flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-gray-500">PICKUP LOCATION</p>
            <p className="font-medium">{pickupLocation?.name || pickupLocation?.address || 'Not specified'}</p>
          </div>
        </div>
        
        {tripType !== 'local' && (
          <div className="flex items-start">
            <div className="mt-1 text-blue-500 flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-500">DROP LOCATION</p>
              <p className="font-medium">{dropLocation?.name || dropLocation?.address || 'Not specified'}</p>
            </div>
          </div>
        )}
        
        <div className="flex items-start">
          <div className="mt-1 text-blue-500 flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-gray-500">PICKUP DATE & TIME</p>
            <p className="font-medium">
              {pickupDate ? new Intl.DateTimeFormat('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
                hour12: true
              }).format(pickupDate) : 'Not specified'}
            </p>
          </div>
        </div>
        
        {tripType === 'outstation' && tripMode === 'round-trip' && returnDate && (
          <div className="flex items-start">
            <div className="mt-1 text-blue-500 flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-500">RETURN DATE & TIME</p>
              <p className="font-medium">
                {new Intl.DateTimeFormat('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: 'numeric',
                  hour12: true
                }).format(returnDate)}
              </p>
            </div>
          </div>
        )}
        
        <div className="flex items-start">
          <div className="mt-1 text-blue-500 flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-gray-500">SELECTED CAB</p>
            <p className="font-medium">{selectedCab?.name || 'Not selected'}</p>
          </div>
        </div>
        
        <div className="flex items-start">
          <div className="mt-1 text-blue-500 flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-gray-500">TRIP DETAILS</p>
            <p className="font-medium">
              {tripType.charAt(0).toUpperCase() + tripType.slice(1)}
              {tripType === 'outstation' && ` - ${tripMode === 'round-trip' ? 'Round Trip' : 'One Way'}`}
              {tripType === 'local' && ` - ${getLocalPackageDetails()}`}
            </p>
            <p className="text-sm">Distance: {distance} km</p>
          </div>
        </div>
      </div>
      
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Fare Breakdown</h3>
        
        {Object.entries(fareDetails).map(([label, amount]) => (
          <div key={label} className="flex justify-between items-center py-2">
            <span>{label}</span>
            <span className="font-semibold">
              {isCalculating ? (
                <div className="h-6 w-20 bg-gray-200 rounded animate-pulse" />
              ) : (
                formatPrice(amount)
              )}
            </span>
          </div>
        ))}
        
        <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
          <span className="text-lg font-bold">Total</span>
          <span className="text-lg font-bold">
            {isCalculating ? (
              <div className="h-7 w-24 bg-gray-200 rounded animate-pulse" />
            ) : (
              formatPrice(totalFare)
            )}
          </span>
        </div>
        
        <p className="text-xs text-gray-500 mt-2">
          Inclusive of all taxes. No hidden charges.
        </p>
      </div>
    </div>
  );
}
