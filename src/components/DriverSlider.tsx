import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import { Tag, CheckCircle, Badge } from 'lucide-react';
import 'swiper/css';
import 'swiper/css/pagination';

interface DriverSliderProps {
  title: string;
  items: Array<{
    icon?: React.ComponentType<{ className?: string }>;
    title: string;
    description?: string;
    iconColor?: string;
    image?: string; // Add support for images
    // Service-specific properties
    price?: string;
    duration?: string;
    features?: string[];
    popular?: boolean;
  }>;
  type: 'benefits' | 'services';
}

export function DriverSlider({ title, items, type }: DriverSliderProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [swiperInstance, setSwiperInstance] = useState<any>(null);

    return (
    <section className="pt-4 md:pt-12 pb-0 bg-white">
      <div className="max-w-7xl mx-auto px-4 pb-2">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 pt-2">
            {title}
          </h2>
        </div>

        {/* Desktop Layout - Grid (keeping original structure) */}
        <div className="hidden md:block mb-8">
          <div className={`grid gap-6 ${type === 'benefits' ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
                         {items.map((item, index) => (
               <Card key={index} className={`group hover:shadow-xl transition-all duration-300 border-0 bg-white rounded-2xl overflow-hidden relative ${type === 'benefits' ? 'h-[250px]' : 'h-[320px]'}`}>
                 <CardContent className="p-5 relative h-full flex flex-col">
                                       {/* Background - Image for benefits with images, Pattern for others */}
                    {type === 'benefits' && item.image ? (
                      <div className="absolute inset-0">
                        <img 
                          src={item.image} 
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0"></div>
                      </div>
                    ) : (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-br from-[#fff8f0] to-[#fff8f0] opacity-50"></div>
                        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-transparent via-transparent to-white/20"></div>
                      </>
                    )}
                   
                   {/* Content */}
                   <div className="relative z-10 flex flex-col h-full">
                     {/* Popular Badge */}
                     {item.popular && (
                       <div className="absolute top-4 right-4 z-20">
                         <div className="bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-medium">
                           Most Popular
                         </div>
                       </div>
                     )}

                                           {/* Category Tag and Icon/Image */}
                      <div className="flex justify-between items-start mb-3">
                        <div className="bg-gray-800 text-white px-3 py-1 rounded-full text-xs font-medium">
                          {item.title}
                        </div>
                        {!item.image && item.icon && (
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#fff8f0] shadow-sm">
                            <item.icon className={`h-6 w-6 ${item.iconColor || 'text-black-600'}`} />
                          </div>
                        )}
                      </div>

                     {/* Main Content */}
                     <div className="flex-grow flex flex-col">
                       {type === 'services' && item.price ? (
                         // Service card with pricing
                         <>
                           <div className="flex items-center justify-between mb-3">
                             <span className="text-2xl font-bold text-black-600">{item.price}</span>
                             <span className="text-sm text-gray-600">{item.duration}</span>
                           </div>
                           {item.features && (
                             <ul className="space-y-2 mb-4 flex-grow">
                               {item.features.map((feature, idx) => (
                                 <li key={idx} className="text-sm text-gray-700 flex items-start">
                                   <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                                   {feature}
                                 </li>
                               ))}
                             </ul>
                           )}
                         </>
                       ) : (
                         // Benefits card
                         <div className="flex flex-col justify-center items-left text-left flex-grow">
                           <h3 className="text-lg font-bold text-gray-900 mb-2 leading-light">
                             {item.title}
                           </h3>
                           <p className="text-sm text-gray-600 leading-relaxed w-40">
                             {item.description}
                           </p>
                         </div>
                       )}
                     </div>
                   </div>
                 </CardContent>
               </Card>
             ))}
          </div>
        </div>

                {/* Mobile Slider */}
        <div className="block md:hidden mb-2 relative">
          <Swiper
            modules={[Pagination]}
            spaceBetween={12}
            slidesPerView={1.2}
            pagination={false}
            onSwiper={setSwiperInstance}
            onSlideChange={(swiper) => setCurrentSlide(swiper.activeIndex)}
            className="services-swiper"
          >
            {items.map((item, index) => (
              <SwiperSlide key={index}>
                                 <Card 
                   className={`group hover:shadow-xl transition-all duration-300 border-0 bg-white rounded-2xl overflow-hidden relative ${type === 'benefits' ? 'h-[250px]' : 'h-[320px]'}`}
                 >
                   <CardContent className="p-5 relative h-full flex flex-col">
                     {/* Background - Image for benefits with images, Pattern for others */}
                     {type === 'benefits' && item.image ? (
                       <div className="absolute inset-0">
                         <img 
                           src={item.image} 
                           alt={item.title}
                           className="w-full h-full object-cover"
                         />
                         <div className="absolute inset-0"></div>
                       </div>
                     ) : (
                       <>
                         <div className="absolute inset-0 bg-gradient-to-br from-[#fff8f0] to-[#fff8f0] opacity-50"></div>
                         <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-transparent via-transparent to-white/20"></div>
                       </>
                     )}
                     
                     {/* Content */}
                     <div className="relative z-10 flex flex-col h-full">
                       {/* Popular Badge */}
                       {item.popular && (
                         <div className="absolute top-4 right-4 z-20">
                           <div className="bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-medium">
                             Most Popular
                           </div>
                         </div>
                       )}

                                               {/* Category Tag and Icon/Image */}
                        <div className="flex justify-between items-start mb-3">
                          <div className="bg-gray-800 text-white px-3 py-1 rounded-full text-xs font-medium">
                            {item.title}
                          </div>
                          {!item.image && item.icon && (
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm">
                              <item.icon className={`h-6 w-6 ${item.iconColor || 'text-black-600'}`} />
                            </div>
                          )}
                        </div>

                       {/* Main Content */}
                       <div className="flex-grow flex flex-col">
                         {type === 'services' && item.price ? (
                           // Service card with pricing
                           <>
                             <div className="flex items-center justify-between mb-3">
                               <span className="text-2xl font-bold text-black-600">{item.price}</span>
                               <span className="text-sm text-gray-600">{item.duration}</span>
                             </div>
                             {item.features && (
                               <ul className="space-y-2 mb-4 flex-grow">
                                 {item.features.map((feature, idx) => (
                                   <li key={idx} className="text-sm text-gray-700 flex items-start">
                                     <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                                     {feature}
                                   </li>
                                 ))}
                               </ul>
                             )}
                           </>
                         ) : (
                           // Benefits card
                           <div className="flex flex-col justify-center items-left text-left flex-grow">
                             <h3 className="text-lg font-bold text-gray-900 mb-2 leading-tight">
                               {item.title}
                             </h3>
                             <p className="text-sm text-gray-600 leading-relaxed w-40">
                               {item.description}
                             </p>
                           </div>
                         )}
                       </div>
                     </div>
                   </CardContent>
                 </Card>
              </SwiperSlide>
            ))}
          </Swiper>
          
          {/* Custom Pagination with Dots and Counter */}
          <div className="flex justify-center items-center mt-4">
            <div className="flex items-center gap-1">
              {items.map((_, index) => {
                // Show the counter pill in place of the active dot
                if (index === currentSlide) {
                  return (
                    <div 
                      key={index}
                      className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium"
                    >
                      {currentSlide + 1}/{items.length}
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
      </div>
    </section>
  );
}
