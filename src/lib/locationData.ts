export interface Location {
  id: string;
  name: string;
  city: string;
  state: string;
  lat: number;
  lng: number; 
  type: 'airport' | 'train_station' | 'bus_station' | 'hotel' | 'landmark' | 'other' | 'custom';
  popularityScore: number;
  isPickupLocation?: boolean;
  isDropLocation?: boolean;
  isInVizag?: boolean;
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
    address: 'Vizag RTC Complex, Visakhapatnam',
    isInVizag: true
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
    address: 'Visakhapatnam Railway Station, Visakhapatnam',
    isInVizag: true
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
    address: 'Visakhapatnam International Airport, Visakhapatnam',
    isInVizag: true
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
    address: 'RK Beach, Visakhapatnam',
    isInVizag: true
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
    address: 'Jagadamba Junction, Visakhapatnam',
    isInVizag: true
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
    address: 'MVP Colony, Visakhapatnam',
    isInVizag: true
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
    address: 'Gajuwaka, Visakhapatnam',
    isInVizag: true
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
    address: 'NAD Junction, Visakhapatnam',
    isInVizag: true
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
    lat: 18.3273, 
    lng: 82.8695,
    address: 'Araku Valley, Andhra Pradesh',
    isInVizag: false
  },
  {
    id: 'srikakulam',
    name: 'Srikakulam',
    city: 'Srikakulam',
    state: 'Andhra Pradesh',
    type: 'landmark',
    popularityScore: 88,
    isDropLocation: true,
    lat: 18.2949, 
    lng: 83.8938,
    address: 'Srikakulam, Andhra Pradesh',
    isInVizag: false
  },
  {
    id: 'rajahmundry',
    name: 'Rajahmundry',
    city: 'Rajahmundry',
    state: 'Andhra Pradesh',
    type: 'landmark',
    popularityScore: 90,
    isDropLocation: true,
    lat: 16.9891, 
    lng: 81.7840,
    address: 'Rajahmundry, Andhra Pradesh',
    isInVizag: false
  },
  {
    id: 'vijayawada',
    name: 'Vijayawada',
    city: 'Vijayawada',
    state: 'Andhra Pradesh',
    type: 'landmark',
    popularityScore: 92,
    isDropLocation: true,
    lat: 16.5062, 
    lng: 80.6480,
    address: 'Vijayawada, Andhra Pradesh',
    isInVizag: false
  },
  {
    id: 'tirupati',
    name: 'Tirupati',
    city: 'Tirupati',
    state: 'Andhra Pradesh',
    type: 'landmark',
    popularityScore: 94,
    isDropLocation: true,
    lat: 13.6288, 
    lng: 79.4192,
    address: 'Tirupati, Andhra Pradesh',
    isInVizag: false
  },
  {
    id: 'kakinada',
    name: 'Kakinada',
    city: 'Kakinada',
    state: 'Andhra Pradesh',
    type: 'landmark',
    popularityScore: 87,
    isDropLocation: true,
    lat: 16.9891, 
    lng: 82.2475,
    address: 'Kakinada, Andhra Pradesh',
    isInVizag: false
  },
  {
    id: 'guntur',
    name: 'Guntur',
    city: 'Guntur',
    state: 'Andhra Pradesh',
    type: 'landmark',
    popularityScore: 89,
    isDropLocation: true,
    lat: 16.3067, 
    lng: 80.4365,
    address: 'Guntur, Andhra Pradesh',
    isInVizag: false
  },
  {
    id: 'hyderabad',
    name: 'Hyderabad',
    city: 'Hyderabad',
    state: 'Telangana',
    type: 'landmark',
    popularityScore: 96,
    isDropLocation: true,
    lat: 17.3850,
    lng: 78.4867,
    address: 'Hyderabad, Telangana',
    isInVizag: false
  },
  {
    id: 'bangalore',
    name: 'Bangalore',
    city: 'Bangalore',
    state: 'Karnataka',
    type: 'landmark',
    popularityScore: 97,
    isDropLocation: true,
    lat: 12.9716,
    lng: 77.5946,
    address: 'Bangalore, Karnataka',
    isInVizag: false
  },
  {
    id: 'chennai',
    name: 'Chennai',
    city: 'Chennai',
    state: 'Tamil Nadu',
    type: 'landmark',
    popularityScore: 95,
    isDropLocation: true,
    lat: 13.0827,
    lng: 80.2707,
    address: 'Chennai, Tamil Nadu',
    isInVizag: false
  }
];

export const popularLocations: Location[] = [
  ...vizagLocations,
  ...apDestinations
];

export const isVizagLocation = (location: Location): boolean => {
  if (!location) return false;
  
  if (location.isInVizag !== undefined) {
    return location.isInVizag;
  }
  
  if (location.city?.toLowerCase() === 'visakhapatnam' || 
      location.name?.toLowerCase().includes('visakhapatnam') ||
      location.name?.toLowerCase().includes('vizag')) {
    return true;
  }
  
  if (vizagLocations.some(vizagLoc => vizagLoc.id === location.id)) {
    return true;
  }
  
  if (location.lat && location.lng) {
    const vizagCenter = { lat: 17.6868, lng: 83.2185 };
    const distance = getDistanceFromLatLonInKm(
      location.lat, 
      location.lng, 
      vizagCenter.lat, 
      vizagCenter.lng
    );
    return distance <= 25;
  }
  
  return false;
};

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const d = R * c;
  return d;
}

function deg2rad(deg: number) {
  return deg * (Math.PI/180);
}

export const areBothLocationsInVizag = (pickup: Location | null, drop: Location | null): boolean => {
  if (!pickup || !drop) return false;
  return isVizagLocation(pickup) && isVizagLocation(drop);
};

export const searchLocations = (query: string, isPickup: boolean = false): Location[] => {
  if (!query || query.length < 2) {
    if (isPickup) {
      return vizagLocations.sort((a, b) => b.popularityScore - a.popularityScore);
    }
    return popularLocations.sort((a, b) => b.popularityScore - a.popularityScore);
  }
  
  const lowerQuery = query.toLowerCase();
  
  let filteredLocations = popularLocations.filter(
    location => 
      location.name.toLowerCase().includes(lowerQuery) || 
      location.city.toLowerCase().includes(lowerQuery) ||
      location.address.toLowerCase().includes(lowerQuery)
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
      'nellore': 590,
      'hyderabad': 610,
      'bangalore': 995,
      'chennai': 780
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
      'nellore': 585,
      'hyderabad': 605,
      'bangalore': 990,
      'chennai': 775
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
      'nellore': 583,
      'hyderabad': 603,
      'bangalore': 988,
      'chennai': 773
    }
  };
  
  if (distances[fromId] && distances[fromId][toId]) {
    return distances[fromId][toId];
  }
  
  if (fromId.includes('vizag') && toId.includes('vizag')) {
    return Math.floor(Math.random() * 20) + 5;
  }
  
  const fromLocation = [...vizagLocations, ...apDestinations].find(loc => loc.id === fromId);
  const toLocation = [...vizagLocations, ...apDestinations].find(loc => loc.id === toId);
  
  if (fromLocation && toLocation && fromLocation.lat && toLocation.lat) {
    return Math.round(
      getDistanceFromLatLonInKm(
        fromLocation.lat, 
        fromLocation.lng, 
        toLocation.lat, 
        toLocation.lng
      )
    );
  }
  
  if (toId.includes('bangalore')) return 995;
  if (toId.includes('hyderabad')) return 610;
  if (toId.includes('chennai')) return 780;
  if (toId.includes('mumbai')) return 1200;
  if (toId.includes('delhi')) return 1800;
  if (toId.includes('kolkata')) return 850;
  
  return Math.floor(Math.random() * 500) + 100;
};

export const calculateAirportFare = (cabType: string, distance: number): number => {
  if (cabType.toLowerCase() === 'sedan') {
    if (distance <= 15) return 840;
    if (distance <= 20) return 1000;
    if (distance <= 30) return 1200;
    if (distance <= 35) return 1500;
    return 1500 + (distance - 35) * 14;
  } 
  else if (cabType.toLowerCase() === 'ertiga') {
    if (distance <= 15) return 1200;
    if (distance <= 20) return 1500;
    if (distance <= 30) return 1800;
    if (distance <= 35) return 2100;
    return 2100 + (distance - 35) * 18;
  }
  else if (cabType.toLowerCase() === 'innova crysta') {
    if (distance <= 15) return 1500;
    if (distance <= 20) return 1800;
    if (distance <= 30) return 2100;
    if (distance <= 35) return 2500;
    return 2500 + (distance - 35) * 20;
  }
  
  return distance * 20;
};

export const getEstimatedTravelTime = (distance: number): number => {
  if (distance > 100) {
    const averageSpeed = 55;
    return Math.ceil((distance / averageSpeed) * 60);
  }
  
  const averageSpeed = 35;
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
