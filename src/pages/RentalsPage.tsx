
import React from 'react';
import { Navbar } from '@/components/Navbar';
import { MobileNavigation } from '@/components/MobileNavigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Car, Calendar, Shield, Users, Phone, Clock, MapPin, Star } from 'lucide-react';
import { Link } from 'react-router-dom';

const RentalsPage = () => {
  const rentalPackages = [
    {
      name: 'Daily Rental',
      duration: '24 Hours',
      mileage: '200 KM',
      description: 'Perfect for day-long events, meetings, or personal use',
      features: ['24-hour availability', 'Professional driver', '200 KM included', 'Fuel included']
    },
    {
      name: 'Weekly Rental',
      duration: '7 Days',
      mileage: '1400 KM',
      description: 'Ideal for business trips or extended family visits',
      features: ['7 days continuous service', 'Dedicated vehicle', '200 KM per day', 'Maintenance included']
    },
    {
      name: 'Monthly Rental',
      duration: '30 Days',
      mileage: '6000 KM',
      description: 'Cost-effective solution for long-term transportation needs',
      features: ['30 days service', 'Fixed monthly rate', '200 KM per day', 'Insurance covered']
    }
  ];

  const vehicleCategories = [
    {
      name: 'Economy',
      vehicles: ['Maruti Swift', 'Hyundai i20', 'Tata Tiago'],
      capacity: '4 Passengers',
      description: 'Budget-friendly option for basic transportation'
    },
    {
      name: 'Premium',
      vehicles: ['Honda City', 'Maruti Ciaz', 'Hyundai Verna'],
      capacity: '4 Passengers',
      description: 'Comfortable sedans for business and leisure'
    },
    {
      name: 'SUV',
      vehicles: ['Mahindra XUV500', 'Tata Safari', 'Toyota Innova'],
      capacity: '6-7 Passengers',
      description: 'Spacious vehicles for families and groups'
    },
    {
      name: 'Luxury',
      vehicles: ['BMW 3 Series', 'Audi A4', 'Mercedes C-Class'],
      capacity: '4 Passengers',
      description: 'Premium vehicles for special occasions'
    }
  ];

  const useCases = [
    {
      icon: <Users className="h-8 w-8 text-blue-600" />,
      title: 'Corporate Travel',
      description: 'Reliable transportation for business meetings and events'
    },
    {
      icon: <Calendar className="h-8 w-8 text-blue-600" />,
      title: 'Events & Weddings',
      description: 'Special occasion transportation with professional service'
    },
    {
      icon: <MapPin className="h-8 w-8 text-blue-600" />,
      title: 'Tourism',
      description: 'Explore Visakhapatnam and nearby attractions at your pace'
    },
    {
      icon: <Shield className="h-8 w-8 text-blue-600" />,
      title: 'Emergency Transport',
      description: 'Reliable backup transportation when you need it most'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 pb-20">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-4">Car Rental Services</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Rent a car with driver for your daily, weekly, or monthly transportation needs. 
            Choose from our wide range of vehicles for any occasion.
          </p>
        </div>

        {/* Rental Packages */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-center mb-8">Rental Packages</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {rentalPackages.map((pkg, index) => (
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
                        {pkg.mileage}
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
                  <Link to="/contact">
                    <Button className="w-full">Get Quote</Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Vehicle Categories */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-center mb-8">Vehicle Categories</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {vehicleCategories.map((category, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-center text-blue-600">{category.name}</CardTitle>
                  <p className="text-center text-gray-600">{category.capacity}</p>
                </CardHeader>
                <CardContent>
                  <p className="text-center text-gray-700 mb-4">{category.description}</p>
                  <div className="space-y-1">
                    <h4 className="font-semibold text-sm">Available Models:</h4>
                    {category.vehicles.map((vehicle, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                        <Car size={14} />
                        {vehicle}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
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
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-center">Why Choose Our Rental Service?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                'Professional chauffeurs',
                'Well-maintained vehicles',
                'Flexible rental periods',
                'Competitive pricing',
                'Insurance coverage',
                '24/7 customer support',
                'GPS tracking',
                'Regular sanitization',
                'Fuel included options'
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <Star className="h-5 w-5 text-yellow-500" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* CTA Section */}
        <Card className="bg-blue-600 text-white text-center">
          <CardContent className="py-8">
            <h2 className="text-2xl font-bold mb-4">Need a Rental Vehicle?</h2>
            <p className="mb-6">Contact us for customized rental packages and competitive quotes</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/contact">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                  <Car className="mr-2 h-5 w-5" />
                  Get Rental Quote
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

export default RentalsPage;
