
import React, { useState, useEffect } from 'react';
import { MaintenanceRecord, ServiceType } from '@/types/maintenance';
import { FleetVehicle } from '@/types/cab';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from 'date-fns';

interface MaintenanceRecordFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: Partial<MaintenanceRecord>) => Promise<void>;
  editingRecord: MaintenanceRecord | null;
  vehicles: FleetVehicle[];
}

const serviceTypes: ServiceType[] = [
  'Oil Change',
  'Tire Replacement',
  'Battery Replacement',
  'Brake Service',
  'Air Filter Replacement',
  'Major Service',
  'AC Service',
  'Transmission Service',
  'Engine Repair',
  'Electrical Repair',
  'Suspension Repair',
  'Regular Maintenance',
  'Other'
];

export function MaintenanceRecordForm({ 
  isOpen, 
  onClose, 
  onSave, 
  editingRecord, 
  vehicles 
}: MaintenanceRecordFormProps) {
  const [formValues, setFormValues] = useState<Partial<MaintenanceRecord>>({
    vehicleId: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    serviceType: 'Regular Maintenance',
    description: '',
    cost: 0,
    vendor: '',
    nextServiceDate: format(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'), // 90 days in future
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editingRecord) {
      setFormValues({
        ...editingRecord,
        // Ensure date formats are correct
        date: editingRecord.date ? format(new Date(editingRecord.date), 'yyyy-MM-dd') : '',
        nextServiceDate: editingRecord.nextServiceDate ? format(new Date(editingRecord.nextServiceDate), 'yyyy-MM-dd') : ''
      });
    } else {
      // Reset form for new record
      setFormValues({
        vehicleId: vehicles.length > 0 ? vehicles[0].id : '',
        date: format(new Date(), 'yyyy-MM-dd'),
        serviceType: 'Regular Maintenance',
        description: '',
        cost: 0,
        vendor: '',
        nextServiceDate: format(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
        notes: ''
      });
    }
    setErrors({});
  }, [editingRecord, vehicles, isOpen]);

  const handleChange = (field: string, value: string | number) => {
    setFormValues(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error for this field if it exists
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formValues.vehicleId) newErrors.vehicleId = 'Vehicle is required';
    if (!formValues.date) newErrors.date = 'Date is required';
    if (!formValues.serviceType) newErrors.serviceType = 'Service type is required';
    if (!formValues.description) newErrors.description = 'Description is required';
    if (formValues.cost === undefined || formValues.cost < 0) {
      newErrors.cost = 'Valid cost is required';
    }
    if (!formValues.vendor) newErrors.vendor = 'Vendor is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    try {
      await onSave(formValues);
      onClose();
    } catch (error) {
      console.error('Error saving maintenance record:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingRecord ? 'Edit Maintenance Record' : 'Add Maintenance Record'}
          </DialogTitle>
          <DialogDescription>
            {editingRecord 
              ? 'Update the maintenance record details below.'
              : 'Enter the details of the maintenance record below.'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vehicleId">Vehicle</Label>
            <Select
              value={formValues.vehicleId?.toString() || ''}
              onValueChange={(value) => handleChange('vehicleId', value)}
            >
              <SelectTrigger className={errors.vehicleId ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select a vehicle" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                    {vehicle.vehicleNumber} - {vehicle.make} {vehicle.model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.vehicleId && <p className="text-red-500 text-sm">{errors.vehicleId}</p>}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="serviceType">Service Type</Label>
            <Select
              value={formValues.serviceType || ''}
              onValueChange={(value) => handleChange('serviceType', value)}
            >
              <SelectTrigger className={errors.serviceType ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select service type" />
              </SelectTrigger>
              <SelectContent>
                {serviceTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.serviceType && <p className="text-red-500 text-sm">{errors.serviceType}</p>}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="date">Service Date</Label>
            <Input
              type="date"
              id="date"
              value={formValues.date || ''}
              onChange={(e) => handleChange('date', e.target.value)}
              className={errors.date ? 'border-red-500' : ''}
            />
            {errors.date && <p className="text-red-500 text-sm">{errors.date}</p>}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formValues.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              className={errors.description ? 'border-red-500' : ''}
              rows={3}
            />
            {errors.description && <p className="text-red-500 text-sm">{errors.description}</p>}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cost">Cost (₹)</Label>
              <Input
                type="number"
                id="cost"
                value={formValues.cost?.toString() || '0'}
                onChange={(e) => handleChange('cost', parseFloat(e.target.value))}
                className={errors.cost ? 'border-red-500' : ''}
                min="0"
                step="0.01"
              />
              {errors.cost && <p className="text-red-500 text-sm">{errors.cost}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="vendor">Vendor/Service Center</Label>
              <Input
                type="text"
                id="vendor"
                value={formValues.vendor || ''}
                onChange={(e) => handleChange('vendor', e.target.value)}
                className={errors.vendor ? 'border-red-500' : ''}
              />
              {errors.vendor && <p className="text-red-500 text-sm">{errors.vendor}</p>}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="nextServiceDate">Next Service Date</Label>
            <Input
              type="date"
              id="nextServiceDate"
              value={formValues.nextServiceDate || ''}
              onChange={(e) => handleChange('nextServiceDate', e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={formValues.notes || ''}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={2}
            />
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : editingRecord ? 'Update' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
