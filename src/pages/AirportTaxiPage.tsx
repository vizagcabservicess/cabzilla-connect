
import React from 'react';
import { Navbar } from '@/components/Navbar';
import { MobileNavigation } from '@/components/MobileNavigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plane, Clock, Shield, Phone, Car, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const AirportTaxiPage = () => {
  const services = [
    {
      icon: <Plane className="h-8 w-8 text-orange-600" />,
      title: 'Airport Pickup',
      description: 'Comfortable & on-time pickups from the airport to your destination.'
    },
    {
      icon: <Car className="h-8 w-8 text-orange-600" />,
      title: 'Airport Drop',
      description: 'Reliable and timely drops from anywhere in the city to the airport.'
    },
    {
      icon: <Clock className="h-8 w-8 text-orange-600" />,
      title: '24/7 Service',
      description: 'We are available round the clock for your airport transfer needs.'
    },
    {
      icon: <Shield className="h-8 w-8 text-orange-600" />,
      title: 'Safe & Secure',
      description: 'Licensed drivers with verified backgrounds for your peace of mind.'
    }
  ];

  const fareChart = [
    { type: 'Sedan', dayFare: '₹1200', nightFare: '₹1400', capacity: '4 Pax', luggage: '2 Bags' },
    { type: 'SUV', dayFare: '₹1800', nightFare: '₹2000', capacity: '6 Pax', luggage: '4 Bags' },
    { type: 'Luxury', dayFare: '₹2500', nightFare: '₹2800', capacity: '4 Pax', luggage: '3 Bags' },
  ];

  const features = [
    'Meet & Greet service at arrival hall',
    'Real-time flight delay monitoring',
    'Free waiting time (up to 45 minutes)',
    'Professional, uniformed chauffeurs',
    'Immaculately clean & sanitized vehicles',
    'GPS tracking for your safety and security',
    '24/7 dedicated customer support line',
    'Transparent fixed pricing - no surge charges'
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="relative">
          <img 
            src="https://images.unsplash.com/photo-1569154941061-e23b71b3623a?w=1600&h=600&fit=crop" 
            alt="Airport Terminal" 
            className="absolute inset-0 w-full h-full object-cover z-0"
          />
          <div className="absolute inset-0 bg-black bg-opacity-50 z-10"></div>
          <div className="relative container mx-auto px-4 py-24 text-center z-20">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                  Visakhapatnam Airport Taxi Service
              </h1>
              <p className="text-xl text-gray-200 max-w-3xl mx-auto">
                  Reliable airport transfers to and from Visakhapatnam Airport. Book your airport taxi 
                  for hassle-free travel with professional drivers and comfortable vehicles.
              </p>
              <div className="mt-8">
                  <Link to="/cabs/airport">
                      <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white">
                          <Car className="mr-2 h-5 w-5" />
                          Book Your Airport Ride
                      </Button>
                  </Link>
              </div>
          </div>
      </div>
      
      <div className="container mx-auto px-4 py-12 pb-20">
        {/* Services */}
        <div className="grid md:grid-cols-4 gap-6 mb-12 -mt-24 relative z-30">
          {services.map((service, index) => (
            <Card key={index} className="text-center hover:shadow-lg transition-shadow bg-white">
              <CardContent className="pt-6 flex flex-col items-center">
                <div className="bg-orange-100 p-4 rounded-full mb-4">{service.icon}</div>
                <h3 className="font-semibold mb-2">{service.title}</h3>
                <p className="text-sm text-gray-600">{service.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Fare Chart */}
        <div className="mb-12">
            <h2 className="text-3xl font-bold text-center mb-8">Airport Transfer Fares</h2>
            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="p-4 font-semibold">Vehicle Type</th>
                                    <th className="p-4 font-semibold">Day Fare (6am-10pm)</th>
                                    <th className="p-4 font-semibold">Night Fare (10pm-6am)</th>
                                    <th className="p-4 font-semibold">Capacity</th>
                                    <th className="p-4 font-semibold">Luggage</th>
                                </tr>
                            </thead>
                            <tbody>
                                {fareChart.map((fare, index) => (
                                    <tr key={index} className="border-b last:border-0">
                                        <td className="p-4 font-medium">{fare.type}</td>
                                        <td className="p-4">{fare.dayFare}</td>
                                        <td className="p-4">{fare.nightFare}</td>
                                        <td className="p-4">{fare.capacity}</td>
                                        <td className="p-4">{fare.luggage}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
            <p className="text-center text-sm text-gray-500 mt-4">
                *Fares are for one-way transfer within city limits (up to 25km). Tolls & parking extra.
            </p>
        </div>


        {/* Features */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-center mb-8">Why Choose Our Airport Service?</h2>
          <Card className="bg-white">
            <CardContent className="p-8">
              <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Airport Info & CTA */}
        <div className="grid md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plane className="h-6 w-6 text-orange-600" />
                  Visakhapatnam Airport Info
                </CardTitle>
              </CardHeader>
              <CardContent>
                  <h4 className="font-semibold mb-3">Pickup Instructions:</h4>
                  <ul className="space-y-2 text-sm list-disc list-inside">
                      <li>Proceed to the designated taxi pickup area after baggage claim.</li>
                      <li>Your driver will be waiting with a placard bearing your name.</li>
                      <li>Contact your assigned driver upon arrival for coordination.</li>
                      <li>Enjoy complimentary waiting time of up to 45 mins for flight delays.</li>
                  </ul>
              </CardContent>
            </Card>
            <Card className="bg-orange-500 text-white text-center flex flex-col justify-center">
              <CardContent className="py-8">
                <h2 className="text-2xl font-bold mb-2">Need an Airport Transfer?</h2>
                <p className="mb-6">Book now for a comfortable and reliable journey.</p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link to="/cabs/airport">
                    <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                      <Car className="mr-2 h-5 w-5" />
                      Book Airport Taxi
                    </Button>
                  </Link>
                  <a href="tel:+919440440440">
                      <Button variant="outline" size="lg" className="w-full sm:w-auto bg-transparent border-white text-white hover:bg-white hover:text-orange-600">
                        <Phone className="mr-2 h-5 w-5" />
                        Call to Book
                      </Button>
                  </a>
                </div>
              </CardContent>
            </Card>
        </div>
      </div>

      <MobileNavigation />
    </div>
  );
};

export default AirportTaxiPage;
