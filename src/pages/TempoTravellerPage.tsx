
import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Navbar } from '@/components/Navbar';
import { MobileNavigation } from '@/components/MobileNavigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, Users, MapPin, Fuel, Shield, Car, Phone, CheckCircle, Luggage, Bus } from 'lucide-react';
import { Link } from 'react-router-dom';

const TempoTravellerPage = () => {
  const tempoModels = [
    {
      name: '12-Seater Traveller',
      image: 'https://images.unsplash.com/photo-1570125909517-53cb21c89ff2?w=500&h=300&fit=crop',
      category: 'Group',
      capacity: '12 Passengers',
      rating: 4.2,
      trips: '1,250+',
      rate: '₹30/km',
      features: ['AC', 'GPS', 'Comfortable'],
      description: 'Ideal for medium groups'
    },
    {
      name: '17-Seater Tempo Traveller',
      image: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=500&h=300&fit=crop',
      category: 'Group',
      capacity: '17 Passengers',
      rating: 4.3,
      trips: '890+',
      rate: '₹35/km',
      features: ['AC', 'GPS', 'Group Travel'],
      description: 'Perfect for large groups'
    },
    {
      name: '20-Seater Luxury Traveller',
      image: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=500&h=300&fit=crop',
      category: 'Luxury',
      capacity: '20 Passengers',
      rating: 4.5,
      trips: '650+',
      rate: '₹40/km',
      features: ['AC', 'GPS', 'Premium Interior'],
      description: 'Luxury group transportation'
    }
  ];

  const rateCard = {
    local: {
      '4hr40km': { rate: '₹4,800', description: '4 Hours 40 KM (12-Seater)' },
      '8hr80km': { rate: '₹9,600', description: '8 Hours 80 KM (12-Seater)' },
      '10hr100km': { rate: '₹12,000', description: '10 Hours 100 KM (12-Seater)' }
    },
    outstation: {
      '12seater': { rate: '₹30/km', description: '12-Seater Traveller' },
      '17seater': { rate: '₹35/km', description: '17-Seater Traveller' },
      '20seater': { rate: '₹40/km', description: '20-Seater Luxury' }
    },
    airport: {
      '12seater': { rate: '₹3,000', description: 'One way to Airport' },
      '17seater': { rate: '₹3,500', description: '17-Seater one way' },
      '20seater': { rate: '₹4,000', description: 'Luxury one way' }
    }
  };

  const useCases = [
    {
      title: 'Corporate Events',
      description: 'Perfect for office outings and team building events',
      icon: <Users className="h-8 w-8 text-green-600" />
    },
    {
      title: 'Wedding Groups',
      description: 'Transport wedding parties and guests comfortably',
      icon: <Car className="h-8 w-8 text-green-600" />
    },
    {
      title: 'Tourist Groups',
      description: 'Ideal for group tours and sightseeing trips',
      icon: <MapPin className="h-8 w-8 text-green-600" />
    },
    {
      title: 'School Trips',
      description: 'Safe and reliable transport for educational tours',
      icon: <Bus className="h-8 w-8 text-green-600" />
    }
  ];

  return (
    <>
      <Helmet>
        <title>Tempo Traveller Rental in Visakhapatnam | 12-20 Seater Group Travel | VizagTaxiHub</title>
        <meta name="description" content="Book Tempo Traveller in Visakhapatnam for group travel. 12, 17, 20 seater vehicles available. Perfect for corporate events, weddings, tours. Starting ₹30/km." />
        <meta name="keywords" content="tempo traveller visakhapatnam, 12 seater rental vizag, group travel vehicle, corporate transport, wedding car rental, tourist bus hire" />
        <meta property="og:title" content="Tempo Traveller Rental in Visakhapatnam - Group Travel" />
        <meta property="og:description" content="Rent Tempo Traveller in Vizag. 12-20 seater vehicles for groups. Starting ₹30/km. Perfect for events and tours." />
        <meta property="og:image" content="https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1200&h=630&fit=crop" />
        <link rel="canonical" href="/tempo-traveller" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            "name": "Tempo Traveller Rental Visakhapatnam",
            "description": "Group transportation service in Visakhapatnam with 12-20 seater vehicles",
            "provider": {
              "@type": "Organization",
              "name": "VizagTaxiHub"
            },
            "areaServed": "Visakhapatnam",
            "offers": {
              "@type": "Offer",
              "priceRange": "₹30-₹40 per km"
            }
          })}
        </script>
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        <Navbar />
        
        <div className="container mx-auto px-4 py-8 pb-20">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-4">Tempo Traveller Services</h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Perfect for group travel with our fleet of 12-20 seater Tempo Travellers. Ideal for corporate events, weddings, tours, and family gatherings. Starting from ₹30 per kilometer.
            </p>
          </div>

          {/* Vehicle Gallery */}
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-center mb-8">Our Tempo Traveller Fleet</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {tempoModels.map((vehicle, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <div className="relative">
                    <img 
                      src={vehicle.image} 
                      alt={vehicle.name}
                      className="w-full h-48 object-cover rounded-t-lg"
                    />
                    <Badge className="absolute top-3 right-3 bg-green-100 text-green-900">
                      {vehicle.category}
                    </Badge>
                  </div>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-xl font-semibold">{vehicle.name}</h3>
                      <div className="text-right">
                        <div className="text-lg font-bold text-blue-600">{vehicle.rate}</div>
                        <div className="text-sm text-gray-500">per KM</div>
                      </div>
                    </div>
                    <p className="text-gray-600 mb-3">{vehicle.description}</p>
                    <div className="flex items-center gap-4 mb-3 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Users size={16} />
                        {vehicle.capacity}
                      </span>
                      <span className="flex items-center gap-1">
                        <Star size={16} className="text-yellow-500" />
                        {vehicle.rating}
                      </span>
                      <span>{vehicle.trips} trips</span>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {vehicle.features.map((feature, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                    <Link to="/cabs">
                      <Button className="w-full">Book Now</Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Rate Card */}
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-center mb-8">Tempo Traveller Rate Card</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {/* Local Rates */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-green-600">Local Packages</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(rateCard.local).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <div>
                          <div className="font-medium">{value.description}</div>
                        </div>
                        <div className="text-lg font-bold text-green-600">{value.rate}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Outstation Rates */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-green-600">Outstation Rates</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(rateCard.outstation).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <div>
                          <div className="font-medium">{value.description}</div>
                        </div>
                        <div className="text-lg font-bold text-green-600">{value.rate}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Airport Rates */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-green-600">Airport Transfer</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(rateCard.airport).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <div>
                          <div className="font-medium">{value.description}</div>
                        </div>
                        <div className="text-lg font-bold text-green-600">{value.rate}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Use Cases */}
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-center mb-8">Perfect For</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {useCases.map((useCase, index) => (
                <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex justify-center mb-4">{useCase.icon}</div>
                    <h3 className="font-semibold mb-2">{useCase.title}</h3>
                    <p className="text-sm text-gray-600">{useCase.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Features */}
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-center mb-8">Why Choose Our Tempo Travellers?</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: <Users className="h-8 w-8" />, title: 'Group Comfort', desc: 'Comfortable seating for all passengers' },
                { icon: <Luggage className="h-8 w-8" />, title: 'Large Storage', desc: 'Ample luggage space for group trips' },
                { icon: <Shield className="h-8 w-8" />, title: 'Safe Travel', desc: 'Experienced drivers and safety features' },
                { icon: <Car className="h-8 w-8" />, title: 'AC & GPS', desc: 'Air conditioning and GPS navigation' }
              ].map((feature, index) => (
                <Card key={index} className="text-center">
                  <CardContent className="pt-6">
                    <div className="text-green-600 mb-4 flex justify-center">{feature.icon}</div>
                    <h3 className="font-semibold mb-2">{feature.title}</h3>
                    <p className="text-sm text-gray-600">{feature.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* CTA Section */}
          <Card className="bg-green-600 text-white text-center">
            <CardContent className="py-8">
              <h2 className="text-2xl font-bold mb-4">Book Your Tempo Traveller Today</h2>
              <p className="mb-6">Perfect for group travel - comfortable, spacious, and affordable</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/cabs">
                  <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                    <Bus className="mr-2 h-5 w-5" />
                    Book Tempo Traveller
                  </Button>
                </Link>
                <Button variant="outline" size="lg" className="w-full sm:w-auto bg-transparent border-white text-white hover:bg-white hover:text-green-600">
                  <Phone className="mr-2 h-5 w-5" />
                  Call: +91 9440440440
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <MobileNavigation />
      </div>
    </>
  );
};

export default TempoTravellerPage;
