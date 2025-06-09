
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, MapPin, Clock, Users, Share2, Mail, Phone } from 'lucide-react';

export function TourPackages() {
  const tours = [
    {
      title: "About Lambasingi Tour",
      subtitle: "Vizag Local Sightseeing",
      description: "A scenic drive from Visakhapatnam will bring you to Vanjangi and Lambasingi, which are about 3400 feet above sea level and about a 3-hour drive from Visakhapatnam, respectively.",
      rating: 4,
      listings: "35 Listings",
      price: "₹8,500",
      duration: "2 Days / 1 Night",
      groupSize: "4-6 People",
      image: "/api/placeholder/400/250",
      highlights: ["Hill Station", "Scenic Views", "Coffee Plantations", "Cool Weather"]
    },
    {
      title: "About Araku Valley Tour", 
      subtitle: "Vizag Local Sightseeing",
      description: "In Araku, an enchanting hill station, you can experience scenic viewpoints, imposing waterfalls, and lush green coffee plantations. Our Vizag to Araku tour by cab will let you experience the great landmarks of the city.",
      rating: 4,
      listings: "35 Listings", 
      price: "₹6,200",
      duration: "1 Day",
      groupSize: "4-6 People",
      image: "/api/placeholder/400/250",
      highlights: ["Coffee Museum", "Tribal Culture", "Valley Views", "Waterfalls"]
    },
    {
      title: "Best Vizag Local Sightseeing Tour Packages",
      subtitle: "Vizag Local Sightseeing", 
      description: "Located in Andhra Pradesh, Vizag has a wealth of attractions that entice tourists from all over. Many tourists come to the city to relax on the beaches and take in its scenic beauty.",
      rating: 4,
      listings: "35 Listings",
      price: "₹4,800", 
      duration: "1 Day",
      groupSize: "4-6 People",
      image: "/api/placeholder/400/250",
      highlights: ["Beaches", "Temples", "Museums", "Local Culture"]
    }
  ];

  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <p className="text-blue-600 font-medium mb-2">THE BEST TOUR PACKAGES</p>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Explore The Top Tourist Attractions</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Discover the beauty of Visakhapatnam and its surroundings with our carefully crafted tour packages. 
            From hill stations to beaches, we cover all the must-visit destinations.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {tours.map((tour, index) => (
            <Card key={index} className="overflow-hidden hover:shadow-xl transition-all duration-300 group">
              <div className="relative h-64 overflow-hidden">
                {/* Placeholder for tour image */}
                <div className="w-full h-full bg-gradient-to-br from-blue-400 to-green-400 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                  <MapPin className="h-16 w-16 text-white opacity-80" />
                </div>
                
                {/* Overlay Content */}
                <div className="absolute top-4 left-4">
                  <Badge className="bg-blue-600 text-white">
                    {tour.listings}
                  </Badge>
                </div>
                
                <div className="absolute top-4 right-4 flex flex-col gap-2">
                  <Button size="sm" variant="secondary" className="w-10 h-10 p-0">
                    <Share2 className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="secondary" className="w-10 h-10 p-0">
                    <Mail className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="absolute bottom-4 left-4">
                  <div className="flex items-center gap-1 text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`h-4 w-4 ${i < tour.rating ? 'fill-current' : ''}`} 
                      />
                    ))}
                    <span className="text-white ml-2 text-sm font-medium">Good</span>
                  </div>
                </div>
              </div>
              
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {tour.title}
                    </h3>
                    <p className="text-sm text-blue-600 font-medium mb-2">
                      {tour.subtitle}
                    </p>
                  </div>
                  <Users className="h-5 w-5 text-blue-600 mt-1" />
                </div>
                
                <p className="text-gray-600 text-sm leading-relaxed mb-4 line-clamp-3">
                  {tour.description}
                </p>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {tour.highlights.map((highlight, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {highlight}
                    </Badge>
                  ))}
                </div>
                
                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{tour.duration}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{tour.groupSize}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-4 border-t">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{tour.price}</div>
                    <div className="text-xs text-gray-500">per tour</div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Phone className="h-4 w-4 mr-1" />
                      Call
                    </Button>
                    <Button className="bg-blue-600 hover:bg-blue-700" size="sm">
                      Book Now
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="text-center mt-8">
          <Button variant="outline" className="px-8 py-3">
            View All Tour Packages
          </Button>
        </div>
      </div>
    </section>
  );
}
