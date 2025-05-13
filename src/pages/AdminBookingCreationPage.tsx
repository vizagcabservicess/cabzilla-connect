
import React, { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminBookingForm } from '@/components/admin/AdminBookingForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import { bookingAPI } from '@/services/api/bookingAPI';
import { BookingRequest } from '@/types/api';

const AdminBookingCreationPage = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleBookingSubmit = async (bookingData: BookingRequest & { discount?: number; discountType?: 'percentage' | 'fixed' }) => {
    try {
      setIsSubmitting(true);
      
      // Create a copy of the data to transform for the API
      const apiData = { ...bookingData, createdByAdmin: true };
      
      // If there's a discount, include it in the API request
      if (bookingData.discount && bookingData.discountType) {
        apiData.discount = bookingData.discount;
        apiData.discountType = bookingData.discountType;
        
        // Calculate final amount after discount
        if (bookingData.discountType === 'percentage') {
          const discountAmount = (bookingData.totalAmount * bookingData.discount) / 100;
          apiData.originalAmount = bookingData.totalAmount;
          apiData.totalAmount = bookingData.totalAmount - discountAmount;
        } else {
          apiData.originalAmount = bookingData.totalAmount;
          apiData.totalAmount = bookingData.totalAmount - bookingData.discount;
        }
      }
      
      const response = await bookingAPI.createBooking(apiData);
      
      toast({
        title: "Booking Created Successfully",
        description: `Booking #${response.data.bookingNumber} has been created`,
      });
      
      // Navigate to the booking confirmation page
      navigate(`/admin/booking/${response.data.id}/confirmation`, { 
        state: { bookingData: response.data }
      });
      
    } catch (error) {
      console.error("Error creating booking:", error);
      toast({
        title: "Error",
        description: "Failed to create booking. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-2xl font-bold mb-6">Create Customer Booking</h1>
        <Card>
          <CardHeader>
            <CardTitle>New Booking Details</CardTitle>
          </CardHeader>
          <CardContent>
            <AdminBookingForm 
              onSubmit={handleBookingSubmit} 
              isSubmitting={isSubmitting} 
            />
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminBookingCreationPage;
