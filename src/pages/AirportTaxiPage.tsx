import React from 'react';
import { AirportHeroWidget } from '@/components/AirportHeroWidget';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plane, Phone, ArrowRight, Clock, MapPin, Luggage, Navigation, Shield, Award, Zap } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';

export function AirportTaxiPage() {
  const features = [
    { 
      icon: <Plane className="w-6 h-6" />, 
      title: 'Flight Tracking', 
      description: 'Real-time flight monitoring to handle delays and early arrivals.',
      color: 'from-sky-500 to-blue-500'
    },
    { 
      icon: <Clock className="w-6 h-6" />, 
      title: 'Punctual Service', 
      description: 'Never miss a flight with our reliable time management.',
      color: 'from-green-500 to-emerald-500'
    },
    { 
      icon: <MapPin className="w-6 h-6" />, 
      title: 'Meet & Greet', 
      description: 'Personal assistance with name boards and luggage help.',
      color: 'from-purple-500 to-pink-500'
    },
    { 
      icon: <Shield className="w-6 h-6" />, 
      title: 'Safe Transfer', 
      description: 'Licensed drivers and GPS tracking for secure travel.',
      color: 'from-orange-500 to-red-500'
    }
  ];

  const services = [
    { 
      name: 'Airport Pickup', 
      description: 'From airport to your destination',
      price: '₹350',
      icon: <Plane className="w-6 h-6" />
    },
    { 
      name: 'Airport Drop', 
      description: 'From your location to airport',
      price: '₹350',
      icon: <Navigation className="w-6 h-6" />
    },
    { 
      name: 'Round Trip', 
      description: 'Complete transfer solution',
      price: '₹600',
      icon: <ArrowRight className="w-6 h-6" />
    },
    { 
      name: 'Corporate', 
      description: 'Business travel transfers',
      price: '₹500',
      icon: <Luggage className="w-6 h-6" />
    }
  ];

  const popularRoutes = [
    { from: 'Airport', to: 'Railway Station', distance: '12 km', price: '₹350' },
    { from: 'Airport', to: 'Beach Road', distance: '15 km', price: '₹400' },
    { from: 'Airport', to: 'Rushikonda', distance: '25 km', price: '₹500' },
    { from: 'Airport', to: 'Kailasagiri', distance: '18 km', price: '₹450' }
  ];

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "Airport Taxi Service Visakhapatnam",
    "description": "Professional airport transfer service in Visakhapatnam. Pickup and drop to Visakhapatnam Airport with flight tracking and fixed pricing.",
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
    "serviceType": "Airport Taxi Service",
    "offers": {
      "@type": "Offer",
      "priceRange": "₹300-550",
      "availability": "https://schema.org/InStock"
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50">
      <Helmet>
        <title>Airport Taxi Visakhapatnam | Airport Transfer Service | Vizag Airport Cab Booking</title>
        <meta name="description" content="Book airport taxi in Visakhapatnam for pickup and drop to Vizag Airport. Fixed pricing, flight tracking, and 24/7 availability. Best rates for airport transfer service." />
        <meta name="keywords" content="airport taxi visakhapatnam, vizag airport cab, airport transfer service, visakhapatnam airport pickup, airport drop vizag, taxi to airport" />
        <link rel="canonical" href="https://www.vizagup.com/local-taxi/airport-taxi" />
      </Helmet>
      
      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-200/50"
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="font-bold text-xl bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">
            Vizag Taxi Hub
          </div>
          <Button 
            onClick={() => window.open(`tel:+91-9966363662`)}
            className="bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <Phone className="w-4 h-4 mr-2" />
            Call Now
          </Button>
        </div>
      </motion.header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-sky-600/10 to-blue-600/10" />
        <div className="relative px-6 py-20 lg:py-32">
          <div className="max-w-6xl mx-auto">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center mb-16"
            >
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-sky-100 text-sky-700 text-sm font-medium mb-6">
                <Award className="w-4 h-4 mr-2" />
                Trusted Airport Transfer Service
              </div>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 tracking-tight">
                Fly With <br />
                <span className="bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">
                  Confidence
                </span>
              </h1>
              <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
                Hassle-free airport transfers with flight tracking, meet & greet service, 
                and guaranteed on-time pickup and drop to Vizag Airport.
              </p>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="bg-white rounded-3xl shadow-2xl p-8 lg:p-12 border border-gray-200/50"
            >
              <AirportHeroWidget />
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
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Why Travelers Trust Us</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Professional airport transfer service designed for your peace of mind
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
      <section className="px-6 py-20 bg-gradient-to-br from-gray-50 to-sky-50">
        <div className="max-w-6xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Transfer Services</h2>
            <p className="text-xl text-gray-600">Complete airport transportation solutions</p>
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
                <div className="w-16 h-16 bg-gradient-to-r from-sky-500 to-blue-500 rounded-2xl flex items-center justify-center mb-6 text-white shadow-lg">
                  {service.icon}
                </div>
                
                <h3 className="font-bold text-gray-900 mb-3 text-lg group-hover:text-sky-600 transition-colors">{service.name}</h3>
                <p className="text-gray-600 mb-6 leading-relaxed">{service.description}</p>
                
                <div className="flex items-center justify-between mb-6">
                  <span className="text-3xl font-bold bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">
                    {service.price}
                  </span>
                </div>
                
                <Button className="w-full bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300">
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
            <p className="text-xl text-gray-600">Most traveled destinations from Vizag Airport</p>
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
                    <Plane className="w-5 h-5 text-sky-600" />
                    <div className="flex-1 h-0.5 bg-gradient-to-r from-sky-500 to-blue-500 opacity-30"></div>
                    <ArrowRight className="w-4 h-4 text-sky-500" />
                    <div className="flex-1 h-0.5 bg-gradient-to-r from-sky-500 to-blue-500 opacity-30"></div>
                    <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
                  </div>
                </div>
                
                <h3 className="font-bold text-gray-900 mb-2 text-lg group-hover:text-sky-600 transition-colors">
                  {route.from} → {route.to}
                </h3>
                
                <div className="flex items-center justify-between mb-4">
                  <Badge variant="outline" className="text-sm border-sky-200 text-sky-700">
                    {route.distance}
                  </Badge>
                  <span className="text-2xl font-bold bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">
                    {route.price}
                  </span>
                </div>
                
                <Button className="w-full bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300">
                  Book Now
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative px-6 py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-sky-600 via-blue-600 to-sky-800"></div>
        <div className="absolute inset-0 opacity-10">
          <div className="w-full h-full bg-white bg-opacity-10" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)", backgroundSize: "20px 20px" }}></div>
        </div>
        <div className="relative max-w-4xl mx-auto text-center text-white">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Flying Soon?</h2>
            <p className="text-xl text-sky-100 mb-8 max-w-2xl mx-auto leading-relaxed">
              Book your airport transfer now for stress-free travel with flight tracking, 
              meet & greet service, and guaranteed punctual service.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                size="lg" 
                className="bg-white text-sky-600 hover:bg-sky-50 font-bold px-8 py-4 rounded-xl shadow-2xl hover:shadow-sky-500/25 transition-all duration-300"
                onClick={() => window.open(`tel:+91-9966363662`)}
              >
                <Phone className="w-5 h-5 mr-2" />
                Call Now: +91-9966363662
              </Button>
              <div className="text-sky-200 text-sm">
                24/7 Available • Flight Tracking • Fixed Rates
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