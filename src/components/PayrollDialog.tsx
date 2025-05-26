
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export interface PayrollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPayrollAdded: () => void;
  payrollToEdit?: any;
  selectedDriverId?: string | number;
}

export function PayrollDialog({ 
  open, 
  onOpenChange, 
  onPayrollAdded, 
  payrollToEdit, 
  selectedDriverId 
}: PayrollDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Payroll Management</DialogTitle>
        </DialogHeader>
        <div className="p-4">
          <p>Payroll dialog functionality will be implemented here.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
