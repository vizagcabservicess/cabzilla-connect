import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, LayoutDashboard, LogIn, Menu, Phone, UserPlus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BRAND_GREEN } from './constants';
import { carpoolLoginPath, carpoolSignupPath } from './carpoolAuthRoutes';
import { useCarpoolUserOptional } from '@/providers/CarpoolUserProvider';
import { Logo } from '@/components/Logo';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const MAIN_NAV_MENUS = {
  Services: [
    { label: 'Local Taxi', to: '/local-taxi' },
    { label: 'Outstation', to: '/outstation-taxi' },
    { label: 'Airport Transfer', to: '/airport-taxi' },
    { label: 'Tour Packages', to: '/tours' },
    { label: 'Group Tours', to: '/group-tours' },
    { label: 'Shared Carpooling', to: '/shared-carpooling' },
    { label: 'Tempo Traveller Rental', to: '/tempo-traveller-rental-vizag' },
    { label: 'Hire Driver', to: '/hire-driver' },
  ],
  'Tour Packages': [
    { label: 'View All Tours', to: '/tours' },
    { label: 'Araku Valley Tour', to: '/tours/araku-valley-tour' },
    { label: 'Lambasingi Tour', to: '/tours/lambasingi-tour' },
    { label: 'Vizag North City Tour', to: '/tours/vizag-north-city-tour' },
  ],
  Company: [
    { label: 'Our Story', to: '/our-story' },
    { label: 'Vision & Mission', to: '/vision-mission' },
    { label: 'Fleet', to: '/fleet' },
    { label: 'Careers', to: '/careers' },
  ],
  Support: [
    { label: 'Support', to: '/support' },
    { label: 'Help Center', to: '/help-center' },
    { label: 'Contact Us', to: '/contact-us' },
    { label: 'Terms & Conditions', to: '/terms-conditions' },
    { label: 'Privacy Policy', to: '/privacy-policy' },
    { label: 'Cancellation & Refund Policy', to: '/cancellation-refund-policy' },
  ],
} as const;

type CarpoolingNavbarProps = {
  onBookSeat: () => void;
};

function NavDropdown({ label, items }: { label: string; items: ReadonlyArray<{ label: string; to: string }> }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:text-gray-900 focus:outline-none">
        {label}
        <ChevronDown className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[220px]">
        {items.map((item) => (
          <DropdownMenuItem key={item.to} asChild>
            <Link to={item.to} className="cursor-pointer">
              {item.label}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function CarpoolingNavbar({ onBookSeat }: CarpoolingNavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const carpoolUser = useCarpoolUserOptional();
  const isLoggedIn = Boolean(carpoolUser?.isPhoneVerified);
  const firstName = carpoolUser?.user?.fullName?.split(' ')[0] ?? 'User';

  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white shadow-sm">
      <div className="mx-auto flex h-[72px] max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Logo to="/" size="medium" className="shrink-0" />

        <nav className="hidden items-center gap-1 xl:flex" aria-label="Main">
          {Object.entries(MAIN_NAV_MENUS).map(([label, items]) => (
            <NavDropdown key={label} label={label} items={items} />
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href="tel:+919966363662"
            className="hidden items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 md:flex"
          >
            <Phone className="h-4 w-4 text-blue-600" />
            +91 9966363662
          </a>
          {isLoggedIn ? (
            <Link
              to="/shared-carpooling/home"
              className="hidden items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-semibold sm:flex"
              style={{ color: BRAND_GREEN }}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span className="max-w-[100px] truncate">Hi, {firstName}</span>
            </Link>
          ) : (
            <>
              <Link
                to={carpoolLoginPath('/shared-carpooling/home')}
                className="hidden items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 sm:flex"
              >
                <LogIn className="h-4 w-4" style={{ color: BRAND_GREEN }} />
                Login
              </Link>
              <Link
                to={carpoolSignupPath('/shared-carpooling/home')}
                className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-white hover:opacity-90 sm:flex"
                style={{ backgroundColor: BRAND_GREEN }}
              >
                <UserPlus className="h-4 w-4" />
                Sign Up
              </Link>
            </>
          )}
          <button
            type="button"
            onClick={onBookSeat}
            className="hidden rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:opacity-90 sm:block sm:px-5"
            style={{ backgroundColor: BRAND_GREEN }}
          >
            Book a Seat
          </button>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-700 xl:hidden"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="max-h-[70vh] overflow-y-auto border-t border-gray-100 bg-white px-4 py-4 xl:hidden" aria-label="Mobile">
          <ul className="space-y-4">
            {Object.entries(MAIN_NAV_MENUS).map(([heading, items]) => (
              <li key={heading}>
                <p className="mb-2 px-3 text-xs font-bold uppercase tracking-wide text-gray-500">{heading}</p>
                <ul className="space-y-1">
                  {items.map((item) => (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        className={cn(
                          'block rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50',
                          item.to.startsWith('/shared-carpooling') && 'font-semibold text-green-700',
                        )}
                        onClick={() => setMobileOpen(false)}
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
            <li className="border-t border-gray-100 pt-2">
              {isLoggedIn ? (
                <Link
                  to="/shared-carpooling/home"
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold"
                  style={{ color: BRAND_GREEN }}
                  onClick={() => setMobileOpen(false)}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  My Dashboard
                </Link>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to={carpoolLoginPath('/shared-carpooling/home')}
                    className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-semibold text-gray-700"
                    onClick={() => setMobileOpen(false)}
                  >
                    <LogIn className="h-4 w-4" style={{ color: BRAND_GREEN }} />
                    Login
                  </Link>
                  <Link
                    to={carpoolSignupPath('/shared-carpooling/home')}
                    className="flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-white"
                    style={{ backgroundColor: BRAND_GREEN }}
                    onClick={() => setMobileOpen(false)}
                  >
                    <UserPlus className="h-4 w-4" />
                    Sign Up
                  </Link>
                </div>
              )}
            </li>
            <li className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  onBookSeat();
                }}
                className="w-full rounded-lg py-3 text-sm font-semibold text-white"
                style={{ backgroundColor: BRAND_GREEN }}
              >
                Book a Seat
              </button>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
