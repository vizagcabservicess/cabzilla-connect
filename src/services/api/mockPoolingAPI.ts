import { PoolingRide, PoolingType, PoolingSearchRequest, CreateRideRequest } from '@/types/pooling';

// Mock data - replace with actual API calls
let mockRides: PoolingRide[] = [
  {
    id: 1,
    type: 'car',
    providerId: 101,
    providerName: 'John Doe',
    providerPhone: '123-456-7890',
    providerRating: 4.5,
    fromLocation: 'Vizag',
    toLocation: 'Vijayawada',
    departureTime: '2024-07-15T08:00:00',
    arrivalTime: '2024-07-15T12:00:00',
    totalSeats: 4,
    availableSeats: 2,
    pricePerSeat: 400,
    vehicleInfo: {
      make: 'Maruti',
      model: 'Swift',
      color: 'White',
      plateNumber: 'AP 31 AB 1234'
    },
    route: ['Anakapalle', 'Tuni', 'Rajahmundry'],
    amenities: ['AC', 'Music', 'Charging'],
    rules: ['No smoking', 'No pets'],
    status: 'active',
    createdAt: '2024-07-01T10:00:00',
    updatedAt: '2024-07-01T10:00:00'
  },
  {
    id: 2,
    type: 'bus',
    providerId: 102,
    providerName: 'Orange Travels',
    providerPhone: '040-123456',
    providerRating: 4.2,
    fromLocation: 'Hyderabad',
    toLocation: 'Bangalore',
    departureTime: '2024-07-20T18:00:00',
    arrivalTime: '2024-07-21T06:00:00',
    totalSeats: 40,
    availableSeats: 15,
    pricePerSeat: 1200,
    vehicleInfo: {
      busNumber: 'TS 09 AZ 5678',
      busType: 'AC Sleeper',
      totalSeats: 40,
      amenities: ['AC', 'Water Bottle', 'Blanket']
    },
    route: ['Kurnool', 'Anantapur'],
    amenities: ['AC', 'Water Bottle', 'Blanket', 'WiFi'],
    rules: ['No smoking'],
    status: 'active',
    createdAt: '2024-07-05T14:00:00',
    updatedAt: '2024-07-05T14:00:00'
  },
  {
    id: 3,
    type: 'shared-taxi',
    providerId: 103,
    providerName: 'Uber',
    providerPhone: '080-987654',
    providerRating: 4.8,
    fromLocation: 'Chennai',
    toLocation: 'Pondicherry',
    departureTime: '2024-07-22T10:00:00',
    arrivalTime: '2024-07-22T13:00:00',
    totalSeats: 6,
    availableSeats: 3,
    pricePerSeat: 500,
    vehicleInfo: {
      make: 'Toyota',
      model: 'Innova',
      color: 'Silver',
      plateNumber: 'TN 01 HG 9012'
    },
    route: ['Mahabalipuram', 'ECR'],
    amenities: ['AC', 'Music'],
    rules: ['No luggage'],
    status: 'active',
    createdAt: '2024-07-10T09:00:00',
    updatedAt: '2024-07-10T09:00:00'
  },
  {
    id: 4,
    type: 'car',
    providerId: 104,
    providerName: 'Ramesh Kumar',
    providerPhone: '789-012-3456',
    providerRating: 4.6,
    fromLocation: 'Mumbai',
    toLocation: 'Pune',
    departureTime: '2024-07-25T07:30:00',
    arrivalTime: '2024-07-25T11:00:00',
    totalSeats: 4,
    availableSeats: 1,
    pricePerSeat: 600,
    vehicleInfo: {
      make: 'Hyundai',
      model: 'i20',
      color: 'Blue',
      plateNumber: 'MH 04 XY 5678'
    },
    route: ['Lonavala', 'Khandala'],
    amenities: ['AC', 'Music', 'Charging'],
    rules: ['No smoking', 'Limited luggage'],
    status: 'active',
    createdAt: '2024-07-12T11:00:00',
    updatedAt: '2024-07-12T11:00:00'
  },
  {
    id: 5,
    type: 'bus',
    providerId: 105,
    providerName: 'SRS Travels',
    providerPhone: '080-234567',
    providerRating: 4.3,
    fromLocation: 'Bangalore',
    toLocation: 'Goa',
    departureTime: '2024-07-28T16:00:00',
    arrivalTime: '2024-07-29T06:00:00',
    totalSeats: 45,
    availableSeats: 20,
    pricePerSeat: 1500,
    vehicleInfo: {
      busNumber: 'KA 01 BC 3456',
      busType: 'AC Sleeper',
      totalSeats: 45,
      amenities: ['AC', 'Water Bottle', 'Blanket']
    },
    route: ['Hubli', 'Belgaum'],
    amenities: ['AC', 'Water Bottle', 'Blanket', 'WiFi', 'TV'],
    rules: ['No smoking'],
    status: 'active',
    createdAt: '2024-07-15T15:00:00',
    updatedAt: '2024-07-15T15:00:00'
  },
  {
    id: 6,
    type: 'shared-taxi',
    providerId: 106,
    providerName: 'Ola Share',
    providerPhone: '044-876543',
    providerRating: 4.7,
    fromLocation: 'Kolkata',
    toLocation: 'Digha',
    departureTime: '2024-07-30T09:00:00',
    arrivalTime: '2024-07-30T13:00:00',
    totalSeats: 7,
    availableSeats: 4,
    pricePerSeat: 450,
    vehicleInfo: {
      make: 'Tata',
      model: 'Sumo',
      color: 'Yellow',
      plateNumber: 'WB 02 AB 6789'
    },
    route: ['Haldia', 'Contai'],
    amenities: ['AC', 'Music'],
    rules: ['Limited luggage'],
    status: 'active',
    createdAt: '2024-07-18T10:00:00',
    updatedAt: '2024-07-18T10:00:00'
  }
];

export const searchRides = async (request: PoolingSearchRequest): Promise<PoolingRide[]> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));

  let results = mockRides.filter(ride =>
    ride.type === request.type &&
    ride.fromLocation.toLowerCase().includes(request.from.toLowerCase()) &&
    ride.toLocation.toLowerCase().includes(request.to.toLowerCase()) &&
    new Date(ride.departureTime) >= new Date(request.date) &&
    ride.availableSeats >= request.passengers
  );

  if (request.maxPrice) {
    results = results.filter(ride => ride.pricePerSeat <= request.maxPrice!);
  }

  if (request.sortBy === 'price') {
    results.sort((a, b) => a.pricePerSeat - b.pricePerSeat);
  } else if (request.sortBy === 'time') {
    results.sort((a, b) => new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime());
  } else if (request.sortBy === 'rating') {
    results.sort((a, b) => b.providerRating! - a.providerRating!);
  }

  return results;
};

export const getRideById = async (id: number): Promise<PoolingRide | undefined> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));
  return mockRides.find(ride => ride.id === id);
};

export const createRide = async (request: CreateRideRequest): Promise<PoolingRide> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));

  const newId = mockRides.length > 0 ? Math.max(...mockRides.map(ride => ride.id)) + 1 : 1;

  const newRide: PoolingRide = {
    id: newId,
    type: request.type,
    providerId: 107, // Mock provider ID
    providerName: 'New Provider', // Mock provider name
    providerPhone: '999-999-9999', // Mock provider phone
    providerRating: 4.0, // Mock provider rating
    fromLocation: request.fromLocation,
    toLocation: request.toLocation,
    departureTime: request.departureTime,
    arrivalTime: new Date(new Date(request.departureTime).getTime() + 3 * 60 * 60 * 1000).toISOString(), // Mock arrival time (3 hours later)
    totalSeats: request.totalSeats,
    availableSeats: request.totalSeats,
    pricePerSeat: request.pricePerSeat,
    vehicleInfo: {
      make: request.vehicleInfo.make || 'Unknown',
      model: request.vehicleInfo.model || 'Unknown',
      color: request.vehicleInfo.color || 'Unknown',
      plateNumber: request.vehicleInfo.plateNumber || 'Unknown'
    },
    route: request.route || [], // Ensure route is always provided
    amenities: request.amenities || [],
    rules: request.rules || [],
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  mockRides.push(newRide);
  return newRide;
};
