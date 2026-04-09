import React from 'react';
import { motion } from 'framer-motion';
import { AirportHeroWidget } from '@/components/AirportHeroWidget';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plane, Phone, ArrowRight, Clock, MapPin, Luggage, Navigation, Shield, CheckCircle, Car } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { Navbar } from '@/components/Navbar';
import Footer from '@/components/Footer';
import { MobileNavigation } from '@/components/MobileNavigation';
import { ServiceLinks } from '@/components/ServiceLinks';
import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';

export function AirportTaxiPage() {
  const widgetRef = React.useRef<HTMLDivElement>(null);
  const [isSearchActive, setIsSearchActive] = React.useState(false);
  const [isEditMode, setIsEditMode] = React.useState(false);
  const scrollWithOffset = (el: HTMLElement | null, offset: number = 120) => {
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.pageYOffset - offset;
    window.scrollTo({ top: y, behavior: 'smooth' });
  };

  const scrollToWidget = () => {
    if (widgetRef.current) {
      widgetRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    } else {
      // Fallback: scroll to top of page
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  const features = [
    { 
      icon: <Plane className="w-6 h-6" />, 
      title: 'Flight Tracking', 
      description: 'Real-time flight monitoring to handle delays and early arrivals.',
      color: 'bg-sky-500'
    },
    { 
      icon: <Clock className="w-6 h-6" />, 
      title: 'Punctual Service', 
      description: 'Never miss a flight with our reliable time management.',
      color: 'bg-green-500'
    },
    { 
      icon: <MapPin className="w-6 h-6" />, 
      title: 'Meet & Greet', 
      description: 'Personal assistance with name boards and luggage help.',
      color: 'bg-purple-500'
    },
    { 
      icon: <Shield className="w-6 h-6" />, 
      title: 'Safe Transfer', 
      description: 'Licensed drivers and GPS tracking for secure travel.',
      color: 'bg-orange-500'
    }
  ];

  const services = [
    { 
      name: 'Airport Pickup', 
      description: 'From airport to your destination',
      price: '₹850',
      icon: <Plane className="w-6 h-6" />
    },
    { 
      name: 'Airport Drop', 
      description: 'From your location to airport',
      price: '₹850',
      icon: <Navigation className="w-6 h-6" />
    },
    { 
      name: 'Round Trip', 
      description: 'Complete transfer solution',
      price: '₹1400',
      icon: <ArrowRight className="w-6 h-6" />
    },
    { 
      name: 'Corporate', 
      description: 'Business travel transfers',
      price: '₹850',
      icon: <Luggage className="w-6 h-6" />
    }
  ];

  const popularRoutes = [
    { from: 'Airport', to: 'Railway Station', distance: '12 km', price: '₹840', time: '20 min' },
    { from: 'Airport', to: 'Beach Road', distance: '15 km', price: '₹940', time: '30 min' },
    { from: 'Airport', to: 'Rushikonda', distance: '25 km', price: '₹1500', time: '50 min' },
    { from: 'Airport', to: 'Kailasagiri', distance: '18 km', price: '₹1200', time: '35 min' }
  ];

  const fleetOptions = [
    { type: 'Sedan', capacity: '3-4', luggage: '2-3 bags', price: '₹850 onwards' },
    { type: 'SUV', capacity: '6', luggage: '3-4 bags', price: '₹1250 onwards' },
    { type: 'Luxury', capacity: '7', luggage: '3-4 bags', price: '₹1550 onwards' },
  ];

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "Vizag Taxi Hub - Airport Taxi Service",
    "description": "Professional airport transfer service in Visakhapatnam. Pickup and drop to Visakhapatnam Airport with flight tracking and fixed pricing.",
    "url": "https://vizagtaxihub.com/airport-taxi",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "44-66-22/4, near Singalamma Temple, Singalammapuram, Kailasapuram",
      "addressLocality": "Visakhapatnam",
      "addressRegion": "Andhra Pradesh",
      "postalCode": "530024",
      "addressCountry": "IN"
    },
    "telephone": "+91-9966363662",
    "openingHours": "Mo-Su 00:00-23:59",
    "paymentAccepted": "Cash, Credit Card, UPI, Net Banking",
    "priceRange": "₹350-650",
    "areaServed": {
      "@type": "City",
      "name": "Visakhapatnam"
    },
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Airport Transfer Services",
      "itemListElement": [
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Airport Pickup",
            "description": "From airport to destination"
          }
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Airport Drop",
            "description": "From location to airport"
          }
        }
      ]
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />
      <main className="flex-1 pt-16 md:pt-20">
      <Helmet>
        <title>Airport Taxi Visakhapatnam | Airport Transfer Service | Vizag Airport Cab Booking</title>
        <meta name="description" content="Book airport taxi in Visakhapatnam for pickup and drop to Vizag Airport. Fixed pricing, flight tracking, and 24/7 availability. Best rates for airport transfer service." />
        <meta name="keywords" content="airport taxi visakhapatnam, vizag airport cab, airport transfer service, visakhapatnam airport pickup, airport drop vizag, taxi to airport" />
        <meta name="author" content="Vizag Taxi Hub" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://vizagtaxihub.com/airport-taxi" />
        <meta property="og:title" content="Airport Taxi Visakhapatnam | Airport Transfer Service | Vizag Airport Cab Booking" />
        <meta property="og:description" content="Book airport taxi in Visakhapatnam for pickup and drop to Vizag Airport. Fixed pricing, flight tracking, and 24/7 availability." />
        <meta property="og:image" content="/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://vizagtaxihub.com/airport-taxi" />
        <meta property="twitter:title" content="Airport Taxi Visakhapatnam | Airport Transfer Service | Vizag Airport Cab Booking" />
        <meta property="twitter:description" content="Book airport taxi in Visakhapatnam for pickup and drop to Vizag Airport. Fixed pricing, flight tracking, and 24/7 availability." />
        <meta property="twitter:image" content="/og-image.png" />
        
        {/* Additional SEO */}
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://vizagtaxihub.com/airport-taxi" />
      </Helmet>
      
     

      {/* Hero Section */}
      <section className={`relative bg-gradient-to-br from-sky-50 to-white ${isSearchActive ? 'pt-28 md:pt-36 pb-16 md:pb-20' : 'pt-8 md:pt-12 pb-8 md:pb-10'}`}>
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          {!isSearchActive && (
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-5 md:mb-8"
          >
            <div className="inline-flex items-center px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-sky-100 text-sky-700 text-xs md:text-sm font-medium mb-4 md:mb-6">
              <CheckCircle className="w-3 h-3 md:w-4 md:h-4 mr-2" />
              Trusted Airport Transfer Service
            </div>
            <h1 className="text-3xl md:text-5xl lg:text-7xl font-bold text-gray-900 mb-3 md:mb-6 leading-tight">
              Fly With
              <br />
              <span className="text-sky-500">Confidence</span>
            </h1>
            <p className="text-base md:text-xl text-gray-600 mb-0 max-w-3xl mx-auto">
              Hassle-free airport transfers with flight tracking, meet & greet service, and guaranteed on-time pickup and drop to Vizag Airport.
            </p>
          </motion.div>
          )}
          
          <motion.div 
            ref={widgetRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="rounded-xl md:rounded-3xl md:p-8"
          >
            <AirportHeroWidget 
              onSearch={() => {
                setIsSearchActive(true);
                setIsEditMode(false); // Reset edit mode when search is completed
                setTimeout(() => scrollWithOffset(widgetRef.current, 120), 50);
              }}
              onStepChange={(step) => {
                if (step === 2) {
                  const section = document.querySelector('section.relative.bg-gradient-to-br.from-sky-50.to-white');
                  if (section) {
                    (section as HTMLElement).style.paddingTop = '24px';
                    (section as HTMLElement).style.paddingBottom = '24px';
                  }
                }
              }}
              onEditStart={() => {
                setIsEditMode(true);
                const section = document.querySelector('section.relative.bg-gradient-to-br.from-sky-50.to-white');
                if (section) {
                  (section as HTMLElement).style.paddingTop = '120px';
                  (section as HTMLElement).style.paddingBottom = '120px';
                }
                setTimeout(() => scrollWithOffset(widgetRef.current, 140), 50);
              }}
            />
          </motion.div>
        </div>
      </section>

      {/* Features */}
      {!isSearchActive && !isEditMode && (
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Travelers Trust Us</h2>
            <p className="text-xl text-gray-600">Professional airport transfer service designed for your peace of mind</p>
          </motion.div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div 
                key={index} 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white rounded-xl p-6 text-center hover:shadow-lg transition-shadow"
              >
                <div className={`w-12 h-12 ${feature.color} rounded-xl flex items-center justify-center mb-4 mx-auto text-white`}>
                  {feature.icon}
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">{feature.title}</h4>
                <p className="text-gray-600 text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* Fleet Options */}
      {!isSearchActive && !isEditMode && (
      <section className="py-8 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-3xl font-bold text-gray-900 mb-4">Choose Your Transfer</h2>
            <p className="text-xl text-gray-600">Perfect vehicle for your airport journey</p>
          </motion.div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {fleetOptions.map((vehicle, index) => (
              <motion.div 
                key={index} 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-gray-50 rounded-xl p-6 hover:bg-sky-50 transition-colors group"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-xl text-gray-900">{vehicle.type}</h3>
                  <Car className="w-8 h-8 text-sky-500" />
                </div>
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Passengers:</span>
                    <span className="font-medium">{vehicle.capacity}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Luggage:</span>
                    <span className="font-medium">{vehicle.luggage}</span>
                  </div>
                </div>
                <div className="text-3xl font-bold text-sky-500 mb-4">{vehicle.price}</div>
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-sky-500 mr-2" />
                    AC & Music System
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-sky-500 mr-2" />
                    GPS Tracking
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-sky-500 mr-2" />
                    Professional Driver
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* Popular Routes */}
      {!isSearchActive && !isEditMode && (
      <section className="py-8 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-3xl lg:text-3xl font-bold text-gray-900 mb-4">Popular Routes</h2>
            <p className="text-xl text-gray-600">Most traveled destinations from Vizag Airport</p>
          </motion.div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {popularRoutes.map((route, index) => (
              <motion.div 
                key={index} 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white rounded-xl p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center mb-4">
                  <Plane className="w-5 h-5 text-sky-600 mr-2" />
                  <div className="flex-1 h-px bg-gray-200"></div>
                  <ArrowRight className="w-4 h-4 text-sky-500 mx-2" />
                  <div className="flex-1 h-px bg-gray-200"></div>
                  <div className="w-3 h-3 bg-sky-500 rounded-full"></div>
                </div>
                
                <h5 className="font-bold text-gray-900 mb-4">
                  {route.from} → {route.to}
                </h5>
                
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Distance:</span>
                    <span className="font-medium">{route.distance}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Time:</span>
                    <span className="font-medium">{route.time}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Price:</span>
                    <span className="text-xl font-bold text-sky-500">{route.price}</span>
                  </div>
                </div>
                
                <Button className="w-full bg-sky-500 hover:bg-sky-600 text-white rounded-lg" onClick={scrollToWidget}>
                  Book Now
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      )}
       {/* CTA */}
       {!isSearchActive && !isEditMode && (
       <section className="relative py-20 bg-gray-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-sky-600/20 to-blue-600/20"></div>
        <div className="relative max-w-3xl mx-auto text-center px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-3xl lg:text-5xl font-bold mb-6">Flying Soon?</h2>
            <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Book your airport transfer now for stress-free travel with flight tracking, meet & greet service, and guaranteed punctual service.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                size="lg" 
                className="bg-sky-500 hover:bg-sky-600 text-white font-bold px-8 py-4 rounded-xl"
                onClick={() => window.open(`tel:+91-9966363662`)}
              >
                <Phone className="w-5 h-5 mr-2" />
                Call Now: +91-9966363662
              </Button>
              <div className="text-gray-400 text-sm">
                24/7 Available • Flight Tracking • Fixed Rates
              </div>
            </div>
          </motion.div>
        </div>
      </section>
      )}

      {/* Service Features */}
      {!isSearchActive && !isEditMode && (
      <section className="py-8 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-3xl font-bold text-gray-900 mb-4">Our Airport Services</h2>
            <p className="text-xl text-gray-600">Complete transfer solutions for all your needs</p>
          </motion.div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {services.map((service, index) => (
              <motion.div 
                key={index} 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-gradient-to-br from-sky-50 to-white rounded-xl p-8 text-center hover:shadow-lg transition-shadow"
              >
                <div className="w-16 h-16 bg-sky-500 rounded-xl flex items-center justify-center mb-6 mx-auto text-white">
                  {service.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{service.name}</h3>
                <p className="text-gray-600 mb-6">{service.description}</p>
                <div className="text-3xl font-bold text-sky-500 mb-6">{service.price}</div>
                <Button className="bg-sky-500 hover:bg-sky-600 text-white" onClick={scrollToWidget}>
                  Book Now
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* Tempo Traveller Services Section */}
      <section className="py-16 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Need Group Airport Transportation?</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              For larger groups arriving at the airport, explore our specialized tempo traveller services for comfortable group airport transfers
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Link to="/tempo-traveller-rental-vizag" className="group">
              <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
                  <Car className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Tempo Traveller Rental</h3>
                <p className="text-sm text-gray-600">Best tempo traveller rental service in Vizag</p>
              </div>
            </Link>
            
            <Link to="/17-seater-tempo-traveller-vizag" className="group">
              <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:bg-green-200 transition-colors">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">17 Seater Tempo Traveller</h3>
                <p className="text-sm text-gray-600">Perfect for large group airport transfers</p>
              </div>
            </Link>
            
            <Link to="/corporate-tempo-traveller-vizag" className="group">
              <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                <div className="bg-indigo-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:bg-indigo-200 transition-colors">
                  <Shield className="h-6 w-6 text-indigo-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Corporate Transport</h3>
                <p className="text-sm text-gray-600">Business travel and corporate events</p>
              </div>
            </Link>
            
            <Link to="/group-travel-tempo-traveller-vizag" className="group">
              <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                <div className="bg-orange-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:bg-orange-200 transition-colors">
                  <Users className="h-6 w-6 text-orange-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Group Travel</h3>
                <p className="text-sm text-gray-600">Specialized group travel solutions</p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Service Links Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <ServiceLinks 
            currentService="/airport-taxi"
            title="Explore Our Other Services"
          />
        </div>
      </section>

      </main>
      <Footer />
      <MobileNavigation />
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
    </div>
  );
}
