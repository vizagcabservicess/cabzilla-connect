import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Car, Users, MapPin, CheckCircle, Fuel, Star, Shield } from 'lucide-react';

export function FleetShowcase() {
  const vehicles = [
    {
      name: "Swift Dzire",
      type: "Sedan",
      passengers: "4 Pax",
      price: "₹14",
      unit: "per KM",
      rating: 4.5,
      trips: "2,450+ trips",
      features: ["AC", "GPS", "Music System"],
      description: "Perfect for city rides and short trips",
      category: "Economy",
      minBooking: "Minimum 300 km for outstation",
      bgGradient: "from-blue-50 to-indigo-50"
    },
    {
      name: "Honda Amaze",
      type: "Sedan", 
      passengers: "4 Pax",
      price: "₹14",
      unit: "per KM",
      rating: 4.6,
      trips: "1,890+ trips",
      features: ["AC", "GPS", "Comfortable Seats"],
      description: "Reliable and comfortable sedan",
      category: "Economy",
      minBooking: "Minimum 300 km for outstation",
      bgGradient: "from-green-50 to-emerald-50"
    },
    {
      name: "Maruti Ertiga",
      type: "SUV",
      passengers: "6 Pax",
      price: "₹18",
      unit: "per KM",
      rating: 4.4,
      trips: "3,120+ trips",
      features: ["AC", "GPS", "Extra Space"],
      description: "Spacious SUV for families",
      category: "Premium",
      minBooking: "Minimum 300 km for outstation",
      bgGradient: "from-purple-50 to-violet-50"
    },
    {
      name: "Toyota Innova Crysta",
      type: "SUV",
      passengers: "7 Pax",
      price: "₹20",
      unit: "per KM",
      rating: 4.8,
      trips: "5,680+ trips",
      features: ["AC", "GPS", "Premium Comfort"],
      description: "Luxury SUV for premium travel",
      category: "Luxury",
      minBooking: "Minimum 300 km for outstation",
      bgGradient: "from-orange-50 to-amber-50",
      featured: true
    },
    {
      name: "17-Seater Tempo Traveller",
      type: "Tempo Traveller",
      passengers: "17 Pax",
      price: "₹35",
      unit: "per KM",
      rating: 4.3,
      trips: "890+ trips",
      features: ["AC", "GPS", "Group Travel"],
      description: "Perfect for large groups",
      category: "Group",
      minBooking: "Minimum 300 km for outstation",
      bgGradient: "from-red-50 to-rose-50"
    },
    {
      name: "12-Seater Traveller", 
      type: "Tempo Traveller",
      passengers: "12 Pax",
      price: "₹30",
      unit: "per KM",
      rating: 4.2,
      trips: "1,250+ trips",
      features: ["AC", "GPS", "Comfortable"],
      description: "Ideal for medium groups",
      category: "Group",
      minBooking: "Minimum 300 km for outstation",
      bgGradient: "from-teal-50 to-cyan-50"
    }
  ];

  const categories = ["All Categories", "Sedan", "SUV", "Tempo Travellers"];

  return (
    <section className="px-4 py-6 md:py-12 bg-gray-50">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-6 md:mb-10">
          <div className="inline-flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-full mb-4">
            <Car className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-600">OUR FLEET</span>
          </div>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 leading-tight">
            Choose Your Perfect Ride
          </h2>
          <p className="text-gray-600 text-sm md:text-base max-w-2xl mx-auto leading-relaxed mb-6">
            From economy to luxury, find the perfect vehicle for your journey with our well-maintained fleet.
          </p>
          
          {/* Category Filter */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {categories.map((category, index) => (
              <Button
                key={index}
                variant={index === 0 ? "default" : "outline"}
                size="sm"
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  index === 0 
                    ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md" 
                    : "border-gray-200 text-gray-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
                }`}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {/* Vehicles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {vehicles.map((vehicle, index) => (
            <Card key={index} className="group hover:shadow-2xl transition-all duration-300 border-0 bg-white rounded-3xl overflow-hidden relative">
              {vehicle.featured && (
                <div className="absolute top-4 left-4 z-10">
                  <Badge className="bg-gradient-to-r from-pink-500 to-rose-500 text-white border-0 px-3 py-1 rounded-full text-xs font-medium">
                    ⭐ Popular
                  </Badge>
                </div>
              )}
              
              {/* Vehicle Image Section */}
              <div className={`relative h-40 md:h-48 bg-gradient-to-br ${vehicle.bgGradient} p-6`}>
                <div className="absolute top-4 right-4 flex flex-col gap-2">
                  <Badge variant="outline" className="bg-white/90 text-blue-600 border-blue-200 text-xs font-medium">
                    <Users className="h-3 w-3 mr-1" />
                    {vehicle.passengers}
                  </Badge>
                  <Badge variant="outline" className="bg-white/90 text-blue-600 border-blue-200 text-xs font-medium">
                    {vehicle.type}
                  </Badge>
                </div>
                
                {/* Vehicle Icon */}
                <div className="flex items-center justify-center h-full">
                  <div className="w-20 h-20 md:w-24 md:h-24 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <Car className="h-10 w-10 md:h-12 md:w-12 text-gray-700" />
                  </div>
                </div>
                
                <div className="absolute bottom-4 left-4 flex items-center text-gray-700">
                  <MapPin className="h-4 w-4 mr-1" />
                  <span className="text-sm font-medium">Visakhapatnam</span>
                </div>
              </div>
              
              <CardContent className="p-5 md:p-6">
                {/* Vehicle Info */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="text-base font-medium text-gray-900">{vehicle.name}</div>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{vehicle.description}</p>
                    
                    {/* Rating and Trips */}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">{vehicle.rating}</span>
                      </div>
                      <span>{vehicle.trips}</span>
                    </div>
                  </div>
                </div>
                
                {/* Pricing */}
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-blue-50 px-4 py-2 rounded-xl">
                    <span className="text-base font-medium text-blue-600">{vehicle.price}</span>
                    <span className="text-sm text-blue-500 ml-1">/ {vehicle.unit}</span>
                  </div>
                  <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-200 text-xs">
                    {vehicle.category}
                  </Badge>
                </div>
                
                {/* Features */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {vehicle.features.map((feature, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs bg-gray-50 text-gray-600 border-gray-200">
                      {feature}
                    </Badge>
                  ))}
                </div>
                
                {/* Minimum Booking Info */}
                <p className="text-xs text-gray-500 mb-4 bg-gray-50 p-2 rounded-lg">
                  ℹ️ {vehicle.minBooking}
                </p>
                
                {/* Book Button */}
                <Button className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl py-3 font-medium shadow-lg hover:shadow-xl transition-all">
                  Book Now
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bottom Info */}
        <div className="text-center mt-8 bg-white rounded-2xl p-6">
          <div className="flex items-center justify-center gap-2 text-green-600 mb-2">
            <Shield className="h-5 w-5" />
            <span className="font-medium">Safety Guaranteed</span>
          </div>
          <p className="text-sm text-gray-500">
            All vehicles are regularly sanitized and maintained for your safety and comfort.
          </p>
        </div>
      </div>
    </section>
  );
}
