import React from 'react';
import { PaymentManager } from '@/components/PaymentManager';

export default function PaymentsPage() {
  const handleUpdatePayment = async (paymentId: string | number, status: string, amount?: number, paymentMethod?: string, notes?: string): Promise<void> => {
    console.log('Update payment:', { paymentId, status, amount, paymentMethod, notes });
    // Implement actual update logic here
  };

  const handleSendReminder = async (paymentId: string | number, reminderType: string, customMessage?: string): Promise<void> => {
    console.log('Send reminder:', { paymentId, reminderType, customMessage });
    // Implement actual reminder logic here
  };

  return (
    <PaymentManager 
      onUpdatePayment={handleUpdatePayment}
      onSendReminder={handleSendReminder}
    />
  );
}
