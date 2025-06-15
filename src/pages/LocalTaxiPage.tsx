
import React from 'react';
import { Navbar } from '@/components/Navbar';
import { MobileNavigation } from '@/components/MobileNavigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, MapPin, Star, Shield, Phone, Car } from 'lucide-react';
import { Link } from 'react-router-dom';

const LocalTaxiPage = () => {
  const packages = [
    {
      name: '4 Hours / 40 KM',
      price: '1200',
      description: 'Perfect for quick city tours and local shopping sprees.',
      features: ['AC Sedan', 'Professional Driver', 'Fuel Included', 'Toll & Parking Extra']
    },
    {
      name: '8 Hours / 80 KM',
      price: '2400',
      description: 'Ideal for a full day of city exploration and sightseeing.',
      features: ['AC Sedan', 'Professional Driver', 'Fuel Included', 'Toll & Parking Extra']
    },
    {
      name: '10 Hours / 100 KM',
      price: '3000',
      description: 'For extended city tours and visiting nearby attractions.',
      features: ['AC Sedan', 'Professional Driver', 'Fuel Included', 'Toll & Parking Extra']
    }
  ];

  const popularDestinations = [
    { name: 'RK Beach', image: 'https://images.unsplash.com/photo-1605537932640-038c35345b57?w=500&h=300&fit=crop' },
    { name: 'Kailasagiri', image: 'https://images.unsplash.com/photo-1615836245338-f5d9b5662754?w=500&h=300&fit=crop' },
    { name: 'Submarine Museum', image: 'https://images.unsplash.com/photo-1594966613342-99e6c45d3e23?w=500&h=300&fit=crop' },
    { name: 'Rushikonda Beach', image: 'https://images.unsplash.com/photo-1587974929318-7f28a5065c71?w=500&h=300&fit=crop' },
    { name: 'Simhachalam Temple', image: 'https://images.unsplash.com/photo-1594774591439-ed8e4fe33400?w=500&h=300&fit=crop' },
    { name: 'Dolphin\'s Nose', image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500&h=300&fit=crop' }
  ];

  const features = [
      { icon: <Clock className="h-8 w-8 text-blue-600" />, title: 'Flexible Packages', desc: 'Choose from 4, 8, or 10-hour options.' },
      { icon: <MapPin className="h-8 w-8 text-blue-600" />, title: 'Local Expertise', desc: 'Our drivers know the best routes and spots.' },
      { icon: <Star className="h-8 w-8 text-blue-600" />, title: 'Affordable Rates', desc: 'Competitive pricing for all local trips.' },
      { icon: <Shield className="h-8 w-8 text-blue-600" />, title: 'Safe & Reliable', desc: 'Licensed drivers and well-maintained cars.' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 pb-20">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Local Taxi Service in Visakhapatnam
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Explore Visakhapatnam with our reliable local taxi service. Choose from flexible packages 
            designed for city tours, shopping trips, and local sightseeing.
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-4 gap-6 mb-12">
            {features.map((feature, index) => (
                <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6 flex flex-col items-center">
                        <div className="bg-blue-100 p-3 rounded-full mb-4">{feature.icon}</div>
                        <h3 className="font-semibold mb-2">{feature.title}</h3>
                        <p className="text-sm text-gray-600">{feature.desc}</p>
                    </CardContent>
                </Card>
            ))}
        </div>

        {/* Packages */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-center mb-8">Our Local Taxi Packages</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {packages.map((pkg, index) => (
              <Card key={index} className="flex flex-col hover:shadow-xl transition-shadow duration-300">
                <CardHeader>
                  <CardTitle className="text-center text-2xl font-bold text-blue-600">{pkg.name}</CardTitle>
                  <p className="text-center text-4xl font-bold text-gray-800 flex items-center justify-center">
                    ₹{pkg.price}
                  </p>
                  <p className="text-center text-gray-500 text-sm">{pkg.description}</p>
                </CardHeader>
                <CardContent className="flex-grow">
                  <ul className="space-y-3 mb-6">
                    {pkg.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-3 text-sm">
                        <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <div className="p-6 pt-0">
                  <Link to="/cabs/local">
                    <Button className="w-full" size="lg">Book Package</Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Popular Destinations */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-center mb-8">Popular Local Destinations</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {popularDestinations.map((destination, index) => (
              <div key={index} className="relative group overflow-hidden rounded-lg">
                <img src={destination.image} alt={destination.name} className="w-full h-40 object-cover transform group-hover:scale-110 transition-transform duration-300" />
                <div className="absolute inset-0 bg-black bg-opacity-40 flex items-end p-4">
                    <h3 className="text-white font-bold text-lg">{destination.name}</h3>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <Card className="bg-blue-600 text-white text-center">
          <CardContent className="py-8">
            <h2 className="text-2xl font-bold mb-4">Ready to Explore Visakhapatnam?</h2>
            <p className="mb-6">Book your local taxi now and discover the best of our beautiful city</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/cabs/local">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                  <Car className="mr-2 h-5 w-5" />
                  Book Local Taxi
                </Button>
              </Link>
              <a href="tel:+919440440440">
                <Button variant="outline" size="lg" className="w-full sm:w-auto bg-transparent border-white text-white hover:bg-white hover:text-blue-600">
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

export default LocalTaxiPage;
