import React, { useState } from 'react';
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
import { useToast } from "@/hooks/use-toast";

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

// Use a domain that is guaranteed to work (the current site's domain)
const SITE_DOMAIN = window.location.origin;
// For absolute URL formation
const API_BASE_URL = `${SITE_DOMAIN}/api/admin`;

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
  const { toast } = useToast();
  const [localSubmitting, setLocalSubmitting] = useState(false);

  const handleTabChange = (value: string) => {
    console.log('Tab changed to:', value);
    setActiveTab(value);
  };

  const handleBackToDetails = () => {
    handleTabChange('details');
  };

  // Helper function for making API requests with better error handling
  const safeFetch = async (url: string, method: string, body: any) => {
    console.log(`Making ${method} request to: ${url}`);
    console.log('Request payload:', body);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      console.log(`Response status: ${response.status}`);

      // Attempt to parse the response, but handle errors gracefully
      let data;
      const textResponse = await response.text();
      console.log('Raw response:', textResponse);

      try {
        data = JSON.parse(textResponse);
      } catch (parseError) {
        console.error('Error parsing JSON response:', parseError);
        throw new Error(`Server response is not valid JSON: ${textResponse.substring(0, 100)}...`);
      }

      if (!response.ok) {
        throw new Error(data.message || `Request failed with status ${response.status}`);
      }

      console.log('Parsed response data:', data);
      return data;
    } catch (error) {
      console.error(`Error in ${method} request to ${url}:`, error);
      throw error;
    }
  };

  const handleAssignDriver = async (driverData: { driverName: string; driverPhone: string; vehicleNumber: string }) => {
    try {
      setLocalSubmitting(true);
      console.log('Assigning driver:', driverData);
      
      const url = `${API_BASE_URL}/assign-driver`;
      
      const result = await safeFetch(url, 'POST', {
        bookingId: booking.id,
        ...driverData
      });
      
      if (result.status === 'success') {
        toast({
          title: "Success",
          description: "Driver assigned successfully",
        });
        await onAssignDriver(driverData);
        handleBackToDetails();
      } else {
        throw new Error(result.message || 'Failed to assign driver');
      }
    } catch (error) {
      console.error('Error assigning driver:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to assign driver",
        variant: "destructive",
      });
    } finally {
      setLocalSubmitting(false);
    }
  };

  const handleCancelBooking = async () => {
    try {
      setLocalSubmitting(true);
      console.log('Cancelling booking:', booking.id);
      
      const url = `${API_BASE_URL}/cancel-booking`;
      
      const result = await safeFetch(url, 'POST', {
        bookingId: booking.id
      });
      
      if (result.status === 'success') {
        toast({
          title: "Success",
          description: "Booking cancelled successfully",
        });
        await onCancel();
      } else {
        throw new Error(result.message || 'Failed to cancel booking');
      }
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to cancel booking",
        variant: "destructive",
      });
    } finally {
      setLocalSubmitting(false);
    }
  };

  const handleEditBooking = async (updatedData: Partial<Booking>) => {
    try {
      setLocalSubmitting(true);
      console.log('Updating booking:', { bookingId: booking.id, ...updatedData });
      
      const url = `${API_BASE_URL}/update-booking`;
      
      const result = await safeFetch(url, 'POST', {
        bookingId: booking.id,
        ...updatedData
      });
      
      if (result.status === 'success') {
        toast({
          title: "Success",
          description: "Booking updated successfully",
        });
        await onEdit(updatedData);
        handleBackToDetails();
      } else {
        throw new Error(result.message || 'Failed to update booking');
      }
    } catch (error) {
      console.error('Error updating booking:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update booking",
        variant: "destructive",
      });
    } finally {
      setLocalSubmitting(false);
    }
  };

  const handleGenerateInvoice = async () => {
    try {
      setLocalSubmitting(true);
      console.log('Generating invoice for booking:', booking.id);
      
      const url = `${API_BASE_URL}/generate-invoice`;
      
      const result = await safeFetch(url, 'POST', {
        bookingId: booking.id
      });
      
      if (result.status === 'success') {
        toast({
          title: "Success",
          description: "Invoice generated successfully",
        });
        
        // Open invoice in new tab with absolute URL
        const invoiceUrl = `${SITE_DOMAIN}/api/download-invoice?id=${booking.id}`;
        window.open(invoiceUrl, '_blank');
        
        await onGenerateInvoice();
      } else {
        throw new Error(result.message || 'Failed to generate invoice');
      }
    } catch (error) {
      console.error('Error generating invoice:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate invoice",
        variant: "destructive",
      });
    } finally {
      setLocalSubmitting(false);
    }
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
          
          <Tabs 
            value={activeTab} 
            onValueChange={handleTabChange} 
            className="booking-details-tabs mt-4"
          >
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="edit">Edit</TabsTrigger>
              <TabsTrigger value="driver">Driver</TabsTrigger>
              <TabsTrigger value="status">Status Flow</TabsTrigger>
              <TabsTrigger value="invoice">Invoice</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>

        <CardContent className="pt-6">
          {activeTab === 'details' && (
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
                    onClick={handleCancelBooking} 
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
          )}

          {activeTab === 'edit' && (
            <BookingEditForm 
              booking={booking}
              onSave={handleEditBooking}
              onCancel={handleBackToDetails}
              isSubmitting={localSubmitting}
            />
          )}
          
          {activeTab === 'driver' && (
            <DriverAssignment 
              booking={booking}
              onAssign={handleAssignDriver}
              onClose={handleBackToDetails}
              isSubmitting={localSubmitting}
            />
          )}
          
          {activeTab === 'status' && (
            <div>
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
            </div>
          )}
          
          {activeTab === 'invoice' && (
            <BookingInvoice 
              booking={booking}
              onClose={handleBackToDetails}
              onGenerate={handleGenerateInvoice}
              isGenerating={localSubmitting}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
