import { FaFacebook, FaInstagram, FaYoutube } from 'react-icons/fa';
import { SiX } from 'react-icons/si';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white py-12 md:py-16 mt-auto pb-20 md:pb-16">
      <div className="container mx-auto px-8 md:px-12 lg:px-16 space-y-12">
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
              <li>
                <Link to="/outstation-taxi/visakhapatnam-to-hyderabad" className="hover:text-white transition-colors block">Hyderabad</Link>
              </li>
              <li>
                <Link to="/outstation-taxi/visakhapatnam-to-chennai" className="hover:text-white transition-colors block">Chennai</Link>
              </li>
              <li>
                <Link to="/outstation-taxi/visakhapatnam-to-bangalore" className="hover:text-white transition-colors block">Bangalore</Link>
              </li>
              <li>
                <Link to="/outstation-taxi/visakhapatnam-to-araku-valley" className="hover:text-white transition-colors block">Araku Valley</Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-white mb-4 text-lg">Support</h3>
            <ul className="space-y-3 text-gray-300">
              <li>
                <Link to="/support" className="hover:text-white transition-colors block">Support</Link>
              </li>
              <li>
                <Link to="/help-center" className="hover:text-white transition-colors block">Help Center</Link>
              </li>
              <li>
                <Link to="/contact-us" className="hover:text-white transition-colors block">Contact Us</Link>
              </li>
              <li>
                <Link to="/terms-conditions" className="hover:text-white transition-colors block">Terms & Conditions</Link>
              </li>
              <li>
                <Link to="/privacy-policy" className="hover:text-white transition-colors block">Privacy Policy</Link>
              </li>
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