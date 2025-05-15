
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, ArrowLeft, Printer, MessageCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { Booking } from '@/types/api';
import { formatPrice } from '@/lib/utils';
import { bookingAPI } from '@/services/api/bookingAPI';
import { WhatsAppShareButton } from '@/components/WhatsAppShareButton';

export default function BookingConfirmationPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBookingDetails = async () => {
      try {
        setIsLoading(true);
        if (!id) {
          throw new Error('Booking ID is missing');
        }

        const data = await bookingAPI.getBookingById(id);
        setBooking(data);
      } catch (err) {
        console.error('Failed to fetch booking details:', err);
        setError('Failed to load booking details. Please try again later.');
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not load booking details.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookingDetails();
  }, [id, toast]);

  const handleDownloadReceipt = () => {
    if (!booking) return;
    
    try {
      const receiptUrl = `/api/receipt.php?id=${booking.id}&download=1`;
      window.open(receiptUrl, '_blank');
    } catch (err) {
      console.error('Failed to download receipt:', err);
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: "Could not download receipt. Please try again later.",
      });
    }
  };

  const handlePrintReceipt = () => {
    if (!booking) return;
    
    try {
      const printUrl = `/api/receipt.php?id=${booking.id}&print=1`;
      const printWindow = window.open(printUrl, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    } catch (err) {
      console.error('Failed to print receipt:', err);
      toast({
        variant: "destructive",
        title: "Print Failed",
        description: "Could not print receipt. Please try again later.",
      });
    }
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <Skeleton className="h-8 w-1/3" />
              <Skeleton className="h-6 w-1/4" />
            </div>
            <div className="mt-6 space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-36 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertDescription>
            {error || 'Booking information not found. Please check the booking ID or try again later.'}
          </AlertDescription>
        </Alert>
        <Button onClick={handleBackToHome} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardContent className="pt-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-green-600">Booking Confirmed!</h1>
            <p className="text-gray-600 mt-1">Your booking has been successfully confirmed.</p>
          </div>

          <div className="border p-4 rounded-md mb-6">
            <h2 className="font-semibold text-lg border-b pb-2 mb-3">Booking Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p><span className="font-medium">Booking #:</span> {booking.bookingNumber}</p>
                <p><span className="font-medium">Status:</span> {booking.status.toUpperCase()}</p>
                <p><span className="font-medium">Trip Type:</span> {booking.tripType}</p>
                <p><span className="font-medium">Vehicle:</span> {booking.cabType}</p>
              </div>
              <div>
                <p><span className="font-medium">Pickup:</span> {booking.pickupLocation}</p>
                {booking.dropLocation && (
                  <p><span className="font-medium">Drop:</span> {booking.dropLocation}</p>
                )}
                <p><span className="font-medium">Date:</span> {new Date(booking.pickupDate).toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="border p-4 rounded-md mb-6">
            <h2 className="font-semibold text-lg border-b pb-2 mb-3">Passenger Information</h2>
            <p><span className="font-medium">Name:</span> {booking.passengerName}</p>
            <p><span className="font-medium">Phone:</span> {booking.passengerPhone}</p>
            <p><span className="font-medium">Email:</span> {booking.passengerEmail}</p>
          </div>

          {(booking.driverName || booking.driverPhone || booking.vehicleNumber) && (
            <div className="border p-4 rounded-md mb-6 bg-green-50">
              <h2 className="font-semibold text-lg border-b border-green-200 pb-2 mb-3">Driver Information</h2>
              {booking.driverName && (
                <p><span className="font-medium">Name:</span> {booking.driverName}</p>
              )}
              {booking.driverPhone && (
                <p><span className="font-medium">Contact:</span> {booking.driverPhone}</p>
              )}
              {booking.vehicleNumber && (
                <p><span className="font-medium">Vehicle Number:</span> {booking.vehicleNumber}</p>
              )}
            </div>
          )}

          <div className="border-t pt-4 mt-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <p className="text-sm text-gray-500">Total Amount</p>
                <p className="font-bold text-xl">₹{formatPrice(booking.totalAmount)}</p>
              </div>
              <div className="text-sm bg-gray-100 px-3 py-1 rounded-full">
                {booking.isPaid ? 'Paid' : 'Payment Due'}
              </div>
            </div>

            <div className="flex flex-wrap gap-3 justify-between">
              <Button variant="outline" onClick={handleBackToHome}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
              
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={handlePrintReceipt}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print
                </Button>
                
                <Button onClick={handleDownloadReceipt}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
                
                <WhatsAppShareButton booking={booking} variant="whatsapp">
                  Share Details
                </WhatsAppShareButton>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
