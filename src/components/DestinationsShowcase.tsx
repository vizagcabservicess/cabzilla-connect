import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import { Card } from '@/components/ui/card';
import { Award, Check, Flame, Leaf, MapPin, Plus, Shield, Sparkles } from 'lucide-react';
import { tourAPI } from '@/services/api/tourAPI';
import { Link } from 'react-router-dom';
import { getTourUrl } from '@/utils/tourUrlUtils';
import { SectionHeader } from '@/components/home/SectionHeader';
import {
  addTourToBookingWidget,
  isTourBlockedByCart,
  unselectTourFromBookingWidget,
} from '@/lib/addTourToBookingWidget';
import { useTourCart } from '@/hooks/useTourCart';
import { startingTourPrice } from '@/lib/tourVehiclePrice';
import { cn } from '@/lib/utils';

import 'swiper/css';
import 'swiper/css/pagination';

function tourTitle(tour: Record<string, unknown>): string {
  return String(tour.name || tour.tourName || 'Tour');
}

function tourImage(tour: Record<string, unknown>): string {
  return String(tour.image || tour.imageUrl || '').trim();
}

function getPrice(tour: Record<string, unknown>): string {
  const minPrice = startingTourPrice(tour.pricing as Record<string, number>) || Number(tour.minPrice) || 0;
  if (minPrice > 0) return `₹${minPrice.toLocaleString('en-IN')}`;
  return '₹--';
}

function getDays(tour: Record<string, unknown>): number {
  return Number(tour.days) || 0;
}

function getCompactDuration(tour: Record<string, unknown>): string {
  const days = getDays(tour);
  if (days >= 2) return `${days}D / ${Math.max(1, days - 1)}N`;
  const timeDuration = String(tour.timeDuration || '').trim().replace(/\s*\(.*?\)\s*/g, '');
  if (timeDuration) return timeDuration;
  return '1 Day';
}

function getFooterDuration(tour: Record<string, unknown>): string {
  const days = getDays(tour);
  if (days >= 2) {
    const nights = Math.max(1, days - 1);
    return `${days} Day${days > 1 ? 's' : ''} / ${nights} Night${nights > 1 ? 's' : ''}`;
  }
  return getCompactDuration(tour);
}

function getDescription(tour: Record<string, unknown>): string {
  const raw = String(tour.description || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (raw) return raw;
  return `Experience the best of ${tourTitle(tour)} with sightseeing, a private cab, and a local guide.`;
}

function getPromoBadge(tour: Record<string, unknown>): {
  label: string;
  className: string;
  Icon: typeof Award;
} {
  const name = tourTitle(tour).toLowerCase();
  const days = getDays(tour);
  if (name.includes('temple') || name.includes('srikurmam') || name.includes('arasavalli')) {
    return { label: 'Spiritual Journey', className: 'bg-violet-600', Icon: Sparkles };
  }
  if (days >= 3) {
    return { label: 'Best Seller', className: 'bg-amber-500', Icon: Award };
  }
  if (days === 2) {
    return { label: 'Most Popular', className: 'bg-orange-500', Icon: Flame };
  }
  return { label: 'Great for Day Trips', className: 'bg-emerald-600', Icon: Leaf };
}

export function DestinationsShowcase() {
  const { items: cartItems, has: cartHas } = useTourCart();
  const [tours, setTours] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [swiperInstance, setSwiperInstance] = useState<any>(null);
  const swiperRef = useRef<any>(null);

  useEffect(() => {
    async function fetchTours() {
      setLoading(true);
      try {
        const data = await tourAPI.getAvailableTours();
        setTours(data || []);
      } catch {
        setTours([]);
      } finally {
        setLoading(false);
      }
    }
    fetchTours();
  }, []);

  const browseTours = useMemo(() => {
    const available: typeof tours = [];
    const added: typeof tours = [];
    for (const tour of tours) {
      const title = tourTitle(tour);
      const id = String(tour.id || tour.tourId || '');
      if (cartHas(id, title)) {
        added.push(tour);
        continue;
      }
      if (!isTourBlockedByCart(id, title, cartItems)) {
        available.push(tour);
      }
    }
    return [...available, ...added];
  }, [tours, cartItems, cartHas]);

  const ITEMS_PER_VIEW = 4;
  const totalItems = browseTours.length;
  const shouldShowNavigation = totalItems > ITEMS_PER_VIEW;
  const currentWindowStart = currentSlide;
  const currentWindowEnd = Math.min(currentWindowStart + ITEMS_PER_VIEW - 1, totalItems - 1);
  const isAtBeginning = currentWindowStart === 0;
  const isAtEnd = currentWindowEnd === totalItems - 1;
  const currentWindowItems = browseTours.slice(currentWindowStart, currentWindowStart + ITEMS_PER_VIEW);

  const renderTourCard = (tour: any, index: number) => {
    const tourUrl = getTourUrl(tour);
    const title = tourTitle(tour);
    const image = tourImage(tour);
    const badge = getPromoBadge(tour);
    const BadgeIcon = badge.Icon;
    const tourKey = String(tour.id || tour.tourId || index);
    const widgetId = String(tour.id || tour.tourId || '');
    const inCart = cartHas(widgetId, title);

    return (
      <Card
        key={tourKey}
        className="group flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_28px_rgba(15,23,42,0.06)] transition-shadow hover:shadow-[0_14px_36px_rgba(15,23,42,0.12)]"
      >
        <Link to={tourUrl} className="flex min-h-0 flex-1 flex-col">
          <div className="relative h-52 overflow-hidden">
            {image ? (
              <img
                src={image}
                alt={title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-slate-100">
                <MapPin className="h-12 w-12 text-slate-400" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/20" />
            <span
              className={cn(
                'absolute left-3 top-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm',
                badge.className
              )}
            >
              <BadgeIcon className="h-3.5 w-3.5" />
              {badge.label}
            </span>
            <span className="absolute right-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-slate-800 shadow-sm">
              {getCompactDuration(tour)}
            </span>
          </div>

          <div className="flex flex-1 flex-col px-4 pb-3 pt-4">
            <h3 className="line-clamp-2 text-base font-bold leading-snug text-slate-900">
              {title}
            </h3>
            <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-500">
              {getDescription(tour)}
            </p>
            <div className="mt-auto flex items-end justify-between gap-2 pt-3">
              <p className="text-lg font-bold tracking-tight text-slate-900">
                {getPrice(tour)}{' '}
                <span className="text-sm font-medium text-slate-500">Onwards</span>
              </p>
              <p className="text-xs font-medium text-slate-500">{getFooterDuration(tour)}</p>
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-2 px-4 pb-4">
          <button
            type="button"
            className={cn(
              'flex h-11 flex-1 items-center justify-center gap-1.5 text-sm font-semibold transition-colors',
              inCart
                ? 'rounded-full bg-[#E7F8EF] text-emerald-700 hover:bg-[#d8f3e4]'
                : 'rounded-xl bg-blue-600 text-white shadow-sm hover:bg-blue-700'
            )}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (inCart) {
                unselectTourFromBookingWidget(tour);
                return;
              }
              addTourToBookingWidget(tour);
              setCurrentSlide(0);
            }}
          >
            {inCart ? <Check className="h-4 w-4" strokeWidth={2.5} /> : <Plus className="h-4 w-4" />}
            {inCart ? 'Added to My Trip' : 'Add to My Trip'}
          </button>
        </div>
      </Card>
    );
  };

  const handleNext = () => {
    if (!isAtEnd) {
      const nextStart = Math.min(currentWindowStart + 1, totalItems - ITEMS_PER_VIEW);
      setCurrentSlide(nextStart);
    }
  };

  const handlePrev = () => {
    if (!isAtBeginning) {
      const prevStart = Math.max(currentWindowStart - 1, 0);
      setCurrentSlide(prevStart);
    }
  };

  return (
    <section id="home-destinations" className="home-section-band">
      <div className="home-page-container">
        <SectionHeader
          eyebrow="DESTINATIONS"
          title="Explore Amazing Destinations"
          subtitle="Pick the tours you like and add them to your trip."
        >
          <div className="flex flex-wrap justify-center gap-1.5">
            {[
              'Browse our packages',
              'Tap + Add to trip',
              'View or customize',
            ].map((label) => (
              <span
                key={label}
                className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600"
              >
                {label}
              </span>
            ))}
          </div>
        </SectionHeader>

        {loading ? (
          <div className="flex justify-center py-10">
            <MapPin className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : browseTours.length === 0 ? (
          <p className="rounded-2xl bg-white px-4 py-8 text-center text-sm text-slate-500">
            No tour packages available right now. Please check back shortly.
          </p>
        ) : (
          <>
            <div className="relative mb-4 hidden overflow-hidden lg:block">
              <div className="flex justify-center gap-4">
                {currentWindowItems.map((tour, index) => (
                  <div key={tour.id || tour.tourId || index} className="w-full max-w-[calc(25%-12px)]">
                    {renderTourCard(tour, currentWindowStart + index)}
                  </div>
                ))}
                {currentWindowItems.length < ITEMS_PER_VIEW &&
                  Array.from({ length: ITEMS_PER_VIEW - currentWindowItems.length }).map((_, index) => (
                    <div key={`empty-${index}`} className="invisible w-full max-w-[calc(25%-12px)]">
                      <div className="h-[420px]" />
                    </div>
                  ))}
              </div>

              {shouldShowNavigation && !isAtBeginning && (
                <button
                  className="absolute -left-5 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-md transition-colors hover:bg-slate-50"
                  onClick={handlePrev}
                >
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}

              {shouldShowNavigation && !isAtEnd && (
                <button
                  className="absolute right-0 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-md transition-colors hover:bg-slate-50"
                  onClick={handleNext}
                >
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
            </div>

            <div className="mb-4 hidden grid-cols-2 gap-4 md:grid lg:hidden">
              {browseTours.slice(0, 4).map((tour, index) => renderTourCard(tour, index))}
            </div>

            <div className="mb-4 md:hidden">
              <Swiper
                modules={[Pagination]}
                spaceBetween={12}
                slidesPerView={1.15}
                pagination={false}
                onSwiper={(swiper) => {
                  setSwiperInstance(swiper);
                  swiperRef.current = swiper;
                }}
                onSlideChange={(swiper) => setCurrentSlide(swiper.activeIndex)}
                className="destinations-swiper"
              >
                {browseTours.map((tour, index) => (
                  <SwiperSlide key={tour.id || tour.tourId || index} className="h-auto">
                    {renderTourCard(tour, index)}
                  </SwiperSlide>
                ))}
              </Swiper>

              <div className="mt-4 flex items-center justify-center">
                <div className="flex items-center gap-1">
                  {browseTours.map((_, index) => {
                    if (index === currentSlide) {
                      return (
                        <div
                          key={index}
                          className="home-slider-dot-active rounded-full px-3 py-1 text-sm font-medium"
                        >
                          {currentSlide + 1}/{browseTours.length}
                        </div>
                      );
                    }
                    return (
                      <button
                        key={index}
                        onClick={() => swiperInstance?.slideTo(index)}
                        className="h-2 w-2 rounded-full bg-gray-300 opacity-60 transition-all duration-200 hover:opacity-80"
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}

        <div className="mt-4 rounded-2xl bg-gray-50 p-4 text-center">
          <div className="mb-2 flex items-center justify-center gap-2 text-green-600">
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
