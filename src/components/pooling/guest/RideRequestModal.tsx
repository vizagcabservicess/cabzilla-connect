
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MapPin, Clock, Users, Star, Car, Phone, Mail } from 'lucide-react';
import { PoolingRide } from '@/types/pooling';
import { usePoolingAuth } from '@/providers/PoolingAuthProvider';
import { toast } from 'sonner';

interface RideRequestModalProps {
  ride: PoolingRide | null;
  open: boolean;
  onClose: () => void;
  onRequestSubmit: (requestData: any) => Promise<void>;
}

export const RideRequestModal: React.FC<RideRequestModalProps> = ({
  ride,
  open,
  onClose,
  onRequestSubmit
}) => {
  const { user } = usePoolingAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    seatsRequested: 1,
    message: '',
    contactPhone: user?.phone || '',
    contactEmail: user?.email || ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ride || !user) return;

    if (formData.seatsRequested > ride.availableSeats) {
      toast.error(`Only ${ride.availableSeats} seats available`);
      return;
    }

    setLoading(true);
    try {
      await onRequestSubmit({
        rideId: ride.id,
        guestId: user.id,
        guestName: user.name,
        guestPhone: formData.contactPhone,
        guestEmail: formData.contactEmail,
        seatsRequested: formData.seatsRequested,
        requestMessage: formData.message
      });
      
      toast.success('Ride request sent! Waiting for provider approval.');
      onClose();
    } catch (error) {
      toast.error('Failed to send request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!ride) return null;

  const totalAmount = ride.pricePerSeat * formData.seatsRequested;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request to Join Ride</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Ride Summary */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback>
                    <Car className="h-6 w-6" />
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{ride.providerName}</h3>
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      {ride.providerRating?.toFixed(1) || 'New'}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {ride.fromLocation} → {ride.toLocation}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {new Date(ride.departureTime).toLocaleString()}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {ride.availableSeats} of {ride.totalSeats} seats available
                    </div>
                    <div className="flex items-center gap-1">
                      <Car className="h-4 w-4" />
                      {ride.vehicleInfo.make} {ride.vehicleInfo.model}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Request Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Number of Seats</Label>
                <Select 
                  value={formData.seatsRequested.toString()} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, seatsRequested: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: Math.min(ride.availableSeats, 4) }, (_, i) => i + 1).map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num} {num === 1 ? 'seat' : 'seats'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Total Amount</Label>
                <div className="p-2 bg-gray-100 rounded-md font-semibold text-lg">
                  ₹{totalAmount.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-1">
                <Phone className="h-4 w-4" />
                Contact Phone
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.contactPhone}
                onChange={(e) => setFormData(prev => ({ ...prev, contactPhone: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-1">
                <Mail className="h-4 w-4" />
                Contact Email
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.contactEmail}
                onChange={(e) => setFormData(prev => ({ ...prev, contactEmail: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message to Provider (Optional)</Label>
              <Textarea
                id="message"
                placeholder="Any special requests or information..."
                value={formData.message}
                onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">What happens next?</h4>
              <ol className="text-sm text-blue-800 space-y-1">
                <li>1. Your request will be sent to the provider</li>
                <li>2. Wait for provider approval (usually within a few hours)</li>
                <li>3. Once approved, you'll receive a payment link</li>
                <li>4. After payment, your seat is confirmed and contact details are shared</li>
              </ol>
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Sending Request...' : 'Send Request'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
