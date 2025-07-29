import React from 'react';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/Navbar';
import { MobileNavigation } from '@/components/MobileNavigation';
import { OutstationHeroWidget } from "@/components/OutstationHeroWidget";
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StickyHeader } from '@/components/ui/sticky-header';
import { PageTransition } from '@/components/ui/page-transition';
import { SectionReveal } from '@/components/ui/section-reveal';
import { FareTable } from '@/components/ui/fare-table';
import { useFareData } from '@/hooks/useFareData';
import { Map, Shield, Star, Phone, Car, ArrowRight, Clock, Users, CreditCard, MapPin, CheckCircle } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

export function OutstationTaxiPage() {
  const { fareData, loading, error } = useFareData('outstation');
  const features = [
    { icon: <Star />, title: 'Transparent Pricing', description: 'No hidden charges. Pay for what you see.' },
    { icon: <Car />, title: 'Wide Range of Cars', description: 'Choose from Sedans, SUVs, and more.' },
    { icon: <Shield />, title: 'Safe & Secure Trips', description: 'Verified drivers and 24/7 support.' },
    { icon: <Map />, title: 'All India Permit', description: 'Travel anywhere across the country.' }
  ];

  const whyChooseUs = [
    { icon: <Clock />, title: '24/7 Available', description: 'Round the clock booking and support' },
    { icon: <Users />, title: 'Experienced Drivers', description: 'Professional and courteous drivers' },
    { icon: <CreditCard />, title: 'Easy Payment', description: 'Multiple payment options available' },
    { icon: <MapPin />, title: 'GPS Tracking', description: 'Real-time tracking for your safety' }
  ];

  const popularOutstationRoutes = [
    { from: 'Visakhapatnam', to: 'Hyderabad', distance: '625 km', duration: '8-9 hours', price: '₹8,500' },
    { from: 'Visakhapatnam', to: 'Chennai', distance: '780 km', duration: '10-11 hours', price: '₹10,200' },
    { from: 'Visakhapatnam', to: 'Bangalore', distance: '950 km', duration: '12-13 hours', price: '₹12,500' },
    { from: 'Visakhapatnam', to: 'Araku Valley', distance: '115 km', duration: '3-4 hours', price: '₹2,800' },
  ];

  const fareBreakdown = [
    { vehicle: 'Sedan (Swift Dzire)', rate: '₹12/km', capacity: '4+1', features: 'AC, Music System' },
    { vehicle: 'SUV (Ertiga)', rate: '₹14/km', capacity: '6+1', features: 'AC, Spacious, Music System' },
    { vehicle: 'SUV (Innova)', rate: '₹16/km', capacity: '6+1', features: 'Premium AC, Comfortable Seats' },
    { vehicle: 'Tempo Traveller', rate: '₹20/km', capacity: '12+1', features: 'AC, Group Travel' },
  ];

  const faqs = [
    {
      question: 'What is the minimum distance for outstation taxi booking?',
      answer: 'Minimum distance for outstation booking is 130 km one way or 300 km for round trip.'
    },
    {
      question: 'Are there any additional charges for night travel?',
      answer: 'Yes, night charges apply between 10 PM to 6 AM at ₹200 per night for the driver.'
    },
    {
      question: 'What is included in the outstation taxi fare?',
      answer: 'Fare includes vehicle cost, driver allowance, fuel, and toll charges. Parking charges are extra.'
    },
    {
      question: 'Can I modify or cancel my outstation booking?',
      answer: 'Yes, you can modify or cancel up to 24 hours before pickup. Cancellation charges may apply.'
    },
    {
      question: 'Do you provide one way outstation taxi service?',
      answer: 'Yes, we provide both one way and round trip outstation taxi services from Visakhapatnam.'
    }
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
    <PageTransition>
      <Helmet>
        <title>Outstation Taxi Service Visakhapatnam | One Way Cab Booking | Vizag Taxi Hub</title>
        <meta name="description" content="Book outstation taxi from Visakhapatnam to all major cities. One way cab service, round trip booking. Best rates for Vizag to Hyderabad, Chennai, Bangalore. 24/7 available." />
        <meta name="keywords" content="outstation taxi visakhapatnam, one way cab from vizag, vizag to hyderabad taxi, vizag to chennai cab, outstation cab booking visakhapatnam, vizag taxi service" />
        <link rel="canonical" href="https://www.vizagup.com/outstation-taxi" />
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
                Outstation Taxi Service
                <span className="block text-primary">from Visakhapatnam</span>
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-xl text-gray-600 max-w-2xl mx-auto mb-12"
              >
                Professional one-way and round-trip taxi services to all major cities. 
                Transparent pricing, verified drivers, 24/7 support.
              </motion.p>
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-gray-50 rounded-3xl p-8 max-w-4xl mx-auto"
              >
                <OutstationHeroWidget />
              </motion.div>
            </div>
          </div>
        </section>
        
        {/* Features Grid */}
        <section className="py-20 bg-gray-50">
          <div className="container mx-auto px-6 max-w-7xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Our Service</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Professional outstation travel with transparent pricing and reliable service
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="bg-white rounded-2xl p-6 text-center hover:shadow-lg transition-shadow"
                >
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <div className="text-primary">{feature.icon}</div>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600 text-sm">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Popular Routes */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-6 max-w-7xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Popular Routes</h2>
              <p className="text-gray-600">Most traveled destinations from Visakhapatnam</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {popularOutstationRoutes.map((route, index) => (
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
                  
                  <h3 className="font-semibold text-gray-900 mb-2">
                    {route.from} → {route.to}
                  </h3>
                  
                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <p>Duration: {route.duration}</p>
                    <p className="text-2xl font-bold text-primary">{route.price}</p>
                  </div>
                  
                  <Button variant="outline" className="w-full" size="sm">
                    Get Quote
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
              <p className="text-gray-600">Transparent pricing with no hidden charges</p>
            </div>
            
            <div className="max-w-4xl mx-auto">
              <FareTable 
                fareData={fareData}
                loading={loading}
                error={error}
                serviceType="outstation"
              />
              
              <div className="mt-12 bg-white rounded-2xl p-8 border border-gray-200">
                <h3 className="font-semibold text-lg mb-6 text-gray-900">What's Included</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-4">Additional Charges</h4>
                    <ul className="space-y-3 text-sm text-gray-600">
                      <li className="flex items-center space-x-3">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                        <span>Driver allowance: ₹400 per day</span>
                      </li>
                      <li className="flex items-center space-x-3">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                        <span>Night charges: ₹200 per night (10 PM - 6 AM)</span>
                      </li>
                      <li className="flex items-center space-x-3">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                        <span>Toll charges: As applicable</span>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-4">Included</h4>
                    <ul className="space-y-3 text-sm text-gray-600">
                      <li className="flex items-center space-x-3">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span>Fuel & maintenance</span>
                      </li>
                      <li className="flex items-center space-x-3">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span>Professional driver</span>
                      </li>
                      <li className="flex items-center space-x-3">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span>24/7 customer support</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-6 max-w-4xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
              <p className="text-gray-600">Everything you need to know about our outstation service</p>
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
            <h2 className="text-3xl font-bold mb-4">Ready to Travel?</h2>
            <p className="text-xl text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
              Book your outstation taxi now and enjoy a comfortable, safe journey 
              to your destination with transparent pricing.
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
