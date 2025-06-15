
import React from 'react';
import { Navbar } from '@/components/Navbar';
import { MobileNavigation } from '@/components/MobileNavigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Map, Shield, Star, Phone, Car, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FleetShowcase } from '@/components/FleetShowcase';
import { popularRoutes } from '@/lib/routeData';
import { slugify } from '@/lib/utils';

const OutstationTaxiPage = () => {
  const features = [
    { icon: <Star />, title: 'Transparent Pricing', description: 'No hidden charges. Pay for what you see.' },
    { icon: <Car />, title: 'Wide Range of Cars', description: 'Choose from Sedans, SUVs, and more.' },
    { icon: <Shield />, title: 'Safe & Secure Trips', description: 'Verified drivers and 24/7 support.' },
    { icon: <Map />, title: 'All India Permit', description: 'Travel anywhere across the country.' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 pb-24">
        {/* Hero Section */}
        <section className="text-center py-16">
          <Badge variant="outline" className="mb-4 border-blue-300 bg-blue-50 text-blue-700">Reliable & Affordable</Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">
            Outstation Taxi Service
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto mb-8">
            Explore beyond Visakhapatnam with our comfortable and safe outstation cabs. One-way or round trip, we've got you covered.
          </p>
          <Link to="/cabs/outstation">
            <Button size="lg">
              Book Your Trip <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </section>

        {/* Features Section */}
        <section className="py-12">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center flex flex-col items-center">
                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-4">
                  {React.cloneElement(feature.icon, { className: "h-8 w-8 text-blue-600" })}
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>
        
        {/* Popular Routes Section */}
        <section className="py-12 bg-white rounded-2xl px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900">Popular Outstation Routes</h2>
            <p className="text-gray-600 mt-2">Journeys our customers love the most.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {popularRoutes.slice(0, 9).map((route, index) => (
              <Card key={index} className="overflow-hidden group hover:shadow-xl transition-all duration-300 rounded-lg border">
                <div className="relative">
                  <img src={route.image} alt={route.to} className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105" />
                  <div className="absolute top-4 left-4">
                     <Badge>{route.from} &rarr; {route.to}</Badge>
                  </div>
                </div>
                <CardContent className="p-5">
                  <p className="text-sm text-gray-600 mb-4 h-12">{route.description}</p>
                  <div className="flex justify-between items-center text-sm text-gray-800 font-medium mb-4">
                    <span>~{route.distance}</span>
                    <span>~{route.time}</span>
                  </div>
                  <Button asChild className="w-full">
                    <Link to={`/outstation-taxi/${slugify(route.from)}/${slugify(route.to)}`}>View Details</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <FleetShowcase />

        {/* CTA Section */}
        <section className="py-16">
          <Card className="bg-blue-600 text-white text-center rounded-2xl">
            <CardContent className="p-10">
              <h2 className="text-3xl font-bold mb-3">Ready for Your Next Adventure?</h2>
              <p className="mb-6 max-w-2xl mx-auto">Book your outstation cab now for a memorable journey. Our team is available 24/7 to assist you.</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild variant="secondary" size="lg" className="w-full sm:w-auto">
                   <Link to="/cabs/outstation">
                    <Car className="mr-2 h-5 w-5" />
                    Book Outstation Taxi
                   </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="w-full sm:w-auto bg-transparent border-white text-white hover:bg-white hover:text-blue-600">
                  <a href="tel:+919440440440">
                    <Phone className="mr-2 h-5 w-5" />
                    Call: +91 9440440440
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      <MobileNavigation />
    </div>
  );
};

export default OutstationTaxiPage;
