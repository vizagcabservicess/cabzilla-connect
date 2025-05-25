
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Payment, PaymentMethod, PaymentStatus } from '@/types/payment';

interface PaymentUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: Payment;
  onUpdate: (
    paymentId: string | number,
    status: string,
    amount?: number,
    paymentMethod?: string,
    notes?: string
  ) => Promise<void>;
}

export function PaymentUpdateDialog({ 
  open, 
  onOpenChange, 
  payment, 
  onUpdate 
}: PaymentUpdateDialogProps) {
  const [status, setStatus] = useState<PaymentStatus>(payment.status);
  const [amount, setAmount] = useState(payment.amount);
  const [method, setMethod] = useState<PaymentMethod>(payment.method);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setStatus(payment.status);
    setAmount(payment.amount);
    setMethod(payment.method);
    setNotes('');
  }, [payment]);

  const handleMethodChange = (value: string) => {
    setMethod(value as PaymentMethod);
  };

  const handleUpdate = async () => {
    setIsLoading(true);
    try {
      await onUpdate(payment.id, status, amount, method, notes);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to update payment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Payment</DialogTitle>
          <DialogDescription>
            Update payment details for booking #{payment.bookingId}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as PaymentStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label>Amount</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </div>
          
          <div>
            <Label>Payment Method</Label>
            <Select value={method} onValueChange={handleMethodChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="wallet">Wallet</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
                <SelectItem value="razorpay">Razorpay</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes..."
              rows={3}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleUpdate} disabled={isLoading}>
            {isLoading ? 'Updating...' : 'Update Payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
