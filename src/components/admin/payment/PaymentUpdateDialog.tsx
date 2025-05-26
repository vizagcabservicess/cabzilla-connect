
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Payment, PaymentMethod } from '@/types/payment';

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'upi', label: 'UPI' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'wallet', label: 'Wallet' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'razorpay', label: 'Razorpay' },
  { value: 'other', label: 'Other' },
] as const;

interface PaymentUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: Payment | null;
  onUpdate: (paymentId: number | string, status: string, amount?: number, paymentMethod?: string, notes?: string) => void;
}

export function PaymentUpdateDialog({ open, onOpenChange, payment, onUpdate }: PaymentUpdateDialogProps) {
  const [amount, setAmount] = useState(payment?.amount || 0);
  const [method, setMethod] = useState<PaymentMethod>(payment?.paymentMethod || 'cash');
  const [notes, setNotes] = useState('');

  React.useEffect(() => {
    setAmount(payment?.amount || 0);
    setMethod(payment?.paymentMethod || 'cash');
    setNotes('');
  }, [payment]);

  if (!payment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Payment Status</DialogTitle>
        </DialogHeader>
        <div className="mb-4 space-y-2">
          <p><strong>Booking #:</strong> {payment.bookingNumber}</p>
          <p><strong>Customer:</strong> {payment.customerName}</p>
          <p><strong>Total Amount:</strong> ₹{payment.amount.toLocaleString()}</p>
          <div>
            <label className="block text-sm font-medium mb-1">Paid Amount</label>
            <input
              type="number"
              min={0}
              max={payment.amount}
              value={amount}
              onChange={e => setAmount(Number(e.target.value))}
              className="border rounded px-2 py-1 w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Payment Method</label>
            <select
              value={method}
              onChange={e => setMethod(e.target.value as PaymentMethod)}
              className="border rounded px-2 py-1 w-full"
            >
              {PAYMENT_METHODS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="border rounded px-2 py-1 w-full"
              rows={2}
              placeholder="Any additional details..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => onUpdate(payment.id, amount === payment.amount ? 'paid' : 'partial', amount, method, notes)}>
            {amount === payment.amount ? 'Mark as Paid' : 'Mark as Partial'}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
