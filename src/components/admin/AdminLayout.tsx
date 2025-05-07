
import React from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';

interface AdminLayoutProps {
  children: React.ReactNode;
  activeTab: string;
}

export function AdminLayout({ children, activeTab }: AdminLayoutProps) {
  const [currentTab, setCurrentTab] = React.useState(activeTab);

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar activeTab={currentTab} setActiveTab={setCurrentTab} />
      <div className="flex-1 overflow-x-hidden">
        {children}
      </div>
    </div>
  );
}

export default AdminLayout;
