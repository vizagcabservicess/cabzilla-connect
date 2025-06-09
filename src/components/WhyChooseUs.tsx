
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Star, Shield, MapPin, Clock } from 'lucide-react';

export function WhyChooseUs() {
  const stats = [
    { number: "5+", label: "Years Experience", icon: Star },
    { number: "10,000+", label: "Happy Customers", icon: Users },
    { number: "50+", label: "Professional Drivers", icon: Shield },
    { number: "24/7", label: "Customer Support", icon: Clock }
  ];

  const reasons = [
    {
      title: "Local Expertise",
      description: "5+ years of dedicated service in Visakhapatnam with deep knowledge of local routes and destinations.",
      icon: MapPin
    },
    {
      title: "Safety First",
      description: "All drivers are thoroughly verified with clean driving records. Regular vehicle maintenance ensures your safety.",
      icon: Shield
    },
    {
      title: "Transparent Pricing",
      description: "Clear, upfront pricing with no hidden charges. What you see is what you pay - always.",
      icon: Star
    },
    {
      title: "24/7 Availability",
      description: "Round-the-clock service for all your transportation needs. We're here whenever you need us.",
      icon: Clock
    }
  ];

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Vizag Taxi Hub?</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            With years of experience serving Visakhapatnam, we've built our reputation on reliability, safety, and customer satisfaction.
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <stat.icon className="h-8 w-8" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{stat.number}</div>
              <div className="text-sm text-gray-600">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Reasons Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {reasons.map((reason, index) => (
            <Card key={index} className="border-0 shadow-sm hover:shadow-md transition-shadow duration-300">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <reason.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{reason.title}</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">{reason.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
