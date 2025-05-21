
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LocationInput } from "@/components/LocationInput";
import { DateTimePicker } from "@/components/DateTimePicker";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar, ChevronRight } from "lucide-react";
import { TabTripSelector } from "./TabTripSelector";
import { useNavigate } from 'react-router-dom';
import { useToast } from "@/components/ui/use-toast";
import { Location, searchLocations } from "@/lib/locationData";
import { LocalTripSelector } from './LocalTripSelector';
import { convertToApiLocation, isLocationInVizag } from '@/lib/locationUtils';
import { motion, AnimatePresence } from 'framer-motion';
import { TripType } from '@/lib/tripTypes';
import { availableTours } from '@/lib/tourData';

export const Hero = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // State for trip options
  const [tripType, setTripType] = useState<TripType>('outstation');
  const [tripMode, setTripMode] = useState<'one-way' | 'round-trip'>('one-way');
  const [hourlyPackage, setHourlyPackage] = useState<string>('8hrs-80km');
  
  // State for locations and dates
  const [pickupLocation, setPickupLocation] = useState<Location | null>(null);
  const [dropLocation, setDropLocation] = useState<Location | null>(null);
  const [pickupDate, setPickupDate] = useState<Date | undefined>(
    new Date(Date.now() + 2 * 60 * 60 * 1000)
  );
  const [returnDate, setReturnDate] = useState<Date | undefined>(
    new Date(Date.now() + 26 * 60 * 60 * 1000)
  );

  // Animation variants
  const formVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.3,
        when: "beforeChildren",
        staggerChildren: 0.1
      }
    },
    exit: { 
      opacity: 0,
      y: -20,
      transition: { duration: 0.2 }
    }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.3 }
    }
  };

  // Update trip settings in sessionStorage
  useEffect(() => {
    if (tripType) {
      sessionStorage.setItem('tripType', tripType);
    }
    if (tripMode) {
      sessionStorage.setItem('tripMode', tripMode);
    }
    if (hourlyPackage) {
      sessionStorage.setItem('hourlyPackage', hourlyPackage);
    }
  }, [tripType, tripMode, hourlyPackage]);

  // Load trip settings from sessionStorage on component mount
  useEffect(() => {
    const savedTripType = sessionStorage.getItem('tripType') as TripType | null;
    const savedTripMode = sessionStorage.getItem('tripMode') as 'one-way' | 'round-trip' | null;
    const savedHourlyPackage = sessionStorage.getItem('hourlyPackage');

    if (savedTripType && (savedTripType === 'outstation' || savedTripType === 'local' || savedTripType === 'airport' || savedTripType === 'tour')) {
      setTripType(savedTripType);
    }
    
    if (savedTripMode && (savedTripMode === 'one-way' || savedTripMode === 'round-trip')) {
      setTripMode(savedTripMode);
    }
    
    if (savedHourlyPackage) {
      setHourlyPackage(savedHourlyPackage);
    }
  }, []);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // If no pickup location is selected
    if (!pickupLocation) {
      toast({
        title: "Pickup location required",
        description: "Please select a pickup location.",
        variant: "destructive",
      });
      return;
    }

    // For outstation trips, validate drop location
    if (tripType === 'outstation' && !dropLocation) {
      toast({
        title: "Drop location required",
        description: "Please select a drop location.",
        variant: "destructive",
      });
      return;
    }

    // For local trips, ensure pickup location is within Vizag
    if (tripType === 'local' || tripType === 'airport') {
      const isInVizag = pickupLocation.isInVizag !== undefined ? 
        pickupLocation.isInVizag : 
        isLocationInVizag(pickupLocation);
        
      if (!isInVizag) {
        toast({
          title: "Invalid pickup location",
          description: "For local trips, pickup must be within Visakhapatnam city limits.",
          variant: "destructive",
        });
        return;
      }
    }

    // For airport trips, additional validations could go here
    
    // For tour trips, navigate to the tours page
    if (tripType === 'tour') {
      navigate('/tours');
      return;
    }

    // Save selections to sessionStorage
    if (pickupLocation) {
      try {
        sessionStorage.setItem('pickupLocation', JSON.stringify(pickupLocation));
      } catch (e) {
        console.error('Error storing pickupLocation:', e);
      }
    }
    
    if (dropLocation) {
      try {
        sessionStorage.setItem('dropLocation', JSON.stringify(dropLocation));
      } catch (e) {
        console.error('Error storing dropLocation:', e);
      }
    }
    
    if (pickupDate) {
      try {
        sessionStorage.setItem('pickupDate', pickupDate.toISOString());
      } catch (e) {
        console.error('Error storing pickupDate:', e);
      }
    }
    
    if (tripMode === 'round-trip' && returnDate) {
      try {
        sessionStorage.setItem('returnDate', returnDate.toISOString());
      } catch (e) {
        console.error('Error storing returnDate:', e);
      }
    } else {
      sessionStorage.removeItem('returnDate');
    }

    // Navigate to the cab selection page
    navigate('/cabs');
  };

  // Handle trip type and mode changes
  const handleTripTypeChange = (type: TripType) => {
    setTripType(type);
    
    // Clear locations when changing trip types
    if (type === 'tour') {
      navigate('/tours');
      return;
    }
  };
  
  const handleTripModeChange = (mode: 'one-way' | 'round-trip') => {
    setTripMode(mode);
  };

  return (
    <div className="relative bg-gray-50 min-h-[80vh] md:min-h-[90vh] w-full">
      {/* Hero Background with gradient overlay */}
      <div 
        className="absolute top-0 left-0 w-full h-full bg-cover bg-center"
        style={{ 
          backgroundImage: 'url(/hero-bg.jpg)',
          backgroundPosition: 'center bottom',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/80 to-black/60"></div>
      </div>
      
      {/* Content container */}
      <div className="container relative mx-auto px-4 py-16 md:py-24 flex flex-col h-full">
        {/* Hero text content */}
        <div className="mb-12 md:mb-8 text-center">
          <h1 className="text-3xl md:text-5xl font-bold mb-4 text-white">
            Your Journey, Our Commitment
          </h1>
          <p className="text-lg md:text-xl max-w-2xl mx-auto text-gray-100">
            Book a cab for local, outstation, airport transfers or tour packages.
          </p>
        </div>
        
        {/* Trip selector tabs */}
        <div className="max-w-5xl mx-auto w-full mb-6">
          <TabTripSelector 
            selectedTab={tripType} 
            tripMode={tripMode}
            onTabChange={handleTripTypeChange} 
            onTripModeChange={handleTripModeChange} 
          />
        </div>
        
        {/* Trip booking form */}
        <div className="w-full max-w-5xl mx-auto bg-white rounded-xl shadow-xl overflow-hidden z-10">
          <AnimatePresence mode="wait">
            {tripType === 'tour' ? (
              <motion.div
                key="tour-form"
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={formVariants}
                className="p-6 md:p-8"
              >
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-semibold text-gray-800">Explore Tour Packages</h2>
                  <p className="text-gray-600 mt-2">Discover amazing destinations with our tour packages</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                  {availableTours.slice(0, 3).map((tour) => (
                    <motion.div
                      key={tour.id}
                      variants={itemVariants}
                      className="bg-white border border-gray-200 hover:border-blue-300 transition-colors rounded-lg overflow-hidden shadow-sm hover:shadow"
                    >
                      <div className="h-40 bg-gray-200 relative">
                        {tour.image ? (
                          <img 
                            src={tour.image} 
                            alt={tour.name} 
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-100">
                            <span className="text-gray-400">No image</span>
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold">{tour.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">{tour.distance} km journey</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
                
                <div className="mt-6 flex justify-center">
                  <Button 
                    onClick={() => navigate('/tours')}
                    className="bg-blue-600 hover:bg-blue-700 flex items-center"
                  >
                    View All Tour Packages
                    <ChevronRight className="ml-1 h-5 w-5" />
                  </Button>
                </div>
              </motion.div>
            ) : tripType === 'local' ? (
              <motion.div
                key="local-form"
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={formVariants}
                className="p-6 md:p-8"
              >
                <div className="mb-6">
                  <LocalTripSelector
                    selectedPackage={hourlyPackage}
                    onChange={setHourlyPackage}
                  />
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <LocationInput
                      label="PICKUP LOCATION"
                      placeholder="Enter pickup location"
                      value={pickupLocation ? convertToApiLocation(pickupLocation) : undefined}
                      onLocationChange={setPickupLocation}
                      isPickupLocation={true}
                    />
                    <DateTimePicker
                      label="PICKUP DATE & TIME"
                      date={pickupDate}
                      onDateChange={setPickupDate}
                      minDate={new Date()}
                    />
                  </motion.div>
                  <motion.div variants={itemVariants}>
                    <Button 
                      type="submit" 
                      className="bg-blue-600 hover:bg-blue-700 w-full py-6 text-lg"
                    >
                      Find Cabs <ArrowRight className="ml-2" />
                    </Button>
                  </motion.div>
                </form>
              </motion.div>
            ) : tripType === 'airport' ? (
              <motion.div
                key="airport-form"
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={formVariants}
                className="p-6 md:p-8"
              >
                <form onSubmit={handleSubmit} className="space-y-6">
                  <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <LocationInput
                      label="PICKUP LOCATION"
                      placeholder="Enter pickup location"
                      value={pickupLocation ? convertToApiLocation(pickupLocation) : undefined}
                      onLocationChange={setPickupLocation}
                      isPickupLocation={true}
                    />
                    <DateTimePicker
                      label="PICKUP DATE & TIME"
                      date={pickupDate}
                      onDateChange={setPickupDate}
                      minDate={new Date()}
                    />
                  </motion.div>
                  <motion.div variants={itemVariants}>
                    <Button 
                      type="submit" 
                      className="bg-blue-600 hover:bg-blue-700 w-full py-6 text-lg"
                    >
                      Find Airport Cabs <ArrowRight className="ml-2" />
                    </Button>
                  </motion.div>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="outstation-form"
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={formVariants}
                className="p-6 md:p-8"
              >
                <form onSubmit={handleSubmit} className="space-y-6">
                  <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <LocationInput
                      label="PICKUP LOCATION"
                      placeholder="Enter pickup location"
                      value={pickupLocation ? convertToApiLocation(pickupLocation) : undefined}
                      onLocationChange={setPickupLocation}
                      isPickupLocation={true}
                    />
                    <LocationInput
                      label="DROP LOCATION"
                      placeholder="Enter drop location"
                      value={dropLocation ? convertToApiLocation(dropLocation) : undefined}
                      onLocationChange={setDropLocation}
                      isPickupLocation={false}
                    />
                  </motion.div>

                  <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <DateTimePicker
                      label="PICKUP DATE & TIME"
                      date={pickupDate}
                      onDateChange={setPickupDate}
                      minDate={new Date()}
                    />
                    
                    {tripMode === 'round-trip' && (
                      <DateTimePicker
                        label="RETURN DATE & TIME"
                        date={returnDate}
                        onDateChange={setReturnDate}
                        minDate={pickupDate || new Date()}
                      />
                    )}
                  </motion.div>
                  
                  <motion.div variants={itemVariants}>
                    <Button 
                      type="submit" 
                      className="bg-blue-600 hover:bg-blue-700 w-full py-6 text-lg"
                    >
                      Find Cabs <ArrowRight className="ml-2" />
                    </Button>
                  </motion.div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Tour packages highlight */}
        <div className="mt-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="bg-white/80 backdrop-blur-md mx-auto rounded-lg p-6 max-w-3xl"
          >
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Popular Tour Packages</h2>
            <div className="flex flex-wrap gap-4 justify-center">
              {availableTours.slice(0, 3).map(tour => (
                <div 
                  key={tour.id}
                  className="px-4 py-2 bg-blue-50 border border-blue-200 rounded-full text-blue-700 hover:bg-blue-100 cursor-pointer transition-colors"
                  onClick={() => navigate('/tours')}
                >
                  {tour.name}
                </div>
              ))}
            </div>
            <Button
              variant="link"
              onClick={() => navigate('/tours')}
              className="mt-4 text-blue-600"
            >
              View all tour packages <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
