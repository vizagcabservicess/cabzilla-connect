
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { FixedLocationSelector } from './FixedLocationSelector';
import { CreateRideRequest, PoolingType } from '@/types/pooling';
import { getLocationById } from '@/lib/poolingData';
import { toast } from 'sonner';

interface CreateRideFormProps {
  onSubmit: (rideData: CreateRideRequest) => Promise<void>;
  onCancel: () => void;
}

export function CreateRideForm({ onSubmit, onCancel }: CreateRideFormProps) {
  const [rideData, setRideData] = useState<CreateRideRequest>({
    type: 'car',
    fromLocation: '',
    toLocation: '',
    departureTime: '',
    arrivalTime: '',
    totalSeats: 4,
    pricePerSeat: 0,
    vehicleInfo: {
      make: '',
      model: '',
      color: '',
      plateNumber: ''
    },
    route: [],
    amenities: [],
    rules: []
  });

  const [newRouteStop, setNewRouteStop] = useState('');
  const [newAmenity, setNewAmenity] = useState('');
  const [newRule, setNewRule] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get tomorrow's date as minimum
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDateTime = tomorrow.toISOString().slice(0, 16);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!rideData.fromLocation || !rideData.toLocation || !rideData.departureTime) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (rideData.fromLocation === rideData.toLocation) {
      toast.error('Pickup and drop locations cannot be the same');
      return;
    }

    if (rideData.pricePerSeat <= 0) {
      toast.error('Price per seat must be greater than 0');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Convert location IDs to names
      const fromLocationName = getLocationById(rideData.fromLocation)?.name || rideData.fromLocation;
      const toLocationName = getLocationById(rideData.toLocation)?.name || rideData.toLocation;
      
      const submitData: CreateRideRequest = {
        ...rideData,
        fromLocation: fromLocationName,
        toLocation: toLocationName
      };

      await onSubmit(submitData);
    } catch (error) {
      toast.error('Failed to create ride');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addRouteStop = () => {
    if (newRouteStop.trim()) {
      setRideData(prev => ({
        ...prev,
        route: [...(prev.route || []), newRouteStop.trim()]
      }));
      setNewRouteStop('');
    }
  };

  const removeRouteStop = (index: number) => {
    setRideData(prev => ({
      ...prev,
      route: prev.route?.filter((_, i) => i !== index) || []
    }));
  };

  const addAmenity = () => {
    if (newAmenity.trim()) {
      setRideData(prev => ({
        ...prev,
        amenities: [...(prev.amenities || []), newAmenity.trim()]
      }));
      setNewAmenity('');
    }
  };

  const removeAmenity = (index: number) => {
    setRideData(prev => ({
      ...prev,
      amenities: prev.amenities?.filter((_, i) => i !== index) || []
    }));
  };

  const addRule = () => {
    if (newRule.trim()) {
      setRideData(prev => ({
        ...prev,
        rules: [...(prev.rules || []), newRule.trim()]
      }));
      setNewRule('');
    }
  };

  const removeRule = (index: number) => {
    setRideData(prev => ({
      ...prev,
      rules: prev.rules?.filter((_, i) => i !== index) || []
    }));
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={onCancel} className="mr-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Create New Ride</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Ride Type</Label>
                <Select 
                  value={rideData.type} 
                  onValueChange={(value: PoolingType) => setRideData(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="car">Car Pool</SelectItem>
                    <SelectItem value="shared-taxi">Shared Taxi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Total Seats</Label>
                <Select 
                  value={rideData.totalSeats.toString()} 
                  onValueChange={(value) => setRideData(prev => ({ ...prev, totalSeats: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                      <SelectItem key={num} value={num.toString()}>{num} seats</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Price per Seat (₹)</Label>
                <Input
                  type="number"
                  value={rideData.pricePerSeat}
                  onChange={(e) => setRideData(prev => ({ ...prev, pricePerSeat: parseInt(e.target.value) || 0 }))}
                  placeholder="Enter price"
                  min="1"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FixedLocationSelector
                label="From Location"
                placeholder="Select departure city"
                value={rideData.fromLocation}
                onChange={(value) => setRideData(prev => ({ ...prev, fromLocation: value }))}
                excludeLocation={rideData.toLocation}
              />

              <FixedLocationSelector
                label="To Location"
                placeholder="Select destination city"
                value={rideData.toLocation}
                onChange={(value) => setRideData(prev => ({ ...prev, toLocation: value }))}
                excludeLocation={rideData.fromLocation}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Departure Time</Label>
                <Input
                  type="datetime-local"
                  value={rideData.departureTime}
                  onChange={(e) => setRideData(prev => ({ ...prev, departureTime: e.target.value }))}
                  min={minDateTime}
                  required
                />
              </div>

              <div>
                <Label>Arrival Time (Optional)</Label>
                <Input
                  type="datetime-local"
                  value={rideData.arrivalTime}
                  onChange={(e) => setRideData(prev => ({ ...prev, arrivalTime: e.target.value }))}
                  min={rideData.departureTime}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vehicle Information */}
        <Card>
          <CardHeader>
            <CardTitle>Vehicle Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Vehicle Make</Label>
                <Input
                  value={rideData.vehicleInfo.make}
                  onChange={(e) => setRideData(prev => ({
                    ...prev,
                    vehicleInfo: { ...prev.vehicleInfo, make: e.target.value }
                  }))}
                  placeholder="e.g., Honda, Toyota"
                />
              </div>

              <div>
                <Label>Vehicle Model</Label>
                <Input
                  value={rideData.vehicleInfo.model}
                  onChange={(e) => setRideData(prev => ({
                    ...prev,
                    vehicleInfo: { ...prev.vehicleInfo, model: e.target.value }
                  }))}
                  placeholder="e.g., City, Innova"
                />
              </div>

              <div>
                <Label>Vehicle Color</Label>
                <Input
                  value={rideData.vehicleInfo.color}
                  onChange={(e) => setRideData(prev => ({
                    ...prev,
                    vehicleInfo: { ...prev.vehicleInfo, color: e.target.value }
                  }))}
                  placeholder="e.g., White, Silver"
                />
              </div>

              <div>
                <Label>Plate Number</Label>
                <Input
                  value={rideData.vehicleInfo.plateNumber}
                  onChange={(e) => setRideData(prev => ({
                    ...prev,
                    vehicleInfo: { ...prev.vehicleInfo, plateNumber: e.target.value }
                  }))}
                  placeholder="e.g., TS09ABC1234"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Optional Information */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Information (Optional)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Route Stops */}
            <div>
              <Label>Route Stops</Label>
              <div className="flex space-x-2 mt-2">
                <Input
                  value={newRouteStop}
                  onChange={(e) => setNewRouteStop(e.target.value)}
                  placeholder="Add a stop along the way"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addRouteStop())}
                />
                <Button type="button" onClick={addRouteStop} size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {rideData.route && rideData.route.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {rideData.route.map((stop, index) => (
                    <Badge key={index} variant="outline" className="flex items-center gap-1">
                      {stop}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRouteStop(index)}
                        className="h-4 w-4 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Amenities */}
            <div>
              <Label>Amenities</Label>
              <div className="flex space-x-2 mt-2">
                <Input
                  value={newAmenity}
                  onChange={(e) => setNewAmenity(e.target.value)}
                  placeholder="Add amenities (AC, Music, etc.)"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAmenity())}
                />
                <Button type="button" onClick={addAmenity} size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {rideData.amenities && rideData.amenities.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {rideData.amenities.map((amenity, index) => (
                    <Badge key={index} variant="outline" className="flex items-center gap-1">
                      {amenity}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAmenity(index)}
                        className="h-4 w-4 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Rules */}
            <div>
              <Label>Ride Rules</Label>
              <div className="flex space-x-2 mt-2">
                <Input
                  value={newRule}
                  onChange={(e) => setNewRule(e.target.value)}
                  placeholder="Add rules (No smoking, etc.)"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addRule())}
                />
                <Button type="button" onClick={addRule} size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {rideData.rules && rideData.rules.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {rideData.rules.map((rule, index) => (
                    <Badge key={index} variant="outline" className="flex items-center gap-1">
                      {rule}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRule(index)}
                        className="h-4 w-4 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Submit Buttons */}
        <div className="flex space-x-4">
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="flex-1">
            {isSubmitting ? 'Creating Ride...' : 'Create Ride'}
          </Button>
        </div>
      </form>
    </div>
  );
}
