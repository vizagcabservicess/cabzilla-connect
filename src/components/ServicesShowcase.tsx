import React, { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Car, Bus, Plane, Route, UserCheck } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import { useNavigate } from 'react-router-dom';
import { SectionHeader } from '@/components/home/SectionHeader';
import { cn } from '@/lib/utils';
import 'swiper/css';
import 'swiper/css/pagination';

type ServiceItem = {
  icon: LucideIcon;
  title: string;
  offer: string;
  validity: string;
  description: string;
  features: string[];
  cardSurface: string;
  iconSurface: string;
  iconColor: string;
  link: string;
};

const services: ServiceItem[] = [
  {
    icon: Car,
    title: 'Local Trips',
    offer: 'Save up to ₹200 on local packages',
    validity: '',
    description: 'Hourly packages for city exploration',
    features: ['8hrs/80km - ₹2,400', '10hrs/100km - ₹3,000', 'Professional drivers'],
    cardSurface: 'bg-gradient-to-br from-white via-[#fbfdff] to-[#eef4ff]',
    iconSurface: 'bg-blue-50',
    iconColor: 'text-blue-600',
    link: '/local-taxi',
  },
  {
    icon: Route,
    title: 'Outstation Travel',
    offer: 'Save up to ₹300 on long journeys',
    validity: '',
    description: 'Comfortable long-distance journeys',
    features: ['Hyderabad - 650km', 'Chennai - 800km', 'Bangalore - 1000km'],
    cardSurface: 'bg-gradient-to-br from-white via-[#f8fbff] to-[#f0f5ff]',
    iconSurface: 'bg-slate-50',
    iconColor: 'text-slate-600',
    link: '/outstation-taxi',
  },
  {
    icon: Plane,
    title: 'Airport Transfers',
    offer: 'Save up to ₹200 on airport rides',
    validity: '',
    description: 'Reliable airport connectivity',
    features: ['On-time guarantee', 'Flight tracking', 'Fixed rates'],
    cardSurface: 'bg-gradient-to-br from-white via-[#fbfdff] to-[#eef4ff]',
    iconSurface: 'bg-blue-50',
    iconColor: 'text-blue-600',
    link: '/airport-taxi',
  },
  {
    icon: Bus,
    title: 'Tempo Traveller Rental',
    offer: 'Save up to ₹500 on group travel',
    validity: '',
    description: 'Perfect for group travel and events',
    features: ['12-18 seater options', 'AC comfort', 'Professional drivers'],
    cardSurface: 'bg-gradient-to-br from-white via-[#f8fbff] to-[#f0f5ff]',
    iconSurface: 'bg-slate-50',
    iconColor: 'text-slate-600',
    link: '/tempo-traveller-rental-vizag',
  },
  {
    icon: UserCheck,
    title: 'Hire a Driver',
    offer: 'Save up to ₹100 with professional drivers',
    validity: '',
    description: 'Professional drivers for your vehicle',
    features: ['Licensed drivers', 'Flexible hours', 'Safe & reliable'],
    cardSurface: 'bg-gradient-to-br from-white via-[#fbfdff] to-[#eef4ff]',
    iconSurface: 'bg-blue-50',
    iconColor: 'text-blue-600',
    link: '/hire-driver',
  },
];

function ServiceCard({
  service,
  onSelect,
}: {
  service: ServiceItem;
  onSelect: () => void;
}) {
  const Icon = service.icon;

  return (
    <Card
      className={cn(
        'group relative h-[320px] cursor-pointer overflow-hidden rounded-3xl border border-slate-200/60 shadow-[0_10px_32px_rgba(15,23,42,0.06)] transition-all duration-300 hover:shadow-xl',
        service.cardSurface,
      )}
      onClick={onSelect}
    >
      <CardContent className="relative z-10 flex h-full flex-col p-5">
        <div className="mb-3 flex flex-shrink-0 items-start justify-between">
          <div className="home-soft-tag rounded-full px-3 py-1 text-xs font-medium">
            {service.title}
          </div>
          <div
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-xl shadow-sm',
              service.iconSurface,
            )}
          >
            <Icon className={cn('h-6 w-6', service.iconColor)} />
          </div>
        </div>

        <h3 className="mb-2 flex-shrink-0 text-lg font-bold leading-tight text-gray-900">
          {service.offer}
        </h3>

        {service.validity ? (
          <p className="mb-3 flex-shrink-0 text-sm text-gray-600">{service.validity}</p>
        ) : null}

        <p className="mb-2 min-h-0 flex-grow text-sm text-gray-600">{service.description}</p>

        <div className="mt-2 flex-shrink-0 space-y-1.5">
          {service.features.map((feature) => (
            <div key={feature} className="flex items-center gap-2 text-xs text-gray-600">
              <div className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-400" />
              <span>{feature}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function ServicesShowcase() {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [swiperInstance, setSwiperInstance] = useState<{ slideTo: (index: number) => void } | null>(null);

  return (
    <section className="home-section-band">
      <div className="home-page-container">
        <SectionHeader
          eyebrow="SERVICES"
          title="Your Journey, Our Priority"
          subtitle="From local city trips to outstation travel, we provide reliable and comfortable transportation solutions for all your needs."
        />

        {/* Desktop Layout - Sliding Row */}
        <div className="services-showcase-track relative mb-4 hidden overflow-hidden xl:block">
          <div
            className="flex gap-4 transition-transform duration-500 ease-in-out"
            style={{
              transform: `translateX(-${Math.min(currentSlide * 50, Math.max(0, (services.length - 4) * 50))}%)`,
            }}
          >
            {services.map((service) => (
              <div key={service.title} className="w-full max-w-[calc(25%-12px)] flex-shrink-0">
                <ServiceCard service={service} onSelect={() => navigate(service.link)} />
              </div>
            ))}
          </div>

          {currentSlide > 0 && (
            <button
              type="button"
              className="absolute -left-5 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-md transition-colors hover:bg-slate-50"
              onClick={() => {
                if (currentSlide > 0) {
                  setCurrentSlide(currentSlide - 1);
                }
              }}
              aria-label="Previous services"
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {services.length > 4 && currentSlide < Math.max(0, services.length - 4) && (
            <button
              type="button"
              className="absolute right-0 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-md transition-colors hover:bg-slate-50"
              onClick={() => {
                const maxSlides = Math.max(0, services.length - 4);
                if (currentSlide < maxSlides) {
                  setCurrentSlide(currentSlide + 1);
                }
              }}
              aria-label="Next services"
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>

        {/* Tablet Layout - Grid */}
        <div className="services-showcase-track mb-4 hidden lg:grid lg:grid-cols-2 lg:gap-4 xl:hidden">
          {services.map((service) => (
            <ServiceCard key={service.title} service={service} onSelect={() => navigate(service.link)} />
          ))}
        </div>

        {/* Mobile Slider */}
        <div className="services-showcase-track relative mb-4 block xl:hidden">
          <Swiper
            modules={[Pagination]}
            spaceBetween={12}
            slidesPerView={1.2}
            pagination={false}
            onSwiper={setSwiperInstance}
            onSlideChange={(swiper) => setCurrentSlide(swiper.activeIndex)}
            className="services-swiper !pb-0"
          >
            {services.map((service) => (
              <SwiperSlide key={service.title} className="!h-auto">
                <ServiceCard service={service} onSelect={() => navigate(service.link)} />
              </SwiperSlide>
            ))}
          </Swiper>

          <div className="mt-4 flex items-center justify-center">
            <div className="flex items-center gap-1">
              {services.map((_, index) => {
                if (index === currentSlide) {
                  return (
                    <div
                      key={index}
                      className="home-slider-dot-active rounded-full px-3 py-1 text-sm font-medium"
                    >
                      {currentSlide + 1}/{services.length}
                    </div>
                  );
                }

                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => swiperInstance?.slideTo(index)}
                    className="h-2 w-2 rounded-full bg-gray-300 opacity-60 transition-all duration-200 hover:opacity-80"
                    aria-label={`Go to service ${index + 1}`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
