import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Car, Clock, MapPin, Users, Star, Shield, Smartphone, CreditCard } from 'lucide-react';

export function ServicesShowcase() {
  const services = [
    {
      icon: Clock,
      title: "Local Trips",
      description: "Hourly packages perfect for city exploration",
      features: ["8hrs/80km - ₹2,400", "10hrs/100km - ₹3,000", "Professional drivers"],
      bgColor: "bg-blue-100",
      iconColor: "text-blue-600"
    },
    {
      icon: MapPin,
      title: "Outstation Travel",
      description: "Comfortable long-distance journeys",
      features: ["Hyderabad - 620km", "Chennai - 780km", "Bangalore - 860km"],
      bgColor: "bg-green-100",
      iconColor: "text-green-600"
    },
    {
      icon: Car,
      title: "Airport Transfers",
      description: "Reliable airport connectivity",
      features: ["On-time guarantee", "Flight tracking", "Fixed rates"],
      bgColor: "bg-purple-100",
      iconColor: "text-purple-600"
    },
    {
      icon: Users,
      title: "Car Pooling",
      description: "Share rides, save money",
      features: ["Eco-friendly travel", "Meet new people", "Affordable rates"],
      bgColor: "bg-orange-100",
      iconColor: "text-orange-600"
    }
  ];

  const features = [
    { icon: Clock, title: "24/7 Service", description: "Round-the-clock availability" },
    { icon: Shield, title: "Professional Drivers", description: "Verified & experienced" },
    { icon: Smartphone, title: "GPS Tracking", description: "Real-time location sharing" },
    { icon: Star, title: "Transparent Pricing", description: "No hidden charges" },
    { icon: Car, title: "Fleet Variety", description: "Economy to luxury options" },
    { icon: CreditCard, title: "Easy Payments", description: "Multiple payment options" }
  ];

  return (
    <section className="px-4 py-2 md:py-4 bg-white">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-2 md:mb-4">
          <div className="inline-flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-full mb-4">
            <Car className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-600">OUR SERVICES</span>
          </div>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-1 leading-tight">
            Your Journey, Our Priority
          </h2>
          <p className="text-gray-600 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
            From local city trips to outstation travel, we provide reliable and comfortable transportation solutions for all your needs.
          </p>
        </div>
        
        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8 md:mb-12">
          {services.map((service, index) => (
            <Card key={index} className="group hover:shadow-xl transition-all duration-300 border-0 bg-white rounded-2xl overflow-hidden">
              <CardContent className="p-5 md:p-6 text-center">
                <div className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 ${service.bgColor}`}>
                  <service.icon className={`h-7 w-7 md:h-8 md:w-8 ${service.iconColor}`} />
                </div>
                <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">{service.title}</h3>
                <p className="text-gray-600 text-sm md:text-base mb-4 leading-relaxed">{service.description}</p>
                <div className="space-y-1">
                  {service.features.map((feature, idx) => (
                    <div key={idx} className="text-xs md:text-sm text-gray-500 flex items-center justify-center gap-1">
                      <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                      {feature}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Why Choose Us Features */}
        <div className="bg-gray-50 rounded-3xl p-6 md:p-8">
          <div className="text-center mb-6 md:mb-8">
            <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">Why Choose Vizag Taxi Hub?</h3>
            <p className="text-gray-600 text-sm md:text-base">Experience the difference with our premium features</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
            {features.map((feature, index) => (
              <div key={index} className="text-center group">
                <div className="w-12 h-12 md:w-14 md:h-14 bg-white rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:shadow-lg transition-shadow duration-300">
                  <feature.icon className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
                </div>
                <h4 className="font-semibold text-gray-900 text-sm md:text-base mb-1">{feature.title}</h4>
                <p className="text-xs md:text-sm text-gray-500 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
