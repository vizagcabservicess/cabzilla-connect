
import React from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { PaymentManagement } from '@/components/admin/payment/PaymentManagement';

const PaymentsPage = () => {
  const handleUpdatePayment = async (
    paymentId: string | number, 
    status: string, 
    amount?: number, 
    paymentMethod?: string, 
    notes?: string
  ): Promise<void> => {
    console.log('Updating payment:', { paymentId, status, amount, paymentMethod, notes });
    // Mock update logic
  };

  const handleSendReminder = async (
    paymentId: string | number, 
    reminderType: string, 
    customMessage?: string
  ): Promise<void> => {
    console.log('Sending reminder:', { paymentId, reminderType, customMessage });
    // Mock reminder logic
  };

  return (
    <AdminLayout activeTab="payments">
      <PaymentManagement />
    </AdminLayout>
  );
};

export default PaymentsPage;
