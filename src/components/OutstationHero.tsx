
import React, { useState } from 'react';
import { OutstationOnlyWidget } from './OutstationOnlyWidget';
import { motion } from 'framer-motion';
import { Car, MapPin, Clock, Star } from 'lucide-react';

interface OutstationHeroProps {
  initialPickup?: string;
  initialDrop?: string;
  onSearch?: (searchData: any) => void;
}

export function OutstationHero({ initialPickup, initialDrop, onSearch }: OutstationHeroProps) {
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);

  const stats = [
    { icon: Car, value: "500+", label: "Happy Customers" },
    { icon: MapPin, value: "50+", label: "Destinations" },
    { icon: Clock, value: "24/7", label: "Service" },
    { icon: Star, value: "4.8", label: "Rating" }
  ];

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          muted
          loop
          playsInline
          className={`w-full h-full object-cover transition-opacity duration-1000 ${isVideoLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoadedData={() => setIsVideoLoaded(true)}
          poster="https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80"
        >
          <source src="https://player.vimeo.com/external/195913085.sd.mp4?s=7635c4b1d1e5c7b5e15e5e2b1e5e5e5e&profile_id=164&oauth2_token_id=57447761" type="video/mp4" />
        </video>
        
        {/* Fallback Image */}
        <div 
          className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${isVideoLoaded ? 'opacity-0' : 'opacity-100'}`}
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80')"
          }}
        />
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center text-white">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">Available 24/7</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-medium mb-6 leading-tight">
            Outstation Journeys,
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-400">
              Made Simple
            </span>
          </h1>
          
          <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto text-gray-200 leading-relaxed">
            Book comfortable outstation cabs from Visakhapatnam to your favorite destinations 
            with professional drivers and transparent pricing.
          </p>

          {/* Outstation Search Widget */}
          <div className="relative z-20 flex justify-center items-center mb-8">
            <div className="w-full max-w-2xl md:max-w-3xl lg:max-w-4xl mx-auto px-2 md:px-0">
              <div className="bg-white/95 md:bg-white/90 rounded-2xl md:rounded-3xl shadow-2xl p-4 md:p-6 border border-gray-100 backdrop-blur-md">
                <OutstationOnlyWidget
                  initialPickup={initialPickup}
                  initialDrop={initialDrop}
                  onSearch={onSearch}
                />
              </div>
            </div>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 + index * 0.1 }}
                className="text-center"
              >
                <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 mb-2 inline-flex items-center justify-center">
                  <stat.icon className="h-6 w-6 text-blue-400" />
                </div>
                <div className="text-2xl md:text-3xl font-medium mb-1">{stat.value}</div>
                <div className="text-sm text-gray-300">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
      
      {/* Scroll Indicator */}
      <motion.div 
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-white/70 rounded-full mt-2"></div>
        </div>
      </motion.div>
    </section>
  );
}
