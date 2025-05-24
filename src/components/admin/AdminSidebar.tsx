import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  LayoutDashboard, 
  CalendarDays, 
  Car, 
  Map, 
  Users, 
  BarChart3, 
  Settings,
  LogOut,
  User,
  Fuel,
  Wrench,
  Book,
  CircleDollarSign,
  Banknote,
  CreditCard,
  CalendarPlus,
  BadgePercent
} from 'lucide-react';

interface AdminSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onClose?: () => void;
}

export function AdminSidebar({ activeTab, setActiveTab, onClose }: AdminSidebarProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/admin' },
    { id: 'bookings', label: 'Bookings', icon: <CalendarDays size={20} />, path: '/admin/bookings' },
    { id: 'create-booking', label: 'Create Booking', icon: <CalendarPlus size={20} />, path: '/admin/create-booking' },
    { id: 'vehicles', label: 'Vehicles', icon: <Car size={20} />, path: '/admin/vehicles' },
    { id: 'fares', label: 'Fares', icon: <Map size={20} />, path: '/admin/fares' },
    { id: 'fleet', label: 'Fleet Management', icon: <Car size={20} />, path: '/admin/fleet' },
    { id: 'commission', label: 'Commission', icon: <BadgePercent size={20} />, path: '/admin/commission' },
    { id: 'fuel', label: 'Fuel Management', icon: <Fuel size={20} />, path: '/admin/fuel' },
    { id: 'maintenance', label: 'Vehicle Maintenance', icon: <Wrench size={20} />, path: '/admin/maintenance' },
    { id: 'ledger', label: 'Ledger', icon: <Book size={20} />, path: '/admin/ledger' },
    { id: 'expenses', label: 'Expenses', icon: <CircleDollarSign size={20} />, path: '/admin/expenses' },
    { id: 'payroll', label: 'Payroll', icon: <Banknote size={20} />, path: '/admin/payroll' },
    { id: 'payments', label: 'Payments', icon: <CreditCard size={20} />, path: '/admin/payments' },
    { id: 'users', label: 'Users', icon: <Users size={20} />, path: '/admin/users' },
    { id: 'drivers', label: 'Drivers', icon: <Users size={20} />, path: '/admin/drivers' },
    { id: 'reports', label: 'Reports', icon: <BarChart3 size={20} />, path: '/admin/reports' },
    { id: 'about', label: 'About', icon: <Info size={20} />, path: '/about' },
  ];

  const handleMenuClick = (item: { id: string; path: string }) => {
    setActiveTab(item.id);
    navigate(item.path);
    if (isMobile && onClose) onClose();
  };

  const sidebarWidth = isMobile ? 'w-full h-screen overflow-auto' : 'w-64';

  return (
    <aside className={`${sidebarWidth} bg-gray-900 text-white flex flex-col z-20`}>
      {/* Sidebar Header/Logo (hidden on mobile as we show it in the top bar) */}
      <div className="h-16 hidden md:flex items-center px-6 border-b border-gray-800">
        <Link to="/admin" className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-lg">
            VT
          </div>
          <span className="font-bold text-lg">Vizag Taxi Hub</span>
        </Link>
      </div>
      
      {/* Main Menu */}
      <div className="flex-1 py-6 px-4 overflow-y-auto">
        <nav className="space-y-1">
          {menuItems.map((item) => (
            <Button
              key={item.id}
              variant="ghost"
              className={`w-full justify-start text-left px-3 py-2 ${
                activeTab === item.id 
                  ? 'bg-gray-800 text-white' 
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
              onClick={() => handleMenuClick(item)}
            >
              <span className="mr-3">{item.icon}</span>
              {item.label}
            </Button>
          ))}
        </nav>
      </div>
      
      {/* User Profile Section */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
            <User size={18} />
          </div>
          <div>
            <p className="font-medium">Admin User</p>
            <p className="text-xs text-gray-400">admin@vizagtaxihub.com</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          className="w-full justify-start text-gray-400 border-gray-700 hover:bg-gray-800 hover:text-white"
        >
          <LogOut size={18} className="mr-2" />
          Logout
        </Button>
      </div>
    </aside>
  );
}
