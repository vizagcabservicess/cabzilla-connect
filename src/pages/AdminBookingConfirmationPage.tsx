
import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { BookingDetails } from '@/components/BookingDetails';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { bookingAPI } from '@/services/api/bookingAPI';
import { Booking } from '@/types/api';
import { Printer, Mail, ArrowLeft } from 'lucide-react';

const AdminBookingConfirmationPage = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [booking, setBooking] = useState<Booking | null>(
    location.state?.bookingData || null
  );
  const [loading, setLoading] = useState(!location.state?.bookingData);
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    if (!booking && bookingId) {
      setLoading(true);
      bookingAPI.getBookingById(bookingId)
        .then(response => {
          setBooking(response.data);
        })
        .catch(error => {
          console.error('Error fetching booking details:', error);
          toast({
            title: "Error",
            description: "Failed to load booking details",
            variant: "destructive",
          });
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [booking, bookingId]);

  const handleSendEmail = async () => {
    if (!booking) return;
    
    setSendingEmail(true);
    try {
      // Call API endpoint to send email
      await fetch(`/api/send-booking-confirmation.php?booking_id=${booking.id}`, {
        method: 'POST',
      });
      
      toast({
        title: "Email Sent",
        description: "Booking confirmation email sent to the customer",
      });
    } catch (error) {
      console.error('Error sending confirmation email:', error);
      toast({
        title: "Error",
        description: "Failed to send confirmation email",
        variant: "destructive",
      });
    } finally {
      setSendingEmail(false);
    }
  };

  const handlePrintReceipt = () => {
    if (!booking) return;
    window.open(`/receipt/${booking.id}`, '_blank');
  };

  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <div className="flex items-center mb-6">
          <Button
            variant="outline"
            size="sm"
            className="mr-4"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Booking Confirmation</h1>
        </div>

        <Card>
          <CardHeader className="bg-green-50">
            <CardTitle className="text-green-800">
              Booking Created Successfully
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {loading ? (
              <div className="py-8 text-center">
                <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p>Loading booking details...</p>
              </div>
            ) : booking ? (
              <>
                <div className="mb-6 flex flex-wrap gap-4">
                  <Button onClick={handlePrintReceipt}>
                    <Printer className="h-4 w-4 mr-2" />
                    Print Receipt
                  </Button>
                  <Button variant="outline" onClick={handleSendEmail} disabled={sendingEmail}>
                    <Mail className="h-4 w-4 mr-2" />
                    {sendingEmail ? 'Sending...' : 'Send Confirmation Email'}
                  </Button>
                </div>

                <BookingDetails booking={booking} />
                
                {/* Display discount information if applied */}
                {booking.originalAmount && (
                  <div className="mt-4 p-4 bg-yellow-50 rounded-md">
                    <h3 className="font-bold text-yellow-800">Discount Applied</h3>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div className="text-gray-600">Original Amount:</div>
                      <div>₹{booking.originalAmount}</div>
                      
                      {booking.discountType === 'percentage' ? (
                        <>
                          <div className="text-gray-600">Discount:</div>
                          <div>{booking.discount}% (₹{(booking.originalAmount * booking.discount / 100).toFixed(2)})</div>
                        </>
                      ) : (
                        <>
                          <div className="text-gray-600">Discount:</div>
                          <div>₹{booking.discount}</div>
                        </>
                      )}
                      
                      <div className="text-gray-600 font-semibold">Final Amount:</div>
                      <div className="font-semibold">₹{booking.totalAmount}</div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="py-8 text-center text-red-500">
                Booking not found
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminBookingConfirmationPage;
