import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { MobileNavigation } from '@/components/MobileNavigation';
import { OutstationHero } from '@/components/OutstationHero';
import { CabOptions } from '@/components/CabOptions';
import { Helmet } from 'react-helmet-async';
import { ScrollToTop } from '@/components/ScrollToTop';
import { getRouteBySlug } from '@/lib/routeData';

export const RoutePage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [routeInfo, setRouteInfo] = useState<{
    from: string;
    to: string;
    distance: string;
    duration: string;
    description?: string;
    content?: string;
    seo?: {
      title?: string;
      description?: string;
      keywords?: string;
      faq?: { question: string; answer: string }[];
      extraContent?: string;
    };
  } | null>(null);
  const [showCabOptions, setShowCabOptions] = useState(false);
  const [searchData, setSearchData] = useState<any>(null);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (!slug) {
      navigate('/outstation-taxi');
      return;
    }

    const parts = slug.split('-to-');
    if (parts.length !== 2) {
      navigate('/404');
      return;
    }
    const fromSlug = parts[0];
    const toSlug = parts[1];

    const routeData = getRouteBySlug(fromSlug, toSlug);

    if (routeData) {
      setRouteInfo({
        from: routeData.from,
        to: routeData.to,
        distance: routeData.distance,
        duration: routeData.time,
        description: routeData.description,
        content: routeData.content,
        seo: routeData.seo,
      });
    } else {
      setRouteInfo({
        from: fromSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        to: toSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        distance: 'N/A',
        duration: 'N/A',
        description: 'No description available.',
        content: '',
        seo: {
          title: `${fromSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} to ${toSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Taxi | Book Outstation Cab`,
          description: `Book a reliable taxi from ${fromSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} to ${toSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}. N/A journey in N/A. Best rates guaranteed.`,
          keywords: '',
        },
      });
    }
  }, [slug, navigate]);

  useEffect(() => {
    setShowCabOptions(false);
    setSearchData(null);
    setHasSearched(false);
  }, [slug]);

  const handleSearch = useCallback((data: any) => {
    console.log('Search triggered with data:', data);
    setSearchData(data);
    setShowCabOptions(true);
    setHasSearched(true);
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
        <title>{routeInfo.seo?.title || `${routeInfo.from} to ${routeInfo.to} Taxi | Book Outstation Cab`}</title>
        <meta name="description" content={routeInfo.seo?.description || `Book a reliable taxi from ${routeInfo.from} to ${routeInfo.to}. ${routeInfo.distance} journey in ${routeInfo.duration}. Best rates guaranteed.`} />
        <meta name="keywords" content={routeInfo.seo?.keywords || ''} />
      </Helmet>
      <ScrollToTop />
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        
        {/* Hero Section with Route-specific Search Widget */}
        <OutstationHero
          initialPickup={routeInfo.from}
          initialDrop={routeInfo.to}
          onSearch={handleSearch}
        />

        {/* Route Description */}
        {!hasSearched && (
          <section className="bg-white py-8">
            <div className="container mx-auto px-4">
              <div className="max-w-4xl mx-auto">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  About Your Trip to {routeInfo.to}
                </h2>
                {routeInfo.content ? (
                  <div className="text-gray-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: routeInfo.content }} />
                ) : (
                  <p className="text-gray-600 leading-relaxed">
                    Journey from {routeInfo.from} to {routeInfo.to}, a town celebrated for its scenic beauty and cultural heritage. 
                    This {routeInfo.distance} route takes approximately {routeInfo.duration} and offers breathtaking views of the countryside. 
                    Book your comfortable cab ride with professional drivers and enjoy a hassle-free travel experience.
                  </p>
                )}
              </div>
            </div>
          </section>
        )}
        
        {/* FAQ Section */}
        {routeInfo?.seo?.faq && routeInfo.seo.faq.length > 0 && !hasSearched && (
          <section className="bg-white py-8 mt-8">
            <div className="container mx-auto px-4">
              <div className="max-w-4xl mx-auto">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h3>
                <div className="space-y-4">
                  {routeInfo.seo.faq.map((item, idx) => (
                    <div key={idx}>
                      <div className="font-semibold text-gray-800">{item.question}</div>
                      <div className="text-gray-600">{item.answer}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}
        
        {/* Extra SEO Content */}
        {routeInfo?.seo?.extraContent && !hasSearched && (
          <section className="bg-white py-8 mt-4">
            <div className="container mx-auto px-4">
              <div className="max-w-4xl mx-auto">
                <div className="text-gray-600" dangerouslySetInnerHTML={{ __html: routeInfo.seo.extraContent }} />
              </div>
            </div>
          </section>
        )}
        
        <MobileNavigation />
      </div>
    </>
  );
};

export default RoutePage;