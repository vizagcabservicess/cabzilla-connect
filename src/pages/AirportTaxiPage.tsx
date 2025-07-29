import React from 'react';
import { AirportHeroWidget } from '@/components/AirportHeroWidget';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plane, Phone, ArrowRight, Clock, MapPin, Luggage, Navigation } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

export function AirportTaxiPage() {
  const features = [
    { icon: <Clock />, title: 'On-Time Service', description: 'Punctual pickup and drop for flights' },
    { icon: <Plane />, title: 'Flight Tracking', description: 'We track your flight for delays' },
    { icon: <MapPin />, title: 'Meet & Greet', description: 'Personal assistance at airport' },
    { icon: <Luggage />, title: 'Fixed Pricing', description: 'No surge pricing or hidden charges' }
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
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>Airport Taxi Visakhapatnam | Airport Transfer Service | Vizag Airport Cab Booking</title>
        <meta name="description" content="Book airport taxi in Visakhapatnam for pickup and drop to Vizag Airport. Fixed pricing, flight tracking, and 24/7 availability. Best rates for airport transfer service." />
        <meta name="keywords" content="airport taxi visakhapatnam, vizag airport cab, airport transfer service, visakhapatnam airport pickup, airport drop vizag, taxi to airport" />
        <link rel="canonical" href="https://www.vizagup.com/local-taxi/airport-taxi" />
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
            Airport Taxi Service
          </h1>
          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed">
            Professional airport transfers with fixed pricing, flight tracking, 
            and meet & greet service. Your reliable airport taxi partner.
          </p>
          
          <div className="bg-gray-50 rounded-2xl p-8 mb-16">
            <AirportHeroWidget />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Why choose us</h2>
            <p className="text-gray-600">Professional airport transfer solutions</p>
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
            <p className="text-gray-600">Complete airport transportation solutions</p>
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
            <p className="text-gray-600">Common destinations from Visakhapatnam Airport</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {popularRoutes.map((route, index) => (
              <div key={index} className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Plane className="w-4 h-4 text-gray-900" />
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
          <h2 className="text-4xl font-bold mb-6">Flying soon?</h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Book your airport transfer now for hassle-free travel with flight tracking and fixed pricing.
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