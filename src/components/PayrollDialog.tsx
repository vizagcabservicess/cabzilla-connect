
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
          <DialogTitle>
            {payrollToEdit ? 'Edit Payroll Entry' : 'Add Payroll Entry'}
          </DialogTitle>
        </DialogHeader>
        <div className="p-4">
          <p>Payroll dialog functionality will be implemented here.</p>
          {selectedDriverId && (
            <p className="text-sm text-gray-600 mt-2">
              Selected Driver ID: {selectedDriverId}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
