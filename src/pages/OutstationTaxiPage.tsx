
import React from 'react';
import { Navbar } from '@/components/Navbar';
import { MobileNavigation } from '@/components/MobileNavigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Map, Shield, Star, Phone, Car } from 'lucide-react';
import { Link } from 'react-router-dom';

const OutstationTaxiPage = () => {
  const popularRoutes = [
    {
      from: 'Visakhapatnam',
      to: 'Araku Valley',
      distance: '120 KM',
      time: '3-4 Hours',
      description: 'Explore the serene hills and coffee plantations of Araku.',
      image: 'https://images.unsplash.com/photo-1594774591439-ed8e4fe33400?w=500&h=300&fit=crop'
    },
    {
      from: 'Visakhapatnam',
      to: 'Srikakulam',
      distance: '110 KM',
      time: '2-3 Hours',
      description: 'Visit ancient temples and historical sites.',
      image: 'https://images.unsplash.com/photo-1615598854932-a25a3a2d603a?w=500&h=300&fit=crop'
    },
    {
      from: 'Visakhapatnam',
      to: 'Rajahmundry',
      distance: '200 KM',
      time: '4-5 Hours',
      description: 'Experience the culture and heritage on the banks of Godavari.',
      image: 'https://images.unsplash.com/photo-1629822359420-554199d2b27a?w=500&h=300&fit=crop'
    },
  ];

  const features = [
    { icon: <Star className="h-8 w-8 text-green-600" />, title: 'Transparent Pricing', desc: 'No hidden charges. Pay for what you see.' },
    { icon: <Car className="h-8 w-8 text-green-600" />, title: 'Wide Range of Cars', desc: 'Choose from Sedans, SUVs, and more.' },
    { icon: <Shield className="h-8 w-8 text-green-600" />, title: 'Safe & Secure Trips', desc: 'Verified drivers and 24/7 support.' },
    { icon: <Map className="h-8 w-8 text-green-600" />, title: 'All India Permit', desc: 'Travel anywhere across the country.' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 pb-20">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Outstation Taxi Service in Visakhapatnam
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Plan your perfect getaway from Visakhapatnam with our reliable outstation taxi service. 
            Enjoy comfortable rides, transparent pricing, and professional drivers.
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          {features.map((feature, index) => (
             <Card key={index} className="text-center hover:shadow-lg transition-shadow">
              <CardContent className="pt-6 flex flex-col items-center">
                <div className="bg-green-100 p-3 rounded-full mb-4">{feature.icon}</div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-600">{feature.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Popular Routes */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-center mb-8">Popular Outstation Routes</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {popularRoutes.map((route, index) => (
              <Card key={index} className="overflow-hidden group hover:shadow-xl transition-shadow duration-300">
                <img src={route.image} alt={route.to} className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300" />
                <CardContent className="p-6">
                  <Badge variant="secondary" className="mb-2">Trip</Badge>
                  <h3 className="text-xl font-bold mb-2 flex items-center justify-between">
                    <span>{route.from} to {route.to}</span>
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">{route.description}</p>
                  <div className="flex justify-between items-center text-sm text-gray-700 mb-4">
                    <span><strong>Distance:</strong> {route.distance}</span>
                    <span><strong>Time:</strong> {route.time}</span>
                  </div>
                  <Link to="/cabs/outstation">
                    <Button className="w-full">
                      View Details
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <Card className="bg-green-600 text-white text-center">
          <CardContent className="py-8">
            <h2 className="text-2xl font-bold mb-4">Ready for Your Next Adventure?</h2>
            <p className="mb-6">Book your outstation cab now for a memorable journey.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/cabs/outstation">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                  <Car className="mr-2 h-5 w-5" />
                  Book Outstation Taxi
                </Button>
              </Link>
              <a href="tel:+919440440440">
                <Button variant="outline" size="lg" className="w-full sm:w-auto bg-transparent border-white text-white hover:bg-white hover:text-green-600">
                  <Phone className="mr-2 h-5 w-5" />
                  Call: +91 9440440440
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>

      <MobileNavigation />
    </div>
  );
};

export default OutstationTaxiPage;
