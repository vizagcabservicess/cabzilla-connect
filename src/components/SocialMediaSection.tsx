import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ExternalLink, Star, Users, Heart } from 'lucide-react';
import { FaFacebook, FaInstagram, FaYoutube } from 'react-icons/fa';
import { SiX } from 'react-icons/si';

export function SocialMediaSection() {
  const socialLinks = [
    {
      name: 'Facebook',
      url: 'https://www.facebook.com/vizagtaxihub',
      color: 'from-blue-600 to-blue-700',
      followers: '2.5K+',
      icon: FaFacebook
    },
    {
      name: 'Instagram', 
      url: 'https://www.instagram.com/vizagtaxihub/',
      color: 'from-pink-500 to-purple-600',
      followers: '1.8K+',
      icon: FaInstagram
    },
    {
      name: 'YouTube',
      url: 'https://www.youtube.com/channel/UC2-jFwKuTHB357sBeIY4Urg',
      color: 'from-red-600 to-red-700', 
      followers: '850+',
      icon: FaYoutube
    },
    {
      name: 'X (formerly Twitter)',
      url: 'https://twitter.com/vizagtaxihub',
      color: 'from-gray-900 to-black',
      followers: '1.2K+',
      icon: SiX
    }
  ];

  return (
    <section className="px-4 py-8 md:py-12 bg-white">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-purple-50 px-4 py-2 rounded-full mb-4">
            <Heart className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-600">CONNECT WITH US</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
            Follow Our Journey
          </h2>
          <p className="text-gray-600 text-sm md:text-base max-w-2xl mx-auto">
            Stay updated with our latest offers, customer stories, and travel tips
          </p>
        </div>

        {/* Social Media Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {socialLinks.map((social, index) => (
            <Card key={index} className="group hover:shadow-xl transition-all duration-300 border-0 bg-white rounded-2xl overflow-hidden">
              <CardContent className="p-6 text-center">
                <div className={`w-16 h-16 bg-gradient-to-r ${social.color} rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}>
                  <social.icon className="text-3xl text-white" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{social.name}</h3>
                <p className="text-sm text-gray-600 mb-3">{social.followers} followers</p>
                <a
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
                >
                  Follow <ExternalLink className="h-3 w-3" />
                </a>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Google Reviews CTA */}
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <span className="font-bold text-gray-900">4.8/5</span>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Love Our Service?</h3>
          <p className="text-gray-600 mb-4">Share your experience and help others discover great taxi service</p>
          <a
            href="https://g.co/kgs/xMbsKAH"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-3 rounded-xl font-medium transition-colors"
          >
            <Star className="h-5 w-5" />
            <span>Write a Google Review</span>
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
