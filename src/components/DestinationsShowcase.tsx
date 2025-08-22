import React, { useEffect, useState, useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Calendar, Users, Clock, Star, Shield, Plane, Tag } from 'lucide-react';
import { tourAPI } from '@/services/api/tourAPI';
import { Link } from 'react-router-dom';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

export function DestinationsShowcase() {
  const [tours, setTours] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const swiperRef = useRef<any>(null);
  const [isBeginning, setIsBeginning] = useState(true);
  const [isEnd, setIsEnd] = useState(false);
  const [swiperInstance, setSwiperInstance] = useState<any>(null);

  useEffect(() => {
    async function fetchTours() {
      setLoading(true);
      try {
        const data = await tourAPI.getAvailableTours();
        setTours(data || []);
      } catch (e) {
        setTours([]);
      } finally {
        setLoading(false);
      }
    }
    fetchTours();
  }, []);

  // Helper to get tour type/category
  function getType(tour: any) {
    if (tour.category) return tour.category.toLowerCase();
    if (tour.name) return tour.name.toLowerCase();
    return 'other';
  }

  // Helper to get price
  function getPrice(tour: any) {
    if (tour.pricing && Object.keys(tour.pricing).length > 0) {
      const prices = Object.values(tour.pricing) as number[];
      const minPrice = Math.min(...prices);
      return `₹${minPrice.toLocaleString('en-IN')}`;
    }
    if (tour.minPrice) return `₹${tour.minPrice.toLocaleString('en-IN')}`;
    return '₹--';
  }

  // Helper to get duration
  function getDuration(tour: any) {
    if (tour.timeDuration) return tour.timeDuration;
    if (tour.days) return `${tour.days} day${tour.days > 1 ? 's' : ''}`;
    return 'Full Day';
  }

  // Helper to get capacity
  function getCapacity(tour: any) {
    return tour.maxPeople ? `${tour.maxPeople} people` : '4 people';
  }

  // Helper to get bg gradient
  function getBgGradient(type: string) {
    if (type.toLowerCase().includes('valley') || type.toLowerCase().includes('araku')) return 'bg-gradient-to-br from-[#fff8f0] to-[#fff8f0]';
    if (type.toLowerCase().includes('city') || type.toLowerCase().includes('vizag')) return 'bg-gradient-to-br from-[#fff8f0] to-[#fff8f0]';
    if (type.toLowerCase().includes('lambasingi') || type.toLowerCase().includes('mountain')) return 'bg-gradient-to-br from-[#fff8f0] to-[#fff8f0]';
    return 'bg-gradient-to-br from-[#fff8f0] to-[#fff8f0]';
  }

  // Helper to get promo code
  function getPromoCode(tour: any, index: number) {
    const type = getType(tour);
    if (type.toLowerCase().includes('valley') || type.toLowerCase().includes('araku')) return 'ARAKU200';
    if (type.toLowerCase().includes('city') || type.toLowerCase().includes('vizag')) return 'VIZAG300';
    if (type.toLowerCase().includes('lambasingi') || type.toLowerCase().includes('mountain')) return 'LAMBA500';
    return `TOUR${index + 1}00`;
  }

  // Helper to get highlights
  function getHighlights(tour: any) {
    if (tour.sightseeingPlaces && Array.isArray(tour.sightseeingPlaces)) {
      return tour.sightseeingPlaces.slice(0, 2);
    }
    if (tour.inclusions && Array.isArray(tour.inclusions)) {
      return tour.inclusions.slice(0, 2);
    }
    return ['Scenic Views', 'Local Guide'];
  }

  const gridTours = tours.slice(0, 4);
  const sliderTours = tours.slice(4);

  const renderTourCard = (tour: any, index: number) => {
    const tourSlug = tour.id ? tour.id.toString().trim().toLowerCase().replace(/\s+/g, '-') : '';
    const tourType = getType(tour);

    return (
      <Card
        key={tour.id || index}
        className="group hover:shadow-xl transition-all duration-300 border-0 bg-white rounded-2xl overflow-hidden cursor-pointer relative h-[320px]"
        onClick={() => window.location.href = `/tours/${tourSlug}`}
      >
        <CardContent className="p-5 relative h-full flex flex-col">
          {/* Background Pattern */}
          <div className={`absolute inset-0 ${getBgGradient(tourType)} opacity-50`}></div>
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-transparent via-transparent to-white/20"></div>

          {/* Content */}
          <div className="relative z-10 flex flex-col h-full">
            {/* Category Tag */}
            <div className="flex justify-between items-start mb-3">
              <div className="bg-gray-800 text-white px-3 py-1 rounded-full text-xs font-medium">
                {tour.name}
              </div>
            </div>

            {/* Main Price and Duration Row */}
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-bold text-gray-900 leading-tight">
                {getPrice(tour)} Onwards
              </h3>
              <p className="text-sm text-gray-600 inline-flex items-center gap-2 bg-white border-2 border-gray-300 rounded-lg px-3 py-2 text-sm font-medium text-gray-800 hover:border-gray-400 transition-colors">
                {getDuration(tour)}
              </p>
            </div>

            {/* Tour Image */}
            <div className="flex-grow flex items-center justify-center mb-3">
              {tour.image && typeof tour.image === 'string' && tour.image.trim() !== '' ? (
                <img
                  src={tour.image}
                  alt={tour.name}
                  className="w-full h-32 object-cover rounded-lg"
                  onError={e => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : (
                <div className="w-full h-32 bg-gray-200 rounded-lg flex items-center justify-center">
                  <MapPin className="h-12 w-12 text-gray-400" />
                </div>
              )}
            </div>

            {/* Highlights */}
            <div className="flex flex-wrap gap-2">
              {getHighlights(tour).map((highlight: string, idx: number) => (
                <div key={idx} className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  {highlight}
                </div>
              ))}
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
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
            Explore Amazing Destinations
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Discover the beauty of Andhra Pradesh with our carefully curated tour packages.
          </p>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center py-10">
            <MapPin className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            {/* Desktop Layout - Sliding Row */}
            <div className="hidden lg:block mb-8 relative overflow-hidden">
              <div className="flex gap-4 transition-transform duration-500 ease-in-out" style={{ transform: `translateX(-${currentSlide * 50}%)` }}>
                {/* All tours in a single row */}
                {[...gridTours, ...sliderTours].map((tour, index) => (
                  <div key={tour.id || index} className="w-full max-w-[calc(25%-12px)] flex-shrink-0">
                    {renderTourCard(tour, index)}
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

              {/* Next Arrow - only show if there are additional tours */}
              {sliderTours.length > 0 && currentSlide < (gridTours.length + sliderTours.length - 2) && (
                <button
                  className="absolute right-0 top-1/2 transform -translate-y-1/2 z-20 w-12 h-12 bg-gray-300 rounded-full shadow-xl flex items-center justify-center hover:bg-gray-400 transition-colors border-2 border-gray-400"
                  onClick={() => {
                    const maxSlides = gridTours.length + sliderTours.length - 2;
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
                {gridTours.map((tour, index) => renderTourCard(tour, index))}
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
                className="destinations-swiper"
              >
                {gridTours.map((tour, index) => (
                  <SwiperSlide key={tour.id || index}>
                    {renderTourCard(tour, index)}
                  </SwiperSlide>
                ))}
              </Swiper>
              
              {/* Custom Pagination with Dots and Counter */}
              <div className="flex justify-center items-center mt-4">
                <div className="flex items-center gap-1">
                  {gridTours.map((_, index) => {
                    // Show the counter pill in place of the active dot
                    if (index === currentSlide) {
                      return (
                        <div 
                          key={index}
                          className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium"
                        >
                          {currentSlide + 1}/{gridTours.length}
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
        )}

        {/* Bottom Info */}
        <div className="text-center mt-8 bg-gray-50 rounded-2xl p-6">
          <div className="flex items-center justify-center gap-2 text-green-600 mb-2">
            <Shield className="h-5 w-5" />
            <span className="font-medium">Expert Guides</span>
          </div>
          <p className="text-sm text-gray-500">
            All tours are led by experienced local guides who know the best spots and hidden gems.
          </p>
        </div>
      </div>
    </section>
  );
}
