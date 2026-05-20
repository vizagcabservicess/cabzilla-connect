import { Link, useLocation } from 'react-router-dom';
import { Home, Ticket, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BRAND_GREEN } from '../constants';

const NAV = [
  { label: 'Home', href: '/shared-carpooling', icon: Home },
  { label: 'My Bookings', href: '/shared-carpooling/bookings', icon: Ticket },
  { label: 'Profile', href: '/shared-carpooling/account', icon: User },
] as const;

export function CarpoolBottomNav() {
  const { pathname } = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-lg">
        {NAV.map(({ label, href, icon: Icon }) => {
          const active =
            href === '/shared-carpooling'
              ? pathname === '/shared-carpooling' || pathname === '/shared-carpooling/'
              : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              to={href}
              className={cn(
                'flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium',
                active ? 'text-gray-900' : 'text-gray-500',
              )}
            >
              <Icon className="h-5 w-5" style={active ? { color: BRAND_GREEN } : undefined} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
