
import React from 'react';
import { Navbar } from '@/components/Navbar';
import { MobileNavigation } from '@/components/MobileNavigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plane, Clock, Shield, Phone, Car, CheckCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const AirportTaxiPage = () => {
  const services = [
    {
      icon: <Plane />,
      title: 'Airport Pickup',
      description: 'On-time pickups from the airport to your destination.'
    },
    {
      icon: <Car />,
      title: 'Airport Drop',
      description: 'Timely drops from anywhere in the city to the airport.'
    },
    {
      icon: <Clock />,
      title: '24/7 Service',
      description: 'Available round the clock for your airport transfers.'
    },
    {
      icon: <Shield />,
      title: 'Safe & Secure',
      description: 'Licensed drivers and verified backgrounds for your safety.'
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
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main>
        {/* Hero Section */}
        <section className="relative bg-gray-800">
            <img 
              src="https://images.unsplash.com/photo-1569154941061-e23b71b3623a?w=1600&h=600&fit=crop" 
              alt="Airport Terminal" 
              className="absolute inset-0 w-full h-full object-cover z-0 opacity-30"
            />
            <div className="relative container mx-auto px-4 py-24 text-center z-10">
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                    Visakhapatnam Airport Taxi
                </h1>
                <p className="text-xl text-gray-200 max-w-3xl mx-auto mb-8">
                    Reliable transfers to and from Visakhapatnam Airport. Book your ride for hassle-free travel.
                </p>
                <Link to="/cabs/airport">
                    <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white">
                        Book Airport Ride <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                </Link>
            </div>
        </section>
      
        <div className="container mx-auto px-4 py-12 pb-24">
          {/* Services Section */}
          <section className="py-12">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {services.map((service, index) => (
                <div key={index} className="text-center flex flex-col items-center">
                  <div className="flex items-center justify-center h-16 w-16 rounded-full bg-orange-100 mb-4">
                    {React.cloneElement(service.icon, { className: "h-8 w-8 text-orange-600" })}
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{service.title}</h3>
                  <p className="text-gray-600">{service.description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Fare Chart Section */}
          <section className="py-12 bg-white rounded-2xl px-6">
              <div className="text-center mb-10">
                <h2 className="text-3xl font-bold text-gray-900">Airport Transfer Fares</h2>
                <p className="text-gray-600 mt-2">Transparent pricing for airport transfers.</p>
              </div>
              <Card className="border-0 shadow-none">
                  <div className="overflow-x-auto">
                      <table className="w-full text-left">
                          <thead className="bg-gray-100">
                              <tr>
                                  <th className="p-4 font-semibold text-sm">Vehicle Type</th>
                                  <th className="p-4 font-semibold text-sm">Day Fare (6am-10pm)</th>
                                  <th className="p-4 font-semibold text-sm">Night Fare (10pm-6am)</th>
                                  <th className="p-4 font-semibold text-sm">Capacity</th>
                                  <th className="p-4 font-semibold text-sm">Luggage</th>
                              </tr>
                          </thead>
                          <tbody>
                              {fareChart.map((fare, index) => (
                                  <tr key={index} className="border-b last:border-0 hover:bg-gray-50">
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
              </Card>
              <p className="text-center text-xs text-gray-500 mt-4">
                  *Fares are for one-way transfer within city limits (up to 25km). Tolls & parking extra.
              </p>
          </section>


          {/* Features & CTA Section */}
          <section className="py-16">
            <div className="grid lg:grid-cols-2 gap-8 items-center">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-6">Why Choose Our Airport Service?</h2>
                  <div className="space-y-4">
                    {features.map((feature, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <CheckCircle className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <Card className="bg-orange-500 text-white text-center flex flex-col justify-center rounded-2xl">
                  <CardContent className="p-10">
                    <h2 className="text-3xl font-bold mb-3">Need an Airport Transfer?</h2>
                    <p className="mb-6">Book now for a comfortable and reliable journey.</p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <Button asChild variant="secondary" size="lg" className="w-full sm:w-auto">
                        <Link to="/cabs/airport">
                          <Car className="mr-2 h-5 w-5" />
                          Book Airport Taxi
                        </Link>
                      </Button>
                      <Button asChild variant="outline" size="lg" className="w-full sm:w-auto bg-transparent border-white text-white hover:bg-white hover:text-orange-600">
                        <a href="tel:+919440440440">
                          <Phone className="mr-2 h-5 w-5" />
                          Call to Book
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
            </div>
          </section>
        </div>
      </main>

      <MobileNavigation />
    </div>
  );
};

export default AirportTaxiPage;
