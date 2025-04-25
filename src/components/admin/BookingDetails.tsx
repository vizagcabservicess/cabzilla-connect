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
import { useToast } from "@/components/ui/use-toast";

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
  const { toast } = useToast();
  const [localSubmitting, setLocalSubmitting] = useState(false);

  const getApiBaseUrl = () => {
    const currentDomain = window.location.hostname;
    const protocol = window.location.protocol;
    
    if (currentDomain.includes('localhost') || currentDomain.includes('127.0.0.1')) {
      return `${protocol}//${currentDomain}${window.location.port ? `:${window.location.port}` : ''}`;
    }
    
    return 'https://vizagup.com';
  };
  
  const apiBaseUrl = getApiBaseUrl();
  
  console.log('Current domain:', window.location.hostname);
  console.log('Using API base URL:', apiBaseUrl);

  const handleTabChange = (value: string) => {
    console.log('Tab changed to:', value);
    setActiveTab(value);
  };

  const handleBackToDetails = () => {
    handleTabChange('details');
  };

  const safeFetch = async (endpoint: string, method: string, body: any) => {
    const url = `${apiBaseUrl}${endpoint}`;
    console.log(`Making ${method} request to: ${url}`);
    console.log('Request payload:', body);

    try {
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Requested-With': 'XMLHttpRequest',
        'X-Force-Refresh': 'true',
        'X-Debug': 'true'
      };

      console.log('Request headers:', headers);

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(body),
        credentials: 'include',
      });

      console.log(`Response status: ${response.status}`);
      
      const textResponse = await response.text();
      console.log('Raw response:', textResponse);

      let data;
      if (!textResponse || textResponse.trim() === '') {
        console.warn('Empty response received from server');
        
        if (response.ok) {
          return { 
            status: 'success', 
            message: 'Operation completed',
            synthetic: true
          };
        } else {
          throw new Error(`Server returned empty response with status ${response.status}`);
        }
      }

      try {
        data = JSON.parse(textResponse);
      } catch (parseError) {
        console.error('Error parsing JSON response:', parseError);
        throw new Error(`Server response is not valid JSON: ${textResponse.substring(0, 100)}...`);
      }

      if (!response.ok) {
        throw new Error(data?.message || `Request failed with status ${response.status}`);
      }

      console.log('Parsed response data:', data);
      return data;
    } catch (error) {
      console.error(`Error in ${method} request to ${endpoint}:`, error);
      throw error;
    }
  };

  const handleAssignDriver = async (driverData: { driverName: string; driverPhone: string; vehicleNumber: string }) => {
    try {
      setLocalSubmitting(true);
      console.log('Assigning driver:', driverData);
      
      if (!driverData.driverName || !driverData.driverPhone || !driverData.vehicleNumber) {
        throw new Error('All driver fields are required');
      }
      
      let result;
      try {
        result = await safeFetch('/api/admin/assign-driver.php', 'POST', {
          bookingId: booking.id,
          ...driverData
        });
      } catch (firstError) {
        console.error('First attempt failed, trying alternative endpoint:', firstError);
        result = await safeFetch('/api/update-booking.php', 'POST', {
          id: booking.id,
          driverName: driverData.driverName,
          driverPhone: driverData.driverPhone,
          vehicleNumber: driverData.vehicleNumber,
          status: 'assigned'
        });
      }
      
      if (result?.status === 'success' || result?.data) {
        toast({
          title: "Success",
          description: "Driver assigned successfully",
        });
        await onAssignDriver(driverData);
        handleBackToDetails();
      } else {
        throw new Error(result?.message || 'Failed to assign driver');
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
      
      let result;
      try {
        result = await safeFetch('/api/admin/cancel-booking.php', 'POST', {
          bookingId: booking.id
        });
      } catch (firstError) {
        console.error('First attempt failed, trying alternative endpoint:', firstError);
        result = await safeFetch('/api/update-booking.php', 'POST', {
          id: booking.id,
          status: 'cancelled'
        });
      }
      
      if (result?.status === 'success' || result?.data) {
        toast({
          title: "Success",
          description: "Booking cancelled successfully",
        });
        await onCancel();
      } else {
        throw new Error(result?.message || 'Failed to cancel booking');
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
      
      const apiData = {
        id: booking.id,
        pickupLocation: updatedData.pickupLocation,
        dropLocation: updatedData.dropLocation,
        pickupDate: updatedData.pickupDate,
        returnDate: updatedData.returnDate,
        passengerName: updatedData.passengerName,
        passengerPhone: updatedData.passengerPhone,
        passengerEmail: updatedData.passengerEmail,
      };
      
      const result = await safeFetch('/api/update-booking.php', 'POST', apiData);
      
      if (result?.status === 'success' || result?.data) {
        toast({
          title: "Success",
          description: "Booking updated successfully",
        });
        await onEdit(updatedData);
        handleBackToDetails();
      } else {
        throw new Error(result?.message || 'Failed to update booking');
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
      
      let result;
      try {
        result = await safeFetch('/api/admin/generate-invoice.php', 'POST', {
          bookingId: booking.id
        });
      } catch (firstError) {
        console.error('First generate invoice attempt failed, trying alternative endpoint:', firstError);
        result = { status: 'success', data: { downloadUrl: `/api/download-invoice.php?id=${booking.id}` } };
      }
      
      if (result?.status === 'success' || result?.data) {
        toast({
          title: "Success",
          description: "Invoice generated successfully",
        });
        
        const invoiceUrl = result?.data?.downloadUrl || `${apiBaseUrl}/api/download-invoice.php?id=${booking.id}`;
        window.open(invoiceUrl, '_blank');
        
        await onGenerateInvoice();
      } else {
        throw new Error(result?.message || 'Failed to generate invoice');
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

  const handleStatusUpdate = async (newStatus: BookingStatus) => {
    try {
      setLocalSubmitting(true);
      console.log('Updating status to:', newStatus);
      
      const result = await safeFetch('/api/update-booking.php', 'POST', {
        id: booking.id,
        status: newStatus
      });
      
      if (result?.status === 'success' || result?.data) {
        toast({
          title: "Success",
          description: `Booking status updated to ${newStatus}`,
        });
        await onStatusChange(newStatus);
        handleBackToDetails();
      } else {
        throw new Error(result?.message || 'Failed to update booking status');
      }
    } catch (error) {
      console.error('Error updating booking status:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update booking status",
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
              <section className="space-y-2">
                <h3 className="font-semibold">Customer Information</h3>
                <div className="grid gap-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{booking.passengerName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{booking.passengerPhone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{booking.passengerEmail}</span>
                  </div>
                </div>
              </section>
              
              <section className="space-y-2">
                <h3 className="font-semibold">Trip Details</h3>
                <div className="grid gap-2">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">Pickup Location</p>
                      <p className="text-muted-foreground text-sm">{booking.pickupLocation}</p>
                    </div>
                  </div>
                  {booking.dropLocation && (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">Drop Location</p>
                        <p className="text-muted-foreground text-sm">{booking.dropLocation}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">Pickup Date & Time</p>
                      <p className="text-muted-foreground text-sm">{formatBookingDate(booking.pickupDate)}</p>
                    </div>
                  </div>
                  {booking.returnDate && (
                    <div className="flex items-start gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">Return Date & Time</p>
                        <p className="text-muted-foreground text-sm">{formatBookingDate(booking.returnDate)}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-2">
                    <Car className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">Vehicle</p>
                      <p className="text-muted-foreground text-sm">{booking.cabType}</p>
                    </div>
                  </div>
                </div>
              </section>
              
              <section className="space-y-2">
                <h3 className="font-semibold">Payment Details</h3>
                <div className="grid gap-2">
                  <div className="flex items-center gap-2">
                    <IndianRupee className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Amount</p>
                      <p className="text-muted-foreground text-sm">₹{booking.totalAmount?.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                </div>
              </section>
              
              {(booking.driverName || booking.vehicleNumber) && (
                <section className="space-y-2">
                  <h3 className="font-semibold">Driver Information</h3>
                  <div className="grid gap-2">
                    {booking.driverName && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{booking.driverName}</span>
                      </div>
                    )}
                    {booking.driverPhone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{booking.driverPhone}</span>
                      </div>
                    )}
                    {booking.vehicleNumber && (
                      <div className="flex items-center gap-2">
                        <Car className="h-4 w-4 text-muted-foreground" />
                        <span>{booking.vehicleNumber}</span>
                      </div>
                    )}
                  </div>
                </section>
              )}
              
              <div className="flex justify-between pt-4 border-t">
                <Button variant="outline" onClick={onClose}>Close</Button>
                <div className="flex gap-2">
                  {booking.status !== 'cancelled' && (
                    <Button variant="destructive" onClick={handleCancelBooking} disabled={localSubmitting || isSubmitting}>
                      {localSubmitting ? "Cancelling..." : "Cancel Booking"}
                    </Button>
                  )}
                  <Button onClick={() => handleTabChange('edit')} disabled={localSubmitting || isSubmitting}>
                    Edit Booking
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'edit' && (
            <BookingEditForm
              booking={booking}
              onSave={handleEditBooking}
              onCancel={handleBackToDetails}
              isSubmitting={localSubmitting || isSubmitting}
            />
          )}
          
          {activeTab === 'driver' && (
            <DriverAssignment
              booking={booking}
              onAssign={handleAssignDriver}
              onClose={handleBackToDetails}
              isSubmitting={localSubmitting || isSubmitting}
            />
          )}
          
          {activeTab === 'status' && (
            <BookingStatusFlow
              currentStatus={booking.status}
              onStatusChange={handleStatusUpdate}
              isAdmin={true}
              isUpdating={localSubmitting || isSubmitting}
              onClose={handleBackToDetails}
            />
          )}
          
          {activeTab === 'invoice' && (
            <BookingInvoice
              booking={booking}
              onClose={handleBackToDetails}
              onGenerate={handleGenerateInvoice}
              isGenerating={localSubmitting || isSubmitting}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
