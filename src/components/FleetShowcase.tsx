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

  // Helper functions (simplified)
  function getType(vehicle: any) {
    return vehicle.vehicleType || vehicle.cabTypeId || 'other';
  }

  function getPrice(vehicle: any) {
    if (vehicle.pricePerKm) return `₹${vehicle.pricePerKm}`;
    if (vehicle.basePrice) return `₹${vehicle.basePrice}`;
    if (vehicle.price) return `₹${vehicle.price}`;
    return '₹--';
  }

  function getAmenities(vehicle: any) {
    if (Array.isArray(vehicle.amenities)) return vehicle.amenities;
    if (typeof vehicle.amenities === 'string') return vehicle.amenities.split(',').map((a: string) => a.trim());
    return [];
  }

  function getCapacity(vehicle: any) {
    return vehicle.capacity ? `${vehicle.capacity} Pax` : '';
  }

  const renderVehicleCard = (vehicle: any, index: number) => {
    const vehicleSlug = vehicle.id ? vehicle.id.toString().trim().toLowerCase().replace(/\s+/g, '-') : '';
    
    return (
      <div 
        key={vehicle.id || index}
        className="bg-white rounded-xl p-4 border border-gray-100 hover:shadow-lg transition-shadow cursor-pointer"
        onClick={() => window.location.href = `/vehicle/${vehicleSlug}`}
      >
        <div className="flex justify-between items-start mb-3">
          <span className="bg-gray-800 text-white px-2 py-1 rounded-full text-xs font-medium">
            {vehicle.name}
          </span>
          <div className="inline-flex items-center gap-2 bg-gray-50 border rounded-lg px-2 py-1 text-xs font-medium text-gray-800">
            <Users className="h-3 w-3" />
            {getCapacity(vehicle)}
          </div>
        </div>
        
        <h3 className="text-lg font-bold text-gray-900 mb-1">{getPrice(vehicle)} per km</h3>
        <p className="text-sm text-gray-600 mb-3">Applies for min 300 km during outstation round trip</p>
        
        <div className="flex items-center justify-center mb-3 h-24">
          {vehicle.image && typeof vehicle.image === 'string' && vehicle.image.trim() !== '' ? (
            <img
              src={vehicle.image}
              alt={vehicle.name}
              className="w-full h-full object-cover rounded-lg"
              onError={e => { 
                (e.target as HTMLImageElement).style.display = 'none'; 
              }}
            />
          ) : (
            <div className="w-full h-full bg-gray-200 rounded-lg flex items-center justify-center">
              <Car className="h-8 w-8 text-gray-400" />
            </div>
          )}
        </div>
        
        <div className="flex flex-wrap gap-2">
          {getAmenities(vehicle).slice(0, 2).map((feature: string, idx: number) => (
            <div key={idx} className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              {feature}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <section className="pt-4 md:pt-8 pb-0 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
            Our Premium Fleet
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Choose from our well-maintained fleet of vehicles, each equipped with professional drivers and modern amenities.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Car className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {vehicles.slice(0, 8).map(renderVehicleCard)}
          </div>
        )}

        <div className="text-center mt-8 bg-gray-50 rounded-xl p-4">
          <div className="flex items-center justify-center gap-2 text-green-600 mb-2">
            <Shield className="h-4 w-4" />
            <span className="font-medium text-sm">Safety Guaranteed</span>
          </div>
          <p className="text-xs text-gray-500">
            All vehicles are regularly sanitized and maintained for your safety and comfort.
          </p>
        </div>
      </div>
    </section>
  );
}
