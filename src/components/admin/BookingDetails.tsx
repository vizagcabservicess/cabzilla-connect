
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookingEditForm } from './BookingEditForm';
import { DriverAssignment } from './DriverAssignment';
import { BookingInvoice } from './BookingInvoice';
import { Booking, BookingStatus } from '@/types/api';
import { BookingStatusFlow } from './BookingStatusFlow';
import { formatPrice } from '@/lib/utils';

interface BookingDetailsProps {
  booking: Booking;
  onClose: () => void;
  onEdit: (updatedData: Partial<Booking>) => Promise<void>;
  onAssignDriver: (driverData: { driverName: string; driverPhone: string; vehicleNumber: string }) => Promise<void>;
  onCancel: () => Promise<void>;
  onGenerateInvoice: (gstEnabled?: boolean, gstDetails?: any) => Promise<any>;
  onStatusChange: (newStatus: BookingStatus) => Promise<void>;
  isSubmitting: boolean;
}

export function BookingDetails({
  booking,
  onClose,
  onEdit,
  onAssignDriver,
  onCancel,
  onGenerateInvoice,
  onStatusChange,
  isSubmitting
}: BookingDetailsProps) {
  const [activeTab, setActiveTab] = useState('details');

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  const isCompleted = booking.status === 'completed';
  const isCancelled = booking.status === 'cancelled';

  // Determine which tabs should be enabled based on booking status
  const isEditDisabled = isCancelled;
  const isDriverDisabled = isCancelled || isCompleted;
  const isInvoiceDisabled = isCancelled;

  // Construct the PDF URL for the invoice download
  const pdfUrl = `/api/admin/download-invoice.php?id=${booking.id}`;

  return (
    <div>
      <div className="mb-6">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h2 className="text-2xl font-bold">Booking #{booking.bookingNumber}</h2>
            <p className="text-gray-500">
              {new Date(booking.pickupDate).toLocaleDateString()} · {booking.tripType} · {booking.cabType}
            </p>
          </div>
          <div className="text-right">
            <p className="font-semibold">₹ {formatPrice(booking.totalAmount)}</p>
            <div className="inline-block px-2 py-1 text-xs font-medium rounded-md bg-gray-100 text-gray-800 mt-1">
              {booking.status.replace('_', ' ').toUpperCase()}
            </div>
          </div>
        </div>

        <BookingStatusFlow 
          currentStatus={booking.status} 
          onStatusChange={onStatusChange}
          isSubmitting={isSubmitting}
        />
      </div>

      <Tabs defaultValue="details" value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="w-full border-b justify-start">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="edit" disabled={isEditDisabled}>Edit</TabsTrigger>
          <TabsTrigger value="driver" disabled={isDriverDisabled}>Driver</TabsTrigger>
          <TabsTrigger value="invoice" disabled={isInvoiceDisabled}>Invoice</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="py-4">
          <Card className="p-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2 text-gray-700">Customer Details</h3>
                <p><span className="font-medium">Name:</span> {booking.passengerName}</p>
                <p><span className="font-medium">Phone:</span> {booking.passengerPhone}</p>
                <p><span className="font-medium">Email:</span> {booking.passengerEmail}</p>
                {booking.billingAddress && (
                  <p><span className="font-medium">Billing Address:</span> {booking.billingAddress}</p>
                )}
              </div>

              <div>
                <h3 className="font-semibold mb-2 text-gray-700">Trip Details</h3>
                <p><span className="font-medium">Trip Type:</span> {booking.tripType} {booking.tripMode && `(${booking.tripMode})`}</p>
                <p><span className="font-medium">Pickup:</span> {booking.pickupLocation}</p>
                {booking.dropLocation && <p><span className="font-medium">Drop:</span> {booking.dropLocation}</p>}
                <p><span className="font-medium">Pickup Date:</span> {new Date(booking.pickupDate).toLocaleString()}</p>
                <p><span className="font-medium">Vehicle:</span> {booking.cabType}</p>
              </div>
            </div>

            {(booking.driverName || booking.driverPhone || booking.vehicleNumber) && (
              <div className="mt-6 border-t pt-4">
                <h3 className="font-semibold mb-2 text-gray-700">Driver Details</h3>
                {booking.driverName && <p><span className="font-medium">Name:</span> {booking.driverName}</p>}
                {booking.driverPhone && <p><span className="font-medium">Phone:</span> {booking.driverPhone}</p>}
                {booking.vehicleNumber && <p><span className="font-medium">Vehicle Number:</span> {booking.vehicleNumber}</p>}
              </div>
            )}

            {booking.extraCharges && booking.extraCharges.length > 0 && (
              <div className="mt-6 border-t pt-4">
                <h3 className="font-semibold mb-2 text-gray-700">Extra Charges</h3>
                {booking.extraCharges.map((charge, index) => (
                  <div key={index} className="flex justify-between items-center py-1">
                    <span>{charge.description || 'Additional charge'}</span>
                    <span>₹{formatPrice(charge.amount)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 flex justify-between items-center border-t pt-4">
              <div>
                <p className="text-sm text-gray-500">Total Amount</p>
                <p className="font-bold text-xl">₹{formatPrice(booking.totalAmount)}</p>
              </div>

              <div className="space-x-2">
                {!isCancelled && (
                  <Button 
                    variant="destructive" 
                    onClick={onCancel}
                    disabled={isSubmitting || isCompleted}
                  >
                    Cancel Booking
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="edit" className="py-4">
          <BookingEditForm 
            booking={booking} 
            onSubmit={onEdit} 
            onCancel={() => handleTabChange('details')}
            isSubmitting={isSubmitting}
          />
        </TabsContent>

        <TabsContent value="driver" className="py-4">
          <DriverAssignment 
            booking={booking}
            onAssignDriver={onAssignDriver}
            onCancel={() => handleTabChange('details')}
            isSubmitting={isSubmitting}
          />
        </TabsContent>

        <TabsContent value="invoice" className="py-4">
          <BookingInvoice 
            booking={booking}
            onGenerateInvoice={onGenerateInvoice}
            onClose={() => handleTabChange('details')}
            isSubmitting={isSubmitting}
            pdfUrl={pdfUrl}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
