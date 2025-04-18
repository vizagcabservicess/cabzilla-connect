
import React, { useEffect, useState, useRef } from 'react';
import { formatPrice } from '@/lib';
import { BookingSummaryHelper } from './BookingSummaryHelper';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { FareUpdateError } from './FareUpdateError';
import { useLocalPackageFare } from '@/hooks/useLocalPackageFare';

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
  hourlyPackage = '8hrs-80km',
  tripMode = 'one-way',
  dropLocation,
  isCalculatingFares = false,
  fare
}) => {
  // State to track the currently selected cab ID
  const [currentCabId, setCurrentCabId] = useState<string>('');
  
  // Local state for displaying the confirmed fare amount
  const [displayFare, setDisplayFare] = useState<number>(0);
  
  // Loading state for handling transitions
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Track if this is the initial mount
  const isInitialMount = useRef<boolean>(true);
  
  // Use the improved local package fare hook with built-in caching
  const {
    fare: localPackageFare,
    isFetching: isLocalPackageFareFetching,
    error: localPackageFareError,
    fetchFare: fetchLocalPackageFare,
    hourlyPackage: currentPackage,
    changePackage
  } = useLocalPackageFare(hourlyPackage);
  
  // Normalize vehicle ID consistently
  const normalizeVehicleId = (id: string): string => {
    if (!id) return '';
    return id.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  };
  
  // Handle cab selection changes
  useEffect(() => {
    if (!selectedCab) return;
    
    const normalizedCabId = normalizeVehicleId(selectedCab.id);
    
    if (normalizedCabId !== currentCabId) {
      console.log(`BookingSummary: Cab changed from ${currentCabId} to ${normalizedCabId}`);
      
      // Reset display fare immediately on cab change
      setDisplayFare(0);
      
      // Mark as loading until we get updated fare
      setIsLoading(true);
      
      // Update the stored cab ID
      setCurrentCabId(normalizedCabId);
      
      // Fetch fare for the new cab if it's a local trip
      if (tripType === 'local') {
        fetchLocalPackageFare(selectedCab.id, hourlyPackage, true);
      }
    }
  }, [selectedCab, currentCabId, fetchLocalPackageFare, hourlyPackage, tripType]);
  
  // Update display fare when local package fare or prop fare changes
  useEffect(() => {
    // Skip on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    if (!selectedCab) return;
    
    // Get normalized ID for the currently selected cab
    const normalizedSelectedCabId = normalizeVehicleId(selectedCab.id);
    
    // For local trips, use the fare from our hook
    if (tripType === 'local' && localPackageFare > 0 && normalizedSelectedCabId === currentCabId) {
      console.log(`BookingSummary: Setting display fare for ${selectedCab.name} from hook: ${localPackageFare}`);
      setDisplayFare(localPackageFare);
      setIsLoading(false);
    } 
    // For other trip types, use the fare from props
    else if (fare && fare > 0 && normalizedSelectedCabId === currentCabId && !isCalculatingFares) {
      console.log(`BookingSummary: Setting display fare for ${selectedCab.name} from props: ${fare}`);
      setDisplayFare(fare);
      setIsLoading(false);
    }
  }, [fare, selectedCab, currentCabId, isCalculatingFares, localPackageFare, tripType]);
  
  // Update the hourly package in our hook when it changes in props
  useEffect(() => {
    if (hourlyPackage !== currentPackage) {
      changePackage(hourlyPackage);
    }
  }, [hourlyPackage, currentPackage, changePackage]);
  
  // Handle retry for fare fetch errors
  const handleRetryFetch = () => {
    if (!selectedCab) return;
    
    console.log(`BookingSummary: Retrying fare fetch for ${selectedCab.id}`);
    
    // Reset loading state
    setIsLoading(true);
    
    // Fetch the fare again with force refresh
    if (tripType === 'local') {
      fetchLocalPackageFare(selectedCab.id, hourlyPackage, true);
    }
  };
  
  // Show placeholder if no cab is selected
  if (!selectedCab) {
    return <div className="text-center py-8">Please select a cab to view booking summary</div>;
  }
  
  // Helper functions for formatting dates
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
  
  // Show error if we have one from local package fare fetching
  if (localPackageFareError && tripType === 'local') {
    return (
      <FareUpdateError 
        error={new Error(localPackageFareError)}
        onRetry={handleRetryFetch}
        cabId={selectedCab.id}
        title="Fare Update Error"
        description="There was a problem fetching the latest fare for this cab."
      />
    );
  }
  
  // Render local package details with proper loading states
  const renderLocalPackageDetails = () => {
    // Check if we should show skeleton loading state
    const shouldShowSkeleton = isLoading || isLocalPackageFareFetching || isCalculatingFares || displayFare === 0;
    
    return (
      <>
        <div className="flex justify-between items-center py-2 border-b">
          <div>{hourlyPackage?.replace(/-/g, ' ').replace('hrs', 'hrs ').toUpperCase()} Package</div>
          {shouldShowSkeleton ? (
            <Skeleton className="h-6 w-24" />
          ) : (
            <div>{formatPrice(displayFare)}</div>
          )}
        </div>
      </>
    );
  };
  
  // Determine when to show skeleton loaders
  const shouldShowSkeleton = 
    isLoading || 
    isLocalPackageFareFetching ||
    isCalculatingFares || 
    displayFare === 0;
  
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
        {shouldShowSkeleton ? (
          <Skeleton className="h-7 w-28" />
        ) : (
          <div>{formatPrice(displayFare)}</div>
        )}
      </div>

      <BookingSummaryHelper 
        tripType={tripType} 
        selectedCabId={selectedCab?.id} 
        totalPrice={displayFare || 0}
        hourlyPackage={hourlyPackage}
      />
    </div>
  );
};
