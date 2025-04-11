
import { CabType } from '@/types/cab';

// Export the formatPrice function
export function formatPrice(price: number): string {
  return `₹${price.toLocaleString('en-IN')}`;
}

// Define cab types
export const cabTypes: CabType[] = [
  {
    id: 'sedan',
    name: 'Sedan',
    capacity: 4,
    luggageCapacity: 2,
    image: '/images/sedan.jpg',
    amenities: ['AC', 'Music System', 'Water Bottle'],
    description: 'Comfortable sedan for up to 4 passengers',
    ac: true,
    price: 12,
    pricePerKm: 14
  },
  {
    id: 'ertiga',
    name: 'Ertiga',
    capacity: 6,
    luggageCapacity: 3,
    image: '/images/ertiga.jpg',
    amenities: ['AC', 'Music System', 'Water Bottle', 'Extra Legroom'],
    description: 'Spacious SUV for up to 6 passengers',
    ac: true,
    price: 15,
    pricePerKm: 18
  },
  {
    id: 'innova',
    name: 'Innova Crysta',
    capacity: 7,
    luggageCapacity: 4,
    image: '/images/innova.jpg',
    amenities: ['AC', 'Music System', 'Water Bottle', 'Extra Legroom', 'Premium Interior'],
    description: 'Premium SUV for up to 7 passengers with extra comfort',
    ac: true,
    price: 18,
    pricePerKm: 20
  }
];
