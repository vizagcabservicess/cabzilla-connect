import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ExternalLink, Star } from 'lucide-react';
import { FaFacebook, FaInstagram, FaYoutube } from 'react-icons/fa';
import { IconX } from '@/components/IconX';
import { SectionHeader } from '@/components/home/SectionHeader';

export function SocialMediaSection() {
  const socialLinks = [
    {
      name: 'Facebook',
      url: 'https://www.facebook.com/vizagtaxihub',
      color: 'from-blue-500 to-blue-600',
      icon: FaFacebook,
    },
    {
      name: 'Instagram',
      url: 'https://www.instagram.com/vizagtaxihub/',
      color: 'from-pink-400 to-purple-500',
      icon: FaInstagram,
    },
    {
      name: 'YouTube',
      url: 'https://www.youtube.com/channel/UC2-jFwKuTHB357sBeIY4Urr',
      color: 'from-red-400 to-red-500',
      icon: FaYoutube,
    },
    {
      name: 'X',
      url: 'https://twitter.com/vizagtaxihub',
      color: 'from-slate-500 to-slate-700',
      icon: IconX,
    },
  ] as const;

  return (
    <section className="home-section-band--soft px-4">
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          eyebrow="CONNECT"
          title="Follow Our Journey"
          subtitle="Stay updated with our latest offers, customer stories, and travel tips"
        />

        <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
          {socialLinks.map((social) => (
            <Card
              key={social.name}
              className="group overflow-hidden rounded-2xl border-0 bg-white transition-all duration-300 hover:shadow-xl"
            >
              <CardContent className="p-6 text-center">
                <div
                  className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-r ${social.color} transition-transform group-hover:scale-110`}
                >
                  <social.icon className="text-3xl text-white" />
                </div>
                <h3 className="mb-1 font-medium text-gray-900">{social.name}</h3>
                <a
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 transition-colors hover:text-blue-700"
                >
                  Follow <ExternalLink className="h-3 w-3" />
                </a>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-200/60 bg-gradient-to-r from-blue-50 to-slate-50 p-6 text-center">
          <div className="mb-4 flex items-center justify-center gap-2">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <span className="font-bold text-gray-900">4.9/5</span>
          </div>
          <h3 className="mb-2 text-xl font-bold text-gray-900">Love Our Service?</h3>
          <p className="mb-4 text-gray-600">
            Share your experience and help others discover great taxi service
          </p>
          <a
            href="https://g.co/kgs/xMbsKAH"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-[#0066FF] px-6 py-3 font-medium text-white transition-colors hover:bg-[#0052CC]"
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
