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
  
  const services = [
    {
      icon: Car,
      title: "Local Trips",
      offer: "Save up to ₹200 on local packages",
      validity: "Valid till 31 SEP",
      promoCode: "LOCAL200",
      description: "Hourly packages for city exploration",
      features: ["8hrs/80km - ₹2,400", "10hrs/100km - ₹3,000", "Professional drivers"],
      iconColor: "text-blue-600",
      link: "/local-taxi",
    },
    {
      icon: Route,
      title: "Outstation Travel",
      offer: "Save up to ₹300 on long journeys",
      validity: "Valid till 31 SEP",
      promoCode: "OUT300",
      description: "Comfortable long-distance journeys",
      features: ["Hyderabad - 650km", "Chennai - 800km", "Bangalore - 1000km"],
      iconColor: "text-green-600",
      link: "/outstation-taxi",
    },
    {
      icon: Plane,
      title: "Airport Transfers",
      offer: "Save up to ₹200 on airport rides",
      validity: "Valid till 31 SEP",
      promoCode: "AIR200",
      description: "Reliable airport connectivity",
      features: ["On-time guarantee", "Flight tracking", "Fixed rates"],
      iconColor: "text-purple-600",
      link: "/airport-taxi",
    },
    {
      icon: UserCheck,
      title: "Hire a Driver",
      offer: "Save up to ₹100 with professional drivers",
      validity: "Valid till 31 Dec",
      promoCode: "DRIVER100",
      description: "Professional drivers for your vehicle",
      features: ["Licensed drivers", "Flexible hours", "Safe & reliable"],
      iconColor: "text-orange-600",
      link: "/hire-driver",
    }
  ];

  const renderServiceCard = (service: any, index: number) => (
    <div 
      key={index} 
      className="bg-white rounded-xl p-4 border border-gray-100 hover:shadow-lg transition-shadow cursor-pointer group"
      onClick={() => navigate(service.link)}
    >
      <div className="flex justify-between items-start mb-3">
        <span className="bg-gray-800 text-white px-2 py-1 rounded-full text-xs font-medium">
          {service.title}
        </span>
        <service.icon className={`h-6 w-6 ${service.iconColor}`} />
      </div>
      
      <h3 className="text-lg font-bold text-gray-900 mb-1">{service.offer}</h3>
      <p className="text-sm text-gray-600 mb-2">{service.validity}</p>
      
      <div className="inline-flex items-center gap-2 bg-gray-50 border rounded-lg px-2 py-1 text-xs font-medium text-gray-800 mb-2">
        <Tag className="h-3 w-3" />
        {service.promoCode}
      </div>
      
      <p className="text-sm text-gray-600 mb-3">{service.description}</p>
      
      <div className="space-y-1">
        {service.features.slice(0, 2).map((feature: string, idx: number) => (
          <div key={idx} className="text-xs text-gray-500 flex items-center gap-1">
            <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
            <span>{feature}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <section className="pt-4 md:pt-12 pb-0 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
            Your Journey, Our Priority
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            From local city trips to outstation travel, we provide reliable and comfortable transportation solutions for all your needs.
          </p>
        </div>

        {/* Responsive Grid - Single layout for all screen sizes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {services.map(renderServiceCard)}
        </div>

     
      </div>
    </section>
  );
}
