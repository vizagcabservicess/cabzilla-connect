
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PoolingBooking } from '@/types/pooling';
import { Calendar, MapPin, Users, IndianRupee, Clock, Phone } from 'lucide-react';

interface EnhancedBookingsProps {
  bookings: PoolingBooking[];
  onViewDetails?: (booking: PoolingBooking) => void;
}

export function EnhancedBookings({ bookings, onViewDetails }: EnhancedBookingsProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <Card className="h-fit">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <span>My Bookings</span>
          <Badge variant="outline">
            {Array.isArray(bookings) ? bookings.length : 0} bookings
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {!Array.isArray(bookings) || bookings.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No bookings yet</p>
            <p className="text-xs text-gray-400 mt-1">Your ride bookings will appear here</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {bookings.map((booking) => (
              <div key={booking.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="font-semibold text-gray-900">
                      Booking #{booking.id}
                    </div>
                    <div className="flex items-center text-sm text-gray-500 mt-1">
                      <Calendar className="h-3 w-3 mr-1" />
                      {formatDate(booking.bookingDate)}
                    </div>
                  </div>
                  <Badge className={getStatusColor(booking.bookingStatus)}>
                    {booking.bookingStatus}
                  </Badge>
                </div>

                <div className="space-y-2 mb-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-1">
                      <Users className="h-3 w-3 text-gray-500" />
                      <span className="text-gray-600">{booking.seatsBooked} seat(s)</span>
                    </div>
                    <div className="flex items-center space-x-1 font-semibold text-green-600">
                      <IndianRupee className="h-3 w-3" />
                      <span>{booking.totalAmount}</span>
                    </div>
                  </div>

                  {booking.providerName && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Provider:</span>
                      <span className="font-medium text-gray-900">{booking.providerName}</span>
                    </div>
                  )}

                  {booking.providerPhone && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Contact:</span>
                      <div className="flex items-center space-x-1">
                        <Phone className="h-3 w-3 text-gray-500" />
                        <span className="font-medium text-gray-900">{booking.providerPhone}</span>
                      </div>
                    </div>
                  )}
                </div>

                {onViewDetails && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => onViewDetails(booking)}
                  >
                    View Details
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
