
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { DateRange } from 'react-day-picker';
import { 
  Payment, 
  PaymentFilterParams, 
  PaymentStatus,
  PaymentMethod
} from '@/types/payment';
import { paymentsAPI } from '@/services/api/paymentsAPI';
import { PaymentFilters } from './PaymentFilters';
import { PaymentSummary } from './PaymentSummary';
import { PaymentsList } from './PaymentsList';

export function PaymentManagement() {
  // Filter state
  const [filters, setFilters] = useState<PaymentFilterParams>({});
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Query for payments data
  const {
    data,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['payments', filters, searchTerm],
    queryFn: () => paymentsAPI.getPayments({ ...filters, search: searchTerm }),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Handle search
  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };
  
  // Handle filter change
  const handleFilter = (newFilters: {
    dateRange?: DateRange;
    status?: PaymentStatus;
    method?: PaymentMethod;
  }) => {
    setFilters(newFilters);
  };
  
  // Handle payment status update
  const handleUpdatePaymentStatus = async (
    paymentId: number | string,
    status: string,
    amount?: number,
    paymentMethod?: string,
    notes?: string
  ) => {
    try {
      await paymentsAPI.updatePaymentStatus(paymentId, status, amount, paymentMethod, notes);
      toast.success('Payment status updated successfully');
      refetch();
    } catch (error) {
      console.error('Failed to update payment status:', error);
      toast.error('Failed to update payment status');
      throw error;
    }
  };
  
  // Handle send reminder
  const handleSendReminder = async (
    paymentId: number | string,
    reminderType: string,
    customMessage?: string
  ) => {
    try {
      await paymentsAPI.sendPaymentReminder(paymentId, reminderType, customMessage);
      toast.success('Payment reminder sent successfully');
    } catch (error) {
      console.error('Failed to send payment reminder:', error);
      toast.error('Failed to send payment reminder');
      throw error;
    }
  };
  
  // Error handling
  useEffect(() => {
    if (isError) {
      toast.error(`Error loading payments: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [isError, error]);
  
  // Default empty summary for when data is loading or has an error
  const emptySummary = {
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
    countByMethod: {}
  };
  
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight mb-4">Payment Management</h1>
      
      {/* Filters */}
      <PaymentFilters 
        onSearch={handleSearch}
        onFilter={handleFilter}
      />
      
      {/* Summary Cards */}
      {data?.summary && (
        <PaymentSummary summary={data.summary} />
      )}
      
      {/* Payments List */}
      <PaymentsList
        payments={data?.payments || []}
        onUpdatePaymentStatus={handleUpdatePaymentStatus}
        onSendReminder={handleSendReminder}
        isLoading={isLoading}
      />
    </div>
  );
}
