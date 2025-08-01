import { FaFacebook, FaInstagram, FaYoutube } from 'react-icons/fa';
import { SiX } from 'react-icons/si';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white py-12 md:py-16 mt-16">
      <div className="container mx-auto px-8 md:px-12 lg:px-16 space-y-12">
        {/* Company Info */}
        <div className="text-center md:text-left">
          <div className="flex justify-center md:justify-start mb-6">
            <img src="/lovable-uploads/f403bba2-a984-4a7c-8f77-04dc15363aa8.png" alt="Vizag Taxi Hub" className="h-12 md:h-14" />
          </div>
          <p className="text-base md:text-lg text-gray-300 leading-relaxed max-w-3xl mx-auto md:mx-0 mb-6">
            Vizag Taxi Hub provides you with the most comfortable and affordable outstation, local & hourly taxi services in Visakhapatnam. We place a high priority on customer satisfaction and safety.
          </p>
          <div className="inline-flex items-center gap-3 bg-green-600/20 px-6 py-3 rounded-2xl border border-green-500/30">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-lg font-semibold text-green-400">Available 24/7</span>
          </div>
        </div>

        {/* Quick Links Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <h3 className="font-medium text-white mb-4 text-lg">Services</h3>
            <ul className="space-y-3 text-gray-300">
              <li>
                <Link to="/local-taxi" className="hover:text-white transition-colors block">Local Taxi</Link>
              </li>
              <li>
                <Link to="/outstation-taxi" className="hover:text-white transition-colors block">Outstation</Link>
              </li>
              <li>
                <Link to="/airport-taxi" className="hover:text-white transition-colors block">Airport Transfer</Link>
              </li>
              <li>
                <Link to="/tours" className="hover:text-white transition-colors block">Tour Packages</Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-white mb-4 text-lg">Popular Routes</h3>
            <ul className="space-y-3 text-gray-300">
              <li className="hover:text-white transition-colors cursor-pointer">Hyderabad</li>
              <li className="hover:text-white transition-colors cursor-pointer">Chennai</li>
              <li className="hover:text-white transition-colors cursor-pointer">Bangalore</li>
              <li className="hover:text-white transition-colors cursor-pointer">Araku Valley</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-white mb-4 text-lg">Support</h3>
            <ul className="space-y-3 text-gray-300">
              <li className="hover:text-white transition-colors cursor-pointer">Help Center</li>
              <li className="hover:text-white transition-colors cursor-pointer">Contact Us</li>
              <li className="hover:text-white transition-colors cursor-pointer">Terms & Conditions</li>
              <li className="hover:text-white transition-colors cursor-pointer">Privacy Policy</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-white mb-4 text-lg">Contact</h3>
            <div className="space-y-3 text-gray-300">
              <p className="text-lg font-semibold text-white">+91 9966363662</p>
              <p>info@vizagtaxihub.com</p>
              <p>Visakhapatnam, Andhra Pradesh</p>
            </div>
          </div>
        </div>

        {/* Social Media Links */}
        <div className="border-t border-gray-700 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-gray-400 text-center md:text-left">
              © Vizag Taxi Hub {new Date().getFullYear()}. All rights reserved.
            </p>
            {/* Social Icons */}
            <div className="flex items-center gap-6">
              <a href="https://www.facebook.com/vizagtaxihub" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-500 transition-colors transform hover:scale-110">
                <FaFacebook className="text-3xl" />
              </a>
              <a href="https://www.instagram.com/vizagtaxihub/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-pink-500 transition-colors transform hover:scale-110">
                <FaInstagram className="text-3xl" />
              </a>
              <a href="https://www.youtube.com/channel/UC2-jFwKuTHB357sBeIY4Urg" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-red-500 transition-colors transform hover:scale-110">
                <FaYoutube className="text-3xl" />
              </a>
              <a href="https://twitter.com/vizagtaxihub" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-200 transition-colors transform hover:scale-110">
                <SiX className="text-3xl" />
              </a>
            </div>
            <div className="text-sm text-gray-400">Made with ❤️ in Vizag</div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;