
import React from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <Hero />
      
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-8">Our Services</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold mb-4">Cab Booking</h3>
              <p className="text-gray-600 mb-4">Book reliable cabs for your travel needs</p>
              <Link to="/login">
                <Button>Book Now</Button>
              </Link>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold mb-4">Ride Pooling</h3>
              <p className="text-gray-600 mb-4">Share rides and save money</p>
              <Link to="/pooling">
                <Button>Explore Rides</Button>
              </Link>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold mb-4">Tour Packages</h3>
              <p className="text-gray-600 mb-4">Discover amazing tour packages</p>
              <Link to="/about">
                <Button>Learn More</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
