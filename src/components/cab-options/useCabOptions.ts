
import { useState, useEffect, useCallback } from 'react';
import { CabType, FareCalculationParams } from '@/types/cab';
import { calculateFare } from '@/lib';
import { directVehicleOperation } from '@/utils/apiHelper';
import { toast } from 'sonner';

interface CabOptionsHookResult {
  cabTypes: CabType[];
  selectedCabType: CabType | null;
  setSelectedCabType: (cabType: CabType | null) => void;
  fare: number | null;
  calculateFareForSelectedCab: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

// Mock data with all required CabType properties
const mockCabData: CabType[] = [
  {
    id: 'sedan',
    name: 'Sedan',
    type: 'sedan',
    capacity: 4,
    luggage: 2,
    luggageCapacity: 2,
    price: 2000,
    basePrice: 500,
    pricePerKm: 15,
    image: '/lovable-uploads/63c26b4c-04c7-432a-ba0a-2195cb7068e5.png',
    amenities: ['AC', 'Music System', 'Comfortable Seats'],
    description: 'Comfortable sedan for city and outstation trips',
    ac: true,
    nightHaltCharge: 300,
    driverAllowance: 400,
    isActive: true,
  },
  {
    id: 'suv',
    name: 'SUV',
    type: 'suv',
    capacity: 7,
    luggage: 4,
    luggageCapacity: 4,
    price: 3000,
    basePrice: 800,
    pricePerKm: 18,
    image: '/lovable-uploads/a7c4aa76-7528-425a-8dcc-2168607d3fe2.png',
    amenities: ['AC', 'Music System', 'Extra Space', 'Power Windows'],
    description: 'Spacious SUV perfect for family trips',
    ac: true,
    nightHaltCharge: 400,
    driverAllowance: 500,
    isActive: true,
  },
  {
    id: 'hatchback',
    name: 'Hatchback',
    type: 'hatchback',
    capacity: 4,
    luggage: 2,
    luggageCapacity: 2,
    price: 1500,
    basePrice: 400,
    pricePerKm: 12,
    image: '/lovable-uploads/f403bba2-a984-4a7c-8f77-04dc15363aa8.png',
    amenities: ['AC', 'Music System'],
    description: 'Economical choice for short trips',
    ac: true,
    nightHaltCharge: 250,
    driverAllowance: 300,
    isActive: true,
  }
];

export const useCabOptions = (): CabOptionsHookResult => {
  const [cabTypes, setCabTypes] = useState<CabType[]>([]);
  const [selectedCabType, setSelectedCabType] = useState<CabType | null>(null);
  const [fare, setFare] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get URL parameters manually
  const urlParams = new URLSearchParams(window.location.search);
  const pickupLocation = urlParams.get('pickupLocation') || '';
  const dropLocation = urlParams.get('dropLocation') || '';
  const pickupDate = urlParams.get('pickupDate') || '';
  const tripType = urlParams.get('tripType') || 'local';
  const tripMode = urlParams.get('tripMode') || 'regular';
  const distance = parseFloat(urlParams.get('distance') || '0');

  const fetchCabTypes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await directVehicleOperation(
        `api/admin/cab-types.php?_t=${Date.now()}`,
        'GET',
        {
          headers: {
            'X-Admin-Mode': 'true',
            'X-Force-Refresh': 'true',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        }
      );
      
      const data = response;

      if (data && data.cabTypes) {
        setCabTypes(data.cabTypes);
      } else {
        setCabTypes(mockCabData);
        console.warn('Failed to fetch cab types from API, falling back to mock data.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch cab types');
      setCabTypes(mockCabData);
      console.error('Error fetching cab types:', err);
      toast.error('Error fetching cab types');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCabTypes();
  }, [fetchCabTypes]);

  const calculateFareForSelectedCab = useCallback(async () => {
    if (!selectedCabType) {
      setFare(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const fareCalculationParams: FareCalculationParams = {
        cabType: selectedCabType.id,
        pickupLocation,
        dropLocation,
        pickupDate,
        tripType,
        tripMode,
        distance
      };

      const calculatedFare = await calculateFare(fareCalculationParams);
      setFare(calculatedFare || null);
    } catch (err: any) {
      setError(err.message || 'Failed to calculate fare');
      setFare(null);
      toast.error('Could not calculate fare');
    } finally {
      setIsLoading(false);
    }
  }, [selectedCabType, pickupLocation, dropLocation, pickupDate, tripType, tripMode, distance]);

  return {
    cabTypes,
    selectedCabType,
    setSelectedCabType,
    fare,
    calculateFareForSelectedCab,
    isLoading,
    error,
  };
};
