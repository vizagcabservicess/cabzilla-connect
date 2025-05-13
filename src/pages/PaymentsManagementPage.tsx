import React, { useState } from 'react';
import { PaymentManagement } from '@/components/admin/payment/PaymentManagement';
import { AdminSidebar } from '@/components/admin/AdminSidebar';

export default function PaymentsManagementPage() {
  const [activeTab, setActiveTab] = useState('payments');
  return (
    <div className="flex h-screen bg-gray-100">
      <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 overflow-y-auto p-8">
        <PaymentManagement />
      </main>
    </div>
  );
}
