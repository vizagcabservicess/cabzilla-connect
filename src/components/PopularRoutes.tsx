import React, { useState, useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Clock, TrendingUp, Star, Shield } from 'lucide-react';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

export function PopularRoutes() {
  const routes = [
    {
      destination: "Vizag Local Temples",
      distance: "100 km",
      duration: "10 hours",
      startingPrice: "₹3,000",
      description: "Simhachalam, Kanaka Maha Lakshmi, Sampath Vinayagar, ISKCON, Kailasagiri, TTD & Kali Temple",
    },
    {
      destination: "Annavaram",
      distance: "260 km",
      duration: "8-9 hours",
      startingPrice: "₹4,500",
      description: "Sri Veera Venkata Satyanarayana Swamy Temple is a Hindu-Vaishnavite temple located in Annavaram",
    },
    {
      destination: "Srikakulam",
      distance: "260 km",
      duration: "8-9 hours",
      startingPrice: "₹4,500",
      description: "Srikakulam is known for its temples, with the Srikurmam Temple and Arasavalli Sun God Temple",
    },
    {
      destination: "Pitapuram",
      distance: "320 km",
      duration: "11-12 hours",
      startingPrice: "₹5,000",
      description: "Pithapuram is one of the oldest and famous pilgrim places of India",
    },
    {
      destination: "Vijayawada",
      distance: "750 km",
      duration: "14-16 hours",
      startingPrice: "₹11,500",
      description: "Situated in the heart of the Vijayawada city, Kanaka Durga temple is located on the Indrakeeladri hill",
    },
    {
      destination: "Tirupati",
      distance: "1600 km",
      duration: "36 hours",
      startingPrice: "₹24,000",
      description: "Tirumala is the riches pilgrimage centre in the world",
    },
  ];

  const renderRouteCard = (route: any, index: number) => (
    <div
      key={index}
      className="bg-white rounded-xl p-4 border border-gray-100 hover:shadow-lg transition-shadow cursor-pointer relative overflow-hidden"
      onClick={() => window.location.href = `/outstation-taxi`}
    >
      <div className="absolute inset-0 bg-no-repeat opacity-20" style={{ backgroundImage: 'url(https://vizagtaxihub.com/uploads/popular-destinations.jpg)' }}></div>
      
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-3">
          <span className="bg-gray-800 text-white px-2 py-1 rounded-full text-xs font-medium">
            {route.destination}
          </span>
        </div>

        <h3 className="text-lg font-bold text-gray-900 mb-2">{route.startingPrice}</h3>
        <p className="text-sm text-gray-800 mb-3 line-clamp-2">{route.description}</p>

        <div className="flex flex-wrap gap-2">
          <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            {route.distance}
          </div>
          <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            {route.duration}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <section className="pt-4 md:pt-8 pb-0 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-3">
            Top Destinations from Vizag
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Explore popular destinations from Visakhapatnam with our reliable outstation taxi services. 
            All prices include driver allowance and toll charges.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {routes.map(renderRouteCard)}
        </div>

        <div className="text-center mt-8 bg-gray-50 rounded-xl p-4">
          <div className="flex items-center justify-center gap-2 text-green-600 mb-2">
            <Shield className="h-4 w-4" />
            <span className="font-medium text-sm">Reliable Service</span>
          </div>
          <p className="text-xs text-gray-500">
            All routes include driver allowance, toll charges, and professional service for your comfort.
          </p>
        </div>
      </div>
    </section>
  );
}
