import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { Logo } from './Logo';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  ChevronDown,
  ChevronUp,
  Menu,
  Home,
  LogOut,
  User,
  Phone,
  Car,
  Info,
  UserPlus,
  MapPin,
  Plane,
  Calendar
} from 'lucide-react';

interface NavLink {
  to: string;
  label: string;
}

const megaMenuData = {
  Services: {
    left: [
      { label: 'Local Trips', to: '/local-trips' },
      { label: 'Outstation', to: '/outstation' },
      { label: 'Airport Transfer', to: '/airport-transfer' },
      { label: 'Tour Packages', to: '/tour-packages' },
    ],
    right: [
      { label: 'Hourly Packages', items: ['8hrs/80km', '10hrs/100km', 'Professional drivers'] },
      { label: 'Long Distance', items: ['Hyderabad', 'Chennai', 'Bangalore'] },
      { label: 'Airport Info', items: ['On-time guarantee', 'Flight tracking', 'Fixed rates'] },
      { label: 'Tour Options', items: ['Vizag-Araku', 'Vizag-Lambasingi', 'Vizag-Borra Caves'] },
    ],
  },
  Destinations: {
    left: [
      { label: 'Popular', to: '#' },
      { label: 'Other', to: '#' },
    ],
    right: [
      { label: 'Popular Destinations', items: ['Hyderabad', 'Chennai', 'Bangalore', 'Araku Valley'] },
      { label: 'Other Destinations', items: ['Tirupati', 'Vijayawada'] },
    ],
  },
  Company: {
    left: [
      { label: 'About Us', to: '/about' },
      { label: 'Contact', to: '/contact' },
      { label: 'Fleet', to: '/fleet' },
      { label: 'Careers', to: '/careers' },
    ],
    right: [
      { label: 'Company Info', items: ['Our Story', 'Leadership', 'Vision & Mission'] },
      { label: 'Contact', items: ['Email: info@vizagtaxihub.com', 'Phone: 9966363662'] },
    ],
  },
  Support: {
    left: [
      { label: 'Help Center', to: '/help' },
      { label: 'Terms & Conditions', to: '/terms' },
      { label: 'Privacy Policy', to: '/privacy' },
      { label: 'Refund Policy', to: '/refund' },
    ],
    right: [
      { label: 'Support', items: ['FAQs', 'Customer Care', 'Live Chat'] },
      { label: 'Policies', items: ['Terms & Conditions', 'Privacy Policy', 'Refund Policy'] },
    ],
  },
};

const serviceLinks = [
  { name: 'Local Taxi', href: '/local-taxi', description: 'City tours and local trips' },
  { name: 'Outstation', href: '/outstation-taxi', description: 'Inter-city travel' },
  { name: 'Airport Transfer', href: '/airport-taxi', description: 'Airport pickup & drop' },
  { name: 'Car Rentals', href: '/rentals', description: 'Daily, weekly & monthly rentals' },
  { name: 'Tour Packages', href: '/tours', description: 'Sightseeing packages' },
  { name: 'Cab Booking', href: '/cabs', description: 'Quick cab booking' }
];

export function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [megaMenuOpen, setMegaMenuOpen] = useState(null);
  const [activeCategory, setActiveCategory] = useState('Services');
  const [activeLeftIndex, setActiveLeftIndex] = useState(0);
  const megaMenuRef = useRef(null);
  const buttonRefs = {
    Services: useRef(null),
    Destinations: useRef(null),
    Company: useRef(null),
    Support: useRef(null),
  };

  const handleDashboard = () => {
    if (isAdmin) navigate('/admin');
    else navigate('/dashboard');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Close mega menu on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        megaMenuRef.current &&
        !megaMenuRef.current.contains(event.target) &&
        !Object.values(buttonRefs).some(ref => ref.current && ref.current.contains(event.target))
      ) {
        setMegaMenuOpen(null);
      }
    }
    if (megaMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [megaMenuOpen]);

  // Helper to render a mega menu for a given category
  function renderMegaMenu(category) {
    const left = megaMenuData[category].left;
    const right = megaMenuData[category].right;
    // Get button position for arrow
    // const buttonRect = buttonRefs[category].current?.getBoundingClientRect();
    // const menuRect = megaMenuRef.current?.getBoundingClientRect();
    // let arrowLeft = 40;
    // if (buttonRect && menuRect) {
    //   arrowLeft = buttonRect.left - menuRect.left + buttonRect.width / 2 - 10;
    // }
    return (
      <div
        ref={megaMenuRef}
        className="absolute left-1/2 -translate-x-1/2 top-full w-[700px] bg-white text-gray-900 shadow-2xl rounded-xl mt-4 p-0 flex z-50 border border-gray-200"
        tabIndex={-1}
        style={{ minHeight: 260 }}
      >
        {/* Up arrow removed */}
        {/* Left column: Categories */}
        <div className="w-1/3 py-8 px-6 border-r border-gray-100 bg-gray-50 rounded-l-xl">
          {left.map((item, idx) => (
            <button
              key={item.label}
              className={`flex items-center w-full text-left px-3 py-3 rounded-lg mb-1 font-medium transition-colors ${activeLeftIndex === idx ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100'}`}
              onMouseEnter={() => setActiveLeftIndex(idx)}
              onClick={e => e.preventDefault()}
            >
              {item.label}
              <ChevronDown className="ml-auto h-4 w-4 rotate-[-90deg]" />
            </button>
          ))}
        </div>
        {/* Right column: Submenu for selected category */}
        <div className="flex-1 py-8 px-8">
          {right[activeLeftIndex] && (
            <div>
              <div className="font-semibold text-gray-800 mb-3">{right[activeLeftIndex].label}</div>
              <div className="grid grid-cols-1 gap-2">
                {right[activeLeftIndex].items.map((sub, i) => (
                  <Link key={i} to="#" className="block py-1 px-2 rounded hover:bg-blue-50 transition-colors">
                    {sub}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <Logo />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-8">
            {/* Mega Menu Triggers */}
            {['Services', 'Destinations', 'Company', 'Support'].map((cat) => (
              <div key={cat} className="relative">
                <button
                  ref={buttonRefs[cat]}
                  className={`flex items-center transition-colors font-medium focus:outline-none ${megaMenuOpen === cat ? 'text-blue-700' : 'text-gray-700 hover:text-blue-600'}`}
                  onClick={() => {
                    setMegaMenuOpen(megaMenuOpen === cat ? null : cat);
                    setActiveCategory(cat);
                    setActiveLeftIndex(0);
                  }}
                >
                  {cat}
                  {megaMenuOpen === cat ? (
                    <ChevronUp className="ml-1 h-4 w-4" />
                  ) : (
                    <ChevronDown className="ml-1 h-4 w-4" />
                  )}
                </button>
                {megaMenuOpen === cat && renderMegaMenu(cat)}
              </div>
            ))}

            {/* Contact Information */}
            <div className="flex items-center space-x-4 text-sm">
              <a 
                href="tel:+919966363662" 
                className="flex items-center text-blue-600 hover:text-blue-700 transition-colors font-medium"
              >
                <Phone className="h-4 w-4 mr-1" />
                9966363662
              </a>
            </div>

            {/* Auth Section */}
            {user ? (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 px-2 rounded-full">
                      <Avatar className="mr-2 h-8 w-8">
                        <AvatarImage src={''} alt={user.name} />
                        <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span>{user.name}</span>
                      <ChevronDown className="ml-1 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleDashboard}>
                      <User className="mr-2 h-4 w-4" />
                      <span>Dashboard</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Logout</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center space-x-4">
                <Link to="/login" className="text-blue-600 hover:text-blue-700 transition-colors font-medium">
                  Login
                </Link>
                <Link to="/signup" className="bg-blue-600 text-white py-2 px-4 rounded-full hover:bg-blue-700 transition-colors font-medium">
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="lg:hidden">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" className="p-2">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="sm:max-w-sm">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                  <SheetDescription>
                    Explore Vizag Taxi Hub
                  </SheetDescription>
                </SheetHeader>
                <div className="grid gap-4 py-4">
                  <Link to="/" className="flex items-center space-x-2 py-2 px-4 rounded-md hover:bg-gray-100 transition-colors">
                    <Home className="h-5 w-5" />
                    <span>Home</span>
                  </Link>
                  <Link to="/about" className="flex items-center space-x-2 py-2 px-4 rounded-md hover:bg-gray-100 transition-colors">
                    <Info className="h-5 w-5" />
                    <span>About</span>
                  </Link>
                  <Link to="/contact" className="flex items-center space-x-2 py-2 px-4 rounded-md hover:bg-gray-100 transition-colors">
                    <Phone className="h-5 w-5" />
                    <span>Contact</span>
                  </Link>
                  {user ? (
                    <>
                      <Button variant="ghost" className="flex items-center space-x-2 py-2 px-4 rounded-md hover:bg-gray-100 transition-colors" onClick={handleDashboard}>
                        <User className="h-5 w-5" />
                        <span>Dashboard</span>
                      </Button>
                      <Button variant="ghost" className="flex items-center space-x-2 py-2 px-4 rounded-md hover:bg-gray-100 transition-colors" onClick={handleLogout}>
                        <LogOut className="h-5 w-5" />
                        <span>Logout</span>
                      </Button>
                    </>
                  ) : (
                    <>
                      <Link to="/login" className="flex items-center space-x-2 py-2 px-4 rounded-md hover:bg-gray-100 transition-colors">
                        <User className="h-5 w-5" />
                        <span>Login</span>
                      </Link>
                      <Link to="/signup" className="flex items-center space-x-2 py-2 px-4 rounded-md hover:bg-gray-100 transition-colors">
                        <UserPlus className="h-5 w-5" />
                        <span>Sign Up</span>
                      </Link>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
