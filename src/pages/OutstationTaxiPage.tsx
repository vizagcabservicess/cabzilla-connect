
import React from 'react';
import { Navbar } from '@/components/Navbar';
import { MobileNavigation } from '@/components/MobileNavigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Clock, Shield, Star, Phone, Car, Route } from 'lucide-react';
import { Link } from 'react-router-dom';

const OutstationTaxiPage = () => {
  const popularRoutes = [
    { destination: 'Hyderabad', distance: '625 KM', duration: '8-9 Hours' },
    { destination: 'Araku Valley', distance: '115 KM', duration: '3 Hours' },
    { destination: 'Borra Caves', distance: '90 KM', duration: '2.5 Hours' },
    { destination: 'Rajahmundry', distance: '190 KM', duration: '4 Hours' },
    { destination: 'Kakinada', distance: '150 KM', duration: '3.5 Hours' },
    { destination: 'Vijayawada', distance: '350 KM', duration: '6 Hours' },
    { destination: 'Tirupati', distance: '650 KM', duration: '10 Hours' },
    { destination: 'Bangalore', distance: '750 KM', duration: '12 Hours' }
  ];

  const features = [
    {
      icon: <Route className="h-12 w-12 text-blue-600" />,
      title: 'One Way & Round Trip',
      description: 'Flexible booking options for your travel needs'
    },
    {
      icon: <Shield className="h-12 w-12 text-blue-600" />,
      title: 'Safe & Comfortable',
      description: 'Well-maintained vehicles with experienced drivers'
    },
    {
      icon: <Clock className="h-12 w-12 text-blue-600" />,
      title: '24/7 Service',
      description: 'Available round the clock for your convenience'
    },
    {
      icon: <Star className="h-12 w-12 text-blue-600" />,
      title: 'Best Rates',
      description: 'Competitive pricing with no hidden charges'
    }
  ];

  const vehicleTypes = [
    {
      name: 'Sedan',
      capacity: '4 Passengers',
      luggage: '2-3 Bags',
      description: 'Comfortable for small families and business trips'
    },
    {
      name: 'SUV',
      capacity: '6-7 Passengers',
      luggage: '4-5 Bags',
      description: 'Spacious for larger groups and long journeys'
    },
    {
      name: 'Tempo Traveller',
      capacity: '12-15 Passengers',
      luggage: '8-10 Bags',
      description: 'Perfect for group travel and family outings'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 pb-20">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Outstation Taxi Service from Visakhapatnam
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Travel comfortably to any destination from Visakhapatnam with our reliable outstation taxi service. 
            One way or round trip - we've got you covered.
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          {features.map((feature, index) => (
            <Card key={index} className="text-center hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex justify-center mb-4">{feature.icon}</div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-600">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Popular Routes */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-center mb-8">Popular Outstation Routes</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {popularRoutes.map((route, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="h-5 w-5 text-blue-600" />
                    <span className="font-semibold">{route.destination}</span>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>Distance: {route.distance}</div>
                    <div>Duration: {route.duration}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Vehicle Types */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-center mb-8">Choose Your Vehicle</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {vehicleTypes.map((vehicle, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-center text-blue-600">{vehicle.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center space-y-2 mb-4">
                    <div className="font-medium">{vehicle.capacity}</div>
                    <div className="text-gray-600">{vehicle.luggage}</div>
                  </div>
                  <p className="text-center text-gray-700 mb-4">{vehicle.description}</p>
                  <Link to="/cabs/outstation">
                    <Button className="w-full">Book Now</Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Pricing Info */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-center">Transparent Pricing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3">What's Included:</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    Driver allowance
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    Fuel charges
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    State taxes
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    24/7 customer support
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-3">Extra Charges:</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    Toll charges (as applicable)
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    Parking charges
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    Night halt charges (if applicable)
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA Section */}
        <Card className="bg-blue-600 text-white text-center">
          <CardContent className="py-8">
            <h2 className="text-2xl font-bold mb-4">Ready for Your Outstation Journey?</h2>
            <p className="mb-6">Book your outstation taxi now and travel in comfort</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/cabs/outstation">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                  <Car className="mr-2 h-5 w-5" />
                  Book Outstation Taxi
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

export default OutstationTaxiPage;
