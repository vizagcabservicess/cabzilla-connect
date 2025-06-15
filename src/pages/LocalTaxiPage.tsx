
import React from 'react';
import { Navbar } from '@/components/Navbar';
import { MobileNavigation } from '@/components/MobileNavigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, MapPin, Star, Shield, Phone, Car, ArrowRight, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

const LocalTaxiPage = () => {
  const packages = [
    {
      name: '4 Hours / 40 KM',
      price: '1200',
      description: 'Perfect for quick city tours and local shopping.',
      features: ['AC Sedan', 'Professional Driver', 'Fuel Included']
    },
    {
      name: '8 Hours / 80 KM',
      price: '2400',
      description: 'Ideal for a full day of city exploration.',
      features: ['AC Sedan', 'Professional Driver', 'Fuel Included', 'Tolls Extra']
    },
    {
      name: '10 Hours / 100 KM',
      price: '3000',
      description: 'For extended city tours and nearby attractions.',
      features: ['AC Sedan', 'Professional Driver', 'Fuel Included', 'Tolls Extra']
    }
  ];

  const popularDestinations = [
    { name: 'RK Beach', image: 'https://images.unsplash.com/photo-1605537932640-038c35345b57?w=500&h=300&fit=crop' },
    { name: 'Kailasagiri', image: 'https://images.unsplash.com/photo-1615836245338-f5d9b5662754?w=500&h=300&fit=crop' },
    { name: 'Submarine Museum', image: 'https://images.unsplash.com/photo-1594966613342-99e6c45d3e23?w=500&h=300&fit=crop' },
    { name: 'Rushikonda Beach', image: 'https://images.unsplash.com/photo-1587974929318-7f28a5065c71?w=500&h=300&fit=crop' },
    { name: 'Simhachalam', image: 'https://images.unsplash.com/photo-1594774591439-ed8e4fe33400?w=500&h=300&fit=crop' },
    { name: 'Dolphin\'s Nose', image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500&h=300&fit=crop' }
  ];

  const features = [
      { icon: <Clock />, title: 'Flexible Packages', description: 'Choose from 4, 8, or 10-hour options.' },
      { icon: <MapPin />, title: 'Local Expertise', description: 'Our drivers know the best routes & spots.' },
      { icon: <Star />, title: 'Affordable Rates', description: 'Competitive pricing for all local trips.' },
      { icon: <Shield />, title: 'Safe & Reliable', description: 'Licensed drivers & well-maintained cars.' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 pb-24">
        {/* Hero Section */}
        <section className="text-center py-16">
          <Badge variant="outline" className="mb-4 border-blue-300 bg-blue-50 text-blue-700">Your City Ride Partner</Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">
            Local Taxi Service
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto mb-8">
            Explore Visakhapatnam hassle-free. Choose from our flexible packages for sightseeing, shopping, or daily commutes.
          </p>
          <Link to="/cabs/local">
            <Button size="lg">
              Book a Local Cab <ArrowRight className="ml-2 h-5 w-5" />
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

        {/* Packages Section */}
        <section className="py-12 bg-white rounded-2xl px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900">Our Local Taxi Packages</h2>
            <p className="text-gray-600 mt-2">Affordable hourly packages for your convenience.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {packages.map((pkg, index) => (
              <Card key={index} className="flex flex-col hover:shadow-xl transition-shadow duration-300 rounded-lg border">
                <CardHeader className="text-center">
                  <CardTitle className="text-xl font-bold">{pkg.name}</CardTitle>
                   <p className="text-3xl font-bold text-gray-800 pt-2">₹{pkg.price}</p>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-center text-gray-500 text-sm mb-6 h-10">{pkg.description}</p>
                  <ul className="space-y-3">
                    {pkg.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-3 text-sm">
                        <Check className="h-4 w-4 text-green-500" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <div className="p-6 pt-0">
                  <Button asChild className="w-full" size="lg">
                    <Link to="/cabs/local">Book Package</Link>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Popular Destinations */}
        <section className="py-12">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900">Popular Local Destinations</h2>
            <p className="text-gray-600 mt-2">Must-visit places in and around Visakhapatnam.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {popularDestinations.map((destination) => (
              <div key={destination.name} className="relative group overflow-hidden rounded-lg">
                <img src={destination.image} alt={destination.name} className="w-full h-40 object-cover transform group-hover:scale-110 transition-transform duration-300" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-3">
                    <h3 className="text-white font-bold text-base">{destination.name}</h3>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16">
          <Card className="bg-blue-600 text-white text-center rounded-2xl">
            <CardContent className="p-10">
              <h2 className="text-3xl font-bold mb-3">Ready to Explore Visakhapatnam?</h2>
              <p className="mb-6 max-w-2xl mx-auto">Book your local taxi now and discover the best of our beautiful city.</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild variant="secondary" size="lg" className="w-full sm:w-auto">
                  <Link to="/cabs/local">
                    <Car className="mr-2 h-5 w-5" />
                    Book Local Taxi
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

export default LocalTaxiPage;
