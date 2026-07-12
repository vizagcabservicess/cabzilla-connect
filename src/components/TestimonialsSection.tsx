import React, { useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import { Card, CardContent } from '@/components/ui/card';
import { Star, Quote } from 'lucide-react';
import { SectionHeader } from '@/components/home/SectionHeader';

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
      color: "from-blue-500 to-blue-600"
    },
    {
      name: "munta sanju",
      location: "Google Review",
      rating: 5,
      comment: `Great experience with Verma car ride. The driver was professional, polite, and drove safely. The car was clean and comfortable. Highly recommend for a stress-free journey!`,
      avatar: "M",
      color: "from-slate-400 to-slate-500"
    },
    {
      name: "Ayyalasomayajula phani babu",
      location: "Google Review",
      rating: 5,
      comment: `Tempo Traveller was fully conditioned. Staff Nagesh drove very nicely and politely. We are very happy with the trip. Thanks to Vizag Taxi Hub!`,
      avatar: "A",
      color: "from-blue-400 to-blue-500"
    },
    {
      name: "Karri Reddy",
      location: "Google Review",
      rating: 5,
      comment: `Second time using Vizag Taxi Hub. Customer care is excellent. Outstanding service and highly recommended to all future customers!`,
      avatar: "K",
      color: "from-slate-500 to-slate-600"
    },
    {
      name: "Ravi Kumar",
      location: "Google Review",
      rating: 5,
      comment: `Amazing experience with Vizag Taxi Hub! The driver was punctual, professional, and the vehicle was spotless. Will definitely use their services again.`,
      avatar: "R",
      color: "from-blue-500 to-blue-600"
    },
    {
      name: "Priya Sharma",
      location: "Google Review",
      rating: 5,
      comment: `Excellent service for our family trip. The driver was very patient with our kids and made sure we were comfortable throughout the journey. Highly recommended!`,
      avatar: "P",
      color: "from-slate-400 to-slate-500"
    }
  ];

  // Calculate the 4-card window behavior
  const ITEMS_PER_VIEW = 4;
  const totalItems = testimonials.length;
  
  // Calculate if we should show navigation arrows
  const shouldShowNavigation = totalItems > ITEMS_PER_VIEW;
  
  // Calculate the current window start index
  const currentWindowStart = currentSlide;
  const currentWindowEnd = Math.min(currentWindowStart + ITEMS_PER_VIEW - 1, totalItems - 1);
  
  // Check if we're at the beginning or end
  const isAtBeginning = currentWindowStart === 0;
  const isAtEnd = currentWindowEnd === totalItems - 1;
  
  // Get the current 4-card window
  const currentWindowItems = testimonials.slice(currentWindowStart, currentWindowStart + ITEMS_PER_VIEW);

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

  const handleNext = () => {
    if (!isAtEnd) {
      // Calculate the next window start
      const nextStart = Math.min(currentWindowStart + 1, totalItems - ITEMS_PER_VIEW);
      setCurrentSlide(nextStart);
    }
  };

  const handlePrev = () => {
    if (!isAtBeginning) {
      // Move back by 1
      const prevStart = Math.max(currentWindowStart - 1, 0);
      setCurrentSlide(prevStart);
    }
  };

  return (
    <section className="home-section-band--soft px-4">
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          eyebrow="TESTIMONIALS"
          title="What Our Customers Say"
          subtitle="Don't just take our word for it. Here's what our satisfied customers have to say about their experience with Vizag Taxi Hub."
        />

        {/* Desktop Layout - 4-card window with proper navigation */}
        <div className="hidden lg:block mb-4 relative overflow-hidden">
          <div className="flex gap-4 justify-center">
            {currentWindowItems.map((testimonial, index) => (
              <div key={index} className="w-full max-w-[calc(25%-12px)]">
                {renderTestimonialCard(testimonial, currentWindowStart + index)}
              </div>
            ))}
            {/* Fill remaining slots with invisible cards to maintain 4-card layout */}
            {currentWindowItems.length < ITEMS_PER_VIEW && 
              Array.from({ length: ITEMS_PER_VIEW - currentWindowItems.length }).map((_, index) => (
                <div key={`empty-${index}`} className="w-full max-w-[calc(25%-12px)] invisible">
                  <div className="min-h-[260px]"></div>
                </div>
              ))
            }
          </div>

          {/* Previous Arrow - only show if there are multiple slides and not at beginning */}
          {shouldShowNavigation && !isAtBeginning && (
            <button
              className="absolute -left-5 top-1/2 transform -translate-y-1/2 z-20 w-12 h-12 bg-gray-300 rounded-full shadow-xl flex items-center justify-center hover:bg-gray-400 transition-colors border-2 border-gray-400"
              onClick={handlePrev}
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
          )}

          {/* Next Arrow - only show if there are multiple slides and not at end */}
          {shouldShowNavigation && !isAtEnd && (
            <button
              className="absolute right-0 top-1/2 transform -translate-y-1/2 z-20 w-12 h-12 bg-gray-300 rounded-full shadow-xl flex items-center justify-center hover:bg-gray-400 transition-colors border-2 border-gray-400"
              onClick={handleNext}
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M9 5l7 7-7 7"/>
              </svg>
            </button>
          )}
        </div>

        {/* Tablet Layout - Grid */}
        <div className="hidden md:block lg:hidden mb-4">
          <div className="grid grid-cols-2 gap-4">
            {testimonials.slice(0, 4).map((testimonial, index) => renderTestimonialCard(testimonial, index))}
          </div>
        </div>

        {/* Mobile Slider */}
        <div className="md:hidden mb-4">
          <Swiper
            modules={[Pagination]}
            spaceBetween={12}
            slidesPerView={1.2}
            pagination={false}
            onSwiper={setSwiperInstance}
            onSlideChange={(swiper) => setCurrentSlide(swiper.activeIndex)}
            className="testimonials-swiper"
          >
            {testimonials.map((testimonial, index) => (
              <SwiperSlide key={index}>
                {renderTestimonialCard(testimonial, index)}
              </SwiperSlide>
            ))}
          </Swiper>
          
          {/* Custom Pagination with Dots and Counter */}
          <div className="flex justify-center items-center mt-4">
            <div className="flex items-center gap-1">
              {testimonials.map((_, index) => {
                // Show the counter pill in place of the active dot
                if (index === currentSlide) {
                  return (
                    <div 
                      key={index}
                      className="home-slider-dot-active text-white px-3 py-1 rounded-full text-sm font-medium"
                    >
                      {currentSlide + 1}/{testimonials.length}
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
        <div className="bg-white border border-slate-200/80 text-slate-900 rounded-3xl shadow-sm p-5 md:p-6 mt-4 md:mt-6 text-center">
          <div className="max-w-2xl mx-auto">
            <h3 className="text-xl md:text-2xl font-medium mb-2 text-slate-900">Ready to Join Our Happy Customers?</h3>
            <p className="mb-4 text-slate-500 text-sm md:text-base">Experience the best taxi service in Visakhapatnam. Book now and see why thousands choose us!</p>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-medium text-slate-900">4.9★</div>
                <div className="text-sm text-slate-500">Average Rating</div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-medium text-slate-900">10K+</div>
                <div className="text-sm text-slate-500">Happy Customers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-medium text-slate-900">24/7</div>
                <div className="text-sm text-slate-500">Support</div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <div className="bg-[#0066FF] hover:bg-[#0052CC] text-white px-4 py-2 rounded-full transition-colors">
                <span className="text-sm font-medium">📞 +91 9966363662</span>
              </div>
              <span className="text-sm text-slate-500">Call now or book online!</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
