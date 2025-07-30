import React from 'react';
import { motion } from 'framer-motion';
import { LocalHeroWidget } from "@/components/LocalHeroWidget";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Car, Shield, Star, Phone, Clock, Users, MapPin, Zap, CheckCircle, ArrowRight, Navigation } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

export function LocalTaxiPage() {
  const features = [
    { 
      icon: <Zap className="w-6 h-6" />, 
      title: 'Quick Pickup', 
      description: 'Average pickup time of 3-5 minutes in city areas.',
      color: 'bg-blue-500'
    },
    { 
      icon: <Shield className="w-6 h-6" />, 
      title: 'Safe Rides', 
      description: 'All drivers verified with background checks and GPS tracking.',
      color: 'bg-green-500'
    },
    { 
      icon: <Clock className="w-6 h-6" />, 
      title: '24/7 Service', 
      description: 'Available round the clock for all your local travel needs.',
      color: 'bg-purple-500'
    },
    { 
      icon: <Star className="w-6 h-6" />, 
      title: 'Fair Pricing', 
      description: 'Transparent meter rates with no surge pricing ever.',
      color: 'bg-amber-500'
    }
  ];

  const serviceAreas = [
    { area: 'MVP Colony', distance: '2 km', time: '3-5 min' },
    { area: 'Dwaraka Nagar', distance: '4 km', time: '5-8 min' },
    { area: 'Gajuwaka', distance: '12 km', time: '15-20 min' },
    { area: 'Madhurawada', distance: '15 km', time: '20-25 min' },
    { area: 'Beach Road', distance: '3 km', time: '5-7 min' },
    { area: 'Rushikonda', distance: '8 km', time: '10-15 min' },
  ];

  const vehicleOptions = [
    { type: 'Mini', capacity: '4', rate: '₹10/km', features: ['AC', 'Music'] },
    { type: 'Sedan', capacity: '4', rate: '₹12/km', features: ['AC', 'Music', 'Premium'] },
    { type: 'SUV', capacity: '6', rate: '₹16/km', features: ['AC', 'Music', 'Spacious'] },
  ];

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "Local Taxi Service Visakhapatnam",
    "description": "Professional local cab booking service in Visakhapatnam. City taxi, point to point rides, and hourly rentals available 24/7.",
    "provider": {
      "@type": "LocalBusiness",
      "name": "Vizag Taxi Hub",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Visakhapatnam",
        "addressRegion": "Andhra Pradesh",
        "addressCountry": "IN"
      },
      "telephone": "+91-9966363662"
    },
    "areaServed": {
      "@type": "City",
      "name": "Visakhapatnam"
    },
    "serviceType": "Local Taxi Service",
    "offers": {
      "@type": "Offer",
      "priceRange": "₹10-16 per km",
      "availability": "https://schema.org/InStock"
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>Local Taxi Service Visakhapatnam | City Cab Booking | Vizag Taxi Hub</title>
        <meta name="description" content="Book local taxi in Visakhapatnam for city rides, airport transfers, point to point travel. 24/7 available city cab service with verified drivers and fair pricing." />
        <meta name="keywords" content="local taxi visakhapatnam, city cab vizag, local cab booking visakhapatnam, vizag city taxi, point to point taxi vizag" />
        <link rel="canonical" href="https://www.vizagup.com/local-taxi" />
      </Helmet>
      
      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-50 bg-white border-b border-gray-100"
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="font-bold text-2xl text-gray-900">
            Vizag Taxi Hub
          </div>
          <Button 
            onClick={() => window.open(`tel:+91-9966363662`)}
            className="bg-blue-500 hover:bg-blue-600 text-white rounded-full px-6"
          >
            <Phone className="w-4 h-4 mr-2" />
            Call Now
          </Button>
        </div>
      </motion.header>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-50 to-white pt-16 pb-24">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-100 text-blue-700 text-sm font-medium mb-6">
              <CheckCircle className="w-4 h-4 mr-2" />
              Visakhapatnam's Premier Local Taxi Service
            </div>
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
              Your City
              <br />
              <span className="text-blue-500">Your Ride</span>
            </h1>
            <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
              Quick, safe, and affordable local taxi service across Visakhapatnam. Available 24/7 for all your city travel needs.
            </p>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100"
          >
            <LocalHeroWidget />
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Why Choose Our Local Service</h2>
            <p className="text-xl text-gray-600">Designed for the modern city traveler</p>
          </motion.div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div 
                key={index} 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white rounded-xl p-6 text-center hover:shadow-lg transition-shadow"
              >
                <div className={`w-12 h-12 ${feature.color} rounded-xl flex items-center justify-center mb-4 mx-auto text-white`}>
                  {feature.icon}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Vehicle Options */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Choose Your Ride</h2>
            <p className="text-xl text-gray-600">Perfect vehicle for every journey</p>
          </motion.div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {vehicleOptions.map((vehicle, index) => (
              <motion.div 
                key={index} 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-gray-50 rounded-xl p-6 hover:bg-blue-50 transition-colors group"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-xl text-gray-900">{vehicle.type}</h3>
                  <Car className="w-8 h-8 text-blue-500" />
                </div>
                <div className="text-sm text-gray-600 mb-2">{vehicle.capacity} Seater</div>
                <div className="text-2xl font-bold text-blue-500 mb-4">{vehicle.rate}</div>
                <div className="space-y-2">
                  {vehicle.features.map((feature, i) => (
                    <div key={i} className="flex items-center text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-blue-500 mr-2" />
                      {feature}
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Service Areas */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Service Areas</h2>
            <p className="text-xl text-gray-600">Quick pickups across Visakhapatnam</p>
          </motion.div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {serviceAreas.map((area, index) => (
              <motion.div 
                key={index} 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white rounded-xl p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center mb-4">
                  <MapPin className="w-5 h-5 text-blue-500 mr-2" />
                  <h3 className="font-bold text-gray-900">{area.area}</h3>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Distance from center:</span>
                    <span className="font-medium">{area.distance}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Pickup time:</span>
                    <span className="font-medium text-blue-500">{area.time}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Service Types */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Our Services</h2>
            <p className="text-xl text-gray-600">Flexible options for every need</p>
          </motion.div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-gradient-to-br from-blue-50 to-white rounded-xl p-8 text-center"
            >
              <div className="w-16 h-16 bg-blue-500 rounded-xl flex items-center justify-center mb-6 mx-auto">
                <Navigation className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Point to Point</h3>
              <p className="text-gray-600 mb-6">Quick rides to your destination with meter-based pricing</p>
              <Button className="bg-blue-500 hover:bg-blue-600 text-white">
                Book Now
              </Button>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-gradient-to-br from-green-50 to-white rounded-xl p-8 text-center"
            >
              <div className="w-16 h-16 bg-green-500 rounded-xl flex items-center justify-center mb-6 mx-auto">
                <Clock className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Hourly Rental</h3>
              <p className="text-gray-600 mb-6">Rent a cab for multiple stops and shopping trips</p>
              <Button className="bg-green-500 hover:bg-green-600 text-white">
                Book Now
              </Button>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-br from-purple-50 to-white rounded-xl p-8 text-center"
            >
              <div className="w-16 h-16 bg-purple-500 rounded-xl flex items-center justify-center mb-6 mx-auto">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Corporate</h3>
              <p className="text-gray-600 mb-6">Special rates for business travel and corporate accounts</p>
              <Button className="bg-purple-500 hover:bg-purple-600 text-white">
                Contact Us
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-20 bg-gray-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20"></div>
        <div className="relative max-w-4xl mx-auto text-center px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Need a Ride Right Now?</h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Quick pickups, safe rides, and fair pricing. Your trusted local taxi service in Visakhapatnam.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                size="lg" 
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold px-8 py-4 rounded-xl"
                onClick={() => window.open(`tel:+91-9966363662`)}
              >
                <Phone className="w-5 h-5 mr-2" />
                Call Now: +91-9966363662
              </Button>
              <div className="text-gray-400 text-sm">
                Available 24/7 • No Surge Pricing • Instant Booking
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
    </div>
  );
}