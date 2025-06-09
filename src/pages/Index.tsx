import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { ServicesShowcase } from "@/components/ServicesShowcase";
import { FleetShowcase } from "@/components/FleetShowcase";
import { TourPackages } from "@/components/TourPackages";
import { WhyChooseUs } from "@/components/WhyChooseUs";
import { PopularRoutes } from "@/components/PopularRoutes";
import { TestimonialsSection } from "@/components/TestimonialsSection";
import { VideoTestimonials } from "@/components/VideoTestimonials";
import { SocialMediaSection } from "@/components/SocialMediaSection";
import { FloatingButtons } from "@/components/FloatingButtons";
import { FaFacebook, FaInstagram, FaYoutube } from 'react-icons/fa';
import { SiX } from 'react-icons/si';

const Index = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <Hero />
      
      {/* Main Content with Better Spacing */}
      <div className="space-y-2 md:space-y-4 pb-16">
        <ServicesShowcase />
        <FleetShowcase />
        <TourPackages />
        <WhyChooseUs />
        <PopularRoutes />
        <TestimonialsSection />
        <VideoTestimonials />
        <SocialMediaSection />
      </div>
      
      {/* Enhanced Footer */}
      <footer className="bg-white border-t border-gray-100 py-8 md:py-12 mt-8">
        <div className="container mx-auto px-4 space-y-8">
          {/* Company Info */}
          <div className="text-center md:text-left">
            <div className="flex justify-center md:justify-start mb-4">
              <img src="/lovable-uploads/f403bba2-a984-4a7c-8f77-04dc15363aa8.png" alt="Vizag Taxi Hub" className="h-10 md:h-12" />
            </div>
            <p className="text-sm md:text-base text-gray-600 leading-relaxed max-w-2xl mx-auto md:mx-0 mb-4">
              Vizag Taxi Hub provides you with the most comfortable and affordable outstation, local & hourly taxi services in Visakhapatnam. We place a high priority on customer satisfaction.
            </p>
            <div className="inline-flex items-center gap-2 bg-green-50 px-4 py-2 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-green-700">Available 24/7</span>
            </div>
          </div>

          {/* Quick Links Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 text-sm md:text-base">Services</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>Local Trips</li>
                <li>Outstation</li>
                <li>Airport Transfer</li>
                <li>Car Pooling</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 text-sm md:text-base">Popular Routes</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>Hyderabad</li>
                <li>Chennai</li>
                <li>Bangalore</li>
                <li>Araku Valley</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 text-sm md:text-base">Support</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>Help Center</li>
                <li>Contact Us</li>
                <li>Terms & Conditions</li>
                <li>Privacy Policy</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 text-sm md:text-base">Contact</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p>+91 9966363662</p>
                <p>info@vizagtaxihub.com</p>
                <p className="text-xs">Visakhapatnam, AP</p>
              </div>
            </div>
          </div>

          {/* Social Media Links */}
          <div className="border-t border-gray-100 pt-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-sm text-gray-500 text-center md:text-left">
                © Vizag Taxi Hub {new Date().getFullYear()}. All rights reserved.
              </p>
              
              {/* Social Icons */}
              <div className="flex items-center gap-4">
                <a href="https://www.facebook.com/vizagtaxihub" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-600 transition-colors">
                  <FaFacebook className="text-2xl" />
                </a>
                <a href="https://www.instagram.com/vizagtaxihub/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-pink-600 transition-colors">
                  <FaInstagram className="text-2xl" />
                </a>
                <a href="https://www.youtube.com/channel/UC2-jFwKuTHB357sBeIY4Urg" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-red-600 transition-colors">
                  <FaYoutube className="text-2xl" />
                </a>
                <a href="https://twitter.com/vizagtaxihub" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-black transition-colors">
                  <SiX className="text-2xl" />
                </a>
              </div>
              
              <div className="text-xs text-gray-400">Made with ❤️ in Vizag</div>
            </div>
          </div>
        </div>
      </footer>
      
      {/* Floating Action Buttons */}
      <FloatingButtons />
    </div>
  );
};

export default Index;
