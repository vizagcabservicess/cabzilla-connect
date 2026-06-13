console.log('EnhancedAdminSidebar component loaded');
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { usePrivileges } from '@/hooks/usePrivileges';
import { useAuth } from '@/providers/AuthProvider';
import { 
  LayoutDashboard, 
  CalendarDays, 
  Car, 
  Map, 
  Users,
  UsersRound,
  BarChart3, 
  Settings,
  LogOut,
  User,
  X,
  Fuel,
  Wrench,
  Book,
  CircleDollarSign,
  Banknote,
  CreditCard,
  CalendarPlus,
  CalendarClock,
  BadgePercent,
  Info,
  Shield,
  Building2,
  Bus,
  Eye,
  Gauge,
  BellRing
} from 'lucide-react';

interface EnhancedAdminSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onClose?: () => void;
}

export function EnhancedAdminSidebar({ activeTab, setActiveTab, onClose }: EnhancedAdminSidebarProps) {
  const { user: authUser, logout } = useAuth();
  const navigate = useNavigate();
  console.log('Sidebar authUser:', authUser);
  const { 
    user, 
    isSuperAdmin, 
    isAdmin, 
    canViewBookings, 
    canCreateBookings,
    canManageFleet,
    canViewFinancials,
    canManageUsers,
    checkPrivilege 
  } = usePrivileges();
  
  const menuItems = [
    // Always visible
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      icon: <LayoutDashboard size={20} />, 
      path: '/admin?tab=dashboard',
      show: true
    },
    { 
      id: 'customer-dashboard', 
      label: 'Customer Dashboard', 
      icon: <Eye size={20} />, 
      path: '/dashboard',
      show: isAdmin() || isSuperAdmin()
    },
    
    // Booking Management
    { 
      id: 'bookings', 
      label: 'Bookings', 
      icon: <CalendarDays size={20} />, 
      path: '/admin?tab=bookings',
      show: canViewBookings()
    },
    { 
      id: 'upcoming-trips', 
      label: 'Upcoming Trips', 
      icon: <CalendarClock size={20} />, 
      path: '/admin/bookings?view=upcoming',
      show: canViewBookings()
    },
    { 
      id: 'create-booking', 
      label: 'Create Booking', 
      icon: <CalendarPlus size={20} />, 
      path: '/admin/create-booking',
      show: canCreateBookings()
    },
    { 
      id: 'group-tours', 
      label: 'Group Tours', 
      icon: <Bus size={20} />, 
      path: '/admin/group-tours',
      show: canViewBookings() || canCreateBookings() || isAdmin() || isSuperAdmin()
    },
    { 
      id: 'shared-carpooling', 
      label: 'Car Pooling', 
      icon: <UsersRound size={20} />, 
      path: '/admin/shared-carpooling',
      show: canViewBookings() || canCreateBookings() || isAdmin() || isSuperAdmin()
    },
    { 
      id: 'search-alerts', 
      label: 'Search Alerts', 
      icon: <BellRing size={20} />, 
      path: '/admin/search-alerts',
      show: canViewBookings() || isAdmin() || isSuperAdmin()
    },
    
    // Fleet Management
    { 
      id: 'vehicles', 
      label: 'Vehicles', 
      icon: <Car size={20} />, 
      path: '/admin?tab=vehicles',
      show: checkPrivilege('vehicles_view')
    },
    { 
      id: 'drivers', 
      label: 'Drivers', 
      icon: <Users size={20} />, 
      path: '/admin/drivers',
      show: checkPrivilege('drivers_view')
    },
    { 
      id: 'fleet', 
      label: 'Fleet Management', 
      icon: <Car size={20} />, 
      path: '/admin/fleet',
      show: canManageFleet()
    },
    
    // Financial Management
    { 
      id: 'fares', 
      label: 'Fares', 
      icon: <Map size={20} />, 
      path: '/admin?tab=fares',
      show: checkPrivilege('fares_view')
    },
    { 
      id: 'payments', 
      label: 'Payments', 
      icon: <CreditCard size={20} />, 
      path: '/admin/payments',
      show: checkPrivilege('payments_view')
    },
    { 
      id: 'payment-tracking', 
      label: 'Payment Tracking', 
      icon: <BarChart3 size={20} />, 
      path: '/admin?tab=payment-tracking',
      show: checkPrivilege('payments_view')
    },
    { 
      id: 'commission', 
      label: 'Commission', 
      icon: <BadgePercent size={20} />, 
      path: '/admin/commission',
      show: checkPrivilege('commission_view')
    },
    { 
      id: 'expenses', 
      label: 'Expenses', 
      icon: <CircleDollarSign size={20} />, 
      path: '/admin/expenses',
      show: checkPrivilege('expenses_view')
    },
    { 
      id: 'payroll', 
      label: 'Payroll', 
      icon: <Banknote size={20} />, 
      path: '/admin/payroll',
      show: checkPrivilege('payroll_view')
    },
    { 
      id: 'ledger', 
      label: 'Ledger', 
      icon: <Book size={20} />, 
      path: '/admin/ledger',
      show: checkPrivilege('ledger_view')
    },
    
    // System Management
    { 
      id: 'fuel', 
      label: 'Fuel Management', 
      icon: <Fuel size={20} />, 
      path: '/admin/fuel',
      show: checkPrivilege('fuel_view')
    },
    { 
      id: 'maintenance', 
      label: 'Vehicle Maintenance', 
      icon: <Wrench size={20} />, 
      path: '/admin/maintenance',
      show: checkPrivilege('maintenance_view')
    },
    { 
      id: 'reports', 
      label: 'Reports', 
      icon: <BarChart3 size={20} />, 
      path: '/admin/reports',
      show: checkPrivilege('reports_view')
    },
    
    // Super Admin Only
    { 
      id: 'users', 
      label: 'User Management', 
      icon: <Users size={20} />, 
      path: '/admin/users',
      show: canManageUsers()
    },
    { 
      id: 'privileges', 
      label: 'User Privileges', 
      icon: <Shield size={20} />, 
      path: '/admin/privileges',
      show: isSuperAdmin()
    },
    { 
      id: 'operator-profiles', 
      label: 'Operator Profiles', 
      icon: <Building2 size={20} />, 
      path: '/admin/operator-profiles',
      show: isAdmin() || isSuperAdmin()
    },
    {
      id: 'driver-ops-dashboard',
      label: 'Driver Ops Dashboard',
      icon: <Gauge size={20} />,
      path: '/driver',
      show: isSuperAdmin()
    },
    
    // Always visible
    { 
      id: 'about', 
      label: 'About', 
      icon: <Info size={20} />, 
      path: '/about',
      show: true
    },
  ];

  const handleMenuClick = (item: { id: string; path: string }) => {
    setActiveTab(item.id);
    navigate(item.path);
    if (onClose) onClose();
  };

  const visibleMenuItems = menuItems.filter(item => item.show);

  return (
    <aside className="h-full min-h-screen w-full bg-gray-900 text-white flex flex-col">
      {/* Sidebar Header/Logo */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-gray-800">
        <Link to="/admin" className="hidden md:flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-lg">
            VT
          </div>
          <span className="font-bold text-lg">Vizag Taxi Hub</span>
        </Link>
        {onClose && (
          <div className="flex w-full items-center justify-between md:hidden">
            <span className="font-bold text-lg">Menu</span>
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-400 hover:text-white hover:bg-gray-800"
              onClick={onClose}
              aria-label="Close menu"
            >
              <X size={20} />
            </Button>
          </div>
        )}
      </div>
      
      {/* User Role Badge */}
      <div className="px-6 py-3 border-b border-gray-800">
        <div className="flex items-center space-x-2">
          {authUser && (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-700 capitalize">
              {authUser.role.replace('_', ' ')}
            </span>
          )}
          {authUser && (
            <span className="text-sm text-gray-400 truncate">{authUser.name}</span>
          )}
        </div>
      </div>
      
      {/* Main Menu */}
      <div className="flex-1 py-6 px-4 overflow-y-auto">
        <nav className="space-y-1">
          {visibleMenuItems.map((item) => (
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
            <p className="font-medium">{authUser?.name}</p>
            <p className="text-xs text-gray-400">{authUser?.email}</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          className="w-full justify-start text-gray-400 border-gray-700 hover:bg-gray-800 hover:text-white"
          onClick={async () => {
            await logout();
            navigate('/login');
          }}
        >
          <LogOut size={18} className="mr-2" />
          Logout
        </Button>
      </div>
    </aside>
  );
}