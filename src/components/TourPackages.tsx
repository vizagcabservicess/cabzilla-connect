
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, Star, Users } from 'lucide-react';

interface TourPackage {
  id: string;
  name: string;
  description: string;
  duration: string;
  price: number;
  rating: number;
  image: string;
  highlights: string[];
  includes: string[];
}

const tourPackages: TourPackage[] = [
  {
    id: '1',
    name: 'Araku Valley Getaway',
    description: 'Experience the scenic beauty of Araku Valley with coffee plantations and tribal culture',
    duration: '2 Days / 1 Night',
    price: 15000,
    rating: 4.8,
    image: '/placeholder.svg',
    highlights: ['Borra Caves', 'Coffee Museum', 'Tribal Museum', 'Valley Views'],
    includes: ['Transportation', 'Accommodation', 'Meals', 'Guide']
  },
  {
    id: '2',
    name: 'Vizag Coastal Circuit',
    description: 'Discover the beautiful beaches and coastal attractions of Visakhapatnam',
    duration: '1 Day',
    price: 8000,
    rating: 4.6,
    image: '/placeholder.svg',
    highlights: ['RK Beach', 'Submarine Museum', 'Kailasagiri', 'Rushikonda'],
    includes: ['Transportation', 'Entry Tickets', 'Refreshments']
  },
  {
    id: '3',
    name: 'Lambasingi Snow Point',
    description: 'Visit the Kashmir of Andhra Pradesh and experience cool weather',
    duration: '2 Days / 1 Night',
    price: 12000,
    rating: 4.7,
    image: '/placeholder.svg',
    highlights: ['Lambasingi Village', 'Coffee Plantations', 'Strawberry Gardens'],
    includes: ['Transportation', 'Accommodation', 'Meals', 'Sightseeing']
  }
];

export const TourPackages: React.FC = () => {
  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Popular Tour Packages
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Discover amazing destinations around Visakhapatnam with our carefully curated tour packages
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {tourPackages.map((tour) => (
            <Card key={tour.id} className="overflow-hidden hover:shadow-xl transition-all duration-300 border-0 shadow-md">
              <div className="relative">
                <img 
                  src={tour.image} 
                  alt={tour.name}
                  className="w-full h-48 object-cover"
                />
                <Badge className="absolute top-4 right-4 bg-white text-gray-900">
                  {tour.duration}
                </Badge>
              </div>
              
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">{tour.name}</CardTitle>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-medium">{tour.rating}</span>
                  </div>
                </div>
                <p className="text-gray-600 text-sm">{tour.description}</p>
              </CardHeader>

              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-sm mb-2">Highlights:</h4>
                  <div className="flex flex-wrap gap-1">
                    {tour.highlights.slice(0, 3).map((highlight, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {highlight}
                      </Badge>
                    ))}
                    {tour.highlights.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{tour.highlights.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-sm mb-2">Includes:</h4>
                  <div className="flex flex-wrap gap-1">
                    {tour.includes.map((item, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div>
                    <span className="text-2xl font-bold text-primary">
                      ₹{tour.price.toLocaleString()}
                    </span>
                    <span className="text-gray-500 text-sm block">per person</span>
                  </div>
                  <Button className="bg-primary hover:bg-primary/90">
                    Book Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <Button variant="outline" size="lg">
            View All Tours
          </Button>
        </div>
      </div>
    </section>
  );
};

export default TourPackages;
