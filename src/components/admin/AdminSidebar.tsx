
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
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
  Database
} from 'lucide-react';

interface AdminSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function AdminSidebar({ activeTab, setActiveTab }: AdminSidebarProps) {
  const navigate = useNavigate();
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/admin' },
    { id: 'bookings', label: 'Bookings', icon: <CalendarDays size={20} />, path: '/admin?tab=bookings' },
    { id: 'vehicles', label: 'Vehicles', icon: <Car size={20} />, path: '/admin?tab=vehicles' },
    { id: 'fares', label: 'Fares', icon: <Map size={20} />, path: '/admin?tab=fares' },
    { id: 'users', label: 'Users', icon: <Users size={20} />, path: '/admin?tab=users' },
    { id: 'drivers', label: 'Drivers', icon: <Users size={20} />, path: '/admin?tab=drivers' },
    { id: 'reports', label: 'Reports', icon: <BarChart3size={20} />, path: '/admin/reports' },
    { id: 'database', label: 'Database', icon: <Database size={20} />, path: '/admin/database' },
  ];

  // Handle menu item click
  const handleMenuItemClick = (id: string, path: string) => {
    setActiveTab(id);
    navigate(path);
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('userRole');
    localStorage.removeItem('authToken');
    navigate('/login');
  };

  return (
    <aside className="w-64 bg-gray-900 text-white hidden md:flex md:flex-col">
      {/* Sidebar Header/Logo */}
      <div className="h-16 flex items-center px-6 border-b border-gray-800">
        <Link to="/admin" className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-lg">
            VT
          </div>
          <span className="font-bold text-lg">Vizag Taxi Hub</span>
        </Link>
      </div>
      
      {/* Main Menu */}
      <div className="flex-1 overflow-y-auto py-6 px-4">
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
              onClick={() => handleMenuItemClick(item.id, item.path)}
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
          onClick={handleLogout}
        >
          <LogOut size={18} className="mr-2" />
          Logout
        </Button>
      </div>
    </aside>
  );
}
