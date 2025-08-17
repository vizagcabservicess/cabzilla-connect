import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookingEditForm } from './BookingEditForm';
import { DriverAssignment } from './DriverAssignment';
import { FleetVehicleAssignment } from './FleetVehicleAssignment';
import { BookingInvoice } from './BookingInvoice';
import { BookingDetailsWhatsApp } from './BookingDetailsWhatsApp';
import { BookingAdvancedSettings } from './BookingAdvancedSettings';
import { Booking, BookingStatus } from '@/types/api';
import { BookingStatusFlow } from './BookingStatusFlow';
import { formatPrice } from '@/lib/utils';
import { convertUTCToLocal } from '@/lib/dateUtils';

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
  
  // Lift invoice state up to persist across tab changes and browser sessions
  const getStoredInvoiceState = () => {
    try {
      const stored = localStorage.getItem(`invoice-settings-${booking.id}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        // If stored is effectively empty/false, but booking has GST info from guest submission, merge it in
        const storedEmpty = !parsed?.gstEnabled && (!parsed?.gstDetails || (!parsed.gstDetails.gstNumber && !parsed.gstDetails.companyName && !parsed.gstDetails.companyAddress));
        const bookingHasGst = (booking as any).gstEnabled || ((booking as any).gstDetails && ((booking as any).gstDetails.gstNumber || (booking as any).gstDetails.companyName || (booking as any).gstDetails.companyAddress));
        if (storedEmpty && bookingHasGst) {
          return {
            ...parsed,
            gstEnabled: Boolean((booking as any).gstEnabled),
            gstDetails: {
              gstNumber: (booking as any).gstDetails?.gstNumber || '',
              companyName: (booking as any).gstDetails?.companyName || '',
              companyAddress: (booking as any).gstDetails?.companyAddress || ''
            }
          };
        }
        return parsed;
      }
    } catch (error) {
      console.error('Error loading stored invoice settings:', error);
    }
    // Default initial state; prefill from booking if available
    return {
      gstEnabled: Boolean((booking as any).gstEnabled) || false,
      isIGST: false,
      includeTax: true,
      customInvoiceNumber: '',
      gstDetails: {
        gstNumber: (booking as any).gstDetails?.gstNumber || '',
        companyName: (booking as any).gstDetails?.companyName || '',
        companyAddress: (booking as any).gstDetails?.companyAddress || ''
      }
    };
  };

  const [invoiceState, setInvoiceState] = useState(getStoredInvoiceState);

  // Save invoice state to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(`invoice-settings-${booking.id}`, JSON.stringify(invoiceState));
    } catch (error) {
      console.error('Error saving invoice settings:', error);
    }
  }, [invoiceState, booking.id]);

  useEffect(() => {
    console.log('BookingDetails booking.updatedAt:', booking.updatedAt, 'extraCharges:', booking.extraCharges);
  }, [booking]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };
  
  // Handle vehicle assignment (will update booking.vehicleNumber and vehicleId)
  const handleAssignVehicle = async (vehicleData: { vehicleNumber: string; vehicleId: string }) => {
    await onEdit({ 
      vehicleNumber: vehicleData.vehicleNumber,
      vehicleId: vehicleData.vehicleId,
      status: 'confirmed' as BookingStatus 
    });
  };

  const isCompleted = booking.status === 'completed';
  const isCancelled = booking.status === 'cancelled';

  // Determine which tabs should be enabled based on booking status
  const isEditDisabled = isCancelled;
  const isAssignmentDisabled = isCancelled || isCompleted;
  const isInvoiceDisabled = isCancelled;
  const isWhatsAppDisabled = false; // WhatsApp messaging is always enabled

  // Construct the PDF URL for the invoice download
  const pdfUrl = `/api/admin/download-invoice.php?id=${booking.id}`;

  return (
    <div>
      <div className="mb-4">
        <div className="flex justify-between items-start mb-1">
          <div>
            <h2 className="text-lg font-bold">Booking #{booking.bookingNumber}</h2>
            <p className="text-sm text-gray-500">
              {convertUTCToLocal(booking.pickupDate).toLocaleDateString()} · {booking.tripType} · {booking.cabType}
            </p>
          </div>
          <div className="text-right">
            <p className="font-semibold text-base">{formatPrice(booking.totalAmount)}</p>
            <div className="inline-block px-1.5 py-0.5 text-xs font-medium rounded-md bg-gray-100 text-gray-800 mt-1">
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
          <TabsTrigger value="advanced" disabled={isEditDisabled}>Advanced Settings</TabsTrigger>
          <TabsTrigger value="vehicle" disabled={isAssignmentDisabled}>Assign Fleet Vehicle</TabsTrigger>
          <TabsTrigger value="driver" disabled={isAssignmentDisabled}>Assign Driver</TabsTrigger>
          <TabsTrigger value="invoice" disabled={isInvoiceDisabled}>Invoice</TabsTrigger>
          <TabsTrigger value="whatsapp" disabled={isWhatsAppDisabled}>WhatsApp</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="py-2">
          <Card className="p-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium mb-1 text-gray-700">Customer Details</h3>
                <p className="text-sm mb-1"><span className="font-medium">Name:</span> {booking.passengerName}</p>
                <p className="text-sm mb-1"><span className="font-medium">Phone:</span> {booking.passengerPhone}</p>
                <p className="text-sm mb-1"><span className="font-medium">Email:</span> {booking.passengerEmail}</p>
                {booking.billingAddress && (
                  <p className="text-sm mb-1"><span className="font-medium">Billing Address:</span> {booking.billingAddress}</p>
                )}
              </div>

              <div>
                <h3 className="text-sm font-medium mb-1 text-gray-700">Trip Details</h3>
                <p className="text-sm mb-1"><span className="font-medium">Trip Type:</span> {booking.tripType} {booking.tripMode && `(${booking.tripMode})`}</p>
                <p className="text-sm mb-1"><span className="font-medium">Pickup:</span> {booking.pickupLocation}</p>
                {booking.dropLocation && <p className="text-sm mb-1"><span className="font-medium">Drop:</span> {booking.dropLocation}</p>}
                <p className="text-sm mb-1"><span className="font-medium">Pickup Date:</span> {convertUTCToLocal(booking.pickupDate).toLocaleString()}</p>
                <p className="text-sm mb-1"><span className="font-medium">Vehicle:</span> {booking.cabType}</p>
              </div>
            </div>

            {(booking.driverName || booking.driverPhone || booking.vehicleNumber) && (
              <div className="mt-3 border-t pt-3">
                <h3 className="text-sm font-medium mb-1 text-gray-700">Driver Details</h3>
                {booking.driverName && <p className="text-sm mb-1"><span className="font-medium">Name:</span> {booking.driverName}</p>}
                {booking.driverPhone && <p className="text-sm mb-1"><span className="font-medium">Phone:</span> {booking.driverPhone}</p>}
                {booking.vehicleNumber && <p className="text-sm mb-1"><span className="font-medium">Vehicle Number:</span> {booking.vehicleNumber}</p>}
              </div>
            )}

            {booking.extraCharges && booking.extraCharges.length > 0 && (
              <div className="mt-3 border-t pt-3">
                <h3 className="text-sm font-semibold mb-1 text-gray-700">Extra Charges</h3>
                {booking.extraCharges.map((charge, index) => (
                  <div key={index} className="flex justify-between items-center py-0.5">
                    <span className="text-sm">{charge.description || 'Additional charge'}</span>
                    <span className="text-sm">{formatPrice(charge.amount)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-3 flex justify-between items-center border-t pt-3">
              <div>
                <p className="text-xs text-gray-500">Total Amount</p>
                <p className="font-bold text-lg">{formatPrice(booking.totalAmount)}</p>
              </div>

              <div className="space-x-2">
                {!isCancelled && (
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={onCancel}
                    disabled={isSubmitting || isCompleted}
                  >
                    Cancel Booking
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Close
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="edit" className="py-2">
          <BookingEditForm
            key={booking.updatedAt || booking.id}
            booking={booking}
            onSubmit={async (updatedData) => {
              await onEdit(updatedData);
              setActiveTab('details');
            }}
            onCancel={() => handleTabChange('details')}
            isSubmitting={isSubmitting}
          />
        </TabsContent>

        <TabsContent value="advanced" className="py-2">
          <BookingAdvancedSettings
            booking={booking}
            onSave={async (updatedData) => {
              await onEdit(updatedData);
              setActiveTab('details');
            }}
            onCancel={() => handleTabChange('details')}
            isSubmitting={isSubmitting}
          />
        </TabsContent>

        <TabsContent value="vehicle" className="py-2">
          <FleetVehicleAssignment
            booking={booking}
            onAssign={handleAssignVehicle}
            isSubmitting={isSubmitting}
          />
        </TabsContent>

        <TabsContent value="driver" className="py-2">
          <DriverAssignment 
            booking={booking}
            onAssign={onAssignDriver}
            onCancel={() => handleTabChange('details')}
            onClose={() => handleTabChange('details')}
            isSubmitting={isSubmitting}
          />
        </TabsContent>

        <TabsContent value="invoice" className="py-2">
          <BookingInvoice 
            booking={booking}
            onGenerateInvoice={onGenerateInvoice}
            onClose={() => handleTabChange('details')}
            isSubmitting={isSubmitting}
            pdfUrl={pdfUrl}
            invoiceState={invoiceState}
            onInvoiceStateChange={setInvoiceState}
          />
        </TabsContent>

        <TabsContent value="whatsapp" className="py-2">
          <BookingDetailsWhatsApp 
            booking={booking}
            onClose={() => handleTabChange('details')}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
