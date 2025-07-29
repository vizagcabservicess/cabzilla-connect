import React from 'react';
import { Hero } from '@/components/Hero';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Map, Shield, Star, Phone, Car, ArrowRight, Clock, MapPin, Navigation } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

export function LocalTaxiPage() {
  const features = [
    { icon: <Clock />, title: 'Quick Booking', description: 'Book instantly via call or app' },
    { icon: <Car />, title: 'Local Expertise', description: 'Drivers who know the city inside out' },
    { icon: <MapPin />, title: 'Live Tracking', description: 'Track your ride in real-time' },
    { icon: <Star />, title: 'Fixed Rates', description: 'No surge pricing or hidden charges' }
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
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>Local Taxi Service Visakhapatnam | Book Cabs in Vizag | City Taxi Booking</title>
        <meta name="description" content="Book local taxi in Visakhapatnam for city travel, hourly rentals, and point-to-point trips. Best rates for Vizag local cab service. Available 24/7." />
        <meta name="keywords" content="local taxi visakhapatnam, vizag cab booking, local cab service vizag, taxi in visakhapatnam, city taxi booking, hourly cab rental vizag" />
        <link rel="canonical" href="https://www.vizagup.com/local-taxi" />
      </Helmet>
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="font-bold text-xl text-gray-900">Vizag Taxi Hub</div>
          <Button onClick={() => window.open(`tel:+91-9966363662`)}>
            <Phone className="w-4 h-4 mr-2" />
            Call Now
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-6 py-24">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-8 tracking-tight">
            Local Taxi Service
          </h1>
          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed">
            Quick and reliable city travel with point-to-point rides, hourly rentals, 
            and day packages. Your trusted local taxi partner.
          </p>
          
          <div className="bg-gray-50 rounded-2xl p-8 mb-16">
            <Hero />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Why choose us</h2>
            <p className="text-gray-600">Quick, reliable city travel solutions</p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                  <div className="text-gray-900">{feature.icon}</div>
                </div>
                <h3 className="font-semibold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="px-6 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Our services</h2>
            <p className="text-gray-600">Choose the perfect service for your local travel needs</p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-6">
            {services.map((service, index) => (
              <div key={index} className="border border-gray-200 rounded-2xl p-6 hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mb-6">
                  <div className="text-gray-900">{service.icon}</div>
                </div>
                
                <h3 className="font-semibold text-gray-900 mb-2">{service.name}</h3>
                <p className="text-gray-600 text-sm mb-4">{service.description}</p>
                
                <p className="text-2xl font-bold text-gray-900 mb-4">{service.price}</p>
                
                <Button variant="outline" className="w-full">
                  Book Now
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Routes */}
      <section className="px-6 py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Popular routes</h2>
            <p className="text-gray-600">Common destinations within Visakhapatnam</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {popularRoutes.map((route, index) => (
              <div key={index} className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-gray-900 rounded-full"></div>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                    <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                  </div>
                  <Badge variant="outline" className="text-xs">{route.distance}</Badge>
                </div>
                
                <h3 className="font-medium text-gray-900 mb-3 text-sm">
                  {route.from} → {route.to}
                </h3>
                
                <p className="text-2xl font-bold text-gray-900 mb-4">{route.price}</p>
                
                <Button variant="outline" className="w-full">
                  Book Now
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20 bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">Need a local ride?</h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Book your local taxi now for quick, reliable city travel with transparent pricing.
          </p>
          <Button 
            size="lg" 
            className="bg-white text-gray-900 hover:bg-gray-100"
            onClick={() => window.open(`tel:+91-9966363662`)}
          >
            <Phone className="w-5 h-5 mr-2" />
            Call Now: +91-9966363662
          </Button>
        </div>
      </section>
    </div>
  );
}