import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Payment } from '@/types/payment';

interface PaymentReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: Payment | null;
  onSendReminder: (paymentId: number | string, reminderType: string) => void;
}

export function PaymentReminderDialog({ open, onOpenChange, payment, onSendReminder }: PaymentReminderDialogProps) {
  if (!payment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Payment Reminder</DialogTitle>
        </DialogHeader>
        <div className="mb-4">
          <p><strong>Booking #:</strong> {payment.bookingNumber}</p>
          <p><strong>Customer:</strong> {payment.customerName}</p>
          <p><strong>Amount:</strong> ₹{payment.amount.toLocaleString()}</p>
        </div>
        <DialogFooter>
          <Button onClick={() => onSendReminder(payment.id, 'email')}>Send Email Reminder</Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 