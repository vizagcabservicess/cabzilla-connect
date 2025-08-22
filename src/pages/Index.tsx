import { Navbar } from "@/components/Navbar";
import { Hero } from '@/components/Hero';
import { ServicesShowcase } from "@/components/ServicesShowcase";
import { FleetShowcase } from "@/components/FleetShowcase";
import { DestinationsShowcase } from "@/components/DestinationsShowcase";
import { TourSlider } from "@/components/TourSlider";
import { WhyChooseUs } from "@/components/WhyChooseUs";
import { PopularRoutes } from "@/components/PopularRoutes";
import { TestimonialsSection } from "@/components/TestimonialsSection";
import { VideoTestimonials } from "@/components/VideoTestimonials";
import { SocialMediaSection } from "@/components/SocialMediaSection";
import { EnhancedCTA } from "@/components/EnhancedCTA";
import { FaFacebook, FaInstagram, FaYoutube } from 'react-icons/fa';
import { SiX } from 'react-icons/si';
import { useSearchParams } from 'react-router-dom';
import { QuickActionBar } from '@/components/QuickActionBar';
import Footer from '@/components/Footer';
import { Helmet } from 'react-helmet-async';

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const isSearch = searchParams.get('search') === '1';

  return (
    <>
      <Helmet>
        <title>Vizag Taxi Hub - Best Cab Services in Visakhapatnam | Local, Outstation & Airport</title>
        <meta name="description" content="Vizag Taxi Hub - Your trusted partner for all transportation needs in Visakhapatnam. Book sedans, SUVs, and mini buses for local trips, outstation journeys, airport transfers, and exclusive tour packages. 24/7 service with professional drivers." />
        <meta name="keywords" content="taxi vizag, cab booking visakhapatnam, airport taxi vizag, outstation taxi, local taxi, car rental vizag, taxi service visakhapatnam" />
        <meta name="author" content="Vizag Taxi Hub" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://vizagtaxihub.com/" />
        <meta property="og:title" content="Vizag Taxi Hub - Best Cab Services in Visakhapatnam" />
        <meta property="og:description" content="Book reliable and affordable taxi services in Visakhapatnam. Local trips, outstation journeys, airport transfers, and tour packages." />
        <meta property="og:image" content="/og-image.png" />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://vizagtaxihub.com/" />
        <meta property="twitter:title" content="Vizag Taxi Hub - Best Cab Services in Visakhapatnam" />
        <meta property="twitter:description" content="Book reliable and affordable taxi services in Visakhapatnam. Local trips, outstation journeys, airport transfers, and tour packages." />
        <meta property="twitter:image" content="/og-image.png" />
        
        {/* Additional SEO */}
        <meta name="robots" content="index, follow" />
        <meta name="language" content="English" />
        <meta name="revisit-after" content="7 days" />
        <link rel="canonical" href="https://vizagtaxihub.com/" />
        
        {/* Structured Data for Rich Results */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "Vizag Taxi Hub",
            "url": "https://vizagtaxihub.com",
            "logo": "https://vizagtaxihub.com/og-image.png",
            "description": "Your trusted partner for all transportation needs in Visakhapatnam. Book sedans, SUVs, and mini buses for local trips, outstation journeys, airport transfers, and exclusive tour packages.",
            "address": {
              "@type": "PostalAddress",
              "streetAddress": "44-66-22/4, near Singalamma Temple, Singalammapuram, Kailasapuram",
              "addressLocality": "Visakhapatnam",
              "addressRegion": "Andhra Pradesh",
              "postalCode": "530024",
              "addressCountry": "IN"
            },
            "contactPoint": {
              "@type": "ContactPoint",
              "telephone": "+91-9966363662",
              "contactType": "customer service",
              "availableLanguage": "English, Telugu, Hindi"
            },
            "sameAs": [
              "https://www.facebook.com/vizagtaxihub",
              "https://www.instagram.com/vizagtaxihub"
            ]
          })}
        </script>
      </Helmet>
      
      <div className="min-h-screen bg-white flex flex-col pt-20">
        <Navbar />
        <main className="flex-1">
          <Hero
            key={isSearch ? 'search' : 'home'}
            onSearch={() => setSearchParams({ search: '1' })}
            isSearchActive={isSearch}
          />
          
          {/* Main Content with Optimized Spacing */}
          {!isSearch && (
            <div className="space-y-8 md:space-y-12">
              <ServicesShowcase />
              <FleetShowcase />
              <DestinationsShowcase />
             
              <WhyChooseUs />
              <PopularRoutes />
              <EnhancedCTA />
              <TestimonialsSection />
              <VideoTestimonials />
              <SocialMediaSection />
            </div>
          )}
        </main>
        
        <Footer />
        
        {/* Floating Action Buttons */}
        <QuickActionBar />
      </div>
    </>
  );
};

export default Index;
