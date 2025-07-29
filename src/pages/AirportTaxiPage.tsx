import React from 'react';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/Navbar';
import { MobileNavigation } from '@/components/MobileNavigation';
import { AirportHeroWidget } from '@/components/AirportHeroWidget';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StickyHeader } from '@/components/ui/sticky-header';
import { PageTransition } from '@/components/ui/page-transition';
import { SectionReveal } from '@/components/ui/section-reveal';
import { FareTable } from '@/components/ui/fare-table';
import { useFareData } from '@/hooks/useFareData';
import { Plane, Shield, Star, Phone, Car, ArrowRight, Clock, Users, CreditCard, MapPin, CheckCircle, Luggage, Navigation } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

export function AirportTaxiPage() {
  const { fareData, loading, error } = useFareData('airport');

  const whyChooseUs = [
    { icon: <Clock />, title: 'On-Time Service', description: 'Punctual pickup and drop for flights' },
    { icon: <Users />, title: 'Professional Drivers', description: 'Experienced drivers familiar with airport routes' },
    { icon: <CreditCard />, title: 'Fixed Pricing', description: 'No surge pricing or hidden charges' },
    { icon: <MapPin />, title: 'Flight Tracking', description: 'We track your flight for delays' }
  ];

  const airportServices = [
    { 
      service: 'Airport Pickup', 
      description: 'Pickup from Visakhapatnam Airport to your destination',
      price: 'From ₹350',
      features: 'Flight tracking, Meet & Greet',
      icon: <Plane className="w-6 h-6" />
    },
    { 
      service: 'Airport Drop', 
      description: 'Drop from your location to Visakhapatnam Airport',
      price: 'From ₹350',
      features: 'Timely pickup, Luggage assistance',
      icon: <Navigation className="w-6 h-6" />
    },
    { 
      service: 'Round Trip', 
      description: 'Complete airport transfer solution',
      price: 'From ₹600',
      features: 'Pickup + Drop, Waiting available',
      icon: <ArrowRight className="w-6 h-6" />
    },
    { 
      service: 'Corporate Transfer', 
      description: 'Business travel airport transfers',
      price: 'From ₹500',
      features: 'Premium vehicles, Billing support',
      icon: <Luggage className="w-6 h-6" />
    }
  ];

  const popularAirportRoutes = [
    { from: 'Visakhapatnam Airport', to: 'Railway Station', distance: '12 km', price: '₹350', time: '25 min' },
    { from: 'Airport', to: 'Beach Road', distance: '15 km', price: '₹400', time: '30 min' },
    { from: 'Airport', to: 'Rushikonda', distance: '25 km', price: '₹500', time: '45 min' },
    { from: 'Airport', to: 'Kailasagiri', distance: '18 km', price: '₹450', time: '35 min' }
  ];

  const faqs = [
    {
      question: 'How much does airport taxi cost in Visakhapatnam?',
      answer: 'Airport taxi starts from ₹300 for hatchback and ₹350 for sedan depending on your destination within the city.'
    },
    {
      question: 'Do you provide pickup from Visakhapatnam Airport?',
      answer: 'Yes, we provide 24/7 pickup service from Visakhapatnam Airport with flight tracking and meet & greet service.'
    },
    {
      question: 'Is advance booking required for airport taxi?',
      answer: 'While not mandatory, advance booking is recommended to ensure availability and better service, especially during peak hours.'
    },
    {
      question: 'Do you charge waiting time for flight delays?',
      answer: 'We track your flight status. For delays up to 1 hour, no extra charges. Beyond that, waiting charges may apply.'
    },
    {
      question: 'What areas do you cover from Visakhapatnam Airport?',
      answer: 'We cover entire Visakhapatnam city and nearby areas including Beach Road, Rushikonda, Kailasagiri, and railway station.'
    }
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
    <PageTransition>
      <Helmet>
        <title>Airport Taxi Visakhapatnam | Airport Transfer Service | Vizag Airport Cab Booking</title>
        <meta name="description" content="Book airport taxi in Visakhapatnam for pickup and drop to Vizag Airport. Fixed pricing, flight tracking, and 24/7 availability. Best rates for airport transfer service." />
        <meta name="keywords" content="airport taxi visakhapatnam, vizag airport cab, airport transfer service, visakhapatnam airport pickup, airport drop vizag, taxi to airport" />
        <link rel="canonical" href="https://www.vizagup.com/local-taxi/airport-taxi" />
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
                Airport Taxi Service
                <span className="block text-primary">Visakhapatnam</span>
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-xl text-gray-600 max-w-2xl mx-auto mb-12"
              >
                Professional airport transfers with fixed pricing, flight tracking, 
                and meet & greet service. Your reliable airport taxi partner.
              </motion.p>
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-gray-50 rounded-3xl p-8 max-w-4xl mx-auto"
              >
                <AirportHeroWidget />
              </motion.div>
            </div>
          </div>
        </section>
        
        {/* Airport Services */}
        <section className="py-20 bg-gray-50">
          <div className="container mx-auto px-6 max-w-7xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Airport Transfer Services</h2>
              <p className="text-gray-600">Complete airport transportation solutions</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {airportServices.map((service, index) => (
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
                    <p className="text-sm text-gray-500">{service.features}</p>
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
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Popular Airport Routes</h2>
              <p className="text-gray-600">Common destinations from Visakhapatnam Airport</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {popularAirportRoutes.map((route, index) => (
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
                      <Plane className="w-4 h-4 text-primary" />
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
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Fixed Airport Fares</h2>
              <p className="text-gray-600">Transparent pricing with no surge charges</p>
            </div>
            
            <div className="max-w-4xl mx-auto">
              <FareTable 
                fareData={fareData}
                loading={loading}
                error={error}
                serviceType="airport"
              />
              
              <div className="mt-12 bg-white rounded-2xl p-8 border border-gray-200">
                <h3 className="font-semibold text-lg mb-6 text-gray-900">What's Included</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-4">Special Features</h4>
                    <ul className="space-y-3 text-sm text-gray-600">
                      <li className="flex items-center space-x-3">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span>Flight tracking included</span>
                      </li>
                      <li className="flex items-center space-x-3">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span>Meet & greet service</span>
                      </li>
                      <li className="flex items-center space-x-3">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span>Luggage assistance</span>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-4">Included</h4>
                    <ul className="space-y-3 text-sm text-gray-600">
                      <li className="flex items-center space-x-3">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span>Fuel & toll charges</span>
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
              <p className="text-gray-600">Everything you need to know about our airport service</p>
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
            <h2 className="text-3xl font-bold mb-4">Flying Soon?</h2>
            <p className="text-xl text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
              Book your airport transfer now for hassle-free travel 
              with flight tracking and fixed pricing.
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