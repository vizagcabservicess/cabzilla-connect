
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Car, Clock, MapPin, Users, Star, Shield } from 'lucide-react';

export function ServicesShowcase() {
  const services = [
    {
      icon: Clock,
      title: "Local Trips",
      description: "Hourly packages for city travel",
      features: ["8hrs/80km from ₹2,400", "10hrs/100km from ₹3,000", "Professional drivers"],
      color: "bg-blue-50 text-blue-600"
    },
    {
      icon: MapPin,
      title: "Outstation Travel",
      description: "Comfortable long-distance trips",
      features: ["Hyderabad - 620km", "Chennai - 780km", "Bangalore - 860km"],
      color: "bg-green-50 text-green-600"
    },
    {
      icon: Car,
      title: "Airport Transfers",
      description: "Reliable airport connectivity",
      features: ["On-time guarantee", "Flight tracking", "Fixed rates"],
      color: "bg-purple-50 text-purple-600"
    },
    {
      icon: Users,
      title: "Car Pooling",
      description: "Share rides, save money",
      features: ["Eco-friendly travel", "Meet new people", "Affordable rates"],
      color: "bg-orange-50 text-orange-600"
    }
  ];

  const features = [
    { icon: Clock, title: "24/7 Service", description: "Round-the-clock availability" },
    { icon: Shield, title: "Professional Drivers", description: "Verified & experienced" },
    { icon: MapPin, title: "GPS Tracking", description: "Real-time location sharing" },
    { icon: Star, title: "Transparent Pricing", description: "No hidden charges" },
    { icon: Car, title: "Fleet Variety", description: "Economy to luxury options" },
    { icon: Users, title: "Customer Support", description: "24/7 assistance available" }
  ];

  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        {/* Services Grid */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Services</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            From local city trips to outstation travel, we provide reliable and comfortable transportation solutions for all your needs.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {services.map((service, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow duration-300">
              <CardContent className="p-6">
                <div className={`w-12 h-12 rounded-lg ${service.color} flex items-center justify-center mb-4`}>
                  <service.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{service.title}</h3>
                <p className="text-gray-600 text-sm mb-3">{service.description}</p>
                <ul className="space-y-1">
                  {service.features.map((feature, idx) => (
                    <li key={idx} className="text-xs text-gray-500">• {feature}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Features Grid */}
        <div className="text-center mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Why Choose Vizag Taxi Hub?</h3>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {features.map((feature, index) => (
            <div key={index} className="text-center p-4">
              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mx-auto mb-3">
                <feature.icon className="h-5 w-5" />
              </div>
              <h4 className="font-medium text-gray-900 text-sm mb-1">{feature.title}</h4>
              <p className="text-xs text-gray-500">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
