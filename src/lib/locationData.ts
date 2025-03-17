
export interface Location {
  id: string;
  name: string;
  city: string;
  state: string;
  lat: number;
  lng: number; 
  type: 'airport' | 'train_station' | 'bus_station' | 'hotel' | 'landmark' | 'other';
  popularityScore: number;
  isPickupLocation?: boolean;
  isDropLocation?: boolean;
  isInVizag?: boolean; // Added this property
  address: string;
}

export const vizagLocations: Location[] = [
  {
    id: 'vizag_rtc',
    name: 'Vizag RTC Complex',
    city: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    type: 'bus_station',
    popularityScore: 95,
    isPickupLocation: true,
    lat: 17.7215, 
    lng: 83.2248,
    address: 'Vizag RTC Complex, Visakhapatnam'
  },
  {
    id: 'vizag_railway',
    name: 'Visakhapatnam Railway Station',
    city: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    type: 'train_station',
    popularityScore: 98,
    isPickupLocation: true,
    lat: 17.7215, 
    lng: 83.2248,
    address: 'Visakhapatnam Railway Station, Visakhapatnam'
  },
  {
    id: 'vizag_airport',
    name: 'Visakhapatnam International Airport',
    city: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    type: 'airport',
    popularityScore: 99,
    isPickupLocation: true,
    lat: 17.7215, 
    lng: 83.2248,
    address: 'Visakhapatnam International Airport, Visakhapatnam'
  },
  {
    id: 'rk_beach',
    name: 'RK Beach',
    city: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    type: 'landmark',
    popularityScore: 92,
    isPickupLocation: true,
    lat: 17.7175,
    lng: 83.3162,
    address: 'RK Beach, Visakhapatnam'
  },
  {
    id: 'jagadamba_junction',
    name: 'Jagadamba Junction',
    city: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    type: 'landmark',
    popularityScore: 90,
    isPickupLocation: true,
    lat: 17.7215, 
    lng: 83.2248,
    address: 'Jagadamba Junction, Visakhapatnam'
  },
  {
    id: 'mvp_colony',
    name: 'MVP Colony',
    city: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    type: 'landmark',
    popularityScore: 88,
    isPickupLocation: true,
    lat: 17.7215, 
    lng: 83.2248,
    address: 'MVP Colony, Visakhapatnam'
  },
  {
    id: 'gajuwaka',
    name: 'Gajuwaka',
    city: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    type: 'landmark',
    popularityScore: 85,
    isPickupLocation: true,
    lat: 17.7337,
    lng: 83.1385,
    address: 'Gajuwaka, Visakhapatnam'
  },
  {
    id: 'nad_junction',
    name: 'NAD Junction',
    city: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    type: 'landmark',
    popularityScore: 83,
    isPickupLocation: true,
    lat: 17.7215, 
    lng: 83.2248,
    address: 'NAD Junction, Visakhapatnam'
  }
];

export const apDestinations: Location[] = [
  {
    id: 'araku_valley',
    name: 'Araku Valley',
    city: 'Araku Valley',
    state: 'Andhra Pradesh',
    type: 'landmark',
    popularityScore: 95,
    isDropLocation: true,
    lat: 17.7215, 
    lng: 83.2248,
    address: 'Araku Valley, Andhra Pradesh'
  },
  {
    id: 'srikakulam',
    name: 'Srikakulam',
    city: 'Srikakulam',
    state: 'Andhra Pradesh',
    type: 'landmark',
    popularityScore: 88,
    isDropLocation: true,
    lat: 17.7215, 
    lng: 83.2248,
    address: 'Srikakulam, Andhra Pradesh'
  },
  {
    id: 'rajahmundry',
    name: 'Rajahmundry',
    city: 'Rajahmundry',
    state: 'Andhra Pradesh',
    type: 'landmark',
    popularityScore: 90,
    isDropLocation: true,
    lat: 17.7215, 
    lng: 83.2248,
    address: 'Rajahmundry, Andhra Pradesh'
  },
  {
    id: 'vijayawada',
    name: 'Vijayawada',
    city: 'Vijayawada',
    state: 'Andhra Pradesh',
    type: 'landmark',
    popularityScore: 92,
    isDropLocation: true,
    lat: 17.7215, 
    lng: 83.2248,
    address: 'Vijayawada, Andhra Pradesh'
  },
  {
    id: 'tirupati',
    name: 'Tirupati',
    city: 'Tirupati',
    state: 'Andhra Pradesh',
    type: 'landmark',
    popularityScore: 94,
    isDropLocation: true,
    lat: 17.7215, 
    lng: 83.2248,
    address: 'Tirupati, Andhra Pradesh'
  },
  {
    id: 'kakinada',
    name: 'Kakinada',
    city: 'Kakinada',
    state: 'Andhra Pradesh',
    type: 'landmark',
    popularityScore: 87,
    isDropLocation: true,
    lat: 17.7215, 
    lng: 83.2248,
    address: 'Kakinada, Andhra Pradesh'
  },
  {
    id: 'guntur',
    name: 'Guntur',
    city: 'Guntur',
    state: 'Andhra Pradesh',
    type: 'landmark',
    popularityScore: 89,
    isDropLocation: true,
    lat: 17.7215, 
    lng: 83.2248,
    address: 'Guntur, Andhra Pradesh'
  },
  {
    id: 'ongole',
    name: 'Ongole',
    city: 'Ongole',
    state: 'Andhra Pradesh',
    type: 'landmark',
    popularityScore: 83,
    isDropLocation: true,
    lat: 17.7215, 
    lng: 83.2248,
    address: 'Ongole, Andhra Pradesh'
  },
  {
    id: 'kadapa',
    name: 'Kadapa',
    city: 'Kadapa',
    state: 'Andhra Pradesh',
    type: 'landmark',
    popularityScore: 82,
    isDropLocation: true,
    lat: 17.7215, 
    lng: 83.2248,
    address: 'Kadapa, Andhra Pradesh'
  },
  {
    id: 'nellore',
    name: 'Nellore',
    city: 'Nellore',
    state: 'Andhra Pradesh',
    type: 'landmark',
    popularityScore: 84,
    isDropLocation: true,
    lat: 17.7215, 
    lng: 83.2248,
    address: 'Nellore, Andhra Pradesh'
  }
];

export const popularLocations: Location[] = [
  ...vizagLocations,
  ...apDestinations
];

// Helper function to check if a location is within Visakhapatnam
export const isVizagLocation = (location: Location): boolean => {
  if (!location) return false;
  
  // Check if isInVizag is already set
  if (location.isInVizag !== undefined) {
    return location.isInVizag;
  }
  
  return location.city.toLowerCase() === 'visakhapatnam' || 
         location.name.toLowerCase().includes('visakhapatnam') ||
         location.name.toLowerCase().includes('vizag') ||
         // Check against known Vizag area IDs
         vizagLocations.some(vizagLoc => vizagLoc.id === location.id);
};

// Check if both pickup and drop locations are within Visakhapatnam
export const areBothLocationsInVizag = (pickup: Location | null, drop: Location | null): boolean => {
  if (!pickup || !drop) return false;
  return isVizagLocation(pickup) && isVizagLocation(drop);
};

export const searchLocations = (query: string, isPickup: boolean = false): Location[] => {
  if (!query || query.length < 2) {
    if (isPickup) {
      return vizagLocations.sort((a, b) => b.popularityScore - a.popularityScore);
    }
    if (!isPickup) {
      return apDestinations.sort((a, b) => b.popularityScore - a.popularityScore);
    }
    return [];
  }
  
  const lowerQuery = query.toLowerCase();
  
  let filteredLocations = popularLocations.filter(
    location => 
      location.name.toLowerCase().includes(lowerQuery) || 
      location.city.toLowerCase().includes(lowerQuery)
  );
  
  if (isPickup) {
    filteredLocations = filteredLocations.filter(loc => 
      isVizagLocation(loc) && loc.isPickupLocation !== false
    );
  } else {
    filteredLocations = filteredLocations.filter(loc => 
      loc.isDropLocation !== false
    );
  }
  
  return filteredLocations
    .sort((a, b) => b.popularityScore - a.popularityScore)
    .slice(0, 10);
};

// Updated distance calculation with consistent values
export const getDistanceBetweenLocations = (fromId: string, toId: string): number => {
  const distances: Record<string, Record<string, number>> = {
    'vizag_airport': {
      'araku_valley': 115,
      'srikakulam': 125,
      'rajahmundry': 190,
      'vijayawada': 350,
      'tirupati': 790,
      'kakinada': 170,
      'guntur': 370,
      'ongole': 460,
      'kadapa': 660,
      'nellore': 590
    },
    'vizag_railway': {
      'araku_valley': 112,
      'srikakulam': 120,
      'rajahmundry': 185,
      'vijayawada': 345,
      'tirupati': 785,
      'kakinada': 165,
      'guntur': 365,
      'ongole': 455,
      'kadapa': 655,
      'nellore': 585
    },
    'vizag_rtc': {
      'araku_valley': 110,
      'srikakulam': 118,
      'rajahmundry': 183,
      'vijayawada': 343,
      'tirupati': 783,
      'kakinada': 163,
      'guntur': 363,
      'ongole': 453,
      'kadapa': 653,
      'nellore': 583
    }
  };
  
  if (distances[fromId] && distances[fromId][toId]) {
    return distances[fromId][toId];
  }
  
  if (fromId.includes('vizag') && toId.includes('vizag')) {
    return Math.floor(Math.random() * 20) + 5;
  }
  
  return Math.floor(Math.random() * 700) + 100;
};

// Calculate airport transfer fare based on distance and cab type
export const calculateAirportFare = (cabType: string, distance: number): number => {
  // Pricing tiers based on distance to/from airport
  if (cabType.toLowerCase() === 'sedan') {
    if (distance <= 15) return 840;
    if (distance <= 20) return 1000;
    if (distance <= 30) return 1200;
    if (distance <= 35) return 1500;
    return 1500 + (distance - 35) * 14; // Additional KM at ₹14/km
  } 
  else if (cabType.toLowerCase() === 'ertiga') {
    if (distance <= 15) return 1200;
    if (distance <= 20) return 1500;
    if (distance <= 30) return 1800;
    if (distance <= 35) return 2100;
    return 2100 + (distance - 35) * 18; // Additional KM at ₹18/km
  }
  else if (cabType.toLowerCase() === 'innova crysta') {
    if (distance <= 15) return 1500;
    if (distance <= 20) return 1800;
    if (distance <= 30) return 2100;
    if (distance <= 35) return 2500;
    return 2500 + (distance - 35) * 20; // Additional KM at ₹20/km
  }
  
  // Default fallback
  return distance * 20;
};

export const getEstimatedTravelTime = (distance: number): number => {
  const averageSpeed = 55;
  return Math.ceil((distance / averageSpeed) * 60);
};

export const formatTravelTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) {
    return `${mins} min`;
  } else if (mins === 0) {
    return `${hours} hr`;
  } else {
    return `${hours} hr ${mins} min`;
  }
};
