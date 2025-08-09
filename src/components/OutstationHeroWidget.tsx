import React, { useEffect, useMemo } from 'react';
import { Hero } from './Hero';
import { useLocation, useNavigate } from 'react-router-dom';

interface OutstationHeroWidgetProps {
  initialPickup?: string;
  initialDrop?: string;
  onSearch?: (searchData: any) => void;
  onStepChange?: (step: number) => void;
  onEditStart?: () => void;
}

// Lookup for known cities

export const CITY_LOOKUP: Record<string, { city: string; state: string; lat: number; lng: number }> = {
  'Visakhapatnam': { city: 'Visakhapatnam', state: 'Andhra Pradesh', lat: 17.7243, lng: 83.3052 },
  'Annavaram': { city: 'Annavaram', state: 'Andhra Pradesh', lat: 17.2817, lng: 82.3977 },
  'Kakinada': { city: 'Kakinada', state: 'Andhra Pradesh', lat: 16.9891, lng: 82.2475 },
  'Rajahmundry': { city: 'Rajahmundry', state: 'Andhra Pradesh', lat: 17.0005, lng: 81.8040 },
  'Vijayawada': { city: 'Vijayawada', state: 'Andhra Pradesh', lat: 16.5062, lng: 80.6480 },
  'Hyderabad': { city: 'Hyderabad', state: 'Telangana', lat: 17.3850, lng: 78.4867 },
  'Araku Valley': { city: 'Araku Valley', state: 'Andhra Pradesh', lat: 18.3272, lng: 82.8763 },
  'Parvathipuram': { city: 'Parvathipuram', state: 'Andhra Pradesh', lat: 18.783, lng: 83.4268 },
  'Bobbili': { city: 'Bobbili', state: 'Andhra Pradesh', lat: 18.5735, lng: 83.3584 },
  'Vizianagaram': { city: 'Vizianagaram', state: 'Andhra Pradesh', lat: 18.1114, lng: 83.393 },
  'Sompeta': { city: 'Sompeta', state: 'Andhra Pradesh', lat: 18.9448, lng: 84.5821 },
  'Ichchapuram': { city: 'Ichchapuram', state: 'Andhra Pradesh', lat: 19.1139, lng: 84.6872 },
  'Palasa': { city: 'Palasa', state: 'Andhra Pradesh', lat: 18.7726, lng: 84.4100 },
  'Srimukhalingam': { city: 'Srimukhalingam', state: 'Andhra Pradesh', lat: 18.6022, lng: 84.0307 },
  'Palakonda': { city: 'Palakonda', state: 'Andhra Pradesh', lat: 18.6167, lng: 83.75 },
  'Amadalavalasa': { city: 'Amadalavalasa', state: 'Andhra Pradesh', lat: 18.4167, lng: 83.9 },
  'Razam': { city: 'Razam', state: 'Andhra Pradesh', lat: 18.45, lng: 83.6667 },
  'Srikakulam': { city: 'Srikakulam', state: 'Andhra Pradesh', lat: 18.2969, lng: 83.8973 },
  'Ravulapalem': { city: 'Ravulapalem', state: 'Andhra Pradesh', lat: 16.7102, lng: 81.8296 },
  'Tuni': { city: 'Tuni', state: 'Andhra Pradesh', lat: 17.3593, lng: 82.5466 },
  'Kolkata': { city: 'Kolkata', state: 'West Bengal', lat: 22.5726, lng: 88.3639 },
  'Raipur': { city: 'Raipur', state: 'Chhattisgarh', lat: 21.2514, lng: 81.6296 },
  'Narasannapeta': { city: 'Narasannapeta', state: 'Andhra Pradesh', lat: 18.4187, lng: 84.0453 },
  'Arasavalli': { city: 'Arasavalli', state: 'Andhra Pradesh', lat: 18.2941, lng: 83.9120 },
  'Lambasingi': { city: 'Lambasingi', state: 'Andhra Pradesh', lat: 18.1035, lng: 82.5763 },
  'Jagdalpur': { city: 'Jagdalpur', state: 'Chhattisgarh', lat: 19.0748, lng: 82.0086 },
  'Bhadrachalam': { city: 'Bhadrachalam', state: 'Telangana', lat: 17.6689, lng: 80.8883 },
  'Bhubaneswar': { city: 'Bhubaneswar', state: 'Odisha', lat: 20.2961, lng: 85.8245 },
  'Bangalore': { city: 'Bangalore', state: 'Karnataka', lat: 12.9716, lng: 77.5946 },
  'Chennai': { city: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lng: 80.2707 },
  'Kurnool': { city: 'Kurnool', state: 'Andhra Pradesh', lat: 15.8281, lng: 78.0373 },
  'Khammam': { city: 'Khammam', state: 'Telangana', lat: 17.2473, lng: 80.1514 },
  'Tirupati': { city: 'Tirupati', state: 'Andhra Pradesh', lat: 13.6288, lng: 79.4192 },
  'Nellore': { city: 'Nellore', state: 'Andhra Pradesh', lat: 14.4426, lng: 79.9865 },
  'Guntur': { city: 'Guntur', state: 'Andhra Pradesh', lat: 16.3067, lng: 80.4365 },
  'Palakollu': { city: 'Palakollu', state: 'Andhra Pradesh', lat: 16.5167, lng: 81.7333 },
  'Eluru': { city: 'Eluru', state: 'Andhra Pradesh', lat: 16.7107, lng: 81.0952 }
};


function getLocationData(name: string) {
  const key = name.trim().replace(/ +/g, ' ');
  if (CITY_LOOKUP[key]) return CITY_LOOKUP[key];
  // Fallback: use name as city, unknown state, lat/lng 0
  return { city: key, state: 'Unknown', lat: 0, lng: 0 };
}

export function OutstationHeroWidget({ initialPickup, initialDrop, onSearch, onStepChange, onEditStart }: OutstationHeroWidgetProps) {
  const location = useLocation();
  const navigate = useNavigate();

  // Parse pickup/drop from URL or query string synchronously
  let pickup = initialPickup;
  let drop = initialDrop;

  if (!pickup || !drop) {
    const searchParams = new URLSearchParams(location.search);
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    if (fromParam && toParam) {
      pickup = fromParam.replace(/\b\w/g, l => l.toUpperCase());
      drop = toParam.replace(/\b\w/g, l => l.toUpperCase());
    } else {
      const pathname = location.pathname;
      const match = pathname.match(/\/outstation-taxi\/([a-zA-Z0-9-]+)-to-([a-zA-Z0-9-]+)/);
      if (match) {
        const fromSlug = match[1];
        const toSlug = match[2];
        pickup = fromSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        drop = toSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      }
    }
  }

  // Redirect to home if drop is not a known city
  React.useEffect(() => {
    if (drop && !CITY_LOOKUP[drop]) {
      navigate('/', { replace: true });
    }
  }, [drop, navigate]);

  // Use a stable key that only changes when pickup/drop change
  const heroKey = useMemo(() => (pickup && drop ? `${pickup}-${drop}` : 'default'), [pickup, drop]);

  // Synchronously set sessionStorage prefill before rendering Hero
  sessionStorage.removeItem('pickupLocation');
  sessionStorage.removeItem('dropLocation');
  sessionStorage.setItem('tripType', 'outstation');
  if (pickup && drop) {
    const pickupData = getLocationData(pickup);
    const dropData = getLocationData(drop);
    const prefillData = {
      pickupLocation: {
        name: pickup,
        address: pickup,
        id: 'prefill-pickup',
        city: pickupData.city,
        state: pickupData.state,
        lat: pickupData.lat,
        lng: pickupData.lng,
        type: 'other' as const,
        popularityScore: 0,
      },
      dropLocation: {
        name: drop,
        address: drop,
        id: 'prefill-drop',
        city: dropData.city,
        state: dropData.state,
        lat: dropData.lat,
        lng: dropData.lng,
        type: 'other' as const,
        popularityScore: 0,
      },
      tripType: 'outstation',
      tripMode: 'one-way',
      autoTriggerSearch: false
    };
    sessionStorage.setItem('routePrefillData', JSON.stringify(prefillData));
  } else {
    sessionStorage.removeItem('routePrefillData');
  }

  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Don't clear immediately, let the Hero component handle the cleanup
      // This prevents race conditions between widget cleanup and Hero initialization
    };
  }, [location.pathname, location.search]);

  return (
    <div>
      <Hero 
        key={`outstation-hero-${pickup || 'none'}-${drop || 'none'}`} 
        onSearch={onSearch} 
        onEditStart={onEditStart}
        onStepChange={onStepChange}
        visibleTabs={['outstation']} 
        hideBackground={true} 
      />
    </div>
  );
} 