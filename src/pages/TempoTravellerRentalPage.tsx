import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import Footer from '@/components/Footer';
import { MobileNavigation } from '@/components/MobileNavigation';
import { Button } from '@/components/ui/button';
import { ResponsiveGrid, ServiceCard } from '@/components/MobileSlider';
import { Car, Users, Phone, Star, CheckCircle } from 'lucide-react';

const TempoTravellerRentalPage = () => {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "Vizag Taxi Hub - Tempo Traveller Rental Service",
    "description": "Best tempo traveller rental service in Visakhapatnam. 17 seater AC tempo traveller with professional driver, GPS tracking, modern amenities. Perfect for group travel, corporate events, family trips & outstation tours.",
    "url": "https://vizagtaxihub.com/tempo-traveller-rental-vizag",
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
    "areaServed": {
      "@type": "City",
      "name": "Visakhapatnam"
    },
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Tempo Traveller Rental Services",
      "itemListElement": [
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "17 Seater Tempo Traveller",
            "description": "Large group travel with AC comfort"
          },
          "price": "35",
          "priceCurrency": "INR",
          "priceSpecification": {
            "@type": "UnitPriceSpecification",
            "price": "35",
            "priceCurrency": "INR",
            "unitText": "per kilometer"
          }
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Group Travel Service",
            "description": "Corporate and family group transportation"
          }
        }
      ]
    }
  };

  return (
    <>
      <Helmet>
        <title>Tempo Traveller Rental in Vizag | 17 Seater AC Mini Bus Hire | Best Rates</title>
        <meta name="description" content="Book tempo traveller rental in Vizag at ₹35/km. 17 seater AC tempo traveller with professional driver. Perfect for group travel. Call +91 9966363662" />
        <meta name="keywords" content="tempo traveller rental vizag, 17 seater tempo traveller visakhapatnam, mini bus rental vizag, group travel vizag, tempo traveller hire vizag, corporate transport vizag, AC tempo traveller vizag, outstation tempo traveller vizag, family group travel vizag, wedding tempo traveller vizag, pilgrimage tempo traveller vizag, airport tempo traveller vizag, araku valley tempo traveller, borra caves tempo traveller, lambasingi tempo traveller, tempo traveller booking vizag, tempo traveller rates vizag" />
        <link rel="canonical" href="https://vizagtaxihub.com/tempo-traveller-rental-vizag" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://vizagtaxihub.com/tempo-traveller-rental-vizag" />
        <meta property="twitter:url" content="https://vizagtaxihub.com/tempo-traveller-rental-vizag" />
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        <Navbar />
        
        <div className="container mx-auto px-4 py-8 max-w-7xl pb-16 md:pb-32">
          {/* Hero Section */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-xl p-8 mb-8">
            <h1 className="text-2xl md:text-3xl font-bold mb-4">Tempo Traveller Rental in Vizag</h1>
            <p className="text-xl mb-6">Best 17 seater AC tempo traveller rental service in Visakhapatnam with professional drivers and modern amenities</p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                size="lg" 
                className="bg-white text-blue-600 hover:bg-gray-100"
                onClick={() => window.open('tel:+919966363662', '_self')}
              >
                <Phone className="mr-2 h-5 w-5" />
                Call +91 9966363662
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-white text-blue-600 bg-white hover:bg-blue-50 hover:text-blue-700"
                onClick={() => window.open('https://vizagtaxihub.com/vehicle/tempo-traveller', '_blank')}
              >
                <Car className="mr-2 h-5 w-5" />
                Book Online
              </Button>
            </div>
          </div>

          {/* Features Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <Users className="h-8 w-8 text-blue-600 mb-4" />
              <h3 className="text-lg font-semibold mb-2">17 Seater Capacity</h3>
              <p className="text-gray-600">Perfect for large groups, corporate events, and family trips</p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <Car className="h-8 w-8 text-green-600 mb-4" />
              <h3 className="text-lg font-semibold mb-2">AC Comfort</h3>
              <p className="text-gray-600">Fully air-conditioned with individual controls for passenger comfort</p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <Star className="h-8 w-8 text-yellow-600 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Professional Driver</h3>
              <p className="text-gray-600">Experienced and licensed drivers with local knowledge</p>
            </div>
          </div>

          {/* Related Services */}
          <div className="bg-white rounded-xl shadow-sm p-6 pb-8 md:pb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Explore Our Tempo Traveller Services</h2>
            <ResponsiveGrid gridCols="grid-cols-1 md:grid-cols-2 lg:grid-cols-4" className="gap-4">
              <ServiceCard 
                service={{
                  icon: Users,
                  title: "17 Seater Tempo Traveller",
                  description: "Spacious 17-seater tempo traveller for big groups and family trips.",
                  features: ["17 passenger capacity", "AC comfort", "Luggage space"],
                  bgColor: "bg-gradient-to-br from-blue-50 to-blue-100",
                  iconColor: "text-blue-600",
                  link: "/17-seater-tempo-traveller-vizag"
                }}
              />
              <ServiceCard 
                service={{
                  icon: Users,
                  title: "12 Seater Tempo Traveller",
                  description: "Comfortable 12-seater tempo traveller for medium groups.",
                  features: ["12 passenger capacity", "AC comfort", "Economical"],
                  bgColor: "bg-gradient-to-br from-green-50 to-green-100",
                  iconColor: "text-green-600",
                  link: "/12-seater-tempo-traveller-vizag"
                }}
              />
              <ServiceCard 
                service={{
                  icon: Users,
                  title: "Group Travel",
                  description: "Tailored group travel packages for all occasions and events.",
                  features: ["Custom packages", "Group discounts", "Event planning"],
                  bgColor: "bg-gradient-to-br from-purple-50 to-purple-100",
                  iconColor: "text-purple-600",
                  link: "/group-travel-tempo-traveller-vizag"
                }}
              />
              <ServiceCard 
                service={{
                  icon: Car,
                  title: "Corporate Transport",
                  description: "Professional corporate transportation services for business needs.",
                  features: ["Business class comfort", "Professional drivers", "Corporate packages"],
                  bgColor: "bg-gradient-to-br from-indigo-50 to-indigo-100",
                  iconColor: "text-indigo-600",
                  link: "/corporate-tempo-traveller-vizag"
                }}
              />
            </ResponsiveGrid>
          </div>
        </div>
        
        <Footer />
        <MobileNavigation />
      </div>
    </>
  );
};

export default TempoTravellerRentalPage;

