
import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  Car, 
  Calendar, 
  User, 
  Users, 
  BarChart3, 
  Settings,
  BellRing,
  DollarSign
} from 'lucide-react';

export default function AdminLayout() {
  const location = useLocation();
  
  const navItems = [
    { path: '/admin/bookings', icon: <Calendar className="w-5 h-5" />, label: 'Bookings' },
    { path: '/admin/users', icon: <Users className="w-5 h-5" />, label: 'Users' },
    { path: '/admin/drivers', icon: <User className="w-5 h-5" />, label: 'Drivers' },
    { path: '/admin/customers', icon: <Users className="w-5 h-5" />, label: 'Customers' },
    { path: '/admin/reports', icon: <BarChart3 className="w-5 h-5" />, label: 'Reports' },
    { path: '/admin/financials', icon: <DollarSign className="w-5 h-5" />, label: 'Financials' },
    { path: '/admin/vehicles', icon: <Car className="w-5 h-5" />, label: 'Vehicles' },
    { path: '/admin/notifications', icon: <BellRing className="w-5 h-5" />, label: 'Notifications' },
    { path: '/admin/settings', icon: <Settings className="w-5 h-5" />, label: 'Settings' },
  ];
  
  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="bg-white shadow">
        <div className="container mx-auto">
          <div className="flex items-center space-x-8 py-4 overflow-x-auto no-scrollbar">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                  location.pathname === item.path
                    ? 'text-primary bg-primary/10'
                    : 'text-gray-600 hover:text-primary hover:bg-gray-50'
                }`}
              >
                {item.icon}
                <span className="ml-2">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
      
      <main className="container mx-auto py-6">
        <Outlet />
      </main>
    </div>
  );
}
