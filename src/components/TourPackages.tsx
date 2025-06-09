
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, MapPin, Clock, Users, Share2, Mail, Phone, Camera, Mountain, Waves } from 'lucide-react';

export function TourPackages() {
  const tours = [
    {
      title: "Lambasingi Hill Station",
      subtitle: "Kashmir of Andhra Pradesh",
      description: "Experience the enchanting hill station known for its misty mornings and coffee plantations. A scenic 3-hour drive from Visakhapatnam to 3400 feet above sea level.",
      rating: 4.8,
      reviews: "156 reviews",
      price: "₹8,500",
      originalPrice: "₹9,500",
      duration: "2 Days / 1 Night",
      groupSize: "4-6 People",
      highlights: ["Hill Station", "Coffee Plantations", "Scenic Views", "Cool Weather"],
      gradient: "from-green-400 via-green-500 to-green-600",
      icon: Mountain
    },
    {
      title: "Araku Valley Adventure", 
      subtitle: "Tribal Culture & Nature",
      description: "Discover the beautiful valley with waterfalls, tribal museums, and lush coffee plantations. Experience the famous toy train journey through scenic landscapes.",
      rating: 4.7,
      reviews: "203 reviews", 
      price: "₹6,200",
      originalPrice: "₹7,000",
      duration: "1 Day",
      groupSize: "4-6 People",
      highlights: ["Coffee Museum", "Tribal Culture", "Valley Views", "Waterfalls"],
      gradient: "from-blue-400 via-blue-500 to-blue-600",
      icon: Mountain
    },
    {
      title: "Vizag City Explorer",
      subtitle: "Beaches & Heritage", 
      description: "Explore the beautiful beaches, ancient temples, and modern attractions of Visakhapatnam. Perfect for first-time visitors and photography enthusiasts.",
      rating: 4.6,
      reviews: "89 reviews",
      price: "₹4,800",
      originalPrice: "₹5,500", 
      duration: "1 Day",
      groupSize: "4-6 People",
      highlights: ["Beaches", "Temples", "Museums", "Local Culture"],
      gradient: "from-orange-400 via-orange-500 to-orange-600",
      icon: Waves
    }
  ];

  return (
    <section className="px-4 py-6 md:py-12 bg-white">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-6 md:mb-10">
          <div className="inline-flex items-center gap-2 bg-green-50 px-4 py-2 rounded-full mb-4">
            <Camera className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-600">TOUR PACKAGES</span>
          </div>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 leading-tight">
            Explore Amazing Destinations
          </h2>
          <p className="text-gray-600 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
            Discover the beauty of Visakhapatnam and its surroundings with our carefully crafted tour packages. 
            From hill stations to beaches, we cover all the must-visit destinations.
          </p>
        </div>

        {/* Tours Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {tours.map((tour, index) => (
            <Card key={index} className="group hover:shadow-2xl transition-all duration-500 border-0 bg-white rounded-3xl overflow-hidden">
              {/* Tour Image Section */}
              <div className={`relative h-48 md:h-56 bg-gradient-to-br ${tour.gradient} overflow-hidden`}>
                <div className="absolute inset-0 bg-black/20"></div>
                
                {/* Top Badges */}
                <div className="absolute top-4 left-4 z-10">
                  <Badge className="bg-white/90 text-gray-800 border-0 backdrop-blur-sm">
                    <Users className="h-3 w-3 mr-1" />
                    {tour.reviews}
                  </Badge>
                </div>
                
                {/* Action Buttons */}
                <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
                  <Button size="sm" variant="secondary" className="w-9 h-9 p-0 bg-white/90 hover:bg-white backdrop-blur-sm">
                    <Share2 className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="secondary" className="w-9 h-9 p-0 bg-white/90 hover:bg-white backdrop-blur-sm">
                    <Mail className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Center Icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                    <tour.icon className="h-10 w-10 text-white" />
                  </div>
                </div>
                
                {/* Rating */}
                <div className="absolute bottom-4 left-4">
                  <div className="flex items-center gap-2 bg-white/90 px-3 py-1 rounded-full backdrop-blur-sm">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`h-3 w-3 ${i < Math.floor(tour.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
                        />
                      ))}
                    </div>
                    <span className="text-sm font-semibold text-gray-800">{tour.rating}</span>
                  </div>
                </div>
              </div>
              
              <CardContent className="p-5 md:p-6">
                {/* Tour Info */}
                <div className="mb-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-1 leading-tight">
                        {tour.title}
                      </h3>
                      <p className="text-sm font-medium text-blue-600 mb-2">
                        {tour.subtitle}
                      </p>
                    </div>
                    <Badge className="bg-green-50 text-green-600 hover:bg-green-100 border-green-200 text-xs">
                      Popular
                    </Badge>
                  </div>
                  
                  <p className="text-gray-600 text-sm leading-relaxed mb-4">
                    {tour.description}
                  </p>
                </div>
                
                {/* Highlights */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {tour.highlights.map((highlight, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs bg-gray-50 text-gray-600 border-gray-200 px-2 py-1">
                      {highlight}
                    </Badge>
                  ))}
                </div>
                
                {/* Duration & Group Info */}
                <div className="flex items-center justify-between text-sm text-gray-500 mb-4 bg-gray-50 p-3 rounded-xl">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{tour.duration}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{tour.groupSize}</span>
                  </div>
                </div>
                
                {/* Pricing & Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-gray-900">{tour.price}</span>
                      <span className="text-sm text-gray-500 line-through">{tour.originalPrice}</span>
                    </div>
                    <div className="text-xs text-gray-500">per tour package</div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="border-blue-200 text-blue-600 hover:bg-blue-50">
                      <Phone className="h-4 w-4 mr-1" />
                      Call
                    </Button>
                    <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all" size="sm">
                      Book Now
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* CTA Section */}
        <div className="text-center mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-3xl p-6 md:p-8">
          <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">Can't Find Your Perfect Tour?</h3>
          <p className="text-gray-600 mb-4 text-sm md:text-base">Let us create a custom tour package just for you</p>
          <Button variant="outline" className="px-6 py-3 border-blue-200 text-blue-600 hover:bg-blue-50 rounded-xl font-medium">
            Create Custom Tour
          </Button>
        </div>
      </div>
    </section>
  );
}
