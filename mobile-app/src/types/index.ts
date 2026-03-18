// API types - same structure as web app
export interface Location {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  type: 'airport' | 'train_station' | 'bus_station' | 'hotel' | 'landmark' | 'other';
  popularityScore: number;
  isInVizag?: boolean;
}

export interface BookingRequest {
  pickupLocation: string;
  dropLocation?: string;
  pickupDate: string;
  pickupTime?: string;
  returnDate?: string;
  tripType: string;
  tripMode?: string;
  vehicleType: string;
  cabType?: string;
  passengerName: string;
  passengerPhone: string;
  passengerCountryCode?: string;
  passengerEmail: string;
  additionalRequirements?: string;
  distance?: number;
  totalAmount?: number;
  hourlyPackage?: string | null;
}

export type TripType = 'outstation' | 'local' | 'airport' | 'tour';
export type TripMode = 'one-way' | 'round-trip';
