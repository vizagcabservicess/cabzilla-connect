
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Car, Users, MapPin, CheckCircle } from 'lucide-react';

export function FleetShowcase() {
  const vehicles = [
    {
      name: "Swift Dzire",
      type: "Sedan",
      passengers: "4 Pax",
      price: "₹14",
      unit: "per KM",
      image: "/api/placeholder/300/200",
      features: ["AC", "GPS", "Music System"],
      description: "Perfect for city rides and short trips",
      category: "Economy",
      minBooking: "Minimum 300 km for outstation"
    },
    {
      name: "Honda Amaze",
      type: "Sedan", 
      passengers: "4 Pax",
      price: "₹14",
      unit: "per KM",
      image: "/api/placeholder/300/200",
      features: ["AC", "GPS", "Comfortable Seats"],
      description: "Reliable and comfortable sedan",
      category: "Economy",
      minBooking: "Minimum 300 km for outstation"
    },
    {
      name: "Maruti Ertiga",
      type: "SUV",
      passengers: "6 Pax",
      price: "₹18",
      unit: "per KM", 
      image: "/api/placeholder/300/200",
      features: ["AC", "GPS", "Extra Space"],
      description: "Spacious SUV for families",
      category: "Premium",
      minBooking: "Minimum 300 km for outstation"
    },
    {
      name: "Toyota Innova Crysta",
      type: "SUV",
      passengers: "7 Pax",
      price: "₹20",
      unit: "per KM",
      image: "/api/placeholder/300/200", 
      features: ["AC", "GPS", "Premium Comfort"],
      description: "Luxury SUV for premium travel",
      category: "Luxury",
      minBooking: "Minimum 300 km for outstation"
    },
    {
      name: "17-Seater Tempo Traveller",
      type: "Tempo Traveller",
      passengers: "17 Pax",
      price: "₹35",
      unit: "per KM",
      image: "/api/placeholder/300/200",
      features: ["AC", "GPS", "Group Travel"],
      description: "Perfect for large groups",
      category: "Group",
      minBooking: "Minimum 300 km for outstation",
      featured: true
    },
    {
      name: "12-Seater Traveller", 
      type: "Tempo Traveller",
      passengers: "12 Pax",
      price: "₹30",
      unit: "per KM",
      image: "/api/placeholder/300/200",
      features: ["AC", "GPS", "Comfortable"],
      description: "Ideal for medium groups",
      category: "Group",
      minBooking: "Minimum 300 km for outstation"
    }
  ];

  const categories = ["All Categories", "Sedan", "SUV", "Tempo Travellers"];

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <p className="text-blue-600 font-medium mb-2">BROWSE OUR WIDE RANGE OF TAXI SERVICES</p>
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Best Cab Services in Vizag</h2>
          
          {/* Category Filter */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {categories.map((category, index) => (
              <Button
                key={index}
                variant={index === 0 ? "default" : "outline"}
                className={`px-6 py-2 rounded-full ${
                  index === 0 
                    ? "bg-blue-600 hover:bg-blue-700 text-white" 
                    : "border-gray-300 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vehicles.map((vehicle, index) => (
            <Card key={index} className="overflow-hidden hover:shadow-lg transition-shadow duration-300 relative">
              {vehicle.featured && (
                <Badge className="absolute top-4 left-4 bg-pink-500 text-white z-10">
                  Featured
                </Badge>
              )}
              
              <div className="relative h-48 bg-gray-100">
                <div className="absolute top-4 right-4 flex gap-2">
                  <Badge variant="outline" className="bg-blue-600 text-white border-blue-600">
                    {vehicle.passengers}
                  </Badge>
                  <Badge variant="outline" className="bg-blue-600 text-white border-blue-600">
                    {vehicle.type}
                  </Badge>
                </div>
                
                {/* Placeholder for vehicle image */}
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                  <Car className="h-20 w-20 text-gray-400" />
                </div>
                
                <div className="absolute bottom-4 left-4 flex items-center text-white">
                  <MapPin className="h-4 w-4 mr-1" />
                  <span className="text-sm">Visakhapatnam</span>
                </div>
              </div>
              
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {vehicle.name}
                      <CheckCircle className="inline h-4 w-4 text-green-500 ml-2" />
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">{vehicle.description}</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mb-4">
                  <div className="text-blue-600">
                    <span className="text-2xl font-bold">{vehicle.price}</span>
                    <span className="text-sm ml-1">/ {vehicle.unit}</span>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {vehicle.features.map((feature, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {feature}
                    </Badge>
                  ))}
                </div>
                
                <p className="text-xs text-gray-500 mb-4">
                  {vehicle.minBooking}
                </p>
                
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                  Book Now
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            All vehicles are regularly sanitized and maintained for your safety and comfort.
          </p>
        </div>
      </div>
    </section>
  );
}
