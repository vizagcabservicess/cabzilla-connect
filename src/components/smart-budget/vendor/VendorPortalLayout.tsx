import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  BadgePercent,
  Car,
  CircleHelp,
  ClipboardList,
  IndianRupee,
  LayoutDashboard,
  LogOut,
  Menu,
  RefreshCw,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SmartBudgetMediaImage } from '@/components/smart-budget/SmartBudgetMediaImage';
import type { SmartBudgetVendor } from '@/types/smartBudget';

export type VendorPortalSection =
  | 'dashboard'
  | 'requests'
  | 'bookings'
  | 'earnings'
  | 'campaigns'
  | 'vehicles'
  | 'drivers'
  | 'profile'
  | 'reports'
  | 'support';

const NAV: Array<{ id: VendorPortalSection; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'requests', label: 'Requests', icon: ClipboardList },
  { id: 'bookings', label: 'My Bookings', icon: Car },
  { id: 'earnings', label: 'Earnings', icon: IndianRupee },
  { id: 'campaigns', label: 'Campaigns', icon: BadgePercent },
  { id: 'vehicles', label: 'Vehicles', icon: Car },
  { id: 'drivers', label: 'Drivers', icon: Users },
  { id: 'profile', label: 'Profile', icon: UserRound },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'support', label: 'Support', icon: CircleHelp },
];

function tierBadgeClass(tier: string | undefined): string {
  switch (tier) {
    case 'gold':
      return 'bg-amber-100 text-amber-900';
    case 'platinum':
      return 'bg-slate-800 text-white';
    case 'silver':
    default:
      return 'bg-slate-200 text-slate-800';
  }
}

export function VendorPortalLayout({
  vendor,
  section,
  onSectionChange,
  requestCount,
  bookingCount,
  onRefresh,
  onLogout,
  children,
}: {
  vendor: SmartBudgetVendor | null;
  section: VendorPortalSection;
  onSectionChange: (section: VendorPortalSection) => void;
  requestCount: number;
  bookingCount?: number;
  onRefresh: () => void;
  onLogout: () => void;
  children: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [section]);

  const nav = (
    <nav className="space-y-1 p-3">
      {NAV.map((item) => {
        const Icon = item.icon;
        const active = section === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSectionChange(item.id)}
            className={cn(
              'flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition',
              active
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-900'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1">{item.label}</span>
            {item.id === 'requests' && requestCount > 0 && (
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                  active ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
                )}
              >
                {requestCount}
              </span>
            )}
            {item.id === 'bookings' && (bookingCount ?? 0) > 0 && (
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                  active ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-900'
                )}
              >
                {bookingCount}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto flex min-h-screen max-w-6xl">
        <aside className="hidden w-64 shrink-0 border-r bg-white md:flex md:flex-col">
          <div className="border-b px-4 py-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-800">
              Vizag Taxi Hub
            </p>
            <h1 className="mt-1 text-base font-bold text-slate-900">Vendor Dashboard</h1>
            <p className="mt-1 truncate text-sm text-slate-600">{vendor?.name || 'Vendor'}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {vendor?.profile_image_url ? (
                <SmartBudgetMediaImage
                  url={vendor.profile_image_url}
                  alt=""
                  className="h-8 w-8 rounded-full border object-cover"
                  fallback={
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border bg-slate-100 text-[9px] text-muted-foreground">
                      Pic
                    </div>
                  }
                />
              ) : null}
              <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', tierBadgeClass(vendor?.tier))}>
                {(vendor?.tier || 'silver').toUpperCase()}
              </span>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                ★ {Number(vendor?.rating ?? 0).toFixed(1)}
              </span>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[11px] font-medium capitalize',
                  vendor?.verification_status === 'approved'
                    ? 'bg-emerald-100 text-emerald-900'
                    : 'bg-amber-100 text-amber-950'
                )}
              >
                {(vendor?.verification_status || 'pending').replace('_', ' ')}
              </span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">{nav}</div>
          <div className="space-y-2 border-t p-3">
            <Button type="button" variant="outline" className="w-full justify-start" size="sm" onClick={onRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button type="button" variant="ghost" className="w-full justify-start" size="sm" onClick={onLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
            <Button asChild variant="link" size="sm" className="h-auto px-0 text-xs text-slate-500">
              <Link to="/">Back to website</Link>
            </Button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b bg-white px-4 py-3 md:px-6">
            <div className="flex min-w-0 items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileOpen((o) => !o)}
                aria-label="Menu"
              >
                {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </Button>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold uppercase tracking-widest text-emerald-800 md:hidden">
                  Vendor dashboard
                </p>
                <h2 className="truncate text-base font-semibold capitalize text-slate-900">
                  {NAV.find((n) => n.id === section)?.label || 'Dashboard'}
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" className="md:hidden" onClick={onRefresh}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="sm" className="md:hidden" onClick={onLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </header>

          {mobileOpen && (
            <div className="border-b bg-white md:hidden">
              {nav}
            </div>
          )}

          <main className="flex-1 px-4 py-5 md:px-6 md:py-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
