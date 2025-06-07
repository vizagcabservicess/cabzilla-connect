
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, MapPin, Clock, Users, Car, IndianRupee } from 'lucide-react';
import { PoolingRide } from '@/types/pooling';

interface EnhancedRideCardProps {
  ride: PoolingRide;
  onRequestRide: (ride: PoolingRide) => void;
  requestedSeats: number;
}

export function EnhancedRideCard({ ride, onRequestRide, requestedSeats }: EnhancedRideCardProps) {
  const totalAmount = ride.pricePerSeat * requestedSeats;
  const availableSeats = ride.totalSeats - ride.bookedSeats;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Car className="h-4 w-4 text-blue-600" />
              <span className="font-medium">{ride.vehicleType}</span>
              <Badge variant="outline">{ride.type}</Badge>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="h-3 w-3" />
                <span>{ride.fromLocation} → {ride.toLocation}</span>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{new Date(ride.departureTime).toLocaleString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</span>
                </div>
                
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  <span>{availableSeats} seats available</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">
              ₹{ride.pricePerSeat}
            </div>
            <div className="text-sm text-gray-500">per seat</div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium">
                {ride.providerName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <div className="font-medium">{ride.providerName}</div>
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                <span>{ride.providerRating?.toFixed(1) || 'N/A'}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm text-gray-500">Total for {requestedSeats} seat(s)</div>
              <div className="font-bold text-lg">₹{totalAmount}</div>
            </div>
            <Button 
              onClick={() => onRequestRide(ride)}
              disabled={availableSeats < requestedSeats}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {availableSeats < requestedSeats ? 'Not Available' : 'Request Ride'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
