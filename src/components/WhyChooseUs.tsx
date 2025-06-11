import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Star, Shield, MapPin, Clock, Users, Award, Headphones, CreditCard } from 'lucide-react';

export function WhyChooseUs() {
  const stats = [
    { number: "5+", label: "Years Experience", icon: Award, color: "from-blue-500 to-blue-600" },
    { number: "10,000+", label: "Happy Customers", icon: Users, color: "from-green-500 to-green-600" },
    { number: "50+", label: "Professional Drivers", icon: Shield, color: "from-purple-500 to-purple-600" },
    { number: "24/7", label: "Customer Support", icon: Headphones, color: "from-orange-500 to-orange-600" }
  ];

  const reasons = [
    {
      title: "Local Expertise",
      description: "5+ years of dedicated service in Visakhapatnam with deep knowledge of local routes and hidden gems.",
      icon: MapPin,
      color: "bg-blue-50",
      iconColor: "text-blue-600"
    },
    {
      title: "Safety First",
      description: "All drivers are thoroughly verified with clean driving records. Regular vehicle maintenance ensures your safety.",
      icon: Shield,
      color: "bg-green-50",
      iconColor: "text-green-600"
    },
    {
      title: "Transparent Pricing",
      description: "Clear, upfront pricing with no hidden charges. What you see is what you pay - always.",
      icon: CreditCard,
      color: "bg-purple-50",
      iconColor: "text-purple-600"
    },
    {
      title: "24/7 Availability",
      description: "Round-the-clock service for all your transportation needs. We're here whenever you need us.",
      icon: Clock,
      color: "bg-orange-50",
      iconColor: "text-orange-600"
    }
  ];

  return (
    <section className="px-4 py-4 pb-2 md:py-12 bg-gray-50">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-4 md:mb-10">
          <div className="inline-flex items-center gap-2 bg-yellow-50 px-4 py-2 rounded-full mb-4">
            <Star className="h-4 w-4 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-600">WHY CHOOSE US</span>
          </div>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-medium text-gray-900 mb-3 leading-tight">
            Your Trusted Travel Partner
          </h2>
          <p className="text-gray-600 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
            With years of experience serving Visakhapatnam, we've built our reputation on reliability, safety, and customer satisfaction.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-4 md:mb-12">
          {stats.map((stat, index) => (
            <div key={index} className="text-center bg-white rounded-2xl p-4 md:p-6 hover:shadow-lg transition-shadow duration-300">
              <div className={`w-12 h-12 md:w-16 md:h-16 bg-gradient-to-r ${stat.color} rounded-2xl flex items-center justify-center mx-auto mb-3`}>
                <stat.icon className="h-6 w-6 md:h-8 md:w-8 text-white" />
              </div>
              <div className="text-xl md:text-3xl font-medium text-gray-900 mb-1">{stat.number}</div>
              <div className="text-xs md:text-sm text-gray-600 font-medium">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Reasons Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {reasons.map((reason, index) => (
            <Card key={index} className="border-0 shadow-sm hover:shadow-xl transition-all duration-300 bg-white rounded-2xl overflow-hidden group">
              <CardContent className="p-5 md:p-6">
                <div className="flex items-start space-x-4">
                  <div className={`w-12 h-12 md:w-14 md:h-14 ${reason.color} rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                    <reason.icon className={`h-6 w-6 md:h-7 md:w-7 ${reason.iconColor}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg md:text-xl font-medium text-gray-900 mb-2">{reason.title}</h3>
                    <p className="text-gray-600 text-sm md:text-base leading-relaxed">{reason.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-3xl p-6 md:p-8 mt-8 md:mt-12 text-center">
          <div className="max-w-2xl mx-auto">
            <h3 className="text-xl md:text-2xl font-medium mb-2">Ready to Experience the Difference?</h3>
            <p className="mb-4 opacity-90 text-sm md:text-base">Join thousands of satisfied customers who trust Vizag Taxi Hub for their transportation needs.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">Available Now</span>
              </div>
              <div className="text-sm opacity-75">
                Call us at <span className="font-semibold">+91 9966363662</span> or book online!
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
