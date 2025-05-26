
import React from 'react';
import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';

export default function PoolingGuestPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <Hero />
      
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-8">Find Your Perfect Ride</h2>
          <p className="text-gray-600 mb-8">
            Connect with fellow travelers and share your journey
          </p>
        </div>
      </div>
    </div>
  );
}
