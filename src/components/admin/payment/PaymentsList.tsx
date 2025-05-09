
import React, { useState } from 'react';
import { format } from 'date-fns';
import { MoreHorizontal, Mail, AlertTriangle, Check } from 'lucide-react';
import { Payment, PaymentStatus } from '@/types/payment';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface PaymentsListProps {
  payments: Payment[];
  onUpdatePaymentStatus: (
    paymentId: number | string, 
    status: string, 
    amount?: number, 
    paymentMethod?: string,
    notes?: string
  ) => Promise<void>;
  onSendReminder: (
    paymentId: number | string, 
    reminderType: string, 
    customMessage?: string
  ) => Promise<void>;
  isLoading?: boolean;
}

export function PaymentsList({ payments, onUpdatePaymentStatus, onSendReminder, isLoading }: PaymentsListProps) {
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  
  // Update payment status state
  const [newStatus, setNewStatus] = useState<PaymentStatus>('pending');
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  
  // Reminder state
  const [reminderType, setReminderType] = useState<string>('initial');
  const [customMessage, setCustomMessage] = useState<string>('');
  
  // Format currency amount
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };
  
  // Reset modal states
  const resetUpdateDialog = () => {
    setNewStatus('pending');
    setPaymentAmount('');
    setPaymentMethod('');
    setPaymentNotes('');
  };
  
  const resetReminderDialog = () => {
    setReminderType('initial');
    setCustomMessage('');
  };
  
  // Open payment update dialog
  const openUpdateDialog = (payment: Payment) => {
    setSelectedPayment(payment);
    setNewStatus(payment.paymentStatus);
    setPaymentAmount(payment.remainingAmount.toString());
    setPaymentMethod(payment.paymentMethod || '');
    setUpdateDialogOpen(true);
  };
  
  // Open reminder dialog
  const openReminderDialog = (payment: Payment) => {
    setSelectedPayment(payment);
    setReminderDialogOpen(true);
  };
  
  // Handle update payment
  const handleUpdatePayment = async () => {
    if (!selectedPayment) return;
    
    try {
      await onUpdatePaymentStatus(
        selectedPayment.id,
        newStatus,
        paymentAmount ? parseFloat(paymentAmount) : undefined,
        paymentMethod || undefined,
        paymentNotes || undefined
      );
      
      setUpdateDialogOpen(false);
      resetUpdateDialog();
    } catch (error) {
      console.error('Failed to update payment:', error);
    }
  };
  
  // Handle send reminder
  const handleSendReminder = async () => {
    if (!selectedPayment) return;
    
    try {
      await onSendReminder(
        selectedPayment.id,
        reminderType,
        customMessage || undefined
      );
      
      setReminderDialogOpen(false);
      resetReminderDialog();
    } catch (error) {
      console.error('Failed to send reminder:', error);
    }
  };
  
  // Get badge color by status
  const getStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500">Paid</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-500">Partial</Badge>;
      case 'pending':
        return <Badge className="bg-red-500">Pending</Badge>;
      case 'cancelled':
        return <Badge variant="outline">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  // Check if payment is overdue
  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };
  
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Booking</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead className="hidden md:table-cell">Due Date</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-10">
                <div className="flex flex-col items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-800 mb-2"></div>
                  <p>Loading payments...</p>
                </div>
              </TableCell>
            </TableRow>
          ) : payments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-10">
                <p className="text-muted-foreground">No payments found</p>
                <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters or search terms.</p>
              </TableCell>
            </TableRow>
          ) : (
            payments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell>
                  <div className="font-medium">#{payment.bookingNumber}</div>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{payment.customerName}</div>
                  <div className="text-sm text-muted-foreground">{payment.customerPhone}</div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <div className={`${isOverdue(payment.dueDate) && payment.paymentStatus !== 'paid' ? 'text-red-500 font-medium' : ''}`}>
                    {format(new Date(payment.dueDate), 'dd MMM yyyy')}
                    {isOverdue(payment.dueDate) && payment.paymentStatus !== 'paid' && (
                      <div className="flex items-center text-xs text-red-500">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Overdue
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="font-medium">{formatCurrency(payment.amount)}</div>
                  {payment.paymentStatus === 'partial' && (
                    <div className="text-xs text-muted-foreground">
                      Paid: {formatCurrency(payment.paidAmount)}
                    </div>
                  )}
                </TableCell>
                <TableCell>{getStatusBadge(payment.paymentStatus)}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => openUpdateDialog(payment)}>
                        <Check className="h-4 w-4 mr-2" />
                        Update Payment
                      </DropdownMenuItem>
                      {payment.paymentStatus !== 'paid' && payment.customerEmail && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => openReminderDialog(payment)}>
                            <Mail className="h-4 w-4 mr-2" />
                            Send Reminder
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      
      {/* Update Payment Dialog */}
      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Update Payment Status</DialogTitle>
            <DialogDescription>
              Update the payment status for booking #{selectedPayment?.bookingNumber}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Status</label>
              <Select value={newStatus} onValueChange={(value) => setNewStatus(value as PaymentStatus)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {newStatus !== 'cancelled' && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Payment Amount</label>
                  <Input
                    type="number"
                    placeholder="Enter amount"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {selectedPayment && `Remaining: ${formatCurrency(selectedPayment.remainingAmount)}`}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Payment Method</label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="wallet">Wallet</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Notes (Optional)</label>
                  <Textarea
                    placeholder="Enter payment notes..."
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdatePayment}>
              Update Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Send Reminder Dialog */}
      <Dialog open={reminderDialogOpen} onOpenChange={setReminderDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Send Payment Reminder</DialogTitle>
            <DialogDescription>
              Send a payment reminder to {selectedPayment?.customerName} for booking #{selectedPayment?.bookingNumber}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Reminder Type</label>
              <Select value={reminderType} onValueChange={setReminderType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reminder type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="initial">Initial Reminder</SelectItem>
                  <SelectItem value="followup">Follow-up Reminder</SelectItem>
                  <SelectItem value="final">Final Reminder</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Custom Message (Optional)</label>
              <Textarea
                placeholder="Enter a custom message..."
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to use the default reminder template.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setReminderDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendReminder}>
              Send Reminder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
