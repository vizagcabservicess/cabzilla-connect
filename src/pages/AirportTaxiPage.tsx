import React from 'react';
import { Navbar } from '@/components/Navbar';
import { MobileNavigation } from '@/components/MobileNavigation';
import { AirportHeroWidget } from '@/components/AirportHeroWidget';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plane, Shield, Star, Phone, Car, ArrowRight, Clock, Users, CreditCard, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

export function AirportTaxiPage() {
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
      features: 'Flight tracking, Meet & Greet'
    },
    { 
      service: 'Airport Drop', 
      description: 'Drop from your location to Visakhapatnam Airport',
      price: 'From ₹350',
      features: 'Timely pickup, Luggage assistance'
    },
    { 
      service: 'Round Trip', 
      description: 'Complete airport transfer solution',
      price: 'From ₹600',
      features: 'Pickup + Drop, Waiting available'
    },
    { 
      service: 'Corporate Transfer', 
      description: 'Business travel airport transfers',
      price: 'From ₹500',
      features: 'Premium vehicles, Billing support'
    }
  ];

  const airportFareRates = [
    { vehicle: 'Sedan (Swift Dzire)', price: '₹350', capacity: '4+1', features: 'AC, Luggage Space' },
    { vehicle: 'SUV (Ertiga)', price: '₹450', capacity: '6+1', features: 'AC, Extra Luggage Space' },
    { vehicle: 'SUV (Innova)', price: '₹550', capacity: '6+1', features: 'Premium AC, Comfortable Seats' },
    { vehicle: 'Hatchback (Swift)', price: '₹300', capacity: '4+1', features: 'AC, Compact' }
  ];

  const popularAirportRoutes = [
    { from: 'Visakhapatnam Airport', to: 'Railway Station', distance: '12 km', price: '₹350' },
    { from: 'Airport', to: 'Beach Road', distance: '15 km', price: '₹400' },
    { from: 'Airport', to: 'Rushikonda', distance: '25 km', price: '₹500' },
    { from: 'Airport', to: 'Kailasagiri', distance: '18 km', price: '₹450' }
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
    <>
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
        <Navbar />
        <AirportHeroWidget initialPickup="Visakhapatnam Airport" />
        
        {/* About Airport Service */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-4xl font-bold text-gray-900 mb-6">
                Professional Airport Taxi Service in Visakhapatnam
              </h1>
              <p className="text-lg text-gray-700 leading-relaxed">
                Experience seamless airport transfers with Vizag Taxi Hub's dedicated airport taxi service. 
                We provide reliable pickup and drop services to Visakhapatnam Airport with flight tracking, 
                fixed pricing, and professional drivers ensuring you never miss your flight or wait at the airport.
              </p>
            </div>
          </div>
        </section>

        {/* Airport Services */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
              Airport Transfer Services in Visakhapatnam
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {airportServices.map((service, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                        <Plane className="text-primary text-xl" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-xl mb-2">{service.service}</h3>
                        <p className="text-gray-600 mb-3">{service.description}</p>
                        <div className="space-y-1">
                          <p className="text-lg font-bold text-primary">{service.price}</p>
                          <p className="text-sm text-gray-500">{service.features}</p>
                        </div>
                        <Button className="mt-4" size="sm">
                          Book Now
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Popular Airport Routes */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
              Popular Airport Routes in Visakhapatnam
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {popularAirportRoutes.map((route, index) => (
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
              *Prices are for Sedan (Swift Dzire). Rates may vary for other vehicle types.
            </p>
          </div>
        </section>

        {/* Fare Structure */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
              Airport Taxi Fare Structure
            </h2>
            <div className="max-w-4xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {airportFareRates.map((fare, index) => (
                  <Card key={index} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <h3 className="font-semibold text-lg mb-3">{fare.vehicle}</h3>
                      <div className="space-y-2">
                        <p className="text-2xl font-bold text-primary">{fare.price}</p>
                        <p><strong>Capacity:</strong> {fare.capacity}</p>
                        <p><strong>Features:</strong> {fare.features}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="mt-8 p-6 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-lg mb-3">Service Features:</h3>
                <ul className="space-y-2 text-sm">
                  <li>• Flight tracking for pickup timing</li>
                  <li>• Meet & greet service at airport</li>
                  <li>• Free waiting for 30 minutes</li>
                  <li>• Luggage assistance included</li>
                  <li>• 24/7 availability</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Why Choose Us */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
              Why Choose Our Airport Taxi Service?
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
                Trusted Airport Transfer Service in Visakhapatnam
              </h2>
              <p className="text-gray-300 leading-relaxed">
                Vizag Taxi Hub is your trusted partner for airport transfers in Visakhapatnam. We specialize in 
                reliable pickup and drop services to Visakhapatnam Airport with fixed pricing, flight tracking, 
                and professional drivers. Whether you're traveling for business or leisure, our airport taxi 
                service ensures you reach the airport on time or get to your destination comfortably after landing.
              </p>
              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                <div>
                  <h3 className="font-semibold mb-2">Service Coverage</h3>
                  <p className="text-gray-400">Entire Visakhapatnam city to/from Airport including hotels, railway station</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Special Features</h3>
                  <p className="text-gray-400">Flight tracking, Meet & greet, Fixed pricing, 24/7 availability</p>
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

export default AirportTaxiPage;