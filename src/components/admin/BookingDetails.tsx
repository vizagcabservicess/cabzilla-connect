import React, { useState, useEffect, useCallback } from 'react';
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
import { formatBookingStatus, getStatusColorClass, getEffectiveBookingStatus } from '@/utils/bookingUtils';
import { mergeTripSummary, getDefaultTripSummary, getDefaultBillingAddress } from '@/utils/invoiceTripSummaryDefaults';
import { resolveBookingAdvanceAmount } from '@/utils/bookingPaymentFields';

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
            adminNotes: parsed?.adminNotes ?? '',
            gstEnabled: Boolean((booking as any).gstEnabled),
            gstDetails: {
              gstNumber: (booking as any).gstDetails?.gstNumber || '',
              companyName: (booking as any).gstDetails?.companyName || '',
              companyAddress: (booking as any).gstDetails?.companyAddress || ''
            },
            tripSummary: mergeTripSummary(parsed?.tripSummary, booking),
            billingAddress: parsed?.billingAddress ?? getDefaultBillingAddress(booking),
          };
        }
        return {
          adminNotes: parsed?.adminNotes ?? '',
          ...parsed,
          tripSummary: mergeTripSummary(parsed?.tripSummary, booking),
          billingAddress: parsed?.billingAddress ?? getDefaultBillingAddress(booking),
        };
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
      adminNotes: (booking as any).adminNotes || '',
      billingAddress: getDefaultBillingAddress(booking),
      tripSummary: getDefaultTripSummary(booking),
      gstDetails: {
        gstNumber: (booking as any).gstDetails?.gstNumber || '',
        companyName: (booking as any).gstDetails?.companyName || '',
        companyAddress: (booking as any).gstDetails?.companyAddress || ''
      }
    };
  };

  const [invoiceState, setInvoiceState] = useState(getStoredInvoiceState);

  // Persist immediately when state changes - avoids losing data if popup closes before effect runs
  // useCallback keeps reference stable to prevent BookingInvoice's fetchLatestInvoice from re-running on every render
  const onInvoiceStateChange = useCallback((newState: Parameters<typeof setInvoiceState>[0]) => {
    setInvoiceState(newState);
    try {
      localStorage.setItem(`invoice-settings-${booking.id}`, JSON.stringify(newState));
    } catch (error) {
      console.error('Error saving invoice settings:', error);
    }
  }, [booking.id]);

  // Reset invoice state when switching to a different booking
  useEffect(() => {
    setInvoiceState(getStoredInvoiceState());
  }, [booking.id]);

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
  const displayStatus = getEffectiveBookingStatus(booking);
  const advancePaid = resolveBookingAdvanceAmount(booking);

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
            <div
              className={`inline-block px-1.5 py-0.5 text-xs font-medium rounded-md mt-1 ${getStatusColorClass(displayStatus)}`}
            >
              {formatBookingStatus(displayStatus)}
            </div>
          </div>
        </div>

        <BookingStatusFlow 
          currentStatus={displayStatus} 
          onStatusChange={onStatusChange}
          isSubmitting={isSubmitting}
        />
      </div>

      <Tabs defaultValue="details" value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="w-full border-b justify-start">
          <TabsTrigger 
            value="details"
            onClick={(e) => e.stopPropagation()}
          >
            Details
          </TabsTrigger>
          <TabsTrigger 
            value="edit" 
            disabled={isEditDisabled}
            onClick={(e) => e.stopPropagation()}
          >
            Edit
          </TabsTrigger>
          <TabsTrigger 
            value="advanced" 
            disabled={isEditDisabled}
            onClick={(e) => e.stopPropagation()}
          >
            Advanced Settings
          </TabsTrigger>
          <TabsTrigger 
            value="vehicle" 
            disabled={isAssignmentDisabled}
            onClick={(e) => e.stopPropagation()}
          >
            Assign Fleet Vehicle
          </TabsTrigger>
          <TabsTrigger 
            value="driver" 
            disabled={isAssignmentDisabled}
            onClick={(e) => e.stopPropagation()}
          >
            Assign Driver
          </TabsTrigger>
          <TabsTrigger 
            value="invoice" 
            disabled={isInvoiceDisabled}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
          >
            Invoice
          </TabsTrigger>
          <TabsTrigger 
            value="whatsapp" 
            disabled={isWhatsAppDisabled}
            onClick={(e) => e.stopPropagation()}
          >
            WhatsApp
          </TabsTrigger>
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

            <div className="mt-3 border-t pt-3">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <p className="text-xs text-gray-500">Total Amount</p>
                  <p className="font-bold text-lg">{formatPrice(booking.totalAmount)}</p>
                </div>
                
                {/* Show partial payment information if available */}
                {advancePaid > 0 && (
                  <>
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-gray-500">Advance Paid</p>
                      <p className="font-medium text-green-600">{formatPrice(advancePaid)}</p>
                    </div>
                    <div className="flex justify-between items-center border-t pt-2">
                      <p className="text-xs text-gray-500">Remaining Amount</p>
                      <p className="font-bold text-lg">{formatPrice(booking.totalAmount - advancePaid)}</p>
                    </div>
                  </>
                )}
                
                {/* Show payment status */}
                <div className="flex justify-between items-center">
                  <p className="text-xs text-gray-500">Payment Status</p>
                  <div className="flex items-center space-x-2">
                    {(booking as any).payment_status === 'partial_payment' || advancePaid > 0 ? (
                      <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">
                        PARTIAL PAYMENT
                      </span>
                    ) : (booking as any).payment_status === 'paid' || (booking as any).isPaid ? (
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                        PAID
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded-full">
                        PENDING
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-3 flex justify-end items-center">

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
            onClose={() => {
              // Don't close the popup, just switch back to details tab
              // The popup should only close when user clicks the X button
              handleTabChange('details');
            }}
            isSubmitting={isSubmitting}
            pdfUrl={pdfUrl}
            invoiceState={invoiceState}
            onInvoiceStateChange={onInvoiceStateChange}
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
