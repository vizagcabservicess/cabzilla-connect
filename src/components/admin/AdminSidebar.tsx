
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Map, 
  Clock, 
  Plane, 
  Calendar, 
  Users, 
  Settings, 
  LogOut,
  Car 
} from 'lucide-react';

interface SidebarItemProps {
  href: string;
  icon: React.ReactNode;
  title: string;
  isActive: boolean;
}

const SidebarItem = ({ href, icon, title, isActive }: SidebarItemProps) => {
  return (
    <Link
      to={href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900",
        isActive ? "bg-gray-100 text-gray-900" : ""
      )}
    >
      {icon}
      <span>{title}</span>
    </Link>
  );
};

export function AdminSidebar() {
  const location = useLocation();
  const currentPath = location.pathname;
  
  return (
    <div className="h-full border-r bg-white">
      <div className="flex flex-col gap-2 p-4">
        <div className="py-2">
          <h2 className="mb-2 px-2 text-lg font-semibold tracking-tight">
            Dashboard
          </h2>
          <div className="space-y-1">
            <SidebarItem 
              href="/admin" 
              icon={<LayoutDashboard className="h-4 w-4" />} 
              title="Overview" 
              isActive={currentPath === "/admin"}
            />
          </div>
        </div>
        
        <div className="py-2">
          <h2 className="mb-2 px-2 text-lg font-semibold tracking-tight">
            Pricing Management
          </h2>
          <div className="space-y-1">
            <SidebarItem 
              href="/admin/trip-fares" 
              icon={<Map className="h-4 w-4" />} 
              title="Outstation Fares" 
              isActive={currentPath === "/admin/trip-fares"}
            />
            <SidebarItem 
              href="/admin/local-fares" 
              icon={<Clock className="h-4 w-4" />} 
              title="Local Package Fares" 
              isActive={currentPath === "/admin/local-fares"}
            />
            <SidebarItem 
              href="/admin/airport-fares" 
              icon={<Plane className="h-4 w-4" />} 
              title="Airport Transfer Fares" 
              isActive={currentPath === "/admin/airport-fares"}
            />
            <SidebarItem 
              href="/admin/vehicles" 
              icon={<Car className="h-4 w-4" />} 
              title="Vehicle Management" 
              isActive={currentPath === "/admin/vehicles"}
            />
          </div>
        </div>
        
        <div className="py-2">
          <h2 className="mb-2 px-2 text-lg font-semibold tracking-tight">
            Booking Management
          </h2>
          <div className="space-y-1">
            <SidebarItem 
              href="/admin/bookings" 
              icon={<Calendar className="h-4 w-4" />} 
              title="Bookings" 
              isActive={currentPath === "/admin/bookings"}
            />
            <SidebarItem 
              href="/admin/customers" 
              icon={<Users className="h-4 w-4" />} 
              title="Customers" 
              isActive={currentPath === "/admin/customers"}
            />
          </div>
        </div>
        
        <div className="py-2">
          <h2 className="mb-2 px-2 text-lg font-semibold tracking-tight">
            Settings
          </h2>
          <div className="space-y-1">
            <SidebarItem 
              href="/admin/settings" 
              icon={<Settings className="h-4 w-4" />} 
              title="Settings" 
              isActive={currentPath === "/admin/settings"}
            />
            <Link
              to="/"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 hover:bg-gray-100"
            >
              <LogOut className="h-4 w-4" />
              <span>Back to Site</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
