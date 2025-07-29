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
    "serviceType": "Airport Transfer Service",
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
      
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <StickyHeader />
        
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-gray-50 pt-16 pb-20">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmMGY5ZmYiIGZpbGwtb3BhY2l0eT0iMC40Ij48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
          
          <div className="container mx-auto px-4 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="max-w-4xl mx-auto text-center mb-12"
            >
              <div className="flex items-center justify-center mb-6">
                <Plane className="w-12 h-12 text-primary mr-4" />
                <h1 className="text-6xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Airport Taxi Service
                </h1>
              </div>
              <p className="text-2xl text-gray-600 mb-8">Seamless Airport Transfers in Visakhapatnam</p>
            </motion.div>
            <AirportHeroWidget initialPickup="Visakhapatnam Airport" />
          </div>
        </section>
        
        {/* About Airport Service */}
        <SectionReveal>
          <section className="py-20 bg-white">
            <div className="container mx-auto px-4">
              <div className="max-w-4xl mx-auto text-center">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  viewport={{ once: true }}
                >
                  <h2 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-8">
                    Professional Airport Taxi Service in Visakhapatnam
                  </h2>
                  <p className="text-xl text-gray-700 leading-relaxed mb-8">
                    Experience seamless airport transfers with Vizag Taxi Hub's dedicated airport taxi service. 
                    We provide reliable pickup and drop services to Visakhapatnam Airport with flight tracking, 
                    fixed pricing, and professional drivers ensuring you never miss your flight or wait at the airport.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
                    {[
                      { icon: <CheckCircle className="text-green-500" />, text: "Flight Tracking Service" },
                      { icon: <CheckCircle className="text-green-500" />, text: "Fixed Rate Pricing" },
                      { icon: <CheckCircle className="text-green-500" />, text: "Meet & Greet Service" }
                    ].map((item, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.2, duration: 0.5 }}
                        viewport={{ once: true }}
                        className="flex items-center justify-center space-x-3"
                      >
                        {item.icon}
                        <span className="text-gray-700 font-medium">{item.text}</span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </div>
            </div>
          </section>
        </SectionReveal>

        {/* Airport Services */}
        <SectionReveal delay={0.1}>
          <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50/30">
            <div className="container mx-auto px-4">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="text-center mb-16"
              >
                <h2 className="text-4xl font-bold text-gray-900 mb-4">
                  Airport Transfer Services in Visakhapatnam
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Comprehensive airport transportation solutions for all your travel needs
                </p>
              </motion.div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                {airportServices.map((service, index) => (
                  <motion.div
                    key={service.service}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.6 }}
                    viewport={{ once: true }}
                  >
                    <Card className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full">
                      <CardContent className="p-8">
                        <div className="flex items-start space-x-4">
                          <div className="w-16 h-16 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl flex items-center justify-center text-primary">
                            {service.icon}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-xl mb-3 text-gray-900">{service.service}</h3>
                            <p className="text-gray-600 mb-4 leading-relaxed">{service.description}</p>
                            <div className="space-y-2">
                              <p className="text-2xl font-bold text-primary">{service.price}</p>
                              <p className="text-sm text-gray-500">{service.features}</p>
                            </div>
                            <Button className="mt-6 w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70" size="sm">
                              Book Now
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        </SectionReveal>

        {/* Popular Airport Routes */}
        <SectionReveal delay={0.2}>
          <section className="py-20 bg-white">
            <div className="container mx-auto px-4">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="text-center mb-16"
              >
                <h2 className="text-4xl font-bold text-gray-900 mb-4">
                  Popular Airport Routes in Visakhapatnam
                </h2>
                <p className="text-lg text-gray-600">
                  Fixed pricing for popular destinations from Visakhapatnam Airport
                </p>
              </motion.div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {popularAirportRoutes.map((route, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.6 }}
                    viewport={{ once: true }}
                  >
                    <Card className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                      <CardContent className="p-6">
                        <h3 className="font-semibold text-lg mb-3 text-gray-900">
                          {route.from} to {route.to}
                        </h3>
                        <div className="space-y-2 text-sm text-gray-600">
                          <p><strong>Distance:</strong> {route.distance}</p>
                          <p><strong>Time:</strong> {route.time}</p>
                          <p className="text-xl font-bold text-primary">{route.price}*</p>
                        </div>
                        <Button className="w-full mt-4" size="sm">
                          Book Now
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
              <motion.p 
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.6 }}
                viewport={{ once: true }}
                className="text-center text-sm text-gray-500 mt-8"
              >
                *Prices are for Sedan (Swift Dzire). Rates may vary for other vehicle types.
              </motion.p>
            </div>
          </section>
        </SectionReveal>

        {/* Fare Structure */}
        <SectionReveal delay={0.3}>
          <section className="py-20 bg-gradient-to-br from-gray-50 to-indigo-50/30">
            <div className="container mx-auto px-4">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="text-center mb-16"
              >
                <h2 className="text-4xl font-bold text-gray-900 mb-4">
                  Airport Taxi Fare Structure
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Transparent fixed pricing with no hidden charges. Book with confidence.
                </p>
              </motion.div>
              
              <div className="max-w-6xl mx-auto">
                <FareTable 
                  fareData={fareData}
                  loading={loading}
                  error={error}
                  serviceType="airport"
                />
                
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.6 }}
                  viewport={{ once: true }}
                  className="mt-12 p-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100"
                >
                  <h3 className="font-semibold text-xl mb-6 text-gray-900">Service Features & Information:</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Included Services</h4>
                      <ul className="space-y-2 text-sm text-gray-700">
                        <li className="flex items-center space-x-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span>Flight tracking for pickup timing</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span>Meet & greet service at airport</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span>Free waiting for 30 minutes</span>
                        </li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Additional Benefits</h4>
                      <ul className="space-y-2 text-sm text-gray-700">
                        <li className="flex items-center space-x-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span>Luggage assistance included</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span>24/7 availability</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span>Professional chauffeur service</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </section>
        </SectionReveal>

        {/* Why Choose Us */}
        <SectionReveal delay={0.4}>
          <section className="py-20 bg-white">
            <div className="container mx-auto px-4">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="text-center mb-16"
              >
                <h2 className="text-4xl font-bold text-gray-900 mb-4">
                  Why Choose Our Airport Taxi Service?
                </h2>
                <p className="text-lg text-gray-600">
                  Experience stress-free airport transfers with our premium service
                </p>
              </motion.div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {whyChooseUs.map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.6 }}
                    viewport={{ once: true }}
                  >
                    <Card className="text-center hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full">
                      <CardContent className="p-8">
                        <div className="w-20 h-20 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl flex items-center justify-center mx-auto mb-6">
                          <div className="text-primary text-3xl">{feature.icon}</div>
                        </div>
                        <h3 className="font-semibold text-xl mb-3 text-gray-900">{feature.title}</h3>
                        <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        </SectionReveal>

        {/* FAQs */}
        <SectionReveal delay={0.5}>
          <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50/30">
            <div className="container mx-auto px-4">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="text-center mb-16"
              >
                <h2 className="text-4xl font-bold text-gray-900 mb-4">
                  Frequently Asked Questions
                </h2>
                <p className="text-lg text-gray-600">
                  Get answers to common questions about our airport taxi service
                </p>
              </motion.div>
              
              <div className="max-w-4xl mx-auto space-y-6">
                {faqs.map((faq, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.6 }}
                    viewport={{ once: true }}
                  >
                    <Card className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-8">
                        <h3 className="font-semibold text-xl mb-4 text-gray-900">{faq.question}</h3>
                        <p className="text-gray-700 leading-relaxed">{faq.answer}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        </SectionReveal>

        {/* Footer SEO Text */}
        <section className="py-16 bg-gray-900 text-white">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                <h2 className="text-3xl font-bold mb-6">
                  Trusted Airport Transfer Service in Visakhapatnam
                </h2>
                <p className="text-gray-300 leading-relaxed text-lg mb-8">
                  Vizag Taxi Hub is your trusted partner for airport transfers in Visakhapatnam. We specialize in 
                  reliable pickup and drop services to Visakhapatnam Airport with fixed pricing, flight tracking, 
                  and professional drivers. Whether you're traveling for business or leisure, our airport taxi 
                  service ensures you reach the airport on time or get to your destination comfortably after landing.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div>
                    <h3 className="font-semibold mb-3 text-xl">Service Coverage</h3>
                    <p className="text-gray-400">Entire Visakhapatnam city to/from Airport including hotels, railway station</p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-3 text-xl">Special Features</h3>
                    <p className="text-gray-400">Flight tracking, Meet & greet, Fixed pricing, 24/7 availability</p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-3 text-xl">Contact Info</h3>
                    <p className="text-gray-400">+91-9966363662<br />24/7 Available</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <MobileNavigation />
      </div>
    </PageTransition>
  );
}

export default AirportTaxiPage;