
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from './ui/button';
import { getLocalPackagePrice } from '@/lib/packageData';
import { formatPrice } from '@/lib/cabData';
import { Search } from 'lucide-react';

export const Hero = () => {
  const [mainFare, setMainFare] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInitialFare = async () => {
      setLoading(true);
      try {
        // Example values - replace with actual default values as needed
        const packageId = '8hrs-80km';
        const vehicleId = 'sedan';
        
        // Properly await the Promise before setting the state
        const fare = await getLocalPackagePrice(packageId, vehicleId);
        setMainFare(fare);
      } catch (err) {
        console.error('Error fetching package price:', err);
        setError('Unable to load pricing information. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialFare();
  }, []);

  return (
    <section className="relative pt-24 pb-16 md:pb-24 bg-gradient-to-r from-cabBlue-50 to-cabGray-50">
      <div className="container mx-auto px-4 pt-12">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-cabGray-900 mb-3">
            Your Journey, Our Priority
          </h1>
          <p className="text-cabBlue-600 text-lg font-medium uppercase tracking-wider mb-8">
            BOOK A CAB IN MINUTES
          </p>
          
          {loading ? (
            <div className="flex justify-center mb-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <p className="text-red-500 mb-8">{error}</p>
          ) : mainFare ? (
            <p className="text-2xl font-semibold text-gray-800 mb-8">
              Starting from just {formatPrice(mainFare)}
            </p>
          ) : null}
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link to="/cabs/local">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-md text-lg">
                <Search className="mr-2 h-5 w-5" />
                Book a Local Ride
              </Button>
            </Link>
            <Link to="/cabs/outstation">
              <Button variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50 px-8 py-3 rounded-md text-lg">
                Outstation Travel
              </Button>
            </Link>
          </div>
        </div>
      </div>
      
      {/* Features section */}
      <div className="container mx-auto px-4 mt-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-blue-50 p-6 rounded-lg">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">24/7 Availability</h3>
            <p className="text-gray-600">Book a ride anytime, anywhere in Visakhapatnam and surrounding areas.</p>
          </div>
          
          <div className="bg-blue-50 p-6 rounded-lg">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Safety First</h3>
            <p className="text-gray-600">All our drivers are verified and trained for your peace of mind.</p>
          </div>
          
          <div className="bg-blue-50 p-6 rounded-lg">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Transparent Pricing</h3>
            <p className="text-gray-600">No hidden charges. Pay only what you see before booking.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
