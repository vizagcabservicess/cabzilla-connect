import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { Logo } from './Logo';
import { HeaderSearchBar } from '@/components/header/HeaderSearchBar';
import { Button } from '@/components/ui/button';
import { getTourUrl } from '@/utils/tourUrlUtils';
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
  Calendar,
  Users,
  Bell,
  Headphones,
  HelpCircle,
  Briefcase,
  Building2,
  BadgePercent,
} from 'lucide-react';
import { CITY_LOOKUP } from '@/lib/cityLookup';
import { tourAPI } from '@/services/api/tourAPI';
import { cn } from '@/lib/utils';
import { dispatchBookingHomeReset } from '@/lib/bookingSessionReset';

const MEGA_MENU_CATEGORIES = ['Services', 'Tour Packages', 'Fleet', 'Company', 'Support'] as const;
type MegaMenuCategory = (typeof MEGA_MENU_CATEGORIES)[number];

const MEGA_MENU_ICONS: Record<MegaMenuCategory, React.ComponentType<{ className?: string }>> = {
  Services: Car,
  'Tour Packages': MapPin,
  Fleet: Users,
  Company: Building2,
  Support: Headphones,
};

interface NavLink {
  to: string;
  label: string;
  subItems?: NavLink[];
}

const megaMenuData: Record<
  MegaMenuCategory,
  { left: NavLink[]; right: { label: string; items: string[] }[] }
> = {
  Services: {
    left: [
      { label: 'Local Taxi', to: '/local-taxi' },
      { label: 'Outstation', to: '/outstation-taxi' },
      { label: 'Airport Transfer', to: '/airport-taxi' },
      { label: 'Tour Packages', to: '/tours' },
      { label: 'Group Tours', to: '/group-tours' },
      { label: 'Shared Carpooling', to: '/shared-carpooling' },
      { 
        label: 'Tempo Traveller Rental', 
        to: '/tempo-traveller-rental-vizag',
        subItems: [
          { label: 'Seat Sharing (Book Seats)', to: '/group-tours' },
          { label: 'Urbania Rental Vizag', to: '/urbania-rental-vizag' },
          { label: 'Urbania (fleet page)', to: '/vehicle/urbania' },
          { label: 'Tempo Traveller Rental', to: '/tempo-traveller-rental-vizag' },
          { label: '17 Seater Tempo Traveller', to: '/17-seater-tempo-traveller-vizag' },
          { label: '12 Seater Tempo Traveller', to: '/12-seater-tempo-traveller-vizag' },
          { label: 'Group Travel', to: '/group-travel-tempo-traveller-vizag' },
          { label: 'Corporate Transport', to: '/corporate-tempo-traveller-vizag' },
          { label: 'Wedding Transport', to: '/wedding-tempo-traveller-vizag' },
          { label: 'Pilgrimage Tours', to: '/pilgrimage-tempo-traveller-vizag' },
          { label: 'Mini Bus Travels', to: '/mini-bus-travels-vizag' },
        ]
      },
    ],
    right: [
      { label: 'Hourly Packages', items: ['8hrs/80km', '10hrs/100km', 'Professional drivers'] },
      { label: 'Long Distance', items: ['Hyderabad', 'Chennai', 'Bangalore'] },
      { label: 'Airport Info', items: ['On-time guarantee', 'Flight tracking', 'Fixed rates'] },
      { label: 'Tour Features', items: ['Professional guides', 'Sightseeing included', 'Best rates'] },
      { label: 'Group Tour Benefits', items: ['Save up to 60% on shared travel', 'Popular routes: Araku, Lambasingi', 'Book individual seats online', 'Tempo Traveller & AC vehicles'] },
      { label: 'Shared Carpooling', items: ['Daily office & college rides', 'Verified drivers & fixed fares', 'NAD, MVP, IT SEZ routes', 'Book seats online'] },
      { label: 'Tempo Traveller Services', items: ['12-18 seater options', 'Group travel', 'Wedding transport', 'Corporate events'] },
    ],
  },
  'Tour Packages': {
    left: [
      { label: 'View All Tours', to: '/tours' },
      { label: 'Araku Valley Tour', to: '/tours/araku-valley-tour' },
      { label: 'Lambasingi Tour', to: '/tours/lambasingi-tour' },
      { label: 'Vizag North City Tour', to: '/tours/vizag-north-city-tour' },
    ],
    right: [
      { label: 'Popular Tours', items: ['Araku Valley Tour', 'Lambasingi Tour', 'Vizag City Tours'] },
      { label: 'Tour Features', items: ['Professional Guides', 'Comfortable Vehicles', 'Best Rates'] },
      { label: 'Booking Options', items: ['Instant Booking', 'Flexible Dates', 'Group Discounts'] },
      { label: 'Destinations', items: ['Araku Valley', 'Lambasingi', 'Vizag City', 'Borra Caves'] },
    ],
  },
  Fleet: {
    left: [
      { label: 'View All Vehicles', to: '/fleet' },
      { label: 'Sedan', to: '/vehicle/sedan' },
      { label: 'Ertiga', to: '/vehicle/ertiga' },
      { label: 'Toyota Glanza', to: '/vehicle/toyota-glanza' },
      { label: 'Urbania', to: '/vehicle/urbania' },
      { label: 'Urbania van rental', to: '/urbania-rental-vizag' },
      { label: 'Tempo Traveller Rental', to: '/tempo-traveller-rental-vizag' },
      { label: '17 Seater Tempo Traveller', to: '/17-seater-tempo-traveller-vizag' },
      { label: '12 Seater Tempo Traveller', to: '/12-seater-tempo-traveller-vizag' },
      { label: 'Group Travel', to: '/group-travel-tempo-traveller-vizag' },
      { label: 'Corporate Transport', to: '/corporate-tempo-traveller-vizag' },
      { label: 'Wedding Transport', to: '/wedding-tempo-traveller-vizag' },
      { label: 'Araku Tour Packages', to: '/araku-tour-packages-vizag' },
      { label: 'Vizag to Araku Bus', to: '/vizag-to-araku-bus' },
    ],
    right: [
      { label: 'Premium Vehicles', items: ['Toyota Glanza', 'Innova Crysta'] },
      { label: 'Group Travel', items: ['Tempo Traveller (17-seater)', 'Amaze', 'Urbania'] },
      { label: 'Vehicle Features', items: ['AC & Comfort', 'Professional Drivers', 'GPS Tracking'] },
      { label: 'Booking Options', items: ['Hourly Rentals', 'Outstation Trips', 'Airport Transfers'] },
    ],
  },
  Company: {
    left: [
      { label: 'Our Story', to: '/our-story' },
      { label: 'Vision & Mission', to: '/vision-mission' },
      { label: 'Fleet', to: '/fleet' },
      { label: 'Careers', to: '/careers' },
    ],
    right: [
      { label: 'Company Info', items: ['Our Story', 'Vision & Mission'] },
      { label: 'Services', items: ['Fleet Management', 'Driver Hiring', 'Career Opportunities'] },
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
      { label: 'Cancellation & Refund Policy', to: '/cancellation-refund-policy' },
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
  { name: 'Tour Packages', href: '/tours', description: 'Sightseeing packages' },
  { name: 'Group Tours', href: '/group-tours', description: 'Shared tours – save up to 60%' },
  { name: 'Shared Carpooling', href: '/shared-carpooling', description: 'Daily office & college commute rides' },
];

export function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [megaMenuOpen, setMegaMenuOpen] = useState<MegaMenuCategory | null>(null);
  const [activeCategory, setActiveCategory] = useState<MegaMenuCategory>('Services');
  const [activeLeftIndex, setActiveLeftIndex] = useState(0);
  const [tourData, setTourData] = useState([]);
  const [mobileMenuSections, setMobileMenuSections] = useState({
    services: false,
    company: false,
    support: false,
    legal: false
  });
  const megaMenuRef = useRef(null);
  const hoverCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const siteNavbarRef = useRef<HTMLElement | null>(null);
  const buttonRefs = {
    Services: useRef(null),
    'Tour Packages': useRef(null),
    Fleet: useRef(null),
    Company: useRef(null),
    Support: useRef(null),
  };

  const cancelMegaMenuClose = () => {
    if (hoverCloseTimerRef.current) {
      clearTimeout(hoverCloseTimerRef.current);
      hoverCloseTimerRef.current = null;
    }
  };

  const openMegaMenu = (cat: MegaMenuCategory) => {
    cancelMegaMenuClose();
    setMegaMenuOpen(cat);
    setActiveCategory(cat);
    setActiveLeftIndex(0);
  };

  const scheduleMegaMenuClose = () => {
    cancelMegaMenuClose();
    hoverCloseTimerRef.current = setTimeout(() => setMegaMenuOpen(null), 180);
  };

  const handleDashboard = () => {
    if (isAdmin) navigate('/admin');
    else navigate('/dashboard');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const toggleMobileMenuSection = (section: string) => {
    setMobileMenuSections(prev => ({
      ...prev,
      [section]: !prev[section as keyof typeof prev]
    }));
  };

  // Close mega menu on outside click
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Keep page spacer flush with the fixed navbar (avoids white gap above hero)
  useEffect(() => {
    const nav = siteNavbarRef.current;
    if (!nav) return;

    const syncHeaderOffset = () => {
      const height = Math.ceil(nav.getBoundingClientRect().height);
      if (height > 0) {
        document.documentElement.style.setProperty('--site-header-offset', `${height}px`);
      }
    };

    syncHeaderOffset();
    const observer =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(syncHeaderOffset) : null;
    observer?.observe(nav);
    window.addEventListener('resize', syncHeaderOffset);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', syncHeaderOffset);
    };
  }, [isScrolled]);

  useEffect(() => {
    return () => {
      if (hoverCloseTimerRef.current) {
        clearTimeout(hoverCloseTimerRef.current);
      }
    };
  }, []);

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
        
        // Calculate horizontal position — anchor under nav item (Axis-style)
        let left = buttonRect.left;
        if (left + menuRect.width > viewportWidth - 20) {
          left = viewportWidth - menuRect.width - 20;
        }
        if (left < 20) {
          left = 20;
        }

        // Calculate vertical position — tight gap for hover bridge
        let top = buttonRect.bottom + 6;
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
  function renderMegaMenu(category: MegaMenuCategory) {
    const left = megaMenuData[category].left;
    const right = megaMenuData[category].right;

    const isOutstation = category === 'Services' && left[activeLeftIndex]?.label === 'Outstation';
    const isCompany = category === 'Company';
    const isSupport = category === 'Support';
    const menuWidth = isOutstation ? '920px' : isCompany || isSupport ? '320px' : '720px';

    const megaLinkClass =
      'block rounded-md px-3 py-2 text-[13px] font-normal leading-snug text-gray-600 transition-colors duration-200 hover:bg-blue-50 hover:text-blue-600';
    const megaGridLinkClass =
      'block rounded-md px-3 py-2 text-[13px] font-normal text-gray-600 transition-colors duration-200 hover:bg-blue-50 hover:text-blue-600 text-left';
    const megaSectionTitle = 'mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400';

    return (
      <div
        ref={megaMenuRef}
        className="premium-mega-menu fixed z-[9998] flex animate-mega-menu-in rounded-xl border border-gray-200/90 bg-white p-0 shadow-[0_12px_40px_rgba(15,23,42,0.12)]"
        tabIndex={-1}
        onMouseEnter={cancelMegaMenuClose}
        onMouseLeave={scheduleMegaMenuClose}
        style={{
          minHeight: isOutstation ? 360 : isCompany || isSupport ? 180 : 240,
          width: menuWidth,
          maxWidth: '95vw',
          left: '50%',
          top: '50%',
          transform: 'translateX(-50%) translateY(-50%)',
        }}
      >
        {isCompany || isSupport ? (
          <div className="w-full px-5 py-4">
            <div className={megaSectionTitle}>{category}</div>
            <div className="space-y-0.5">
              {left.map((item) => (
                <Link
                  key={item.label}
                  to={item.to}
                  className={megaLinkClass}
                  onClick={() => setMegaMenuOpen(null)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="w-[34%] shrink-0 rounded-l-xl border-r border-gray-100 bg-gray-50/80 px-4 py-4">
              {left.map((item, idx) => (
                <Link
                  key={item.label}
                  to={item.to}
                  className={cn(
                    'mb-0.5 flex w-full items-center rounded-md px-3 py-2 text-left text-[13px] transition-colors duration-200',
                    activeLeftIndex === idx
                      ? 'bg-white font-medium text-blue-600 shadow-sm'
                      : 'font-normal text-gray-600 hover:bg-white/80 hover:text-blue-600'
                  )}
                  onMouseEnter={() => setActiveLeftIndex(idx)}
                  onClick={() => setMegaMenuOpen(null)}
                >
                  {item.label}
                  <ChevronDown className="ml-auto h-3.5 w-3.5 rotate-[-90deg] opacity-40" />
                </Link>
              ))}
            </div>
            <div className="flex-1 px-5 py-4">
              {/* If Services > Outstation is selected, show dynamic city links */}
              {category === 'Services' && left[activeLeftIndex]?.label === 'Outstation' ? (
                <div>
                  <div className={megaSectionTitle}>Long Distance</div>
                  <div className="grid max-h-[420px] grid-cols-4 gap-1 overflow-y-auto">
                    {Object.keys(CITY_LOOKUP)
                      .filter(city => city !== 'Visakhapatnam')
                      .sort((a, b) => a.localeCompare(b))
                      .map(city => (
                        <Link
                          key={city}
                          to={`/outstation-taxi/visakhapatnam-to-${city.toLowerCase().replace(/ /g, '-')}`}
                          className={megaGridLinkClass}
                          onClick={() => setMegaMenuOpen(null)}
                        >
                          {city}
                        </Link>
                      ))}
                  </div>
                </div>
              ) : category === 'Services' && left[activeLeftIndex]?.label === 'Tour Packages' ? (
                <div>
                  <div className={megaSectionTitle}>Tour Packages</div>
                  <div className="grid max-h-[420px] grid-cols-2 gap-1 overflow-y-auto">
                    {tourData
                      .filter(tour => tour.tourName)
                      .sort((a, b) => a.tourName.localeCompare(b.tourName))
                      .map(tour => (
                        <Link
                          key={tour.tourId}
                          to={getTourUrl(tour)}
                          className={megaGridLinkClass}
                          onClick={() => setMegaMenuOpen(null)}
                        >
                          {tour.tourName}
                        </Link>
                      ))}
                  </div>
                </div>
              ) : category === 'Services' && left[activeLeftIndex]?.label === 'Tempo Traveller Rental' ? (
                <div>
                  <div className={megaSectionTitle}>Tempo Traveller Services</div>
                  <div className="grid max-h-[420px] grid-cols-2 gap-1 overflow-y-auto">
                    {left[activeLeftIndex]?.subItems?.map((subItem, idx) => (
                      <Link
                        key={idx}
                        to={subItem.to}
                        className={megaGridLinkClass}
                        onClick={() => setMegaMenuOpen(null)}
                      >
                        {subItem.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : category === 'Tour Packages' ? (
                <div>
                  <div className={megaSectionTitle}>Tour Packages</div>
                  <div className="grid max-h-[420px] grid-cols-2 gap-1 overflow-y-auto">
                    {tourData
                      .filter(tour => tour.tourName)
                      .sort((a, b) => a.tourName.localeCompare(b.tourName))
                      .map(tour => (
                        <Link
                          key={tour.tourId}
                          to={getTourUrl(tour)}
                          className={megaGridLinkClass}
                          onClick={() => setMegaMenuOpen(null)}
                        >
                          {tour.tourName}
                        </Link>
                      ))}
                  </div>
                </div>
              ) : right[activeLeftIndex] && (
                <div>
                  <div className={megaSectionTitle}>{right[activeLeftIndex].label}</div>
                  <div className="grid grid-cols-1 gap-0.5">
                    {right[activeLeftIndex].items.map((sub, i) => (
                      <span key={i} className="px-3 py-1.5 text-[13px] text-gray-500">
                        {sub}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  const topNavLinks = [
    { label: 'Local Taxi', to: '/local-taxi' },
    { label: 'Outstation', to: '/outstation-taxi' },
    { label: 'Airport', to: '/airport-taxi' },
    { label: 'Tours', to: '/tours' },
  ];

  const isNavLinkActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  return (
    <>
    <nav
      ref={siteNavbarRef}
      className={cn(
        'site-navbar fixed top-0 left-0 right-0 z-[9999] w-full overflow-x-clip animate-header-slide-down transition-shadow duration-300',
        isScrolled && 'site-navbar--shrunk shadow-[0_2px_20px_rgba(15,23,42,0.06)]'
      )}
    >
      {/* Top Navigation — desktop only (mobile uses search above the logo row) */}
      <div className="hidden overflow-x-clip bg-blue-800 text-white lg:block">
        <div className="container mx-auto grid grid-cols-[1fr_auto_1fr] items-center gap-3 overflow-hidden px-6 py-2 text-[11px] lg:px-8">
          <div className="flex min-w-0 items-center">
            <span className="inline-flex items-center gap-1.5 font-medium text-white/95">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Visakhapatnam, Andhra Pradesh
            </span>
          </div>

          <div className="flex items-center justify-center gap-1.5">
            {topNavLinks.map((item) => {
              const active = isNavLinkActive(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    'premium-top-nav-link shrink-0 rounded-full px-3 py-1 font-medium transition-all duration-250',
                    active
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-white/88 hover:bg-white/10 hover:text-white',
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="flex shrink-0 items-center justify-end gap-5">
            <Link
              to="/our-story"
              className={cn(
                'font-medium transition-colors duration-250 hover:text-white',
                isNavLinkActive('/our-story') ? 'text-white' : 'text-white/85',
              )}
            >
              About Us
            </Link>
            <Link
              to="/contact-us"
              className={cn(
                'font-medium transition-colors duration-250 hover:text-white',
                isNavLinkActive('/contact-us') ? 'text-white' : 'text-white/85',
              )}
            >
              Contact
            </Link>
            <a
              href="tel:+919966363662"
              className="flex items-center gap-1.5 font-semibold text-white transition-opacity duration-250 hover:opacity-90"
            >
              <Phone className="h-3.5 w-3.5" />
              9966363662
            </a>
          </div>
        </div>
      </div>

      {/* Middle Navigation */}
      <div className="border-b border-gray-100/80 bg-white/[0.97] backdrop-blur-xl">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Mobile: search + voice above logo / menu */}
          <div className="pb-2 pt-2.5 lg:hidden">
            <HeaderSearchBar className="max-w-none" />
          </div>
          <div
            className={cn(
              'site-navbar-brand-row flex items-center gap-5 transition-all duration-300',
              isScrolled ? 'py-2' : 'py-2.5 lg:py-3'
            )}
          >
          {/* Logo */}
          <Link
            to="/"
            className="flex shrink-0 items-center"
            onClick={(event) => {
              dispatchBookingHomeReset();
              if (location.pathname === '/') {
                event.preventDefault();
                // Clear ?search=1 (and any other home query) so Index exits search mode
                if (location.search || location.hash) {
                  navigate('/', { replace: true });
                }
              }
            }}
          >
            <Logo size="small" linkless className="h-8 w-auto sm:h-9 lg:h-10" />
          </Link>

          {/* Center search */}
          <div className="hidden min-w-0 flex-1 justify-center px-3 lg:flex">
            <HeaderSearchBar />
          </div>

          {/* Desktop — support + auth */}
          <div className="premium-header-actions hidden shrink-0 items-center gap-2.5 lg:flex xl:gap-3">
            <Link
              to="/support"
              className="premium-nav-action group relative inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-medium text-gray-600 transition-all duration-250 hover:bg-gray-50/80 hover:text-blue-600"
            >
              <Headphones className="h-4 w-4 shrink-0 text-gray-400 transition-colors group-hover:text-blue-600" aria-hidden />
              <span className="hidden lg:inline">Support</span>
              <span className="premium-nav-action-underline" aria-hidden />
            </Link>
            <Link
              to="/help-center"
              className="premium-nav-action group relative inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-medium text-gray-600 transition-all duration-250 hover:bg-gray-50/80 hover:text-blue-600"
            >
              <HelpCircle className="h-4 w-4 shrink-0 text-gray-400 transition-colors group-hover:text-blue-600" aria-hidden />
              <span className="hidden lg:inline">Help Center</span>
              <span className="premium-nav-action-underline" aria-hidden />
            </Link>
            <button
              type="button"
              className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-500 transition-all duration-250 hover:bg-gray-50 hover:text-blue-600 premium-btn-scale"
              aria-label="Notifications"
            >
              <Bell className="h-[17px] w-[17px]" />
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-blue-600 ring-2 ring-white" />
            </button>
            <Link
              to="/signup"
              className="premium-book-btn premium-btn-scale relative inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-[12px] font-semibold leading-none text-white"
            >
              <Car className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Book a Cab
            </Link>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="premium-profile-trigger flex items-center gap-2 rounded-full border border-gray-200/80 bg-white py-1 pl-1 pr-3 transition-all duration-250 hover:border-gray-300 hover:shadow-sm"
                  >
                    <Avatar className="h-8 w-8 ring-2 ring-white">
                      <AvatarImage src={''} alt={user.name} />
                      <AvatarFallback className="bg-blue-600 text-xs font-semibold text-white">
                        {user.name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="max-w-[7rem] truncate text-[12px] font-medium text-gray-800">{user.name}</span>
                    <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                  </button>
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
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    className="premium-btn-scale h-9 shrink-0 rounded-full bg-blue-600 px-4 text-[12px] font-semibold leading-none text-white hover:bg-blue-700"
                  >
                    Login
                    <ChevronDown className="ml-1 h-3.5 w-3.5 shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem asChild>
                    <Link to="/login" className="w-full cursor-pointer">
                      Login
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/signup" className="w-full cursor-pointer">
                      Sign Up
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="ml-auto flex items-center gap-1 lg:hidden">
            <a
              href="tel:+919966363662"
              className="flex items-center rounded-full border border-blue-200 bg-blue-50 p-2 text-blue-700 transition-colors hover:bg-blue-100 sm:hidden"
              aria-label="Call 9966363662"
            >
              <Phone className="h-5 w-5" />
            </a>
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
                  {/* Home */}
                  <Link to="/" className="flex items-center space-x-2 py-2 px-4 rounded-md hover:bg-gray-100 transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
                    <Home className="h-5 w-5" />
                    <span>Home</span>
                  </Link>

                  {/* Hire Driver - Standalone */}
                  <Link to="/hire-driver" className="flex items-center space-x-2 py-2 px-4 rounded-md hover:bg-gray-100 transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
                    <User className="h-5 w-5" />
                    <span>Hire Driver</span>
                  </Link>
                  <Link to="/offers" className="flex items-center space-x-2 py-2 px-4 rounded-md hover:bg-gray-100 transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
                    <BadgePercent className="h-5 w-5" />
                    <span>Offers</span>
                  </Link>

                  {/* Services Section */}
                  <div className="space-y-2">
                    <div 
                      className="flex items-center justify-between py-2 px-4 rounded-md hover:bg-gray-100 transition-colors cursor-pointer"
                      onClick={() => toggleMobileMenuSection('services')}
                    >
                      <div className="flex items-center space-x-2">
                        <Car className="h-5 w-5" />
                        <span className="font-medium">Services</span>
                      </div>
                      {mobileMenuSections.services ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                    {mobileMenuSections.services && (
                      <div className="ml-6 space-y-1">
                        <Link to="/local-taxi" className="flex items-center space-x-2 py-2 px-4 rounded-md hover:bg-gray-100 transition-colors text-sm" onClick={() => setIsMobileMenuOpen(false)}>
                          <Car className="h-4 w-4" />
                          <span>Local Taxi</span>
                        </Link>
                        <Link to="/outstation-taxi" className="flex items-center space-x-2 py-2 px-4 rounded-md hover:bg-gray-100 transition-colors text-sm" onClick={() => setIsMobileMenuOpen(false)}>
                          <MapPin className="h-4 w-4" />
                          <span>Outstation</span>
                        </Link>
                        <Link to="/airport-taxi" className="flex items-center space-x-2 py-2 px-4 rounded-md hover:bg-gray-100 transition-colors text-sm" onClick={() => setIsMobileMenuOpen(false)}>
                          <Plane className="h-4 w-4" />
                          <span>Airport Transfer</span>
                        </Link>
                        <Link to="/tours" className="flex items-center space-x-2 py-2 px-4 rounded-md hover:bg-gray-100 transition-colors text-sm" onClick={() => setIsMobileMenuOpen(false)}>
                          <Calendar className="h-4 w-4" />
                          <span>Tour Packages</span>
                        </Link>
                        <Link to="/group-tours" className="flex items-center space-x-2 py-2 px-4 rounded-md hover:bg-gray-100 transition-colors text-sm" onClick={() => setIsMobileMenuOpen(false)}>
                          <Calendar className="h-4 w-4" />
                          <span>Group Tours</span>
                        </Link>
                        <Link to="/shared-carpooling" className="flex items-center space-x-2 py-2 px-4 rounded-md hover:bg-gray-100 transition-colors text-sm" onClick={() => setIsMobileMenuOpen(false)}>
                          <Users className="h-4 w-4" />
                          <span>Shared Carpooling</span>
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* Company Section - Toggle */}
                  <div className="space-y-2">
                    <div 
                      className="flex items-center justify-between py-2 px-4 rounded-md hover:bg-gray-100 transition-colors cursor-pointer"
                      onClick={() => toggleMobileMenuSection('company')}
                    >
                      <div className="flex items-center space-x-2">
                        <Info className="h-5 w-5" />
                        <span className="font-medium">Company</span>
                      </div>
                      {mobileMenuSections.company ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                    {mobileMenuSections.company && (
                      <div className="ml-6 space-y-1">
                        <Link to="/our-story" className="flex items-center space-x-2 py-2 px-4 rounded-md hover:bg-gray-100 transition-colors text-sm" onClick={() => setIsMobileMenuOpen(false)}>
                          <Info className="h-4 w-4" />
                          <span>Our Story</span>
                        </Link>
                        <Link to="/vision-mission" className="flex items-center space-x-2 py-2 px-4 rounded-md hover:bg-gray-100 transition-colors text-sm" onClick={() => setIsMobileMenuOpen(false)}>
                          <Info className="h-4 w-4" />
                          <span>Vision & Mission</span>
                        </Link>
                        <Link to="/fleet" className="flex items-center space-x-2 py-2 px-4 rounded-md hover:bg-gray-100 transition-colors text-sm" onClick={() => setIsMobileMenuOpen(false)}>
                          <Car className="h-4 w-4" />
                          <span>Fleet</span>
                        </Link>
                        <Link to="/careers" className="flex items-center space-x-2 py-2 px-4 rounded-md hover:bg-gray-100 transition-colors text-sm" onClick={() => setIsMobileMenuOpen(false)}>
                          <User className="h-4 w-4" />
                          <span>Careers</span>
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* Support Section - Toggle */}
                  <div className="space-y-2">
                    <div 
                      className="flex items-center justify-between py-2 px-4 rounded-md hover:bg-gray-100 transition-colors cursor-pointer"
                      onClick={() => toggleMobileMenuSection('support')}
                    >
                      <div className="flex items-center space-x-2">
                        <Phone className="h-5 w-5" />
                        <span className="font-medium">Support</span>
                      </div>
                      {mobileMenuSections.support ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                    {mobileMenuSections.support && (
                      <div className="ml-6 space-y-1">
                        <Link to="/support" className="flex items-center space-x-2 py-2 px-4 rounded-md hover:bg-gray-100 transition-colors text-sm" onClick={() => setIsMobileMenuOpen(false)}>
                          <Phone className="h-4 w-4" />
                          <span>Support</span>
                        </Link>
                        <Link to="/help-center" className="flex items-center space-x-2 py-2 px-4 rounded-md hover:bg-gray-100 transition-colors text-sm" onClick={() => setIsMobileMenuOpen(false)}>
                          <Info className="h-4 w-4" />
                          <span>Help Center</span>
                        </Link>
                        <Link to="/contact-us" className="flex items-center space-x-2 py-2 px-4 rounded-md hover:bg-gray-100 transition-colors text-sm" onClick={() => setIsMobileMenuOpen(false)}>
                          <Phone className="h-4 w-4" />
                          <span>Contact Us</span>
                        </Link>
                        <Link to="/terms-conditions" className="flex items-center space-x-2 py-2 px-4 rounded-md hover:bg-gray-100 transition-colors text-sm" onClick={() => setIsMobileMenuOpen(false)}>
                          <Info className="h-4 w-4" />
                          <span>Terms & Conditions</span>
                        </Link>
                        <Link to="/privacy-policy" className="flex items-center space-x-2 py-2 px-4 rounded-md hover:bg-gray-100 transition-colors text-sm" onClick={() => setIsMobileMenuOpen(false)}>
                          <Info className="h-4 w-4" />
                          <span>Privacy Policy</span>
                        </Link>
                        <Link to="/cancellation-refund-policy" className="flex items-center space-x-2 py-2 px-4 rounded-md hover:bg-gray-100 transition-colors text-sm" onClick={() => setIsMobileMenuOpen(false)}>
                          <Info className="h-4 w-4" />
                          <span>Cancellation & Refund Policy</span>
                        </Link>
                      </div>
                    )}
                  </div>



                  {/* Contact Information */}
                  <div className="border-t pt-4">
                    <div className="flex items-center space-x-2 py-2 px-4">
                      <Phone className="h-5 w-5 text-blue-600" />
                      <a href="tel:+919966363662" className="text-blue-600 font-medium bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-lg border border-blue-200 hover:border-blue-300 transition-all duration-200">
                        9966363662
                      </a>
                    </div>
                  </div>

                  {/* Auth Section */}
                  {user ? (
                    <div className="border-t pt-4 space-y-2">
                      <Button variant="ghost" className="flex items-center space-x-2 py-2 px-4 rounded-md hover:bg-gray-100 transition-colors w-full justify-start" onClick={handleDashboard}>
                        <User className="h-5 w-5" />
                        <span>Dashboard</span>
                      </Button>
                      <Button variant="ghost" className="flex items-center space-x-2 py-2 px-4 rounded-md hover:bg-gray-100 transition-colors w-full justify-start" onClick={handleLogout}>
                        <LogOut className="h-5 w-5" />
                        <span>Logout</span>
                      </Button>
                    </div>
                  ) : (
                    <div className="border-t pt-4 space-y-2">
                      <Link to="/login" className="flex items-center space-x-2 py-2 px-4 rounded-md hover:bg-gray-100 transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
                        <User className="h-5 w-5" />
                        <span>Login</span>
                      </Link>
                      <Link to="/signup" className="flex items-center space-x-2 py-2 px-4 rounded-md hover:bg-gray-100 transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
                        <UserPlus className="h-5 w-5" />
                        <span>Sign Up</span>
                      </Link>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

          {/* Bottom Navigation — hover opens mega menu (desktop) */}
          <div className="hidden items-center gap-1 border-t border-gray-100/70 pb-1.5 pt-1 text-[12px] font-medium lg:flex">
            {MEGA_MENU_CATEGORIES.map((cat) => {
              const MenuIcon = MEGA_MENU_ICONS[cat];
              return (
              <div
                key={cat}
                className="relative"
                onMouseEnter={() => openMegaMenu(cat)}
                onMouseLeave={scheduleMegaMenuClose}
              >
                <button
                  ref={buttonRefs[cat]}
                  type="button"
                  className={cn(
                    'premium-nav-link group relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all duration-250 hover:bg-white/60 focus:outline-none',
                    megaMenuOpen === cat ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'
                  )}
                  aria-expanded={megaMenuOpen === cat}
                  aria-haspopup="true"
                  onClick={() => {
                    if (megaMenuOpen === cat) {
                      setMegaMenuOpen(null);
                    } else {
                      openMegaMenu(cat);
                    }
                  }}
                >
                  <MenuIcon className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                  {cat}
                  <ChevronDown
                    className={cn(
                      'ml-0.5 h-3.5 w-3.5 transition-transform duration-250',
                      megaMenuOpen === cat && 'rotate-180'
                    )}
                  />
                  <span
                    className={cn(
                      'premium-nav-underline absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-blue-600 transition-transform duration-250 origin-left',
                      megaMenuOpen === cat ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                    )}
                  />
                </button>
                {megaMenuOpen === cat && createPortal(renderMegaMenu(cat), document.body)}
              </div>
            );
            })}
            <Link
              to="/hire-driver"
              className="premium-nav-link group relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-gray-600 transition-all duration-250 hover:bg-white/60 hover:text-blue-600"
            >
              <Briefcase className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
              Hire Driver
              <span className="premium-nav-underline absolute bottom-0 left-3.5 right-3.5 h-[2px] scale-x-0 rounded-full bg-blue-600 transition-transform duration-250 origin-left group-hover:scale-x-100" />
            </Link>
            <Link
              to="/offers"
              className="premium-nav-link group relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-gray-600 transition-all duration-250 hover:bg-white/60 hover:text-blue-600"
            >
              <BadgePercent className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
              Offers
              <span className="premium-nav-underline absolute bottom-0 left-3.5 right-3.5 h-[2px] scale-x-0 rounded-full bg-blue-600 transition-transform duration-250 origin-left group-hover:scale-x-100" />
            </Link>
          </div>
        </div>
      </div>
    </nav>
    <div className="site-navbar-spacer shrink-0" aria-hidden="true" />
    </>
  );
}
