import React from 'react';
import { motion } from 'framer-motion';
import { OutstationHeroWidget } from "@/components/OutstationHeroWidget";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Car, Shield, Star, Phone, Clock, Users, MapPin, Zap, CheckCircle, ArrowRight, Navigation } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { Navbar } from '@/components/Navbar';
import Footer from '@/components/Footer';
import { MobileNavigation } from '@/components/MobileNavigation';

export function OutstationTaxiPage() {
  const widgetRef = React.useRef<HTMLDivElement>(null);
  const [isSearchActive, setIsSearchActive] = React.useState(false);
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
      icon: <Zap className="w-6 h-6" />, 
      title: 'Instant Booking', 
      description: 'Book your cab in under 60 seconds with our streamlined process.',
      color: 'bg-emerald-500'
    },
    { 
      icon: <Shield className="w-6 h-6" />, 
      title: 'Safe & Reliable', 
      description: 'GPS tracking, verified drivers, and 24/7 customer support.',
      color: 'bg-blue-500'
    },
    { 
      icon: <Star className="w-6 h-6" />, 
      title: 'Best Rates', 
      description: 'Competitive pricing with no hidden charges or surge pricing.',
      color: 'bg-amber-500'
    },
    { 
      icon: <Users className="w-6 h-6" />, 
      title: 'Trusted Service', 
      description: 'Join 10,000+ satisfied customers who travel with us regularly.',
      color: 'bg-purple-500'
    }
  ];

  const popularRoutes = [
    { from: 'Visakhapatnam', to: 'Hyderabad', distance: '625 km', price: '₹17,000', duration: '16-18 hrs' },
    { from: 'Visakhapatnam', to: 'Chennai', distance: '780 km', price: '₹23,200', duration: '16-18 hrs' },
    { from: 'Visakhapatnam', to: 'Annavaram', distance: '130 km', price: '₹4,500', duration: '3-4 hrs' },
    { from: 'Visakhapatnam', to: 'Araku Valley', distance: '115 km', price: '₹5,000', duration: '3-4 hrs' },
  ];

  const vehicleTypes = [
    { name: 'Sedan', seats: '4+1', price: '₹14/km', features: ['AC', 'Music', 'GPS'] },
    { name: 'SUV', seats: '6+1', price: '₹18/km', features: ['AC', 'Music', 'GPS', 'Extra Space'] },
    { name: 'Luxury', seats: '7+1', price: '₹20/km', features: ['Premium AC', 'Premium Music', 'GPS', 'Leather Seats'] },
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
      "priceRange": "₹14-35 per km",
      "availability": "https://schema.org/InStock"
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />
      <main className="flex-1 pt-16">
      <Helmet>
        <title>Outstation Taxi Service Visakhapatnam | One Way Cab Booking | Vizag Taxi Hub</title>
        <meta name="description" content="Book outstation taxi from Visakhapatnam to all major cities. One way cab service, round trip booking. Best rates for Vizag to Hyderabad, Chennai, Bangalore. 24/7 available." />
        <meta name="keywords" content="outstation taxi visakhapatnam, one way cab from vizag, vizag to hyderabad taxi, vizag to chennai cab, outstation cab booking visakhapatnam, vizag taxi service" />
        <link rel="canonical" href="https://vizagtaxihub.com/outstation-taxi" />
      </Helmet>

                                                                                                                     {/* Hero Section */}
      <section className={`relative bg-gradient-to-br from-emerald-50 to-white ${isSearchActive ? 'pt-36 md:pt-40 pb-24' : 'pt-16 md:pt-24 pb-16 md:pb-32'}`}>
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          {!isSearchActive && (
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-8 md:mb-24"
          >
            <div className="inline-flex items-center px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-emerald-100 text-emerald-700 text-xs md:text-sm font-medium mb-4 md:mb-6">
              <CheckCircle className="w-3 h-3 md:w-4 md:h-4 mr-2" />
              Vizag's Most Trusted Outstation Service
            </div>
            <h1 className="text-3xl md:text-5xl lg:text-7xl font-bold text-gray-900 mb-3 md:mb-5 leading-tight">
              Travel Beyond
              <br />
              <span className="text-emerald-500">City Limits</span>
            </h1>
            <p className="text-base md:text-xl text-gray-600 mb-8 md:mb-40 max-w-2xl mx-auto">
              Professional outstation taxi service connecting you to every corner of India with comfort and reliability.
            </p>
          </motion.div>
          )}
        
          <motion.div 
            ref={widgetRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="rounded-xl md:rounded-2xl  md:p-8"
          >
            <OutstationHeroWidget 
              onSearch={() => {
                setIsSearchActive(true);
                setTimeout(() => scrollWithOffset(widgetRef.current, 120), 50);
              }}
              onStepChange={(step) => {
                if (step === 2) {
                  const section = document.querySelector('section.relative.bg-gradient-to-br.from-emerald-50.to-white');
                  if (section) {
                    (section as HTMLElement).style.paddingTop = '24px';
                    (section as HTMLElement).style.paddingBottom = '24px';
                  }
                }
              }}
              onEditStart={() => {
                const section = document.querySelector('section.relative.bg-gradient-to-br.from-emerald-50.to-white');
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
      {!isSearchActive && (
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">Why Choose Our Service</h2>
            <p className="text-xl text-gray-600">Premium features for your comfort and safety</p>
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

      {/* Vehicle Types */}
      {!isSearchActive && (
      <section className="py-8 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">Choose Your Vehicle</h2>
            <p className="text-xl text-gray-600">Select from our premium fleet</p>
          </motion.div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {vehicleTypes.map((vehicle, index) => (
              <motion.div 
                key={index} 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-gray-50 rounded-xl p-6 hover:bg-emerald-50 transition-colors group"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-xl text-gray-900">{vehicle.name}</h3>
                  <Car className="w-8 h-8 text-emerald-500" />
                </div>
                <div className="text-sm text-gray-600 mb-2">{vehicle.seats} Seater</div>
                <div className="text-2xl font-bold text-emerald-500 mb-4">{vehicle.price}</div>
                <div className="space-y-2">
                  {vehicle.features.map((feature, i) => (
                    <div key={i} className="flex items-center text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-emerald-500 mr-2" />
                      {feature}
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      )}

       {/* CTA */}
       {!isSearchActive && (
       <section className="relative py-20 bg-gray-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-blue-600/20"></div>
        <div className="relative max-w-3xl mx-auto text-center px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl md:text-3xl lg:text-5xl font-bold mb-6">Ready for Your Journey?</h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Join thousands of satisfied customers who trust us for their outstation travel. 
              Book now and experience the difference.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                size="lg" 
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-8 py-4 rounded-xl"
                onClick={() => window.open(`tel:+91-9966363662`)}
              >
                <Phone className="w-5 h-5 mr-2" />
                Call Now: +91-9966363662
              </Button>
              <div className="text-gray-400 text-sm">
                Available 24/7 • Instant Booking • Best Rates Guaranteed
              </div>
            </div>
          </motion.div>
        </div>
      </section>
      )}

      {/* Popular Routes */}
      {!isSearchActive && (
      <section className="py-8 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">Popular Routes</h2>
            <p className="text-xl text-gray-600">Most traveled destinations from Visakhapatnam</p>
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
                  <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                  <div className="flex-1 h-px bg-gray-200 mx-2"></div>
                  <Navigation className="w-4 h-4 text-emerald-500" />
                  <div className="flex-1 h-px bg-gray-200 mx-2"></div>
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                </div>
                
                <h5 className="font-bold text-gray-900 mb-2">
                  {route.from} → {route.to}
                </h5>
                
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Distance:</span>
                    <span className="font-medium">{route.distance}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-medium">{route.duration}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Starting from:</span>
                    <span className="text-xl font-bold text-emerald-500">{route.price}</span>
                  </div>
                </div>
                
                <Button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg" onClick={scrollToWidget}>
                  Book Now
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      )}

     

      </main>
      <Footer />
      <MobileNavigation />
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
    </div>
  );
}
