import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Clock, TrendingUp, Star } from 'lucide-react';

export function PopularRoutes() {
  const routes = [
    {
      destination: "Annavaram",
      distance: "260 km",
      duration: "8-9 hours",
      startingPrice: "₹4,500",
      description: "Famous for Satyanarayana Swamy Temple",
      popularity: "Most Popular",
      gradient: "from-blue-500 to-indigo-600",
      savings: "Sedan"
    },
    {
      destination: "Srikakulam",
      distance: "260 km", 
      duration: "8-9 hours",
      startingPrice: "₹4,500",
      description: "Famous for Arasavalli & Srikurmam",
      popularity: "Trending",
      gradient: "from-green-500 to-emerald-600",
      savings: "Sedan"
    },
    {
      destination: "Pitapuram",
      distance: "320 km",
      duration: "11-12 hours", 
      startingPrice: "₹5,000",
      description: "Holy pilgrimage destination",
      popularity: "Spiritual",
      gradient: "from-purple-500 to-violet-600",
      savings: "Sedan"
    },
    {
      destination: "Lambasingi",
      distance: "300 km",
      duration: "12-13 hours",
      startingPrice: "₹5,000",
      description: "Known as Kashmir of Andhra",
      popularity: "Weekend Favorite",
      gradient: "from-orange-500 to-red-600",
      savings: "Sedan"
    },
    {
      destination: "Vanajangi", 
      distance: "260 km",
      duration: "11-12 hours",
      startingPrice: "₹5,000",
      description: "Known for its sunrises",
      popularity: "Weekend Favorite",
      gradient: "from-teal-500 to-cyan-600",
      savings: "Sedan"
    },
    {
      destination: "Araku Valley",
      distance: "260 km",
      duration: "12-13 hours",
      startingPrice: "₹5,000",
      description: "Hill station getaway",
      popularity: "Weekend Favorite",
      gradient: "from-emerald-500 to-green-600",
      savings: "Sedan"
    }
  ];

  return (
    <section className="px-4 py-8 md:py-12 bg-white">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-4 md:mb-8">
          <div className="inline-flex items-center gap-2 bg-green-50 px-4 py-2 rounded-full mb-4">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-600">POPULAR ROUTES</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-medium text-gray-900 mb-4 leading-tight">
            Top Destinations from Vizag
          </h2>
          <p className="text-gray-600 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
            Explore popular destinations from Visakhapatnam with our reliable outstation taxi services. 
            All prices include driver allowance and toll charges.
          </p>
        </div>

        {/* Routes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {routes.map((route, index) => (
            <Card key={index} className="group hover:shadow-2xl transition-all duration-300 cursor-pointer border-0 bg-white rounded-3xl overflow-hidden">
              {/* Route Header */}
              <div className={`relative bg-gradient-to-r ${route.gradient} p-6`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 pr-4">
                    <h3 className="text-xl md:text-2xl font-bold text-white mb-2 leading-tight">{route.destination}</h3>
                    <p className="text-white/90 text-sm leading-relaxed">{route.description}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-2xl md:text-3xl font-medium text-white leading-none">{route.startingPrice}</div>
                    <div className="text-white/80 text-xs mt-1">starting from</div>
                    {/* Popularity Badge - now under 'starting from' */}
                    <div className="mt-2 flex justify-end">
                      <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full inline-block">
                        <span className="text-white text-xs font-medium whitespace-nowrap">{route.popularity}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <CardContent className="p-6">
                {/* Route Details */}
                <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4 text-blue-500 flex-shrink-0" />
                    <span className="font-medium">{route.distance}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span className="font-medium">{route.duration}</span>
                  </div>
                </div>
                
                {/* Features */}
                <div className="bg-gray-50 rounded-xl p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-500 fill-current flex-shrink-0" />
                      <span className="text-sm font-medium text-gray-700">Premium Service</span>
                    </div>
                    <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap">
                      {route.savings}
                    </div>
                  </div>
                </div>
                
                {/* Inclusions */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full flex-shrink-0"></div>
                    <span>Two-way starting price</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full flex-shrink-0"></div>
                    <span>Driver allowance included</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <div className="w-1.5 h-1.5 bg-purple-400 rounded-full flex-shrink-0"></div>
                    <span>Toll charges included</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-10 bg-gradient-to-r from-gray-50 to-blue-50 rounded-3xl p-8">
          <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">Don't See Your Destination?</h3>
          <p className="text-gray-600 mb-6 text-base md:text-lg">We cover many more routes! Contact us for custom destinations and competitive pricing.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <span className="text-blue-600 font-medium text-base md:text-lg cursor-pointer hover:text-blue-700 transition-colors">
              📞 Call +91 9966363662
            </span>
            <span className="text-gray-400 hidden sm:block">or</span>
            <span className="text-blue-600 font-medium text-base md:text-lg cursor-pointer hover:text-blue-700 transition-colors">
              💬 WhatsApp us for instant quotes
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
