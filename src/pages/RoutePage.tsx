
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { MobileNavigation } from '@/components/MobileNavigation';
import { Hero } from '@/components/Hero';
import { Helmet } from 'react-helmet-async';
import { ScrollToTop } from '@/components/ScrollToTop';
import { Location } from '@/types/location';

export const RoutePage = () => {
  const { fromSlug, toSlug } = useParams();
  const navigate = useNavigate();
  const [routeInfo, setRouteInfo] = useState<{
    from: string;
    to: string;
    distance: string;
    duration: string;
  } | null>(null);

  useEffect(() => {
    if (!fromSlug || !toSlug) {
      navigate('/outstation-taxi');
      return;
    }

    // Convert slugs to readable names
    const fromName = fromSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const toName = toSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    // Set route info based on the URL params
    setRouteInfo({
      from: fromName,
      to: toName,
      distance: '71 KM', // Default distance for the example
      duration: '2 Hours'
    });

    // Prefill the Hero component with route data by triggering search
    const prefillData = {
      pickupLocation: {
        name: fromName,
        address: fromName,
        lat: 17.6868,
        lng: 83.2185,
        isInVizag: true
      } as Location,
      dropLocation: {
        name: toName,
        address: toName,
        lat: 17.9784,
        lng: 82.9344,
        isInVizag: false
      } as Location,
      tripType: 'outstation' as const,
      tripMode: 'one-way' as const,
      pickupDate: new Date(),
      autoTriggerSearch: true
    };

    // Store prefill data for Hero component
    sessionStorage.setItem('routePrefillData', JSON.stringify(prefillData));
    
    // Trigger a custom event to notify Hero component
    const event = new CustomEvent('routePrefill', { detail: prefillData });
    window.dispatchEvent(event);
  }, [fromSlug, toSlug, navigate]);

  if (!routeInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{`${routeInfo.from} to ${routeInfo.to} Taxi | Book Outstation Cab`}</title>
        <meta name="description" content={`Book a reliable taxi from ${routeInfo.from} to ${routeInfo.to}. ${routeInfo.distance} journey in ${routeInfo.duration}. Best rates guaranteed.`} />
      </Helmet>
      <ScrollToTop />
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        
        {/* Hero Section with Route Info */}
        <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-12">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              {routeInfo.from} to {routeInfo.to}
            </h1>
            <p className="text-lg mb-2">
              Discover lush landscapes and nearby waterfalls, a perfect nature escape.
            </p>
            <div className="flex justify-center items-center gap-8 text-sm">
              <span>~{routeInfo.distance}</span>
              <span>~{routeInfo.duration}</span>
            </div>
          </div>
        </section>

        {/* Route Description */}
        <section className="bg-white py-8">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                About Your Trip to {routeInfo.to}
              </h2>
              <p className="text-gray-600 leading-relaxed">
                Journey from {routeInfo.from} to {routeInfo.to}, a town celebrated for its scenic beauty and cultural heritage. 
                This {routeInfo.distance} route takes approximately {routeInfo.duration} and offers breathtaking views of the countryside. 
                Book your comfortable cab ride with professional drivers and enjoy a hassle-free travel experience.
              </p>
            </div>
          </div>
        </section>

        {/* Booking Interface */}
        <main className="container mx-auto px-4 py-8 pb-24">
          <Hero />
        </main>
        
        <MobileNavigation />
      </div>
    </>
  );
};

export default RoutePage;
