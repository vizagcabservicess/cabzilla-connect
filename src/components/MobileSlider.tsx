import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tag } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

interface ServiceCard {
  icon: React.ComponentType<any>;
  title: string;
  offer?: string;
  validity?: string;
  promoCode?: string;
  description: string;
  features: string[];
  bgColor: string;
  iconColor: string;
  link: string;
  discount?: string;
}

interface MobileSliderProps {
  children: React.ReactNode[];
  className?: string;
  slidesPerView?: number;
  spaceBetween?: number;
  showNavigation?: boolean;
  showPagination?: boolean;
}

export function MobileSlider({ 
  children, 
  className = '', 
  slidesPerView = 1.2, 
  spaceBetween = 12,
  showNavigation = false,
  showPagination = true
}: MobileSliderProps) {
  return (
    <div className={`block md:hidden ${className}`}>
      <Swiper
        modules={[Navigation, Pagination]}
        spaceBetween={spaceBetween}
        slidesPerView={slidesPerView}
        navigation={showNavigation}
        pagination={showPagination ? { clickable: true } : false}
        className="mobile-slider"
        style={{ paddingBottom: '36px' }}
      >
        {children.map((child, index) => (
          <SwiperSlide key={index}>
            {child}
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}

// Service Card Component with ServicesShowcase style
interface ServiceCardProps {
  service: ServiceCard;
  onClick?: () => void;
}

export function ServiceCard({ service, onClick }: ServiceCardProps) {
  return (
    <Card 
      className="group hover:shadow-lg transition-all duration-300 border-0 bg-white rounded-xl overflow-hidden cursor-pointer relative min-h-[220px]"
      onClick={onClick}
    >
      <CardContent className="p-4 pb-5 relative h-full flex flex-col">
        {/* Background Pattern */}
        <div className={`absolute inset-0 ${service.bgColor} opacity-30`}></div>
        
        {/* Content */}
        <div className="relative z-10 flex flex-col h-full min-h-0">
          {/* Category Tag and Icon */}
          <div className="flex justify-between items-start mb-2">
            <div className="bg-gray-800 text-white px-2 py-1 rounded-full text-sm font-medium">
              {service.title}
            </div>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${service.bgColor.replace('bg-gradient-to-br', 'bg')} shadow-sm`}>
              <service.icon className={`h-4 w-4 ${service.iconColor}`} />
            </div>
          </div>

          {/* Main Offer */}
          {service.offer && (
            <h3 className="text-base font-bold text-gray-900 mb-1 leading-tight">
              {service.offer}
            </h3>
          )}

          {/* Validity */}
          {service.validity && (
            <p className="text-sm text-gray-600 mb-1">
              {service.validity}
            </p>
          )}

          {/* Description */}
          <p className="text-sm text-gray-600 mb-2 leading-relaxed flex-grow min-h-0">
            {service.description}
          </p>

          {/* Features */}
          {service.features.length > 0 && (
            <div className="space-y-0.5 mb-3 flex-shrink-0">
              {service.features.slice(0, 2).map((feature, idx) => (
                <div key={idx} className="text-xs text-gray-500 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full flex-shrink-0"></div>
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          )}

          {/* Book Now Button */}
          <div className="mt-auto pt-3">
            <button 
              className="w-full bg-white border border-gray-300 rounded-full px-4 py-2 text-gray-800 font-medium hover:bg-gray-50 transition-colors shadow-sm text-sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (service.link) {
                  window.open(service.link, '_blank');
                }
              }}
            >
              Book Now
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Grid component for desktop/tablet
interface ResponsiveGridProps {
  children: React.ReactNode[];
  mobileSlider?: boolean;
  className?: string;
  gridCols?: string;
}

export function ResponsiveGrid({ 
  children, 
  mobileSlider = true, 
  className = '', 
  gridCols = 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' 
}: ResponsiveGridProps) {
  return (
    <>
      {/* Mobile Slider */}
      {mobileSlider && (
        <MobileSlider className={className}>
          {children}
        </MobileSlider>
      )}
      
      {/* Desktop/Tablet Grid */}
      <div className={`hidden md:grid ${gridCols} gap-3 ${className}`}>
        {children}
      </div>
    </>
  );
}
