import React, { useState, useCallback } from 'react';
import { Navbar } from '@/components/Navbar';
import { MobileNavigation } from '@/components/MobileNavigation';
import { OutstationHero } from '@/components/OutstationHero';
import { CabOptions } from '@/components/CabOptions';
import { Helmet } from 'react-helmet-async';
import { ScrollToTop } from '@/components/ScrollToTop';

export const GunturPage = () => {
  const [showCabOptions, setShowCabOptions] = useState(false);
  const [searchData, setSearchData] = useState<any>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = useCallback((data: any) => {
    console.log('Search triggered with data:', data);
    setSearchData(data);
    setShowCabOptions(true);
    setHasSearched(true);
  }, []);

  return (
    <>
      <Helmet>
        <title>Book Vizag to Guntur Cabs - Safe & Affordable Outstation Taxi</title>
        <meta name="description" content="Book a reliable taxi from Visakhapatnam to Guntur. 410 KM journey in 6-7 hours. Premium outstation services with professional drivers. Best rates guaranteed." />
        <meta name="keywords" content="visakhapatnam to guntur taxi, vizag to guntur cabs, guntur outstation travel, premium taxi service" />
      </Helmet>
      <ScrollToTop />
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        
        {/* Hero Section with Route-specific Search Widget */}
        <OutstationHero
          initialPickup="Visakhapatnam"
          initialDrop="Guntur"
          onSearch={handleSearch}
        />

        {/* Route Description */}
        {!hasSearched && (
          <section className="bg-white py-8">
            <div className="container mx-auto px-4">
              <div className="max-w-4xl mx-auto">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  About Your Trip to Guntur
                </h2>
                <p className="text-gray-600 leading-relaxed">
                  Guntur, a bustling commercial city in Andhra Pradesh, is known for its vibrant culture and spicy cuisine. 
                  The 410 KM journey from Visakhapatnam to Guntur takes around 6–7 hours. Whether you're visiting for 
                  business or leisure, enjoy a premium travel experience with our professional drivers and all-inclusive pricing.
                </p>
                
                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-blue-900 mb-2">Premium Service</h3>
                    <p className="text-blue-700 text-sm">Professional drivers and well-maintained vehicles</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-green-900 mb-2">Driver Allowance Included</h3>
                    <p className="text-green-700 text-sm">No hidden charges for driver accommodation</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-purple-900 mb-2">Toll Charges Included</h3>
                    <p className="text-purple-700 text-sm">All-inclusive transparent pricing</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Cab Options */}
        {showCabOptions && searchData && (
          <CabOptions searchData={searchData} />
        )}
        
        <MobileNavigation />
      </div>
    </>
  );
};

export default GunturPage;