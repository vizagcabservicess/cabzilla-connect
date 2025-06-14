import React, { useEffect, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay, EffectCoverflow } from 'swiper/modules';
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
import 'swiper/css/effect-coverflow';

export function TourSlider() {
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vehicleCapacities, setVehicleCapacities] = useState({});
  const navigate = useNavigate();

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
          <h2 className="text-3xl md:text-4xl font-medium text-gray-900 mb-4">
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
    <section className="py-12 md:py-16 bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4">
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <div className="inline-flex items-center gap-2 bg-orange-50 px-4 py-2 rounded-full mb-4">
            <MapPin className="h-4 w-4 text-orange-600" />
            <span className="text-sm font-medium text-orange-600">TOUR PACKAGES</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-medium text-gray-900 mb-4">
            Explore Amazing Destinations
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto text-lg">
            Discover the beauty of Andhra Pradesh with our carefully curated tour packages
          </p>
        </motion.div>

        <Swiper
          modules={[Navigation, Pagination, Autoplay, EffectCoverflow]}
          spaceBetween={30}
          slidesPerView={1}
          pagination={{ clickable: true }}
          autoplay={{ delay: 4000, disableOnInteraction: false }}
          effect="coverflow"
          coverflowEffect={{
            rotate: 50,
            stretch: 0,
            depth: 100,
            modifier: 1,
            slideShadows: true,
          }}
          breakpoints={{
            640: { slidesPerView: 2 },
            1024: { slidesPerView: 3 }
          }}
          className="tour-slider pb-12"
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
                <Card className="overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 bg-white rounded-3xl border-0">
                  <div className="relative">
                    <img 
                      src={tour.image || tour.imageUrl} 
                      alt={tour.name || tour.tourName}
                      className="w-full h-64 object-cover"
                    />
                  </div>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xl font-bold text-gray-900">{tour.name || tour.tourName}</h3>
                      <div className="text-2xl font-bold text-blue-600">
                        {tour.pricing && Object.values(tour.pricing).length > 0
                          ? `₹${Math.min(...Object.values(tour.pricing)).toLocaleString('en-IN')}`
                          : tour.price || '₹--'}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{tour.timeDuration || tour.duration || 'Full Day'}</span>
                      </div>
                      {maxPeople && (
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span>Max {maxPeople} people</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2 mb-6">
                      <p className="text-sm font-medium text-gray-700">Tour Highlights:</p>
                      <div className="flex flex-wrap gap-2">
                        {highlights.length > 0 && highlights.map((highlight, index) => (
                          <span 
                            key={index}
                            className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full"
                          >
                            {highlight}
                          </span>
                        ))}
                      </div>
                    </div>
                    <Button
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl py-3"
                      onClick={() => navigate(`/tours/${tour.tourId || tour.id}`)}
                    >
                      Book This Tour
                    </Button>
                  </CardContent>
                </Card>
              </SwiperSlide>
            );
          })}
        </Swiper>
      </div>
    </section>
  );
}
