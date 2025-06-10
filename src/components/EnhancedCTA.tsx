
import React from 'react';
import { Button } from '@/components/ui/button';
import { Car, Phone, MessageCircle, Calendar, MapPin, Shield } from 'lucide-react';
import { motion } from 'framer-motion';

export function EnhancedCTA() {
  const features = [
    { icon: Shield, text: "Verified Drivers" },
    { icon: Car, text: "Clean Vehicles" },
    { icon: MapPin, text: "GPS Tracking" },
    { icon: Calendar, text: "24/7 Service" }
  ];

  return (
    <section className="py-16 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full -translate-x-32 -translate-y-32"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full translate-x-48 translate-y-48"></div>
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div 
          className="text-center text-white"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Ready to Book Your Ride?
          </h2>
          <p className="text-xl mb-8 text-blue-100 max-w-2xl mx-auto">
            Experience hassle-free travel with Vizag Taxi Hub. Professional service guaranteed.
          </p>
          
          {/* Features */}
          <div className="flex flex-wrap justify-center gap-6 mb-12">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full"
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <feature.icon className="h-5 w-5 text-blue-200" />
                <span className="text-sm font-medium">{feature.text}</span>
              </motion.div>
            ))}
          </div>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              size="lg" 
              className="bg-white text-blue-700 hover:bg-gray-100 px-12 py-4 text-lg font-semibold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
            >
              <Car className="mr-3 h-6 w-6" />
              Book Your Taxi Now
            </Button>
            
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                size="lg"
                className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-blue-700 px-8 py-4 rounded-2xl font-semibold transition-all duration-300"
              >
                <Phone className="mr-2 h-5 w-5" />
                Call Now
              </Button>
              
              <Button 
                variant="outline" 
                size="lg"
                className="bg-green-600 border-2 border-green-500 text-white hover:bg-green-500 px-8 py-4 rounded-2xl font-semibold transition-all duration-300"
              >
                <MessageCircle className="mr-2 h-5 w-5" />
                WhatsApp
              </Button>
            </div>
          </div>
          
          <div className="mt-8 text-blue-200 text-sm">
            ⭐ Rated 4.8/5 by 500+ satisfied customers
          </div>
        </motion.div>
      </div>
    </section>
  );
}
