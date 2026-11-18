import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { MobileNavigation } from '@/components/MobileNavigation';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { resolvePublicHead } from '@/seo/publicPageMeta';
import { resetPageScroll } from '@/lib/bookingWidgetScroll';
import {
  applySharedBuildTrip,
  isBuildTripDeepLink,
} from '@/lib/buildYourTrip';
import { openTourListPanel } from '@/lib/addTourToBookingWidget';
import { applyVthAiCheckoutPrefill } from '@/lib/vthAiCheckoutPrefill';
import { lazyWithRetry } from '@/utils/dynamicImportRetry';

/** Below-fold / non-critical home modules — same UI, loaded after Hero can paint. */
const DestinationsShowcase = lazyWithRetry(
  () =>
    import('@/components/DestinationsShowcase').then((m) => ({
      default: m.DestinationsShowcase,
    })),
  { moduleName: 'DestinationsShowcase' },
);
const PopularGroupTours = lazyWithRetry(
  () =>
    import('@/components/PopularGroupTours').then((m) => ({
      default: m.PopularGroupTours,
    })),
  { moduleName: 'PopularGroupTours' },
);
const FleetShowcase = lazyWithRetry(
  () =>
    import('@/components/FleetShowcase').then((m) => ({
      default: m.FleetShowcase,
    })),
  { moduleName: 'FleetShowcase' },
);
const TempoTravellerShowcase = lazyWithRetry(
  () =>
    import('@/components/TempoTravellerShowcase').then((m) => ({
      default: m.TempoTravellerShowcase,
    })),
  { moduleName: 'TempoTravellerShowcase' },
);
const ServicesShowcase = lazyWithRetry(
  () =>
    import('@/components/ServicesShowcase').then((m) => ({
      default: m.ServicesShowcase,
    })),
  { moduleName: 'ServicesShowcase' },
);
const WhyChooseUs = lazyWithRetry(
  () =>
    import('@/components/WhyChooseUs').then((m) => ({
      default: m.WhyChooseUs,
    })),
  { moduleName: 'WhyChooseUs' },
);
const PopularRoutes = lazyWithRetry(
  () =>
    import('@/components/PopularRoutes').then((m) => ({
      default: m.PopularRoutes,
    })),
  { moduleName: 'PopularRoutes' },
);
const EnhancedCTA = lazyWithRetry(
  () =>
    import('@/components/EnhancedCTA').then((m) => ({
      default: m.EnhancedCTA,
    })),
  { moduleName: 'EnhancedCTA' },
);
const TestimonialsSection = lazyWithRetry(
  () =>
    import('@/components/TestimonialsSection').then((m) => ({
      default: m.TestimonialsSection,
    })),
  { moduleName: 'TestimonialsSection' },
);
const VideoTestimonials = lazyWithRetry(
  () =>
    import('@/components/VideoTestimonials').then((m) => ({
      default: m.VideoTestimonials,
    })),
  { moduleName: 'VideoTestimonials' },
);
const SocialMediaSection = lazyWithRetry(
  () =>
    import('@/components/SocialMediaSection').then((m) => ({
      default: m.SocialMediaSection,
    })),
  { moduleName: 'SocialMediaSection' },
);
const SharedCarpoolingPopup = lazyWithRetry(
  () =>
    import('@/components/SharedCarpoolingBanner').then((m) => ({
      default: m.SharedCarpoolingPopup,
    })),
  { moduleName: 'SharedCarpoolingPopup' },
);
const HomeOfferCampaignPopup = lazyWithRetry(
  () =>
    import('@/components/offers/HomeOfferCampaignPopup').then((m) => ({
      default: m.HomeOfferCampaignPopup,
    })),
  { moduleName: 'HomeOfferCampaignPopup' },
);
const Footer = lazyWithRetry(
  () => import('@/components/Footer'),
  { moduleName: 'Footer' },
);

const homeBelowFoldImports = [
  () => import('@/components/DestinationsShowcase'),
  () => import('@/components/PopularGroupTours'),
  () => import('@/components/FleetShowcase'),
  () => import('@/components/TempoTravellerShowcase'),
  () => import('@/components/ServicesShowcase'),
  () => import('@/components/WhyChooseUs'),
  () => import('@/components/PopularRoutes'),
  () => import('@/components/EnhancedCTA'),
  () => import('@/components/TestimonialsSection'),
  () => import('@/components/VideoTestimonials'),
  () => import('@/components/SocialMediaSection'),
  () => import('@/components/Footer'),
  () => import('@/components/SharedCarpoolingBanner'),
  () => import('@/components/offers/HomeOfferCampaignPopup'),
] as const;

function prefetchHomeBelowFold() {
  for (const load of homeBelowFoldImports) {
    void load().catch(() => {});
  }
}

// Sync before Hero mounts so loadFromSessionStorage sees AI checkout prefill
if (typeof window !== 'undefined') {
  try {
    const bootParams = new URLSearchParams(window.location.search);
    applyVthAiCheckoutPrefill(bootParams);
    if (isBuildTripDeepLink(bootParams)) applySharedBuildTrip(bootParams);
  } catch {
    /* ignore */
  }
}

const Index = () => {
  const homeHead = resolvePublicHead('/');
  const [searchParams, setSearchParams] = useSearchParams();
  const isSearch =
    searchParams.get('search') === '1' || searchParams.get('step') === 'guest';

  useEffect(() => {
    applyVthAiCheckoutPrefill(searchParams);
  }, [searchParams]);

  useEffect(() => {
    if (!isSearch) {
      resetPageScroll();
    }
  }, [isSearch]);

  useEffect(() => {
    if (isSearch || !isBuildTripDeepLink(searchParams)) return;
    const shared = applySharedBuildTrip(searchParams);
    if (shared.length > 0) openTourListPanel();
  }, [isSearch, searchParams]);

  // Start below-fold chunks immediately so sections match live as soon as possible.
  useEffect(() => {
    prefetchHomeBelowFold();
  }, []);

  return (
    <>
      <Helmet>
        {/* Title, description, canonical and Open Graph come from PublicHead. */}
        <meta name="keywords" content="taxi vizag, cab booking visakhapatnam, airport taxi vizag, outstation taxi, local taxi, car rental vizag, taxi service visakhapatnam" />
        <meta name="author" content="Vizag Taxi Hub" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Vizag Taxi Hub" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content={homeHead?.ogUrl} />
        <meta property="twitter:title" content={homeHead?.ogTitle} />
        <meta property="twitter:description" content={homeHead?.ogDescription} />
        <meta property="twitter:image" content={homeHead?.ogImage} />
        <meta name="robots" content="index, follow" />
        <meta name="language" content="English" />
        <meta name="revisit-after" content="7 days" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": ["LocalBusiness", "TaxiService"],
            "name": "Vizag Taxi Hub",
            "url": "https://vizagtaxihub.com/",
            "telephone": "+91 99663 63662",
            "email": "info@vizagtaxihub.com",
            "foundingDate": "2020",
            "areaServed": "Visakhapatnam",
            "address": {
              "@type": "PostalAddress",
              "streetAddress": "44-66-22/4, near Singalamma Temple, Singalammapuram, Kailasapuram",
              "addressLocality": "Visakhapatnam",
              "addressRegion": "Andhra Pradesh",
              "postalCode": "530024",
              "addressCountry": "IN"
            },
            "sameAs": [
              "https://www.facebook.com/vizagtaxihub",
              "https://www.instagram.com/vizagtaxihub",
              "https://play.google.com/store/apps/details?id=com.vizagtaxihub.app"
            ]
          })}
        </script>
      </Helmet>
      
      <div className="home-soft-page min-h-screen flex flex-col">
        <Navbar />
        {/* Home carpool promo popup — off for now */}
        <Suspense fallback={null}>
          <SharedCarpoolingPopup enabled={false} />
          {/* Active campaign coupon popup on homepage (Airport / Local) */}
          {!isSearch && !isBuildTripDeepLink(searchParams) && <HomeOfferCampaignPopup enabled />}
        </Suspense>
        <main className="flex-1">
          <ErrorBoundary>
            <Hero
              onSearch={() => {
                resetPageScroll();
                setSearchParams({ search: '1' });
              }}
              isSearchActive={isSearch}
              pageDefaultTripType="outstation"
              pageDefaultTripMode="one-way"
            />
          </ErrorBoundary>
          
          {/* Main Content — soft premium rhythm (same sections/order as live) */}
          {!isSearch && (
            <Suspense fallback={null}>
              <div className="space-y-0 md:space-y-0">
                <DestinationsShowcase />
                <PopularGroupTours hideWhenEmpty />
                <FleetShowcase />
                <TempoTravellerShowcase />
                <ServicesShowcase />
                <WhyChooseUs />
                <PopularRoutes />
                <EnhancedCTA />
                <TestimonialsSection />
                <VideoTestimonials />
                <SocialMediaSection />
              </div>
            </Suspense>
          )}
        </main>
        
        <Suspense fallback={null}>
          <Footer />
        </Suspense>

        {/* Mobile Navigation */}
        <MobileNavigation />
      </div>
    </>
  );
};

export default Index;
