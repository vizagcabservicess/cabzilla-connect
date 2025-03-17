
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { bookingAPI } from '@/services/api';
import { Booking } from '@/types/api';
import { Printer, Download, ArrowLeft } from 'lucide-react';
import { formatDate } from '@/lib/utils';

const ReceiptPage = () => {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBooking = async () => {
      if (!id) {
        setError("Invalid booking ID");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        console.log(`Fetching booking with ID: ${id}`);
        const response = await bookingAPI.getBookingById(id);
        console.log('Booking data:', response);
        setBooking(response);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching booking:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch booking details');
        setLoading(false);
        toast({
          title: "Error",
          description: "Could not load booking details. Please try again.",
          variant: "destructive",
        });
      }
    };

    fetchBooking();
  }, [id, toast]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto py-8">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-red-500">Error</CardTitle>
              <CardDescription>There was a problem loading your receipt</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">{error}</p>
            </CardContent>
            <CardFooter>
              <Link to="/dashboard">
                <Button>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Dashboard
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto py-8">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-red-500">Booking Not Found</CardTitle>
              <CardDescription>The receipt you're looking for doesn't exist</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">The booking with ID {id} could not be found.</p>
            </CardContent>
            <CardFooter>
              <Link to="/dashboard">
                <Button>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Dashboard
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto py-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Booking Receipt</h1>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>
              <Button>
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </div>
          </div>

          <Card className="mb-6 print:shadow-none">
            <CardHeader className="bg-blue-50 border-b">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Booking #{booking.bookingNumber}</CardTitle>
                  <CardDescription>Created on {formatDate(booking.createdAt)}</CardDescription>
                </div>
                <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  {booking.status.toUpperCase()}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-500 mb-2">Trip Details</h3>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-gray-500">Trip Type</p>
                      <p className="font-medium">{booking.tripType} ({booking.tripMode})</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Cab Type</p>
                      <p className="font-medium">{booking.cabType}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Distance</p>
                      <p className="font-medium">{booking.distance} km</p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-500 mb-2">Passenger Information</h3>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-gray-500">Name</p>
                      <p className="font-medium">{booking.passengerName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Phone</p>
                      <p className="font-medium">{booking.passengerPhone}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-medium">{booking.passengerEmail}</p>
                    </div>
                  </div>
                </div>
              </div>

              <Separator className="my-6" />

              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-gray-500 mb-2">Pickup Details</h3>
                  <div className="flex flex-col md:flex-row md:justify-between">
                    <div className="md:w-1/2">
                      <p className="text-sm text-gray-500">Pickup Location</p>
                      <p className="font-medium">{booking.pickupLocation}</p>
                    </div>
                    <div className="md:w-1/2 mt-2 md:mt-0">
                      <p className="text-sm text-gray-500">Pickup Date & Time</p>
                      <p className="font-medium">{formatDate(booking.pickupDate)}</p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-500 mb-2">Drop Details</h3>
                  <div className="flex flex-col md:flex-row md:justify-between">
                    <div className="md:w-1/2">
                      <p className="text-sm text-gray-500">Drop Location</p>
                      <p className="font-medium">{booking.dropLocation || 'N/A'}</p>
                    </div>
                    {booking.returnDate && (
                      <div className="md:w-1/2 mt-2 md:mt-0">
                        <p className="text-sm text-gray-500">Return Date & Time</p>
                        <p className="font-medium">{formatDate(booking.returnDate)}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <Separator className="my-6" />

              {booking.driverName && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-500 mb-2">Driver Details</h3>
                  <div className="flex flex-col md:flex-row md:justify-between">
                    <div className="md:w-1/2">
                      <p className="text-sm text-gray-500">Driver Name</p>
                      <p className="font-medium">{booking.driverName}</p>
                    </div>
                    <div className="md:w-1/2 mt-2 md:mt-0">
                      <p className="text-sm text-gray-500">Driver Phone</p>
                      <p className="font-medium">{booking.driverPhone}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <p className="text-gray-600">Base Fare</p>
                  <p className="font-medium">₹{Math.round(booking.totalAmount * 0.85)}</p>
                </div>
                <div className="flex justify-between">
                  <p className="text-gray-600">Taxes & Fees</p>
                  <p className="font-medium">₹{Math.round(booking.totalAmount * 0.15)}</p>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between">
                  <p className="font-semibold">Total Amount</p>
                  <p className="font-bold text-xl">₹{booking.totalAmount}</p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-gray-50 p-6 border-t">
              <div className="w-full">
                <p className="text-sm text-gray-500 mb-2">Payment Status</p>
                <div className="bg-green-100 text-green-800 px-3 py-1 inline-block rounded-full text-sm font-medium">
                  PAID
                </div>
                <p className="text-gray-500 text-sm mt-4">
                  If you have any questions about this receipt, please contact our support team at support@vizagcabs.com
                </p>
              </div>
            </CardFooter>
          </Card>

          <div className="flex justify-between items-center">
            <Link to="/dashboard">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiptPage;
