
import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Navbar } from '@/components/Navbar';
import { MobileNavigation } from '@/components/MobileNavigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, Users, MapPin, Fuel, Shield, Car, Phone, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const SedanPage = () => {
  const sedanModels = [
    {
      name: 'Swift Dzire',
      image: 'https://images.unsplash.com/photo-1549924231-f129b911e442?w=500&h=300&fit=crop',
      category: 'Economy',
      capacity: '4 Passengers',
      rating: 4.5,
      trips: '2,450+',
      rate: '₹14/km',
      features: ['AC', 'GPS', 'Music System'],
      description: 'Perfect for city rides and short trips'
    },
    {
      name: 'Honda Amaze',
      image: 'https://images.unsplash.com/photo-1553440569-bcc63803a83d?w=500&h=300&fit=crop',
      category: 'Economy',
      capacity: '4 Passengers',
      rating: 4.6,
      trips: '1,890+',
      rate: '₹14/km',
      features: ['AC', 'GPS', 'Comfortable Seats'],
      description: 'Reliable and comfortable sedan'
    },
    {
      name: 'Honda City',
      image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=500&h=300&fit=crop',
      category: 'Premium',
      capacity: '4 Passengers',
      rating: 4.7,
      trips: '3,200+',
      rate: '₹16/km',
      features: ['AC', 'GPS', 'Premium Interior'],
      description: 'Premium sedan for business travel'
    }
  ];

  const rateCard = {
    local: {
      '4hr40km': { rate: '₹1,800', description: '4 Hours 40 KM' },
      '8hr80km': { rate: '₹3,200', description: '8 Hours 80 KM' },
      '10hr100km': { rate: '₹4,000', description: '10 Hours 100 KM' }
    },
    outstation: {
      economy: { rate: '₹14/km', description: 'Swift Dzire, Honda Amaze' },
      premium: { rate: '₹16/km', description: 'Honda City, Maruti Ciaz' }
    },
    airport: {
      economy: { rate: '₹1,200', description: 'One way to Airport' },
      premium: { rate: '₹1,400', description: 'Premium one way to Airport' }
    }
  };

  return (
    <>
      <Helmet>
        <title>Sedan Car Rental in Visakhapatnam | Economy & Premium Sedans | VizagTaxiHub</title>
        <meta name="description" content="Book sedan cars in Visakhapatnam. Choose from Swift Dzire, Honda Amaze, Honda City. Best rates starting ₹14/km for local, outstation & airport transfers." />
        <meta name="keywords" content="sedan car rental visakhapatnam, swift dzire taxi vizag, honda city booking, economy sedan hire, premium sedan rental" />
        <meta property="og:title" content="Sedan Car Rental in Visakhapatnam - Book Online" />
        <meta property="og:description" content="Rent sedan cars in Vizag. Swift Dzire ₹14/km, Honda City ₹16/km. 24/7 service, professional drivers." />
        <meta property="og:image" content="https://images.unsplash.com/photo-1549924231-f129b911e442?w=1200&h=630&fit=crop" />
        <link rel="canonical" href="https://vizagtaxihub.com/sedan" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            "name": "Sedan Car Rental Visakhapatnam",
            "description": "Premium sedan car rental service in Visakhapatnam with professional drivers",
            "provider": {
              "@type": "Organization",
              "name": "VizagTaxiHub"
            },
            "areaServed": "Visakhapatnam",
            "offers": {
              "@type": "Offer",
              "priceRange": "₹14-₹16 per km"
            }
          })}
        </script>
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        <Navbar />
        
        <div className="container mx-auto px-4 py-8 pb-20">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-4">Sedan Car Rental Services</h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Choose from our premium fleet of sedan cars perfect for business trips, family outings, and comfortable city travel. Starting from ₹14 per kilometer.
            </p>
          </div>

          {/* Vehicle Gallery */}
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-center mb-8">Our Sedan Fleet</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {sedanModels.map((car, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <div className="relative">
                    <img 
                      src={car.image} 
                      alt={car.name}
                      className="w-full h-48 object-cover rounded-t-lg"
                    />
                    <Badge className="absolute top-3 right-3 bg-blue-100 text-blue-900">
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
                    <Link to="/local-taxi">
                      <Button className="w-full">Book Now</Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Rate Card */}
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-center mb-8">Sedan Rate Card</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {/* Local Rates */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-blue-600">Local Packages</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(rateCard.local).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <div>
                          <div className="font-medium">{value.description}</div>
                        </div>
                        <div className="text-lg font-bold text-blue-600">{value.rate}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Outstation Rates */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-blue-600">Outstation Rates</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(rateCard.outstation).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <div>
                          <div className="font-medium capitalize">{key}</div>
                          <div className="text-sm text-gray-600">{value.description}</div>
                        </div>
                        <div className="text-lg font-bold text-blue-600">{value.rate}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Airport Rates */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-blue-600">Airport Transfer</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(rateCard.airport).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <div>
                          <div className="font-medium capitalize">{key}</div>
                          <div className="text-sm text-gray-600">{value.description}</div>
                        </div>
                        <div className="text-lg font-bold text-blue-600">{value.rate}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Features */}
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-center mb-8">Why Choose Our Sedans?</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: <Shield className="h-8 w-8" />, title: 'Safe & Secure', desc: 'All vehicles sanitized regularly' },
                { icon: <Car className="h-8 w-8" />, title: 'Well Maintained', desc: 'Regular service and maintenance' },
                { icon: <Fuel className="h-8 w-8" />, title: 'Fuel Efficient', desc: 'Latest models for better mileage' },
                { icon: <Users className="h-8 w-8" />, title: 'Professional Drivers', desc: 'Experienced and courteous drivers' }
              ].map((feature, index) => (
                <Card key={index} className="text-center">
                  <CardContent className="pt-6">
                    <div className="text-blue-600 mb-4 flex justify-center">{feature.icon}</div>
                    <h3 className="font-semibold mb-2">{feature.title}</h3>
                    <p className="text-sm text-gray-600">{feature.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* CTA Section */}
          <Card className="bg-blue-600 text-white text-center">
            <CardContent className="py-8">
              <h2 className="text-2xl font-bold mb-4">Book Your Sedan Today</h2>
              <p className="mb-6">Professional drivers, competitive rates, and 24/7 service</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/local-taxi">
                  <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                    <Car className="mr-2 h-5 w-5" />
                    Book Sedan Now
                  </Button>
                </Link>
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="w-full sm:w-auto bg-transparent border-white text-white hover:bg-white hover:text-blue-600"
                  onClick={() => window.open('tel:+919966363662', '_self')}
                >
                  <Phone className="mr-2 h-5 w-5" />
                  Call: +91 9966363662
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

export default SedanPage;
