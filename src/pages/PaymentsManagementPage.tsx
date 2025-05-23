import React, { useState } from 'react';
import { PaymentManagement } from '@/components/admin/payment/PaymentManagement';
import AdminLayout from "@/components/admin/AdminLayout";

export default function PaymentsManagementPage() {
  return (
    <AdminLayout activeTab="payments">
      <div className="flex-1 overflow-y-auto p-8">
        <PaymentManagement />
      </div>
    </AdminLayout>
  );
}
