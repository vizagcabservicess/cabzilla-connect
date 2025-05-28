
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Car, Bus, Users, Plus, X, MapPin } from 'lucide-react';
import { CreateRideRequest, PoolingType } from '@/types/pooling';
import { POOLING_LOCATIONS } from '@/lib/poolingData';
import { toast } from 'sonner';

interface CreateRideFormProps {
  onSubmit: (rideData: CreateRideRequest) => Promise<void>;
  onCancel: () => void;
}

export function CreateRideForm({ onSubmit, onCancel }: CreateRideFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateRideRequest>({
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

  const [newAmenity, setNewAmenity] = useState('');
  const [newRule, setNewRule] = useState('');

  const rideTypes = [
    { value: 'car', label: 'Car Pool', icon: Car, description: 'Share your car with passengers' },
    { value: 'bus', label: 'Bus', icon: Bus, description: 'Scheduled bus service' },
    { value: 'shared-taxi', label: 'Shared Taxi', icon: Users, description: 'Door-to-door taxi sharing' }
  ];

  const popularAmenities = [
    'AC', 'Music System', 'WiFi', 'Phone Charger', 'Water Bottle', 'Snacks', 'First Aid Kit'
  ];

  const commonRules = [
    'No Smoking', 'No Loud Music', 'Be on Time', 'Respect Fellow Passengers', 'No Heavy Luggage'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.fromLocation || !formData.toLocation) {
      toast.error('Please select from and to locations');
      return;
    }

    if (!formData.departureTime) {
      toast.error('Please select departure time');
      return;
    }

    if (formData.pricePerSeat <= 0) {
      toast.error('Please enter a valid price per seat');
      return;
    }

    try {
      setLoading(true);
      await onSubmit(formData);
    } catch (error) {
      toast.error('Failed to create ride');
    } finally {
      setLoading(false);
    }
  };

  const addAmenity = (amenity: string) => {
    if (amenity && !formData.amenities?.includes(amenity)) {
      setFormData(prev => ({
        ...prev,
        amenities: [...(prev.amenities || []), amenity]
      }));
      setNewAmenity('');
    }
  };

  const removeAmenity = (amenity: string) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities?.filter(a => a !== amenity) || []
    }));
  };

  const addRule = (rule: string) => {
    if (rule && !formData.rules?.includes(rule)) {
      setFormData(prev => ({
        ...prev,
        rules: [...(prev.rules || []), rule]
      }));
      setNewRule('');
    }
  };

  const removeRule = (rule: string) => {
    setFormData(prev => ({
      ...prev,
      rules: prev.rules?.filter(r => r !== rule) || []
    }));
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Car className="h-6 w-6" />
            <span>Create New Ride</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Ride Type Selection */}
            <div>
              <Label className="text-base font-medium mb-3 block">Ride Type</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {rideTypes.map((type) => (
                  <div
                    key={type.value}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      formData.type === type.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setFormData(prev => ({ ...prev, type: type.value as PoolingType }))}
                  >
                    <div className="flex items-center space-x-3">
                      <type.icon className="h-6 w-6 text-blue-600" />
                      <div>
                        <p className="font-medium">{type.label}</p>
                        <p className="text-sm text-gray-600">{type.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Route Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="from">From Location</Label>
                <Select value={formData.fromLocation} onValueChange={(value) => setFormData(prev => ({ ...prev, fromLocation: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select departure city" />
                  </SelectTrigger>
                  <SelectContent>
                    {POOLING_LOCATIONS.map(location => (
                      <SelectItem key={location.id} value={location.name}>
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4" />
                          <span>{location.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="to">To Location</Label>
                <Select value={formData.toLocation} onValueChange={(value) => setFormData(prev => ({ ...prev, toLocation: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select destination city" />
                  </SelectTrigger>
                  <SelectContent>
                    {POOLING_LOCATIONS.map(location => (
                      <SelectItem key={location.id} value={location.name}>
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4" />
                          <span>{location.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Timing */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="departure">Departure Time</Label>
                <Input
                  id="departure"
                  type="datetime-local"
                  value={formData.departureTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, departureTime: e.target.value }))}
                  min={new Date().toISOString().slice(0, 16)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="arrival">Arrival Time (Optional)</Label>
                <Input
                  id="arrival"
                  type="datetime-local"
                  value={formData.arrivalTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, arrivalTime: e.target.value }))}
                />
              </div>
            </div>

            {/* Capacity and Pricing */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="seats">Total Seats Available</Label>
                <Input
                  id="seats"
                  type="number"
                  min="1"
                  max="8"
                  value={formData.totalSeats}
                  onChange={(e) => setFormData(prev => ({ ...prev, totalSeats: parseInt(e.target.value) || 1 }))}
                  required
                />
              </div>

              <div>
                <Label htmlFor="price">Price per Seat (₹)</Label>
                <Input
                  id="price"
                  type="number"
                  min="1"
                  value={formData.pricePerSeat}
                  onChange={(e) => setFormData(prev => ({ ...prev, pricePerSeat: parseInt(e.target.value) || 0 }))}
                  required
                />
              </div>
            </div>

            {/* Vehicle Information */}
            <div>
              <Label className="text-base font-medium mb-3 block">Vehicle Information</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="make">Make</Label>
                  <Input
                    id="make"
                    placeholder="e.g., Honda"
                    value={formData.vehicleInfo.make}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      vehicleInfo: { ...prev.vehicleInfo, make: e.target.value }
                    }))}
                  />
                </div>

                <div>
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    placeholder="e.g., City"
                    value={formData.vehicleInfo.model}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      vehicleInfo: { ...prev.vehicleInfo, model: e.target.value }
                    }))}
                  />
                </div>

                <div>
                  <Label htmlFor="color">Color</Label>
                  <Input
                    id="color"
                    placeholder="e.g., White"
                    value={formData.vehicleInfo.color}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      vehicleInfo: { ...prev.vehicleInfo, color: e.target.value }
                    }))}
                  />
                </div>

                <div>
                  <Label htmlFor="plate">Plate Number</Label>
                  <Input
                    id="plate"
                    placeholder="e.g., TS09AB1234"
                    value={formData.vehicleInfo.plateNumber}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      vehicleInfo: { ...prev.vehicleInfo, plateNumber: e.target.value }
                    }))}
                  />
                </div>
              </div>
            </div>

            {/* Amenities */}
            <div>
              <Label className="text-base font-medium mb-3 block">Amenities</Label>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {popularAmenities.map(amenity => (
                    <Button
                      key={amenity}
                      type="button"
                      variant={formData.amenities?.includes(amenity) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => 
                        formData.amenities?.includes(amenity) 
                          ? removeAmenity(amenity)
                          : addAmenity(amenity)
                      }
                    >
                      {amenity}
                    </Button>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <Input
                    placeholder="Add custom amenity"
                    value={newAmenity}
                    onChange={(e) => setNewAmenity(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAmenity(newAmenity))}
                  />
                  <Button type="button" onClick={() => addAmenity(newAmenity)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {formData.amenities && formData.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.amenities.map(amenity => (
                      <Badge key={amenity} variant="secondary" className="flex items-center space-x-1">
                        <span>{amenity}</span>
                        <X className="h-3 w-3 cursor-pointer" onClick={() => removeAmenity(amenity)} />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Rules */}
            <div>
              <Label className="text-base font-medium mb-3 block">Rules</Label>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {commonRules.map(rule => (
                    <Button
                      key={rule}
                      type="button"
                      variant={formData.rules?.includes(rule) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => 
                        formData.rules?.includes(rule) 
                          ? removeRule(rule)
                          : addRule(rule)
                      }
                    >
                      {rule}
                    </Button>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <Input
                    placeholder="Add custom rule"
                    value={newRule}
                    onChange={(e) => setNewRule(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addRule(newRule))}
                  />
                  <Button type="button" onClick={() => addRule(newRule)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {formData.rules && formData.rules.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.rules.map(rule => (
                      <Badge key={rule} variant="secondary" className="flex items-center space-x-1">
                        <span>{rule}</span>
                        <X className="h-3 w-3 cursor-pointer" onClick={() => removeRule(rule)} />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex space-x-4 pt-6">
              <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Creating...' : 'Create Ride'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
