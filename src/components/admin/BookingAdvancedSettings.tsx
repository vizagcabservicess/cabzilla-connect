import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Booking } from '@/types/api';
import { formatPrice } from '@/lib/utils';
import { PlusIcon, TrashIcon } from 'lucide-react';

interface BookingAdvancedSettingsProps {
  booking: Booking;
  onSave: (updatedData: Partial<Booking>) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

interface ExtraCharge {
  amount: number;
  description: string;
}

export function BookingAdvancedSettings({
  booking,
  onSave,
  onCancel,
  isSubmitting
}: BookingAdvancedSettingsProps) {
  const [formData, setFormData] = useState({
    totalAmount: booking.totalAmount || 0,
    discountAmount: booking.discountAmount || 0,
    discountType: booking.discountType || 'fixed',
    discountValue: booking.discountValue || 0,
    paymentStatus: booking.paymentStatus || booking.payment_status || 'pending',
    paymentMethod: booking.payment_method || '',
    adminNotes: (booking as any).adminNotes || '',
  });

  const [extraCharges, setExtraCharges] = useState<ExtraCharge[]>(
    booking.extraCharges || []
  );

  const [newCharge, setNewCharge] = useState({
    amount: 0,
    description: ''
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Calculate totals
  const extraChargesTotal = extraCharges.reduce((sum, charge) => sum + charge.amount, 0);
  
  // Recalculate total amount when extra charges change
  useEffect(() => {
    const originalTotal = booking.totalAmount || 0;
    const newTotal = originalTotal + extraChargesTotal - formData.discountAmount;
    
    if (Math.abs(newTotal - formData.totalAmount) > 0.01) { // Use small threshold to avoid float precision issues
      setFormData(prev => ({ ...prev, totalAmount: Math.max(0, newTotal) }));
    }
  }, [extraChargesTotal]); // Only depend on extraChargesTotal to avoid infinite loops

  // For display purposes - calculate what the base service amount would be
  const baseAmount = booking.totalAmount || 0;

  const handleInputChange = (field: string, value: any) => {
    const newFormData = { ...formData, [field]: value };
    
    // If total amount is manually changed, recalculate discount if it's percentage-based
    if (field === 'totalAmount' && formData.discountType === 'percentage' && formData.discountValue > 0) {
      const originalTotal = booking.totalAmount || 0;
      newFormData.discountAmount = Math.round((originalTotal * formData.discountValue) / 100);
    }
    
    setFormData(newFormData);
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleDiscountChange = (field: string, value: any) => {
    const newFormData = { ...formData, [field]: value };
    
    // Auto-calculate discount amount based on type and value
    if (field === 'discountType' || field === 'discountValue') {
      // Use the original booking total as base for percentage calculations
      const originalTotal = booking.totalAmount || 0;
      
      if (newFormData.discountType === 'percentage') {
        const discountPercent = Math.min(Math.max(newFormData.discountValue, 0), 100);
        newFormData.discountAmount = Math.round((originalTotal * discountPercent) / 100);
      } else {
        newFormData.discountAmount = Math.max(newFormData.discountValue, 0);
      }
      
      // Recalculate total amount: original + extra charges - discount
      newFormData.totalAmount = originalTotal + extraChargesTotal - newFormData.discountAmount;
    }
    
    setFormData(newFormData);
  };

  const addExtraCharge = () => {
    if (newCharge.amount > 0 && newCharge.description.trim()) {
      setExtraCharges(prev => [...prev, { ...newCharge }]);
      setNewCharge({ amount: 0, description: '' });
    }
  };

  const removeExtraCharge = (index: number) => {
    setExtraCharges(prev => prev.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (formData.totalAmount < 0) {
      newErrors.totalAmount = 'Total amount cannot be negative';
    }

    if (formData.discountAmount < 0) {
      newErrors.discountAmount = 'Discount amount cannot be negative';
    }

    if (formData.discountAmount > formData.totalAmount) {
      newErrors.discountAmount = 'Discount amount cannot exceed total amount';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      const updatedData = {
        ...formData,
        extraCharges: extraCharges.length > 0 ? extraCharges : undefined,
      };

      await onSave(updatedData);
    } catch (error) {
      console.error('Error saving advanced settings:', error);
    }
  };

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">Advanced Settings</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Manage pricing, discounts, payments, and other advanced booking options.
          </p>
        </div>

        <Separator />

        {/* Pricing Section */}
        <div className="space-y-4">
          <h4 className="text-md font-medium">Pricing & Discounts</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="totalAmount">Total Amount (₹)</Label>
              <Input
                id="totalAmount"
                type="number"
                value={formData.totalAmount}
                onChange={(e) => handleInputChange('totalAmount', parseFloat(e.target.value) || 0)}
                min="0"
                step="0.01"
              />
              {errors.totalAmount && (
                <p className="text-sm text-destructive mt-1">{errors.totalAmount}</p>
              )}
            </div>

            <div>
              <Label htmlFor="discountType">Discount Type</Label>
              <Select
                value={formData.discountType}
                onValueChange={(value) => handleDiscountChange('discountType', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="discountValue">
                Discount {formData.discountType === 'percentage' ? 'Percentage' : 'Amount'}
              </Label>
              <Input
                id="discountValue"
                type="number"
                value={formData.discountValue}
                onChange={(e) => handleDiscountChange('discountValue', parseFloat(e.target.value) || 0)}
                min="0"
                max={formData.discountType === 'percentage' ? "100" : undefined}
                step="0.01"
                placeholder={formData.discountType === 'percentage' ? '0-100' : '0'}
              />
            </div>

            <div>
              <Label htmlFor="discountAmount">Calculated Discount Amount (₹)</Label>
              <Input
                id="discountAmount"
                type="number"
                value={formData.discountAmount}
                onChange={(e) => handleInputChange('discountAmount', parseFloat(e.target.value) || 0)}
                min="0"
                step="0.01"
              />
              {errors.discountAmount && (
                <p className="text-sm text-destructive mt-1">{errors.discountAmount}</p>
              )}
            </div>
          </div>
        </div>

        <Separator />

        {/* Extra Charges Section */}
        <div className="space-y-4">
          <h4 className="text-md font-medium">Extra Charges</h4>
          
          {extraCharges.length > 0 && (
            <div className="space-y-2">
              {extraCharges.map((charge, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-md">
                  <div>
                    <span className="font-medium">{charge.description}</span>
                    <span className="ml-2 text-muted-foreground">- {formatPrice(charge.amount)}</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeExtraCharge(index)}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Input
              placeholder="Charge description"
              value={newCharge.description}
              onChange={(e) => setNewCharge(prev => ({ ...prev, description: e.target.value }))}
            />
            <Input
              type="number"
              placeholder="Amount (₹)"
              value={newCharge.amount || ''}
              onChange={(e) => setNewCharge(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
              min="0"
              step="0.01"
            />
            <Button
              type="button"
              variant="outline"
              onClick={addExtraCharge}
              disabled={!newCharge.description.trim() || newCharge.amount <= 0}
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Add Charge
            </Button>
          </div>
        </div>

        <Separator />

        {/* Payment Section */}
        <div className="space-y-4">
          <h4 className="text-md font-medium">Payment Details</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="paymentStatus">Payment Status</Label>
              <Select
                value={formData.paymentStatus}
                onValueChange={(value) => handleInputChange('paymentStatus', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select
                value={formData.paymentMethod}
                onValueChange={(value) => handleInputChange('paymentMethod', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="net_banking">Net Banking</SelectItem>
                  <SelectItem value="wallet">Wallet</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Separator />

        {/* Admin Notes Section */}
        <div className="space-y-2">
          <Label htmlFor="adminNotes">Admin Notes</Label>
          <Textarea
            id="adminNotes"
            placeholder="Internal notes for this booking..."
            value={formData.adminNotes}
            onChange={(e) => handleInputChange('adminNotes', e.target.value)}
            rows={3}
          />
        </div>

        <Separator />

        {/* Summary Section */}
        <div className="bg-muted p-4 rounded-md">
          <h4 className="font-medium mb-2">Pricing Summary</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Base Amount:</span>
              <span>{formatPrice(Math.max(0, baseAmount))}</span>
            </div>
            {extraCharges.length > 0 && (
              <div className="flex justify-between">
                <span>Extra Charges:</span>
                <span>+{formatPrice(extraChargesTotal)}</span>
              </div>
            )}
            {formData.discountAmount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount:</span>
                <span>-{formatPrice(formData.discountAmount)}</span>
              </div>
            )}
            <Separator className="my-2" />
            <div className="flex justify-between font-medium text-base">
              <span>Final Total:</span>
              <span>{formatPrice(formData.totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Card>
  );
}