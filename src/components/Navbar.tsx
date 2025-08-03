import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
import { CITY_LOOKUP } from './OutstationHeroWidget';
import { tourAPI } from '@/services/api/tourAPI';

interface NavLink {
  to: string;
  label: string;
}

const megaMenuData = {
  Services: {
    left: [
      { label: 'Local Taxi', to: '/local-taxi' },
      { label: 'Outstation', to: '/outstation-taxi' },
      { label: 'Airport Transfer', to: '/airport-taxi' },
      { label: 'Tour Packages', to: '/tours' },
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
      { label: 'Support', to: '/support' },
      { label: 'Help Center', to: '/help-center' },
      { label: 'Contact Us', to: '/contact-us' },
      { label: 'Terms & Conditions', to: '/terms-conditions' },
      { label: 'Privacy Policy', to: '/privacy-policy' },
    ],
    right: [
      { label: 'Support', items: ['24/7 Customer Support', 'Multiple Contact Channels', 'Live Chat'] },
      { label: 'Help & FAQ', items: ['Search Functionality', 'Common Questions', 'Troubleshooting'] },
      { label: 'Contact Information', items: ['Complete Contact Form', 'Email Support', 'Phone Support'] },
      { label: 'Legal', items: ['Terms of Service', 'Privacy Policy', 'Data Protection'] },
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
  const [tourData, setTourData] = useState([]);
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

  // Handle window resize to reposition menu
  useEffect(() => {
    function handleResize() {
      if (megaMenuOpen) {
        // Force re-render of mega menu to recalculate position
        setMegaMenuOpen(null);
        setTimeout(() => setMegaMenuOpen(activeCategory), 10);
      }
    }
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [megaMenuOpen, activeCategory]);

  // Load tour data
  useEffect(() => {
    const loadTourData = async () => {
      try {
        const tours = await tourAPI.getTourFares();
        setTourData(tours);
      } catch (error) {
        console.error('Error loading tour data:', error);
        setTourData([]);
      }
    };
    
    loadTourData();
  }, []);

  // Position menu after it's rendered to prevent overflow
  useEffect(() => {
    if (megaMenuOpen && megaMenuRef.current) {
      const menu = megaMenuRef.current;
      const button = buttonRefs[megaMenuOpen].current;
      
      if (button) {
        const buttonRect = button.getBoundingClientRect();
        const menuRect = menu.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Check if this is the outstation menu (wider)
        const isOutstation = megaMenuOpen === 'Services' && activeLeftIndex === 1; // Outstation is at index 1
        
        // Calculate horizontal position
        let left = buttonRect.left + buttonRect.width / 2 - menuRect.width / 2;
        
        // For outstation menu, ensure it doesn't go off screen
        if (isOutstation) {
          // Ensure menu stays within viewport bounds with more margin for wider menu
          if (left < 40) {
            left = 40;
          } else if (left + menuRect.width > viewportWidth - 40) {
            left = viewportWidth - menuRect.width - 40;
          }
        } else {
          // Regular positioning for other menus
          if (left < 20) {
            left = 20;
          } else if (left + menuRect.width > viewportWidth - 20) {
            left = viewportWidth - menuRect.width - 20;
          }
        }
        
        // Calculate vertical position
        let top = buttonRect.bottom + 16;
        const menuHeight = menuRect.height;
        
        // If menu would overflow below viewport, position it above the button
        if (top + menuHeight > viewportHeight - 20) {
          top = buttonRect.top - menuHeight - 16;
        }
        
        // Apply positioning
        menu.style.left = `${left}px`;
        menu.style.top = `${top}px`;
        menu.style.transform = 'none';
      }
    }
  }, [megaMenuOpen, activeLeftIndex]);

      // Helper to render a mega menu for a given category
  function renderMegaMenu(category) {
    const left = megaMenuData[category].left;
    const right = megaMenuData[category].right;
    
         // Set different widths based on category
     const isOutstation = category === 'Services' && left[activeLeftIndex]?.label === 'Outstation';
     const menuWidth = isOutstation ? '1000px' : '800px';
    
    return (
      <div
        ref={megaMenuRef}
        className="fixed bg-white text-gray-900 shadow-2xl rounded-xl p-0 flex z-50 border border-gray-200"
        tabIndex={-1}
                 style={{ 
           minHeight: isOutstation ? 400 : 260,
           width: menuWidth,
           maxWidth: '95vw',
           left: '50%',
           top: '50%',
           transform: 'translateX(-50%) translateY(-50%)'
         }}
      >
        {/* Up arrow removed */}
        {/* Left column: Categories */}
        <div className="w-1/3 py-8 px-6 border-r border-gray-100 bg-gray-50 rounded-l-xl">
          {left.map((item, idx) => (
            <Link
              key={item.label}
              to={item.to}
              className={`flex items-center w-full text-left px-3 py-3 rounded-lg mb-1 font-medium transition-colors ${activeLeftIndex === idx ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100'}`}
              onMouseEnter={() => setActiveLeftIndex(idx)}
              onClick={() => setMegaMenuOpen(null)}
            >
              {item.label}
              <ChevronDown className="ml-auto h-4 w-4 rotate-[-90deg]" />
            </Link>
          ))}
        </div>
                 {/* Right column: Submenu for selected category */}
         <div className="flex-1 py-6 px-6 md:px-8 lg:px-10">
                                {/* If Services > Outstation is selected, show dynamic city links */}
           {category === 'Services' && left[activeLeftIndex]?.label === 'Outstation' ? (
             <div>
               <div className="font-semibold text-gray-800 mb-3">Long Distance</div>
               <div className="grid grid-cols-4 gap-2 max-h-[500px] overflow-y-auto">
                 {Object.keys(CITY_LOOKUP)
                   .filter(city => city !== 'Visakhapatnam')
                   .sort((a, b) => a.localeCompare(b))
                   .map(city => (
                                           <Link
                        key={city}
                        to={`/outstation-taxi/visakhapatnam-to-${city.toLowerCase().replace(/ /g, '-')}`}
                        className="block py-2 px-3 rounded hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 text-sm font-medium text-gray-700 hover:border-blue-300 text-left"
                      >
                        {city}
                      </Link>
                   ))}
               </div>
             </div>
           ) : category === 'Services' && left[activeLeftIndex]?.label === 'Tour Packages' ? (
             <div>
               <div className="font-semibold text-gray-800 mb-3">Tour Packages</div>
               <div className="grid grid-cols-2 gap-3 max-h-[500px] overflow-y-auto">
                 {tourData
                   .filter(tour => tour.tourName)
                   .sort((a, b) => a.tourName.localeCompare(b.tourName))
                   .map(tour => (
                                           <Link
                        key={tour.tourId}
                        to={`/tours/${tour.tourId}`}
                        className="block py-3 px-4 rounded-lg hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 text-sm font-medium text-gray-700 hover:border-blue-300 text-left"
                      >
                        {tour.tourName}
                      </Link>
                   ))}
               </div>
             </div>
           ) : right[activeLeftIndex] && (
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
                                 {megaMenuOpen === cat && createPortal(renderMegaMenu(cat), document.body)}
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
                  <Link to="/local-taxi" className="flex items-center space-x-2 py-2 px-4 rounded-md hover:bg-gray-100 transition-colors">
                    <Car className="h-5 w-5" />
                    <span>Local Taxi</span>
                  </Link>
                  <Link to="/outstation-taxi" className="flex items-center space-x-2 py-2 px-4 rounded-md hover:bg-gray-100 transition-colors">
                    <MapPin className="h-5 w-5" />
                    <span>Outstation</span>
                  </Link>
                  <Link to="/airport-taxi" className="flex items-center space-x-2 py-2 px-4 rounded-md hover:bg-gray-100 transition-colors">
                    <Plane className="h-5 w-5" />
                    <span>Airport Transfer</span>
                  </Link>
                  <Link to="/about" className="flex items-center space-x-2 py-2 px-4 rounded-md hover:bg-gray-100 transition-colors">
                    <Info className="h-5 w-5" />
                    <span>About</span>
                  </Link>
                  <Link to="/contact" className="flex items-center space-x-2 py-2 px-4 rounded-md hover:bg-gray-100 transition-colors">
                    <Phone className="h-5 w-5" />
                    <span>Contact</span>
                  </Link>
                  <Link to="/support" className="flex items-center space-x-2 py-2 px-4 rounded-md hover:bg-gray-100 transition-colors">
                    <Phone className="h-5 w-5" />
                    <span>Support</span>
                  </Link>
                  <Link to="/help-center" className="flex items-center space-x-2 py-2 px-4 rounded-md hover:bg-gray-100 transition-colors">
                    <Info className="h-5 w-5" />
                    <span>Help Center</span>
                  </Link>
                  <Link to="/contact-us" className="flex items-center space-x-2 py-2 px-4 rounded-md hover:bg-gray-100 transition-colors">
                    <Phone className="h-5 w-5" />
                    <span>Contact Us</span>
                  </Link>
                  <Link to="/terms-conditions" className="flex items-center space-x-2 py-2 px-4 rounded-md hover:bg-gray-100 transition-colors">
                    <Info className="h-5 w-5" />
                    <span>Terms & Conditions</span>
                  </Link>
                  <Link to="/privacy-policy" className="flex items-center space-x-2 py-2 px-4 rounded-md hover:bg-gray-100 transition-colors">
                    <Info className="h-5 w-5" />
                    <span>Privacy Policy</span>
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
