import React from 'react';
import { Navbar } from '@/components/Navbar';
import { MobileNavigation } from '@/components/MobileNavigation';
import { OutstationHero } from '@/components/OutstationHero';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Map, Shield, Star, Phone, Car, ArrowRight, Clock, Users, CreditCard, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FleetShowcase } from '@/components/FleetShowcase';
import { popularRoutes } from '@/lib/routeData';
import { slugify } from '@/lib/utils';
import { OutstationHeroWidget } from "@/components/OutstationHeroWidget";
import { Helmet } from 'react-helmet-async';

export function OutstationTaxiPage() {
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
    <>
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
        <Navbar />
        <OutstationHeroWidget />
        
        {/* About Outstation Service */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-4xl font-bold text-gray-900 mb-6">
                Professional Outstation Taxi Service in Visakhapatnam
              </h1>
              <p className="text-lg text-gray-700 leading-relaxed">
                Experience hassle-free outstation travel with Vizag Taxi Hub's premium cab booking service. 
                We offer one way and round trip taxi services from Visakhapatnam to all major cities across India. 
                Our fleet includes well-maintained vehicles with experienced drivers ensuring safe and comfortable journeys.
              </p>
            </div>
          </div>
        </section>

        {/* Popular Outstation Routes */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
              Popular Outstation Routes from Visakhapatnam
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {popularOutstationRoutes.map((route, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-lg mb-2">
                      {route.from} to {route.to}
                    </h3>
                    <div className="space-y-2 text-sm text-gray-600">
                      <p><strong>Distance:</strong> {route.distance}</p>
                      <p><strong>Duration:</strong> {route.duration}</p>
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
              *Prices are indicative for Sedan (Swift Dzire). Actual fare may vary based on vehicle type and route.
            </p>
          </div>
        </section>

        {/* Fare Breakdown */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
              Outstation Taxi Fare Structure
            </h2>
            <div className="max-w-4xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {fareBreakdown.map((fare, index) => (
                  <Card key={index} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <h3 className="font-semibold text-lg mb-3">{fare.vehicle}</h3>
                      <div className="space-y-2">
                        <p className="text-2xl font-bold text-primary">{fare.rate}</p>
                        <p><strong>Capacity:</strong> {fare.capacity}</p>
                        <p><strong>Features:</strong> {fare.features}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="mt-8 p-6 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-lg mb-3">Additional Charges:</h3>
                <ul className="space-y-2 text-sm">
                  <li>• Driver allowance: ₹400 per day</li>
                  <li>• Night charges: ₹200 per night (10 PM - 6 AM)</li>
                  <li>• Toll charges: As applicable</li>
                  <li>• Parking charges: As applicable</li>
                  <li>• State permit charges: As applicable</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Why Choose Us */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
              Why Choose Our Outstation Taxi Service?
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
        <section className="py-16 bg-gray-50">
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
                Leading Outstation Cab Service Provider in Visakhapatnam
              </h2>
              <p className="text-gray-300 leading-relaxed">
                Vizag Taxi Hub is your trusted partner for outstation travel from Visakhapatnam. We specialize in 
                one way cab bookings, round trip taxi services, and long-distance travel to all major cities including 
                Hyderabad, Chennai, Bangalore, and tourist destinations like Araku Valley. Our commitment to safety, 
                comfort, and affordability makes us the preferred choice for outstation taxi service in Visakhapatnam. 
                Book your outstation cab today for a memorable travel experience.
              </p>
              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                <div>
                  <h3 className="font-semibold mb-2">Service Areas</h3>
                  <p className="text-gray-400">Visakhapatnam, Vizianagaram, Srikakulam, East Godavari, West Godavari</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Popular Destinations</h3>
                  <p className="text-gray-400">Hyderabad, Chennai, Bangalore, Araku Valley, Tirupati, Bhadrachalam</p>
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
