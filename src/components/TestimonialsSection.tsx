
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Star } from 'lucide-react';

export function TestimonialsSection() {
  const testimonials = [
    {
      name: "Rajesh Kumar",
      location: "Vizag",
      rating: 5,
      comment: "Excellent service! The driver was punctual and the car was clean. Used for airport transfer and it was hassle-free.",
      service: "Airport Transfer"
    },
    {
      name: "Priya Sharma",
      location: "Hyderabad",
      rating: 5,
      comment: "Booked for outstation trip to Hyderabad. Professional driver, comfortable journey, and reasonable pricing. Highly recommended!",
      service: "Outstation Travel"
    },
    {
      name: "Venkat Reddy",
      location: "Vizag",
      rating: 5,
      comment: "Regular customer for local trips. Always reliable, clean vehicles, and courteous drivers. Best taxi service in Vizag!",
      service: "Local Trips"
    },
    {
      name: "Anjali Patel",
      location: "Mumbai",
      rating: 5,
      comment: "Visited Vizag for business. The 8-hour package was perfect for my city meetings. Will definitely use again!",
      service: "Hourly Package"
    }
  ];

  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">What Our Customers Say</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Don't just take our word for it. Here's what our satisfied customers have to say about their experience with Vizag Taxi Hub.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow duration-300">
              <CardContent className="p-6">
                <div className="flex items-center mb-3">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-600 text-sm mb-4 leading-relaxed">"{testimonial.comment}"</p>
                <div className="border-t pt-4">
                  <div className="font-semibold text-gray-900 text-sm">{testimonial.name}</div>
                  <div className="text-xs text-gray-500">{testimonial.location}</div>
                  <div className="text-xs text-blue-600 font-medium mt-1">{testimonial.service}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Call to Action */}
        <div className="text-center mt-12">
          <div className="bg-blue-600 text-white rounded-lg p-8 max-w-2xl mx-auto">
            <h3 className="text-xl font-bold mb-2">Ready to Experience the Best?</h3>
            <p className="mb-4 opacity-90">Join thousands of satisfied customers who trust Vizag Taxi Hub for their transportation needs.</p>
            <div className="text-sm opacity-75">
              Call us at <span className="font-semibold">+91 9966363662</span> or book online now!
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
