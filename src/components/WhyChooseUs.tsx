import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, MapPin, Clock, Users, Award, Headphones, CreditCard } from 'lucide-react';
import { SectionHeader } from '@/components/home/SectionHeader';

export function WhyChooseUs() {
  const stats = [
    { number: "5+", label: "Years Experience", icon: Award, color: "from-blue-500 to-blue-600" },
    { number: "10,000+", label: "Happy Customers", icon: Users, color: "from-slate-400 to-slate-500" },
    { number: "50+", label: "Professional Drivers", icon: Shield, color: "from-blue-400 to-blue-500" },
    { number: "24/7", label: "Customer Support", icon: Headphones, color: "from-slate-500 to-slate-600" }
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
      color: "bg-slate-50",
      iconColor: "text-slate-600"
    },
    {
      title: "Transparent Pricing",
      description: "Clear, upfront pricing with no hidden charges. What you see is what you pay - always.",
      icon: CreditCard,
      color: "bg-blue-50",
      iconColor: "text-blue-600"
    },
    {
      title: "24/7 Availability",
      description: "Round-the-clock service for all your transportation needs. We're here whenever you need us.",
      icon: Clock,
      color: "bg-slate-50",
      iconColor: "text-slate-600"
    }
  ];

  return (
    <section className="home-section-band--soft px-4">
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          eyebrow="WHY CHOOSE US"
          title="Your Trusted Travel Partner"
          subtitle="With years of experience serving Visakhapatnam, we've built our reputation on reliability, safety, and customer satisfaction."
        />

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-4 md:mb-6">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
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
        <div className="bg-white border border-slate-200/80 text-slate-900 rounded-3xl shadow-sm p-5 md:p-6 text-center mb-4 md:mb-6">
          <div className="max-w-2xl mx-auto">
            <h3 className="text-xl md:text-2xl font-medium mb-2 text-slate-900">Ready to Experience the Difference?</h3>
            <p className="mb-5 text-slate-500 text-sm md:text-base">Join thousands of satisfied customers who trust Vizag Taxi Hub for their transportation needs.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <a
                href="/outstation-taxi"
                className="inline-flex items-center justify-center rounded-full bg-[#0066FF] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0052CC]"
              >
                Book Online
              </a>
              <div className="text-sm text-slate-500">
                or call <span className="font-semibold text-slate-900">+91 9966363662</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
