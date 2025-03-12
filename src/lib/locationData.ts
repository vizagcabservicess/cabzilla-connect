
export interface Location {
  id: string;
  name: string;
  city: string;
  state: string;
  type: 'airport' | 'train_station' | 'bus_station' | 'hotel' | 'landmark' | 'other';
  popularityScore: number;
}

export const popularLocations: Location[] = [
  {
    id: 'del_airport',
    name: 'Indira Gandhi International Airport',
    city: 'New Delhi',
    state: 'Delhi',
    type: 'airport',
    popularityScore: 100
  },
  {
    id: 'bom_airport',
    name: 'Chhatrapati Shivaji International Airport',
    city: 'Mumbai',
    state: 'Maharashtra',
    type: 'airport',
    popularityScore: 98
  },
  {
    id: 'blr_airport',
    name: 'Kempegowda International Airport',
    city: 'Bengaluru',
    state: 'Karnataka',
    type: 'airport',
    popularityScore: 95
  },
  {
    id: 'hyd_airport',
    name: 'Rajiv Gandhi International Airport',
    city: 'Hyderabad',
    state: 'Telangana',
    type: 'airport',
    popularityScore: 92
  },
  {
    id: 'ccu_airport',
    name: 'Netaji Subhas Chandra Bose International Airport',
    city: 'Kolkata',
    state: 'West Bengal',
    type: 'airport',
    popularityScore: 90
  },
  {
    id: 'maa_airport',
    name: 'Chennai International Airport',
    city: 'Chennai',
    state: 'Tamil Nadu',
    type: 'airport',
    popularityScore: 88
  },
  {
    id: 'ndls',
    name: 'New Delhi Railway Station',
    city: 'New Delhi',
    state: 'Delhi',
    type: 'train_station',
    popularityScore: 85
  },
  {
    id: 'cstm',
    name: 'Chhatrapati Shivaji Terminus',
    city: 'Mumbai',
    state: 'Maharashtra',
    type: 'train_station',
    popularityScore: 84
  },
  {
    id: 'koramangala',
    name: 'Koramangala',
    city: 'Bengaluru',
    state: 'Karnataka',
    type: 'landmark',
    popularityScore: 82
  },
  {
    id: 'indiranagar',
    name: 'Indiranagar',
    city: 'Bengaluru',
    state: 'Karnataka',
    type: 'landmark',
    popularityScore: 80
  },
  {
    id: 'bandra',
    name: 'Bandra',
    city: 'Mumbai',
    state: 'Maharashtra',
    type: 'landmark',
    popularityScore: 78
  },
  {
    id: 'andheri',
    name: 'Andheri',
    city: 'Mumbai',
    state: 'Maharashtra',
    type: 'landmark',
    popularityScore: 76
  },
  {
    id: 'gurgaon',
    name: 'Gurgaon',
    city: 'Gurgaon',
    state: 'Haryana',
    type: 'landmark',
    popularityScore: 75
  },
  {
    id: 'taj_hotel',
    name: 'Taj Palace Hotel',
    city: 'New Delhi',
    state: 'Delhi',
    type: 'hotel',
    popularityScore: 72
  },
  {
    id: 'leela_palace',
    name: 'The Leela Palace',
    city: 'Bengaluru',
    state: 'Karnataka',
    type: 'hotel',
    popularityScore: 70
  }
];

export const searchLocations = (query: string): Location[] => {
  if (!query || query.length < 2) return [];
  
  const lowerQuery = query.toLowerCase();
  
  return popularLocations
    .filter(
      location => 
        location.name.toLowerCase().includes(lowerQuery) || 
        location.city.toLowerCase().includes(lowerQuery)
    )
    .sort((a, b) => b.popularityScore - a.popularityScore)
    .slice(0, 10);
};

export const getDistanceBetweenLocations = (fromId: string, toId: string): number => {
  // This is a mock function - in a real app this would call a distance API
  // For now, we'll return a random distance between 5-50 km
  return Math.floor(Math.random() * 45) + 5;
};
