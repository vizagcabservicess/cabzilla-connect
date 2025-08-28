import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from 'framer-motion';
import { Navbar } from "@/components/Navbar";
import { LocationInput } from "@/components/LocationInput";
import { DateTimePicker } from "@/components/DateTimePicker";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Location } from "@/lib/locationData";
import { isLocationInVizag } from "@/lib/locationUtils";
import { MapPin, Calendar, Loader2, Search, ChevronUp, ChevronDown, CheckCircle, Star, Users, Clock, Shield, Navigation, Zap } from "lucide-react";
import { MobileNavigation } from "@/components/MobileNavigation";
import { TourListItem } from "@/types/tour";
import { tourDetailAPI } from "@/services/api/tourDetailAPI";
import { TourCard } from "@/components/tour/TourCard";
import Footer from "@/components/Footer";
import { Helmet } from 'react-helmet-async';

const ToursPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const locationState = useLocation().state as { 
    pickupLocation?: Location, 
    pickupDate?: Date 
  } | null;
  
  const [pickupLocation, setPickupLocation] = useState<Location | null>(
    locationState?.pickupLocation || null
  );
  const [pickupDate, setPickupDate] = useState<Date | undefined>(
    locationState?.pickupDate || new Date()
  );
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchInitiated, setSearchInitiated] = useState<boolean>(false);
  const [tours, setTours] = useState<TourListItem[]>([]);
  const [isLoadingTours, setIsLoadingTours] = useState<boolean>(false);
  const [showSearchForm, setShowSearchForm] = useState<boolean>(false);
  const [isSearchActive, setIsSearchActive] = useState<boolean>(false);
  
  // Load tours on component mount if location state is provided
  useEffect(() => {
    if (locationState?.pickupLocation && locationState?.pickupDate) {
      handleSearchTours();
    }
  }, []);
  
  const handleSearchTours = async () => {
    if (!pickupLocation) {
      toast({
        title: "No pickup location",
        description: "Please enter your pickup location",
        variant: "destructive",
      });
      return;
    }
    
    const isInVizag = pickupLocation.isInVizag !== undefined ? 
      pickupLocation.isInVizag : 
      isLocationInVizag(pickupLocation);
      
    if (!isInVizag) {
      toast({
        title: "Invalid pickup location",
        description: "Pickup location must be within Visakhapatnam city limits.",
        variant: "destructive",
      });
      return;
    }
    
    if (!pickupDate) {
      toast({
        title: "No date selected",
        description: "Please select a date for your tour",
        variant: "destructive",
      });
      return;
    }
    
    setIsSearching(true);
    setIsLoadingTours(true);
    setSearchInitiated(true);
    setShowSearchForm(false);
    setIsSearchActive(true);
    
    // Hide the search widget by scrolling to results
    setTimeout(() => {
      const resultsSection = document.getElementById('tour-results');
      if (resultsSection) {
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
    
    try {
      const toursList = await tourDetailAPI.getTours();
      setTours(toursList);
      
      if (!toursList.length) {
        toast({
          title: "No tours available",
          description: "We couldn't find any tours available for your selected date",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error loading tours:", error);
      setTours([]);
      toast({
        title: "Error loading tours",
        description: "We encountered an error while loading tours. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingTours(false);
      setIsSearching(false);
    }
  };

  const handleTourSelect = (tourId: string) => {
    navigate(`/tours/${tourId}`);
  };

  const handleModifySearch = () => {
    setShowSearchForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCloseSearchForm = () => {
    setShowSearchForm(false);
  };

  const buildTourCardProps = (tour: TourListItem) => {
    return {
      ...tour,
      inclusions: (tour as any).inclusions || [],
      sightseeingPlaces: (tour as any).sightseeingPlaces || [],
    };
  };

  const features = [
    { 
      icon: <Zap className="w-6 h-6" />, 
      title: 'Instant Booking', 
      description: 'Book your tour in under 60 seconds with our streamlined process.',
      color: 'bg-emerald-500'
    },
    { 
      icon: <Shield className="w-6 h-6" />, 
      title: 'Safe & Reliable', 
      description: 'GPS tracking, verified drivers, and 24/7 customer support.',
      color: 'bg-blue-500'
    },
    { 
      icon: <Star className="w-6 h-6" />, 
      title: 'Best Rates', 
      description: 'Competitive pricing with no hidden charges or surge pricing.',
      color: 'bg-amber-500'
    },
    { 
      icon: <Users className="w-6 h-6" />, 
      title: 'Trusted Service', 
      description: 'Join 10,000+ satisfied customers who travel with us regularly.',
      color: 'bg-purple-500'
    }
  ];



  const renderSearchForm = () => (
    <div className="w-full max-w-2xl md:max-w-3xl lg:max-w-4xl mx-auto px-2 md:px-0">
      <div className="bg-white/90 md:bg-white/80 rounded-2xl md:rounded-3xl shadow-2xl md:p-10 p-4 border border-gray-100 backdrop-blur-md">
        <div className="text-center mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Find Your Perfect Tour</h2>
          <p className="text-gray-600">Enter your details to discover amazing tour packages</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <LocationInput
            label="PICKUP LOCATION"
            placeholder="Enter your pickup location"
            location={pickupLocation || undefined}
            onLocationChange={setPickupLocation}
            isPickupLocation={true}
          />
          
          <DateTimePicker
            label="TOUR DATE & TIME"
            date={pickupDate}
            onDateChange={setPickupDate}
            minDate={new Date()}
          />
        </div>
        
        <Button
          onClick={handleSearchTours}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 text-lg font-semibold rounded-xl shadow-lg"
          disabled={isSearching}
        >
          {isSearching ? (
            <div className="flex items-center justify-center">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span>Searching...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <Search className="mr-2 h-4 w-4" />
              <span>SEARCH TOURS</span>
            </div>
          )}
        </Button>
      </div>
    </div>
  );
  
  const renderTourListing = () => (
    <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Available Tour Packages</h2>
        <Button 
          onClick={handleModifySearch}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-semibold"
        >
          Modify Search
        </Button>
      </div>
      
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tours.length > 0 ? (
          tours.map((tour) => (
            <TourCard
              key={tour.tourId}
              tour={buildTourCardProps(tour)}
              onClick={() => handleTourSelect(tour.tourId)}
            />
          ))
        ) : (
          <div className="col-span-full text-center text-gray-500 py-12">
            <div className="text-6xl mb-4">🏔️</div>
            <h3 className="text-xl font-semibold mb-2">No tours found</h3>
            <p className="text-gray-400">Try adjusting your search criteria</p>
          </div>
        )}
      </div>
    </div>
  );
  
  return (
    <>
      <Helmet>
        <title>Tour Packages - Vizag Taxi Hub | Best Tour Packages in Visakhapatnam</title>
        <meta name="description" content="Discover exciting tour packages from Visakhapatnam to Araku Valley, Simhachalam, Borra Caves, and more. Book guided tours, sightseeing trips, and holiday packages with professional drivers. Customizable tour packages with best prices." />
        <meta name="keywords" content="tour packages vizag, sightseeing visakhapatnam, holiday packages, guided tours vizag, tourist places around vizag, travel packages" />
        <meta name="author" content="Vizag Taxi Hub" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://vizagtaxihub.com/tours" />
        <meta property="og:title" content="Tour Packages - Vizag Taxi Hub | Best Tour Packages in Visakhapatnam" />
        <meta property="og:description" content="Explore amazing tour packages in and around Visakhapatnam. Book guided tours, sightseeing trips, and holiday packages with Vizag Taxi Hub." />
        <meta property="og:image" content="/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://vizagtaxihub.com/tours" />
        <meta property="twitter:title" content="Tour Packages - Vizag Taxi Hub | Best Tour Packages in Visakhapatnam" />
        <meta property="twitter:description" content="Explore amazing tour packages in and around Visakhapatnam. Book guided tours and sightseeing trips." />
        <meta property="twitter:image" content="/og-image.png" />
        
        {/* Additional SEO */}
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://vizagtaxihub.com/tours" />
      </Helmet>
      
      <div className="min-h-screen bg-white flex flex-col">
        <Navbar />
        <main className="flex-1 pt-16">
          
          {/* Hero Section - Only show when not searching */}
          {!searchInitiated && (
            <section className="relative bg-gradient-to-br from-emerald-50 to-white pt-16 md:pt-24 pb-16 md:pb-32">
              <div className="max-w-7xl mx-auto px-4 md:px-6">
                <motion.div 
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8 }}
                  className="text-center mb-8 md:mb-24"
                >
                  <div className="inline-flex items-center px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-emerald-100 text-emerald-700 text-xs md:text-sm font-medium mb-4 md:mb-6">
                    <CheckCircle className="w-3 h-3 md:w-4 md:h-4 mr-2" />
                    Vizag's Most Trusted Tour Service
                  </div>
                  <h1 className="text-3xl md:text-5xl lg:text-7xl font-bold text-gray-900 mb-3 md:mb-5 leading-tight">
                    Explore Amazing
                    <br />
                    <span className="text-emerald-500">Destinations</span>
                  </h1>
                  <p className="text-base md:text-xl text-gray-600 mb-8 md:mb-40 max-w-2xl mx-auto">
                    Discover breathtaking destinations around Visakhapatnam with our carefully crafted tour packages.
                  </p>
                </motion.div>
                
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="rounded-xl md:rounded-2xl md:p-8"
                >
                  {renderSearchForm()}
                </motion.div>
              </div>
            </section>
          )}

          {/* Features Section */}
          {!searchInitiated && (
            <section className="py-16 bg-white">
              <div className="max-w-7xl mx-auto px-4 md:px-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="text-center mb-12"
                >
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Why Choose Our Tours?</h2>
                  <p className="text-lg text-gray-600">Experience the best tour packages with unmatched service quality</p>
                </motion.div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                  {features.map((feature, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, delay: index * 0.1 }}
                      className="text-center"
                    >
                      <div className={`w-16 h-16 ${feature.color} rounded-2xl flex items-center justify-center mx-auto mb-4 text-white`}>
                        {feature.icon}
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
                      <p className="text-gray-600">{feature.description}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </section>
          )}

          
          {/* Search Results */}
          {searchInitiated && (
            <section id="tour-results" className="pt-8 pb-16 bg-gray-50">
              <div className="max-w-7xl mx-auto px-4 md:px-6">
                {/* Collapsible Search Form */}
                <div className={`transition-all duration-300 ease-in-out overflow-hidden mb-6 ${
                  showSearchForm ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                }`}>
                  {renderSearchForm()}
                </div>
                
                {renderTourListing()}
              </div>
            </section>
          )}

          {/* CTA Section */}
          {!searchInitiated && (
            <section className="py-16 bg-emerald-500 text-white">
              <div className="max-w-4xl mx-auto text-center px-4 md:px-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                >
                  <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready for Your Adventure?</h2>
                  <p className="text-xl text-emerald-100 mb-8">
                    Join thousands of satisfied customers who trust us for their tour experiences. 
                    Book now and create unforgettable memories.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <Button 
                      size="lg" 
                      className="bg-white text-emerald-600 hover:bg-gray-100 font-bold px-8 py-4 rounded-xl"
                      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    >
                      <Search className="mr-2 h-5 w-5" />
                      Start Your Search
                    </Button>
                    <div className="text-emerald-100 text-sm">
                      Available 24/7 • Instant Booking • Best Rates Guaranteed
                    </div>
                  </div>
                </motion.div>
              </div>
            </section>
          )}
          
        </main>
        <Footer />
        <MobileNavigation />
      </div>
    </>
  );
};

export default ToursPage;
