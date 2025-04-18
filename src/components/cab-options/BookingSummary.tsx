
import React, { useEffect, useState, useRef } from 'react';
import { useLocalPackageFare } from '@/hooks/useLocalPackageFare';
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from 'sonner';

interface BookingSummaryProps {
  selectedCab: any;
  tripType: string;
  hourlyPackage?: string;
  distance?: number;        
  isCalculatingFares?: boolean; 
  fare?: number;
  pickupLocation?: string;
  pickupDate?: Date;
}

export const BookingSummary: React.FC<BookingSummaryProps> = ({
  selectedCab,
  tripType,
  hourlyPackage = '8hrs-80km',
  distance,
  isCalculatingFares: externalIsLoading,
  fare: externalFare,
  pickupLocation,
  pickupDate
}) => {
  const [displayFare, setDisplayFare] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const requestTokenRef = useRef<number>(0);
  const currentCabIdRef = useRef<string | null>(null);
  
  const {
    fetchFare,
    isFetching,
    error
  } = useLocalPackageFare();  // Remove the second argument here

  // Normalize vehicle ID consistently
  const normalizeVehicleId = (id: string): string => {
    if (!id) return '';
    return id.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  };

  // Handle cab selection changes
  useEffect(() => {
    if (!selectedCab) return;

    const normalizedCabId = normalizeVehicleId(selectedCab.id);
    
    if (normalizedCabId !== currentCabIdRef.current) {
      console.log(`BookingSummary: Cab changed from ${currentCabIdRef.current} to ${normalizedCabId}`);
      
      // ⏳ Clear fare + start skeleton here
      setDisplayFare(0);
      setIsLoading(true);
      
      // Increment request token to invalidate any in-flight responses
      requestTokenRef.current++;
      
      // Update the stored cab ID
      currentCabIdRef.current = normalizedCabId;
      
      // Capture current token for this request
      const currentToken = requestTokenRef.current;
      
      // Fetch fare for new cab
      fetchFare(selectedCab.id, hourlyPackage).then(fare => {
        // 🚫 Ignore stale response if token mismatches
        if (currentToken === requestTokenRef.current && normalizedCabId === currentCabIdRef.current) {
          console.log(`BookingSummary: Setting fare for ${selectedCab.name}: ${fare}`);
          setDisplayFare(fare);
          setIsLoading(false);
        } else {
          console.log(`BookingSummary: Ignoring stale fare update for ${normalizedCabId}, current is ${currentCabIdRef.current}`);
        }
      }).catch(error => {
        console.error('Error fetching fare:', error);
        toast.error('Failed to load fare. Please try again.');
        setIsLoading(false);
      });
    }
  }, [selectedCab, hourlyPackage, fetchFare]);

  // Use external fare if provided
  useEffect(() => {
    if (externalFare && externalFare > 0 && !isLoading) {
      setDisplayFare(externalFare);
    }
  }, [externalFare, isLoading]);

  // Use external loading state if provided
  useEffect(() => {
    if (externalIsLoading !== undefined) {
      setIsLoading(externalIsLoading);
    }
  }, [externalIsLoading]);

  if (!selectedCab) {
    return <div className="p-4">Please select a cab to view pricing</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold mb-4">Booking Summary</h3>
      
      <div className="space-y-4">
        {/* Cab details */}
        <div className="flex justify-between items-center">
          <span>Selected Cab</span>
          <span className="font-medium">{selectedCab.name}</span>
        </div>

        {/* Package details */}
        <div className="flex justify-between items-center">
          <span>Package</span>
          <span className="font-medium">{hourlyPackage}</span>
        </div>

        {/* Distance - only show if provided */}
        {distance && (
          <div className="flex justify-between items-center">
            <span>Distance</span>
            <span className="font-medium">{distance} km</span>
          </div>
        )}

        {/* Fare display */}
        <div className="flex justify-between items-center pt-2 border-t">
          <span className="text-lg font-bold">Total Amount</span>
          {isLoading || isFetching ? (
            <Skeleton className="h-7 w-24" />
          ) : (
            <span className="text-lg font-bold">₹{displayFare.toLocaleString()}</span>
          )}
        </div>

        {error && (
          <div className="text-red-500 text-sm mt-2">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
