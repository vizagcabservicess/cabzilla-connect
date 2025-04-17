
import React, { useEffect, useState } from 'react';
import { formatPrice } from '@/lib';
import { BookingSummaryHelper } from './BookingSummaryHelper';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface BookingSummaryProps {
  selectedCab: any;
  pickupLocation: string;
  pickupDate: Date;
  returnDate?: Date;
  tripType: string;
  distance: number;
  hourlyPackage?: string;
  tripMode?: string;
  dropLocation?: string;
  isCalculatingFares?: boolean;
  fare?: number;
}

export const BookingSummary: React.FC<BookingSummaryProps> = ({
  selectedCab,
  pickupLocation,
  pickupDate,
  returnDate,
  tripType,
  distance,
  hourlyPackage,
  tripMode = 'one-way',
  dropLocation,
  isCalculatingFares = false,
  fare
}) => {
  const [displayFare, setDisplayFare] = useState<number>(0);
  const [prevCabId, setPrevCabId] = useState<string>('');

  // Reset display fare when cab changes to prevent showing stale data
  useEffect(() => {
    if (selectedCab?.id !== prevCabId) {
      console.log(`BookingSummary: Selected cab changed from ${prevCabId} to ${selectedCab?.id}, resetting display fare`);
      setDisplayFare(0);
      setPrevCabId(selectedCab?.id);
    }
  }, [selectedCab?.id, prevCabId]);

  // Update display fare when fare changes and matches current cab
  useEffect(() => {
    if (fare && fare > 0 && selectedCab?.id === prevCabId) {
      console.log(`BookingSummary: Setting display fare for ${selectedCab.name} to ${fare}`);
      setDisplayFare(fare);
    } else if (selectedCab?.price && selectedCab?.id === prevCabId) {
      console.log(`BookingSummary: Using cab price from prop for ${selectedCab.name}: ${selectedCab.price}`);
      setDisplayFare(selectedCab.price);
    }
  }, [fare, selectedCab, prevCabId]);

  if (!selectedCab) {
    return <div className="text-center py-8">Please select a cab to view booking summary</div>;
  }

  const formatDisplayDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    return date.toLocaleDateString(undefined, options);
  };

  const formatDisplayTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderLocalPackageDetails = () => {
    return (
      <>
        <div className="flex justify-between items-center py-2 border-b">
          <div>{hourlyPackage?.replace(/-/g, ' ').replace('hrs', 'hrs ').toUpperCase()} Package</div>
          {isCalculatingFares ? (
            <Skeleton className="h-6 w-24" />
          ) : (
            <div>{formatPrice(displayFare)}</div>
          )}
        </div>
      </>
    );
  };

  return (
    <div className="bg-white rounded-lg p-5 shadow-sm mb-4">
      <h2 className="text-xl font-bold mb-4">Booking Summary</h2>
      
      <div className="space-y-4 mb-6">
        <div className="flex items-start gap-2">
          <div className="text-blue-500 mt-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <div className="text-gray-600 text-sm">PICKUP</div>
            <div>{pickupLocation}</div>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <div className="text-blue-500 mt-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <div className="text-gray-600 text-sm">PICKUP DATE & TIME</div>
            <div>{formatDisplayDate(pickupDate)}</div>
            <div>{formatDisplayTime(pickupDate)}</div>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <div className="text-blue-500 mt-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <div>
            <div className="text-gray-600 text-sm">CAB TYPE</div>
            <div className="flex items-center">
              {selectedCab.name} • {selectedCab.capacity} persons • {selectedCab.luggageCapacity} bags 
            </div>
          </div>
        </div>
      </div>

      {tripType === 'local' && renderLocalPackageDetails()}

      <div className="flex justify-between items-center py-4 border-t border-b font-semibold">
        <div>Total Amount</div>
        {isCalculatingFares ? (
          <Skeleton className="h-7 w-28" />
        ) : (
          <div>{formatPrice(displayFare)}</div>
        )}
      </div>

      <BookingSummaryHelper 
        tripType={tripType} 
        selectedCabId={selectedCab?.id} 
        totalPrice={displayFare || selectedCab.price || 0}
        hourlyPackage={hourlyPackage}
      />
    </div>
  );
};
