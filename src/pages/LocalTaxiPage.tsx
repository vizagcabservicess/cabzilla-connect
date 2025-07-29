import React from 'react';
import { Hero } from '@/components/Hero';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Map, Shield, Star, Phone, Car, ArrowRight, Clock, MapPin, Navigation, Zap, Users, Award } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';

export function LocalTaxiPage() {
  const features = [
    { 
      icon: <Zap className="w-6 h-6" />, 
      title: 'Instant Pickup', 
      description: 'Get a cab within 5 minutes anywhere in the city.',
      color: 'from-orange-500 to-red-500'
    },
    { 
      icon: <MapPin className="w-6 h-6" />, 
      title: 'Local Expertise', 
      description: 'Drivers who know every street and shortcut in Vizag.',
      color: 'from-green-500 to-teal-500'
    },
    { 
      icon: <Clock className="w-6 h-6" />, 
      title: '24/7 Available', 
      description: 'Round-the-clock service for all your city travel needs.',
      color: 'from-blue-500 to-purple-500'
    },
    { 
      icon: <Star className="w-6 h-6" />, 
      title: 'Fixed Pricing', 
      description: 'Transparent rates with no surge pricing or hidden fees.',
      color: 'from-yellow-500 to-orange-500'
    }
  ];

  const services = [
    { 
      name: 'Point to Point', 
      description: 'Direct travel within the city',
      price: '₹150',
      icon: <Navigation className="w-6 h-6" />
    },
    { 
      name: 'Hourly Rental', 
      description: 'Multiple hours with waiting',
      price: '₹200/hr',
      icon: <Clock className="w-6 h-6" />
    },
    { 
      name: 'Half Day', 
      description: 'City tours and sightseeing',
      price: '₹1,500',
      icon: <Map className="w-6 h-6" />
    },
    { 
      name: 'Full Day', 
      description: 'Complete day city exploration',
      price: '₹2,500',
      icon: <Car className="w-6 h-6" />
    }
  ];

  const popularRoutes = [
    { from: 'Railway Station', to: 'RK Beach', distance: '8 km', price: '₹150' },
    { from: 'Airport', to: 'City Center', distance: '12 km', price: '₹200' },
    { from: 'Bus Stand', to: 'Kailasagiri', distance: '15 km', price: '₹250' },
    { from: 'Beach Road', to: 'Rushikonda', distance: '20 km', price: '₹300' }
  ];

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "Local Taxi Service Visakhapatnam",
    "description": "Professional local cab booking service in Visakhapatnam. Point to point travel, hourly rentals, and city tours within Vizag.",
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50">
      <Helmet>
        <title>Local Taxi Service Visakhapatnam | Book Cabs in Vizag | City Taxi Booking</title>
        <meta name="description" content="Book local taxi in Visakhapatnam for city travel, hourly rentals, and point-to-point trips. Best rates for Vizag local cab service. Available 24/7." />
        <meta name="keywords" content="local taxi visakhapatnam, vizag cab booking, local cab service vizag, taxi in visakhapatnam, city taxi booking, hourly cab rental vizag" />
        <link rel="canonical" href="https://www.vizagup.com/local-taxi" />
      </Helmet>
      
      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-200/50"
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="font-bold text-xl bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
            Vizag Taxi Hub
          </div>
          <Button 
            onClick={() => window.open(`tel:+91-9966363662`)}
            className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <Phone className="w-4 h-4 mr-2" />
            Call Now
          </Button>
        </div>
      </motion.header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-600/10 to-red-600/10" />
        <div className="relative px-6 py-20 lg:py-32">
          <div className="max-w-6xl mx-auto">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center mb-16"
            >
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-orange-100 text-orange-700 text-sm font-medium mb-6">
                <Award className="w-4 h-4 mr-2" />
                Vizag's Fastest Local Taxi Service
              </div>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 tracking-tight">
                Move Around <br />
                <span className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                  The City
                </span>
              </h1>
              <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
                Your reliable partner for all local travel needs in Visakhapatnam. 
                From quick point-to-point trips to full-day city tours.
              </p>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="bg-white rounded-3xl shadow-2xl p-8 lg:p-12 border border-gray-200/50"
            >
              <Hero />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-6xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Why Locals Love Us</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              The most trusted local taxi service in Visakhapatnam
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div 
                key={index} 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="relative group"
              >
                <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 group-hover:border-gray-200">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-r ${feature.color} flex items-center justify-center mb-6 text-white shadow-lg`}>
                    {feature.icon}
                  </div>
                  <h3 className="font-bold text-gray-900 mb-3 text-lg">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="px-6 py-20 bg-gradient-to-br from-gray-50 to-orange-50">
        <div className="max-w-6xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Our Services</h2>
            <p className="text-xl text-gray-600">Perfect solutions for every local travel need</p>
          </motion.div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((service, index) => (
              <motion.div 
                key={index} 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200/50 group hover:scale-105"
              >
                <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mb-6 text-white shadow-lg">
                  {service.icon}
                </div>
                
                <h3 className="font-bold text-gray-900 mb-3 text-lg group-hover:text-orange-600 transition-colors">{service.name}</h3>
                <p className="text-gray-600 mb-6 leading-relaxed">{service.description}</p>
                
                <div className="flex items-center justify-between mb-6">
                  <span className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                    {service.price}
                  </span>
                </div>
                
                <Button className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white shadow-lg hover:shadow-xl transition-all duration-300">
                  Book Now
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Routes */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-6xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Popular Routes</h2>
            <p className="text-xl text-gray-600">Most traveled destinations within the city</p>
          </motion.div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {popularRoutes.map((route, index) => (
              <motion.div 
                key={index} 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200/50 group hover:scale-105"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-full"></div>
                    <div className="flex-1 h-0.5 bg-gradient-to-r from-orange-500 to-red-500 opacity-30"></div>
                    <ArrowRight className="w-4 h-4 text-orange-500" />
                    <div className="flex-1 h-0.5 bg-gradient-to-r from-orange-500 to-red-500 opacity-30"></div>
                    <div className="w-3 h-3 bg-gradient-to-r from-red-500 to-pink-500 rounded-full"></div>
                  </div>
                </div>
                
                <h3 className="font-bold text-gray-900 mb-2 text-lg group-hover:text-orange-600 transition-colors">
                  {route.from} → {route.to}
                </h3>
                
                <div className="flex items-center justify-between mb-4">
                  <Badge variant="outline" className="text-sm border-orange-200 text-orange-700">
                    {route.distance}
                  </Badge>
                  <span className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                    {route.price}
                  </span>
                </div>
                
                <Button className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white shadow-lg hover:shadow-xl transition-all duration-300">
                  Book Now
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative px-6 py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-600 via-red-600 to-orange-800"></div>
        <div className="absolute inset-0 opacity-10">
          <div className="w-full h-full bg-white bg-opacity-10" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)", backgroundSize: "20px 20px" }}></div>
        </div>
        <div className="relative max-w-4xl mx-auto text-center text-white">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Need a Quick Ride?</h2>
            <p className="text-xl text-orange-100 mb-8 max-w-2xl mx-auto leading-relaxed">
              Get around Vizag quickly and safely with our reliable local taxi service. 
              Available 24/7 for all your city travel needs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                size="lg" 
                className="bg-white text-orange-600 hover:bg-orange-50 font-bold px-8 py-4 rounded-xl shadow-2xl hover:shadow-orange-500/25 transition-all duration-300"
                onClick={() => window.open(`tel:+91-9966363662`)}
              >
                <Phone className="w-5 h-5 mr-2" />
                Call Now: +91-9966363662
              </Button>
              <div className="text-orange-200 text-sm">
                Available 24/7 • 5 Min Pickup • Fixed Rates
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