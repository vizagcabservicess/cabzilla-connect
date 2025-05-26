
import React from 'react';
import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';

export default function BookingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <Hero 
        title="Book Your Ride" 
        subtitle="Quick and easy booking for all your travel needs"
      />
    </div>
  );
}
