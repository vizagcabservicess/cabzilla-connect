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
      
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <StickyHeader />
        
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-green-50 via-blue-50 to-gray-50 pt-16 pb-20">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmMGY5ZmYiIGZpbGwtb3BhY2l0eT0iMC40Ij48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
          
          <div className="container mx-auto px-4 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="max-w-4xl mx-auto text-center"
            >
              <h1 className="text-6xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-6">
                Local Taxi Service
              </h1>
              <p className="text-2xl text-gray-600 mb-8">Navigate Visakhapatnam with ease</p>
              <Hero onSearch={() => {}} visibleTabs={['local']} />
            </motion.div>
          </div>
        </section>
        
        {/* About Local Service */}
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
                    Professional Local Taxi Service in Visakhapatnam
                  </h2>
                  <p className="text-xl text-gray-700 leading-relaxed mb-8">
                    Navigate Visakhapatnam with ease using our reliable local taxi service. Whether you need point-to-point 
                    travel, hourly rentals for city exploration, or transportation to local attractions, our experienced 
                    drivers and well-maintained vehicles ensure a comfortable and affordable journey within the city.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
                    {[
                      { icon: <CheckCircle className="text-green-500" />, text: "500+ Daily Rides" },
                      { icon: <CheckCircle className="text-green-500" />, text: "Local Expert Drivers" },
                      { icon: <CheckCircle className="text-green-500" />, text: "Instant Booking" }
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

        {/* Local Services */}
        <SectionReveal delay={0.1}>
          <section className="py-20 bg-gradient-to-br from-gray-50 to-green-50/30">
            <div className="container mx-auto px-4">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="text-center mb-16"
              >
                <h2 className="text-4xl font-bold text-gray-900 mb-4">
                  Local Taxi Services in Visakhapatnam
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Choose from our flexible local taxi options designed for your convenience
                </p>
              </motion.div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                {localServices.map((service, index) => (
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
                              <p className="text-sm text-gray-500">{service.duration}</p>
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

        {/* Popular Local Routes */}
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
                  Popular Local Routes in Visakhapatnam
                </h2>
                <p className="text-lg text-gray-600">
                  Quick estimates for popular destinations within the city
                </p>
              </motion.div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {popularLocalRoutes.map((route, index) => (
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
                *Prices are indicative for Sedan. Actual fare may vary based on vehicle type and traffic conditions.
              </motion.p>
            </div>
          </section>
        </SectionReveal>

        {/* Fare Structure */}
        <SectionReveal delay={0.3}>
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
                  Live Local Taxi Fare Structure
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Real-time pricing with no surge charges. Transparent and affordable rates.
                </p>
              </motion.div>
              
              <div className="max-w-6xl mx-auto">
                <FareTable 
                  fareData={fareData}
                  loading={loading}
                  error={error}
                  serviceType="local"
                />
                
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.6 }}
                  viewport={{ once: true }}
                  className="mt-12 p-8 bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl border border-green-100"
                >
                  <h3 className="font-semibold text-xl mb-6 text-gray-900">Fare Details & Information:</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Charges</h4>
                      <ul className="space-y-2 text-sm text-gray-700">
                        <li className="flex items-center space-x-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span>Minimum fare: ₹150 (up to 5 km)</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span>Waiting charges: After first 5 minutes</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span>Night charges: 25% extra (11 PM - 6 AM)</span>
                        </li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Inclusions</h4>
                      <ul className="space-y-2 text-sm text-gray-700">
                        <li className="flex items-center space-x-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span>AC & music system</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span>Local expert driver</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span>Real-time GPS tracking</span>
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
                  Why Choose Our Local Taxi Service?
                </h2>
                <p className="text-lg text-gray-600">
                  Experience the difference with our premium local transportation service
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
          <section className="py-20 bg-gradient-to-br from-gray-50 to-green-50/30">
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
                  Get answers to common questions about our local taxi service
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
                  Leading Local Cab Service Provider in Visakhapatnam
                </h2>
                <p className="text-gray-300 leading-relaxed text-lg mb-8">
                  Vizag Taxi Hub is your reliable partner for local transportation in Visakhapatnam. We provide 
                  affordable and convenient taxi services for city travel, local sightseeing, business trips, 
                  and daily commuting. Our fleet of well-maintained vehicles and professional drivers ensure 
                  safe and comfortable rides across all areas of Vizag including Beach Road, Kailasagiri, 
                  Rushikonda, and the city center.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div>
                    <h3 className="font-semibold mb-3 text-xl">Coverage Areas</h3>
                    <p className="text-gray-400">Beach Road, Kailasagiri, Rushikonda, City Center, Railway Station, Airport</p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-3 text-xl">Service Types</h3>
                    <p className="text-gray-400">Point to Point, Hourly Rental, Half Day, Full Day, City Tours</p>
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

export default LocalTaxiPage;