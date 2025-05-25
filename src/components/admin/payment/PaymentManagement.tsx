
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PaymentsList } from './PaymentsList';
import { PaymentSummary } from './PaymentSummary';
import { PaymentFilters } from './PaymentFilters';
import { paymentsAPI } from '@/services/api/paymentsAPI';
import { PaymentSummary as PaymentSummaryType, PaymentMethod, PaymentStatus } from '@/types/payment';
import { Payment } from '@/types/api';
import { toast } from "sonner";

export function PaymentManagement() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<PaymentSummaryType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<{
    dateRange?: { from: Date; to: Date };
    status?: PaymentStatus;
    method?: PaymentMethod;
  }>({});

  useEffect(() => {
    loadPayments();
  }, [searchTerm, filters]);

  const loadPayments = async () => {
    setIsLoading(true);
    try {
      const filterParams = {
        search: searchTerm,
        status: filters.status,
        method: filters.method,
        startDate: filters.dateRange?.from?.toISOString(),
        endDate: filters.dateRange?.to?.toISOString(),
      };

      const data = await paymentsAPI.getPayments(filterParams);
      setPayments(data.payments);
      setSummary(data.summary);
    } catch (error) {
      console.error('Failed to load payments:', error);
      toast.error('Failed to load payments');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePaymentStatus = async (
    paymentId: string | number,
    status: string,
    amount?: number,
    paymentMethod?: string,
    notes?: string
  ) => {
    try {
      await paymentsAPI.updatePaymentStatus(paymentId, status, amount, paymentMethod, notes);
      toast.success('Payment status updated successfully');
      loadPayments(); // Refresh the list
    } catch (error) {
      console.error('Failed to update payment status:', error);
      toast.error('Failed to update payment status');
    }
  };

  const handleSendReminder = async (
    paymentId: string | number,
    reminderType: string,
    customMessage?: string
  ) => {
    try {
      await paymentsAPI.sendPaymentReminder(paymentId, reminderType, customMessage);
      toast.success('Payment reminder sent successfully');
    } catch (error) {
      console.error('Failed to send payment reminder:', error);
      toast.error('Failed to send payment reminder');
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  const handleFilter = (newFilters: typeof filters) => {
    setFilters(newFilters);
  };

  // Create a mock summary if none exists
  const displaySummary: PaymentSummaryType = summary || {
    totalAmount: 0,
    totalPaid: 0,
    totalPending: 0,
    totalOverdue: 0,
    countByStatus: {
      pending: 0,
      partial: 0,
      paid: 0,
      cancelled: 0
    },
    countByMethod: {
      cash: 0,
      card: 0,
      upi: 0,
      bank_transfer: 0,
      wallet: 0,
      cheque: 0,
      razorpay: 0,
      other: 0
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Payment Management</h1>
        <p className="text-gray-600">Track and manage all payment transactions</p>
      </div>

      <PaymentSummary summary={displaySummary} />

      <PaymentFilters 
        onSearch={handleSearch}
        onFilter={handleFilter}
      />

      <PaymentsList
        payments={payments}
        onUpdatePaymentStatus={handleUpdatePaymentStatus}
        onSendReminder={handleSendReminder}
        isLoading={isLoading}
      />
    </div>
  );
}
