import React from 'react';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/Navbar';
import { MobileNavigation } from '@/components/MobileNavigation';
import { Hero } from '@/components/Hero';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StickyHeader } from '@/components/ui/sticky-header';
import { PageTransition } from '@/components/ui/page-transition';
import { SectionReveal } from '@/components/ui/section-reveal';
import { FareTable } from '@/components/ui/fare-table';
import { useFareData } from '@/hooks/useFareData';
import { Map, Shield, Star, Phone, Car, ArrowRight, Clock, Users, CreditCard, MapPin, CheckCircle, Navigation } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

export function LocalTaxiPage() {
  const { fareData, loading, error } = useFareData('local');

  const whyChooseUs = [
    { icon: <Clock />, title: 'Quick Booking', description: 'Book instantly via call or app' },
    { icon: <Users />, title: 'Local Drivers', description: 'Experienced local drivers who know the city' },
    { icon: <CreditCard />, title: 'Flexible Payment', description: 'Cash, UPI, and card payment options' },
    { icon: <MapPin />, title: 'Live Tracking', description: 'Track your ride in real-time' }
  ];

  const localServices = [
    { 
      service: 'Point to Point', 
      description: 'Direct travel between two locations within the city',
      price: '₹150 minimum',
      duration: 'As per distance',
      icon: <Navigation className="w-6 h-6" />
    },
    { 
      service: 'Hourly Rental', 
      description: 'Book taxi for multiple hours with driver waiting',
      price: '₹200/hour',
      duration: 'Minimum 4 hours',
      icon: <Clock className="w-6 h-6" />
    },
    { 
      service: 'Half Day Package', 
      description: 'Local sightseeing and city tours',
      price: '₹1,500 (4 hours)',
      duration: '4 hours / 40 km',
      icon: <Map className="w-6 h-6" />
    },
    { 
      service: 'Full Day Package', 
      description: 'Complete day rental for city exploration',
      price: '₹2,500 (8 hours)',
      duration: '8 hours / 80 km',
      icon: <Car className="w-6 h-6" />
    }
  ];

  const popularLocalRoutes = [
    { from: 'Visakhapatnam Railway Station', to: 'RK Beach', distance: '8 km', price: '₹150', time: '20 min' },
    { from: 'Vizag Airport', to: 'City Center', distance: '12 km', price: '₹200', time: '25 min' },
    { from: 'Bus Stand', to: 'Kailasagiri', distance: '15 km', price: '₹250', time: '35 min' },
    { from: 'Beach Road', to: 'Rushikonda Beach', distance: '20 km', price: '₹300', time: '40 min' }
  ];

  const faqs = [
    {
      question: 'What is the minimum fare for local taxi in Visakhapatnam?',
      answer: 'Minimum fare is ₹150 for distances up to 5 km within the city limits.'
    },
    {
      question: 'Do you provide waiting charges for local trips?',
      answer: 'Yes, waiting charges apply at ₹2-3 per minute after first 5 minutes depending on vehicle type.'
    },
    {
      question: 'Can I book local taxi for multiple stops?',
      answer: 'Yes, you can book hourly packages or pay per km for multiple stops within the city.'
    },
    {
      question: 'Are local taxis available 24/7?',
      answer: 'Yes, our local taxi service is available 24 hours a day, 7 days a week.'
    },
    {
      question: 'What areas do you cover in local taxi service?',
      answer: 'We cover entire Visakhapatnam city including Rushikonda, Kailasagiri, Beach Road, and surrounding areas.'
    }
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
    <PageTransition>
      <Helmet>
        <title>Local Taxi Service Visakhapatnam | Book Cabs in Vizag | City Taxi Booking</title>
        <meta name="description" content="Book local taxi in Visakhapatnam for city travel, hourly rentals, and point-to-point trips. Best rates for Vizag local cab service. Available 24/7." />
        <meta name="keywords" content="local taxi visakhapatnam, vizag cab booking, local cab service vizag, taxi in visakhapatnam, city taxi booking, hourly cab rental vizag" />
        <link rel="canonical" href="https://www.vizagup.com/local-taxi" />
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>
      
      <div className="min-h-screen bg-white">
        <StickyHeader />
        
        {/* Hero Section */}
        <section className="pt-24 pb-16 bg-white">
          <div className="container mx-auto px-6 max-w-7xl">
            <div className="text-center mb-16">
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight"
              >
                Local Taxi Service
                <span className="block text-primary">in Visakhapatnam</span>
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-xl text-gray-600 max-w-2xl mx-auto mb-12"
              >
                Quick and reliable city travel with point-to-point rides, hourly rentals, 
                and day packages. Your trusted local taxi partner.
              </motion.p>
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-gray-50 rounded-3xl p-8 max-w-4xl mx-auto"
              >
                <Hero />
              </motion.div>
            </div>
          </div>
        </section>
        
        {/* Local Services */}
        <section className="py-20 bg-gray-50">
          <div className="container mx-auto px-6 max-w-7xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Services</h2>
              <p className="text-gray-600">Choose the perfect service for your local travel needs</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {localServices.map((service, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="bg-white rounded-2xl p-6 hover:shadow-lg transition-all"
                >
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-6">
                    <div className="text-primary">{service.icon}</div>
                  </div>
                  
                  <h3 className="font-semibold text-gray-900 mb-2">{service.service}</h3>
                  <p className="text-gray-600 text-sm mb-4 leading-relaxed">{service.description}</p>
                  
                  <div className="mb-4">
                    <p className="text-2xl font-bold text-primary mb-1">{service.price}</p>
                    <p className="text-sm text-gray-500">{service.duration}</p>
                  </div>
                  
                  <Button variant="outline" className="w-full" size="sm">
                    Book Now
                  </Button>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Popular Routes */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-6 max-w-7xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Popular Local Routes</h2>
              <p className="text-gray-600">Common destinations within Visakhapatnam</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {popularLocalRoutes.map((route, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-lg transition-all hover:border-primary/20"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-primary rounded-full"></div>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                      <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                    </div>
                    <Badge variant="outline" className="text-xs">{route.distance}</Badge>
                  </div>
                  
                  <h3 className="font-semibold text-gray-900 mb-2 text-sm">
                    {route.from} → {route.to}
                  </h3>
                  
                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <p>Time: {route.time}</p>
                    <p className="text-2xl font-bold text-primary">{route.price}</p>
                  </div>
                  
                  <Button variant="outline" className="w-full" size="sm">
                    Book Now
                  </Button>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Fare Structure */}
        <section className="py-20 bg-gray-50">
          <div className="container mx-auto px-6 max-w-7xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Live Fare Structure</h2>
              <p className="text-gray-600">Transparent pricing for all vehicle types</p>
            </div>
            
            <div className="max-w-4xl mx-auto">
              <FareTable 
                fareData={fareData}
                loading={loading}
                error={error}
                serviceType="local"
              />
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-6 max-w-4xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
              <p className="text-gray-600">Everything you need to know about our local service</p>
            </div>
            
            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md transition-shadow"
                >
                  <h3 className="font-semibold text-gray-900 mb-3">{faq.question}</h3>
                  <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-primary text-white">
          <div className="container mx-auto px-6 text-center">
            <h2 className="text-3xl font-bold mb-4">Need a Local Ride?</h2>
            <p className="text-xl text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
              Book your local taxi now for quick, reliable city travel 
              with transparent pricing and professional drivers.
            </p>
            <Button 
              size="lg" 
              variant="secondary" 
              className="bg-white text-primary hover:bg-gray-50"
              onClick={() => window.open(`tel:+91-9966363662`)}
            >
              <Phone className="w-5 h-5 mr-2" />
              Call Now: +91-9966363662
            </Button>
          </div>
        </section>

        <MobileNavigation />
      </div>
    </PageTransition>
  );
}