import { Link, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Loader2 } from 'lucide-react';
import {
  ChevronRight, CreditCard, Gift, HelpCircle, LogOut, Settings, ShieldCheck, Ticket, User,
} from 'lucide-react';
import { CarpoolAppHeader } from '@/components/shared-carpooling/app/CarpoolAppHeader';
import { CarpoolBottomNav } from '@/components/shared-carpooling/app/CarpoolBottomNav';
import { BRAND_GREEN } from '@/components/shared-carpooling/constants';
import { carpoolLoginPath } from '@/components/shared-carpooling/carpoolAuthRoutes';
import { useCarpoolUser } from '@/providers/CarpoolUserProvider';

const MENU = [
  { label: 'My Bookings', href: '/shared-carpooling/bookings', icon: Ticket },
  { label: 'My Passes', href: '/shared-carpooling/find', icon: ShieldCheck },
  { label: 'Payment Methods', href: '#', icon: CreditCard },
  { label: 'Refer & Earn', href: '#', icon: Gift },
  { label: 'Help & Support', href: '/contact', icon: HelpCircle },
  { label: 'Settings', href: '#', icon: Settings },
] as const;

export default function SharedCarpoolAccountPage() {
  const { user, loading, isPhoneVerified, isProfileVerified, logout } = useCarpoolUser();

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-700" />
      </div>
    );
  }

  if (!isPhoneVerified || !user) {
    return <Navigate to={carpoolLoginPath('/shared-carpooling/account')} replace />;
  }

  return (
    <>
      <Helmet><title>Account | Vizag Taxi Hub Carpooling</title></Helmet>
      <CarpoolAppHeader title="Account" showLogo />
      <main className="mx-auto max-w-lg px-4 pb-24 pt-4">
        <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold text-white"
            style={{ backgroundColor: BRAND_GREEN }}
          >
            {user?.fullName?.charAt(0) ?? <User className="h-6 w-6" />}
          </div>
          <div>
            <p className="font-bold text-gray-900">{user.fullName ?? 'Commuter'}</p>
            <p className="text-sm text-gray-500">+91 {user.phone}</p>
            {isProfileVerified && (
              <span className="mt-1 inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase text-white" style={{ backgroundColor: BRAND_GREEN }}>
                Verified {user?.userRole === 'student' ? 'Student' : 'Employee'}
              </span>
            )}
          </div>
        </div>

        <nav className="mt-6 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          {MENU.map(({ label, href, icon: Icon }, i) => (
            <Link
              key={label}
              to={href}
              className="flex items-center justify-between border-b border-gray-50 px-4 py-4 last:border-0 hover:bg-gray-50"
            >
              <span className="flex items-center gap-3 text-sm font-medium text-gray-800">
                <Icon className="h-5 w-5 text-gray-400" />
                {label}
              </span>
              <ChevronRight className="h-4 w-4 text-gray-300" />
            </Link>
          ))}
        </nav>

        <button
          type="button"
          onClick={logout}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 py-3.5 text-sm font-semibold text-red-600 hover:bg-red-50"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </main>
      <CarpoolBottomNav />
    </>
  );
}
