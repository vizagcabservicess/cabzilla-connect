
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  CheckCircle, 
  CreditCard, 
  Car, 
  MapPin,
  Phone,
  MessageSquare,
  Star,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { PoolingBooking, RequestStatus, BookingStatus, PaymentStatus } from '@/types/pooling';

interface RideStatusTrackerProps {
  booking: PoolingBooking;
  onCancelBooking?: (bookingId: number) => void;
  onContactProvider?: (phone: string) => void;
  onMessageProvider?: (bookingId: number) => void;
  onRateRide?: (bookingId: number) => void;
  showContactInfo?: boolean;
}

export function RideStatusTracker({
  booking,
  onCancelBooking,
  onContactProvider,
  onMessageProvider,
  onRateRide,
  showContactInfo = false
}: RideStatusTrackerProps) {
  
  const getStatusIcon = (status: RequestStatus | BookingStatus) => {
    switch (status) {
      case 'pending': return <Clock className="h-5 w-5 text-orange-500" />;
      case 'approved': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'confirmed': return <Car className="h-5 w-5 text-blue-500" />;
      case 'completed': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'cancelled': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'rejected': return <XCircle className="h-5 w-5 text-red-500" />;
      default: return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: RequestStatus | BookingStatus) => {
    switch (status) {
      case 'pending': return 'bg-orange-100 text-orange-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'refunded': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const canCancel = () => {
    if (!booking.canCancelFree) return false;
    if (booking.bookingStatus === 'cancelled' || booking.bookingStatus === 'completed') return false;
    if (booking.cancellationDeadline && new Date(booking.cancellationDeadline) < new Date()) return false;
    return true;
  };

  const shouldShowPayment = () => {
    return booking.requestStatus === 'approved' && booking.paymentStatus === 'pending';
  };

  const shouldShowContactInfo = () => {
    return showContactInfo && booking.paymentStatus === 'paid' && booking.bookingStatus !== 'cancelled';
  };

  const shouldShowRating = () => {
    return booking.bookingStatus === 'completed' && booking.paymentStatus === 'paid';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Booking #{booking.id}</span>
          <div className="flex space-x-2">
            <Badge className={getStatusColor(booking.requestStatus || 'pending')}>
              {getStatusIcon(booking.requestStatus || 'pending')}
              <span className="ml-1 capitalize">{booking.requestStatus || 'pending'}</span>
            </Badge>
            <Badge className={getStatusColor(booking.bookingStatus)}>
              {getStatusIcon(booking.bookingStatus)}
              <span className="ml-1 capitalize">{booking.bookingStatus}</span>
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Booking Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Passenger:</span>
            <p className="font-medium">{booking.passengerName}</p>
          </div>
          <div>
            <span className="text-gray-600">Phone:</span>
            <p className="font-medium">{booking.passengerPhone}</p>
          </div>
          <div>
            <span className="text-gray-600">Seats:</span>
            <p className="font-medium">{booking.seatsBooked}</p>
          </div>
          <div>
            <span className="text-gray-600">Total Amount:</span>
            <p className="font-medium">₹{booking.totalAmount}</p>
          </div>
          <div>
            <span className="text-gray-600">Booking Date:</span>
            <p className="font-medium">
              {format(new Date(booking.bookingDate), 'MMM dd, yyyy')}
            </p>
          </div>
          <div>
            <span className="text-gray-600">Payment Status:</span>
            <Badge className={getPaymentStatusColor(booking.paymentStatus)}>
              {booking.paymentStatus}
            </Badge>
          </div>
        </div>

        {/* Route Information */}
        {(booking.fromStop || booking.toStop) && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2 flex items-center">
              <MapPin className="h-4 w-4 mr-1" />
              Route Details
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              {booking.fromStop && (
                <div>
                  <span className="text-gray-600">From:</span>
                  <p className="font-medium">{booking.fromStop}</p>
                </div>
              )}
              {booking.toStop && (
                <div>
                  <span className="text-gray-600">To:</span>
                  <p className="font-medium">{booking.toStop}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Status Timeline */}
        <div className="space-y-3">
          <h4 className="font-medium">Status Timeline</h4>
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <Clock className="h-4 w-4 text-gray-400" />
              <span className="text-sm">Request sent</span>
              <span className="text-xs text-gray-500">
                {format(new Date(booking.bookingDate), 'MMM dd, HH:mm')}
              </span>
            </div>
            
            {booking.requestStatus === 'approved' && (
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Request approved</span>
              </div>
            )}
            
            {booking.paymentStatus === 'paid' && (
              <div className="flex items-center space-x-3">
                <CreditCard className="h-4 w-4 text-blue-500" />
                <span className="text-sm">Payment completed</span>
              </div>
            )}
            
            {booking.bookingStatus === 'confirmed' && (
              <div className="flex items-center space-x-3">
                <Car className="h-4 w-4 text-blue-500" />
                <span className="text-sm">Ride confirmed</span>
              </div>
            )}
            
            {booking.bookingStatus === 'completed' && (
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">Ride completed</span>
              </div>
            )}
          </div>
        </div>

        {/* Payment Action */}
        {shouldShowPayment() && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <CreditCard className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-800">Payment Required</span>
            </div>
            <p className="text-sm text-blue-700 mb-3">
              Your ride request has been approved! Complete payment to confirm your booking.
            </p>
            <Button className="w-full">
              Pay ₹{booking.totalAmount}
            </Button>
          </div>
        )}

        {/* Contact Information */}
        {shouldShowContactInfo() && (
          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-medium text-green-800 mb-2">Provider Contact</h4>
            <p className="text-sm text-green-700 mb-3">
              Payment successful! You can now contact the provider.
            </p>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onContactProvider?.(booking.passengerPhone)}
              >
                <Phone className="h-4 w-4 mr-1" />
                Call
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onMessageProvider?.(booking.id)}
              >
                <MessageSquare className="h-4 w-4 mr-1" />
                Message
              </Button>
            </div>
          </div>
        )}

        {/* Rating Action */}
        {shouldShowRating() && (
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Star className="h-5 w-5 text-yellow-600" />
              <span className="font-medium text-yellow-800">Rate Your Experience</span>
            </div>
            <p className="text-sm text-yellow-700 mb-3">
              How was your ride? Your feedback helps improve our service.
            </p>
            <Button 
              variant="outline"
              size="sm"
              onClick={() => onRateRide?.(booking.id)}
            >
              <Star className="h-4 w-4 mr-1" />
              Rate Ride
            </Button>
          </div>
        )}

        {/* Cancellation */}
        {canCancel() && (
          <div className="pt-4 border-t">
            <Button 
              variant="outline"
              onClick={() => onCancelBooking?.(booking.id)}
              className="w-full text-red-600 border-red-200 hover:bg-red-50"
            >
              <XCircle className="h-4 w-4 mr-1" />
              Cancel Booking
              {booking.canCancelFree && (
                <span className="ml-1 text-xs">(Free cancellation)</span>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
