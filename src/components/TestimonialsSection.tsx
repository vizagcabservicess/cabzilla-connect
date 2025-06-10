import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Star, Quote, User } from 'lucide-react';

export function TestimonialsSection() {
  const testimonials = [
    {
      name: "Rajesh Kumar",
      location: "Vizag Local",
      rating: 5,
      comment: "Excellent service! The driver was punctual and the car was spotless. Used for airport transfer and it was completely hassle-free. Highly recommended!",
      service: "Airport Transfer",
      avatar: "RK",
      color: "from-blue-500 to-blue-600"
    },
    {
      name: "Priya Sharma",
      location: "Business Traveler",
      rating: 5,
      comment: "Booked for outstation trip to Hyderabad. Professional driver, comfortable journey, and transparent pricing. Will definitely use again!",
      service: "Outstation Travel",
      avatar: "PS",
      color: "from-green-500 to-green-600"
    },
    {
      name: "Venkat Reddy",
      location: "Regular Customer",
      rating: 5,
      comment: "Regular customer for local trips. Always reliable, clean vehicles, and courteous drivers. Best taxi service in Vizag without a doubt!",
      service: "Local Trips",
      avatar: "VR",
      color: "from-purple-500 to-purple-600"
    },
    {
      name: "Anjali Patel",
      location: "Tourist",
      rating: 5,
      comment: "Visited Vizag for vacation. The 8-hour package was perfect for sightseeing. Driver was knowledgeable about local attractions. Fantastic experience!",
      service: "Hourly Package",
      avatar: "AP",
      color: "from-orange-500 to-orange-600"
    }
  ];

  return (
    <section className="px-4 py-6 md:py-12 bg-gray-50">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-6 md:mb-10">
          <div className="inline-flex items-center gap-2 bg-yellow-50 px-4 py-2 rounded-full mb-4">
            <Star className="h-4 w-4 text-yellow-600 fill-current" />
            <span className="text-sm font-medium text-yellow-600">TESTIMONIALS</span>
          </div>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-medium text-gray-900 mb-3 leading-tight">
            What Our Customers Say
          </h2>
          <p className="text-gray-600 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
            Don't just take our word for it. Here's what our satisfied customers have to say about their experience with Vizag Taxi Hub.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="group hover:shadow-2xl transition-all duration-300 border-0 bg-white rounded-3xl overflow-hidden">
              <CardContent className="p-5 md:p-6 relative">
                {/* Quote Icon */}
                <div className="absolute top-4 right-4 opacity-10">
                  <Quote className="h-8 w-8 text-gray-400" />
                </div>
                
                {/* Rating */}
                <div className="flex items-center mb-3">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                
                {/* Comment */}
                <p className="text-gray-600 text-sm leading-relaxed mb-4 relative z-10">
                  "{testimonial.comment}"
                </p>
                
                {/* Customer Info */}
                <div className="border-t border-gray-100 pt-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${testimonial.color} flex items-center justify-center text-white font-bold text-sm`}>
                      {testimonial.avatar}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 text-sm">{testimonial.name}</div>
                      <div className="text-xs text-gray-500">{testimonial.location}</div>
                    </div>
                  </div>
                  <div className="bg-blue-50 px-3 py-1 rounded-full inline-block">
                    <span className="text-xs text-blue-600 font-medium">{testimonial.service}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-3xl p-6 md:p-8 mt-8 md:mt-12 text-center">
          <div className="max-w-2xl mx-auto">
            <h3 className="text-xl md:text-2xl font-medium mb-2">Ready to Join Our Happy Customers?</h3>
            <p className="mb-4 opacity-90 text-sm md:text-base">Experience the best taxi service in Visakhapatnam. Book now and see why thousands choose us!</p>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-medium">4.8★</div>
                <div className="text-sm opacity-80">Average Rating</div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-medium">10K+</div>
                <div className="text-sm opacity-80">Happy Customers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-medium">24/7</div>
                <div className="text-sm opacity-80">Support</div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <div className="bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
                <span className="text-sm font-medium">📞 +91 9966363662</span>
              </div>
              <span className="text-sm opacity-75">Call now or book online!</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
