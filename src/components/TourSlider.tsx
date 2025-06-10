import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay, EffectCoverflow } from 'swiper/modules';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Clock, Star, Users } from 'lucide-react';
import { motion } from 'framer-motion';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/effect-coverflow';

const tours = [
  {
    id: 1,
    title: "Araku Valley Adventure",
    duration: "2 Days / 1 Night",
    price: "₹8,500",
    rating: 4.8,
    reviews: 124,
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    highlights: ["Coffee Plantations", "Tribal Museum", "Borra Caves", "Valley Views"]
  },
  {
    id: 2,
    title: "Vizag City Heritage Tour",
    duration: "1 Day",
    price: "₹3,200",
    rating: 4.6,
    reviews: 89,
    image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    highlights: ["Kailasagiri", "Submarine Museum", "Beach Walk", "Local Cuisine"]
  },
  {
    id: 3,
    title: "Lambasingi Hill Station",
    duration: "2 Days / 1 Night",
    price: "₹7,800",
    rating: 4.9,
    reviews: 156,
    image: "https://images.unsplash.com/photo-1501436513145-30f24e19fcc4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    highlights: ["Misty Mountains", "Strawberry Gardens", "Tribal Villages", "Nature Walks"]
  },
  {
    id: 4,
    title: "Beaches & Temples Tour",
    duration: "1 Day",
    price: "₹2,800",
    rating: 4.7,
    reviews: 67,
    image: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    highlights: ["RK Beach", "Simhachalam Temple", "Sunset Point", "Local Markets"]
  }
];

export function TourSlider() {
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
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
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
          navigation
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
          {tours.map((tour) => (
            <SwiperSlide key={tour.id}>
              <Card className="overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 bg-white rounded-3xl border-0">
                <div className="relative">
                  <img 
                    src={tour.image} 
                    alt={tour.title}
                    className="w-full h-64 object-cover"
                  />
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      <span className="text-sm font-medium">{tour.rating}</span>
                      <span className="text-xs text-gray-500">({tour.reviews})</span>
                    </div>
                  </div>
                </div>
                
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xl font-bold text-gray-900">{tour.title}</h3>
                    <div className="text-2xl font-bold text-blue-600">{tour.price}</div>
                  </div>
                  
                  <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{tour.duration}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>Max 6 people</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-6">
                    <p className="text-sm font-medium text-gray-700">Tour Highlights:</p>
                    <div className="flex flex-wrap gap-2">
                      {tour.highlights.slice(0, 3).map((highlight, index) => (
                        <span 
                          key={index}
                          className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full"
                        >
                          {highlight}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <Button className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl py-3">
                    Book This Tour
                  </Button>
                </CardContent>
              </Card>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
}
