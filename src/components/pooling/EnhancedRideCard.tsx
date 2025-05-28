
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Car, 
  Bus, 
  Users, 
  Clock, 
  MapPin, 
  Star, 
  Wifi, 
  Music, 
  Car as CarIcon,
  User,
  MessageSquare,
  IndianRupee
} from 'lucide-react';
import { format } from 'date-fns';
import { PoolingRide, RideRequest } from '@/types/pooling';
import { usePoolingAuth } from '@/providers/PoolingAuthProvider';
import { toast } from 'sonner';

interface EnhancedRideCardProps {
  ride: PoolingRide;
  onRequestSent?: (rideId: number, request: Omit<RideRequest, 'id' | 'requestedAt'>) => void;
  onViewDetails?: (ride: PoolingRide) => void;
}

export function EnhancedRideCard({ ride, onRequestSent, onViewDetails }: EnhancedRideCardProps) {
  const { user, isAuthenticated } = usePoolingAuth();
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [requestData, setRequestData] = useState({
    seatsRequested: 1,
    requestMessage: ''
  });

  const getTypeIcon = () => {
    switch (ride.type) {
      case 'car': return <Car className="h-4 w-4" />;
      case 'bus': return <Bus className="h-4 w-4" />;
      case 'shared-taxi': return <Users className="h-4 w-4" />;
    }
  };

  const getTypeColor = () => {
    switch (ride.type) {
      case 'car': return 'bg-blue-100 text-blue-800';
      case 'bus': return 'bg-green-100 text-green-800';
      case 'shared-taxi': return 'bg-purple-100 text-purple-800';
    }
  };

  const getAmenityIcon = (amenity: string) => {
    switch (amenity.toLowerCase()) {
      case 'wifi': return <Wifi className="h-3 w-3" />;
      case 'music': return <Music className="h-3 w-3" />;
      case 'ac': return <CarIcon className="h-3 w-3" />;
      default: return <User className="h-3 w-3" />;
    }
  };

  const handleSendRequest = () => {
    if (!isAuthenticated) {
      toast.error('Please login to send ride requests');
      return;
    }

    if (!user) {
      toast.error('User information not available');
      return;
    }

    if (requestData.seatsRequested > ride.availableSeats) {
      toast.error(`Only ${ride.availableSeats} seats available`);
      return;
    }

    const request: Omit<RideRequest, 'id' | 'requestedAt'> = {
      rideId: ride.id,
      guestId: user.id,
      guestName: user.name,
      guestPhone: user.phone,
      guestEmail: user.email,
      seatsRequested: requestData.seatsRequested,
      status: 'pending',
      requestMessage: requestData.requestMessage
    };

    onRequestSent?.(ride.id, request);
    setShowRequestDialog(false);
    setRequestData({ seatsRequested: 1, requestMessage: '' });
    toast.success('Ride request sent! Wait for provider approval.');
  };

  const canRequestRide = () => {
    return isAuthenticated && user?.role === 'guest' && ride.availableSeats > 0;
  };

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow">
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <Badge className={getTypeColor()}>
                  {getTypeIcon()}
                  <span className="ml-1 capitalize">{ride.type}</span>
                </Badge>
                <div className="flex items-center space-x-1">
                  <Star className="h-4 w-4 text-yellow-500 fill-current" />
                  <span className="text-sm font-medium">
                    {ride.providerRating?.toFixed(1) || 'New'}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600">
                  ₹{ride.pricePerSeat}
                </div>
                <div className="text-sm text-gray-600">per seat</div>
              </div>
            </div>

            {/* Route */}
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <MapPin className="h-4 w-4 text-green-600" />
                  <span className="font-medium">{ride.fromLocation}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-red-600" />
                  <span className="font-medium">{ride.toLocation}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center space-x-1 mb-1">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">
                    {format(new Date(ride.departureTime), 'HH:mm')}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  {format(new Date(ride.departureTime), 'MMM dd')}
                </div>
              </div>
            </div>

            {/* Vehicle & Provider Info */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {ride.providerName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium text-sm">{ride.providerName}</div>
                  <div className="text-xs text-gray-600">
                    {ride.vehicleInfo.make} {ride.vehicleInfo.model}
                    {ride.vehicleInfo.color && ` • ${ride.vehicleInfo.color}`}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">
                  {ride.availableSeats}/{ride.totalSeats} seats
                </div>
                <div className="text-xs text-gray-600">available</div>
              </div>
            </div>

            {/* Amenities */}
            {ride.amenities && ride.amenities.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Amenities:</span>
                {ride.amenities.slice(0, 3).map((amenity, index) => (
                  <div key={index} className="flex items-center space-x-1 text-xs text-gray-600">
                    {getAmenityIcon(amenity)}
                    <span>{amenity}</span>
                  </div>
                ))}
                {ride.amenities.length > 3 && (
                  <span className="text-xs text-gray-500">+{ride.amenities.length - 3} more</span>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewDetails?.(ride)}
              >
                View Details
              </Button>
              
              {canRequestRide() ? (
                <Button
                  onClick={() => setShowRequestDialog(true)}
                  disabled={ride.availableSeats === 0}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <MessageSquare className="mr-1 h-4 w-4" />
                  Request Ride
                </Button>
              ) : (
                <Button disabled variant="outline">
                  {!isAuthenticated ? 'Login to Request' : 'Not Available'}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Request Dialog */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Ride</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Ride Details</h4>
              <p className="text-sm text-gray-600">
                {ride.fromLocation} → {ride.toLocation}
              </p>
              <p className="text-sm text-gray-600">
                {format(new Date(ride.departureTime), 'MMM dd, yyyy • HH:mm')}
              </p>
              <p className="text-sm text-gray-600">
                ₹{ride.pricePerSeat} per seat • Provider: {ride.providerName}
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Number of Seats</Label>
              <Input
                type="number"
                min="1"
                max={ride.availableSeats}
                value={requestData.seatsRequested}
                onChange={(e) => setRequestData(prev => ({
                  ...prev,
                  seatsRequested: parseInt(e.target.value) || 1
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Message to Provider (Optional)</Label>
              <Textarea
                placeholder="Add any special requests or information..."
                value={requestData.requestMessage}
                onChange={(e) => setRequestData(prev => ({
                  ...prev,
                  requestMessage: e.target.value
                }))}
                rows={3}
              />
            </div>

            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span>Total Amount:</span>
                <span className="font-medium">
                  ₹{ride.pricePerSeat * requestData.seatsRequested}
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Payment will be enabled after provider approval
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRequestDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendRequest}>
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
