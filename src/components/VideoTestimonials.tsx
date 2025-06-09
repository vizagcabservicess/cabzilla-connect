
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
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
            Real Customer Stories
          </h2>
          <p className="text-gray-600 text-sm md:text-base max-w-2xl mx-auto">
            Watch what our customers say about their experience with Vizag Taxi Hub
          </p>
        </div>

        {/* Video Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
          {videoTestimonials.map((video, index) => (
            <Card key={index} className="group hover:shadow-xl transition-all duration-300 border-0 bg-white rounded-2xl overflow-hidden cursor-pointer">
              <div className="relative">
                <img 
                  src={video.thumbnail} 
                  alt={video.title}
                  className="w-full h-48 object-cover"
                />
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center group-hover:bg-black/30 transition-colors">
                  <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Play className="h-6 w-6 text-white fill-current ml-1" />
                  </div>
                </div>
                <div className="absolute top-4 right-4">
                  <div className="flex items-center gap-1 bg-white/90 px-2 py-1 rounded-full">
                    {[...Array(video.rating)].map((_, i) => (
                      <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </div>
              </div>
              
              <CardContent className="p-4">
                <h3 className="font-semibold text-gray-900 mb-1">{video.title}</h3>
                <p className="text-sm text-gray-600">{video.customer}</p>
              </CardContent>
            </Card>
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
