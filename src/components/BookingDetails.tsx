
import React from 'react';
import { Booking } from '@/types/api';
import { format, parseISO } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface BookingDetailsProps {
  booking: Booking;
  showActions?: boolean;
}

export function BookingDetails({ booking, showActions = false }: BookingDetailsProps) {
  // Helper function to format dates
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Not specified';
    try {
      return format(parseISO(dateString), 'PPP p'); // Format: Apr 29, 2023, 3:30 PM
    } catch (e) {
      return dateString;
    }
  };

  // Get status badge color based on booking status
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">Pending</Badge>;
      case 'confirmed':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">Confirmed</Badge>;
      case 'assigned':
        return <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">Assigned</Badge>;
      case 'in-progress':
      case 'in_progress':
        return <Badge variant="outline" className="bg-indigo-100 text-indigo-800 border-indigo-300">In Progress</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">Cancelled</Badge>;
      case 'payment_received':
        return <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300">Payment Received</Badge>;
      case 'payment_pending':
        return <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">Payment Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Booking Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Booking #{booking.bookingNumber}</h3>
          <p className="text-gray-500 text-sm">
            Created on {formatDate(booking.createdAt)}
          </p>
        </div>
        <div className="flex items-center">
          {getStatusBadge(booking.status)}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Trip Details */}
        <Card>
          <CardContent className="pt-6">
            <h4 className="text-sm font-medium text-gray-500 mb-4">Trip Details</h4>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="text-gray-500">Trip Type:</div>
                <div>
                  {booking.tripType === 'local' 
                    ? 'Local' 
                    : booking.tripType === 'outstation'
                    ? 'Outstation'
                    : 'Airport Transfer'}
                  {booking.tripMode && ` (${booking.tripMode.replace('-', ' ')})`}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="text-gray-500">Cab Type:</div>
                <div>{booking.cabType}</div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="text-gray-500">Pickup:</div>
                <div>{booking.pickupLocation}</div>
              </div>

              {booking.dropLocation && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-gray-500">Destination:</div>
                  <div>{booking.dropLocation}</div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div className="text-gray-500">Pickup Date:</div>
                <div>{formatDate(booking.pickupDate)}</div>
              </div>

              {booking.returnDate && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-gray-500">Return Date:</div>
                  <div>{formatDate(booking.returnDate)}</div>
                </div>
              )}

              {booking.hourlyPackage && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-gray-500">Package:</div>
                  <div>{booking.hourlyPackage}</div>
                </div>
              )}

              {booking.distance !== undefined && booking.distance > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-gray-500">Distance:</div>
                  <div>{booking.distance} km</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Customer Details */}
        <Card>
          <CardContent className="pt-6">
            <h4 className="text-sm font-medium text-gray-500 mb-4">Customer Details</h4>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="text-gray-500">Name:</div>
                <div>{booking.passengerName}</div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="text-gray-500">Phone:</div>
                <div>{booking.passengerPhone}</div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="text-gray-500">Email:</div>
                <div className="break-all">{booking.passengerEmail}</div>
              </div>

              {booking.billingAddress && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-gray-500">Billing Address:</div>
                  <div>{booking.billingAddress}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Driver Details */}
      {(booking.driverName || booking.driverPhone || booking.vehicleNumber) && (
        <Card>
          <CardContent className="pt-6">
            <h4 className="text-sm font-medium text-gray-500 mb-4">Driver & Vehicle Details</h4>
            <div className="space-y-3">
              {booking.driverName && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-gray-500">Driver Name:</div>
                  <div>{booking.driverName}</div>
                </div>
              )}

              {booking.driverPhone && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-gray-500">Driver Phone:</div>
                  <div>{booking.driverPhone}</div>
                </div>
              )}

              {booking.vehicleNumber && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-gray-500">Vehicle Number:</div>
                  <div>{booking.vehicleNumber}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Details */}
      <Card>
        <CardContent className="pt-6">
          <h4 className="text-sm font-medium text-gray-500 mb-4">Payment Details</h4>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="text-gray-500">Total Amount:</div>
              <div className="font-semibold">₹{booking.totalAmount.toFixed(2)}</div>
            </div>

            {booking.payment_status && (
              <div className="grid grid-cols-2 gap-2">
                <div className="text-gray-500">Payment Status:</div>
                <div>{booking.payment_status}</div>
              </div>
            )}

            {booking.payment_method && (
              <div className="grid grid-cols-2 gap-2">
                <div className="text-gray-500">Payment Method:</div>
                <div>{booking.payment_method}</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {booking.notes && (
        <Card>
          <CardContent className="pt-6">
            <h4 className="text-sm font-medium text-gray-500 mb-4">Additional Notes</h4>
            <p className="text-gray-700">{booking.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
