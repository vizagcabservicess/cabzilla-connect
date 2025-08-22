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
  const [currentSlide, setCurrentSlide] = useState(0);
  const [swiperInstance, setSwiperInstance] = useState<any>(null);
  
  const routes = [
    {
      destination: "Vizag Local Temples",
      distance: "100 km",
      duration: "10 hours",
      startingPrice: "₹3,000",
      description: "Simhachalam, Kanaka Maha Lakshmi, Sampath Vinayagar, ISKCON, Kailasagiri, TTD & Kali Temple",
      popularity: "Weekend Favorite",
      gradient: "from-teal-500 to-cyan-600",
      savings: "Sedan"
    },
    {
      destination: "Annavaram",
      distance: "260 km",
      duration: "8-9 hours",
      startingPrice: "₹4,500",
      description: "Sri Veera Venkata Satyanarayana Swamy Temple is a Hindu-Vaishnavite temple located in Annavaram ",
      popularity: "Most Popular",
      gradient: "from-blue-500 to-indigo-600",
      savings: "Sedan"
    },
    {
      destination: "Srikakulam",
      distance: "260 km",
      duration: "8-9 hours",
      startingPrice: "₹4,500",
      description: "Srikakulam is known for its temples, with the Srikurmam Temple and Arasavalli Sun God Temple",
      popularity: "Trending",
      gradient: "from-green-500 to-emerald-600",
      savings: "Sedan"
    },
    {
      destination: "Pitapuram",
      distance: "320 km",
      duration: "11-12 hours",
      startingPrice: "₹5,000",
      description: "Pithapuram is one of the oldest and famous pilgrim places of India",
      popularity: "Spiritual",
      gradient: "from-purple-500 to-violet-600",
      savings: "Sedan"
    },
    {
      destination: "Vijayawada",
      distance: "750 km",
      duration: "14-16 hours",
      startingPrice: "₹11,500",
      description: "Situated in the heart of the Vijayawada city, Kanaka Durga temple is located on the Indrakeeladri hill, on the banks of the River Krishna.",
      popularity: "Weekend Favorite",
      gradient: "from-emerald-500 to-green-600",
      savings: "Sedan"
    },
    {
      destination: "Tirupati",
      distance: "1600 km",
      duration: "36 hours",
      startingPrice: "₹24,000",
      description: "Tirumala is the riches pilgrimage centre in the world",
      popularity: "Weekend Favorite",
      gradient: "from-orange-500 to-red-600",
      savings: "Sedan"
    },
  ];

  const gridRoutes = routes.slice(0, 4);
  const sliderRoutes = routes.slice(4);

  const renderRouteCard = (route: any, index: number) => {
    return (
      <Card
        key={index}
        className="group hover:shadow-xl transition-all duration-300 border-0 bg-white rounded-2xl overflow-hidden cursor-pointer relative h-[250px]"
        onClick={() => window.location.href = `/outstation-taxi`}
      >
        <CardContent className="p-5 relative h-full flex flex-col">
                     {/* Background Image */}
           <div className="absolute inset-0  bg-no-repeat" style={{ backgroundImage: 'url(https://vizagtaxihub.com/uploads/popular-destinations.jpg)' }}></div>
           <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-white/80"></div>

          {/* Content */}
          <div className="relative z-10 flex flex-col h-full">
            {/* Category Tag */}
            <div className="flex justify-between items-start mb-3">
              <div className="bg-gray-800 text-white px-3 py-1 rounded-full text-xs font-medium">
                {route.destination}
              </div>
            </div>

            {/* Main Price */}
            <h3 className="text-lg font-bold text-gray-900 mb-2 leading-tight">
              {route.startingPrice}
            </h3>

            {/* Description */}
            <p className="text-sm text-gray-800 mb-3">
              {route.description}
            </p>

            {/* Features */}
            <div className="flex flex-wrap gap-2">
              <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                {route.distance}
              </div>
              <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                {route.duration}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <section className="pt-4 md:pt-8 pb-0 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-3">
            Top Destinations from Vizag
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Explore popular destinations from Visakhapatnam with our reliable outstation taxi services. 
            All prices include driver allowance and toll charges.
          </p>
        </div>

        {/* Route Cards with Sliding Functionality */}
        <>
          {/* Desktop Layout - Sliding Row */}
          <div className="hidden lg:block mb-8 relative overflow-hidden">
            <div className="flex gap-4 transition-transform duration-500 ease-in-out" style={{ 
              transform: `translateX(-${Math.min(currentSlide * 50, Math.max(0, (gridRoutes.length + sliderRoutes.length - 4) * 50))}%)` 
            }}>
              {/* All routes in a single row */}
              {[...gridRoutes, ...sliderRoutes].map((route, index) => (
                <div key={index} className="w-full max-w-[calc(25%-12px)] flex-shrink-0">
                  {renderRouteCard(route, index)}
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

            {/* Next Arrow - only show if there are additional routes and we're not at the end */}
            {sliderRoutes.length > 0 && currentSlide < Math.max(0, (gridRoutes.length + sliderRoutes.length - 4)) && (
              <button
                className="absolute right-0 top-1/2 transform -translate-y-1/2 z-20 w-12 h-12 bg-gray-300 rounded-full shadow-xl flex items-center justify-center hover:bg-gray-400 transition-colors border-2 border-gray-400"
                onClick={() => {
                  const maxSlides = Math.max(0, gridRoutes.length + sliderRoutes.length - 4);
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
              {gridRoutes.map((route, index) => renderRouteCard(route, index))}
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
              className="routes-swiper"
            >
              {gridRoutes.map((route, index) => (
                <SwiperSlide key={index}>
                  {renderRouteCard(route, index)}
                </SwiperSlide>
              ))}
            </Swiper>
            
            {/* Custom Pagination with Dots and Counter */}
            <div className="flex justify-center items-center mt-4">
              <div className="flex items-center gap-1">
                {gridRoutes.map((_, index) => {
                  // Show the counter pill in place of the active dot
                  if (index === currentSlide) {
                    return (
                      <div 
                        key={index}
                        className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium"
                      >
                        {currentSlide + 1}/{gridRoutes.length}
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
        </>

        {/* Bottom Info */}
        <div className="text-center mt-8 bg-gray-50 rounded-2xl p-6">
          <div className="flex items-center justify-center gap-2 text-green-600 mb-2">
            <Shield className="h-5 w-5" />
            <span className="font-medium">Reliable Service</span>
          </div>
          <p className="text-sm text-gray-500">
            All routes include driver allowance, toll charges, and professional service for your comfort.
          </p>
        </div>
      </div>
    </section>
  );
}
