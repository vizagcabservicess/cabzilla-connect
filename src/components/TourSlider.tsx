
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Users } from 'lucide-react';

interface Tour {
  id: string;
  name: string;
  image: string;
  duration: string;
  locations: string[];
  price: number;
  description: string;
}

const tours: Tour[] = [
  {
    id: '1',
    name: 'Araku Valley Adventure',
    image: '/placeholder.svg',
    duration: '2 Days',
    locations: ['Araku Valley', 'Borra Caves', 'Coffee Plantations'],
    price: 15000,
    description: 'Scenic hill station with coffee plantations and caves'
  },
  {
    id: '2',
    name: 'Vizag Coastal Tour',
    image: '/placeholder.svg',
    duration: '1 Day',
    locations: ['RK Beach', 'Submarine Museum', 'Kailasagiri'],
    price: 8000,
    description: 'Explore the beautiful coastline of Visakhapatnam'
  },
  {
    id: '3',
    name: 'Temple Trail',
    image: '/placeholder.svg',
    duration: '1 Day',
    locations: ['Simhachalam', 'Annavaram', 'Srikakulam'],
    price: 10000,
    description: 'Visit ancient temples and spiritual sites'
  }
];

export const TourSlider: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {tours.map((tour) => (
        <Card key={tour.id} className="overflow-hidden hover:shadow-lg transition-shadow">
          <div className="aspect-video relative overflow-hidden">
            <img 
              src={tour.image} 
              alt={tour.name}
              className="w-full h-full object-cover"
            />
          </div>
          <CardContent className="p-4">
            <h3 className="font-semibold text-lg mb-2">{tour.name}</h3>
            <p className="text-gray-600 text-sm mb-3">{tour.description}</p>
            
            <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{tour.duration}</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                <span>{tour.locations.length} stops</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold text-primary">
                ₹{tour.price.toLocaleString()}
              </div>
              <Button size="sm">Book Now</Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default TourSlider;
