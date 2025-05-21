
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Menu, X, Phone } from "lucide-react";
import { Logo } from "@/components/Logo";
import { motion, AnimatePresence } from "framer-motion";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };
  
  const navItems = [
    { name: 'Home', href: '/' },
    { name: 'Cabs', href: '/cabs' },
    { name: 'Tours', href: '/tours' },
    { name: 'About', href: '/about' },
    { name: 'Contact', href: '/contact' }
  ];
  
  return (
    <header className="bg-white shadow-sm">
      <div className="container flex justify-between items-center py-3">
        <Logo />
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-8">
          <div className="flex space-x-6">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`text-sm font-medium transition-colors hover:text-blue-600 
                  ${isActive(item.href) ? 'text-blue-600' : 'text-gray-600'}`}
              >
                {item.name}
              </Link>
            ))}
          </div>
          
          <Button asChild className="bg-blue-600 hover:bg-blue-700">
            <a href="tel:+919966363662" className="flex items-center">
              <Phone size={16} className="mr-2" />
              <span>9966363662</span>
            </a>
          </Button>
        </nav>
        
        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 focus:outline-none"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
        >
          {isOpen ? (
            <X size={24} className="text-gray-600" />
          ) : (
            <Menu size={24} className="text-gray-600" />
          )}
        </button>
      </div>
      
      {/* Mobile Navigation */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden bg-white overflow-hidden"
          >
            <div className="container py-4 flex flex-col space-y-4">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`py-2 text-lg font-medium transition-colors 
                    ${isActive(item.href) ? 'text-blue-600' : 'text-gray-600'}`}
                  onClick={() => setIsOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              
              <Button asChild className="w-full mt-2 bg-blue-600 hover:bg-blue-700">
                <a href="tel:+919966363662" className="flex items-center justify-center">
                  <Phone size={16} className="mr-2" />
                  <span>9966363662</span>
                </a>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
