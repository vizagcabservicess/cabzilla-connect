import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import Footer from '@/components/Footer';
import { MobileNavigation } from '@/components/MobileNavigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Car, Users, Phone, Star, CheckCircle, MapPin, Clock, Shield, Wifi, Coffee, Camera, Heart, Building, Bus, Loader2 } from 'lucide-react';
import { tourAPI } from '@/services/api/tourAPI';
import { fareAPI } from '@/services/api/fareAPI';
import { TourInfo } from '@/types/cab';
import { VehiclePricing } from '@/types/api';
import { Breadcrumb } from '@/components/Breadcrumb';

interface TempoTravellerPageProps {
  pageType: string;
  title: string;
  description: string;
  keywords: string;
  url: string;
  color: string;
  icon: React.ReactNode;
}

const TempoTravellerPage: React.FC<TempoTravellerPageProps> = ({
  pageType,
  title,
  description,
  keywords,
  url,
  color,
  icon
}) => {
  const [tours, setTours] = useState<TourInfo[]>([]);
  const [vehiclePricing, setVehiclePricing] = useState<VehiclePricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoTitles, setVideoTitles] = useState<{[key: string]: string}>({});
  const [currentSlide, setCurrentSlide] = useState(0);

  // YouTube video IDs
  const videoIds = ['wrgfamvCkns', 'ROa7qu67ECA', 'QUUuoF04zfk'];

  // Static video titles (since YouTube API requires authentication)
  const videoTitlesStatic = {
    'wrgfamvCkns': 'Luxury Tempo Traveller Experience',
    'ROa7qu67ECA': 'Thailand Team 5-Star Service',
    'QUUuoF04zfk': 'Professional Tempo Service Review'
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [tourData, pricingData] = await Promise.all([
          tourAPI.getAvailableTours(),
          fareAPI.getVehiclePricing()
        ]);
        setTours(tourData);
        setVehiclePricing(pricingData);
        setVideoTitles(videoTitlesStatic);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Slider functions
  const showSlide = (index: number) => {
    setCurrentSlide(index);
    const slider = document.getElementById('tempo-slider');
    if (slider) {
      slider.style.transform = `translateX(-${index * 100}%)`;
    }
  };

  const nextSlide = () => {
    const next = (currentSlide + 1) % 3;
    showSlide(next);
  };

  const previousSlide = () => {
    const prev = currentSlide === 0 ? 2 : currentSlide - 1;
    showSlide(prev);
  };

  // Auto-play slider
  useEffect(() => {
    const interval = setInterval(() => {
      nextSlide();
    }, 4000); // Change slide every 4 seconds

    return () => clearInterval(interval);
  }, [currentSlide]);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": `Vizag Taxi Hub - ${title}`,
    "description": description,
    "url": url,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "44-66-22/4, near Singalamma Temple, Singalammapuram, Kailasapuram",
      "addressLocality": "Visakhapatnam",
      "addressRegion": "Andhra Pradesh",
      "postalCode": "530024",
      "addressCountry": "IN"
    },
    "telephone": "+91-9966363662",
    "openingHours": "Mo-Su 00:00-23:59",
    "paymentAccepted": "Cash, Credit Card, UPI, Net Banking",
    "areaServed": {
      "@type": "City",
      "name": "Visakhapatnam"
    },
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": `${title} Services`,
      "itemListElement": [
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": title,
            "description": description
          },
          "price": "35",
          "priceCurrency": "INR",
          "priceSpecification": {
            "@type": "UnitPriceSpecification",
            "price": "35",
            "priceCurrency": "INR",
            "unitText": "per kilometer"
          }
        }
      ]
    }
  };

  // Helper function to get tour type based on name
  const getTourType = (tourName: string): string => {
    const name = tourName.toLowerCase();
    if (name.includes('araku') || name.includes('lambasingi')) return 'HILL STATION';
    if (name.includes('borra') || name.includes('cave')) return 'ADVENTURE';
    if (name.includes('temple') || name.includes('simhachalam')) return 'PILGRIMAGE';
    if (name.includes('beach') || name.includes('rushikonda')) return 'BEACH';
    return 'TOUR';
  };

  // Helper function to get tempo traveller pricing from API
  const getTempoTravellerPricing = () => {
    // Try multiple ways to find tempo traveller pricing
    const tempoTraveller = vehiclePricing.find(vehicle => {
      const vehicleId = vehicle.vehicleId?.toLowerCase() || '';
      const vehicleType = vehicle.vehicleType?.toLowerCase() || '';
      
      return vehicleId.includes('tempo') || 
             vehicleId.includes('traveller') ||
             vehicleType.includes('tempo') ||
             vehicleType.includes('traveller') ||
             vehicleId === 'tempo_traveller' ||
             vehicleId === 'tempo-traveller';
    });
    
    // If not found, try to get the first available pricing as fallback
    if (!tempoTraveller && vehiclePricing.length > 0) {
      console.log('Tempo traveller pricing not found, using first available:', vehiclePricing[0]);
      return vehiclePricing[0];
    }
    
    return tempoTraveller;
  };

  // Helper function to get tempo traveller price
  const getTempoTravellerPrice = (tour: TourInfo): string => {
    // Look for tempo traveller pricing in the tour data
    if (tour.pricing) {
      // Try to find tempo traveller pricing (vehicle_id might be 'tempo_traveller' or similar)
      const tempoPrice = tour.pricing['tempo_traveller'] || 
                        tour.pricing['tempo-traveller'] || 
                        Object.values(tour.pricing)[0];
      if (tempoPrice) {
        return `₹${tempoPrice.toLocaleString()}`;
      }
    }
    // Fallback to estimated pricing based on distance
    const estimatedPrice = tour.distance * 35; // ₹35 per km
    return `₹${estimatedPrice.toLocaleString()}`;
  };

  return (
    <>
      <Helmet>
        <title>{title} | Vizag Taxi Hub</title>
        <meta name="description" content={description} />
        <meta name="keywords" content={keywords} />
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        <Navbar />
        
        <div className="container mx-auto px-4 py-8 max-w-7xl pt-16 md:pt-24 pb-16 md:pb-32">
          {/* Breadcrumb */}
          <Breadcrumb items={[
            { label: 'Services', href: '/services' },
            { label: 'Tempo Traveller', href: '/tempo-traveller-rental-vizag' },
            { label: title }
          ]} />
          
          {/* Hero Section - Modern Design */}
          <div className="relative bg-gradient-to-br from-blue-50 via-white to-blue-50 rounded-3xl p-12 mb-16 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5"></div>
            <div className="relative z-10">
              <div className="flex flex-col lg:flex-row items-center gap-12">
                <div className="flex-1">
                  <div className="inline-flex items-center bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
                    <Star className="mr-2 h-4 w-4" />
                    ⚡ INSTANT BOOKING • 🔥 LIMITED TIME OFFER
                  </div>
                  <h1 className="text-3xl md:text-4xl font-bold mb-6 leading-tight text-gray-900">
                    Perfect Group Travel with {title}
                  </h1>
                  <p className="text-xl mb-8 text-gray-600 leading-relaxed">
                    Experience comfortable and reliable tempo traveller service for your group travel needs. Professional drivers, well-maintained vehicles, and exceptional service.
                  </p>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
                    <p className="text-yellow-800 font-semibold">🎉 SPECIAL OFFER: Book now and get 5% discount on your first booking!</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4 mb-8">
                    <Button 
                      size="lg" 
                      className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 text-lg font-semibold rounded-full shadow-lg"
                      onClick={() => window.open('https://wa.me/919966363662?text=Hi! I want to book ' + title + ' - Special Offer', '_blank')}
                    >
                      📞 CALL NOW - 9966363662
                    </Button>
                    <Button 
                      size="lg" 
                      className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg font-semibold rounded-full shadow-lg"
                      onClick={() => window.open('https://vizagtaxihub.com/vehicle/tempo-traveller', '_blank')}
                    >
                      🚐 BOOK ONLINE
                    </Button>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">✅ Instant Confirmation • ✅ Best Rates • ✅ 24/7 Support</p>
                  <div className="flex items-center gap-8 text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span>24/7 Service</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span>Professional Drivers</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span>Well Maintained</span>
                    </div>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-3xl transform rotate-3"></div>
                    <div className="relative bg-white rounded-3xl p-8 shadow-2xl">
                      {/* Image Slider */}
                      <div className="relative overflow-hidden rounded-2xl">
                        <div className="flex transition-transform duration-500 ease-in-out" id="tempo-slider">
                          <div className="w-full flex-shrink-0">
                            <img 
                              src="https://vizagtaxihub.com/uploads/tempo-png.png" 
                              alt="Tempo Traveller Exterior" 
                              className="w-full max-w-md mx-auto transform hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                          <div className="w-full flex-shrink-0">
                            <img 
                              src="https://vizagtaxihub.com/uploads/tempo-traveller-seats.jpg" 
                              alt="Tempo Traveller Interior Seats" 
                              className="w-full max-w-md mx-auto transform hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                          <div className="w-full flex-shrink-0">
                            <img 
                              src="https://vizagtaxihub.com/uploads/tempo-traveller-amenities.jpg" 
                              alt="Tempo Traveller Amenities" 
                              className="w-full max-w-md mx-auto transform hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                        </div>
                        
                        {/* Slider Navigation Dots */}
                        <div className="flex justify-center mt-4 space-x-2">
                          <button 
                            className="w-3 h-3 bg-blue-600 rounded-full slider-dot active"
                            onClick={() => showSlide(0)}
                          ></button>
                          <button 
                            className="w-3 h-3 bg-gray-300 rounded-full slider-dot"
                            onClick={() => showSlide(1)}
                          ></button>
                          <button 
                            className="w-3 h-3 bg-gray-300 rounded-full slider-dot"
                            onClick={() => showSlide(2)}
                          ></button>
                        </div>
                        
                        {/* Navigation Arrows */}
                        <button 
                          className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full p-2 shadow-lg transition-all duration-200"
                          onClick={previousSlide}
                        >
                          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <button 
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full p-2 shadow-lg transition-all duration-200"
                          onClick={nextSlide}
                        >
                          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                      
                      <div className="absolute -top-4 -right-4 bg-yellow-400 text-yellow-900 px-4 py-2 rounded-full text-sm font-bold">
                        Most Popular
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Features Section - Modern Design */}
          <div className="text-center mb-16">
            <h2 className="text-2xl md:text-3xl font-bold mb-6 text-gray-900">
              Master Every Journey, Instantly
            </h2>
            <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
              Experience the best tempo traveller service with our comprehensive features designed for your comfort and convenience.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold mb-4 text-gray-900">Group Travel Expert</h3>
                <p className="text-gray-600">Perfect for family trips, corporate outings, and group tours with spacious seating and comfort.</p>
              </div>

              {/* Feature 2 */}
              <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                  <Shield className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold mb-4 text-gray-900">Safe & Reliable</h3>
                <p className="text-gray-600">Professional drivers with clean records and well-maintained vehicles for your safety.</p>
              </div>

              {/* Feature 3 */}
              <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                  <Clock className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold mb-4 text-gray-900">24/7 Service</h3>
                <p className="text-gray-600">Round-the-clock availability for airport transfers, late-night pickups, and emergency travel.</p>
              </div>

              {/* Feature 4 */}
              <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                  <MapPin className="h-8 w-8 text-orange-600" />
                </div>
                <h3 className="text-xl font-bold mb-4 text-gray-900">Route Expertise</h3>
                <p className="text-gray-600">Local drivers who know the best routes, traffic patterns, and scenic spots for your journey.</p>
              </div>

              {/* Feature 5 */}
              <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <div className="w-16 h-16 bg-pink-100 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                  <Wifi className="h-8 w-8 text-pink-600" />
                </div>
                <h3 className="text-xl font-bold mb-4 text-gray-900">Modern Amenities</h3>
                <p className="text-gray-600">AC comfort, charging ports, and modern facilities for a comfortable travel experience.</p>
              </div>

              {/* Feature 6 */}
              <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                  <Star className="h-8 w-8 text-indigo-600" />
                </div>
                <h3 className="text-xl font-bold mb-4 text-gray-900">Premium Service</h3>
                <p className="text-gray-600">Exceptional customer service with personalized attention to make your journey memorable.</p>
              </div>
            </div>
          </div>

          {/* Tour Packages Section */}
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Explore Top Tour Packages from Visakhapatnam
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Discover amazing destinations with our curated tour packages
            </p>
          </div>

          {/* Tour Packages Grid - MakeMyTrip Card Style */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {loading ? (
              <div className="col-span-full flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">Loading tours...</span>
              </div>
            ) : error ? (
              <div className="col-span-full text-center py-12">
                <p className="text-red-600 mb-4">Failed to load tour data</p>
                <Button onClick={() => window.location.reload()} variant="outline">
                  Try Again
                </Button>
              </div>
            ) : tours.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-600">No tours available at the moment</p>
              </div>
            ) : (
              tours.map((tour) => (
                <div key={tour.id} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
                  <div className="relative">
                    <img 
                      src={tour.image || `/tours/${tour.id}.jpg`} 
                      alt={tour.name}
                      className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500&h=300&fit=crop';
                      }}
                    />
                    <Badge className="absolute top-3 left-3 bg-red-500 text-white">
                      {getTourType(tour.name)}
                    </Badge>
                  </div>
                  <div className="p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{tour.name}</h3>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-gray-500">Tempo Traveller Starting @</span>
                      <span className="text-2xl font-bold text-blue-600">{getTempoTravellerPrice(tour)}*</span>
                    </div>
                    <div className="flex items-center justify-between mb-4 text-sm text-gray-500">
                      <span>{tour.distance} km</span>
                      <span>{tour.days} {tour.days === 1 ? 'Day' : 'Days'}</span>
                    </div>
                    <button 
                      className="w-full bg-white border border-gray-300 rounded-full px-4 py-2 text-gray-800 font-medium hover:bg-gray-50 transition-colors shadow-sm text-sm"
                      onClick={() => window.open('https://vizagtaxihub.com/vehicle/tempo-traveller', '_blank')}
                    >
                      Book Now
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Real Customer Stories Section */}
          <div className="bg-gray-50 rounded-xl p-8 mb-12">
            <div className="text-center mb-8">
              <Button className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-full mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-white rounded-full"></div>
                  VIDEO TESTIMONIALS
                </div>
              </Button>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Real Customer Stories</h3>
              <p className="text-lg text-gray-600">Watch what our customers say about their experience with Vizag Taxi Hub</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Testimonial 1 - Real YouTube Video */}
              <div className="bg-white rounded-xl overflow-hidden shadow-lg">
                <div className="relative group">
                  <img 
                    src="https://img.youtube.com/vi/wrgfamvCkns/maxresdefault.jpg" 
                    alt="Customer Video Testimonial"
                    className="w-full aspect-video object-cover"
                  />
                  <a 
                    href="https://www.youtube.com/shorts/wrgfamvCkns" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  >
                    <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform duration-200">
                      <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                  </a>
                  <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                    @vizagtaxihub
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900">{videoTitles['wrgfamvCkns'] || 'Customer Video Testimonial'}</h4>
                      <p className="text-sm text-gray-600">YouTube Shorts</p>
                    </div>
                    <a 
                      href="https://www.youtube.com/shorts/wrgfamvCkns" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center hover:bg-red-700 transition-colors"
                    >
                      <div className="w-0 h-0 border-l-3 border-l-white border-t-2 border-t-transparent border-b-2 border-b-transparent ml-1"></div>
                    </a>
                  </div>
                </div>
              </div>

              {/* Testimonial 2 - Real YouTube Video */}
              <div className="bg-white rounded-xl overflow-hidden shadow-lg">
                <div className="relative group">
                  <img 
                    src="https://img.youtube.com/vi/ROa7qu67ECA/maxresdefault.jpg" 
                    alt="Customer Video Testimonial"
                    className="w-full aspect-video object-cover"
                  />
                  <a 
                    href="https://www.youtube.com/shorts/ROa7qu67ECA" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  >
                    <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform duration-200">
                      <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                  </a>
                  <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                    @vizagtaxihub
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900">{videoTitles['ROa7qu67ECA'] || 'Customer Video Testimonial'}</h4>
                      <p className="text-sm text-gray-600">YouTube Shorts</p>
                    </div>
                    <a 
                      href="https://www.youtube.com/shorts/ROa7qu67ECA" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center hover:bg-red-700 transition-colors"
                    >
                      <div className="w-0 h-0 border-l-3 border-l-white border-t-2 border-t-transparent border-b-2 border-b-transparent ml-1"></div>
                    </a>
                  </div>
                </div>
              </div>

              {/* Testimonial 3 - Real YouTube Video */}
              <div className="bg-white rounded-xl overflow-hidden shadow-lg">
                <div className="relative group">
                  <img 
                    src="https://img.youtube.com/vi/QUUuoF04zfk/maxresdefault.jpg" 
                    alt="Customer Video Testimonial"
                    className="w-full aspect-video object-cover"
                  />
                  <a 
                    href="https://www.youtube.com/shorts/QUUuoF04zfk" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  >
                    <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform duration-200">
                      <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                  </a>
                  <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                    @Vizag Taxi Hub
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900">{videoTitles['QUUuoF04zfk'] || 'Customer Video Testimonial'}</h4>
                      <p className="text-sm text-gray-600">YouTube Shorts</p>
                    </div>
                    <a 
                      href="https://www.youtube.com/shorts/QUUuoF04zfk" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center hover:bg-red-700 transition-colors"
                    >
                      <div className="w-0 h-0 border-l-3 border-l-white border-t-2 border-t-transparent border-b-2 border-b-transparent ml-1"></div>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center">
              <Button 
                size="lg" 
                className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 text-base font-semibold"
                onClick={() => window.open('https://www.youtube.com/@vizagtaxihub', '_blank')}
              >
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center">
                    <div className="w-0 h-0 border-l-2 border-l-red-600 border-t-1 border-t-transparent border-b-1 border-b-transparent"></div>
                  </div>
                  Watch More on YouTube
                  <div className="w-4 h-4">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                      <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                    </svg>
                  </div>
                </div>
              </Button>
            </div>
          </div>


          {/* Dynamic Rate Card Section */}
          <div className="bg-white rounded-xl p-8 shadow-lg mb-12">
            <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">Tempo Traveller Rate Card</h3>
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">Loading rate card...</span>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-red-600 mb-4">Failed to load rate card</p>
                <Button onClick={() => window.location.reload()} variant="outline">
                  Try Again
                </Button>
              </div>
            ) : !getTempoTravellerPricing() ? (
              <div className="text-center py-12">
                <p className="text-orange-600 mb-4">Pricing data not available</p>
                <p className="text-sm text-gray-500 mb-4">Available vehicles: {vehiclePricing.length}</p>
                <Button onClick={() => window.location.reload()} variant="outline">
                  Try Again
                </Button>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left py-4 px-4 font-semibold text-gray-900">Trip Type</th>
                        <th className="text-right py-4 px-4 font-semibold text-gray-900">Base Fare</th>
                        <th className="text-right py-4 px-4 font-semibold text-gray-900">Distance</th>
                        <th className="text-right py-4 px-4 font-semibold text-gray-900">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {getTempoTravellerPricing() && (
                        <>
                          <tr className="hover:bg-gray-50">
                            <td className="py-4 px-4 text-gray-900">City Tour (4hr/40km)</td>
                            <td className="py-4 px-4 text-right font-semibold text-blue-600">
                              ₹{getTempoTravellerPricing()?.price4hrs40km?.toLocaleString() || '6,500'}
                            </td>
                            <td className="py-4 px-4 text-right text-gray-600">
                              Extra @ ₹{getTempoTravellerPricing()?.priceExtraKm || '35'}/km
                            </td>
                            <td className="py-4 px-4 text-right text-gray-600">
                              Extra @ ₹{getTempoTravellerPricing()?.priceExtraHour || '750'}/hr
                            </td>
                          </tr>
                          <tr className="hover:bg-gray-50">
                            <td className="py-4 px-4 text-gray-900">City Tour (8hr/80km)</td>
                            <td className="py-4 px-4 text-right font-semibold text-blue-600">
                              ₹{getTempoTravellerPricing()?.price8hrs80km?.toLocaleString() || '7,500'}
                            </td>
                            <td className="py-4 px-4 text-right text-gray-600">
                              Extra @ ₹{getTempoTravellerPricing()?.priceExtraKm || '35'}/km
                            </td>
                            <td className="py-4 px-4 text-right text-gray-600">
                              Extra @ ₹{getTempoTravellerPricing()?.priceExtraHour || '750'}/hr
                            </td>
                          </tr>
                          <tr className="hover:bg-gray-50">
                            <td className="py-4 px-4 text-gray-900">Outstation</td>
                            <td className="py-4 px-4 text-right font-semibold text-blue-600">
                              ₹{getTempoTravellerPricing()?.pricePerKm || '35'}/km
                            </td>
                            <td className="py-4 px-4 text-right text-gray-600">Min 300 km</td>
                            <td className="py-4 px-4 text-right text-gray-600">13 hours</td>
                          </tr>
                          <tr className="hover:bg-gray-50">
                            <td className="py-4 px-4 text-gray-900">Airport Transfer</td>
                            <td className="py-4 px-4 text-right font-semibold text-blue-600">
                              ₹{getTempoTravellerPricing()?.airportBasePrice?.toLocaleString() || '3,000'}
                            </td>
                            <td className="py-4 px-4 text-right text-gray-600">One way</td>
                            <td className="py-4 px-4 text-right text-gray-600">N/A</td>
                          </tr>
                        </>
                      )}
                      {/* Tour packages from API */}
                      {tours.map((tour) => (
                        <tr key={tour.id} className="hover:bg-gray-50">
                          <td className="py-4 px-4 text-gray-900">{tour.name}</td>
                          <td className="py-4 px-4 text-right font-semibold text-blue-600">{getTempoTravellerPrice(tour)}</td>
                          <td className="py-4 px-4 text-right text-gray-600">{tour.distance} km</td>
                          <td className="py-4 px-4 text-right text-gray-600">{tour.days} {tour.days === 1 ? 'Day' : 'Days'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-600 mb-4">*Rates are subject to change. Contact us for current pricing.</p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button 
                      size="lg" 
                      className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
                      onClick={() => window.open('tel:+919966363662', '_self')}
                    >
                      <Phone className="mr-2 h-5 w-5" />
                      Call +91 9966363662
                    </Button>
                    <Button 
                      size="lg" 
                      variant="outline" 
                      className="border-blue-600 text-blue-600 hover:bg-blue-50 px-8 py-3"
                      onClick={() => window.open('https://vizagtaxihub.com/vehicle/tempo-traveller', '_blank')}
                    >
                      <Car className="mr-2 h-5 w-5" />
                      Book Now
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Custom Add-Ons Section */}
          <div className="bg-white rounded-xl p-8 shadow-lg mb-12">
            <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">Custom Add-Ons</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="bg-blue-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Car className="h-8 w-8 text-blue-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">New Vehicle Guarantee</h4>
                <p className="text-gray-600 text-sm">Travel in up-to-date tempo traveller models that fit your needs</p>
              </div>
              <div className="text-center">
                <div className="bg-green-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Bus className="h-8 w-8 text-green-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Extra Luggage Space</h4>
                <p className="text-gray-600 text-sm">Get extra space for your luggage and belongings</p>
              </div>
              <div className="text-center">
                <div className="bg-purple-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Users className="h-8 w-8 text-purple-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Driver Language Preference</h4>
                <p className="text-gray-600 text-sm">Ride with a driver who speaks your preferred language</p>
              </div>
              <div className="text-center">
                <div className="bg-orange-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <MapPin className="h-8 w-8 text-orange-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Personalised Round Trips</h4>
                <p className="text-gray-600 text-sm">Enjoy hassle-free and convenient trips with multicity stops</p>
              </div>
            </div>
          </div>

          {/* Related Services */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">Explore Our Tempo Traveller Services</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Link to="/tempo-traveller-rental-vizag" className="block p-6 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors group">
                <div className="bg-blue-100 p-3 rounded-full w-12 h-12 mb-4 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <Car className="h-6 w-6 text-blue-600" />
                </div>
                <h4 className="font-semibold text-blue-900 mb-2">Tempo Traveller Rental</h4>
                <p className="text-sm text-blue-700">Best tempo traveller rental service in Vizag</p>
              </Link>
              <Link to="/17-seater-tempo-traveller-vizag" className="block p-6 bg-green-50 rounded-xl hover:bg-green-100 transition-colors group">
                <div className="bg-green-100 p-3 rounded-full w-12 h-12 mb-4 flex items-center justify-center group-hover:bg-green-200 transition-colors">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <h4 className="font-semibold text-green-900 mb-2">17 Seater Tempo Traveller</h4>
                <p className="text-sm text-green-700">Perfect for large group travel</p>
              </Link>
              <Link to="/12-seater-tempo-traveller-vizag" className="block p-6 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors group">
                <div className="bg-purple-100 p-3 rounded-full w-12 h-12 mb-4 flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <h4 className="font-semibold text-purple-900 mb-2">12 Seater Tempo Traveller</h4>
                <p className="text-sm text-purple-700">Ideal for medium group travel</p>
              </Link>
              <Link to="/group-travel-tempo-traveller-vizag" className="block p-6 bg-orange-50 rounded-xl hover:bg-orange-100 transition-colors group">
                <div className="bg-orange-100 p-3 rounded-full w-12 h-12 mb-4 flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                  <Users className="h-6 w-6 text-orange-600" />
                </div>
                <h4 className="font-semibold text-orange-900 mb-2">Group Travel</h4>
                <p className="text-sm text-orange-700">Specialized group travel solutions</p>
              </Link>
              <Link to="/corporate-tempo-traveller-vizag" className="block p-6 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors group">
                <div className="bg-indigo-100 p-3 rounded-full w-12 h-12 mb-4 flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                  <Building className="h-6 w-6 text-indigo-600" />
                </div>
                <h4 className="font-semibold text-indigo-900 mb-2">Corporate Transport</h4>
                <p className="text-sm text-indigo-700">Business travel and corporate events</p>
              </Link>
              <Link to="/wedding-tempo-traveller-vizag" className="block p-6 bg-pink-50 rounded-xl hover:bg-pink-100 transition-colors group">
                <div className="bg-pink-100 p-3 rounded-full w-12 h-12 mb-4 flex items-center justify-center group-hover:bg-pink-200 transition-colors">
                  <Heart className="h-6 w-6 text-pink-600" />
                </div>
                <h4 className="font-semibold text-pink-900 mb-2">Wedding Transport</h4>
                <p className="text-sm text-pink-700">Wedding party transportation</p>
              </Link>
              <Link to="/pilgrimage-tempo-traveller-vizag" className="block p-6 bg-yellow-50 rounded-xl hover:bg-yellow-100 transition-colors group">
                <div className="bg-yellow-100 p-3 rounded-full w-12 h-12 mb-4 flex items-center justify-center group-hover:bg-yellow-200 transition-colors">
                  <MapPin className="h-6 w-6 text-yellow-600" />
                </div>
                <h4 className="font-semibold text-yellow-900 mb-2">Pilgrimage Tours</h4>
                <p className="text-sm text-yellow-700">Religious and pilgrimage tours</p>
              </Link>
              <Link to="/mini-bus-travels-vizag" className="block p-6 bg-teal-50 rounded-xl hover:bg-teal-100 transition-colors group">
                <div className="bg-teal-100 p-3 rounded-full w-12 h-12 mb-4 flex items-center justify-center group-hover:bg-teal-200 transition-colors">
                  <Bus className="h-6 w-6 text-teal-600" />
                </div>
                <h4 className="font-semibold text-teal-900 mb-2">Mini Bus Travels</h4>
                <p className="text-sm text-teal-700">Mini bus rental services</p>
              </Link>
            </div>
          </div>

          {/* Quick Links Section */}
          <div className="bg-blue-50 rounded-xl p-6 mt-8">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">Quick Links</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <Link to="/tempo-traveller-rental-vizag" className="text-blue-700 hover:text-blue-900">Tempo Rental</Link>
              <Link to="/17-seater-tempo-traveller-vizag" className="text-blue-700 hover:text-blue-900">17 Seater</Link>
              <Link to="/12-seater-tempo-traveller-vizag" className="text-blue-700 hover:text-blue-900">12 Seater</Link>
              <Link to="/group-travel-tempo-traveller-vizag" className="text-blue-700 hover:text-blue-900">Group Travel</Link>
              <Link to="/corporate-tempo-traveller-vizag" className="text-blue-700 hover:text-blue-900">Corporate</Link>
              <Link to="/wedding-tempo-traveller-vizag" className="text-blue-700 hover:text-blue-900">Wedding</Link>
              <Link to="/pilgrimage-tempo-traveller-vizag" className="text-blue-700 hover:text-blue-900">Pilgrimage</Link>
              <Link to="/mini-bus-travels-vizag" className="text-blue-700 hover:text-blue-900">Mini Bus</Link>
              <Link to="/araku-tour-packages-vizag" className="text-blue-700 hover:text-blue-900">Araku Tours</Link>
              <Link to="/vizag-to-araku-bus" className="text-blue-700 hover:text-blue-900">Vizag Araku Bus</Link>
            </div>
          </div>

          {/* Call to Action */}
          <div className="text-center mt-12">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Ready to Book Your {title}?</h3>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                size="lg" 
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-base font-semibold rounded-full shadow-lg"
                onClick={() => window.open('https://wa.me/919966363662?text=Hi! I want to book ' + title, '_blank')}
              >
                📞 CALL NOW - 9966363662
              </Button>
              <Button 
                size="lg" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-base font-semibold rounded-full shadow-lg"
                onClick={() => window.open('https://vizagtaxihub.com/vehicle/tempo-traveller', '_blank')}
              >
                🚐 BOOK ONLINE
              </Button>
            </div>
            <p className="text-sm text-gray-600 mt-4">✅ Instant Confirmation • ✅ Best Rates • ✅ 24/7 Support</p>
          </div>
        </div>
        
        <Footer />
        <MobileNavigation />
      </div>
    </>
  );
};

export default TempoTravellerPage;
