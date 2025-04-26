import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Driver } from '@/types/api';

interface DeleteDriverDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  driver: Driver;
  isSubmitting: boolean;
}

export function DeleteDriverDialog({ isOpen, onClose, onConfirm, driver, isSubmitting }: DeleteDriverDialogProps) {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onConfirm();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Delete Driver</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the driver {driver.name}? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="mt-4 space-y-4">
            <div className="text-sm text-gray-500">
              <p>Driver Details:</p>
              <ul className="mt-2 list-disc list-inside">
                <li>Name: {driver.name}</li>
                <li>Phone: {driver.phone}</li>
                <li>License Number: {driver.license_number}</li>
                <li>Status: {driver.status}</li>
              </ul>
            </div>
            
            <div className="text-sm text-red-500">
              Note: If the driver has any active trips or pending payments, they cannot be deleted.
            </div>
          </div>
          
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Driver
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 