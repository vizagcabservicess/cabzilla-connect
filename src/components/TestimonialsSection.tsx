import React, { useState, useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import { Card, CardContent } from '@/components/ui/card';
import { Star, Quote, User } from 'lucide-react';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

export function TestimonialsSection() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [swiperInstance, setSwiperInstance] = useState<any>(null);

  const testimonials = [
    {
      name: "Sai Supraj",
      location: "Google Review",
      rating: 5,
      comment: `We recently went for a one-week vacation to Vizag. Exceptional service by Vizag Taxi Hub. Our driver Nagaraj was fantastic—knowledgeable, friendly, and attentive. He showed us hidden gems and made our trip memorable. Highly recommended!`,
      avatar: "S",
      color: "from-purple-500 to-purple-600"
    },
    {
      name: "munta sanju",
      location: "Google Review",
      rating: 5,
      comment: `Great experience with Verma car ride. The driver was professional, polite, and drove safely. The car was clean and comfortable. Highly recommend for a stress-free journey!`,
      avatar: "M",
      color: "from-blue-500 to-blue-600"
    },
    {
      name: "Ayyalasomayajula phani babu",
      location: "Google Review",
      rating: 5,
      comment: `Tempo Traveller was fully conditioned. Staff Nagesh drove very nicely and politely. We are very happy with the trip. Thanks to Vizag Taxi Hub!`,
      avatar: "A",
      color: "from-orange-500 to-orange-600"
    },
    {
      name: "Karri Reddy",
      location: "Google Review",
      rating: 5,
      comment: `Second time using Vizag Taxi Hub. Customer care is excellent. Outstanding service and highly recommended to all future customers!`,
      avatar: "K",
      color: "from-green-500 to-green-600"
    },
    {
      name: "Ravi Kumar",
      location: "Google Review",
      rating: 5,
      comment: `Amazing experience with Vizag Taxi Hub! The driver was punctual, professional, and the vehicle was spotless. Will definitely use their services again.`,
      avatar: "R",
      color: "from-indigo-500 to-indigo-600"
    },
    {
      name: "Priya Sharma",
      location: "Google Review",
      rating: 5,
      comment: `Excellent service for our family trip. The driver was very patient with our kids and made sure we were comfortable throughout the journey. Highly recommended!`,
      avatar: "P",
      color: "from-pink-500 to-pink-600"
    }
  ];

  const gridTestimonials = testimonials.slice(0, 4);
  const sliderTestimonials = testimonials.slice(4);

  const renderTestimonialCard = (testimonial: any, index: number) => {
    return (
      <Card key={index} className="group hover:shadow-2xl transition-all duration-300 border-0 bg-white rounded-3xl overflow-hidden min-h-[260px] flex flex-col justify-between">
        <CardContent className="p-5 md:p-6 relative flex flex-col h-full">
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
          <p className="text-gray-600 text-sm leading-relaxed mb-4 relative z-10 line-clamp-4">
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
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <section className="px-4 py-4 pb-2 md:py-12 bg-white">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-4 md:mb-8">
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

        {/* Desktop Layout - Sliding Row */}
        <div className="hidden lg:block mb-8 relative overflow-hidden">
          <div className="flex gap-4 transition-transform duration-500 ease-in-out" style={{ 
            transform: `translateX(-${Math.min(currentSlide * 50, Math.max(0, (gridTestimonials.length + sliderTestimonials.length - 4) * 50))}%)` 
          }}>
            {/* All testimonials in a single row */}
            {[...gridTestimonials, ...sliderTestimonials].map((testimonial, index) => (
              <div key={index} className="w-full max-w-[calc(25%-12px)] flex-shrink-0">
                {renderTestimonialCard(testimonial, index)}
              </div>
            ))}
          </div>

          {/* Previous Arrow - show when not at first slide */}
          {currentSlide > 0 && (
            <button
              className="absolute -left-5 top-1/2 transform -translate-y-1/2 z-20 w-12 h-12 bg-gray-300 rounded-full shadow-xl flex items-center justify-center hover:bg-gray-400 transition-colors border-2 border-gray-400"
              onClick={() => {
                if (currentSlide > 0) {
                  setCurrentSlide(currentSlide - 1);
                }
              }}
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
          )}

          {/* Next Arrow - only show if there are additional testimonials and we're not at the end */}
          {sliderTestimonials.length > 0 && currentSlide < Math.max(0, (gridTestimonials.length + sliderTestimonials.length - 4)) && (
            <button
              className="absolute right-0 top-1/2 transform -translate-y-1/2 z-20 w-12 h-12 bg-gray-300 rounded-full shadow-xl flex items-center justify-center hover:bg-gray-400 transition-colors border-2 border-gray-400"
              onClick={() => {
                const maxSlides = Math.max(0, gridTestimonials.length + sliderTestimonials.length - 4);
                if (currentSlide < maxSlides) {
                  setCurrentSlide(currentSlide + 1);
                }
              }}
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M9 5l7 7-7 7"/>
              </svg>
            </button>
          )}
        </div>

        {/* Tablet Layout - Grid */}
        <div className="hidden md:block lg:hidden mb-8">
          <div className="grid grid-cols-2 gap-4">
            {gridTestimonials.map((testimonial, index) => renderTestimonialCard(testimonial, index))}
          </div>
        </div>

        {/* Mobile Slider */}
        <div className="md:hidden mb-8">
          <Swiper
            modules={[Pagination]}
            spaceBetween={12}
            slidesPerView={1.2}
            pagination={false}
            onSwiper={setSwiperInstance}
            onSlideChange={(swiper) => setCurrentSlide(swiper.activeIndex)}
            className="testimonials-swiper"
          >
            {gridTestimonials.map((testimonial, index) => (
              <SwiperSlide key={index}>
                {renderTestimonialCard(testimonial, index)}
              </SwiperSlide>
            ))}
          </Swiper>
          
          {/* Custom Pagination with Dots and Counter */}
          <div className="flex justify-center items-center mt-4">
            <div className="flex items-center gap-1">
              {gridTestimonials.map((_, index) => {
                // Show the counter pill in place of the active dot
                if (index === currentSlide) {
                  return (
                    <div 
                      key={index}
                      className="bg-yellow-500 text-white px-3 py-1 rounded-full text-sm font-medium"
                    >
                      {currentSlide + 1}/{gridTestimonials.length}
                    </div>
                  );
                }
                
                // Show regular dots for inactive slides
                return (
                  <button
                    key={index}
                    onClick={() => swiperInstance?.slideTo(index)}
                    className="w-2 h-2 bg-gray-300 opacity-60 rounded-full transition-all duration-200 hover:opacity-80"
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-3xl p-6 md:p-8 mt-8 md:mt-12 text-center">
          <div className="max-w-2xl mx-auto">
            <h3 className="text-xl md:text-2xl font-medium mb-2">Ready to Join Our Happy Customers?</h3>
            <p className="mb-4 opacity-90 text-sm md:text-base">Experience the best taxi service in Visakhapatnam. Book now and see why thousands choose us!</p>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-medium">4.9★</div>
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
