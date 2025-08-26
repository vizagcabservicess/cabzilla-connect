import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Download, Printer, Share2, Phone, Mail, MapPin, Calendar, Clock, Car, CreditCard, CheckCircle, ArrowRight, DollarSign } from 'lucide-react';
import { bookingAPI } from '@/services/api/bookingAPI';
import { Booking } from '@/types/api';
import { formatDate, formatTime, formatDateTime } from '@/lib/dateUtils';
import { formatPrice } from '@/lib/cabData';
import { toast } from 'sonner';

const ReceiptPage = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper functions
  const formatCurrency = (amount: number) => {
    if (typeof amount !== 'number' || isNaN(amount)) return "₹0";
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const formatTripType = (tripType?: string, tripMode?: string) => {
    if (!tripType) return "Standard Trip";
    
    const type = tripType.charAt(0).toUpperCase() + tripType.slice(1);
    let formattedMode = "";
    
    if (tripMode) {
      formattedMode = tripMode
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      return `${type} (${formattedMode})`;
    }
    
    return type;
  };

  // Calculate total amount
  const totalAmount = booking ? (booking.totalAmount || 0) : 0;
  const paymentStatus = booking?.paymentStatus || booking?.payment_status || 'Pending';

  useEffect(() => {
    if (bookingId) {
      fetchBookingDetails(bookingId);
    } else {
      setError('No booking ID provided');
      setLoading(false);
    }
  }, [bookingId]);

  const fetchBookingDetails = async (id: string) => {
    try {
      setLoading(true);
      const bookingData = await bookingAPI.getBookingById(id);
      if (bookingData) {
        setBooking(bookingData);
      } else {
        setError('Booking not found');
      }
    } catch (error) {
      console.error('Error fetching booking details:', error);
      setError('Failed to load booking details');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Generate PDF and download
    toast.info('Download feature coming soon');
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Booking Receipt - Vizag Taxi Hub',
        text: `My booking receipt for ${booking?.pickupLocation} to ${booking?.dropLocation}`,
        url: window.location.href,
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      toast.success('Receipt link copied to clipboard');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-12">
          <div className="flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-600">Loading receipt...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-lg mx-auto bg-white rounded-lg shadow-md p-6">
            <h1 className="text-2xl font-medium text-red-600 mb-4">Error</h1>
            <p className="text-gray-700 mb-6">{error || 'Booking not found'}</p>
            <div className="flex justify-between">
              <Button onClick={() => navigate('/')} variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
              <Button onClick={() => navigate('/local-taxi')}>
                Book a New Ride
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Booking Receipt - Vizag Taxi Hub | Trip Details & Payment</title>
        <meta name="description" content="View your booking receipt and trip details from Vizag Taxi Hub. Download receipt, view payment status, and trip information." />
        <meta name="keywords" content="booking receipt, taxi receipt, trip details, payment receipt, vizag taxi booking" />
        <meta name="author" content="Vizag Taxi Hub" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://vizagtaxihub.com/receipt" />
        <meta property="og:title" content="Booking Receipt - Vizag Taxi Hub | Trip Details & Payment" />
        <meta property="og:description" content="View your booking receipt and trip details from Vizag Taxi Hub. Download receipt and view payment status." />
        <meta property="og:image" content="/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:site_name" content="Vizag Taxi Hub" />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://vizagtaxihub.com/receipt" />
        <meta property="twitter:title" content="Booking Receipt - Vizag Taxi Hub | Trip Details & Payment" />
        <meta property="twitter:description" content="View your booking receipt and trip details from Vizag Taxi Hub." />
        <meta property="twitter:image" content="/og-image.png" />
        
        {/* Additional SEO */}
        <meta name="robots" content="noindex, nofollow" />
        <link rel="canonical" href="https://vizagtaxihub.com/receipt" />
      </Helmet>
      
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-3xl mx-auto">
            <div className="bg-blue-600 p-3 text-white flex justify-between items-center">
              <div>
                <h1 className="text-lg font-medium">Booking Receipt</h1>
                <p className="text-xs mt-1">#{booking?.bookingNumber}</p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handlePrint} 
                  className="bg-white text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
              </div>
            </div>
            
            <div className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-medium text-gray-800">
                    Booking #{booking?.bookingNumber}
                  </h2>
                  <p className="text-gray-500 text-sm">ID: {booking?.id}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Booking Date</p>
                  <p className="font-medium text-sm">
                    {booking?.createdAt ? formatDate(booking.createdAt) : "N/A"}
                  </p>
                </div>
              </div>
              
              <Separator className="my-6" />
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2 text-sm">Trip Details</h3>
                  <div className="space-y-3">
                    <div className="flex items-start">
                      <MapPin className="w-5 h-5 text-blue-500 mt-0.5 mr-2" />
                      <div>
                        <p className="text-xs text-gray-500">PICKUP LOCATION</p>
                        <p className="font-medium text-sm">{booking?.pickupLocation || "N/A"}</p>
                      </div>
                    </div>
                    
                    {booking?.dropLocation && (
                      <div className="flex items-start">
                        <MapPin className="w-5 h-5 text-red-500 mt-0.5 mr-2" />
                        <div>
                          <p className="text-xs text-gray-500">DROP LOCATION</p>
                          <p className="font-medium text-sm">{booking.dropLocation}</p>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-start">
                      <Calendar className="w-5 h-5 text-blue-500 mt-0.5 mr-2" />
                      <div>
                        <p className="text-xs text-gray-500">PICKUP DATE & TIME</p>
                        <p className="font-medium text-sm">
                          {booking?.pickupDate ? formatDate(booking.pickupDate) : "N/A"}
                        </p>
                      </div>
                    </div>
                    
                    {booking?.tripType === 'outstation' && booking?.tripMode === 'round-trip' && booking?.returnDate && (
                      <div className="flex items-start">
                        <Calendar className="w-5 h-5 text-red-500 mt-0.5 mr-2" />
                        <div>
                          <p className="text-xs text-gray-500">RETURN DATE & TIME</p>
                          <p className="font-medium text-sm">{formatDate(booking.returnDate)}</p>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-start">
                      <Car className="w-5 h-5 text-blue-500 mt-0.5 mr-2" />
                      <div>
                        <p className="text-xs text-gray-500">CAB TYPE</p>
                        <p className="font-medium text-sm">{booking?.cabType || "N/A"}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <ArrowRight className="w-5 h-5 text-blue-500 mt-0.5 mr-2" />
                      <div>
                        <p className="text-xs text-gray-500">TRIP TYPE</p>
                        <p className="font-medium text-sm">
                          {formatTripType(booking?.tripType, booking?.tripMode)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2 text-sm">Payment Details</h3>
                  <div className="bg-gray-50 p-3 rounded-lg text-sm">
                    {/* Show extra charges if they exist */}
                    {booking?.extraCharges && booking.extraCharges.length > 0 && (
                      booking.extraCharges.map((charge, index) => (
                        <div key={index} className="flex justify-between mb-2">
                          <span>{charge.description}</span>
                          <span>{formatCurrency(charge.amount)}</span>
                        </div>
                      ))
                    )}
                    
                    {/* Show discount if applied */}
                    {booking?.discountAmount && booking.discountAmount > 0 && (
                      <div className="flex justify-between mb-2 text-green-600">
                        <span>Discount ({booking.discountType || 'Discount'})</span>
                        <span>-{formatCurrency(booking.discountAmount)}</span>
                      </div>
                    )}
                    
                    <Separator className="my-2" />
                    <div className="flex justify-between font-medium text-base">
                      <span>Total Amount</span>
                      <span>{formatCurrency(totalAmount)}</span>
                    </div>
                    <div className={`mt-2 text-sm font-medium ${paymentStatus === "paid" ? "text-green-600" : "text-yellow-600"}`}>
                      <DollarSign className="w-4 h-4 inline mr-1" />
                      Payment Status: {paymentStatus === "paid" ? "Paid" : "Pending"}
                    </div>
                    
                    {/* Show advance payment if any */}
                    {booking?.advance_paid_amount && booking.advance_paid_amount > 0 && (
                      <div className="mt-2 text-sm text-blue-600">
                        <span>Advance Paid: {formatCurrency(booking.advance_paid_amount)}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-6">
                    <h3 className="font-semibold text-gray-800 mb-2 text-sm">
                      Passenger Details
                    </h3>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-gray-500">NAME</p>
                        <p className="font-medium text-sm">{booking?.passengerName || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">PHONE</p>
                        <p className="font-medium text-sm">{booking?.passengerPhone || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">EMAIL</p>
                        <p className="font-medium text-sm">{booking?.passengerEmail || "N/A"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
};

export default ReceiptPage;
