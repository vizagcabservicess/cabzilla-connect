import React, { useEffect, useState, useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Clock, Star, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { tourAPI } from '@/services/api/tourAPI';
import { vehicleAPI } from '@/services/api/vehicleAPI';
import { useNavigate } from 'react-router-dom';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/autoplay';

export function TourSlider() {
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vehicleCapacities, setVehicleCapacities] = useState({});
  const navigate = useNavigate();
  const swiperRef = useRef<any>(null);
  const [isBeginning, setIsBeginning] = useState(true);
  const [isEnd, setIsEnd] = useState(false);

  useEffect(() => {
    async function fetchToursAndVehicles() {
      setLoading(true);
      try {
        const [tourData, vehicleData] = await Promise.all([
          tourAPI.getAvailableTours(),
          vehicleAPI.getVehicles()
        ]);
        setTours(tourData);
        // Build vehicleId -> capacity map
        const capMap = {};
        (vehicleData.vehicles || []).forEach(v => {
          capMap[v.id] = v.capacity;
          capMap[v.vehicle_id] = v.capacity;
        });
        setVehicleCapacities(capMap);
      } catch (e) {
        setTours([]);
        setVehicleCapacities({});
      } finally {
        setLoading(false);
      }
    }
    fetchToursAndVehicles();
  }, []);

  if (loading) {
    return (
      <section className="py-12 md:py-16 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-orange-50 px-4 py-2 rounded-full mb-4">
            <MapPin className="h-4 w-4 text-orange-600" />
            <span className="text-sm font-medium text-orange-600">TOUR PACKAGES</span>
          </div>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-medium text-gray-900 mb-4">
            Explore Amazing Destinations
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto text-lg mb-8">
            Loading tour packages...
          </p>
          <div className="flex justify-center gap-6">
            {[1,2,3].map(i => (
              <div key={i} className="bg-gray-200 animate-pulse rounded-3xl h-96 w-80"></div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Ensure at least 3 slides for Swiper to enable sliding
  let displayTours = tours;
  if (tours.length === 1) {
    displayTours = [...tours, ...tours, ...tours]; // 3 copies
  } else if (tours.length === 2) {
    displayTours = [...tours, ...tours]; // 4 slides (2x2)
  }

  return (
    <section className="py-4 md:py-4  px-4">
      <div
        className=" mx-auto max-w-6xl relative"
        onMouseEnter={() => {
          if (swiperRef.current && swiperRef.current.autoplay) swiperRef.current.autoplay.stop();
        }}
        onMouseLeave={() => {
          if (swiperRef.current && swiperRef.current.autoplay) swiperRef.current.autoplay.start();
        }}
      >
                 {/* Arrows absolutely positioned at top right of slider - hidden on mobile */}
         <div className="absolute right-0 top-0 z-10 flex gap-2 mt-24 md:mt-[7rem] mr-2 hidden md:flex">
          <button
            className={`tour-slider-prev bg-white rounded-full shadow-lg p-2 transition duration-200 flex items-center justify-center ${isBeginning ? 'opacity-100 cursor-not-allowed' : 'cursor-pointer'}`}
            aria-label="Previous"
            disabled={isBeginning}
          >
            <svg width="24" height="24" fill="none" stroke={isBeginning ? '#91d5ff' : '#1890ff'} strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <button
            className={`tour-slider-next bg-white rounded-full shadow-lg p-2 transition duration-200 flex items-center justify-center ${isEnd ? 'opacity-100 cursor-not-allowed' : 'cursor-pointer'}`}
            aria-label="Next"
            disabled={isEnd}
          >
            <svg width="24" height="24" fill="none" stroke={isEnd ? '#91d5ff' : '#1890ff'} strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M9 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
                 {/* Heading and subtitle centered below arrows */}
         <div className="mb-8 text-center flex flex-col items-center justify-center">
          <div className="inline-flex items-center gap-2 bg-orange-50 px-6 py-2 rounded-2xl mb-4" style={{ position: 'relative', left: 0, right: 0, margin: '0 auto' }}>
            <MapPin className="h-5 w-5 text-orange-500" />
            <span className="text-base font-medium text-orange-500 tracking-wide">TOUR PACKAGES</span>
          </div>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-medium text-gray-900 mb-3 leading-tight">Explore Amazing Destinations</h2>
          <p className="text-gray-600 max-w-2xl mx-auto text-lg">
            Discover the beauty of Andhra Pradesh with our carefully curated tour packages
          </p>
        </div>
        <Swiper
          modules={[Navigation, Pagination, Autoplay]}
          spaceBetween={28}
          slidesPerView={1}
          navigation={{
            nextEl: '.tour-slider-next',
            prevEl: '.tour-slider-prev',
          }}
          pagination={{ clickable: true }}
          autoplay={{ delay: 3500, disableOnInteraction: false }}
          breakpoints={{
            640: { slidesPerView: 1 },
            768: { slidesPerView: 2 },
            1024: { slidesPerView: 3 },
            1280: { slidesPerView: 3 }
          }}
          className="tour-slider pb-8"
          onSwiper={swiper => {
            swiperRef.current = swiper;
            setIsBeginning(swiper.isBeginning);
            setIsEnd(swiper.isEnd);
          }}
          onSlideChange={swiper => {
            setIsBeginning(swiper.isBeginning);
            setIsEnd(swiper.isEnd);
          }}
        >
          {displayTours.map((tour, idx) => {
            // Find vehicleId with lowest price
            let minVehicleId = null;
            let minPrice = Infinity;
            if (tour.pricing) {
              Object.entries(tour.pricing).forEach(([vid, price]) => {
                if (typeof price === 'number' && price < minPrice) {
                  minPrice = price;
                  minVehicleId = vid;
                }
              });
            }
            const maxPeople = minVehicleId && vehicleCapacities[minVehicleId] ? vehicleCapacities[minVehicleId] : undefined;
            // Extract up to 3 unique highlights from itinerary activities
            let highlights = [];
            if (tour.itinerary && Array.isArray(tour.itinerary)) {
              const allActs = tour.itinerary.flatMap(day => Array.isArray(day.activities) ? day.activities : []);
              highlights = Array.from(new Set(allActs.filter(Boolean))).slice(0, 3);
            }
            return (
              <SwiperSlide key={(tour.tourId || tour.id) + '-' + idx}>
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-0 flex flex-col h-full transition hover:shadow-md">
                  <div className="relative">
                    <img 
                      src={tour.image || tour.imageUrl} 
                      alt={tour.name || tour.tourName}
                      className="w-full h-48 object-cover rounded-t-2xl"
                    />
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-bold text-gray-900 line-clamp-2">{tour.name || tour.tourName}</h3>
                      <div className="text-lg font-bold text-blue-600">
                        {tour.pricing && Object.values(tour.pricing).length > 0
                          ? `₹${Math.min(...(Object.values(tour.pricing) as number[])).toLocaleString('en-IN')}`
                          : tour.price || '₹--'}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mb-2 text-xs text-gray-600">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{(tour.timeDuration || tour.duration || 'Full Day').replace(/\s*\(.*?\)\s*/g, '')}</span>
                      </div>
                      {maxPeople && (
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span>Max {maxPeople} people</span>
                        </div>
                      )}
                    </div>
                    <div className="mb-4">
                      <p className="text-xs font-medium text-gray-700 mb-1">Tour Highlights:</p>
                      <div className="flex flex-wrap gap-1">
                        {highlights.length > 0 && highlights.map((highlight, index) => (
                          <span 
                            key={index}
                            className="text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full"
                          >
                            {highlight}
                          </span>
                        ))}
                      </div>
                    </div>
                    <Button
                      className="w-full mt-auto bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 text-sm font-semibold"
                      onClick={() => navigate(`/tour/${tour.tourId || tour.id}`)}
                    >
                      Book This Tour
                    </Button>
                  </div>
                </div>
              </SwiperSlide>
            );
          })}
        </Swiper>
      </div>
    </section>
  );
}