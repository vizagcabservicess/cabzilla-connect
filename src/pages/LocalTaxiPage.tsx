
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
      name: '4 Hours 40 KM',
      duration: '4 Hours',
      distance: '40 KM',
      description: 'Perfect for city tours and local shopping',
      features: ['AC Sedan', 'Professional Driver', 'Fuel Included', 'Toll & Parking Extra']
    },
    {
      name: '8 Hours 80 KM',
      duration: '8 Hours',
      distance: '80 KM',
      description: 'Ideal for full day city exploration',
      features: ['AC Sedan', 'Professional Driver', 'Fuel Included', 'Toll & Parking Extra']
    },
    {
      name: '10 Hours 100 KM',
      duration: '10 Hours',
      distance: '100 KM',
      description: 'Extended city tours and nearby attractions',
      features: ['AC Sedan', 'Professional Driver', 'Fuel Included', 'Toll & Parking Extra']
    }
  ];

  const popularDestinations = [
    'RK Beach', 'Kailasagiri', 'Submarine Museum', 'Araku Valley (Day Trip)',
    'Borra Caves', 'Simhachalam Temple', 'VUDA Park', 'Rushikonda Beach',
    'Indira Gandhi Zoological Park', 'Visakha Museum'
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
          <Card className="text-center">
            <CardContent className="pt-6">
              <Clock className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Flexible Hours</h3>
              <p className="text-sm text-gray-600">Choose from 4, 8, or 10-hour packages</p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="pt-6">
              <MapPin className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Local Expertise</h3>
              <p className="text-sm text-gray-600">Drivers know all local attractions</p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="pt-6">
              <Star className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Best Rates</h3>
              <p className="text-sm text-gray-600">Competitive pricing for local trips</p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="pt-6">
              <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Safe & Reliable</h3>
              <p className="text-sm text-gray-600">Licensed drivers and insured vehicles</p>
            </CardContent>
          </Card>
        </div>

        {/* Packages */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-center mb-8">Local Taxi Packages</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {packages.map((pkg, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-center text-blue-600">{pkg.name}</CardTitle>
                  <div className="text-center text-gray-600">
                    <div className="flex justify-center items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Clock size={16} />
                        {pkg.duration}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin size={16} />
                        {pkg.distance}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-center text-gray-700 mb-4">{pkg.description}</p>
                  <ul className="space-y-2 mb-6">
                    {pkg.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link to="/cabs/local">
                    <Button className="w-full">Book Now</Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Popular Destinations */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-center mb-8">Popular Local Destinations</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {popularDestinations.map((destination, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-blue-600" />
                    <span className="font-medium">{destination}</span>
                  </div>
                </CardContent>
              </Card>
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
              <Button variant="outline" size="lg" className="w-full sm:w-auto bg-transparent border-white text-white hover:bg-white hover:text-blue-600">
                <Phone className="mr-2 h-5 w-5" />
                Call: +91 9440440440
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <MobileNavigation />
    </div>
  );
};

export default LocalTaxiPage;
