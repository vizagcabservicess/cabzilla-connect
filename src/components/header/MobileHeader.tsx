import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Car,
  ChevronDown,
  ChevronUp,
  Home,
  Info,
  LogOut,
  MapPin,
  Menu,
  Phone,
  Plane,
  User,
  UserPlus,
  Users,
  BadgePercent,
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { HeaderSearchBar } from './HeaderSearchBar';
import { dispatchBookingHomeReset } from '@/lib/bookingSessionReset';

export function MobileHeader() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [sections, setSections] = useState({
    services: false,
    company: false,
    support: false,
  });

  const close = () => setIsOpen(false);

  const toggle = (key: keyof typeof sections) => {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleDashboard = () => {
    if (isAdmin) navigate('/admin');
    else navigate('/dashboard');
    close();
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
    close();
  };

  return (
    <div className="border-b border-gray-200 bg-white shadow-sm lg:hidden">
      <div className="px-4">
        <div className="flex items-center justify-between py-3">
          <Link
            to="/"
            onClick={(event) => {
              dispatchBookingHomeReset();
              if (location.pathname === '/') {
                event.preventDefault();
                if (location.search || location.hash) {
                  navigate('/', { replace: true });
                }
              }
            }}
          >
            <Logo size="small" linkless />
          </Link>
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" className="p-2" aria-label="Open menu">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="sm:max-w-sm">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
                <SheetDescription>Explore Vizag Taxi Hub</SheetDescription>
              </SheetHeader>
              <div className="grid gap-3 py-4">
                <Link
                  to="/"
                  className="flex items-center gap-2 rounded-md px-4 py-2 hover:bg-gray-100"
                  onClick={close}
                >
                  <Home className="h-5 w-5" />
                  Home
                </Link>
                <Link
                  to="/hire-driver"
                  className="flex items-center gap-2 rounded-md px-4 py-2 hover:bg-gray-100"
                  onClick={close}
                >
                  <User className="h-5 w-5" />
                  Hire Driver
                </Link>
                <Link
                  to="/offers"
                  className="flex items-center gap-2 rounded-md px-4 py-2 hover:bg-gray-100"
                  onClick={close}
                >
                  <BadgePercent className="h-5 w-5" />
                  Offers
                </Link>

                {(
                  [
                    {
                      key: 'services' as const,
                      label: 'Services',
                      icon: Car,
                      links: [
                        { to: '/local-taxi', label: 'Local Taxi', icon: Car },
                        { to: '/outstation-taxi', label: 'Outstation', icon: MapPin },
                        { to: '/airport-taxi', label: 'Airport Transfer', icon: Plane },
                        { to: '/tours', label: 'Tour Packages', icon: Calendar },
                        { to: '/group-tours', label: 'Group Tours', icon: Calendar },
                        { to: '/shared-carpooling', label: 'Shared Carpooling', icon: Users },
                      ],
                    },
                    {
                      key: 'company' as const,
                      label: 'Company',
                      icon: Info,
                      links: [
                        { to: '/our-story', label: 'Our Story', icon: Info },
                        { to: '/vision-mission', label: 'Vision & Mission', icon: Info },
                        { to: '/fleet', label: 'Fleet', icon: Car },
                        { to: '/careers', label: 'Careers', icon: User },
                      ],
                    },
                    {
                      key: 'support' as const,
                      label: 'Support',
                      icon: Phone,
                      links: [
                        { to: '/support', label: 'Support', icon: Phone },
                        { to: '/help-center', label: 'Help Center', icon: Info },
                        { to: '/contact-us', label: 'Contact Us', icon: Phone },
                        { to: '/terms-conditions', label: 'Terms & Conditions', icon: Info },
                        { to: '/privacy-policy', label: 'Privacy Policy', icon: Info },
                        { to: '/cancellation-refund-policy', label: 'Cancellation & Refund Policy', icon: Info },
                      ],
                    },
                  ] as const
                ).map(({ key, label, icon: Icon, links }) => (
                  <div key={key}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded-md px-4 py-2 hover:bg-gray-100"
                      onClick={() => toggle(key)}
                    >
                      <span className="flex items-center gap-2">
                        <Icon className="h-5 w-5" />
                        {label}
                      </span>
                      {sections[key] ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                    {sections[key] && (
                      <div className="ml-6 space-y-1">
                        {links.map(({ to, label: linkLabel, icon: LinkIcon }) => (
                          <Link
                            key={to}
                            to={to}
                            className="flex items-center gap-2 rounded-md px-4 py-2 text-sm hover:bg-gray-100"
                            onClick={close}
                          >
                            <LinkIcon className="h-4 w-4" />
                            {linkLabel}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                <div className="border-t pt-4">
                  <a
                    href="tel:+919966363662"
                    className="flex items-center gap-2 px-4 py-2 font-medium text-[#1E3A8A]"
                  >
                    <Phone className="h-5 w-5" />
                    9966363662
                  </a>
                </div>

                {user ? (
                  <div className="space-y-2 border-t pt-4">
                    <Button variant="ghost" className="w-full justify-start" onClick={handleDashboard}>
                      <User className="mr-2 h-4 w-4" />
                      Dashboard
                    </Button>
                    <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 border-t pt-4">
                    <Link
                      to="/login"
                      className="rounded-[14px] bg-[#1E3A8A] px-4 py-3 text-center font-semibold text-white"
                      onClick={close}
                    >
                      Login
                    </Link>
                    <Link
                      to="/signup"
                      className="rounded-[14px] border border-[#1E3A8A] px-4 py-3 text-center font-semibold text-[#1E3A8A]"
                      onClick={close}
                    >
                      Sign Up
                    </Link>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="pb-3">
          <HeaderSearchBar className="max-w-none" />
        </div>
      </div>
    </div>
  );
}
