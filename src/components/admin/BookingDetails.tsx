
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Calendar, User, Phone, Mail, Car, IndianRupee } from 'lucide-react';
import { Booking, BookingStatus } from '@/types/api';
import { BookingEditForm } from './BookingEditForm';
import { DriverAssignment } from './DriverAssignment';
import { BookingInvoice } from './BookingInvoice';
import { BookingStatusFlow } from './BookingStatusFlow';
import { formatBookingDate, getStatusColor } from '@/utils/bookingUtils';
import { toast } from 'sonner';

interface BookingDetailsProps {
  booking: Booking;
  onClose: () => void;
  onEdit: (updatedData: Partial<Booking>) => Promise<void>;
  onAssignDriver: (driverData: { driverName: string; driverPhone: string; vehicleNumber: string }) => Promise<void>;
  onCancel: () => Promise<void>;
  onGenerateInvoice: () => Promise<void>;
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
  const [activeTab, setActiveTab] = useState<string>('details');

  // Force the correct initial tab - this is important for visibility
  useEffect(() => {
    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      const activePanel = document.querySelector('[role="tabpanel"][data-state="active"]');
      if (activePanel) {
        activePanel.setAttribute('style', 'display: block !important');
      }
    }, 50);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Ensure tab content is visible after tab change
  useEffect(() => {
    // Hide all panels first
    document.querySelectorAll('[role="tabpanel"]').forEach(panel => {
      panel.setAttribute('style', 'display: none !important');
    });
    
    // Show only the active panel
    const activePanel = document.querySelector(`[role="tabpanel"][data-value="${activeTab}"]`);
    if (activePanel) {
      activePanel.setAttribute('style', 'display: block !important');
    }
  }, [activeTab]);

  // Handle button clicks to change tabs
  const handleEditClick = () => {
    setActiveTab('edit');
    console.log("Edit tab clicked, setting active tab to:", 'edit');
  };
  
  const handleDriverClick = () => {
    setActiveTab('driver');
    console.log("Driver tab clicked, setting active tab to:", 'driver');
  };
  
  const handleStatusClick = () => {
    setActiveTab('status');
    console.log("Status tab clicked, setting active tab to:", 'status');
  };
  
  const handleInvoiceClick = () => {
    setActiveTab('invoice');
    console.log("Invoice tab clicked, setting active tab to:", 'invoice');
  };
  
  const handleBackToDetails = () => {
    setActiveTab('details');
    console.log("Back to details clicked, setting active tab to:", 'details');
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white">
        <CardHeader className="sticky top-0 bg-white z-10 border-b">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Booking #{booking.bookingNumber}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Created on {new Date(booking.createdAt).toLocaleDateString()}
              </p>
            </div>
            <Badge className={getStatusColor(booking.status)}>{booking.status}</Badge>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4 booking-details-tabs">
            <TabsList>
              <TabsTrigger value="details" id="details-tab">Details</TabsTrigger>
              <TabsTrigger value="edit" id="edit-tab">Edit</TabsTrigger>
              <TabsTrigger value="driver" id="driver-tab">Driver</TabsTrigger>
              <TabsTrigger value="status" id="status-tab">Status Flow</TabsTrigger>
              <TabsTrigger value="invoice" id="invoice-tab">Invoice</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        
        <CardContent className="pt-6">
          <TabsContent value="details" style={{display: activeTab === 'details' ? 'block' : 'none'}}>
            <div className="space-y-6">
              {/* Customer Information */}
              <section className="space-y-2">
                <h3 className="font-semibold">Customer Information</h3>
                <div className="grid gap-2">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <span>{booking.passengerName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-500" />
                    <span>{booking.passengerPhone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <span>{booking.passengerEmail}</span>
                  </div>
                </div>
              </section>

              {/* Trip Details */}
              <section className="space-y-2">
                <h3 className="font-semibold">Trip Details</h3>
                <div className="grid gap-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <div>
                      <p className="font-medium">Pickup Location</p>
                      <p className="text-sm text-gray-600">{booking.pickupLocation}</p>
                    </div>
                  </div>
                  {booking.dropLocation && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <div>
                        <p className="font-medium">Drop Location</p>
                        <p className="text-sm text-gray-600">{booking.dropLocation}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <div>
                      <p className="font-medium">Pickup Date & Time</p>
                      <p className="text-sm text-gray-600">
                        {formatBookingDate(booking.pickupDate)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Car className="w-4 h-4 text-gray-500" />
                    <div>
                      <p className="font-medium">Vehicle Type</p>
                      <p className="text-sm text-gray-600">{booking.cabType}</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Payment Details */}
              <section className="space-y-2">
                <h3 className="font-semibold">Payment Details</h3>
                <div className="grid gap-2">
                  <div className="flex items-center gap-2">
                    <IndianRupee className="w-4 h-4 text-gray-500" />
                    <div>
                      <p className="font-medium">Total Amount</p>
                      <p className="text-sm text-gray-600">₹{booking.totalAmount?.toLocaleString('en-IN') || '0'}</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Driver Information */}
              {(booking.driverName || booking.driverPhone || booking.vehicleNumber) && (
                <section className="space-y-2">
                  <h3 className="font-semibold">Driver Information</h3>
                  <div className="grid gap-2">
                    {booking.driverName && (
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-500" />
                        <div>
                          <p className="font-medium">Driver Name</p>
                          <p className="text-sm text-gray-600">{booking.driverName}</p>
                        </div>
                      </div>
                    )}
                    {booking.driverPhone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-500" />
                        <div>
                          <p className="font-medium">Driver Phone</p>
                          <p className="text-sm text-gray-600">{booking.driverPhone}</p>
                        </div>
                      </div>
                    )}
                    {booking.vehicleNumber && (
                      <div className="flex items-center gap-2">
                        <Car className="w-4 h-4 text-gray-500" />
                        <div>
                          <p className="font-medium">Vehicle Number</p>
                          <p className="text-sm text-gray-600">{booking.vehicleNumber}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 pt-4 border-t">
                <Button 
                  onClick={handleEditClick} 
                  disabled={!(['pending', 'confirmed'].includes(booking.status)) || isSubmitting}
                >
                  Edit Booking
                </Button>
                <Button 
                  onClick={handleDriverClick}
                  variant="outline" 
                  disabled={booking.status === 'cancelled' || isSubmitting}
                >
                  {booking.driverName ? 'Change Driver' : 'Assign Driver'}
                </Button>
                {['pending', 'confirmed'].includes(booking.status) && (
                  <Button 
                    onClick={onCancel} 
                    variant="destructive"
                    disabled={isSubmitting}
                  >
                    Cancel Booking
                  </Button>
                )}
                <Button 
                  onClick={handleInvoiceClick}
                  variant="outline"
                  disabled={isSubmitting}
                >
                  Generate Invoice
                </Button>
                <Button 
                  onClick={onClose} 
                  variant="outline"
                  disabled={isSubmitting}
                >
                  Close
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="edit" style={{display: activeTab === 'edit' ? 'block' : 'none'}}>
            <BookingEditForm 
              booking={booking}
              onSave={onEdit}
              onCancel={handleBackToDetails}
              isSubmitting={isSubmitting}
            />
          </TabsContent>
          
          <TabsContent value="driver" style={{display: activeTab === 'driver' ? 'block' : 'none'}}>
            <DriverAssignment 
              booking={booking}
              onAssign={onAssignDriver}
              onClose={handleBackToDetails}
              isSubmitting={isSubmitting}
            />
          </TabsContent>
          
          <TabsContent value="status" style={{display: activeTab === 'status' ? 'block' : 'none'}}>
            <BookingStatusFlow 
              currentStatus={booking.status}
              onStatusChange={onStatusChange}
              isAdmin={true}
              isUpdating={isSubmitting}
            />
            <div className="flex justify-end mt-6">
              <Button 
                variant="outline" 
                onClick={handleBackToDetails}
                disabled={isSubmitting}
              >
                Back to Details
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="invoice" style={{display: activeTab === 'invoice' ? 'block' : 'none'}}>
            <BookingInvoice 
              booking={booking}
              onClose={handleBackToDetails}
              onGenerate={onGenerateInvoice}
              isGenerating={isSubmitting}
            />
          </TabsContent>
        </CardContent>
      </Card>
    </div>
  );
}
