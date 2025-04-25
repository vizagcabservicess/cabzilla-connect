
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
import { formatBookingDate, getStatusColor, ensureTabVisibility } from '@/utils/bookingUtils';

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
  const [activeTab, setActiveTab] = useState('details');

  const handleTabChange = (value: string) => {
    console.log('Tab changed to:', value);
    setActiveTab(value);
  };

  const handleBackToDetails = () => {
    handleTabChange('details');
  };

  // Make sure tab visibility is enforced after the component updates
  useEffect(() => {
    // Force visibility of active tab using a slight delay to ensure DOM is updated
    const timer = setTimeout(() => {
      document.querySelectorAll('[role="tabpanel"]').forEach(panel => {
        if (panel.getAttribute('data-value') === activeTab || 
            panel.getAttribute('value') === activeTab) {
          panel.setAttribute('data-state', 'active');
        } else {
          panel.setAttribute('data-state', 'inactive');
        }
      });
    }, 50);
    
    return () => clearTimeout(timer);
  }, [activeTab]);

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
          
          <Tabs 
            value={activeTab} 
            onValueChange={handleTabChange} 
            className="booking-details-tabs"
            defaultValue="details"
          >
            <TabsList>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="edit">Edit</TabsTrigger>
              <TabsTrigger value="driver">Driver</TabsTrigger>
              <TabsTrigger value="status">Status Flow</TabsTrigger>
              <TabsTrigger value="invoice">Invoice</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>

        <CardContent className="pt-6">
          <TabsContent value="details" data-state={activeTab === 'details' ? 'active' : 'inactive'}>
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
                  onClick={() => handleTabChange('edit')} 
                  disabled={!(['pending', 'confirmed'].includes(booking.status)) || isSubmitting}
                >
                  Edit Booking
                </Button>
                <Button 
                  onClick={() => handleTabChange('driver')}
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
                  onClick={() => handleTabChange('invoice')}
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

          <TabsContent value="edit" data-state={activeTab === 'edit' ? 'active' : 'inactive'}>
            <BookingEditForm 
              booking={booking}
              onSave={onEdit}
              onCancel={handleBackToDetails}
              isSubmitting={isSubmitting}
            />
          </TabsContent>
          
          <TabsContent value="driver" data-state={activeTab === 'driver' ? 'active' : 'inactive'}>
            <DriverAssignment 
              booking={booking}
              onAssign={onAssignDriver}
              onClose={handleBackToDetails}
              isSubmitting={isSubmitting}
            />
          </TabsContent>
          
          <TabsContent value="status" data-state={activeTab === 'status' ? 'active' : 'inactive'}>
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
          
          <TabsContent value="invoice" data-state={activeTab === 'invoice' ? 'active' : 'inactive'}>
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
