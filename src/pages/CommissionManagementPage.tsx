import React from 'react';
import { Separator } from '@/components/ui/separator';
import { CommissionManagement } from '@/components/admin/commission/CommissionManagement';
import AdminLayout from "@/components/admin/AdminLayout";

export default function CommissionManagementPage() {
  const [activeTab, setActiveTab] = React.useState('commission');

  return (
    <AdminLayout activeTab="commission">
      <div className="flex flex-col flex-1 overflow-auto">
        <div className="flex-1 space-y-4 p-8 pt-6">
          <div className="space-y-0.5">
            <h2 className="text-3xl font-medium tracking-tight">Commission Management</h2>
            <p className="text-muted-foreground">
              Manage commission settings, payments, and reports for fleet vehicles.
            </p>
          </div>
          
          <Separator />
          
          <CommissionManagement />
        </div>
      </div>
    </AdminLayout>
  );
}
