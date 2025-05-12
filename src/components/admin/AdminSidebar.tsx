
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  BarChart3,
  Calendar,
  CreditCard,
  File,
  FilePenLine,
  Package,
  Receipt,
  Settings,
  Users,
  Landmark,
  Truck
} from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { ModeToggle } from '@/components/ModeToggle';

export function AdminSidebar() {
  const { pathname } = useLocation();
  
  const isActive = (path: string) => pathname.includes(path);
  
  const menuItems = [
    {
      href: '/admin',
      icon: BarChart3,
      text: 'Dashboard',
      active: pathname === '/admin' || pathname === '/admin/',
    },
    {
      href: '/admin/bookings',
      icon: Calendar,
      text: 'Bookings',
      active: isActive('/admin/bookings'),
    },
    {
      href: '/admin/drivers',
      icon: Users,
      text: 'Drivers',
      active: isActive('/admin/drivers'),
    },
    {
      href: '/admin/vehicles',
      icon: Truck,
      text: 'Vehicles',
      active: isActive('/admin/vehicles'),
    },
    {
      href: '/admin/payments',
      icon: CreditCard,
      text: 'Payments',
      active: isActive('/admin/payments'),
    },
    {
      href: '/admin/users',
      icon: Users,
      text: 'Users',
      active: isActive('/admin/users'),
    },
    {
      href: '/admin/gst-report',
      icon: Receipt,
      text: 'GST Reports',
      active: isActive('/admin/gst'),
    },
    {
      href: '/admin/expenses',
      icon: Landmark,
      text: 'Expenses',
      active: isActive('/admin/expenses'),
    },
    {
      href: '/admin/payroll',
      icon: Receipt,
      text: 'Payroll',
      active: isActive('/admin/payroll'),
    },
    {
      href: '/admin/settings',
      icon: Settings,
      text: 'Settings',
      active: isActive('/admin/settings'),
    },
  ];
  
  return (
    <aside className="hidden lg:flex flex-col w-64 border-r px-6 py-8 sticky top-0 h-screen">
      <div className="flex items-center gap-2 mb-6">
        <Package className="h-6 w-6" />
        <span className="text-lg font-semibold">Admin Panel</span>
      </div>
      <nav className="space-y-1.5 flex-1">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              buttonVariants({ variant: 'ghost' }),
              'w-full justify-start',
              item.active && 'bg-muted hover:bg-muted'
            )}
          >
            <item.icon className="h-4 w-4 mr-2" />
            {item.text}
          </Link>
        ))}
      </nav>
      <div className="border-t pt-4 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          Admin Portal
        </span>
        <ModeToggle />
      </div>
    </aside>
  );
}
