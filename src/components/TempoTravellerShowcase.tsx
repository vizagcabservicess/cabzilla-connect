import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Bus, Users, Building, Heart, MapPin, Star, Car, Shield, Tag } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import { Link } from 'react-router-dom';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

export function TempoTravellerShowcase() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [swiperInstance, setSwiperInstance] = useState<any>(null);
  
  const tempoTravellerServices = [
    {
      icon: Bus,
      title: "Tempo Traveller Rental",
      offer: "Best tempo traveller rental service in Vizag",
      description: "Premium tempo traveller rental with professional drivers",
      features: ["12-18 seater options", "AC comfort", "Professional drivers"],
      bgColor: "bg-gradient-to-br from-blue-50 to-blue-100",
      iconColor: "text-blue-600",
      link: "/tempo-traveller-rental-vizag",
      promoCode: "TEMPO500"
    },
    {
      icon: Users,
      title: "17 Seater Tempo Traveller",
      offer: "Perfect for large group travel",
      description: "Spacious 17-seater tempo traveller for big groups",
      features: ["17 passenger capacity", "AC comfort", "Luggage space"],
      bgColor: "bg-gradient-to-br from-green-50 to-green-100",
      iconColor: "text-green-600",
      link: "/17-seater-tempo-traveller-vizag",
      promoCode: "SEVENTEEN500"
    },
    {
      icon: Users,
      title: "12 Seater Tempo Traveller",
      offer: "Ideal for medium group travel",
      description: "Comfortable 12-seater tempo traveller for groups",
      features: ["12 passenger capacity", "AC comfort", "Economical"],
      bgColor: "bg-gradient-to-br from-purple-50 to-purple-100",
      iconColor: "text-purple-600",
      link: "/12-seater-tempo-traveller-vizag",
      promoCode: "TWELVE400"
    },
    {
      icon: Users,
      title: "Group Travel",
      offer: "Specialized group travel solutions",
      description: "Tailored group travel packages for all occasions",
      features: ["Custom packages", "Group discounts", "Event planning"],
      bgColor: "bg-gradient-to-br from-orange-50 to-orange-100",
      iconColor: "text-orange-600",
      link: "/group-travel-tempo-traveller-vizag",
      promoCode: "GROUP600"
    },
    {
      icon: Building,
      title: "Corporate Transport",
      offer: "Business travel and corporate events",
      description: "Professional corporate transportation services",
      features: ["Business class comfort", "Professional drivers", "Corporate packages"],
      bgColor: "bg-gradient-to-br from-indigo-50 to-indigo-100",
      iconColor: "text-indigo-600",
      link: "/corporate-tempo-traveller-vizag",
      promoCode: "CORP500"
    },
    {
      icon: Heart,
      title: "Wedding Transport",
      offer: "Wedding party transportation",
      description: "Special wedding transportation services",
      features: ["Decorated vehicles", "Wedding packages", "Professional service"],
      bgColor: "bg-gradient-to-br from-pink-50 to-pink-100",
      iconColor: "text-pink-600",
      link: "/wedding-tempo-traveller-vizag",
      promoCode: "WEDDING600"
    },
    {
      icon: MapPin,
      title: "Pilgrimage Tours",
      offer: "Religious and pilgrimage tours",
      description: "Sacred journey transportation services",
      features: ["Pilgrimage packages", "Religious sites", "Comfortable travel"],
      bgColor: "bg-gradient-to-br from-yellow-50 to-yellow-100",
      iconColor: "text-yellow-600",
      link: "/pilgrimage-tempo-traveller-vizag",
      promoCode: "PILGRIM400"
    },
    {
      icon: Car,
      title: "Mini Bus Travels",
      offer: "Mini bus rental services",
      description: "Reliable mini bus rental for all occasions",
      features: ["Various capacities", "AC comfort", "Professional drivers"],
      bgColor: "bg-gradient-to-br from-teal-50 to-teal-100",
      iconColor: "text-teal-600",
      link: "/mini-bus-travels-vizag",
      promoCode: "MINIBUS400"
    }
  ];

  return (
    <>
      <style jsx>{`
        .glassmorphism-button {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.15) 100%);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.3);
          box-shadow: 
            0 4px 16px rgba(0, 0, 0, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.4),
            inset 0 -1px 0 rgba(255, 255, 255, 0.2);
          height: 36px;
          font-size: 14px;
          font-weight: 500;
        }
        .glassmorphism-button:hover {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.35) 0%, rgba(255, 255, 255, 0.25) 100%);
          box-shadow: 
            0 6px 20px rgba(0, 0, 0, 0.15),
            inset 0 1px 0 rgba(255, 255, 255, 0.5),
            inset 0 -1px 0 rgba(255, 255, 255, 0.3);
          transform: translateY(-1px);
        }
        .shimmer-effect {
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
          transform: translateX(-100%);
          transition: transform 0.6s ease-out;
        }
        .glassmorphism-button:hover .shimmer-effect {
          transform: translateX(100%);
        }
      `}</style>
      <section className="pt-4 md:pt-8 pb-0 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
            Specialized Tempo Traveller Services
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Explore our comprehensive tempo traveller services designed for different travel needs and group sizes
          </p>
        </div>

        {/* Desktop Layout - Sliding Row */}
        <div className="hidden xl:block mb-8 relative overflow-hidden">
          <div className="flex gap-4 transition-transform duration-500 ease-in-out" style={{ 
            transform: `translateX(-${Math.min(currentSlide * 25, Math.max(0, (tempoTravellerServices.length - 4) * 25))}%)` 
          }}>
            {/* All services in a single row */}
            {tempoTravellerServices.map((service, index) => (
              <div key={index} className="w-full max-w-[calc(25%-12px)] flex-shrink-0">
                <Card 
                  className="group hover:shadow-xl transition-all duration-300 border-0 bg-white rounded-2xl overflow-hidden cursor-pointer relative h-[380px]"
                >
                  <CardContent className="p-5 relative h-full flex flex-col">
                    {/* Background Pattern */}
                    <div className={`absolute inset-0 ${service.bgColor} opacity-50`}></div>
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-transparent via-transparent to-white/20"></div>
                    
                    {/* Content */}
                    <div className="relative z-10 flex flex-col h-full">
                      {/* Category Tag and Icon */}
                      <div className="flex justify-between items-start mb-3">
                        <div className="bg-gray-800 text-white px-3 py-1 rounded-full text-xs font-medium">
                          {service.title}
                        </div>
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${service.bgColor.replace('bg-gradient-to-br', 'bg')} shadow-sm`}>
                          <service.icon className={`h-6 w-6 ${service.iconColor}`} />
                        </div>
                      </div>

                      {/* Main Offer */}
                      <h3 className="text-lg font-bold text-gray-900 mb-2 leading-tight">
                        {service.offer}
                      </h3>

                      {/* Promo Code Button */}
                      <div className="mb-3">
                        <div className="inline-flex items-center gap-2 bg-white border-2 border-gray-300 rounded-lg px-3 py-2 text-sm font-medium text-gray-800 hover:border-gray-400 transition-colors">
                          <Tag className="h-4 w-4" />
                          {service.promoCode}
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-sm text-gray-600 mb-2 flex-grow">
                        {service.description}
                      </p>

                      {/* Features */}
                      <div className="space-y-1.5 mt-2 flex-grow">
                        {service.features.map((feature, idx) => (
                          <div key={idx} className="text-xs text-gray-500 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full flex-shrink-0"></div>
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>

                      {/* Book Button */}
                      <div className="mt-auto pt-4">
                        <Link 
                          to={service.link}
                          className="block w-full relative overflow-hidden rounded-full text-center text-gray-800 transition-all duration-300 glassmorphism-button flex items-center justify-center"
                        >
                          <span className="relative z-10">Book Now</span>
                          <div className="absolute inset-0 shimmer-effect"></div>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
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

          {/* Next Arrow - only show if there are additional services and we're not at the end */}
          {tempoTravellerServices.length > 4 && currentSlide < Math.max(0, (tempoTravellerServices.length - 4)) && (
            <button
              className="absolute right-0 top-1/2 transform -translate-y-1/2 z-20 w-12 h-12 bg-gray-300 rounded-full shadow-xl flex items-center justify-center hover:bg-gray-400 transition-colors border-2 border-gray-400"
              onClick={() => {
                const maxSlides = Math.max(0, tempoTravellerServices.length - 4);
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
        <div className="hidden lg:block xl:hidden mb-8">
          <div className="grid grid-cols-2 gap-4">
            {tempoTravellerServices.slice(0, 4).map((service, index) => (
              <Card 
                key={index} 
                className="group hover:shadow-xl transition-all duration- melted border-0 bg-white rounded-2xl overflow-hidden cursor-pointer relative h-[380px]"
              >
                <CardContent className="p-5 relative h-full flex flex-col">
                  {/* Background Pattern */}
                  <div className={`absolute inset-0 ${service.bgColor} opacity-50`}></div>
                  <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-transparent via-transparent to-white/20"></div>
                  
                  {/* Content */}
                  <div className="relative z-10 flex flex-col h-full">
                    {/* Category Tag and Icon */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="bg-gray-800 text-white px-3 py-1 rounded-full text-xs font-medium">
                        {service.title}
                      </div>
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${service.bgColor.replace('bg-gradient-to-br', 'bg')} shadow-sm`}>
                        <service.icon className={`h-6 w-6 ${service.iconColor}`} />
                      </div>
                    </div>

                    {/* Main Offer */}
                    <h3 className="text-lg font-bold text-gray-900 mb-2 leading-tight">
                      {service.offer}
                    </h3>

                    {/* Promo Code Button */}
                    <div className="mb-3">
                      <div className="inline-flex items-center gap-2 bg-white border-2 border-gray-300 rounded-lg px-3 py-2 text-sm font-medium text-gray-800 hover:border-gray-400 transition-colors">
                        <Tag className="h-4 w-4" />
                        {service.promoCode}
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-gray-600 mb-2 flex-grow">
                      {service.description}
                    </p>

                    {/* Features */}
                    <div className="space-y-1.5 mt-2">
                      {service.features.map((feature, idx) => (
                        <div key={idx} className="text-xs text-gray-500 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full flex-shrink-0"></div>
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>

                    {/* Book Button */}
                    <div className="mt-4">
                      <Link 
                        to={service.link}
                        className="block w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-center py-2 px-4 rounded-lg font-medium transition-all"
                      >
                        Book Now
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Mobile Slider */}
        <div className="block xl:hidden mb-8 relative">
          <Swiper
            modules={[Pagination]}
            spaceBetween={12}
            slidesPerView={1.2}
            pagination={false}
            onSwiper={setSwiperInstance}
            onSlideChange={(swiper) => setCurrentSlide(swiper.activeIndex)}
            className="tempo-traveller-swiper"
          >
            {tempoTravellerServices.map((service, index) => (
              <SwiperSlide key={index}>
                <Card 
                  className="group hover:shadow-xl transition-all duration-300 border-0 bg-white rounded-2xl overflow-hidden cursor-pointer relative h-[380px]"
                >
                  <CardContent className="p-5 relative h-full flex flex-col">
                    {/* Background Pattern */}
                    <div className={`absolute inset-0 ${service.bgColor} opacity-50`}></div>
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-transparent via-transparent to-white/20"></div>
                    
                    {/* Content */}
                    <div className="relative z-10 flex flex-col h-full">
                      {/* Category Tag and Icon */}
                      <div className="flex justify-between items-start mb-3">
                        <div className="bg-gray-800 text-white px-3 py-1 rounded-full text-xs font-medium">
                          {service.title}
                        </div>
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${service.bgColor.replace('bg-gradient-to-br', 'bg')} shadow-sm`}>
                          <service.icon className={`h-6 w-6 ${service.iconColor}`} />
                        </div>
                      </div>

                      {/* Main Offer */}
                      <h3 className="text-lg font-bold text-gray-900 mb-2 leading-tight">
                        {service.offer}
                      </h3>

                      {/* Promo Code Button */}
                      <div className="mb-3">
                        <div className="inline-flex items-center gap-2 bg-white border-2 border-gray-300 rounded-lg px-3 py-2 text-sm font-medium text-gray-800 hover:border-gray-400 transition-colors">
                          <Tag className="h-4 w-4" />
                          {service.promoCode}
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-sm text-gray-600 mb-2 flex-grow">
                        {service.description}
                      </p>

                      {/* Features */}
                      <div className="space-y-1.5 mt-2 flex-grow">
                        {service.features.map((feature, idx) => (
                          <div key={idx} className="text-xs text-gray-500 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full flex-shrink-0"></div>
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>

                      {/* Book Button */}
                      <div className="mt-auto pt-4">
                        <Link 
                          to={service.link}
                          className="block w-full relative overflow-hidden rounded-full text-center text-gray-800 transition-all duration-300 glassmorphism-button flex items-center justify-center"
                        >
                          <span className="relative z-10">Book Now</span>
                          <div className="absolute inset-0 shimmer-effect"></div>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </SwiperSlide>
            ))}
          </Swiper>
          
          {/* Custom Pagination with Dots and Counter */}
          <div className="flex justify-center items-center mt-4">
            <div className="flex items-center gap-1">
              {tempoTravellerServices.map((_, index) => {
                // Show the counter pill in place of the active dot
                if (index === currentSlide) {
                  return (
                    <div 
                      key={index}
                      className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium"
                    >
                      {currentSlide + 1}/{tempoTravellerServices.length}
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

        {/* Bottom Info */}
        <div className="text-center mt-8 bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-center gap-2 text-green-600 mb-2">
            <Shield className="h-5 w-5" />
            <span className="font-medium">Safety Guaranteed</span>
          </div>
          <p className="text-sm text-gray-500">
            All tempo traveller vehicles are regularly sanitized and maintained for your safety and comfort.
          </p>
        </div>
      </div>
    </section>
    </>
  );
}
