import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Car, Clock, MapPin, Users, Star, Shield, Smartphone, CreditCard } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';

export function ServicesShowcase() {
  const services = [
    {
      icon: Clock,
      title: "Local Trips",
      description: "Hourly packages perfect for city exploration",
      features: ["8hrs/80km - ₹2,400", "10hrs/100km - ₹3,000", "Professional drivers"],
      bgColor: "bg-blue-100",
      iconColor: "text-blue-600"
    },
    {
      icon: MapPin,
      title: "Outstation Travel",
      description: "Comfortable long-distance journeys",
      features: ["Hyderabad - 620km", "Chennai - 780km", "Bangalore - 860km"],
      bgColor: "bg-green-100",
      iconColor: "text-green-600"
    },
    {
      icon: Car,
      title: "Airport Transfers",
      description: "Reliable airport connectivity",
      features: ["On-time guarantee", "Flight tracking", "Fixed rates"],
      bgColor: "bg-purple-100",
      iconColor: "text-purple-600"
    },
    {
      icon: Users,
      title: "Car Pooling",
      description: "Share rides, save money",
      features: ["Eco-friendly travel", "Meet new people", "Affordable rates"],
      bgColor: "bg-orange-100",
      iconColor: "text-orange-600"
    }
  ];

  const features = [
    { icon: Clock, title: "24/7 Service", description: "Round-the-clock availability" },
    { icon: Shield, title: "Professional Drivers", description: "Verified & experienced" },
    { icon: Smartphone, title: "GPS Tracking", description: "Real-time location sharing" },
    { icon: Star, title: "Transparent Pricing", description: "No hidden charges" },
    { icon: Car, title: "Fleet Variety", description: "Economy to luxury options" },
    { icon: CreditCard, title: "Easy Payments", description: "Multiple payment options" }
  ];

  return (
    <section className="px-0 py-8 pb-2 mb-6 md:px-4 md:py-16 md:mb-0 bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-64 h-64 bg-gradient-to-r from-blue-400/5 to-purple-400/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-gradient-to-r from-purple-400/5 to-pink-400/5 rounded-full blur-3xl"></div>
      </div>
      
      <div className="mx-auto md:container md:max-w-6xl px-0 md:px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-8 md:mb-12">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200/30 px-6 py-3 rounded-full mb-6 shadow-sm backdrop-blur-sm">
            <Car className="h-5 w-5 text-blue-600 animate-pulse" />
            <span className="text-sm font-semibold text-blue-700 tracking-wide">OUR PREMIUM SERVICES</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-4 leading-tight">
            Your Journey, Our Priority
          </h2>
          <p className="text-gray-600 px-4 text-base md:text-lg max-w-3xl mx-auto leading-relaxed">
            From local city trips to outstation travel, we provide reliable and comfortable transportation solutions crafted for your comfort and convenience.
          </p>
        </div>

        {/* Mobile Slider */}
        <div className="block md:hidden">
          <div className="relative">
            <Swiper
              slidesPerView={1.1}
              spaceBetween={16}
              navigation={{
                nextEl: '.service-swiper-next',
                prevEl: '.service-swiper-prev',
              }}
              modules={[Navigation]}
              className="w-full"
            >
              {services.map((service, index) => (
                <SwiperSlide key={index}>
                  <div className="rounded-3xl shadow-xl bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30 backdrop-blur-sm border border-white/50 p-6 flex flex-col items-center text-center min-h-[380px] relative hover:transform hover:scale-105 transition-all duration-300 group">
                    <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mb-6 ${service.bgColor} shadow-lg group-hover:shadow-xl transition-shadow duration-300 group-hover:scale-110`}>
                      <service.icon className={`h-8 w-8 ${service.iconColor} group-hover:rotate-12 transition-transform duration-300`} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-700 transition-colors">{service.title}</h3>
                    <p className="text-gray-600 text-base mb-6 leading-relaxed">{service.description}</p>
                    <ul className="text-gray-500 text-sm space-y-2 mb-4 flex-grow">
                      {service.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center justify-center gap-2">
                          <span className="w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full"></span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <div className="absolute bottom-6 left-0 w-full flex justify-center">
                      <button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-full font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 text-sm">
                        Book Now
                      </button>
                    </div>
                  </div>
                </SwiperSlide>
              ))}
              {/* Arrows */}
              <div className="service-swiper-prev absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 rounded-full shadow p-2 cursor-pointer">
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600"><polyline points="15 18 9 12 15 6"></polyline></svg>
              </div>
              <div className="service-swiper-next absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 rounded-full shadow p-2 cursor-pointer">
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </div>
            </Swiper>
          </div>
          <div className="mb-2"></div>
        </div>
        {/* Desktop Grid */}
        <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {services.map((service, index) => (
            <Card key={index} className="group hover:shadow-xl transition-all duration-300 border-0 bg-white rounded-2xl overflow-hidden">
              <CardContent className="p-6 text-center">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 ${service.bgColor}`}>
                  <service.icon className={`h-8 w-8 ${service.iconColor}`} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{service.title}</h3>
                <p className="text-gray-600 text-base mb-4 leading-relaxed">{service.description}</p>
                <div className="space-y-1">
                  {service.features.map((feature, idx) => (
                    <div key={idx} className="text-sm text-gray-500 flex items-center justify-center gap-1">
                      <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                      {feature}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Why Choose Us Features */}
        <div className="bg-gray-50 rounded-3xl p-6 md:p-8">
          <div className="text-center mb-6 md:mb-8">
            <h3 className="text-xl md:text-2xl font-medium text-gray-900 mb-2">Why Choose Vizag Taxi Hub?</h3>
            <p className="text-gray-600 text-sm md:text-base">Experience the difference with our premium features</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
            {features.map((feature, index) => (
              <div key={index} className="text-center group">
                <div className="w-12 h-12 md:w-14 md:h-14 bg-white rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:shadow-lg transition-shadow duration-300">
                  <feature.icon className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
                </div>
                <h4 className="font-semibold text-gray-900 text-sm md:text-base mb-1">{feature.title}</h4>
                <p className="text-xs md:text-sm text-gray-500 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
