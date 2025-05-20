
import React, { useState } from 'react';
import { Payment, PaymentStatus, PaymentMethod } from '@/types/payment';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/dateUtils';
import { PaymentUpdateDialog } from './PaymentUpdateDialog';
import { PaymentReminderDialog } from './PaymentReminderDialog';
import { Check, Clock, Copy, Ban, CreditCard, CalendarDays, BadgeIndianRupee, Mail, RefreshCw } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface PaymentsListProps {
  payments: Payment[];
  onUpdatePaymentStatus: (paymentId: number | string, status: string, amount?: number, paymentMethod?: string, notes?: string) => Promise<void>;
  onSendReminder: (paymentId: number | string, reminderType: string, customMessage?: string) => Promise<void>;
  isLoading: boolean;
}

export function PaymentsList({ payments, onUpdatePaymentStatus, onSendReminder, isLoading }: PaymentsListProps) {
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const { toast } = useToast();
  
  const handleOpenUpdateDialog = (payment: Payment) => {
    setSelectedPayment(payment);
    setUpdateDialogOpen(true);
  };
  
  const handleOpenReminderDialog = (payment: Payment) => {
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
  
  const getStatusIcon = (status: PaymentStatus) => {
    switch (status) {
      case 'paid':
        return <Check className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'partial':
        return <RefreshCw className="h-4 w-4" />;
      case 'cancelled':
        return <Ban className="h-4 w-4" />;
      default:
        return null;
    }
  };
  
  const getStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'partial':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Payments</h2>
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4">
            <div className="flex justify-between items-center">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-6 w-24" />
            </div>
            <Separator className="my-4" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </Card>
        ))}
      </div>
    );
  }
  
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Payments ({payments.length})</h2>
      
      {payments.length === 0 ? (
        <Card className="p-8 text-center text-gray-500">
          No payments found matching your criteria.
        </Card>
      ) : (
        <div className="space-y-4">
          {payments.map((payment) => (
            <Card key={payment.id} className="p-4">
              <div className="flex flex-col md:flex-row justify-between md:items-center mb-4">
                <div>
                  <h3 className="font-semibold">Booking #{payment.bookingNumber}</h3>
                  <p className="text-sm text-gray-500">{payment.customerName} • {payment.customerPhone}</p>
                </div>
                <div className="flex items-center gap-2 mt-2 md:mt-0">
                  <Badge variant="outline" className={`flex items-center gap-1 ${getStatusColor(payment.paymentStatus)}`}>
                    {getStatusIcon(payment.paymentStatus)}
                    {payment.paymentStatus}
                  </Badge>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleOpenUpdateDialog(payment)}
                  >
                    Update Status
                  </Button>
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h4 className="text-sm font-medium flex items-center gap-1">
                    <BadgeIndianRupee className="h-4 w-4 text-gray-500" />
                    Amount Details
                  </h4>
                  <p className="mt-1">Total: ₹{payment.amount.toLocaleString()}</p>
                  <p className="text-sm">Paid: ₹{payment.paidAmount.toLocaleString()}</p>
                  {payment.remainingAmount > 0 && (
                    <p className="text-sm text-amber-600">Remaining: ₹{payment.remainingAmount.toLocaleString()}</p>
                  )}
                </div>
                
                <div>
                  <h4 className="text-sm font-medium flex items-center gap-1">
                    <CalendarDays className="h-4 w-4 text-gray-500" />
                    Payment Schedule
                  </h4>
                  <p className="mt-1">Payment Date: {payment.paymentDate ? formatDate(new Date(payment.paymentDate)) : 'Not specified'}</p>
                  <p className="text-sm">Due Date: {formatDate(new Date(payment.dueDate))}</p>
                  {payment.paymentMethod && (
                    <p className="text-sm">Method: <span className="capitalize">{payment.paymentMethod}</span></p>
                  )}
                </div>
                
                <div>
                  <h4 className="text-sm font-medium flex items-center gap-1">
                    <CreditCard className="h-4 w-4 text-gray-500" />
                    Actions
                  </h4>
                  
                  <div className="mt-1 flex flex-wrap gap-2">
                    {payment.paymentStatus !== 'paid' && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleOpenReminderDialog(payment)}
                      >
                        <Mail className="h-3 w-3 mr-1" />
                        Send Reminder
                      </Button>
                    )}
                    
                    {payment.paymentMethod === 'razorpay' && payment.razorpayPaymentId && (
                      <div className="text-xs text-gray-500 mt-2">
                        <p className="flex items-center gap-1">
                          Razorpay ID: 
                          <span className="font-mono">{payment.razorpayPaymentId.substring(0, 12)}...</span>
                          <button onClick={() => copyRazorpayId(payment.razorpayPaymentId!)} className="text-blue-500">
                            <Copy className="h-3 w-3" />
                          </button>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {payment.notes && (
                <div className="mt-4 text-sm text-gray-600 border-t pt-2">
                  <p><span className="font-medium">Notes:</span> {payment.notes}</p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
      
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
            onSendReminder={onSendReminder}
          />
        </>
      )}
    </div>
  );
}
