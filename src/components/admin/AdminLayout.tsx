
import React from 'react';
import { AdminSidebar } from './AdminSidebar';
import { useLocation } from 'react-router-dom';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const location = useLocation();
  
  // Parse the current path to determine active tab
  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes('/admin/create-booking')) return 'create-booking';
    if (path.includes('/admin/bookings')) return 'bookings';
    if (path.includes('/admin/fleet')) return 'fleet';
    if (path.includes('/admin/fuel')) return 'fuel';
    if (path.includes('/admin/maintenance')) return 'maintenance';
    if (path.includes('/admin/ledger')) return 'ledger';
    if (path.includes('/admin/expenses')) return 'expenses';
    if (path.includes('/admin/payroll')) return 'payroll';
    if (path.includes('/admin/payments')) return 'payments';
    if (path.includes('/admin/reports')) return 'reports';
    if (path.includes('/admin/database')) return 'database';
    if (path.includes('/admin/users')) return 'users';
    if (path.includes('/admin/drivers')) return 'drivers';
    return 'dashboard';
  };
  
  const [activeTab, setActiveTab] = React.useState(getActiveTab());
  
  React.useEffect(() => {
    setActiveTab(getActiveTab());
  }, [location.pathname]);
  
  return (
    <div className="flex min-h-screen">
      <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 overflow-y-auto bg-gray-50">
        {children}
      </main>
    </div>
  );
}
