
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface PaymentManagerProps {
  onUpdatePayment: (paymentId: string | number, status: string, amount?: number, paymentMethod?: string, notes?: string) => Promise<void>;
  onSendReminder: (paymentId: string | number, reminderType: string, customMessage?: string) => Promise<void>;
}

export function PaymentManager({ onUpdatePayment, onSendReminder }: PaymentManagerProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Management</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-gray-600">
          Payment management functionality will be implemented here.
        </div>
      </CardContent>
    </Card>
  );
}

