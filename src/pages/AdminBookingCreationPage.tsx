import React, { useState } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
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
      const apiData = { ...bookingData, createdByAdmin: true };
      if (bookingData.discount && bookingData.discountType) {
        apiData.discount = bookingData.discount;
        apiData.discountType = bookingData.discountType;
        if (bookingData.discountType === 'percentage') {
          const discountAmount = (bookingData.totalAmount * bookingData.discount) / 100;
          apiData.totalAmount = bookingData.totalAmount - discountAmount;
        } else {
          apiData.totalAmount = bookingData.totalAmount - bookingData.discount;
        }
      }
      const response = await bookingAPI.createBooking(apiData);
      toast({
        title: "Booking Created Successfully",
        description: `Booking #${response.data.bookingNumber} has been created`,
      });
      navigate(`/admin/booking/${response.data.id}/confirmation`, { state: { bookingData: response.data } });
    } catch (error: any) {
      console.error("Error creating booking:", error);
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to create booking. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar activeTab="create-booking" setActiveTab={() => {}} />
      <main className="flex-1 container mx-auto pt-6 pb-2">
        <h1 className="text-2xl font-bold mb-6">Create Customer Booking</h1>
        <Card>
          <CardHeader>
            <CardTitle>New Booking Details</CardTitle>
          </CardHeader>
          <CardContent>
            <AdminBookingForm />
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminBookingCreationPage;
