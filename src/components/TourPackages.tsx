
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, MapPin, Clock, Users, Share2, Mail, Phone, Camera, Mountain, Waves, RefreshCw } from 'lucide-react';
import { tourAPI } from '@/services/api/tourAPI';

interface TourData {
  id: number;
  tourId: string;
  tourName: string;
  distance: number;
  days: number;
  description: string;
  imageUrl: string;
  isActive: boolean;
  pricing: {
    sedan: number;
    ertiga: number;
    innova: number;
    tempo?: number;
    luxury?: number;
  };
}

export function TourPackages() {
  const [tours, setTours] = useState<TourData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTours = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use the existing tour API to get tours
      const tourData = await tourAPI.getTourFares();
      
      // Transform API response to match TourData format
      const formattedTours: TourData[] = tourData
        .filter(tour => tour.tourName) // Only show tours with names
        .map(tour => ({
          id: Math.random(), // Temporary ID for key
          tourId: tour.tourId,
          tourName: tour.tourName,
          distance: 120, // Default values since not in current API
          days: 1,
          description: `Experience the beautiful ${tour.tourName.toLowerCase()} with our professional taxi service. Comfortable ride with experienced drivers.`,
          imageUrl: `/tours/${tour.tourId}.jpg`,
          isActive: true,
          pricing: {
            sedan: tour.pricing?.sedan || 0,
            ertiga: tour.pricing?.ertiga || 0,
            innova: tour.pricing?.innova || 0,
            tempo: tour.pricing?.tempo || 0,
            luxury: tour.pricing?.luxury || 0
          }
        }));
      
      setTours(formattedTours);
    } catch (error) {
      console.error('Error loading tours:', error);
      setError('Failed to load tours');
      
      // Fallback to default tours if API fails
      setTours([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTours();
  }, []);

  const getGradientForTour = (index: number) => {
    const gradients = [
      "from-green-400 via-green-500 to-green-600",
      "from-blue-400 via-blue-500 to-blue-600", 
      "from-orange-400 via-orange-500 to-orange-600",
      "from-purple-400 via-purple-500 to-purple-600",
      "from-pink-400 via-pink-500 to-pink-600"
    ];
    return gradients[index % gradients.length];
  };

  const getIconForTour = (tourName: string, index: number) => {
    if (tourName.toLowerCase().includes('hill') || tourName.toLowerCase().includes('valley') || tourName.toLowerCase().includes('lambasingi')) {
      return Mountain;
    }
    if (tourName.toLowerCase().includes('beach') || tourName.toLowerCase().includes('vizag')) {
      return Waves;
    }
    return index % 2 === 0 ? Mountain : Waves;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(price);
  };

  if (loading) {
    return (
      <section className="px-4 py-6 md:py-12 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-6 md:mb-10">
            <div className="inline-flex items-center gap-2 bg-green-50 px-4 py-2 rounded-full mb-4">
              <RefreshCw className="h-4 w-4 text-green-600 animate-spin" />
              <span className="text-sm font-medium text-green-600">LOADING TOURS</span>
            </div>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 leading-tight">
              Loading Tour Packages...
            </h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-200 animate-pulse rounded-3xl h-96"></div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error && tours.length === 0) {
    return (
      <section className="px-4 py-6 md:py-12 bg-white">
        <div className="container mx-auto max-w-6xl text-center">
          <div className="text-red-600 mb-4">{error}</div>
          <Button onClick={loadTours} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry Loading Tours
          </Button>
        </div>
      </section>
    );
  }

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
          
          {error && (
            <div className="mt-4 text-amber-600 text-sm">
              ⚠️ Some tours may be showing default data. Refresh to try loading latest tours.
            </div>
          )}
        </div>

        {/* Tours Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {tours.slice(0, 6).map((tour, index) => {
            const IconComponent = getIconForTour(tour.tourName, index);
            const gradient = getGradientForTour(index);
            const lowestPrice = Math.min(tour.pricing.sedan, tour.pricing.ertiga, tour.pricing.innova);
            
            return (
              <Card key={tour.id || tour.tourId} className="group hover:shadow-2xl transition-all duration-500 border-0 bg-white rounded-3xl overflow-hidden">
                {/* Tour Image Section */}
                <div className={`relative h-48 md:h-56 bg-gradient-to-br ${gradient} overflow-hidden`}>
                  <div className="absolute inset-0 bg-black/20"></div>
                  
                  {/* Top Badges */}
                  <div className="absolute top-4 left-4 z-10">
                    <Badge className="bg-white/90 text-gray-800 border-0 backdrop-blur-sm">
                      <Users className="h-3 w-3 mr-1" />
                      {tour.days} day{tour.days > 1 ? 's' : ''}
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
                      <IconComponent className="h-10 w-10 text-white" />
                    </div>
                  </div>
                  
                  {/* Rating */}
                  <div className="absolute bottom-4 left-4">
                    <div className="flex items-center gap-2 bg-white/90 px-3 py-1 rounded-full backdrop-blur-sm">
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            className={`h-3 w-3 ${i < 4 ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} 
                          />
                        ))}
                      </div>
                      <span className="text-sm font-semibold text-gray-800">4.8</span>
                    </div>
                  </div>
                </div>
                
                <CardContent className="p-5 md:p-6">
                  {/* Tour Info */}
                  <div className="mb-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-1 leading-tight">
                          {tour.tourName}
                        </h3>
                        <p className="text-sm font-medium text-blue-600 mb-2">
                          {tour.tourName.includes('Hill') ? 'Hill Station Experience' : 
                           tour.tourName.includes('Beach') ? 'Beach & Coastal Tour' : 
                           'Cultural & Heritage Tour'}
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
                    {['Professional Driver', 'AC Vehicle', 'Fuel Included', 'Local Guide'].map((highlight, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs bg-gray-50 text-gray-600 border-gray-200 px-2 py-1">
                        {highlight}
                      </Badge>
                    ))}
                  </div>
                  
                  {/* Duration & Distance Info */}
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4 bg-gray-50 p-3 rounded-xl">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{tour.days} Day{tour.days > 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>{tour.distance} km</span>
                    </div>
                  </div>
                  
                  {/* Pricing & Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-gray-900">{formatPrice(lowestPrice)}</span>
                        <span className="text-sm text-gray-500">onwards</span>
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
            );
          })}
        </div>
        
        {/* CTA Section */}
        <div className="text-center mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-3xl p-6 md:p-8">
          <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">Can't Find Your Perfect Tour?</h3>
          <p className="text-gray-600 mb-4 text-sm md:text-base">Let us create a custom tour package just for you</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Button variant="outline" className="px-6 py-3 border-blue-200 text-blue-600 hover:bg-blue-50 rounded-xl font-medium">
              Create Custom Tour
            </Button>
            <Button onClick={loadTours} variant="ghost" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Tours
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
