import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Clock, TrendingUp, Star } from 'lucide-react';

export function PopularRoutes() {
  const routes = [
    {
      destination: "Hyderabad",
      distance: "620 km",
      duration: "8-9 hours",
      startingPrice: "₹8,680",
      description: "Business capital of Telangana",
      popularity: "Most Popular",
      gradient: "from-blue-500 to-indigo-600",
      savings: "Save 15%"
    },
    {
      destination: "Chennai",
      distance: "780 km", 
      duration: "10-11 hours",
      startingPrice: "₹10,920",
      description: "Gateway to South India",
      popularity: "Trending",
      gradient: "from-green-500 to-emerald-600",
      savings: "Save 10%"
    },
    {
      destination: "Bangalore",
      distance: "860 km",
      duration: "11-12 hours", 
      startingPrice: "₹12,040",
      description: "Silicon Valley of India",
      popularity: "Popular",
      gradient: "from-purple-500 to-violet-600",
      savings: "Save 12%"
    },
    {
      destination: "Tirupati",
      distance: "550 km",
      duration: "7-8 hours",
      startingPrice: "₹7,700",
      description: "Holy pilgrimage destination",
      popularity: "Spiritual",
      gradient: "from-orange-500 to-red-600",
      savings: "Save 8%"
    },
    {
      destination: "Vijayawada", 
      distance: "350 km",
      duration: "5-6 hours",
      startingPrice: "₹4,900",
      description: "Commercial hub of Andhra Pradesh",
      popularity: "Business",
      gradient: "from-teal-500 to-cyan-600",
      savings: "Save 20%"
    },
    {
      destination: "Araku Valley",
      distance: "120 km",
      duration: "3-4 hours",
      startingPrice: "₹1,680",
      description: "Hill station getaway",
      popularity: "Weekend Favorite",
      gradient: "from-emerald-500 to-green-600",
      savings: "Save 25%"
    }
  ];

  return (
    <section className="px-4 py-6 md:py-12 bg-white">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-6 md:mb-10">
          <div className="inline-flex items-center gap-2 bg-green-50 px-4 py-2 rounded-full mb-4">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-600">POPULAR ROUTES</span>
          </div>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 leading-tight">
            Top Destinations from Vizag
          </h2>
          <p className="text-gray-600 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
            Explore popular destinations from Visakhapatnam with our reliable outstation taxi services. 
            All prices include driver allowance and toll charges.
          </p>
        </div>

        {/* Routes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {routes.map((route, index) => (
            <Card key={index} className="group hover:shadow-2xl transition-all duration-300 cursor-pointer border-0 bg-white rounded-3xl overflow-hidden">
              {/* Route Header */}
              <div className={`relative h-20 md:h-24 bg-gradient-to-r ${route.gradient} p-4 md:p-5`}>
                <div className="flex items-center justify-between h-full pr-10 md:pr-14">
                  <div>
                    <h3 className="text-lg md:text-xl font-bold text-white">{route.destination}</h3>
                    <p className="text-white/80 text-sm">{route.description}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xl md:text-2xl font-bold text-white">{route.startingPrice}</div>
                    <div className="text-white/80 text-xs">starting from</div>
                  </div>
                </div>
                
                {/* Popularity Badge */}
                <div className="absolute top-2 right-2 z-10">
                  <div className="bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full">
                    <span className="text-white text-xs font-medium">{route.popularity}</span>
                  </div>
                </div>
              </div>
              
              <CardContent className="p-4 md:p-5">
                {/* Route Details */}
                <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">{route.distance}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-green-500" />
                    <span className="font-medium">{route.duration}</span>
                  </div>
                </div>
                
                {/* Features */}
                <div className="bg-gray-50 rounded-xl p-3 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      <span className="text-sm font-medium text-gray-700">Premium Service</span>
                    </div>
                    <div className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
                      {route.savings}
                    </div>
                  </div>
                </div>
                
                {/* Inclusions */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
                    <span>One-way starting price</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <div className="w-1 h-1 bg-green-400 rounded-full"></div>
                    <span>Driver allowance included</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <div className="w-1 h-1 bg-purple-400 rounded-full"></div>
                    <span>Toll charges included</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-8 bg-gradient-to-r from-gray-50 to-blue-50 rounded-3xl p-6 md:p-8">
          <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">Don't See Your Destination?</h3>
          <p className="text-gray-600 mb-4 text-sm md:text-base">We cover many more routes! Contact us for custom destinations and competitive pricing.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <span className="text-blue-600 font-medium text-sm md:text-base cursor-pointer hover:text-blue-700 transition-colors">
              📞 Call +91 9966363662
            </span>
            <span className="text-gray-400 hidden sm:block">or</span>
            <span className="text-blue-600 font-medium text-sm md:text-base cursor-pointer hover:text-blue-700 transition-colors">
              💬 WhatsApp us for instant quotes
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
