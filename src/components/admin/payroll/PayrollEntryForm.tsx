import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PayrollEntry } from '@/types/api';
import { toast } from 'sonner';

interface PayrollEntryFormProps {
  entry?: PayrollEntry;
  onSave: (entry: Partial<PayrollEntry>) => void;
  onCancel: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onPayrollAdded?: () => void;
  payrollToEdit?: PayrollEntry;
  selectedDriverId?: string | number;
}

export function PayrollEntryForm({ entry, onSave, onCancel, open, onOpenChange, onPayrollAdded, payrollToEdit, selectedDriverId }: PayrollEntryFormProps) {
  const [formData, setFormData] = useState({
    driverId: entry?.driverId || entry?.driver_id || '',
    baseSalary: entry?.baseSalary || entry?.base_salary || 0,
    incentives: entry?.incentives || entry?.commission || 0,
    deductions: entry?.deductions || 0,
    payPeriodStart: entry?.payPeriodStart || '',
    payPeriodEnd: entry?.payPeriodEnd || '',
    status: entry?.status || 'pending' as const
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.driverId) {
      toast.error('Please select a driver');
      return;
    }
    
    if (formData.baseSalary < 0) {
      toast.error('Base salary cannot be negative');
      return;
    }

    if (formData.incentives < 0) {
      toast.error('Incentives cannot be negative');
      return;
    }

    if (formData.deductions < 0) {
      toast.error('Deductions cannot be negative');
      return;
    }

    const totalAmount = formData.baseSalary + formData.incentives - formData.deductions;
    
    onSave({
      ...formData,
      driverId: Number(formData.driverId), // Convert to number
      totalAmount
    });
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const totalAmount = formData.baseSalary + formData.incentives - formData.deductions;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{entry ? 'Edit Payroll Entry' : 'Create Payroll Entry'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="driverId">Driver ID</Label>
            <Input
              id="driverId"
              value={String(formData.driverId)}
              onChange={(e) => handleChange('driverId', e.target.value)}
              placeholder="Enter driver ID"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="baseSalary">Base Salary</Label>
              <Input
                id="baseSalary"
                type="number"
                min="0"
                step="100"
                value={formData.baseSalary}
                onChange={(e) => handleChange('baseSalary', Number(e.target.value))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="incentives">Incentives</Label>
              <Input
                id="incentives"
                type="number"
                min="0"
                step="50"
                value={formData.incentives}
                onChange={(e) => handleChange('incentives', Number(e.target.value))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="deductions">Deductions</Label>
              <Input
                id="deductions"
                type="number"
                min="0"
                step="50"
                value={formData.deductions}
                onChange={(e) => handleChange('deductions', Number(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processed">Processed</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="payPeriodStart">Pay Period Start</Label>
              <Input
                id="payPeriodStart"
                type="date"
                value={formData.payPeriodStart}
                onChange={(e) => handleChange('payPeriodStart', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payPeriodEnd">Pay Period End</Label>
              <Input
                id="payPeriodEnd"
                type="date"
                value={formData.payPeriodEnd}
                onChange={(e) => handleChange('payPeriodEnd', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center text-lg font-semibold">
              <span>Total Amount:</span>
              <span className={totalAmount >= 0 ? 'text-green-600' : 'text-red-600'}>
                ₹{totalAmount.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">
              {entry ? 'Update' : 'Create'} Entry
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
