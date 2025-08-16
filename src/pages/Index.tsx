import { Navbar } from "@/components/Navbar";
import { Hero } from '@/components/Hero';
import { ServicesShowcase } from "@/components/ServicesShowcase";
import { FleetShowcase } from "@/components/FleetShowcase";
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

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const isSearch = searchParams.get('search') === '1';

  return (
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
            <TourSlider />
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
  );
};

export default Index;
