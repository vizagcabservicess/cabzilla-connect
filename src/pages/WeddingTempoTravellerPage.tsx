import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import Footer from '@/components/Footer';
import { MobileNavigation } from '@/components/MobileNavigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ResponsiveGrid, ServiceCard } from '@/components/MobileSlider';
import { Car, Users, Phone, Star, CheckCircle, MapPin, Clock, Shield, Wifi, Coffee, Camera, Heart, Building, Bus, Loader2 } from 'lucide-react';
import { tourAPI } from '@/services/api/tourAPI';
import { fareAPI } from '@/services/api/fareAPI';
import { TourInfo } from '@/types/cab';
import { VehiclePricing } from '@/types/api';
import { getTourUrl } from '@/utils/tourUrlUtils';
import { Breadcrumb } from '@/components/Breadcrumb';

// Wedding Tour Slider Component
const WeddingTourSlider = ({ tours }: { tours: TourInfo[] }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const ITEMS_PER_VIEW = 4;
  const totalItems = tours.length;
  const shouldShowNavigation = totalItems > ITEMS_PER_VIEW;
  const currentWindowStart = currentSlide;
  const currentWindowEnd = Math.min(currentWindowStart + ITEMS_PER_VIEW - 1, totalItems - 1);
  const isAtBeginning = currentWindowStart === 0;
  const isAtEnd = currentWindowEnd === totalItems - 1;
  const currentWindowItems = tours.slice(currentWindowStart, currentWindowStart + ITEMS_PER_VIEW);

  const handleNext = () => {
    if (!isAtEnd) {
      const nextStart = Math.min(currentWindowStart + 1, totalItems - ITEMS_PER_VIEW);
      setCurrentSlide(nextStart);
    }
  };

  const handlePrev = () => {
    if (!isAtBeginning) {
      const prevStart = Math.max(currentWindowStart - 1, 0);
      setCurrentSlide(prevStart);
    }
  };

  // Helper to get price
  const getPrice = (tour: TourInfo) => {
    if (tour.pricing && Object.keys(tour.pricing).length > 0) {
      const prices = Object.values(tour.pricing) as number[];
      const minPrice = Math.min(...prices);
      return `₹${minPrice.toLocaleString('en-IN')}`;
    }
    return '₹--';
  };

  // Helper to get duration
  const getDuration = (tour: TourInfo) => {
    if (tour.days) return `${tour.days} day${tour.days > 1 ? 's' : ''}`;
    return 'Full Day';
  };


  const renderTourCard = (tour: TourInfo, index: number) => {
    const tourUrl = getTourUrl(tour);

    return (
      <Link
        key={tour.id || index}
        to={tourUrl}
        className="block"
      >
        <Card className="group hover:shadow-xl transition-all duration-300 border-0 bg-white rounded-2xl overflow-hidden cursor-pointer relative h-[320px]">
          <CardContent className="p-5 relative h-full flex flex-col">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-gradient-to-br from-pink-50 to-rose-50 opacity-50"></div>
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-transparent via-transparent to-white/20"></div>

            {/* Content */}
            <div className="relative z-10 flex flex-col h-full">
              {/* Category Tag */}
              <div className="flex justify-between items-start mb-3">
                <div className="bg-pink-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                  WEDDING
                </div>
              </div>

              {/* Main Price and Duration Row */}
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-bold text-gray-900 leading-tight">
                  {getPrice(tour)} Onwards
                </h3>
                <p className="text-sm text-gray-600 inline-flex items-center gap-2 bg-white border-2 border-gray-300 rounded-lg px-3 py-2 text-sm font-medium text-gray-800 hover:border-gray-400 transition-colors">
                  {getDuration(tour)}
                </p>
              </div>

              {/* Tour Image */}
              <div className="flex-grow flex items-center justify-center mb-4">
                {tour.image && typeof tour.image === 'string' && tour.image.trim() !== '' ? (
                  <img
                    src={tour.image}
                    alt={tour.name}
                    className="w-full h-32 object-cover rounded-lg"
                    onError={e => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : (
                  <div className="w-full h-32 bg-gray-200 rounded-lg flex items-center justify-center">
                    <MapPin className="h-12 w-12 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Book Now Button */}
              <div className="mt-auto">
                <button 
                  className="w-full bg-white border border-gray-300 rounded-full px-4 py-2 text-gray-800 font-medium hover:bg-gray-50 transition-colors shadow-sm text-sm"
                  onClick={(e) => {
                    e.preventDefault();
                    window.open('https://vizagtaxihub.com/vehicle/tempo-traveller', '_blank');
                  }}
                >
                  Book Now
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  };

  return (
    <div className="relative overflow-hidden">
      {/* Desktop Layout - 4-card window with proper navigation */}
      <div className="hidden lg:block mb-8 relative overflow-hidden">
        <div className="flex gap-4 justify-center">
          {currentWindowItems.map((tour, index) => (
            <div key={tour.id || index} className="w-full max-w-[calc(25%-12px)]">
              {renderTourCard(tour, currentWindowStart + index)}
            </div>
          ))}
          {/* Fill remaining slots with invisible cards to maintain 4-card layout */}
          {currentWindowItems.length < ITEMS_PER_VIEW && 
            Array.from({ length: ITEMS_PER_VIEW - currentWindowItems.length }).map((_, index) => (
              <div key={`empty-${index}`} className="w-full max-w-[calc(25%-12px)] invisible">
                <div className="h-[320px]"></div>
              </div>
            ))
          }
        </div>

        {/* Previous Arrow - only show if there are multiple slides and not at beginning */}
        {shouldShowNavigation && !isAtBeginning && (
          <button
            className="absolute -left-5 top-1/2 transform -translate-y-1/2 z-20 w-12 h-12 bg-pink-300 rounded-full shadow-xl flex items-center justify-center hover:bg-pink-400 transition-colors border-2 border-pink-400"
            onClick={handlePrev}
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
        )}

        {/* Next Arrow - only show if there are multiple slides and not at end */}
        {shouldShowNavigation && !isAtEnd && (
          <button
            className="absolute right-0 top-1/2 transform -translate-y-1/2 z-20 w-12 h-12 bg-pink-300 rounded-full shadow-xl flex items-center justify-center hover:bg-pink-400 transition-colors border-2 border-pink-400"
            onClick={handleNext}
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M9 5l7 7-7 7"/>
            </svg>
          </button>
        )}
      </div>

      {/* Tablet Layout - Grid with all items */}
      <div className="hidden md:block lg:hidden mb-8">
        <div className="grid grid-cols-2 gap-4">
          {tours.map((tour, index) => renderTourCard(tour, index))}
        </div>
      </div>

      {/* Mobile Layout - Simple grid with all items */}
      <div className="md:hidden mb-8">
        <div className="grid grid-cols-1 gap-4">
          {tours.map((tour, index) => renderTourCard(tour, index))}
        </div>
      </div>
    </div>
  );
};

const WeddingTempoTravellerPage = () => {
  const [tours, setTours] = useState<TourInfo[]>([]);
  const [vehiclePricing, setVehiclePricing] = useState<VehiclePricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoTitles, setVideoTitles] = useState<{[key: string]: string}>({});
  const [currentSlide, setCurrentSlide] = useState(0);

  // YouTube video IDs
  const videoIds = ['wrgfamvCkns', 'ROa7qu67ECA', 'QUUuoF04zfk'];

  // Static video titles for wedding testimonials
  const videoTitlesStatic = {
    'wrgfamvCkns': 'Perfect Wedding Transport',
    'ROa7qu67ECA': 'Luxury Wedding Tempo Service',
    'QUUuoF04zfk': 'Memorable Wedding Day'
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [tourData, pricingData] = await Promise.all([
          tourAPI.getAvailableTours(),
          fareAPI.getVehiclePricing()
        ]);
        // Filter tours that are suitable for weddings (beaches, temples, scenic locations)
        const weddingTours = tourData.filter(tour => {
          const name = tour.name.toLowerCase();
          return name.includes('beach') || 
                 name.includes('temple') || 
                 name.includes('araku') || 
                 name.includes('lambasingi') ||
                 name.includes('simhachalam') ||
                 name.includes('rushikonda');
        });
        setTours(weddingTours);
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
    const slider = document.getElementById('wedding-tempo-slider');
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
    "name": "Vizag Taxi Hub - Wedding Tempo Traveller Service",
    "description": "Book wedding tempo traveller in Vizag for wedding transport. 17 seater AC mini bus with professional driver, modern amenities, GPS tracking. Perfect for wedding parties, family gatherings, wedding outstation travel. Best wedding transport rates in Visakhapatnam.",
    "url": "https://vizagtaxihub.com/wedding-tempo-traveller-vizag",
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
      "name": "Wedding Tempo Traveller Services",
      "itemListElement": [
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Wedding Tempo Traveller",
            "description": "Professional wedding transport service"
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

  // Helper function to get tempo traveller price
  const getTempoTravellerPrice = (tour: TourInfo): string => {
    if (tour.pricing) {
      const tempoPrice = tour.pricing['tempo_traveller'] || 
                        tour.pricing['tempo-traveller'] || 
                        Object.values(tour.pricing)[0];
      if (tempoPrice) {
        return `₹${tempoPrice.toLocaleString()}`;
      }
    }
    // Fallback to estimated pricing based on distance
    const estimatedPrice = tour.distance * 35;
    return `₹${estimatedPrice.toLocaleString()}`;
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
             vehicleId === 'tempo-traveller' ||
             vehicleId.includes('bus') ||
             vehicleType.includes('bus');
    });
    
    // If not found, try to get the first available pricing as fallback
    if (!tempoTraveller && vehiclePricing.length > 0) {
      console.log('Tempo traveller pricing not found, using first available:', vehiclePricing[0]);
      return vehiclePricing[0];
    }
    
    return tempoTraveller;
  };

  // Helper function to get wedding-specific pricing with fallbacks
  const getWeddingPricing = (serviceType: string) => {
    const pricing = getTempoTravellerPricing();
    if (!pricing) return null;

    switch (serviceType) {
      case 'local':
        return pricing.price4hrs40km || pricing.pricePerKm * 40 || 8500;
      case 'beach':
        return pricing.price8hrs80km || pricing.pricePerKm * 80 || 12500;
      case 'temple':
        return pricing.price4hrs40km || pricing.pricePerKm * 30 || 6500;
      case 'airport':
        return pricing.airportBasePrice || pricing.pricePerKm * 20 || 4500;
      default:
        return pricing.pricePerKm || 35;
    }
  };

  // Helper function to get wedding-specific description
  const getWeddingDescription = (tour: TourInfo): string => {
    const name = tour.name.toLowerCase();
    if (name.includes('beach')) return 'Perfect for beach wedding ceremonies and photo sessions';
    if (name.includes('temple')) return 'Ideal for traditional wedding blessings and rituals';
    if (name.includes('araku') || name.includes('lambasingi')) return 'Romantic hill station perfect for pre-wedding shoots';
    return 'Beautiful destination for wedding celebrations and memories';
  };

  return (
    <>
      <Helmet>
        <title>Wedding Tempo Traveller in Vizag | Wedding Transport | Best Rates</title>
        <meta name="description" content="Book wedding tempo traveller in Vizag. 17 seater AC mini bus with professional driver for wedding transport. Best rates in Visakhapatnam. Call +91 9966363662" />
        <meta name="keywords" content="wedding tempo traveller vizag, wedding transport vizag, tempo traveller for wedding vizag, wedding party transport vizag, family wedding transport vizag, wedding outstation travel vizag, tempo traveller booking vizag, tempo traveller rates vizag" />
        <link rel="canonical" href="https://vizagtaxihub.com/wedding-tempo-traveller-vizag" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://vizagtaxihub.com/wedding-tempo-traveller-vizag" />
        <meta property="twitter:url" content="https://vizagtaxihub.com/wedding-tempo-traveller-vizag" />
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        <Navbar />
        
        <div className="container mx-auto px-4 py-8 max-w-7xl pb-16 md:pb-32">
          {/* Breadcrumb */}
          <Breadcrumb items={[
            { label: 'Services', href: '/services' },
            { label: 'Tempo Traveller', href: '/tempo-traveller-rental-vizag' },
            { label: 'Wedding Transport' }
          ]} />
          
          {/* Hero Section - Modern Wedding Design */}
          <div className="relative bg-gradient-to-br from-pink-50 via-white to-rose-50 rounded-3xl p-12 mb-16 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-pink-600/5 to-rose-600/5"></div>
            <div className="relative z-10">
              <div className="flex flex-col lg:flex-row items-center gap-12">
                <div className="flex-1">
                  <div className="inline-flex items-center bg-pink-100 text-pink-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
                    <Heart className="mr-2 h-4 w-4" />
                    Premium Wedding Transport Service
                  </div>
                  <h1 className="text-3xl md:text-4xl font-bold mb-6 leading-tight text-gray-900">
                    Perfect Wedding Day with Tempo Traveller
                  </h1>
                  <p className="text-xl mb-8 text-gray-600 leading-relaxed">
                    Make your special day unforgettable with our elegant tempo traveller service. Professional drivers, beautifully decorated vehicles, and exceptional service for your wedding celebration.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 mb-8">
                    <Button 
                      size="lg" 
                      className="bg-pink-600 hover:bg-pink-700 text-white px-8 py-4 text-lg font-semibold rounded-xl"
                      onClick={() => window.open('https://vizagtaxihub.com/vehicle/tempo-traveller', '_blank')}
                    >
                      <Heart className="mr-3 h-6 w-6" />
                      Book Wedding Transport
                    </Button>
                    <Button 
                      size="lg" 
                      variant="outline"
                      className="border-pink-600 text-pink-600 hover:bg-pink-50 px-8 py-4 text-lg font-semibold rounded-xl"
                      onClick={() => window.open('tel:+919966363662', '_self')}
                    >
                      <Phone className="mr-3 h-6 w-6" />
                      Call +91 9966363662
                    </Button>
                  </div>
                  <div className="flex items-center gap-8 text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span>Wedding Decorated</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span>Professional Service</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span>On-Time Delivery</span>
                    </div>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-pink-400 to-rose-500 rounded-3xl transform rotate-3"></div>
                    <div className="relative bg-white rounded-3xl p-8 shadow-2xl">
                      {/* Image Slider */}
                      <div className="relative overflow-hidden rounded-2xl">
                        <div className="flex transition-transform duration-500 ease-in-out" id="wedding-tempo-slider">
                          <div className="w-full flex-shrink-0">
                            <img 
                              src="https://vizagtaxihub.com/uploads/tempo-png.png" 
                              alt="Wedding Tempo Traveller Exterior" 
                              className="w-full max-w-md mx-auto transform hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                          <div className="w-full flex-shrink-0">
                            <img 
                              src="https://vizagtaxihub.com/uploads/tempo-traveller-seats.jpg" 
                              alt="Wedding Tempo Traveller Interior Seats" 
                              className="w-full max-w-md mx-auto transform hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                          <div className="w-full flex-shrink-0">
                            <img 
                              src="https://vizagtaxihub.com/uploads/tempo-traveller-amenities.jpg" 
                              alt="Wedding Tempo Traveller Amenities" 
                              className="w-full max-w-md mx-auto transform hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                        </div>
                        
                        {/* Slider Navigation Dots */}
                        <div className="flex justify-center mt-4 space-x-2">
                          <button 
                            className="w-3 h-3 bg-pink-600 rounded-full slider-dot active"
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
                        Wedding Special
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Features Section - Modern Wedding Design */}
          <div className="text-center mb-16">
            <h2 className="text-2xl md:text-3xl font-bold mb-6 text-gray-900">
              Perfect Wedding Experience, Every Time
            </h2>
            <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
              Make your wedding day special with our premium tempo traveller service designed for elegance, comfort, and unforgettable memories.
            </p>
            
            <ResponsiveGrid gridCols="grid-cols-1 md:grid-cols-2 lg:grid-cols-3" className="gap-3">
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center">
                    <Heart className="h-6 w-6 text-pink-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Wedding Decorated</h3>
                    <p className="text-gray-600">Beautifully decorated vehicles with flowers, ribbons, and wedding themes for your special day.</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-rose-100 rounded-lg flex items-center justify-center">
                    <Users className="h-6 w-6 text-rose-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Family & Friends</h3>
                    <p className="text-gray-600">Spacious seating for wedding parties, family members, and close friends to travel together.</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Clock className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Punctual Service</h3>
                    <p className="text-gray-600">On-time arrivals for ceremonies, receptions, and all wedding events with professional timing.</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Camera className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Photo Stops</h3>
                    <p className="text-gray-600">Perfect locations for wedding photography with scenic backdrops and memorable moments.</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <Shield className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Safe & Secure</h3>
                    <p className="text-gray-600">Experienced drivers with clean records ensuring safe transportation for your loved ones.</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <Star className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Premium Experience</h3>
                    <p className="text-gray-600">Luxury amenities and exceptional service to make your wedding day truly special and memorable.</p>
                  </div>
                </div>
              </div>
            </ResponsiveGrid>
          </div>

          {/* Wedding Tour Packages Section */}
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Perfect Wedding Tour Packages
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Discover romantic destinations perfect for your wedding celebrations
            </p>
          </div>

          {/* Wedding Tour Packages Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {loading ? (
              <div className="col-span-full flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-pink-600" />
                <span className="ml-2 text-gray-600">Loading wedding tours...</span>
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
                <p className="text-gray-600">No wedding tours available at the moment</p>
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
                    <Badge className="absolute top-3 left-3 bg-pink-500 text-white">
                      WEDDING
                    </Badge>
                  </div>
                  <div className="p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{tour.name}</h3>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-gray-500">Wedding Package Starting @</span>
                      <span className="text-2xl font-bold text-pink-600">{getTempoTravellerPrice(tour)}*</span>
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
              <p className="text-lg text-gray-600">Watch what our customers say about their wedding tempo traveller experience with Vizag Taxi Hub</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Wedding Testimonial 1 - Real YouTube Video */}
              <div className="bg-white rounded-xl overflow-hidden shadow-lg">
                <div className="relative group">
                  <img 
                    src="https://img.youtube.com/vi/wrgfamvCkns/maxresdefault.jpg" 
                    alt="Wedding Video Testimonial"
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
                      <h4 className="font-semibold text-gray-900">{videoTitles['wrgfamvCkns'] || 'Wedding Video Testimonial'}</h4>
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

              {/* Wedding Testimonial 2 - Real YouTube Video */}
              <div className="bg-white rounded-xl overflow-hidden shadow-lg">
                <div className="relative group">
                  <img 
                    src="https://img.youtube.com/vi/ROa7qu67ECA/maxresdefault.jpg" 
                    alt="Wedding Video Testimonial"
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
                      <h4 className="font-semibold text-gray-900">{videoTitles['ROa7qu67ECA'] || 'Wedding Video Testimonial'}</h4>
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

              {/* Wedding Testimonial 3 - Real YouTube Video */}
              <div className="bg-white rounded-xl overflow-hidden shadow-lg">
                <div className="relative group">
                  <img 
                    src="https://img.youtube.com/vi/QUUuoF04zfk/maxresdefault.jpg" 
                    alt="Wedding Video Testimonial"
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
                      <h4 className="font-semibold text-gray-900">{videoTitles['QUUuoF04zfk'] || 'Wedding Video Testimonial'}</h4>
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


          {/* Dynamic Wedding Rate Card Section */}
          <div className="bg-white rounded-xl p-8 shadow-lg mb-12">
            <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">Wedding Tempo Traveller Rate Card</h3>
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-pink-600" />
                <span className="ml-2 text-gray-600">Loading wedding rates...</span>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-red-600 mb-4">Failed to load wedding rates</p>
                <Button onClick={() => window.location.reload()} variant="outline">
                  Try Again
                </Button>
              </div>
            ) : !getTempoTravellerPricing() ? (
              <div className="text-center py-12">
                <p className="text-orange-600 mb-4">Pricing data not available</p>
                <p className="text-sm text-gray-500 mb-4">Available vehicles: {vehiclePricing.length}</p>
                <div className="text-xs text-gray-400 mb-4">
                  Debug: {JSON.stringify(vehiclePricing.map(v => ({ id: v.vehicleId, type: v.vehicleType })))}
                </div>
                <Button onClick={() => window.location.reload()} variant="outline">
                  Try Again
                </Button>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead>
                      <tr className="bg-pink-50">
                        <th className="text-left py-4 px-4 font-semibold text-gray-900">Wedding Service</th>
                        <th className="text-right py-4 px-4 font-semibold text-gray-900">Base Fare</th>
                        <th className="text-right py-4 px-4 font-semibold text-gray-900">Distance</th>
                        <th className="text-right py-4 px-4 font-semibold text-gray-900">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {getTempoTravellerPricing() && (
                        <>
                          <tr className="hover:bg-pink-50">
                            <td className="py-4 px-4 text-gray-900">Wedding Party Transport (Local)</td>
                            <td className="py-4 px-4 text-right font-semibold text-pink-600">
                              ₹{getWeddingPricing('local')?.toLocaleString() || '8,500'}
                            </td>
                            <td className="py-4 px-4 text-right text-gray-600">Within City</td>
                            <td className="py-4 px-4 text-right text-gray-600">Full Day</td>
                          </tr>
                          <tr className="hover:bg-pink-50">
                            <td className="py-4 px-4 text-gray-900">Wedding Party to Beach</td>
                            <td className="py-4 px-4 text-right font-semibold text-pink-600">
                              ₹{getWeddingPricing('beach')?.toLocaleString() || '12,500'}
                            </td>
                            <td className="py-4 px-4 text-right text-gray-600">50 km</td>
                            <td className="py-4 px-4 text-right text-gray-600">8 Hours</td>
                          </tr>
                          <tr className="hover:bg-pink-50">
                            <td className="py-4 px-4 text-gray-900">Wedding Party to Temple</td>
                            <td className="py-4 px-4 text-right font-semibold text-pink-600">
                              ₹{getWeddingPricing('temple')?.toLocaleString() || '6,500'}
                            </td>
                            <td className="py-4 px-4 text-right text-gray-600">30 km</td>
                            <td className="py-4 px-4 text-right text-gray-600">4 Hours</td>
                          </tr>
                          <tr className="hover:bg-pink-50">
                            <td className="py-4 px-4 text-gray-900">Airport Wedding Pickup</td>
                            <td className="py-4 px-4 text-right font-semibold text-pink-600">
                              ₹{getWeddingPricing('airport')?.toLocaleString() || '4,500'}
                            </td>
                            <td className="py-4 px-4 text-right text-gray-600">One way</td>
                            <td className="py-4 px-4 text-right text-gray-600">2 Hours</td>
                          </tr>
                        </>
                      )}
                      {/* Wedding tour packages from API */}
                      {tours.map((tour) => (
                        <tr key={tour.id} className="hover:bg-pink-50">
                          <td className="py-4 px-4 text-gray-900">Wedding Party to {tour.name}</td>
                          <td className="py-4 px-4 text-right font-semibold text-pink-600">{getTempoTravellerPrice(tour)}</td>
                          <td className="py-4 px-4 text-right text-gray-600">{tour.distance} km</td>
                          <td className="py-4 px-4 text-right text-gray-600">{tour.days} {tour.days === 1 ? 'Day' : 'Days'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-600 mb-4">*Wedding rates include decorations and special arrangements. Contact us for custom packages.</p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button 
                      size="lg" 
                      className="bg-pink-600 hover:bg-pink-700 text-white px-8 py-3"
                      onClick={() => window.open('tel:+919966363662', '_self')}
                    >
                      <Phone className="mr-2 h-5 w-5" />
                      Call +91 9966363662
                    </Button>
                    <Button 
                      size="lg" 
                      variant="outline" 
                      className="border-pink-600 text-pink-600 hover:bg-pink-50 px-8 py-3"
                      onClick={() => window.open('https://vizagtaxihub.com/vehicle/tempo-traveller', '_blank')}
                    >
                      <Heart className="mr-2 h-5 w-5" />
                      Book Wedding Transport
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Wedding Add-Ons Section */}
          <div className="bg-white rounded-xl p-8 shadow-lg mb-12">
            <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">Wedding Add-Ons</h3>
            <ResponsiveGrid gridCols="grid-cols-1 md:grid-cols-2 lg:grid-cols-4" className="gap-3">
              <ServiceCard 
                service={{
                  icon: Heart,
                  title: "Wedding Decorated",
                  description: "Beautifully decorated vehicles with flowers, ribbons, and wedding themes for your special day.",
                  features: ["Flower decorations", "Ribbon styling", "Wedding themes"],
                  bgColor: "bg-gradient-to-br from-pink-50 to-pink-100",
                  iconColor: "text-pink-600",
                  link: "/wedding-tempo-traveller-vizag"
                }}
              />
              <ServiceCard 
                service={{
                  icon: Camera,
                  title: "Photo Stops",
                  description: "Perfect locations for wedding photography with scenic backdrops and memorable moments.",
                  features: ["Scenic backdrops", "Perfect locations", "Memorable moments"],
                  bgColor: "bg-gradient-to-br from-rose-50 to-rose-100",
                  iconColor: "text-rose-600",
                  link: "/wedding-tempo-traveller-vizag"
                }}
              />
              <ServiceCard 
                service={{
                  icon: Coffee,
                  title: "Refreshments",
                  description: "Complimentary water and snacks for the journey to keep everyone comfortable.",
                  features: ["Complimentary water", "Snacks excluded", "Comfortable journey"],
                  bgColor: "bg-gradient-to-br from-purple-50 to-purple-100",
                  iconColor: "text-purple-600",
                  link: "/wedding-tempo-traveller-vizag"
                }}
              />
              <ServiceCard 
                service={{
                  icon: MapPin,
                  title: "Multiple Venues",
                  description: "Transport between wedding venues and hotels for seamless coordination.",
                  features: ["Venue transfers", "Hotel pickups", "Seamless coordination"],
                  bgColor: "bg-gradient-to-br from-orange-50 to-orange-100",
                  iconColor: "text-orange-600",
                  link: "/wedding-tempo-traveller-vizag"
                }}
              />
            </ResponsiveGrid>
          </div>

          {/* Related Services */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">Explore Our Wedding Services</h2>
            <ResponsiveGrid gridCols="grid-cols-1 md:grid-cols-2 lg:grid-cols-4" className="gap-3">
              <ServiceCard 
                service={{
                  icon: Car,
                  title: "Tempo Traveller Rental",
                  description: "Premium tempo traveller rental with professional drivers for all your wedding needs.",
                  features: ["12-18 seater options", "AC comfort", "Professional drivers"],
                  bgColor: "bg-gradient-to-br from-blue-50 to-blue-100",
                  iconColor: "text-blue-600",
                  link: "/tempo-traveller-rental-vizag"
                }}
              />
              <ServiceCard 
                service={{
                  icon: Users,
                  title: "17 Seater Tempo Traveller",
                  description: "Spacious 17-seater tempo traveller for big wedding parties and family gatherings.",
                  features: ["17 passenger capacity", "AC comfort", "Luggage space"],
                  bgColor: "bg-gradient-to-br from-green-50 to-green-100",
                  iconColor: "text-green-600",
                  link: "/17-seater-tempo-traveller-vizag"
                }}
              />
              <ServiceCard 
                service={{
                  icon: Building,
                  title: "Corporate Transport",
                  description: "Professional corporate transportation services for business events and meetings.",
                  features: ["Business class comfort", "Professional drivers", "Corporate packages"],
                  bgColor: "bg-gradient-to-br from-indigo-50 to-indigo-100",
                  iconColor: "text-indigo-600",
                  link: "/corporate-tempo-traveller-vizag"
                }}
              />
              <ServiceCard 
                service={{
                  icon: MapPin,
                  title: "Pilgrimage Tours",
                  description: "Sacred journey transportation services for religious tours and pilgrimages.",
                  features: ["Pilgrimage packages", "Religious sites", "Comfortable travel"],
                  bgColor: "bg-gradient-to-br from-yellow-50 to-yellow-100",
                  iconColor: "text-yellow-600",
                  link: "/pilgrimage-tempo-traveller-vizag"
                }}
              />
            </ResponsiveGrid>
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
              <Link to="/pilgrimage-tempo-traveller-vizag" className="text-blue-700 hover:text-blue-900">Pilgrimage</Link>
              <Link to="/mini-bus-travels-vizag" className="text-blue-700 hover:text-blue-900">Mini Bus</Link>
              <Link to="/fleet" className="text-blue-700 hover:text-blue-900">Our Fleet</Link>
            </div>
          </div>

          {/* Call to Action */}
          <div className="text-center mt-12">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Planning your dream wedding?</h3>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="bg-pink-600 hover:bg-pink-700 text-white px-6 py-3 text-base font-semibold"
                onClick={() => window.open('https://vizagtaxihub.com/vehicle/tempo-traveller', '_blank')}
              >
                BOOK WEDDING TRANSPORT
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-pink-600 text-pink-600 hover:bg-pink-50 px-6 py-3 text-base font-semibold"
                onClick={() => window.open('https://vizagtaxihub.com/tours', '_blank')}
              >
                EXPLORE OTHER TOURS
              </Button>
            </div>
          </div>
        </div>
        
        <Footer />
        <MobileNavigation />
      </div>
    </>
  );
};

export default WeddingTempoTravellerPage;