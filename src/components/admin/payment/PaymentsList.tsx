
import React, { useState } from 'react';
import { Payment as PaymentType, PaymentStatus } from '@/types/payment';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/dateUtils';
import { PaymentUpdateDialog } from './PaymentUpdateDialog';
import { PaymentReminderDialog } from './PaymentReminderDialog';
import { Check, Clock, Copy, Ban, RefreshCw, Mail, Pencil, Filter } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface PaymentsListProps {
  payments: PaymentType[];
  onUpdatePaymentStatus: (paymentId: number | string, status: string, amount?: number, paymentMethod?: string, notes?: string) => Promise<void>;
  onSendReminder: (paymentId: number | string, reminderType: string, customMessage?: string) => Promise<void>;
  isLoading: boolean;
}

export function PaymentsList({ payments, onUpdatePaymentStatus, onSendReminder, isLoading }: PaymentsListProps) {
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentType | null>(null);
  const [search, setSearch] = useState('');
  const { toast } = useToast();

  const handleOpenUpdateDialog = (payment: PaymentType) => {
    setSelectedPayment(payment);
    setUpdateDialogOpen(true);
  };

  const handleOpenReminderDialog = (payment: PaymentType) => {
    setSelectedPayment(payment);
    setReminderDialogOpen(true);
  };

  const copyRazorpayId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast({
      title: "ID copied!",
      description: `Razorpay ID copied to clipboard`,
      duration: 3000,
    });
  };

  const getStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case 'paid':
        return <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">Paid</span>;
      case 'pending':
        return <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-medium">Pending</span>;
      case 'partial':
        return <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">Partial</span>;
      case 'cancelled':
        return <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-medium">Cancelled</span>;
      default:
        return <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-medium">Unknown</span>;
    }
  };

  const getMethodBadge = (method?: string) => {
    if (!method) return null;
    const colorMap: Record<string, string> = {
      cash: 'bg-green-100 text-green-800',
      card: 'bg-blue-100 text-blue-800',
      upi: 'bg-purple-100 text-purple-800',
      bank_transfer: 'bg-yellow-100 text-yellow-800',
      wallet: 'bg-pink-100 text-pink-800',
      cheque: 'bg-gray-100 text-gray-800',
      razorpay: 'bg-orange-100 text-orange-800',
      other: 'bg-gray-100 text-gray-800',
    };
    return <span className={`${colorMap[method] || 'bg-gray-100 text-gray-800'} px-2 py-1 rounded text-xs font-medium capitalize`}>{method}</span>;
  };

  // Filter payments by search
  const filteredPayments = payments.filter(
    (p) =>
      p.bookingNumber?.toLowerCase().includes(search.toLowerCase()) ||
      p.customerName?.toLowerCase().includes(search.toLowerCase()) ||
      p.customerPhone?.toLowerCase().includes(search.toLowerCase())
  );

  // Sort payments by creation date (descending), fallback to due date if missing
  const sortedPayments = [...filteredPayments].sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : new Date(a.dueDate || '').getTime();
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : new Date(b.dueDate || '').getTime();
    return dateB - dateA;
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Payments</h2>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-2">
        <h2 className="text-2xl font-bold">Payments</h2>
        <div className="flex gap-2 w-full md:w-auto">
          <input
            type="text"
            placeholder="Search payments..."
            className="border rounded px-3 py-2 text-sm w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-blue-200"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <Button variant="outline" className="flex items-center gap-1">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto bg-white rounded-lg border border-gray-200 p-2 mt-4">
        <table className="min-w-full divide-y divide-gray-100 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left font-semibold text-gray-600">Due Date</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-600">Booking ID</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-600">Customer</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-600">Phone</th>
              <th className="px-4 py-2 text-right font-semibold text-gray-600">Total</th>
              <th className="px-4 py-2 text-right font-semibold text-gray-600">Paid</th>
              <th className="px-4 py-2 text-right font-semibold text-gray-600">Remaining</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-600">Status</th>
              <th className="px-4 py-2 text-left font-semibold text-gray-600">Method</th>
              <th className="px-4 py-2 text-center font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedPayments.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-8 text-gray-400">No payments found matching your criteria.</td>
              </tr>
            ) : (
              sortedPayments.map((payment, idx) => (
                <tr key={payment.id} className={
                  `transition ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50`
                }>
                  <td className="px-4 py-2 whitespace-nowrap">{formatDate(new Date(payment.dueDate || payment.createdAt))}</td>
                  <td className="px-4 py-2 font-mono text-xs whitespace-nowrap">{payment.bookingNumber}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{payment.customerName}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{payment.customerPhone}</td>
                  <td className="px-4 py-2 text-right font-mono whitespace-nowrap">₹{payment.amount.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right font-mono whitespace-nowrap">₹{(payment.paidAmount || 0).toLocaleString()}</td>
                  <td className="px-4 py-2 text-right font-mono text-amber-600 whitespace-nowrap">₹{(payment.remainingAmount || payment.amount).toLocaleString()}</td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-normal ${
                      (payment.paymentStatus || payment.status) === 'paid' ? 'bg-green-50 text-green-700 border border-green-100' :
                      (payment.paymentStatus || payment.status) === 'partial' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                      (payment.paymentStatus || payment.status) === 'pending' ? 'bg-yellow-50 text-yellow-700 border border-yellow-100' :
                      (payment.paymentStatus || payment.status) === 'cancelled' ? 'bg-red-50 text-red-700 border border-red-100' :
                      'bg-gray-50 text-gray-700 border border-gray-100'
                    }`}>
                      {((payment.paymentStatus || payment.status) as string).charAt(0).toUpperCase() + ((payment.paymentStatus || payment.status) as string).slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {(payment.paymentMethod || payment.method) && (
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-normal ${
                        (payment.paymentMethod || payment.method) === 'cash' ? 'bg-green-50 text-green-700 border border-green-100' :
                        (payment.paymentMethod || payment.method) === 'card' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                        (payment.paymentMethod || payment.method) === 'upi' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                        (payment.paymentMethod || payment.method) === 'bank_transfer' ? 'bg-yellow-50 text-yellow-700 border border-yellow-100' :
                        (payment.paymentMethod || payment.method) === 'wallet' ? 'bg-pink-50 text-pink-700 border border-pink-100' :
                        (payment.paymentMethod || payment.method) === 'cheque' ? 'bg-gray-50 text-gray-700 border border-gray-100' :
                        (payment.paymentMethod || payment.method) === 'razorpay' ? 'bg-orange-50 text-orange-700 border border-orange-100' :
                        'bg-gray-50 text-gray-700 border border-gray-100'
                      }`}>
                        {((payment.paymentMethod || payment.method) as string).charAt(0).toUpperCase() + ((payment.paymentMethod || payment.method) as string).slice(1)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        className="p-1 rounded hover:bg-blue-100 text-blue-600"
                        title="Send Reminder"
                        onClick={() => handleOpenReminderDialog(payment)}
                        style={{ minWidth: 32 }}
                      >
                        <Mail className="h-4 w-4" />
                      </button>
                      <button
                        className="p-1 rounded hover:bg-green-100 text-green-600"
                        title="Edit Payment Status"
                        onClick={() => handleOpenUpdateDialog(payment)}
                        style={{ minWidth: 32 }}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {(payment.paymentMethod || payment.method) === 'razorpay' && payment.razorpayPaymentId && (
                        <button
                          onClick={() => copyRazorpayId(payment.razorpayPaymentId!)}
                          className="p-1 rounded hover:bg-orange-100 text-orange-600"
                          title="Copy Razorpay ID"
                          style={{ minWidth: 32 }}
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {selectedPayment && (
        <>
          <PaymentUpdateDialog
            open={updateDialogOpen}
            onOpenChange={setUpdateDialogOpen}
            payment={selectedPayment}
            onUpdate={onUpdatePaymentStatus}
          />
          <PaymentReminderDialog
            open={reminderDialogOpen}
            onOpenChange={setReminderDialogOpen}
            payment={selectedPayment}
            onSend={onSendReminder}
          />
        </>
      )}
    </div>
  );
}
