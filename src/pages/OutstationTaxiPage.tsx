import React from 'react';
import { motion } from 'framer-motion';
import { OutstationHeroWidget } from "@/components/OutstationHeroWidget";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Map, Shield, Star, Phone, Car, ArrowRight, Clock, CheckCircle, Users, Award, Zap } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

export function OutstationTaxiPage() {
  const features = [
    { 
      icon: <Zap className="w-6 h-6" />, 
      title: 'Instant Booking', 
      description: 'Book your cab in under 60 seconds with our streamlined process.',
      color: 'from-blue-500 to-cyan-500'
    },
    { 
      icon: <Shield className="w-6 h-6" />, 
      title: 'Safe & Reliable', 
      description: 'GPS tracking, verified drivers, and 24/7 customer support.',
      color: 'from-green-500 to-emerald-500'
    },
    { 
      icon: <Star className="w-6 h-6" />, 
      title: 'Best Rates', 
      description: 'Competitive pricing with no hidden charges or surge pricing.',
      color: 'from-yellow-500 to-orange-500'
    },
    { 
      icon: <Users className="w-6 h-6" />, 
      title: 'Trusted Service', 
      description: 'Join 10,000+ satisfied customers who travel with us regularly.',
      color: 'from-purple-500 to-pink-500'
    }
  ];

  const popularRoutes = [
    { from: 'Visakhapatnam', to: 'Hyderabad', distance: '625 km', price: '₹8,500' },
    { from: 'Visakhapatnam', to: 'Chennai', distance: '780 km', price: '₹10,200' },
    { from: 'Visakhapatnam', to: 'Bangalore', distance: '950 km', price: '₹12,500' },
    { from: 'Visakhapatnam', to: 'Araku Valley', distance: '115 km', price: '₹2,800' },
  ];

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "Outstation Taxi Service Visakhapatnam",
    "description": "Professional outstation cab booking service from Visakhapatnam. One way and round trip taxi service to all major cities in India.",
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
    "serviceType": "Outstation Taxi Service",
    "offers": {
      "@type": "Offer",
      "priceRange": "₹12-20 per km",
      "availability": "https://schema.org/InStock"
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <Helmet>
        <title>Outstation Taxi Service Visakhapatnam | One Way Cab Booking | Vizag Taxi Hub</title>
        <meta name="description" content="Book outstation taxi from Visakhapatnam to all major cities. One way cab service, round trip booking. Best rates for Vizag to Hyderabad, Chennai, Bangalore. 24/7 available." />
        <meta name="keywords" content="outstation taxi visakhapatnam, one way cab from vizag, vizag to hyderabad taxi, vizag to chennai cab, outstation cab booking visakhapatnam, vizag taxi service" />
        <link rel="canonical" href="https://www.vizagup.com/outstation-taxi" />
      </Helmet>
      
      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-200/50"
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="font-bold text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Vizag Taxi Hub
          </div>
          <Button 
            onClick={() => window.open(`tel:+91-9966363662`)}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <Phone className="w-4 h-4 mr-2" />
            Call Now
          </Button>
        </div>
      </motion.header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10" />
        <div className="relative px-6 py-20 lg:py-32">
          <div className="max-w-6xl mx-auto">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center mb-16"
            >
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-100 text-blue-700 text-sm font-medium mb-6">
                <Award className="w-4 h-4 mr-2" />
                India's Most Trusted Outstation Taxi Service
              </div>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 tracking-tight">
                Travel Beyond <br />
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  City Limits
                </span>
              </h1>
              <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
                Professional outstation taxi service connecting you to every corner of India. 
                Transparent pricing, verified drivers, and 24/7 support for your peace of mind.
              </p>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="bg-white rounded-3xl shadow-2xl p-8 lg:p-12 border border-gray-200/50"
            >
              <OutstationHeroWidget />
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
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Why Thousands Choose Us</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Experience the difference with our premium outstation taxi service
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

      {/* Popular Routes */}
      <section className="px-6 py-20 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-6xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Popular Routes</h2>
            <p className="text-xl text-gray-600">Your most traveled destinations from Visakhapatnam</p>
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
                    <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
                    <div className="flex-1 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 opacity-30"></div>
                    <ArrowRight className="w-4 h-4 text-blue-500" />
                    <div className="flex-1 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 opacity-30"></div>
                    <div className="w-3 h-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
                  </div>
                </div>
                
                <h3 className="font-bold text-gray-900 mb-2 text-lg group-hover:text-blue-600 transition-colors">
                  {route.from} → {route.to}
                </h3>
                
                <div className="flex items-center justify-between mb-4">
                  <Badge variant="outline" className="text-sm border-blue-200 text-blue-700">
                    {route.distance}
                  </Badge>
                  <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    {route.price}
                  </span>
                </div>
                
                <Button 
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  Get Quote
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative px-6 py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800"></div>
        <div className="absolute inset-0 opacity-10">
          <div className="w-full h-full bg-white bg-opacity-10" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)", backgroundSize: "20px 20px" }}></div>
        </div>
        <div className="relative max-w-4xl mx-auto text-center text-white">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready for Your Journey?</h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto leading-relaxed">
              Join thousands of satisfied customers who trust us for their outstation travel. 
              Book now and experience the difference.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                size="lg" 
                className="bg-white text-blue-600 hover:bg-blue-50 font-bold px-8 py-4 rounded-xl shadow-2xl hover:shadow-blue-500/25 transition-all duration-300"
                onClick={() => window.open(`tel:+91-9966363662`)}
              >
                <Phone className="w-5 h-5 mr-2" />
                Call Now: +91-9966363662
              </Button>
              <div className="text-blue-200 text-sm">
                Available 24/7 • Instant Booking • Best Rates Guaranteed
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
