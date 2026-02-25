import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import { groupTourAPI, type RouteOption } from '@/services/api/groupTourAPI';
import { format } from 'date-fns';
import 'swiper/css';
import 'swiper/css/pagination';

export function PopularGroupTours() {
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [swiperInstance, setSwiperInstance] = useState<any>(null);

  useEffect(() => {
    groupTourAPI.getRoutes().then(setRoutes).catch(() => setRoutes([]));
  }, []);

  const sortedRoutes = [...routes].sort((a, b) => {
    const d1 = a.first_date ?? '';
    const d2 = b.first_date ?? '';
    return d1.localeCompare(d2);
  });

  const gradients = [
    'from-teal-600 via-cyan-700 to-blue-900',
    'from-amber-600 via-orange-600 to-rose-700',
    'from-emerald-600 via-green-700 to-teal-900',
    'from-violet-600 via-purple-700 to-indigo-900',
  ];

  const displayRoutes = sortedRoutes.slice(0, 4);

  const renderTourCard = (route: RouteOption, i: number) => {
    const bgClass = gradients[i % gradients.length];
    const searchUrl = `/group-tours/search?${new URLSearchParams({
      pickup: route.pickup_location,
      dropoff: route.dropoff_location,
      date: route.first_date || new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    })}`;
    const destName = route.title?.trim() || route.dropoff_location || route.label;
    return (
      <Link
        key={i}
        to={searchUrl}
        className="group block rounded-2xl overflow-hidden bg-white border border-slate-100 shadow-sm hover:shadow-xl transition-all"
      >
        <div className={`relative h-44 sm:h-48 bg-gradient-to-br ${bgClass}`}>
          {route.featured_image_url && (
            <img
              src={route.featured_image_url}
              alt=""
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              referrerPolicy="no-referrer"
              loading="lazy"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
          <div className="absolute top-3 right-3 px-3 py-1 rounded-lg bg-blue-500/90 text-white text-xs font-medium shadow whitespace-nowrap">
            {route.first_date
              ? `Tour Date ${format(new Date(route.first_date + 'T12:00:00'), 'dd MMM')}`
              : 'Tour Date Available'}
          </div>
        </div>
        <div className="p-3 flex flex-row items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-slate-800 text-base group-hover:text-blue-600 transition-colors line-clamp-2">
              {destName}
            </h3>
            <p className="text-slate-500 text-xs mt-0.5 font-medium">
              Save up to 60%
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xl font-bold text-slate-800 leading-tight">
              ₹{route.price_from != null ? route.price_from.toLocaleString('en-IN') : '—'}
            </p>
            <p className="text-slate-500 text-xs leading-tight">
              per seat
            </p>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <section className="pt-0 md:pt-2 pb-0 bg-white -mb-4 md:-mb-6">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-4 md:mb-5">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 mb-2">
            Popular Group Tours
          </h2>
          <p className="text-slate-500 text-sm md:text-base max-w-2xl mx-auto mb-1.5">
            Check out our best-selling group tours
          </p>
          <Link
            to="/group-tours/search"
            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium text-sm"
          >
            View All Tours
            <ChevronDown className="h-4 w-4 rotate-[-90deg]" />
          </Link>
        </div>

        {/* Mobile Slider */}
        <div className="md:hidden">
          {displayRoutes.length > 0 ? (
            <>
              <Swiper
                modules={[Pagination]}
                spaceBetween={12}
                slidesPerView={1.2}
                pagination={false}
                onSwiper={setSwiperInstance}
                onSlideChange={(swiper) => setCurrentSlide(swiper.activeIndex)}
                className="popular-group-tours-swiper"
              >
                {displayRoutes.map((route, i) => (
                  <SwiperSlide key={i}>
                    {renderTourCard(route, i)}
                  </SwiperSlide>
                ))}
              </Swiper>
              <div className="flex justify-center items-center mt-4">
                <div className="flex items-center gap-1">
                  {displayRoutes.map((_, index) =>
                    index === currentSlide ? (
                      <div
                        key={index}
                        className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium"
                      >
                        {currentSlide + 1}/{displayRoutes.length}
                      </div>
                    ) : (
                      <button
                        key={index}
                        onClick={() => swiperInstance?.slideTo(index)}
                        className="w-2 h-2 bg-gray-300 opacity-60 rounded-full transition-all duration-200 hover:opacity-80"
                      />
                    )
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex-shrink-0 w-[85%] rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 animate-pulse">
                  <div className="h-44 sm:h-48 bg-slate-200" />
                  <div className="p-4">
                    <div className="h-5 bg-slate-200 rounded w-3/4" />
                    <div className="h-4 bg-slate-200 rounded w-1/2 mt-2" />
                    <div className="h-3 bg-slate-200 rounded w-1/3 mt-2" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tablet & Desktop Grid */}
        <div className="hidden md:block">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {displayRoutes.map((route, i) => (
              <div key={i}>{renderTourCard(route, i)}</div>
            ))}
            {displayRoutes.length === 0 &&
              [...Array(4)].map((_, i) => (
                <div key={i} className="rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 animate-pulse">
                  <div className="h-44 sm:h-48 bg-slate-200" />
                  <div className="p-4">
                    <div className="h-5 bg-slate-200 rounded w-3/4" />
                    <div className="h-4 bg-slate-200 rounded w-1/2 mt-2" />
                    <div className="h-3 bg-slate-200 rounded w-1/3 mt-2" />
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </section>
  );
}
