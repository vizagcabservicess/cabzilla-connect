import { useState, useEffect } from 'react';

export interface FareData {
  vehicleType: string;
  baseFare?: number;
  perKmRate: number;
  waitingCharges?: number;
  capacity: string;
  features: string;
  minFare?: number;
}

export interface RouteData {
  from: string;
  to: string;
  distance: string;
  duration?: string;
  price: string;
  estimatedTime?: string;
}

const mockFareAPI = {
  outstation: [
    { vehicleType: 'Sedan (Swift Dzire)', perKmRate: 12, capacity: '4+1', features: 'AC, Music System' },
    { vehicleType: 'SUV (Ertiga)', perKmRate: 14, capacity: '6+1', features: 'AC, Spacious, Music System' },
    { vehicleType: 'SUV (Innova)', perKmRate: 16, capacity: '6+1', features: 'Premium AC, Comfortable Seats' },
    { vehicleType: 'Tempo Traveller', perKmRate: 20, capacity: '12+1', features: 'AC, Group Travel' },
  ],
  local: [
    { vehicleType: 'Sedan (Swift Dzire)', perKmRate: 12, waitingCharges: 2, capacity: '4+1', features: 'AC, Music System', minFare: 150 },
    { vehicleType: 'SUV (Ertiga)', perKmRate: 14, waitingCharges: 3, capacity: '6+1', features: 'AC, Spacious, Music System', minFare: 180 },
    { vehicleType: 'SUV (Innova)', perKmRate: 16, waitingCharges: 3, capacity: '6+1', features: 'Premium AC, Comfortable Seats', minFare: 200 },
    { vehicleType: 'Hatchback (Swift)', perKmRate: 10, waitingCharges: 2, capacity: '4+1', features: 'AC, Compact', minFare: 120 },
  ],
  airport: [
    { vehicleType: 'Sedan (Swift Dzire)', baseFare: 350, capacity: '4+1', features: 'AC, Luggage Space', perKmRate: 0 },
    { vehicleType: 'SUV (Ertiga)', baseFare: 450, capacity: '6+1', features: 'AC, Extra Luggage Space', perKmRate: 0 },
    { vehicleType: 'SUV (Innova)', baseFare: 550, capacity: '6+1', features: 'Premium AC, Comfortable Seats', perKmRate: 0 },
    { vehicleType: 'Hatchback (Swift)', baseFare: 300, capacity: '4+1', features: 'AC, Compact', perKmRate: 0 },
  ]
};

export const useFareData = (serviceType: 'outstation' | 'local' | 'airport') => {
  const [fareData, setFareData] = useState<FareData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFares = async () => {
      try {
        setLoading(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // In real implementation, this would be:
        // const response = await fetch(`/api/getFares.php?type=${serviceType}`);
        // const data = await response.json();
        
        setFareData(mockFareAPI[serviceType]);
        setError(null);
      } catch (err) {
        setError('Failed to fetch fare data');
        console.error('Error fetching fare data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFares();
  }, [serviceType]);

  return { fareData, loading, error };
};