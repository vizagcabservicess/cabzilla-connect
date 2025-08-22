import React, { useEffect, useState, useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Car, Users, MapPin, CheckCircle, Star, Shield, Bus, Plane, Tag } from 'lucide-react';
import { getVehicleData } from '@/services/vehicleDataService';
import { Link } from 'react-router-dom';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

export function FleetShowcase() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const swiperRef = useRef<any>(null);
  const [isBeginning, setIsBeginning] = useState(true);
  const [isEnd, setIsEnd] = useState(false);
  const [swiperInstance, setSwiperInstance] = useState<any>(null);

  useEffect(() => {
    async function fetchVehicles() {
      setLoading(true);
      try {
        const data = await getVehicleData(false, false);
        setVehicles(data || []);
      } catch (e) {
        setVehicles([]);
      } finally {
        setLoading(false);
      }
    }
    fetchVehicles();
  }, []);

  // Helper to get vehicle type/category
  function getType(vehicle: any) {
    if (vehicle.vehicleType) return vehicle.vehicleType.toLowerCase();
    if (vehicle.cabTypeId) return vehicle.cabTypeId.toLowerCase();
    return 'other';
  }

  // Helper to get price (per KM or base price)
  function getPrice(vehicle: any) {
    if (vehicle.pricePerKm) return `₹${vehicle.pricePerKm}`;
    if (vehicle.basePrice) return `₹${vehicle.basePrice}`;
    if (vehicle.price) return `₹${vehicle.price}`;
    return '₹--';
  }

  // Helper to get amenities
  function getAmenities(vehicle: any) {
    if (Array.isArray(vehicle.amenities)) return vehicle.amenities;
    if (typeof vehicle.amenities === 'string') return vehicle.amenities.split(',').map((a: string) => a.trim());
    return [];
  }

  // Helper to get capacity
  function getCapacity(vehicle: any) {
    return vehicle.capacity ? `${vehicle.capacity} Pax` : '';
  }

  // Helper to get bg gradient
  function getBgGradient(type: string, index: number) {
    // Apply yellow color to the last vehicle
    if (index === vehicles.length - 1) return 'bg-gradient-to-br from-yellow-50 to-yellow-100';
    
    if (type.toLowerCase().includes('sedan')) return 'bg-gradient-to-br from-[#fff8f0] to-[#fff8f0]';
    if (type.toLowerCase().includes('suv') || type.toLowerCase().includes('ertiga') || type.toLowerCase().includes('innova')) return 'bg-gradient-to-br from-[#fff8f0] to-[#fff8f0]';
    if (type.toLowerCase().includes('tempo')) return 'bg-gradient-to-br from-[#fff8f0] to-[#fff8f0]';
    return 'bg-gradient-to-br from-[#fff8f0] to-[#fff8f0]';
  }

  // Helper to get icon color
  function getIconColor(type: string) {
    if (type.toLowerCase().includes('sedan')) return 'text-blue-600';
    if (type.toLowerCase().includes('suv') || type.toLowerCase().includes('ertiga') || type.toLowerCase().includes('innova')) return 'text-green-600';
    if (type.toLowerCase().includes('tempo')) return 'text-purple-600';
    return 'text-orange-600';
  }

  // Helper to get icon
  function getIcon(type: string) {
    if (type.toLowerCase().includes('sedan')) return Car;
    if (type.toLowerCase().includes('suv') || type.toLowerCase().includes('ertiga') || type.toLowerCase().includes('innova')) return Car;
    if (type.toLowerCase().includes('tempo')) return Bus;
    return Car;
  }

  // Helper to get promo code
  function getPromoCode(vehicle: any, index: number) {
    const type = getType(vehicle);
    if (type.toLowerCase().includes('sedan')) return 'SEDAN200';
    if (type.toLowerCase().includes('suv') || type.toLowerCase().includes('ertiga') || type.toLowerCase().includes('innova')) return 'SUV300';
    if (type.toLowerCase().includes('tempo')) return 'TEMPO500';
    return `FLEET${index + 1}00`;
  }

  // Helper to get offer text
  function getOfferText(vehicle: any) {
    return `${getPrice(vehicle)} per km`;
  }

  // Take first 4 vehicles for the grid, rest for slider
  const gridVehicles = vehicles.slice(0, 4);
  const sliderVehicles = vehicles.slice(4);

  const renderVehicleCard = (vehicle: any, index: number) => {
    const vehicleSlug = vehicle.id ? vehicle.id.toString().trim().toLowerCase().replace(/\s+/g, '-') : '';
    const vehicleType = getType(vehicle);
    const VehicleIcon = getIcon(vehicleType);
    
    return (
      <Card 
        key={vehicle.id || index}
        className="group hover:shadow-xl transition-all duration-300 border-0 bg-white rounded-2xl overflow-hidden cursor-pointer relative h-[380px]"
        onClick={() => window.location.href = `/vehicle/${vehicleSlug}`}
      >
        <CardContent className="p-5 relative h-full flex flex-col">
          {/* Background Pattern */}
          <div className={`absolute inset-0 ${getBgGradient(vehicleType, index)} opacity-50`}></div>
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-transparent via-transparent to-white/20"></div>
          
          {/* Content */}
          <div className="relative z-10 flex flex-col h-full">
            {/* Category Tag */}
            <div className="flex justify-between items-start mb-3">
              <div className="bg-gray-800 text-white px-3 py-1 rounded-full text-xs font-medium">
                {vehicle.name}
              </div>
            </div>

            {/* Main Offer and Passenger Count Row */}
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-bold text-gray-900 leading-tight">
                {getOfferText(vehicle)}
              </h3>
              <div className="inline-flex items-center gap-2 bg-white border-2 border-gray-300 rounded-lg px-3 py-2 text-sm font-medium text-gray-800">
                <Users className="h-4 w-4" />
                {getCapacity(vehicle)}
              </div>
            </div>

            {/* Validity */}
            <p className="text-sm text-gray-600 mb-3">
              Applies for min 300 km during outstation round trip
            </p>

            {/* Vehicle Image */}
            <div className="flex-grow flex items-center justify-center mb-3">
            {vehicle.image && typeof vehicle.image === 'string' && vehicle.image.trim() !== '' ? (
              <img
                src={vehicle.image}
                alt={vehicle.name}
                  className="w-full h-32 object-cover rounded-lg"
                  onError={e => { 
                    (e.target as HTMLImageElement).style.display = 'none'; 
                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                  }}
              />
            ) : (
                <div className="w-full h-32 bg-gray-200 rounded-lg flex items-center justify-center">
                  <Car className="h-12 w-12 text-gray-400" />
              </div>
            )}
            </div>

            {/* Features */}
            <div className="flex flex-wrap gap-2">
              {getAmenities(vehicle).slice(0, 2).map((feature: string, idx: number) => (
                <div key={idx} className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  {feature}
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
            Our Premium Fleet
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Choose from our well-maintained fleet of vehicles, each equipped with professional drivers and modern amenities.
          </p>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center py-10">
            <Car className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            {/* Desktop Layout - Sliding Row */}
            <div className="hidden lg:block mb-8 relative overflow-hidden">
              <div className="flex gap-4 transition-transform duration-500 ease-in-out" style={{ 
                transform: `translateX(-${Math.min(currentSlide * 50, Math.max(0, (gridVehicles.length + sliderVehicles.length - 4) * 50))}%)` 
              }}>
                {/* All vehicles in a single row */}
                {[...gridVehicles, ...sliderVehicles].map((vehicle, index) => (
                  <div key={vehicle.id || index} className="w-full max-w-[calc(25%-12px)] flex-shrink-0">
                    {renderVehicleCard(vehicle, index)}
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
              
              {/* Next Arrow - only show if there are additional vehicles and we're not at the end */}
              {sliderVehicles.length > 0 && currentSlide < Math.max(0, (gridVehicles.length + sliderVehicles.length - 4)) && (
                  <button
                    className="absolute right-0 top-1/2 transform -translate-y-1/2 z-20 w-12 h-12 bg-gray-300 rounded-full shadow-xl flex items-center justify-center hover:bg-gray-400 transition-colors border-2 border-gray-400"
                    onClick={() => {
                      const maxSlides = Math.max(0, gridVehicles.length + sliderVehicles.length - 4);
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
                {gridVehicles.map((vehicle, index) => renderVehicleCard(vehicle, index))}
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
                className="fleet-swiper"
              >
                {vehicles.map((vehicle, index) => (
                  <SwiperSlide key={vehicle.id || index}>
                    {renderVehicleCard(vehicle, index)}
                    </SwiperSlide>
                  ))}
                </Swiper>
                
                {/* Custom Pagination with Dots and Counter */}
                <div className="flex justify-center items-center mt-4">
                  <div className="flex items-center gap-1">
                    {vehicles.map((_, index) => {
                      // Show the counter pill in place of the active dot
                      if (index === currentSlide) {
                        return (
                          <div 
                            key={index}
                            className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium"
                          >
                            {currentSlide + 1}/{vehicles.length}
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
            <span className="font-medium">Safety Guaranteed</span>
          </div>
          <p className="text-sm text-gray-500">
            All vehicles are regularly sanitized and maintained for your safety and comfort.
          </p>
        </div>
      </div>
    </section>
  );
}
