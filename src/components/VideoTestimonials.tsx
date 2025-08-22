import React, { useState, useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import { Card, CardContent } from '@/components/ui/card';
import { Star, Play, ExternalLink } from 'lucide-react';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

export function VideoTestimonials() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [swiperInstance, setSwiperInstance] = useState<any>(null);

  const videoTestimonials = [
    {
      id: "wrgfamvCkns",
      title: "Customer Video Testimonial",
      customer: "YouTube Shorts",
      rating: 5,
      thumbnail: "https://img.youtube.com/vi/wrgfamvCkns/maxresdefault.jpg",
      url: "https://www.youtube.com/shorts/wrgfamvCkns"
    },
    {
      id: "ROa7qu67ECA",
      title: "Customer Video Testimonial",
      customer: "YouTube Shorts",
      rating: 5,
      thumbnail: "https://img.youtube.com/vi/ROa7qu67ECA/maxresdefault.jpg",
      url: "https://www.youtube.com/shorts/ROa7qu67ECA"
    },
    {
      id: "QUUuoF04zfk",
      title: "Customer Video Testimonial",
      customer: "YouTube Shorts",
      rating: 5,
      thumbnail: "https://img.youtube.com/vi/QUUuoF04zfk/maxresdefault.jpg",
      url: "https://www.youtube.com/shorts/QUUuoF04zfk"
    },
    {
      id: "abc123def",
      title: "Family Trip Experience",
      customer: "YouTube Shorts",
      rating: 5,
      thumbnail: "https://img.youtube.com/vi/wrgfamvCkns/maxresdefault.jpg",
      url: "https://www.youtube.com/shorts/wrgfamvCkns"
    },
    {
      id: "xyz789ghi",
      title: "Business Travel Review",
      customer: "YouTube Shorts",
      rating: 5,
      thumbnail: "https://img.youtube.com/vi/ROa7qu67ECA/maxresdefault.jpg",
      url: "https://www.youtube.com/shorts/ROa7qu67ECA"
    },
    {
      id: "mno456pqr",
      title: "Weekend Getaway",
      customer: "YouTube Shorts",
      rating: 5,
      thumbnail: "https://img.youtube.com/vi/QUUuoF04zfk/maxresdefault.jpg",
      url: "https://www.youtube.com/shorts/QUUuoF04zfk"
    }
  ];

  const gridVideos = videoTestimonials.slice(0, 3);
  const sliderVideos = videoTestimonials.slice(3);

  const renderVideoCard = (video: any, index: number) => {
    return (
      <div key={index} className="bg-white rounded-3xl shadow-md overflow-hidden flex flex-col group transition-all duration-300 hover:shadow-xl">
        <div className="relative">
          <img 
            src={video.thumbnail} 
            alt={video.title}
            className="w-full h-64 object-cover"
          />
          {/* Gradient overlay for subtitle readability */}
          <div className="absolute top-0 left-0 w-full h-16 bg-gradient-to-b from-black/30 to-transparent rounded-t-3xl"></div>
          {/* Subtitle overlay */}
        
        </div>
        {/* Customer and description below image */}
        <div className="bg-white p-5 rounded-b-3xl flex items-center justify-between">
          <div>
            <div className="text-gray-900 font-semibold text-base mb-1">{video.title}</div>
            <div className="text-gray-600 text-sm">{video.customer}</div>
          </div>
          <a href={video.url} target="_blank" rel="noopener noreferrer" className="bg-gray-100 hover:bg-gray-200 rounded-full p-3 shadow transition-all ml-4">
            <Play className="h-6 w-6 text-red-600" />
          </a>
        </div>
      </div>
    );
  };

  return (
    <section className="px-4 py-8 md:py-12 bg-gray-50">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-red-50 px-4 py-2 rounded-full mb-4">
            <Play className="h-4 w-4 text-red-600 fill-current" />
            <span className="text-sm font-medium text-red-600">VIDEO TESTIMONIALS</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-medium text-gray-900 mb-3">
            Real Customer Stories
          </h2>
          <p className="text-gray-600 text-sm md:text-base max-w-2xl mx-auto">
            Watch what our customers say about their experience with Vizag Taxi Hub
          </p>
        </div>

        {/* Desktop Layout - Sliding Row */}
        <div className="hidden lg:block mb-8 relative overflow-hidden">
          <div className="flex gap-6 transition-transform duration-500 ease-in-out" style={{ 
            transform: `translateX(-${Math.min(currentSlide * 50, Math.max(0, (gridVideos.length + sliderVideos.length - 3) * 50))}%)` 
          }}>
            {/* All videos in a single row */}
            {[...gridVideos, ...sliderVideos].map((video, index) => (
              <div key={index} className="w-full max-w-[calc(33.333%-16px)] flex-shrink-0">
                {renderVideoCard(video, index)}
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

          {/* Next Arrow - only show if there are additional videos and we're not at the end */}
          {sliderVideos.length > 0 && currentSlide < Math.max(0, (gridVideos.length + sliderVideos.length - 3)) && (
            <button
              className="absolute right-0 top-1/2 transform -translate-y-1/2 z-20 w-12 h-12 bg-gray-300 rounded-full shadow-xl flex items-center justify-center hover:bg-gray-400 transition-colors border-2 border-gray-400"
              onClick={() => {
                const maxSlides = Math.max(0, gridVideos.length + sliderVideos.length - 3);
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
          <div className="grid grid-cols-3 gap-6">
            {gridVideos.map((video, index) => renderVideoCard(video, index))}
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
            className="video-testimonials-swiper"
          >
            {gridVideos.map((video, index) => (
              <SwiperSlide key={index}>
                {renderVideoCard(video, index)}
              </SwiperSlide>
            ))}
          </Swiper>
          
          {/* Custom Pagination with Dots and Counter */}
          <div className="flex justify-center items-center mt-4">
            <div className="flex items-center gap-1">
              {gridVideos.map((_, index) => {
                // Show the counter pill in place of the active dot
                if (index === currentSlide) {
                  return (
                    <div 
                      key={index}
                      className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium"
                    >
                      {currentSlide + 1}/{gridVideos.length}
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

        {/* YouTube Channel Link */}
        <div className="text-center">
          <a 
            href="https://www.youtube.com/@vizagtaxihub" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
          >
            <Play className="h-5 w-5" />
            <span>Watch More on YouTube</span>
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
