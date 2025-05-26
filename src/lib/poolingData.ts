
export const POOLING_LOCATIONS = [
  { id: '1', name: 'Mumbai', type: 'city', latitude: 19.0760, longitude: 72.8777 },
  { id: '2', name: 'Delhi', type: 'city', latitude: 28.7041, longitude: 77.1025 },
  { id: '3', name: 'Bangalore', type: 'city', latitude: 12.9716, longitude: 77.5946 },
  { id: '4', name: 'Pune', type: 'city', latitude: 18.5204, longitude: 73.8567 },
  { id: '5', name: 'Hyderabad', type: 'city', latitude: 17.3850, longitude: 78.4867 },
  { id: '6', name: 'Chennai', type: 'city', latitude: 13.0827, longitude: 80.2707 },
  { id: '7', name: 'Kolkata', type: 'city', latitude: 22.5726, longitude: 88.3639 },
  { id: '8', name: 'Ahmedabad', type: 'city', latitude: 23.0225, longitude: 72.5714 },
  { id: '9', name: 'Jaipur', type: 'city', latitude: 26.9124, longitude: 75.7873 },
  { id: '10', name: 'Lucknow', type: 'city', latitude: 26.8467, longitude: 80.9462 }
];

export const getLocationById = (id: string) => {
  return POOLING_LOCATIONS.find(location => location.id === id);
};

export const RIDE_TYPES = [
  { id: 'car', label: 'Car Pool', icon: '🚗' },
  { id: 'bus', label: 'Bus', icon: '🚌' },
  { id: 'shared-taxi', label: 'Shared Taxi', icon: '🚕' }
];

export const RIDE_STATUSES = [
  { id: 'active', label: 'Active', color: 'bg-green-100 text-green-800' },
  { id: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  { id: 'approved', label: 'Approved', color: 'bg-blue-100 text-blue-800' },
  { id: 'confirmed', label: 'Confirmed', color: 'bg-green-100 text-green-800' },
  { id: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800' },
  { id: 'completed', label: 'Completed', color: 'bg-gray-100 text-gray-800' }
];
