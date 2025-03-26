
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-10">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">CabZilla</h3>
            <p className="text-gray-400">
              Your trusted partner for all your transportation needs. Offering reliable cab services for local, outstation, and airport transfers.
            </p>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li><Link to="/" className="text-gray-400 hover:text-white">Home</Link></li>
              <li><Link to="/cabs" className="text-gray-400 hover:text-white">Cabs</Link></li>
              <li><Link to="/tours" className="text-gray-400 hover:text-white">Tour Packages</Link></li>
              <li><Link to="/about" className="text-gray-400 hover:text-white">About Us</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">Services</h4>
            <ul className="space-y-2">
              <li><Link to="/local-taxi" className="text-gray-400 hover:text-white">Local Taxi</Link></li>
              <li><Link to="/outstation-cabs" className="text-gray-400 hover:text-white">Outstation Cabs</Link></li>
              <li><Link to="/airport-transfer" className="text-gray-400 hover:text-white">Airport Transfer</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">Contact Us</h4>
            <address className="text-gray-400 not-italic">
              <p>123 Transport Lane</p>
              <p>Ride City, RC 12345</p>
              <p className="mt-2">Phone: +91 9966363662</p>
              <p>Email: info@cabzilla.com</p>
            </address>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; {new Date().getFullYear()} CabZilla. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
