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
    lng: 83.2248 
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
    lng: 83.2248 
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
    lng: 83.2248 
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
    lng: 83.3162
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
    lng: 83.2248 
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
    lng: 83.2248 
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
    lng: 83.1385
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
    lng: 83.2248 
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
    lng: 83.2248 
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
    lng: 83.2248 
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
    lng: 83.2248 
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
    lng: 83.2248 
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
    lng: 83.2248 
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
    lng: 83.2248 
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
    lng: 83.2248 
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
    lng: 83.2248 
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
    lng: 83.2248 
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
    lng: 83.2248 
  }
];

export const popularLocations: Location[] = [
];

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
      loc.isPickupLocation !== false && 
      (loc.city === 'Visakhapatnam' || loc.isPickupLocation)
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
