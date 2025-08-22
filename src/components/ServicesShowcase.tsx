import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Car, Clock, MapPin, Users, Star, Shield, Smartphone, CreditCard, Tag, Bus, Plane, Route, UserCheck } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import { useNavigate } from 'react-router-dom';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

export function ServicesShowcase() {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [swiperInstance, setSwiperInstance] = useState<any>(null);
  
  const services = [
    {
      icon: Car,
      title: "Local Trips",
      offer: "Save up to ₹200 on local packages",
      validity: "Valid till 31 SEP",
      promoCode: "LOCAL200",
      description: "Hourly packages for city exploration",
      features: ["8hrs/80km - ₹2,400", "10hrs/100km - ₹3,000", "Professional drivers"],
      bgColor: "bg-gradient-to-br from-[#fff8f0] to-[#fff8f0]",
      iconColor: "text-blue-600",
      link: "/local-taxi",
      discount: "₹200"
    },
    {
      icon: Route,
      title: "Outstation Travel",
      offer: "Save up to ₹300 on long journeys",
      validity: "Valid till 31 SEP",
      promoCode: "OUT300",
      description: "Comfortable long-distance journeys",
      features: ["Hyderabad - 650km", "Chennai - 800km", "Bangalore - 1000km"],
      bgColor: "bg-gradient-to-br from-[#fff8f0] to-[#fff8f0]",
      iconColor: "text-green-600",
      link: "/outstation-taxi",
      discount: "₹300"
    },
    {
      icon: Plane,
      title: "Airport Transfers",
      offer: "Save up to ₹200 on airport rides",
      validity: "Valid till 31 SEP",
      promoCode: "AIR200",
      description: "Reliable airport connectivity",
      features: ["On-time guarantee", "Flight tracking", "Fixed rates"],
      bgColor: "bg-gradient-to-br from-[#fff8f0] to-[#fff8f0]",
      iconColor: "text-purple-600",
      link: "/airport-taxi",
      discount: "₹200"
    },
    {
      icon: UserCheck,
      title: "Hire a Driver",
      offer: "Save up to ₹100 with professional drivers",
      validity: "Valid till 31 Dec",
      promoCode: "DRIVER100",
      description: "Professional drivers for your vehicle",
      features: ["Licensed drivers", "Flexible hours", "Safe & reliable"],
      bgColor: "bg-gradient-to-br from-[#fff8f0] to-[#fff8f0]",
      iconColor: "text-orange-600",
      link: "/hire-driver",
      discount: "₹400"
    }
  ];

  const features = [
    { icon: Clock, title: "24/7 Service", description: "Available round the clock" },
    { icon: Shield, title: "Safe Travel", description: "Verified drivers & vehicles" },
    { icon: Star, title: "Best Rates", description: "Competitive pricing guaranteed" },
    { icon: Smartphone, title: "Easy Booking", description: "Book with just a few taps" }
  ];

  return (
    <section className="pt-4 md:pt-12 pb-0 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
            Your Journey, Our Priority
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            From local city trips to outstation travel, we provide reliable and comfortable transportation solutions for all your needs.
          </p>
        </div>

        {/* Desktop Layout - Sliding Row */}
        <div className="hidden xl:block mb-8 relative overflow-hidden">
          <div className="flex gap-4 transition-transform duration-500 ease-in-out" style={{ 
            transform: `translateX(-${Math.min(currentSlide * 50, Math.max(0, (services.length - 4) * 50))}%)` 
          }}>
            {/* All services in a single row */}
            {services.map((service, index) => (
              <div key={index} className="w-full max-w-[calc(25%-12px)] flex-shrink-0">
                <Card 
                  className="group hover:shadow-xl transition-all duration-300 border-0 bg-white rounded-2xl overflow-hidden cursor-pointer relative h-[320px]"
                  onClick={() => navigate(service.link)}
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

                      {/* Validity */}
                      <p className="text-sm text-gray-600 mb-3">
                        {service.validity}
                      </p>

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
          {services.length > 4 && currentSlide < Math.max(0, (services.length - 4)) && (
            <button
              className="absolute right-0 top-1/2 transform -translate-y-1/2 z-20 w-12 h-12 bg-gray-300 rounded-full shadow-xl flex items-center justify-center hover:bg-gray-400 transition-colors border-2 border-gray-400"
              onClick={() => {
                const maxSlides = Math.max(0, services.length - 4);
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
            {services.map((service, index) => (
              <Card 
                key={index} 
                className="group hover:shadow-xl transition-all duration-300 border-0 bg-white rounded-2xl overflow-hidden cursor-pointer relative h-[320px]"
                onClick={() => navigate(service.link)}
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

                    {/* Validity */}
                    <p className="text-sm text-gray-600 mb-3">
                      {service.validity}
                    </p>

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
            className="services-swiper"
          >
            {services.map((service, index) => (
              <SwiperSlide key={index}>
                <Card 
                  className="group hover:shadow-xl transition-all duration-300 border-0 bg-white rounded-2xl overflow-hidden cursor-pointer relative h-[320px]"
                  onClick={() => navigate(service.link)}
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

                      {/* Validity */}
                      <p className="text-sm text-gray-600 mb-3">
                        {service.validity}
                      </p>

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
                    </div>
                  </CardContent>
                </Card>
              </SwiperSlide>
            ))}
          </Swiper>
          
          {/* Custom Pagination with Dots and Counter */}
          <div className="flex justify-center items-center mt-4">
            <div className="flex items-center gap-1">
              {services.map((_, index) => {
                // Show the counter pill in place of the active dot
                if (index === currentSlide) {
                  return (
                    <div 
                      key={index}
                      className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium"
                    >
                      {currentSlide + 1}/{services.length}
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

     
      </div>
    </section>
  );
}
