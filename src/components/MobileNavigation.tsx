import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, User, Car, UserPlus } from 'lucide-react';
import { motion } from 'framer-motion';

interface NavItem {
  icon: React.ReactNode;
  label: string;
  href: string;
}

export const MobileNavigation = () => {
  const { pathname: currentPath } = useLocation();

  const navItems: NavItem[] = [
    {
      icon: <Home size={20} />,
      label: 'Home',
      href: '/',
    },
    {
      icon: <Car size={20} />,
      label: 'Fleet',
      href: '/fleet',
    },
    {
      icon: <UserPlus size={20} />,
      label: 'Hire Driver',
      href: '/hire-driver',
    },
    {
      icon: <User size={20} />,
      label: 'Profile',
      href: '/login',
    },
  ];
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden z-50 shadow-lg mobile-safe-bottom">
      <div className="grid grid-cols-4 h-16">
        {navItems.map((item) => (
            <Link
              key={item.label}
              to={item.href}
              className={`relative flex flex-col items-center justify-center h-full transition-colors ${
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
        ))}
      </div>
    </nav>
  );
};
