
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Clock } from 'lucide-react';

export function PopularRoutes() {
  const routes = [
    {
      destination: "Hyderabad",
      distance: "620 km",
      duration: "8-9 hours",
      startingPrice: "₹8,680",
      description: "Business capital of Telangana"
    },
    {
      destination: "Chennai",
      distance: "780 km", 
      duration: "10-11 hours",
      startingPrice: "₹10,920",
      description: "Gateway to South India"
    },
    {
      destination: "Bangalore",
      distance: "860 km",
      duration: "11-12 hours", 
      startingPrice: "₹12,040",
      description: "Silicon Valley of India"
    },
    {
      destination: "Tirupati",
      distance: "550 km",
      duration: "7-8 hours",
      startingPrice: "₹7,700",
      description: "Holy pilgrimage destination"
    },
    {
      destination: "Vijayawada", 
      distance: "350 km",
      duration: "5-6 hours",
      startingPrice: "₹4,900",
      description: "Commercial hub of Andhra Pradesh"
    },
    {
      destination: "Araku Valley",
      distance: "120 km",
      duration: "3-4 hours",
      startingPrice: "₹1,680",
      description: "Hill station getaway"
    }
  ];

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Popular Outstation Routes</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Explore popular destinations from Visakhapatnam with our reliable outstation taxi services. 
            All prices include driver allowance and toll charges.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {routes.map((route, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow duration-300 cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{route.destination}</h3>
                    <p className="text-sm text-gray-500">{route.description}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-blue-600">{route.startingPrice}</div>
                    <div className="text-xs text-gray-500">starting from</div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    {route.distance}
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    {route.duration}
                  </div>
                </div>
                
                <div className="mt-4 pt-3 border-t">
                  <div className="text-xs text-gray-500">
                    • One-way starting price • Driver allowance included
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            Don't see your destination? <span className="text-blue-600 font-medium">Contact us</span> for custom routes and pricing.
          </p>
        </div>
      </div>
    </section>
  );
}
