
import React from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { ReportGenerator } from '@/components/admin/ReportGenerator';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = React.useState<string>("reports");

  return (
    <div className="flex h-screen bg-gray-100">
      <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 overflow-y-auto p-8">
        <ReportGenerator />
      </main>
    </div>
  );
}
