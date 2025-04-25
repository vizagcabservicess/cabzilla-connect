
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Calendar, User, Phone, Mail, Car, IndianRupee, AlertCircle } from 'lucide-react';
import { Booking, BookingStatus } from '@/types/api';
import { BookingEditForm } from './BookingEditForm';
import { DriverAssignment } from './DriverAssignment';
import { BookingInvoice } from './BookingInvoice';
import { BookingStatusFlow } from './BookingStatusFlow';
import { formatBookingDate, getStatusColor } from '@/utils/bookingUtils';
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
  const [apiError, setApiError] = useState<string | null>(null);

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
    // Clear any previous API errors when changing tabs
    setApiError(null);
  };

  const handleBackToDetails = () => {
    handleTabChange('details');
  };

  const safeFetch = async (endpoint: string, method: string, body: any) => {
    setApiError(null);
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
      setApiError(error instanceof Error ? error.message : 'Unknown error occurred');
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
      
      // Try multiple endpoints to find one that works
      let result;
      try {
        // First try the dedicated endpoint
        result = await safeFetch('/api/admin/assign-driver.php', 'POST', {
          bookingId: booking.id,
          ...driverData
        });
      } catch (firstError) {
        console.error('First attempt failed, trying alternative endpoint:', firstError);
        
        try {
          // Try the update-booking endpoint as fallback
          result = await safeFetch('/api/admin/update-booking.php', 'POST', {
            bookingId: booking.id,
            driverName: driverData.driverName,
            driverPhone: driverData.driverPhone,
            vehicleNumber: driverData.vehicleNumber,
            status: 'assigned'
          });
        } catch (secondError) {
          console.error('Second attempt failed, trying direct request:', secondError);
          
          // Try a direct URL as a last resort
          result = await safeFetch(`https://vizagup.com/api/admin/assign-driver.php`, 'POST', {
            bookingId: booking.id,
            ...driverData
          });
        }
      }

      if (result.status === 'success') {
        toast({
          title: "Driver Assigned",
          description: "Driver has been successfully assigned to this booking",
        });
        
        // Call the parent handler to update the booking in the UI
        await onAssignDriver(driverData);
        handleBackToDetails();
      }
    } catch (error) {
      console.error('Driver assignment failed:', error);
      toast({
        title: "Assignment Failed",
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
      
      // Try multiple endpoints to find one that works
      let result;
      try {
        // First try the dedicated endpoint
        result = await safeFetch('/api/admin/cancel-booking.php', 'POST', {
          bookingId: booking.id
        });
      } catch (firstError) {
        console.error('First cancel attempt failed, trying alternative endpoint:', firstError);
        
        try {
          // Try the update-booking endpoint as fallback
          result = await safeFetch('/api/admin/update-booking.php', 'POST', {
            bookingId: booking.id,
            status: 'cancelled'
          });
        } catch (secondError) {
          console.error('Second cancel attempt failed, trying booking status change:', secondError);
          
          // Try direct status change as last resort
          result = await safeFetch('/api/admin/booking.php?id=' + booking.id, 'POST', {
            status: 'cancelled'
          });
        }
      }

      if (result.status === 'success') {
        toast({
          title: "Booking Cancelled",
          description: "The booking has been successfully cancelled",
        });
        
        // Call the parent handler to update the booking in the UI
        await onCancel();
        handleBackToDetails();
      }
    } catch (error) {
      console.error('Cancellation failed:', error);
      toast({
        title: "Cancellation Failed",
        description: error instanceof Error ? error.message : "Failed to cancel booking",
        variant: "destructive",
      });
    } finally {
      setLocalSubmitting(false);
    }
  };

  const handleGenerateInvoice = async () => {
    try {
      setLocalSubmitting(true);
      
      // Try multiple endpoints to find one that works
      let result;
      try {
        // First try the dedicated endpoint
        console.log('Attempting to generate invoice for booking:', booking.id);
        result = await safeFetch('/api/admin/generate-invoice.php', 'POST', {
          bookingId: booking.id
        });
      } catch (firstError) {
        console.error('First generate invoice attempt failed, trying alternative endpoint:', firstError);
        
        try {
          // Try a direct URL as a fallback
          result = await safeFetch(`https://vizagup.com/api/admin/generate-invoice.php`, 'POST', {
            bookingId: booking.id
          });
        } catch (secondError) {
          console.error('Second generate invoice attempt failed, trying GET method:', secondError);
          
          // Try GET method as last resort
          result = await safeFetch(`/api/admin/generate-invoice.php?id=${booking.id}`, 'GET', null);
        }
      }

      if (result?.status === 'success') {
        toast({
          title: "Invoice Generated",
          description: "Invoice has been successfully generated",
        });
        
        // Call the parent handler to update the booking in the UI
        await onGenerateInvoice();
        // Stay on invoice tab to show the result
        if (activeTab !== 'invoice') {
          handleTabChange('invoice');
        }
      }
      
      return result;
    } catch (error) {
      console.error('Invoice generation failed:', error);
      toast({
        title: "Invoice Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate invoice",
        variant: "destructive",
      });
      return null;
    } finally {
      setLocalSubmitting(false);
    }
  };

  const handleStatusChange = async (newStatus: BookingStatus) => {
    try {
      setLocalSubmitting(true);
      await onStatusChange(newStatus);
      toast({
        title: "Status Updated",
        description: `Booking status changed to ${newStatus.toUpperCase()}`,
      });
    } catch (error) {
      console.error('Status update failed:', error);
      toast({
        title: "Status Update Failed",
        description: error instanceof Error ? error.message : "Failed to update status",
        variant: "destructive",
      });
    } finally {
      setLocalSubmitting(false);
    }
  };

  const formatTripType = (tripType?: string, tripMode?: string): string => {
    if (!tripType) return 'Standard';
    
    const type = tripType.charAt(0).toUpperCase() + tripType.slice(1);
    const mode = tripMode ? ` (${tripMode.replace('-', ' ')})` : '';
    
    return `${type}${mode}`;
  };
  
  const getInvoiceDownloadUrl = () => {
    return `${apiBaseUrl}/api/download-invoice.php?id=${booking.id}&format=pdf`;
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Badge variant={getStatusColor(booking.status as BookingStatus)}>
            {booking.status?.toUpperCase()}
          </Badge>
          <h2 className="text-xl font-bold">{booking.bookingNumber}</h2>
        </div>
        <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
      </div>

      {apiError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>API Error</AlertTitle>
          <AlertDescription>{apiError}</AlertDescription>
        </Alert>
      )}
      
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid grid-cols-4 mb-4">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="edit">Edit</TabsTrigger>
          <TabsTrigger value="driver">Driver</TabsTrigger>
          <TabsTrigger value="invoice">Invoice</TabsTrigger>
        </TabsList>
        
        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Booking Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Passenger Information</p>
                  <div className="flex items-start mt-1 space-x-2">
                    <User className="h-4 w-4 mt-0.5 text-gray-500" />
                    <div>
                      <p className="font-medium">{booking.passengerName}</p>
                      <div className="flex items-center mt-1">
                        <Phone className="h-4 w-4 mr-1 text-gray-500" />
                        <span className="text-sm">{booking.passengerPhone}</span>
                      </div>
                      <div className="flex items-center mt-1">
                        <Mail className="h-4 w-4 mr-1 text-gray-500" />
                        <span className="text-sm">{booking.passengerEmail}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <p className="text-sm font-medium text-gray-500">Trip Details</p>
                  <div className="grid grid-cols-1 gap-3 mt-1">
                    <div className="flex items-start space-x-2">
                      <MapPin className="h-4 w-4 mt-0.5 text-gray-500" />
                      <div>
                        <p className="font-medium">Pickup Location</p>
                        <p className="text-sm">{booking.pickupLocation}</p>
                      </div>
                    </div>
                    
                    {booking.dropLocation && (
                      <div className="flex items-start space-x-2">
                        <MapPin className="h-4 w-4 mt-0.5 text-gray-500" />
                        <div>
                          <p className="font-medium">Drop Location</p>
                          <p className="text-sm">{booking.dropLocation}</p>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-start space-x-2">
                      <Calendar className="h-4 w-4 mt-0.5 text-gray-500" />
                      <div>
                        <p className="font-medium">Pickup Date & Time</p>
                        <p className="text-sm">{formatBookingDate(booking.pickupDate)}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-2">
                      <Car className="h-4 w-4 mt-0.5 text-gray-500" />
                      <div>
                        <p className="font-medium">Vehicle & Type</p>
                        <p className="text-sm">{booking.cabType}</p>
                        <p className="text-xs text-gray-500">{formatTripType(booking.tripType, booking.tripMode)}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-2">
                      <IndianRupee className="h-4 w-4 mt-0.5 text-gray-500" />
                      <div>
                        <p className="font-medium">Amount</p>
                        <p className="text-sm">₹{booking.totalAmount?.toLocaleString('en-IN')}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {(booking.driverName || booking.driverPhone) && (
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium text-gray-500">Assigned Driver</p>
                    <div className="mt-1">
                      <p className="font-medium">{booking.driverName || 'Name not provided'}</p>
                      <p className="text-sm">{booking.driverPhone || 'Phone not provided'}</p>
                      <p className="text-sm">{booking.vehicleNumber || 'Vehicle number not provided'}</p>
                    </div>
                  </div>
                )}

              </div>
            </CardContent>
          </Card>
          
          <div className="flex flex-col space-y-3">
            <BookingStatusFlow 
              currentStatus={booking.status as BookingStatus} 
              onStatusChange={handleStatusChange}
              disabled={isSubmitting || localSubmitting}
            />

            {(booking.status !== 'cancelled' && booking.status !== 'completed') && (
              <Button 
                variant="destructive"
                onClick={handleCancelBooking}
                disabled={isSubmitting || localSubmitting}
              >
                Cancel Booking
              </Button>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="edit">
          <BookingEditForm 
            booking={booking}
            onSubmit={onEdit}
            onCancel={handleBackToDetails}
            isSubmitting={isSubmitting || localSubmitting}
          />
        </TabsContent>
        
        <TabsContent value="driver">
          <DriverAssignment 
            booking={booking}
            onSubmit={handleAssignDriver}
            onCancel={handleBackToDetails}
            isSubmitting={isSubmitting || localSubmitting}
          />
        </TabsContent>
        
        <TabsContent value="invoice">
          <BookingInvoice 
            booking={booking}
            onGenerateInvoice={handleGenerateInvoice}
            onClose={handleBackToDetails}
            isSubmitting={isSubmitting || localSubmitting}
            pdfUrl={getInvoiceDownloadUrl()}
          />
        </TabsContent>
      </Tabs>
    </>
  );
}
