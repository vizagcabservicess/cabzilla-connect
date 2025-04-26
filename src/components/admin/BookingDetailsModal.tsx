
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
  if (!booking) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto booking-details-modal-content">
        <DialogHeader className="sticky top-0 z-50 bg-white pb-4 border-b">
          <DialogTitle>Booking #{booking.bookingNumber}</DialogTitle>
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
