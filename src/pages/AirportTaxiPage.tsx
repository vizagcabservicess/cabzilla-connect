
import React from 'react';
import { Navbar } from '@/components/Navbar';
import { MobileNavigation } from '@/components/MobileNavigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plane, Clock, Shield, Star, Phone, Car, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

const AirportTaxiPage = () => {
  const services = [
    {
      icon: <Plane className="h-12 w-12 text-blue-600" />,
      title: 'Airport Pickup',
      description: 'Comfortable ride from Visakhapatnam Airport to your destination'
    },
    {
      icon: <MapPin className="h-12 w-12 text-blue-600" />,
      title: 'Airport Drop',
      description: 'Reliable transport from your location to the airport'
    },
    {
      icon: <Clock className="h-12 w-12 text-blue-600" />,
      title: 'Flight Tracking',
      description: 'We monitor your flight status for any delays'
    },
    {
      icon: <Shield className="h-12 w-12 text-blue-600" />,
      title: 'Safe & Secure',
      description: 'Licensed drivers with verified background checks'
    }
  ];

  const zones = [
    {
      zone: 'Zone 1 (0-10 KM)',
      areas: ['Airport Area', 'Gajuwaka', 'NAD Junction'],
      description: 'Close proximity to airport'
    },
    {
      zone: 'Zone 2 (11-20 KM)',
      areas: ['Dwaraka Nagar', 'MVP Colony', 'Madhurawada'],
      description: 'City center and business districts'
    },
    {
      zone: 'Zone 3 (21-30 KM)',
      areas: ['RK Beach', 'Rushikonda', 'Bheemunipatnam'],
      description: 'Beach areas and outskirts'
    },
    {
      zone: 'Zone 4 (31+ KM)',
      areas: ['Araku Valley', 'Lambasingi', 'Other distant locations'],
      description: 'Hill stations and distant areas'
    }
  ];

  const features = [
    'Meet & Greet service',
    'Flight delay monitoring',
    'Free waiting time (30 minutes)',
    'Professional chauffeurs',
    'Clean & sanitized vehicles',
    'GPS tracking for safety',
    '24/7 customer support',
    'Fixed pricing - no surge'
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 pb-20">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Visakhapatnam Airport Taxi Service
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Reliable airport transfers to and from Visakhapatnam Airport. Book your airport taxi 
            for hassle-free travel with professional drivers and comfortable vehicles.
          </p>
        </div>

        {/* Services */}
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          {services.map((service, index) => (
            <Card key={index} className="text-center hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex justify-center mb-4">{service.icon}</div>
                <h3 className="font-semibold mb-2">{service.title}</h3>
                <p className="text-sm text-gray-600">{service.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Zones */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-center mb-8">Airport Taxi Zones</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {zones.map((zone, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-blue-600">{zone.zone}</CardTitle>
                  <p className="text-gray-600">{zone.description}</p>
                </CardHeader>
                <CardContent>
                  <h4 className="font-semibold mb-2">Popular Areas:</h4>
                  <ul className="space-y-1">
                    {zone.areas.map((area, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        {area}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Features */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-center mb-8">Why Choose Our Airport Service?</h2>
          <Card>
            <CardContent className="p-8">
              <div className="grid md:grid-cols-2 gap-6">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <Star className="h-5 w-5 text-yellow-500" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Airport Info */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plane className="h-6 w-6 text-blue-600" />
              Visakhapatnam Airport Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3">Airport Details:</h4>
                <ul className="space-y-2 text-sm">
                  <li><strong>IATA Code:</strong> VTZ</li>
                  <li><strong>Location:</strong> Visakhapatnam, Andhra Pradesh</li>
                  <li><strong>Distance from City:</strong> 12 KM</li>
                  <li><strong>Terminal:</strong> Domestic & International</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-3">Pickup Instructions:</h4>
                <ul className="space-y-2 text-sm">
                  <li>• Wait at the designated taxi pickup area</li>
                  <li>• Look for your driver with a name board</li>
                  <li>• Contact provided number if needed</li>
                  <li>• Free waiting time: 30 minutes</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA Section */}
        <Card className="bg-blue-600 text-white text-center">
          <CardContent className="py-8">
            <h2 className="text-2xl font-bold mb-4">Need Airport Transfer?</h2>
            <p className="mb-6">Book your airport taxi now for a comfortable and reliable journey</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/cabs/airport">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                  <Car className="mr-2 h-5 w-5" />
                  Book Airport Taxi
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

export default AirportTaxiPage;
