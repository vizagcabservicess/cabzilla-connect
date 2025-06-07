
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Users, Clock, CreditCard } from 'lucide-react';
import { PoolingBooking } from '@/types/pooling';

interface EnhancedBookingsProps {
  bookings: PoolingBooking[];
  onViewDetails: (booking: PoolingBooking) => void;
}

export function EnhancedBookings({ bookings, onViewDetails }: EnhancedBookingsProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Calendar className="h-3 w-3" />;
      case 'pending':
        return <Clock className="h-3 w-3" />;
      case 'completed':
        return <CreditCard className="h-3 w-3" />;
      default:
        return <Calendar className="h-3 w-3" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>My Bookings</span>
          <Badge variant="secondary">{bookings.length} bookings</Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {bookings.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <Calendar className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p>No bookings yet</p>
            <p className="text-sm">Your ride bookings will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.slice(0, 3).map((booking) => (
              <div key={booking.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge className={getStatusColor(booking.status)}>
                    {getStatusIcon(booking.status)}
                    <span className="ml-1 capitalize">{booking.status}</span>
                  </Badge>
                  <span className="text-sm text-gray-500">
                    ₹{booking.totalAmount}
                  </span>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-sm">
                    <MapPin className="h-3 w-3 text-gray-400" />
                    <span className="text-gray-600">
                      {booking.fromLocation} → {booking.toLocation}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {new Date(booking.rideDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span>{booking.seatsBooked} seats</span>
                    </div>
                  </div>
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => onViewDetails(booking)}
                  className="w-full"
                >
                  View Details
                </Button>
              </div>
            ))}
            
            {bookings.length > 3 && (
              <Button variant="ghost" className="w-full">
                View All Bookings ({bookings.length - 3} more)
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
