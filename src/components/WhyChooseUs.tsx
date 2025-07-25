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
    <section className="px-4 py-8 pb-2 md:py-16 bg-gradient-to-br from-gray-50 via-amber-50/20 to-orange-50/20 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10 left-10 w-80 h-80 bg-gradient-to-r from-yellow-400/5 to-orange-400/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-gradient-to-r from-orange-400/5 to-red-400/5 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-amber-400/3 to-yellow-400/3 rounded-full blur-3xl"></div>
      </div>
      
      <div className="container mx-auto max-w-6xl relative z-10">
        {/* Header */}
        <div className="text-center mb-8 md:mb-12">
          <div className="inline-flex items-center gap-3 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200/30 px-6 py-3 rounded-full mb-6 shadow-sm backdrop-blur-sm">
            <Star className="h-5 w-5 text-yellow-600 animate-pulse" />
            <span className="text-sm font-semibold text-yellow-700 tracking-wide">WHY CHOOSE US</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-4 leading-tight">
            Your Trusted Travel Partner
          </h2>
          <p className="text-gray-600 text-base md:text-lg max-w-3xl mx-auto leading-relaxed">
            With years of dedicated experience serving Visakhapatnam, we've built our reputation on unwavering reliability, safety excellence, and exceptional customer satisfaction.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8 md:mb-16">
          {stats.map((stat, index) => (
            <div key={index} className="text-center bg-white/80 backdrop-blur-sm rounded-3xl p-6 md:p-8 hover:shadow-2xl hover:bg-white transition-all duration-500 transform hover:scale-105 group border border-white/50">
              <div className={`w-16 h-16 md:w-20 md:h-20 bg-gradient-to-r ${stat.color} rounded-3xl flex items-center justify-center mx-auto mb-4 group-hover:rotate-12 transition-transform duration-500 shadow-lg`}>
                <stat.icon className="h-8 w-8 md:h-10 md:w-10 text-white" />
              </div>
              <div className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-2">{stat.number}</div>
              <div className="text-sm md:text-base text-gray-600 font-semibold">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Reasons Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {reasons.map((reason, index) => (
            <Card key={index} className="border-0 shadow-lg hover:shadow-2xl transition-all duration-500 bg-white/90 backdrop-blur-sm rounded-3xl overflow-hidden group transform hover:scale-105 border border-white/50">
              <CardContent className="p-6 md:p-8">
                <div className="flex items-start space-x-6">
                  <div className={`w-16 h-16 md:w-18 md:h-18 ${reason.color} rounded-3xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:rotate-12 transition-all duration-500 shadow-lg`}>
                    <reason.icon className={`h-8 w-8 md:h-9 md:w-9 ${reason.iconColor}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-3 group-hover:text-blue-700 transition-colors">{reason.title}</h3>
                    <p className="text-gray-600 text-base md:text-lg leading-relaxed">{reason.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 text-white rounded-3xl p-8 md:p-12 mt-12 md:mt-16 text-center relative overflow-hidden shadow-2xl">
          {/* Background decorations */}
          <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full -translate-x-16 -translate-y-16"></div>
          <div className="absolute bottom-0 right-0 w-40 h-40 bg-white/10 rounded-full translate-x-20 translate-y-20"></div>
          
          <div className="max-w-3xl mx-auto relative z-10">
            <h3 className="text-2xl md:text-3xl font-bold mb-4">Ready to Experience the Difference?</h3>
            <p className="mb-8 opacity-90 text-base md:text-lg leading-relaxed">Join thousands of satisfied customers who trust Vizag Taxi Hub for their premium transportation experience.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <div className="flex items-center gap-3 bg-white/20 px-6 py-3 rounded-full backdrop-blur-sm border border-white/30">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse shadow-lg"></div>
                <span className="text-base font-semibold">Available 24/7</span>
              </div>
              <div className="text-base">
                Call us at <span className="font-bold text-yellow-300">+91 9966363662</span> or book online instantly!
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
