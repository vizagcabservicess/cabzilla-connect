import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Star, Play, ExternalLink } from 'lucide-react';

export function VideoTestimonials() {
  const videoTestimonials = [
    {
      id: "dQw4w9WgXcQ", // Replace with actual video IDs from your YouTube channel
      title: "Hyderabad Trip Experience",
      customer: "Rajesh Kumar",
      rating: 5,
      thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg"
    },
    {
      id: "dQw4w9WgXcQ", // Replace with actual video IDs
      title: "Airport Transfer Review",
      customer: "Priya Sharma", 
      rating: 5,
      thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg"
    },
    {
      id: "dQw4w9WgXcQ", // Replace with actual video IDs
      title: "Local Sightseeing Tour",
      customer: "Venkat Reddy",
      rating: 5,
      thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg"
    }
  ];

  return (
    <section className="px-4 py-8 md:py-12 bg-gray-50">
      <div className="container mx-auto max-w-6xl">
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

        {/* Video Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {videoTestimonials.map((video, index) => (
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
                <div className="absolute top-4 left-4">
                  <div className="text-xs font-semibold text-white/90 uppercase tracking-wide">Watch and Learn</div>
                </div>
              </div>
              {/* Customer and description below image */}
              <div className="bg-white p-5 rounded-b-3xl flex items-center justify-between">
                <div>
                  <div className="text-gray-900 font-semibold text-base mb-1">{video.title}</div>
                  <div className="text-gray-600 text-sm">{video.customer}</div>
                </div>
                <button className="bg-gray-100 hover:bg-gray-200 rounded-full p-3 shadow transition-all ml-4">
                  <Play className="h-6 w-6 text-red-600" />
                </button>
              </div>
            </div>
          ))}
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
