import React, { useEffect, useState, useMemo, lazy, Suspense } from 'react';
import { useParams, Link, useNavigate, useLoaderData } from 'react-router-dom';
import { ArrowLeft, Car, Users, Fuel, Loader2, Phone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/Navbar';
import Footer from '@/components/Footer';
import { MobileNavigation } from '@/components/MobileNavigation';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { GalleryItem } from '@/types/cab';
import { vehicleGalleryAPI } from '@/services/api/vehicleGalleryAPI';
import { Helmet } from 'react-helmet-async';
import { getVehicleUrl } from '@/utils/vehicleUrlUtils';
import type { VehicleLoaderData } from '@/loaders/vehicleLoader';
import { getOptimizedImageUrl } from '@/utils/imageOptimization';
import { URBANIA_SEO_DEFAULTS } from '@/seo/urbaniaStaticMeta';

// Lazy load heavy components with prefetch and defer
const ImageGallery = lazy(() => import('@/components/vehicle/ImageGallery'));
const RateCardPanel = lazy(() => import('@/components/vehicle/RateCardPanel'));
const VehicleTabs = lazy(() => import('@/components/vehicle/VehicleTabs'));
const RateCard = lazy(() => import('@/components/vehicle/RateCard'));
const SimilarVehicles = lazy(() => import('@/components/vehicle/SimilarVehicles'));
const VehicleTours = lazy(() => import('@/components/vehicle/VehicleTours'));
const HeroBookingEmbed = lazy(() =>
  import('@/components/Hero').then((m) => ({ default: m.Hero }))
);

// Note: DeferredComponents would be used for non-critical components

// Minimal critical CSS for above-the-fold content - reduced size for faster parsing
const criticalStyles = `
  .vehicle-hero { min-height: 400px; width: 100%; display: block; contain: layout; }
  .vehicle-title { font-size: 2rem; font-weight: 700; line-height: 1.2; margin: 0; contain: layout; }
  .vehicle-meta { display: flex; gap: 1.5rem; align-items: center; min-height: 24px; contain: layout; }
  .image-gallery-container { width: 100%; aspect-ratio: 16/10; display: block; contain: layout; }
  .rate-card-container { contain: layout; }
  .vehicle-tabs-container { contain: layout; }
  .loading-skeleton { background: #f3f4f6; border-radius: 8px; animation: pulse 2s infinite; contain: layout; }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
  @media (max-width: 768px) {
    .vehicle-title { font-size: 1.5rem; }
    .vehicle-meta { flex-direction: column; gap: 0.5rem; }
    .image-gallery-container { aspect-ratio: 16/10; }
  }
`;

interface VehicleData {
  id: string;
  name: string;
  capacity: number;
  /** Per-km rate for JSON-LD Offer (when present from fleet data). */
  pricePerKm?: number;
  fuelType?: string;
  image?: string;
  gallery?: GalleryItem[];
  tags?: string[];
  overview?: string;
  specs?: {
    seatingCapacity?: string;
    fuelType?: string;
    transmission?: string;
    luggage?: string;
    airConditioning?: string;
  };
  inclusions?: string[];
  exclusions?: string[];
  features?: string[];
  seoContent?: {
    title?: string;
    metaDescription?: string;
    keywords?: string;
    localKeywords?: string[];
  };
}

const VehicleDetailPage = () => {
  const { vehicleSlug } = useParams();
  const navigate = useNavigate();
  const loaderData = useLoaderData() as VehicleLoaderData | { error: string } | undefined;
  const [vehicle, setVehicle] = useState<VehicleData | null>(() => {
    if (loaderData && 'vehicle' in loaderData) return loaderData.vehicle as VehicleData;
    return null;
  });
  const [error, setError] = useState<string | null>(() => {
    if (loaderData && 'error' in loaderData) return loaderData.error;
    return null;
  });
  const [similarVehicles, setSimilarVehicles] = useState<any[]>(() => {
    if (loaderData && 'similarVehicles' in loaderData) return loaderData.similarVehicles;
    return [];
  });
  const [galleryImages, setGalleryImages] = useState<GalleryItem[]>([]);
  /** Urbania Hero: hide page content below the widget once user clicks Search (step 2). */
  const [urbaniaEmbedHeroStep, setUrbaniaEmbedHeroStep] = useState(1);
  /** While user edits trip from step 2 (pencil / pickup / date), show gallery + rates again. */
  const [urbaniaRevealPageGrid, setUrbaniaRevealPageGrid] = useState(false);

  useEffect(() => {
    setUrbaniaEmbedHeroStep(1);
    setUrbaniaRevealPageGrid(false);
  }, [vehicleSlug]);

  // Memoize expensive calculations - must be before early returns
  const seoData = useMemo(() => {
    if (!vehicle) return null;

    const isUrbania =
      vehicleSlug === 'urbania' ||
      vehicle.id === 'bus' ||
      (vehicle.name?.toLowerCase().includes('urbania') ?? false);

    if (isUrbania) {
      const title = vehicle.seoContent?.title || URBANIA_SEO_DEFAULTS.title;
      const description = vehicle.seoContent?.metaDescription || URBANIA_SEO_DEFAULTS.description;
      const keywords =
        vehicle.seoContent?.keywords ||
        `${URBANIA_SEO_DEFAULTS.keywords}, ${vehicle.capacity} seater urbania`;
      return {
        title,
        description,
        keywords,
        image:
          galleryImages?.[0]?.url ||
          vehicle.image ||
          URBANIA_SEO_DEFAULTS.ogImageUrl,
        url: URBANIA_SEO_DEFAULTS.canonicalUrl,
      };
    }

    const vehicleType = vehicle.capacity > 12 ? 'mini bus' : vehicle.capacity > 6 ? 'SUV' : 'sedan';
    const vehicleTypeForTitle = vehicle.capacity > 12 ? 'Mini Bus' : vehicle.capacity > 6 ? 'SUV' : 'Sedan';

    const getUniqueDescription = () => {
      if (vehicle.seoContent?.metaDescription) {
        return vehicle.seoContent.metaDescription;
      }

      if (vehicle.capacity > 12) {
        return `${vehicle.name} - ${vehicle.capacity} seater mini bus service in Visakhapatnam. Perfect for group travel, corporate events, and family trips. Spacious and comfortable mini bus with professional driver. Book now for reliable transportation.`;
      } else if (vehicle.capacity > 6) {
        return `${vehicle.name} - ${vehicle.capacity} seater SUV taxi service in Visakhapatnam. Ideal for family trips and group travel. Comfortable SUV with ample space and modern amenities. Professional driver included.`;
      } else {
        return `${vehicle.name} - ${vehicle.capacity} seater sedan taxi service in Visakhapatnam. Perfect for business travel and small groups. Comfortable sedan with AC and professional driver. Best rates guaranteed.`;
      }
    };

    return {
      title: vehicle.seoContent?.title || `${vehicle.name} - ${vehicle.capacity} Seater ${vehicleTypeForTitle} Service in Visakhapatnam | Vizag Taxi Hub`,
      description: getUniqueDescription(),
      keywords:
        vehicle.seoContent?.keywords ||
        `${vehicle.name.toLowerCase()}, ${vehicle.capacity} seater ${vehicleType}, ${vehicleType} service vizag, taxi service visakhapatnam, ${vehicle.tags?.join(', ').toLowerCase() || 'taxi service'}, vizag taxi hub vehicles`,
      image: galleryImages?.[0]?.url || vehicle.image || '/og-image.png',
      url: `https://vizagtaxihub.com${getVehicleUrl(vehicle)}`,
    };
  }, [vehicle, galleryImages, vehicleSlug]);

  // Memoize structured data generation - must be before early returns
  const structuredData = useMemo(() => {
    if (!vehicle || !seoData) return null;

    const isUrbania =
      vehicleSlug === 'urbania' ||
      vehicle.id === 'bus' ||
      (vehicle.name?.toLowerCase().includes('urbania') ?? false);

    if (isUrbania) {
      const cap = vehicle.capacity > 0 ? vehicle.capacity : 13;
      const pricePerKm =
        typeof vehicle.pricePerKm === 'number' && vehicle.pricePerKm > 0
          ? String(vehicle.pricePerKm)
          : '28';
      const primaryImage =
        typeof seoData.image === 'string' && seoData.image.startsWith('http')
          ? seoData.image
          : `https://vizagtaxihub.com${String(seoData.image || '').startsWith('/') ? seoData.image : `/${seoData.image || 'uploads/og-image-urbania.jpg'}`}`;
      return {
        '@context': 'https://schema.org',
        '@type': ['Product', 'Service'],
        name: 'Urbania Premium Van Rental in Visakhapatnam',
        description:
          'Urbania van hire in Vizag for weddings, corporate travel, pilgrimages, and outstation group trips — AC comfort and professional driver.',
        url: seoData.url,
        image: [primaryImage, URBANIA_SEO_DEFAULTS.ogImageUrl],
        brand: { '@type': 'Brand', name: 'Vizag Taxi Hub' },
        provider: {
          '@type': 'LocalBusiness',
          name: 'Vizag Taxi Hub',
          url: 'https://vizagtaxihub.com',
          telephone: '+91-9966363662',
          email: 'info@vizagtaxihub.com',
          address: {
            '@type': 'PostalAddress',
            streetAddress: '44-66-22/4, near Singalamma Temple, Singalammapuram, Kailasapuram',
            addressLocality: 'Visakhapatnam',
            addressRegion: 'Andhra Pradesh',
            postalCode: '530024',
            addressCountry: 'IN',
          },
          geo: {
            '@type': 'GeoCoordinates',
            latitude: 17.7428416,
            longitude: 83.2889633,
          },
          areaServed: { '@type': 'City', name: 'Visakhapatnam' },
          openingHours: 'Mo-Su 00:00-23:59',
          paymentAccepted: 'Cash, Credit Card, UPI, Net Banking',
        },
        // Match Tempo Traveller Offer shape: Product/Merchant validators expect price + UnitPriceSpecification.price
        offers: {
          '@type': 'Offer',
          price: pricePerKm,
          priceCurrency: 'INR',
          priceSpecification: {
            '@type': 'UnitPriceSpecification',
            price: pricePerKm,
            priceCurrency: 'INR',
            unitText: 'per kilometer',
          },
          availability: 'https://schema.org/InStock',
          seller: {
            '@type': 'Organization',
            name: 'Vizag Taxi Hub',
            url: 'https://vizagtaxihub.com',
            telephone: '+919966363662',
          },
        },
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '4.8',
          reviewCount: '127',
          bestRating: '5',
          worstRating: '1',
        },
        category: 'Transportation Services',
        additionalProperty: [
          { '@type': 'PropertyValue', name: 'Capacity', value: `${cap} passengers (approx.)` },
          { '@type': 'PropertyValue', name: 'Air Conditioning', value: 'Yes' },
          { '@type': 'PropertyValue', name: 'Driver', value: 'Professional driver included' },
          { '@type': 'PropertyValue', name: 'Service Area', value: 'Visakhapatnam and Andhra Pradesh' },
        ],
      };
    }

    if (vehicle.id !== 'tempo_traveller') return null;

    return {
      "@context": "https://schema.org",
      "@type": ["Product", "Service"],
      "name": "17 Seater AC Tempo Traveller Rental in Vizag",
      "description": "Best 17 seater tempo traveller rental service in Visakhapatnam with professional drivers, AC comfort, and modern amenities for group travel.",
      "url": seoData?.url,
      "image": [
        `${seoData?.url}/image.jpg`,
        "https://vizagtaxihub.com/cars/tempo.png"
      ],
      "brand": {
        "@type": "Brand",
        "name": "Vizag Taxi Hub"
      },
      "provider": {
        "@type": "LocalBusiness",
        "name": "Vizag Taxi Hub",
        "url": "https://vizagtaxihub.com",
        "telephone": "+91-9966363662",
        "email": "info@vizagtaxihub.com",
        "address": {
          "@type": "PostalAddress",
          "streetAddress": "44-66-22/4, near Singalamma Temple, Singalammapuram, Kailasapuram",
          "addressLocality": "Visakhapatnam",
          "addressRegion": "Andhra Pradesh",
          "postalCode": "530024",
          "addressCountry": "IN"
        },
        "geo": {
          "@type": "GeoCoordinates",
          "latitude": 17.7428416,
          "longitude": 83.2889633
        },
        "areaServed": {
          "@type": "City",
          "name": "Visakhapatnam"
        },
        "openingHours": "Mo-Su 00:00-23:59",
        "paymentAccepted": "Cash, Credit Card, UPI, Net Banking"
      },
      "offers": {
        "@type": "Offer",
        "price": "35",
        "priceCurrency": "INR",
        "priceSpecification": {
          "@type": "UnitPriceSpecification",
          "price": "35",
          "priceCurrency": "INR",
          "unitText": "per kilometer"
        },
        "availability": "https://schema.org/InStock",
        "seller": {
          "@type": "Organization",
          "name": "Vizag Taxi Hub",
          "url": "https://vizagtaxihub.com",
          "telephone": "+919966363662"
        }
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.8",
        "reviewCount": "127",
        "bestRating": "5",
        "worstRating": "1"
      },
      "category": "Transportation Services",
      "additionalProperty": [
        {
          "@type": "PropertyValue",
          "name": "Capacity",
          "value": "17 passengers"
        },
        {
          "@type": "PropertyValue", 
          "name": "Air Conditioning",
          "value": "Yes"
        },
        {
          "@type": "PropertyValue",
          "name": "Driver",
          "value": "Professional driver included"
        },
        {
          "@type": "PropertyValue",
          "name": "Service Area",
          "value": "Visakhapatnam and Andhra Pradesh"
        }
      ]
    };
  }, [vehicle, vehicleSlug, seoData]);

  // Handler functions for booking
  const handleBookOnline = () => {
    if (!vehicle) return;
    // Scroll to top and navigate to home page with booking form
    window.scrollTo({ top: 0, behavior: 'smooth' });
    navigate('/', { state: { selectedVehicle: vehicle, openBooking: true } });
  };

  const handleCallNow = () => {
    // Open phone dialer
    window.location.href = 'tel:+919966363662';
  };

  // Load gallery in background (vehicle comes from route loader)
  useEffect(() => {
    if (!vehicle?.id) return;
    vehicleGalleryAPI
      .getGallery(vehicle.id)
      .then((gallery) => {
        if (gallery.length === 0 && vehicle.image) {
          setGalleryImages([{ url: vehicle.image, alt: vehicle.name }]);
        } else {
          setGalleryImages(gallery);
        }
      })
      .catch(() => {
        if (vehicle.image) {
          setGalleryImages([{ url: vehicle.image, alt: vehicle.name }]);
        }
      });
  }, [vehicle?.id, vehicle?.image, vehicle?.name]);

  if (error) {
    return (
      <>
        <Helmet>
          <title>Vehicle Not Found - Vizag Taxi Hub</title>
          <meta name="description" content="The requested vehicle could not be found. Browse our available vehicles in Visakhapatnam." />
        </Helmet>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">{error}</p>
              <Link to="/" className="text-blue-600 hover:underline">← Back to Vehicles</Link>
            </div>
          </div>
          <MobileNavigation />
        </div>
      </>
    );
  }
  
  if (!vehicle) {
    return (
      <>
        <Helmet>
          <title>Vehicle Not Found - Vizag Taxi Hub</title>
          <meta name="description" content="The requested vehicle could not be found. Browse our available vehicles in Visakhapatnam." />
        </Helmet>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">Vehicle not found</p>
              <Link to="/" className="text-blue-600 hover:underline">← Back to Vehicles</Link>
            </div>
          </div>
          <MobileNavigation />
        </div>
      </>
    );
  }


  return (
    <>
      <Helmet>
        <title>{seoData?.title || 'Vehicle Details - Vizag Taxi Hub'}</title>
        <meta name="description" content={seoData?.description || 'Vehicle details and booking information'} />
        <meta name="keywords" content={seoData?.keywords || 'taxi service, vehicle rental'} />
        
        {/* Critical CSS for above-the-fold content */}
        <style>{criticalStyles}</style>
        
        {/* Preload LCP image early - use optimized URL when backend supports it */}
        {vehicle?.image && (
          <link rel="preload" as="image" href={getOptimizedImageUrl(vehicle.image)} fetchPriority="high" />
        )}
        {structuredData && (
          <script type="application/ld+json">
            {JSON.stringify(structuredData)}
          </script>
        )}
        <meta name="author" content="Vizag Taxi Hub" />
        <meta name="geo.region" content="IN-AP" />
        <meta name="geo.placename" content="Visakhapatnam" />
        <meta name="geo.position" content="17.6868;83.2185" />
        <meta name="ICBM" content="17.6868, 83.2185" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={seoData?.url || 'https://vizagtaxihub.com'} />
        <meta property="og:title" content={seoData?.title || 'Vehicle Details - Vizag Taxi Hub'} />
        <meta property="og:description" content={seoData?.description || 'Vehicle details and booking information'} />
        <meta property="og:image" content={seoData?.image || '/og-image.png'} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:site_name" content="Vizag Taxi Hub" />
        <meta property="og:locale" content="en_IN" />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content={seoData?.url || 'https://vizagtaxihub.com'} />
        <meta property="twitter:title" content={seoData?.title || 'Vehicle Details - Vizag Taxi Hub'} />
        <meta property="twitter:description" content={seoData?.description || 'Vehicle details and booking information'} />
        <meta property="twitter:image" content={seoData?.image || '/og-image.png'} />
        
        {/* Additional SEO */}
        <meta name="robots" content="index, follow" />
        <meta name="language" content="English" />
        <meta name="revisit-after" content="7 days" />
        <link rel="canonical" href={seoData?.url || `https://vizagtaxihub.com/vehicle/${vehicleSlug}`} />
        
        {/* Local Business meta for high-intent fleet pages */}
        {(vehicle?.id === 'tempo_traveller' ||
          vehicleSlug === 'urbania' ||
          vehicle?.id === 'bus') && (
          <>
            <meta name="business:contact_data:locality" content="Visakhapatnam" />
            <meta name="business:contact_data:region" content="Andhra Pradesh" />
            <meta name="business:contact_data:country_name" content="India" />
            <meta name="business:contact_data:phone_number" content="+919966363662" />
          </>
        )}
      </Helmet>
      
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main id="main-content">
        <div className="container mx-auto px-4 py-8 max-w-7xl  pt-20 md:pt-28 pb-16 md:pb-32">
          <Breadcrumb className="mb-6">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/">Home</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/fleet">Fleet</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{vehicle.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {vehicleSlug === 'urbania' && (
            <div className="w-full vehicle-urbania-search-slot mb-4">
              <Suspense fallback={
                <div className="loading-skeleton min-h-[160px] w-full rounded-lg">
                  <div className="min-h-[160px] w-full bg-[#f3f4f6] rounded-lg" />
                </div>
              }>
                <HeroBookingEmbed
                  hideBackground
                  embedCompactLayout
                  embedStretchToShell
                  lockedVehicleSlug="urbania"
                  summaryBackHref="/vehicle/urbania"
                  onStepChange={setUrbaniaEmbedHeroStep}
                  onTripEditOpenChange={setUrbaniaRevealPageGrid}
                />
              </Suspense>
            </div>
          )}

          <div
            className={`grid grid-cols-1 lg:grid-cols-3 ${vehicleSlug === 'urbania' ? 'gap-5 lg:gap-6' : 'gap-8'} ${
              vehicleSlug === 'urbania' &&
              urbaniaEmbedHeroStep >= 2 &&
              !urbaniaRevealPageGrid
                ? 'hidden'
                : ''
            }`}
          >
            <div className="lg:col-span-2 space-y-8">
              {/* Single image area - no duplication */}
              <div className="image-gallery-container" style={{ aspectRatio: '16/10' }}>
                <Suspense fallback={
                  vehicle?.image ? (
                    <div className="w-full overflow-hidden rounded-lg" style={{ aspectRatio: '16/10' }}>
                      <img
                        src={getOptimizedImageUrl(vehicle.image)}
                        alt={`${vehicle.name} - Professional taxi service in Visakhapatnam`}
                        width={800}
                        height={500}
                        className="w-full h-full object-cover rounded-lg"
                        loading="eager"
                        fetchPriority="high"
                      />
                    </div>
                  ) : (
                    <div className="w-full rounded-lg animate-pulse bg-gray-200" style={{ aspectRatio: '16/10' }} />
                  )
                }>
                  <ImageGallery
                    images={galleryImages}
                    vehicleName={vehicle.name}
                    heroImage={vehicle.image}
                  />
                </Suspense>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-4">
                  <div className="flex-1">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{vehicle.name}</h1>
                    
                    {/* Vehicle Tags displayed prominently next to vehicle name */}
                    {vehicle.tags && vehicle.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {vehicle.tags.map((tag: string, idx: number) => (
                          <Badge key={idx} className="bg-blue-100 text-blue-800 border-blue-200">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-6 text-gray-600">
                  <div className="flex items-center">
                    <Fuel className="h-4 w-4 mr-2" />
                    <span>{vehicle.fuelType}</span>
                  </div>
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-2" />
                    <span>{vehicle.capacity} Passengers</span>
                  </div>
                </div>
              </div>

              {vehicleSlug !== 'urbania' && (
              <div className="rate-card-container min-h-[420px]">
                <Suspense fallback={
                  <div className="loading-skeleton" style={{ height: '420px', width: '100%' }}>
                    <div style={{
                      height: '100%',
                      background: '#f3f4f6',
                      borderRadius: '8px'
                    }}></div>
                  </div>
                }>
                  <RateCard vehicleId={vehicle.id} vehicleName={vehicle.name} />
                </Suspense>
              </div>
              )}

              <div className="vehicle-tabs-container min-h-[280px]">
                <Suspense fallback={<div className="loading-skeleton" style={{ height: '280px', width: '100%' }}></div>}>
              <VehicleTabs 
                overview={vehicle.overview} 
                inclusions={vehicle.inclusions}
                exclusions={vehicle.exclusions}
                features={vehicle.features}
                tags={[]} // Empty array since tags are now displayed at the top
              />
                </Suspense>
              </div>

              {/* Special SEO Content for Tempo Traveller - Deferred for better performance */}
              {vehicle.id === 'tempo_traveller' && (
                <Suspense fallback={<div className="loading-skeleton" style={{ height: '800px', width: '100%' }}></div>}>
                <div className="bg-white rounded-xl shadow-sm p-6 mt-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">17 Seater Tempo Traveller in Vizag - Best Group Travel Solution</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Perfect for Group Travel in Visakhapatnam</h3>
                      <ul className="space-y-2 text-gray-600">
                        <li>• Corporate events and meetings</li>
                        <li>• Family group travel and weddings</li>
                        <li>• College and school trips</li>
                        <li>• Pilgrimage tours to Simhachalam, Araku Valley</li>
                        <li>• Airport group transfers</li>
                        <li>• Outstation group tours</li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Popular Tempo Traveller Routes from Vizag</h3>
                      <ul className="space-y-2 text-gray-600">
                        <li>• Vizag to Araku Valley (120 km)</li>
                        <li>• Vizag to Borra Caves (90 km)</li>
                        <li>• Vizag to Lambasingi (100 km)</li>
                        <li>• Vizag to Simhachalam Temple (15 km)</li>
                        <li>• Vizag to Kailasagiri (8 km)</li>
                        <li>• Airport to city transfers</li>
                      </ul>
                    </div>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-6 mb-6">
                    <h3 className="text-xl font-semibold text-blue-900 mb-4">Why Choose Our Tempo Traveller Service in Vizag?</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700 mb-4">
                      <div className="flex items-center">
                        <span className="text-green-600 mr-2">✓</span>
                        <span>Professional drivers with local expertise</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-green-600 mr-2">✓</span>
                        <span>Well-maintained AC tempo travellers</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-green-600 mr-2">✓</span>
                        <span>GPS tracking for safety and security</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-green-600 mr-2">✓</span>
                        <span>Competitive rates starting ₹35/km</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-green-600 mr-2">✓</span>
                        <span>24/7 customer support service</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-green-600 mr-2">✓</span>
                        <span>Flexible booking and payment options</span>
                      </div>
                    </div>
                    <p className="text-gray-700 text-sm">
                      <strong>Additional Benefits:</strong> Free cancellation up to 2 hours before departure, instant booking confirmation, 
                      complimentary water bottles, mobile charging facilities, and experienced drivers familiar with all Vizag routes and destinations.
                    </p>
                  </div>

                  <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6 mb-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">Tempo Traveller Rental Rates in Vizag</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                      <div className="bg-white rounded-lg p-4 shadow-sm">
                        <div className="text-2xl font-bold text-green-600">₹35/km</div>
                        <div className="text-sm text-gray-600">Base Rate for min 300KM during outstation*</div>
                      </div>
                      <div className="bg-white rounded-lg p-4 shadow-sm">
                        <div className="text-2xl font-bold text-blue-600">₹8000</div>
                        <div className="text-sm text-gray-600">Local City Tour for Min 10Hrs 100KM</div>
                      </div>
                      <div className="bg-white rounded-lg p-4 shadow-sm">
                        <div className="text-2xl font-bold text-purple-600">₹13000</div>
                        <div className="text-sm text-gray-600">Araku Valley Day Tour (07:00 AM to 08:00 PM)</div>
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm mt-4 text-center">
                      <strong>Transparent Pricing:</strong> No hidden charges, fuel included, tolls extra. 
                      Best tempo traveller rates in Visakhapatnam with professional service guarantee.
                    </p>
                  </div>

                  <div className="bg-green-50 rounded-lg p-6">
                    <h3 className="text-xl font-semibold text-green-900 mb-4">Book Your AC Tempo Traveller in Vizag Today</h3>
                    <p className="text-gray-700 mb-6 leading-relaxed">
                      Get the best <strong>tempo traveller rental service in Visakhapatnam</strong> with professional drivers, 
                      modern amenities, and competitive rates. Perfect for group travel, corporate events, 
                      family trips, and outstation tours across Andhra Pradesh. Our AC tempo traveller service 
                      ensures comfort, safety, and reliability for all your group transportation needs.
                    </p>
                    
                    <div className="bg-white rounded-lg p-4 mb-6">
                      <h4 className="font-semibold text-gray-900 mb-2">Quick Booking Options:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                        <div>📞 <strong>Call:</strong> +91 9966363662 (Instant booking)</div>
                        <div>💻 <strong>Online:</strong> Book through our website</div>
                        <div>📱 <strong>WhatsApp:</strong> Quick quotes and booking</div>
                        <div>✉️ <strong>Email:</strong> Detailed itinerary planning</div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-4">
                      <Button 
                        onClick={handleCallNow}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
                      >
                        <Phone className="mr-2 h-4 w-4" />
                        Call +91 9966363662
                      </Button>
                      <Button 
                        onClick={handleBookOnline}
                        variant="outline" 
                        className="border-blue-600 text-blue-600 hover:bg-blue-50 px-8 py-3"
                      >
                        <Car className="mr-2 h-4 w-4" />
                        Book Online Now
                      </Button>
                    </div>
                  </div>

                  {/* Internal Links to Tempo Traveller Pages */}
                  <div className="bg-white rounded-xl shadow-sm p-6 mt-8">
                    <h3 className="text-xl font-semibold text-gray-900 mb-6">Explore Our Tempo Traveller Services</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <Link to="/tempo-traveller-rental-vizag" className="block p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                        <h4 className="font-semibold text-blue-900 mb-2">Tempo Traveller Rental</h4>
                        <p className="text-sm text-blue-700">Best tempo traveller rental service in Vizag</p>
                      </Link>
                      <Link to="/17-seater-tempo-traveller-vizag" className="block p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                        <h4 className="font-semibold text-green-900 mb-2">17 Seater Tempo Traveller</h4>
                        <p className="text-sm text-green-700">Perfect for large group travel</p>
                      </Link>
                      <Link to="/12-seater-tempo-traveller-vizag" className="block p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
                        <h4 className="font-semibold text-purple-900 mb-2">12 Seater Tempo Traveller</h4>
                        <p className="text-sm text-purple-700">Ideal for medium group travel</p>
                      </Link>
                      <Link to="/group-travel-tempo-traveller-vizag" className="block p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
                        <h4 className="font-semibold text-orange-900 mb-2">Group Travel</h4>
                        <p className="text-sm text-orange-700">Specialized group travel solutions</p>
                      </Link>
                      <Link to="/corporate-tempo-traveller-vizag" className="block p-4 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">
                        <h4 className="font-semibold text-indigo-900 mb-2">Corporate Transport</h4>
                        <p className="text-sm text-indigo-700">Business travel and corporate events</p>
                      </Link>
                      <Link to="/wedding-tempo-traveller-vizag" className="block p-4 bg-pink-50 rounded-lg hover:bg-pink-100 transition-colors">
                        <h4 className="font-semibold text-pink-900 mb-2">Wedding Transport</h4>
                        <p className="text-sm text-pink-700">Wedding party transportation</p>
                      </Link>
                      <Link to="/pilgrimage-tempo-traveller-vizag" className="block p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors">
                        <h4 className="font-semibold text-yellow-900 mb-2">Pilgrimage Tours</h4>
                        <p className="text-sm text-yellow-700">Religious and pilgrimage tours</p>
                      </Link>
                      <Link to="/mini-bus-travels-vizag" className="block p-4 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors">
                        <h4 className="font-semibold text-teal-900 mb-2">Mini Bus Travels</h4>
                        <p className="text-sm text-teal-700">Mini bus rental services</p>
                      </Link>
                    </div>
                  </div>
                </div>
                </Suspense>
              )}

              {/* Defer VehicleTours to reduce initial scripting load */}
              <div className="min-h-[180px]">
              <Suspense fallback={<div className="animate-pulse bg-gray-200 h-[180px] rounded-lg"></div>}>
              <VehicleTours vehicleId={vehicle.id} vehicleName={vehicle.name} />
              </Suspense>
              </div>
            </div>

            <div className="lg:col-span-1 space-y-6">
              <div className="min-h-[420px]">
                <Suspense fallback={<div className="animate-pulse bg-gray-200 h-[420px] rounded-lg"></div>}>
                  <RateCardPanel vehicleId={vehicle.id} vehicleName={vehicle.name} />
                </Suspense>
              </div>
              <div className="min-h-[320px]">
                <Suspense fallback={<div className="animate-pulse bg-gray-200 h-[320px] rounded-lg"></div>}>
                  <SimilarVehicles vehicles={similarVehicles} />
                </Suspense>
              </div>
            </div>
          </div>
        </div>
        </main>
        <Footer />
        <MobileNavigation />
      </div>
    </>
  );
};

export default VehicleDetailPage;
