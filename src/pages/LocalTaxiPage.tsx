import React from 'react';
import { Navbar } from '@/components/Navbar';
import { MobileNavigation } from '@/components/MobileNavigation';
import { Hero } from '@/components/Hero';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Map, Shield, Star, Phone, Car, ArrowRight, Clock, Users, CreditCard, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

export function LocalTaxiPage() {
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
      duration: 'As per distance'
    },
    { 
      service: 'Hourly Rental', 
      description: 'Book taxi for multiple hours with driver waiting',
      price: '₹200/hour',
      duration: 'Minimum 4 hours'
    },
    { 
      service: 'Half Day Package', 
      description: 'Local sightseeing and city tours',
      price: '₹1,500 (4 hours)',
      duration: '4 hours / 40 km'
    },
    { 
      service: 'Full Day Package', 
      description: 'Complete day rental for city exploration',
      price: '₹2,500 (8 hours)',
      duration: '8 hours / 80 km'
    }
  ];

  const localFareRates = [
    { vehicle: 'Sedan (Swift Dzire)', rate: '₹12/km', waiting: '₹2/min', features: 'AC, Music System' },
    { vehicle: 'SUV (Ertiga)', rate: '₹14/km', waiting: '₹3/min', features: 'AC, Spacious, Music System' },
    { vehicle: 'SUV (Innova)', rate: '₹16/km', waiting: '₹3/min', features: 'Premium AC, Comfortable Seats' },
    { vehicle: 'Hatchback (Swift)', rate: '₹10/km', waiting: '₹2/min', features: 'AC, Compact' }
  ];

  const popularLocalRoutes = [
    { from: 'Visakhapatnam Railway Station', to: 'RK Beach', distance: '8 km', price: '₹150' },
    { from: 'Vizag Airport', to: 'City Center', distance: '12 km', price: '₹200' },
    { from: 'Bus Stand', to: 'Kailasagiri', distance: '15 km', price: '₹250' },
    { from: 'Beach Road', to: 'Rushikonda Beach', distance: '20 km', price: '₹300' }
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
    <>
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
        <Navbar />
        <Hero onSearch={() => {}} visibleTabs={['local']} />
        
        {/* About Local Service */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-4xl font-bold text-gray-900 mb-6">
                Professional Local Taxi Service in Visakhapatnam
              </h1>
              <p className="text-lg text-gray-700 leading-relaxed">
                Navigate Visakhapatnam with ease using our reliable local taxi service. Whether you need point-to-point 
                travel, hourly rentals for city exploration, or transportation to local attractions, our experienced 
                drivers and well-maintained vehicles ensure a comfortable and affordable journey within the city.
              </p>
            </div>
          </div>
        </section>

        {/* Local Services */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
              Local Taxi Services in Visakhapatnam
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {localServices.map((service, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-xl mb-3">{service.service}</h3>
                    <p className="text-gray-600 mb-4">{service.description}</p>
                    <div className="space-y-2">
                      <p className="text-lg font-bold text-primary">{service.price}</p>
                      <p className="text-sm text-gray-500">{service.duration}</p>
                    </div>
                    <Button className="w-full mt-4" size="sm">
                      Book Now
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Popular Local Routes */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
              Popular Local Routes in Visakhapatnam
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {popularLocalRoutes.map((route, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-lg mb-2">
                      {route.from} to {route.to}
                    </h3>
                    <div className="space-y-2 text-sm text-gray-600">
                      <p><strong>Distance:</strong> {route.distance}</p>
                      <p className="text-lg font-bold text-primary">{route.price}*</p>
                    </div>
                    <Button className="w-full mt-4" size="sm">
                      Book Now
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            <p className="text-center text-sm text-gray-500 mt-6">
              *Prices are indicative for Sedan. Actual fare may vary based on vehicle type and traffic conditions.
            </p>
          </div>
        </section>

        {/* Fare Structure */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
              Local Taxi Fare Structure
            </h2>
            <div className="max-w-4xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {localFareRates.map((fare, index) => (
                  <Card key={index} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <h3 className="font-semibold text-lg mb-3">{fare.vehicle}</h3>
                      <div className="space-y-2">
                        <p className="text-xl font-bold text-primary">{fare.rate}</p>
                        <p><strong>Waiting:</strong> {fare.waiting}</p>
                        <p><strong>Features:</strong> {fare.features}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="mt-8 p-6 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-lg mb-3">Fare Details:</h3>
                <ul className="space-y-2 text-sm">
                  <li>• Minimum fare: ₹150 (up to 5 km)</li>
                  <li>• Waiting charges: After first 5 minutes</li>
                  <li>• Night charges: 25% extra between 11 PM - 6 AM</li>
                  <li>• Toll charges: As applicable</li>
                  <li>• Parking charges: As applicable</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Why Choose Us */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
              Why Choose Our Local Taxi Service?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {whyChooseUs.map((feature, index) => (
                <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <div className="text-primary text-2xl">{feature.icon}</div>
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                    <p className="text-gray-600 text-sm">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
              Frequently Asked Questions
            </h2>
            <div className="max-w-3xl mx-auto space-y-6">
              {faqs.map((faq, index) => (
                <Card key={index}>
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-lg mb-3 text-gray-900">{faq.question}</h3>
                    <p className="text-gray-700">{faq.answer}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Footer SEO Text */}
        <section className="py-12 bg-gray-900 text-white">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-2xl font-bold mb-6">
                Leading Local Cab Service Provider in Visakhapatnam
              </h2>
              <p className="text-gray-300 leading-relaxed">
                Vizag Taxi Hub is your reliable partner for local transportation in Visakhapatnam. We provide 
                affordable and convenient taxi services for city travel, local sightseeing, business trips, 
                and daily commuting. Our fleet of well-maintained vehicles and professional drivers ensure 
                safe and comfortable rides across all areas of Vizag including Beach Road, Kailasagiri, 
                Rushikonda, and the city center.
              </p>
              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                <div>
                  <h3 className="font-semibold mb-2">Coverage Areas</h3>
                  <p className="text-gray-400">Beach Road, Kailasagiri, Rushikonda, City Center, Railway Station, Airport</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Service Types</h3>
                  <p className="text-gray-400">Point to Point, Hourly Rental, Half Day, Full Day, City Tours</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Contact Info</h3>
                  <p className="text-gray-400">+91-9966363662<br />24/7 Available</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <MobileNavigation />
      </div>
    </>
  );
}

export default LocalTaxiPage;