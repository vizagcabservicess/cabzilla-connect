
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Car, History, User } from 'lucide-react';

interface NavItem {
  icon: React.ReactNode;
  label: string;
  href: string;
}

export const MobileNavigation = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  
  const navItems: NavItem[] = [
    {
      icon: <Home size={20} />,
      label: 'Home',
      href: '/'
    },
    {
      icon: <Car size={20} />,
      label: 'Cabs',
      href: '/cabs'
    },
    {
      icon: <History size={20} />,
      label: 'Bookings',
      href: '/dashboard'
    },
    {
      icon: <User size={20} />,
      label: 'Profile',
      href: '/login'
    }
  ];
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden z-50 shadow-lg mobile-safe-bottom animate-slide-up">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => (
          <Link
            key={item.label}
            to={item.href}
            className={`flex flex-col items-center justify-center w-full h-full transition-colors ${
              currentPath === item.href ? 'text-blue-600' : 'text-gray-500'
            }`}
          >
            <div className={`flex items-center justify-center ${
              currentPath === item.href ? 'animate-pulse-once' : ''
            }`}>
              {item.icon}
            </div>
            <span className="text-xs mt-1">{item.label}</span>
            {currentPath === item.href && (
              <span className="absolute bottom-0 w-6 h-1 bg-blue-600 rounded-t-md animate-fade-in"></span>
            )}
          </Link>
        ))}
      </div>
    </nav>
  );
};
