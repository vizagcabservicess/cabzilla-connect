
import React, { useEffect, useState } from 'react';
import { formatPrice } from '@/lib';
import { BookingSummaryHelper } from './BookingSummaryHelper';
import { toast } from 'sonner';
import axios from 'axios';
import { getApiUrl } from '@/config/api';

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
  isCalculatingFares = false
}) => {
  const [packageFare, setPackageFare] = useState<number>(0);
  const [driverAllowance, setDriverAllowance] = useState<number>(0);
  const [nightCharges, setNightCharges] = useState<number>(0);
  const [extraDistanceFare, setExtraDistanceFare] = useState<number>(0);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [isFetchingFare, setIsFetchingFare] = useState<boolean>(false);
  const [lastUpdate, setLastUpdate] = useState<number>(0);

  // Generate a formatted date for display
  const formatDisplayDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    return date.toLocaleDateString(undefined, options);
  };

  // Format time separately for better control
  const formatDisplayTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Direct fare fetch from API for consistency
  const fetchDirectFare = async (vehicleId: string, packageId: string) => {
    if (!vehicleId || !packageId) return 0;
    
    setIsFetchingFare(true);
    try {
      // Normalize vehicle ID for API request
      const normalizedVehicleId = vehicleId.toLowerCase().replace(/\s+/g, '_');
      const apiUrl = getApiUrl(`api/admin/direct-local-fares.php?vehicle_id=${normalizedVehicleId}`);
      
      console.log(`BookingSummary: Fetching local fares for ${normalizedVehicleId}`);
      
      const response = await axios.get(apiUrl, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Force-Refresh': 'true'
        }
      });
      
      if (response.data && response.data.fares && response.data.fares.length > 0) {
        const fareData = response.data.fares[0];
        console.log(`BookingSummary: Retrieved local fares from service:`, fareData);
        
        // Extract the right price for the selected package
        let price = 0;
        if (packageId.includes('4hrs-40km')) {
          price = Number(fareData.price4hrs40km);
        } else if (packageId.includes('8hrs-80km')) {
          price = Number(fareData.price8hrs80km);
        } else if (packageId.includes('10hrs-100km')) {
          price = Number(fareData.price10hrs100km);
        }
        
        if (price > 0) {
          console.log(`BookingSummary: Calculated fare details:`, {
            baseFare: price,
            driverAllowance: 0,
            nightCharges: 0,
            extraDistance: 0,
            extraDistanceFares: 0
          });
          
          return price;
        }
      }
      
      console.warn('No fare data found from direct API fetch');
      return 0;
      
    } catch (error) {
      console.error('Error fetching fare directly:', error);
      return 0;
    } finally {
      setIsFetchingFare(false);
    }
  };

  // Calculate initial fare based on selected cab
  useEffect(() => {
    const calculateFare = async () => {
      if (selectedCab && tripType === 'local' && hourlyPackage) {
        const directFare = await fetchDirectFare(selectedCab.id, hourlyPackage);
        
        if (directFare > 0) {
          setPackageFare(directFare);
          setTotalAmount(directFare);
          console.log(`Set fare for ${selectedCab.id}: ${directFare} (refreshed from database)`);
        } else {
          // If direct API fails, try to get from cab selection price
          const normalizedCabId = selectedCab.id.toLowerCase().replace(/\s+/g, '_');
          const fareFromSelection = selectedCab.price || 0;
          
          if (fareFromSelection > 0) {
            setPackageFare(fareFromSelection);
            setTotalAmount(fareFromSelection);
            console.log(`Using fare from cab selection: ${fareFromSelection}`);
          } else {
            console.warn('Failed to get fare from both API and cab selection');
          }
        }
      }
    };

    calculateFare();
  }, [selectedCab, tripType, hourlyPackage]);

  // Listen for booking summary update events
  useEffect(() => {
    const handleBookingSummaryUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      
      if (customEvent.detail && customEvent.detail.cabId && customEvent.detail.fare) {
        const { cabId, fare, tripType: eventTripType, packageId, timestamp } = customEvent.detail;
        
        // Only update if this event is newer than our last update
        if (!lastUpdate || timestamp > lastUpdate) {
          // Make sure this event matches our current selection
          if (selectedCab && cabId === selectedCab.id.toLowerCase().replace(/\s+/g, '_') && 
              eventTripType === tripType && packageId === hourlyPackage) {
            
            setPackageFare(fare);
            setTotalAmount(fare);
            setLastUpdate(timestamp);
            
            console.log(`BookingSummary: Updated fare to ₹${fare} from ${customEvent.detail.source}`);
          }
        }
      }
    };
    
    window.addEventListener('booking-summary-update', handleBookingSummaryUpdate as EventListener);
    
    return () => {
      window.removeEventListener('booking-summary-update', handleBookingSummaryUpdate as EventListener);
    };
  }, [selectedCab, tripType, hourlyPackage, lastUpdate]);

  if (!selectedCab) {
    return <div className="text-center py-8">Please select a cab to view booking summary</div>;
  }

  // Directly show the package price for local packages
  const renderLocalPackageDetails = () => {
    return (
      <>
        <div className="flex justify-between items-center py-2 border-b">
          <div>{hourlyPackage?.replace(/-/g, ' ').replace('hrs', 'hrs ').toUpperCase()} Package</div>
          <div>{isFetchingFare ? 'Loading...' : formatPrice(packageFare)}</div>
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

      {/* Package Fare Details */}
      {tripType === 'local' && renderLocalPackageDetails()}

      {/* Total Amount */}
      <div className="flex justify-between items-center py-4 border-t border-b font-semibold">
        <div>Total Amount</div>
        <div>{isFetchingFare ? 'Calculating...' : formatPrice(totalAmount)}</div>
      </div>

      {/* BookingSummaryHelper for synchronizing fares */}
      <BookingSummaryHelper 
        tripType={tripType} 
        selectedCabId={selectedCab?.id} 
        totalPrice={totalAmount}
        hourlyPackage={hourlyPackage}
      />
    </div>
  );
};
