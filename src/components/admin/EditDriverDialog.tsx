
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Driver, DriverStatus } from '@/types/api';

interface EditDriverDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Driver>) => Promise<void>;
  driver: Driver;
  isSubmitting: boolean;
}

export function EditDriverDialog({ isOpen, onClose, onSubmit, driver, isSubmitting }: EditDriverDialogProps) {
  const [formData, setFormData] = useState<Partial<Driver>>({
    name: '',
    phone: '',
    email: '',
    license_no: '',
    vehicle: '',
    vehicle_id: '',
    status: 'available',
    location: ''
  });
  
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isDialogOpen, setIsDialogOpen] = useState(isOpen);
  
  // Initialize form data with driver details
  useEffect(() => {
    if (isOpen && driver) {
      setFormData({
        name: driver.name || '',
        phone: driver.phone || '',
        email: driver.email || '',
        license_no: driver.license_no || driver.license_number || '',
        vehicle: driver.vehicle || '',
        vehicle_id: driver.vehicle_id || '',
        status: driver.status || 'available',
        location: driver.location || ''
      });
      // Clear any previous form errors when opening the dialog
      setFormErrors({});
      setIsDialogOpen(isOpen);
    }
  }, [driver, isOpen]);
  
  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.name?.trim()) {
      errors.name = 'Name is required';
    }
    
    if (!formData.phone?.trim()) {
      errors.phone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(formData.phone)) {
      errors.phone = 'Invalid phone number format';
    }
    
    if (!formData.email?.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }
    
    if (!formData.license_no?.trim()) {
      errors.license_no = 'License number is required';
    }
    
    if (!formData.status || !['available', 'busy', 'offline'].includes(formData.status as string)) {
      errors.status = 'Invalid status value';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error("Please fix form errors before submitting");
      return;
    }
    
    try {
      await onSubmit({
        ...formData,
        id: driver.id
      });
    } catch (error) {
      console.error("Error in EditDriverDialog.handleSubmit:", error);
    }
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear the error for this field when user makes a change
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };
  
  const handleStatusChange = (value: string) => {
    // Cast the string value to the DriverStatus type
    setFormData(prev => ({ ...prev, status: value as DriverStatus }));
    // Clear any status errors
    if (formErrors.status) {
      setFormErrors(prev => ({ ...prev, status: '' }));
    }
  };

  // Handle the dialog close properly
  const handleClose = () => {
    // Reset form data and errors
    setFormData({
      name: '',
      phone: '',
      email: '',
      license_no: '',
      vehicle: '',
      vehicle_id: '',
      status: 'available',
      location: ''
    });
    setFormErrors({});
    setIsDialogOpen(false);
    // Call the provided onClose handler
    onClose();
  };
  
  return (
    <Dialog open={isDialogOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Driver</DialogTitle>
          <DialogDescription>
            Update the driver's information below.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Driver Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  className={formErrors.name ? "border-red-500" : ""}
                />
                {formErrors.name && (
                  <p className="text-xs text-red-500">{formErrors.name}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  className={formErrors.phone ? "border-red-500" : ""}
                />
                {formErrors.phone && (
                  <p className="text-xs text-red-500">{formErrors.phone}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  className={formErrors.email ? "border-red-500" : ""}
                />
                {formErrors.email && (
                  <p className="text-xs text-red-500">{formErrors.email}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="license_no">License Number</Label>
                <Input
                  id="license_no"
                  name="license_no"
                  value={formData.license_no}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  className={formErrors.license_no ? "border-red-500" : ""}
                />
                {formErrors.license_no && (
                  <p className="text-xs text-red-500">{formErrors.license_no}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="vehicle">Vehicle</Label>
                <Input
                  id="vehicle"
                  name="vehicle"
                  value={formData.vehicle || ''}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="vehicle_id">Vehicle ID</Label>
                <Input
                  id="vehicle_id"
                  name="vehicle_id"
                  value={formData.vehicle_id || ''}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status as string}
                  onValueChange={handleStatusChange}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className={formErrors.status ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="busy">Busy</SelectItem>
                    <SelectItem value="offline">Offline</SelectItem>
                  </SelectContent>
                </Select>
                {formErrors.status && (
                  <p className="text-xs text-red-500">{formErrors.status}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  name="location"
                  value={formData.location || ''}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
