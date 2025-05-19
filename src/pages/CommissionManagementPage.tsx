
import React from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { CommissionManagement } from '@/components/admin/commission/CommissionManagement';
import { Separator } from '@/components/ui/separator';

export default function CommissionManagementPage() {
  const [activeTab, setActiveTab] = React.useState('commission');

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <div className="flex flex-col flex-1 overflow-auto">
        <div className="flex-1 space-y-4 p-8 pt-6">
          <div className="space-y-0.5">
            <h2 className="text-3xl font-bold tracking-tight">Commission Management</h2>
            <p className="text-muted-foreground">
              Manage commission settings, payments, and reports for fleet vehicles.
            </p>
          </div>
          
          <Separator />
          
          <CommissionManagement />
        </div>
      </div>
    </div>
  );
}
