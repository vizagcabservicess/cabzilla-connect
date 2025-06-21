import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { MobileNavigation } from '@/components/MobileNavigation';
import { OutstationSearchWidget } from '@/components/OutstationSearchWidget';
import { CabOptions } from '@/components/CabOptions';
import { Helmet } from 'react-helmet-async';
import { ScrollToTop } from '@/components/ScrollToTop';
import { Location } from '@/types/location';

export const RoutePage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [routeInfo, setRouteInfo] = useState<{
    from: string;
    to: string;
    distance: string;
    duration: string;
  } | null>(null);
  const [showCabOptions, setShowCabOptions] = useState(false);
  const [searchData, setSearchData] = useState<any>(null);

  useEffect(() => {
    if (!slug) {
      navigate('/outstation-taxi');
      return;
    }

    const parts = slug.split('-to-');
    if (parts.length !== 2) {
      navigate('/404'); // Or a dedicated not found page
      return;
    }
    const fromSlug = parts[0];
    const toSlug = parts[1];

    // Convert slugs to readable names
    const fromName = fromSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const toName = toSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    // Set route info based on the URL params
    setRouteInfo({
      from: fromName,
      to: toName,
      distance: '71 KM',
      duration: '2 Hours'
    });
  }, [slug, navigate]);

  const handleSearch = useCallback((data: any) => {
    console.log('Search triggered with data:', data);
    setSearchData(data);
    setShowCabOptions(true);
  }, []);

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

        {/* Search Widget */}
        <main className="container mx-auto px-4 py-8">
          <OutstationSearchWidget
            initialPickup={routeInfo.from}
            initialDrop={routeInfo.to}
            onSearch={handleSearch}
          />
          
          {/* Cab Options */}
          {showCabOptions && searchData && (
            <div className="mt-8">
              <CabOptions
                cabTypes={searchData.cabTypes}
                selectedCab={searchData.selectedCab}
                onSelectCab={searchData.onSelectCab}
                distance={searchData.distance}
                tripType={searchData.tripType}
                tripMode={searchData.tripMode}
                pickupDate={searchData.pickupDate}
                returnDate={searchData.returnDate}
                isCalculatingFares={searchData.isCalculatingFares}
                selectedCabBreakdown={searchData.selectedCabBreakdown}
              />
            </div>
          )}
        </main>
        
        <MobileNavigation />
      </div>
    </>
  );
};

export default RoutePage;
