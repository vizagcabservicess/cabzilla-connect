import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Phone, User } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { motion } from 'framer-motion';

interface NavItem {
  icon: React.ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
  isAction?: boolean;
}

export const MobileNavigation = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  
  // Function to get current page title
  const getCurrentPageTitle = () => {
    const path = location.pathname;
    const search = location.search;
    
    // Map paths to readable titles
    const pageTitles: { [key: string]: string } = {
      '/': 'Home Page',
      '/local-taxi': 'Local Taxi Booking',
      '/outstation-taxi': 'Outstation Taxi Booking',
      '/airport-taxi': 'Airport Taxi Service',
      '/tours': 'Tour Packages',
      '/fleet': 'Our Fleet',
      '/contact': 'Contact Us',
      '/about': 'About Us',
      '/login': 'Login Page',
      '/signup': 'Sign Up',
      '/dashboard': 'Dashboard',
      '/admin': 'Admin Dashboard',
      '/pooling': 'Pooling Service',
      '/booking-confirmation': 'Booking Confirmation',
      '/payment': 'Payment Page',
      '/receipt': 'Receipt',
      '/support': 'Support',
      '/help-center': 'Help Center',
      '/terms-conditions': 'Terms & Conditions',
      '/privacy-policy': 'Privacy Policy',
      '/cancellation-refund-policy': 'Cancellation Policy',
      '/our-story': 'Our Story',
      '/vision-mission': 'Vision & Mission',
      '/careers': 'Careers',
      '/hire-driver': 'Hire Driver',
      '/rentals': 'Car Rentals',
      '/vehicles': 'Vehicles',
      '/drivers': 'Drivers',
      '/bookings': 'Bookings',
      '/fares': 'Fares',
      '/reports': 'Reports',
      '/ledger': 'Ledger',
      '/expenses': 'Expenses',
      '/payroll': 'Payroll',
      '/payments': 'Payments',
      '/commission': 'Commission',
      '/fuel': 'Fuel Management',
      '/maintenance': 'Vehicle Maintenance',
      '/users': 'User Management',
      '/customer': 'Customer Dashboard',
      '/driver': 'Driver Dashboard',
      '/pooling/login': 'Pooling Login',
      '/pooling/provider': 'Pooling Provider',
      '/pooling/admin': 'Pooling Admin',
      '/pooling/guest': 'Guest Dashboard',
    };
    
    // Get title from path, fallback to path itself
    const title = pageTitles[path] || path.replace(/-/g, ' ').replace(/\//g, '').replace(/\b\w/g, l => l.toUpperCase());
    
    return `Vizag Taxi Hub - ${title}`;
  };

  // WhatsApp handler
  const getWhatsAppMessage = () => {
    const path = location.pathname;
    
    // Check for vehicle detail pages first (dynamic paths)
    if (path.startsWith('/vehicle/')) {
      const vehicleName = path.split('/vehicle/')[1];
      // Convert URL format to readable name (e.g., "tempo_traveller" -> "Tempo Traveller")
      const readableVehicleName = vehicleName
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      return `Hi Kumar! I would like to know more about the ${readableVehicleName} vehicle`;
    }
    
    // Check for tour detail pages (dynamic paths)
    if (path.startsWith('/tours/') && path !== '/tours') {
      const tourId = path.split('/tours/')[1];
      return `Hi Kumar! I would like to know more about tour package ${tourId}`;
    }
    
    // Check for booking-related pages
    if (path.startsWith('/booking/')) {
      return 'Hi Kumar! I need help with my booking';
    }
    
    // Check for payment page
    if (path === '/payment') {
      return 'Hi Kumar! I need help with payment';
    }
    
    // Define messages based on actual page paths
    const messages = {
      '/': 'Hi Kumar! I would like to know more about your taxi services',
      '/hire-driver': 'Hi Kumar! I would like to hire a driver',
      '/tours': 'Hi Kumar! I would like to know more about your tour packages',
      '/fleet': 'Hi Kumar! I would like to know more about your fleet',
      '/careers': 'Hi Kumar! I would like to know more about career opportunities',
      '/our-story': 'Hi Kumar! I would like to know more about your company',
      '/vision-mission': 'Hi Kumar! I would like to know more about your vision and mission',
      '/contact': 'Hi Kumar! I would like to get in touch with you',
      '/about': 'Hi Kumar! I would like to know more about Vizag Taxi Hub',
      '/local-taxi': 'Hi Kumar! I would like to book a local taxi',
      '/outstation-taxi': 'Hi Kumar! I would like to book an outstation taxi',
      '/airport-taxi': 'Hi Kumar! I would like to book an airport transfer',
      '/pooling': 'Hi Kumar! I would like to know more about your car pooling service',
      '/rentals': 'Hi Kumar! I would like to know more about your car rental services',
      '/support': 'Hi Kumar! I need support with my booking',
      '/help-center': 'Hi Kumar! I need help with your services',
      '/contact-us': 'Hi Kumar! I would like to get in touch with you',
      '/terms-conditions': 'Hi Kumar! I have a question about your terms and conditions',
      '/privacy-policy': 'Hi Kumar! I have a question about your privacy policy',
      '/user-agreement': 'Hi Kumar! I have a question about your user agreement',
      '/terms': 'Hi Kumar! I have a question about your terms',
      '/privacy': 'Hi Kumar! I have a question about your privacy policy',
      '/data-deletion': 'Hi Kumar! I would like to request data deletion',
      '/refunds': 'Hi Kumar! I have a question about refunds',
      '/cancellation-refund-policy': 'Hi Kumar! I have a question about cancellation and refund policy'
    };

    // Return specific message or default message
    return messages[path] || 'Hi Kumar! I would like to know more about your services';
  };

  const handleWhatsApp = () => {
    const message = getWhatsAppMessage();
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/919966363662?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  // Call handler
  const handleCall = () => {
    window.open('tel:+919966363662', '_self');
  };
  
  const navItems: NavItem[] = [
    {
      icon: <Home size={20} />,
      label: 'Home',
      href: '/'
    },
    {
      icon: <FaWhatsapp size={20} />,
      label: 'WhatsApp',
      onClick: handleWhatsApp,
      isAction: true
    },
    {
      icon: <Phone size={20} />,
      label: 'Call Now',
      onClick: handleCall,
      isAction: true
    },
    {
      icon: <User size={20} />,
      label: 'Profile',
      href: '/login'
    }
  ];
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden z-50 shadow-lg mobile-safe-bottom">
      <div className="grid grid-cols-4 h-16">
        {navItems.map((item, index) => {
          if (item.isAction) {
            return (
              <button
                key={item.label}
                onClick={item.onClick}
                className="flex flex-col items-center justify-center h-full transition-colors text-gray-500 hover:text-blue-600"
              >
                <div className="relative">
                  {item.icon}
                </div>
                <span className="text-xs mt-1">{item.label}</span>
              </button>
            );
          }
          
          return (
            <Link
              key={item.label}
              to={item.href!}
              className={`flex flex-col items-center justify-center h-full transition-colors ${
                currentPath === item.href ? 'text-blue-600' : 'text-gray-500'
              }`}
            >
              <div className="relative">
                {currentPath === item.href && (
                  <motion.div
                    layoutId="navIndicator"
                    className="absolute -top-1 -right-1 w-2 h-2 bg-blue-600 rounded-full"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                {item.icon}
              </div>
              <span className="text-xs mt-1">{item.label}</span>
              {currentPath === item.href && (
                <motion.div
                  layoutId="navBottomIndicator"
                  className="absolute bottom-0 w-12 h-1 bg-blue-600 rounded-t-md"
                  initial={false}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
