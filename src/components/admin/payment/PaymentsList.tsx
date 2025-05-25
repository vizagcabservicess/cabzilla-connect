
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Send } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Payment } from '@/types/payment';
import { PaymentUpdateDialog } from './PaymentUpdateDialog';
import { PaymentReminderDialog } from './PaymentReminderDialog';

interface PaymentsListProps {
  payments: Payment[];
  onUpdatePaymentStatus: (
    paymentId: string | number,
    status: string,
    amount?: number,
    paymentMethod?: string,
    notes?: string
  ) => Promise<void>;
  onSendReminder: (
    paymentId: string | number,
    reminderType: string,
    customMessage?: string
  ) => Promise<void>;
  isLoading: boolean;
}

export function PaymentsList({ 
  payments, 
  onUpdatePaymentStatus, 
  onSendReminder, 
  isLoading 
}: PaymentsListProps) {
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [showReminderDialog, setShowReminderDialog] = useState(false);

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'secondary',
      partial: 'outline',
      paid: 'default',
      cancelled: 'destructive'
    } as const;
    
    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status}
      </Badge>
    );
  };

  const getMethodBadge = (method: string) => {
    return <Badge variant="outline">{method}</Badge>;
  };

  const handleUpdateClick = (payment: Payment) => {
    setSelectedPayment(payment);
    setShowUpdateDialog(true);
  };

  const handleReminderClick = (payment: Payment) => {
    setSelectedPayment(payment);
    setShowReminderDialog(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading payments...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Payments</CardTitle>
          <CardDescription>
            Manage and track payment statuses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Booking ID</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    No payments found
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{payment.bookingId}</TableCell>
                    <TableCell>₹{payment.amount}</TableCell>
                    <TableCell>{getMethodBadge(payment.method)}</TableCell>
                    <TableCell>{getStatusBadge(payment.status)}</TableCell>
                    <TableCell>{new Date(payment.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleUpdateClick(payment)}>
                            Update Status
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleReminderClick(payment)}>
                            <Send className="mr-2 h-4 w-4" />
                            Send Reminder
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedPayment && (
        <>
          <PaymentUpdateDialog
            open={showUpdateDialog}
            onOpenChange={setShowUpdateDialog}
            payment={selectedPayment}
            onUpdate={onUpdatePaymentStatus}
          />
          
          <PaymentReminderDialog
            open={showReminderDialog}
            onOpenChange={setShowReminderDialog}
            payment={selectedPayment}
            onSendReminder={onSendReminder}
          />
        </>
      )}
    </>
  );
}
