
import React from 'react';
import { 
  CreditCard, 
  DollarSign,
  Clock, 
  AlertCircle 
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PaymentSummary as PaymentSummaryType } from '@/types/payment';

interface PaymentSummaryProps {
  summary: PaymentSummaryType;
}

export function PaymentSummary({ summary }: PaymentSummaryProps) {
  // Format currency amount
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Helper to get the status counts
  const getStatusCount = (status: string) => {
    return summary.countByStatus[status as keyof typeof summary.countByStatus] || 0;
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(summary.totalAmount)}</div>
          <p className="text-xs text-muted-foreground">
            {formatCurrency(summary.totalPaid)} collected
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(summary.totalPending)}</div>
          <p className="text-xs text-muted-foreground">
            {getStatusCount('pending') + getStatusCount('partial')} pending bookings
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Overdue Payments</CardTitle>
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(summary.totalOverdue)}</div>
          <p className="text-xs text-muted-foreground">
            Requires immediate attention
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Payment Status</CardTitle>
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{getStatusCount('paid')}</div>
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <span className="flex items-center">
              <div className="mr-1 h-2 w-2 rounded-full bg-green-500"></div> Paid
            </span>
            <span className="flex items-center">
              <div className="mr-1 h-2 w-2 rounded-full bg-yellow-500"></div> Partial ({getStatusCount('partial')})
            </span>
            <span className="flex items-center">
              <div className="mr-1 h-2 w-2 rounded-full bg-red-500"></div> Pending ({getStatusCount('pending')})
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
