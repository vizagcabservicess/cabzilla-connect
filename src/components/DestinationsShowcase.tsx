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

  // Helper functions (simplified)
  function getPrice(tour: any) {
    if (tour.pricing && Object.keys(tour.pricing).length > 0) {
      const prices = Object.values(tour.pricing) as number[];
      const minPrice = Math.min(...prices);
      return `₹${minPrice.toLocaleString('en-IN')}`;
    }
    if (tour.minPrice) return `₹${tour.minPrice.toLocaleString('en-IN')}`;
    return '₹--';
  }

  function getDuration(tour: any) {
    if (tour.timeDuration) return tour.timeDuration;
    if (tour.days) return `${tour.days} day${tour.days > 1 ? 's' : ''}`;
    return 'Full Day';
  }

  function getHighlights(tour: any) {
    if (tour.sightseeingPlaces && Array.isArray(tour.sightseeingPlaces)) {
      return tour.sightseeingPlaces.slice(0, 2);
    }
    if (tour.inclusions && Array.isArray(tour.inclusions)) {
      return tour.inclusions.slice(0, 2);
    }
    return ['Scenic Views', 'Local Guide'];
  }

  const renderTourCard = (tour: any, index: number) => {
    const tourSlug = tour.id ? tour.id.toString().trim().toLowerCase().replace(/\s+/g, '-') : '';

    return (
      <div
        key={tour.id || index}
        className="bg-white rounded-xl p-4 border border-gray-100 hover:shadow-lg transition-shadow cursor-pointer"
        onClick={() => window.location.href = `/tours/${tourSlug}`}
      >
        <div className="flex justify-between items-start mb-3">
          <span className="bg-gray-800 text-white px-2 py-1 rounded-full text-xs font-medium">
            {tour.name}
          </span>
          <span className="text-xs text-gray-600 bg-gray-50 border rounded-lg px-2 py-1 font-medium">
            {getDuration(tour)}
          </span>
        </div>

        <h3 className="text-lg font-bold text-gray-900 mb-2">{getPrice(tour)} Onwards</h3>

        <div className="flex items-center justify-center mb-3 h-24">
          {tour.image && typeof tour.image === 'string' && tour.image.trim() !== '' ? (
            <img
              src={tour.image}
              alt={tour.name}
              className="w-full h-full object-cover rounded-lg"
              onError={e => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full bg-gray-200 rounded-lg flex items-center justify-center">
              <MapPin className="h-8 w-8 text-gray-400" />
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {getHighlights(tour).map((highlight: string, idx: number) => (
            <div key={idx} className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              {highlight}
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
            Explore Amazing Destinations
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Discover the beauty of Andhra Pradesh with our carefully curated tour packages.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <MapPin className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {tours.slice(0, 8).map(renderTourCard)}
          </div>
        )}

        <div className="text-center mt-8 bg-gray-50 rounded-xl p-4">
          <div className="flex items-center justify-center gap-2 text-green-600 mb-2">
            <Shield className="h-4 w-4" />
            <span className="font-medium text-sm">Expert Guides</span>
          </div>
          <p className="text-xs text-gray-500">
            All tours are led by experienced local guides who know the best spots and hidden gems.
          </p>
        </div>
      </div>
    </section>
  );
}
