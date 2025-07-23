
import React, { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BookingDetails } from './BookingDetails';
import { Booking, BookingStatus } from '@/types/api';

interface BookingDetailsModalProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (updatedData: Partial<Booking>) => Promise<void>;
  onAssignDriver: (driverData: { driverName: string; driverPhone: string; vehicleNumber: string }) => Promise<void>;
  onCancel: () => Promise<void>;
  onGenerateInvoice: (gstEnabled?: boolean, gstDetails?: any) => Promise<any>;
  onStatusChange: (newStatus: BookingStatus) => Promise<void>;
  isSubmitting: boolean;
}

export function BookingDetailsModal({
  booking,
  isOpen,
  onClose,
  onEdit,
  onAssignDriver,
  onCancel,
  onGenerateInvoice,
  onStatusChange,
  isSubmitting
}: BookingDetailsModalProps) {
  // Control body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      // Prevent body scrolling when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      // Re-enable body scrolling when modal closes
      document.body.style.overflow = 'unset';
    }
    
    // Cleanup function to ensure body scroll is restored when component unmounts
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!booking) return null;

  // Prevent modal from closing when clicking outside if submitting
  const handleOpenChange = (open: boolean) => {
    if (!isSubmitting && !open) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto booking-details-modal-content fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] z-50">
        <DialogHeader className="sticky top-0 z-[51] bg-white pb-4 border-b">
          <DialogTitle className="text-base font-semibold">Booking #{booking.bookingNumber}</DialogTitle>
        </DialogHeader>
        <div className="pt-4">
          <BookingDetails
            booking={booking}
            onClose={onClose}
            onEdit={onEdit}
            onAssignDriver={onAssignDriver}
            onCancel={onCancel}
            onGenerateInvoice={onGenerateInvoice}
            onStatusChange={onStatusChange}
            isSubmitting={isSubmitting}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
