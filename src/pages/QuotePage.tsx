
import React from 'react';
import { Navbar } from '@/components/Navbar';

export default function QuotePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Get a Quote</h1>
        <p className="text-gray-600">Request a quote for your travel needs.</p>
      </div>
    </div>
  );
}
