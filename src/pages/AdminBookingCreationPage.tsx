
import React from 'react';
import { AdminBookingForm } from '@/components/admin/AdminBookingForm';
import { cabTypes } from '@/lib/cabData';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';

export default function AdminBookingCreationPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (data: any) => {
    try {
      // Handle booking creation
      console.log('Creating booking:', data);
      
      toast({
        title: "Booking Created",
        description: "The booking has been created successfully.",
      });
      
      navigate('/admin/bookings');
    } catch (error) {
      console.error('Error creating booking:', error);
      toast({
        title: "Error",
        description: "Failed to create booking. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto py-6 px-4">
      <h1 className="text-2xl font-bold mb-6">Create New Booking</h1>
      
      <AdminBookingForm
        onSubmit={handleSubmit}
        cabTypes={cabTypes}
        isSubmitting={false}
      />
    </div>
  );
}
