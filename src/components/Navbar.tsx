
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Menu, X, Phone, ChevronDown } from "lucide-react";
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
    { name: 'Pooling', href: '/pooling' },
    {
      name: 'About',
      href: '/about',
      dropdown: [
        { name: 'About', href: '/about' },
        { name: 'FAQ', href: '/faq' },
        { name: 'Blog', href: '/blog' },
        { name: 'Terms', href: '/terms' },
        { name: 'Privacy', href: '/privacy' },
        { name: 'Refunds', href: '/refunds' },
        { name: 'Contact', href: '/contact' },
      ]
    },
    { name: 'Services', href: '/services' },
  ];
  
  return (
    <header className="bg-white shadow-sm">
      <div className="container flex justify-between items-center py-3">
        <Logo />
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-8">
          <div className="flex space-x-6">
            {navItems.map((item) =>
              item.dropdown ? (
                <div key={item.name} className="relative group">
                  <button className={`flex items-center text-sm font-medium transition-colors hover:text-blue-600 ${isActive(item.href) ? 'text-blue-600' : 'text-gray-600'}`}
                    tabIndex={0}
                  >
                    {item.name}
                    <ChevronDown className="ml-1 h-4 w-4" />
                  </button>
                  <div className="absolute left-0 mt-2 w-48 bg-white border rounded shadow-lg opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none group-hover:pointer-events-auto group-focus-within:pointer-events-auto transition-opacity z-20">
                    {item.dropdown.map((sub) => (
                      <Link
                        key={sub.name}
                        to={sub.href}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-blue-600"
                      >
                        {sub.name}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`text-sm font-medium transition-colors hover:text-blue-600 ${isActive(item.href) ? 'text-blue-600' : 'text-gray-600'}`}
                >
                  {item.name}
                </Link>
              )
            )}
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
              {navItems.map((item) =>
                item.dropdown ? (
                  <div key={item.name}>
                    <div className="font-semibold text-lg text-gray-700 mb-1">{item.name}</div>
                    <div className="flex flex-col space-y-2 pl-4">
                      {item.dropdown.map((sub) => (
                        <Link
                          key={sub.name}
                          to={sub.href}
                          className={`py-1 text-base font-medium transition-colors ${isActive(sub.href) ? 'text-blue-600' : 'text-gray-600'}`}
                          onClick={() => setIsOpen(false)}
                        >
                          {sub.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`py-2 text-lg font-medium transition-colors ${isActive(item.href) ? 'text-blue-600' : 'text-gray-600'}`}
                    onClick={() => setIsOpen(false)}
                  >
                    {item.name}
                  </Link>
                )
              )}
              
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
