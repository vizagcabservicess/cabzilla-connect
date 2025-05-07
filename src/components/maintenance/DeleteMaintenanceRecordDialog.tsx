
import React from 'react';
import { MaintenanceRecord } from '@/types/maintenance';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface DeleteMaintenanceRecordDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  record: MaintenanceRecord;
  isSubmitting?: boolean;
}

export function DeleteMaintenanceRecordDialog({
  isOpen,
  onClose,
  onConfirm,
  record,
  isSubmitting = false
}: DeleteMaintenanceRecordDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Maintenance Record</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the maintenance record for vehicle {record.vehicleId}? 
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button 
              variant="destructive" 
              onClick={onConfirm} 
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Deleting...' : 'Delete'}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
