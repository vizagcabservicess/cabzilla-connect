
import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Navbar } from '@/components/Navbar';
import { MobileNavigation } from '@/components/MobileNavigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, Users, MapPin, Fuel, Shield, Car, Phone, CheckCircle, Luggage } from 'lucide-react';
import { Link } from 'react-router-dom';

const SUVPage = () => {
  const suvModels = [
    {
      name: 'Maruti Ertiga',
      image: 'https://images.unsplash.com/photo-1581540222194-0def2dda95b8?w=500&h=300&fit=crop',
      category: 'Premium',
      capacity: '6 Passengers',
      rating: 4.4,
      trips: '3,120+',
      rate: '₹18/km',
      features: ['AC', 'GPS', 'Extra Space'],
      description: 'Spacious SUV for families'
    },
    {
      name: 'Toyota Innova Crysta',
      image: 'https://images.unsplash.com/photo-1606611264161-c26b7fa52667?w=500&h=300&fit=crop',
      category: 'Luxury',
      capacity: '7 Passengers',
      rating: 4.8,
      trips: '5,680+',
      rate: '₹20/km',
      features: ['AC', 'GPS', 'Premium Comfort'],
      description: 'Luxury SUV for premium travel'
    },
    {
      name: 'Mahindra XUV500',
      image: 'https://images.unsplash.com/photo-1493238792000-8113da705763?w=500&h=300&fit=crop',
      category: 'Premium',
      capacity: '7 Passengers',
      rating: 4.5,
      trips: '2,890+',
      rate: '₹19/km',
      features: ['AC', 'GPS', 'Powerful Engine'],
      description: 'Robust SUV for long journeys'
    }
  ];

  const rateCard = {
    local: {
      '4hr40km': { rate: '₹2,400', description: '4 Hours 40 KM' },
      '8hr80km': { rate: '₹4,800', description: '8 Hours 80 KM' },
      '10hr100km': { rate: '₹6,000', description: '10 Hours 100 KM' }
    },
    outstation: {
      premium: { rate: '₹18/km', description: 'Maruti Ertiga, Mahindra XUV' },
      luxury: { rate: '₹20/km', description: 'Toyota Innova Crysta' }
    },
    airport: {
      premium: { rate: '₹1,800', description: 'One way to Airport' },
      luxury: { rate: '₹2,200', description: 'Luxury one way to Airport' }
    }
  };

  return (
    <>
      <Helmet>
        <title>SUV Car Rental in Visakhapatnam | 6-7 Seater SUVs | VizagTaxiHub</title>
        <meta name="description" content="Book SUV cars in Visakhapatnam. Maruti Ertiga, Toyota Innova Crysta, Mahindra XUV500. Perfect for families and groups. Starting ₹18/km." />
        <meta name="keywords" content="SUV rental visakhapatnam, innova crysta booking vizag, 7 seater car hire, family car rental, group travel SUV" />
        <meta property="og:title" content="SUV Car Rental in Visakhapatnam - 6-7 Seater Vehicles" />
        <meta property="og:description" content="Rent spacious SUVs in Vizag. Innova Crysta ₹20/km, Ertiga ₹18/km. Perfect for families and groups." />
        <meta property="og:image" content="https://images.unsplash.com/photo-1606611264161-c26b7fa52667?w=1200&h=630&fit=crop" />
        <link rel="canonical" href="/suv" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            "name": "SUV Car Rental Visakhapatnam",
            "description": "Spacious SUV rental service in Visakhapatnam for families and groups",
            "provider": {
              "@type": "Organization",
              "name": "VizagTaxiHub"
            },
            "areaServed": "Visakhapatnam",
            "offers": {
              "@type": "Offer",
              "priceRange": "₹18-₹20 per km"
            }
          })}
        </script>
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        <Navbar />
        
        <div className="container mx-auto px-4 py-8 pb-20">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              SUV Car Rental in Visakhapatnam
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Travel in comfort with our spacious SUV fleet. Perfect for families, groups, and long journeys. Choose from 6-7 seater premium vehicles starting from ₹18 per kilometer.
            </p>
          </div>

          {/* Vehicle Gallery */}
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-center mb-8">Our SUV Fleet</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {suvModels.map((car, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <div className="relative">
                    <img 
                      src={car.image} 
                      alt={car.name}
                      className="w-full h-48 object-cover rounded-t-lg"
                    />
                    <Badge className="absolute top-3 right-3 bg-purple-100 text-purple-900">
                      {car.category}
                    </Badge>
                  </div>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-xl font-semibold">{car.name}</h3>
                      <div className="text-right">
                        <div className="text-lg font-bold text-blue-600">{car.rate}</div>
                        <div className="text-sm text-gray-500">per KM</div>
                      </div>
                    </div>
                    <p className="text-gray-600 mb-3">{car.description}</p>
                    <div className="flex items-center gap-4 mb-3 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Users size={16} />
                        {car.capacity}
                      </span>
                      <span className="flex items-center gap-1">
                        <Star size={16} className="text-yellow-500" />
                        {car.rating}
                      </span>
                      <span>{car.trips} trips</span>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {car.features.map((feature, idx) => (
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
            <h2 className="text-3xl font-bold text-center mb-8">SUV Rate Card</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {/* Local Rates */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-purple-600">Local Packages</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(rateCard.local).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <div>
                          <div className="font-medium">{value.description}</div>
                        </div>
                        <div className="text-lg font-bold text-purple-600">{value.rate}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Outstation Rates */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-purple-600">Outstation Rates</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(rateCard.outstation).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <div>
                          <div className="font-medium capitalize">{key}</div>
                          <div className="text-sm text-gray-600">{value.description}</div>
                        </div>
                        <div className="text-lg font-bold text-purple-600">{value.rate}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Airport Rates */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-purple-600">Airport Transfer</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(rateCard.airport).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <div>
                          <div className="font-medium capitalize">{key}</div>
                          <div className="text-sm text-gray-600">{value.description}</div>
                        </div>
                        <div className="text-lg font-bold text-purple-600">{value.rate}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Features */}
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-center mb-8">Why Choose Our SUVs?</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: <Users className="h-8 w-8" />, title: 'Spacious Interior', desc: '6-7 comfortable seats for groups' },
                { icon: <Luggage className="h-8 w-8" />, title: 'Extra Luggage Space', desc: 'Ample storage for long trips' },
                { icon: <Shield className="h-8 w-8" />, title: 'Safety First', desc: 'Advanced safety features' },
                { icon: <Car className="h-8 w-8" />, title: 'Premium Comfort', desc: 'Air conditioning and smooth ride' }
              ].map((feature, index) => (
                <Card key={index} className="text-center">
                  <CardContent className="pt-6">
                    <div className="text-purple-600 mb-4 flex justify-center">{feature.icon}</div>
                    <h3 className="font-semibold mb-2">{feature.title}</h3>
                    <p className="text-sm text-gray-600">{feature.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* CTA Section */}
          <Card className="bg-purple-600 text-white text-center">
            <CardContent className="py-8">
              <h2 className="text-2xl font-bold mb-4">Book Your SUV Today</h2>
              <p className="mb-6">Perfect for families and groups - spacious, comfortable, and reliable</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/cabs">
                  <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                    <Car className="mr-2 h-5 w-5" />
                    Book SUV Now
                  </Button>
                </Link>
                <Button variant="outline" size="lg" className="w-full sm:w-auto bg-transparent border-white text-white hover:bg-white hover:text-purple-600">
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

export default SUVPage;
