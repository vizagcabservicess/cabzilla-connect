
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Car, Bus } from 'lucide-react';
import { FixedLocationSelector } from './FixedLocationSelector';
import { CreateRideRequest, PoolingType } from '@/types/pooling';
import { poolingAPI } from '@/services/api/poolingAPI';
import { getLocationById } from '@/lib/poolingData';
import { toast } from 'sonner';

const CreateRidePage = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [rideData, setRideData] = useState<Partial<CreateRideRequest>>({
    type: 'car',
    fromLocation: '',
    toLocation: '',
    departureTime: '',
    totalSeats: 4,
    pricePerSeat: 0,
    vehicleInfo: {
      make: '',
      model: '',
      color: '',
      plateNumber: ''
    },
    amenities: [],
    rules: []
  });

  const [fromLocationId, setFromLocationId] = useState('');
  const [toLocationId, setToLocationId] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fromLocationId || !toLocationId) {
      toast.error('Please select both pickup and drop locations');
      return;
    }

    const fromLocation = getLocationById(fromLocationId);
    const toLocation = getLocationById(toLocationId);

    if (!fromLocation || !toLocation) {
      toast.error('Invalid location selection');
      return;
    }

    setIsSubmitting(true);

    try {
      const createRequest: CreateRideRequest = {
        ...rideData as CreateRideRequest,
        fromLocation: fromLocation.name,
        toLocation: toLocation.name,
      };

      await poolingAPI.createRide(createRequest);
      toast.success('Ride created successfully!');
      navigate('/pooling');
    } catch (error) {
      console.error('Error creating ride:', error);
      toast.error('Failed to create ride. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-6">
          <Button variant="ghost" onClick={() => navigate('/pooling')} className="mr-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Pooling
          </Button>
          <h1 className="text-2xl font-bold">Offer a Ride</h1>
        </div>

        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Ride Type */}
            <Card>
              <CardHeader>
                <CardTitle>Ride Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant={rideData.type === 'car' ? 'default' : 'outline'}
                    onClick={() => setRideData(prev => ({ ...prev, type: 'car' as PoolingType }))}
                    className="flex items-center space-x-2"
                  >
                    <Car size={16} />
                    <span>Car Pool</span>
                  </Button>
                  <Button
                    type="button"
                    variant={rideData.type === 'shared-taxi' ? 'default' : 'outline'}
                    onClick={() => setRideData(prev => ({ ...prev, type: 'shared-taxi' as PoolingType }))}
                    className="flex items-center space-x-2"
                  >
                    <Car size={16} />
                    <span>Shared Taxi</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Route Details */}
            <Card>
              <CardHeader>
                <CardTitle>Route Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FixedLocationSelector
                    label="From"
                    placeholder="Select departure city"
                    value={fromLocationId}
                    onChange={setFromLocationId}
                    excludeLocation={toLocationId}
                  />
                  <FixedLocationSelector
                    label="To"
                    placeholder="Select destination city"
                    value={toLocationId}
                    onChange={setToLocationId}
                    excludeLocation={fromLocationId}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="departureTime">Departure Date & Time</Label>
                  <Input
                    id="departureTime"
                    type="datetime-local"
                    value={rideData.departureTime}
                    onChange={(e) => setRideData(prev => ({ ...prev, departureTime: e.target.value }))}
                    required
                  />
                </div>
              </CardContent>
            </Card>

            {/* Vehicle Details */}
            <Card>
              <CardHeader>
                <CardTitle>Vehicle Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="make">Vehicle Make</Label>
                    <Input
                      id="make"
                      value={rideData.vehicleInfo?.make || ''}
                      onChange={(e) => setRideData(prev => ({
                        ...prev,
                        vehicleInfo: { ...prev.vehicleInfo!, make: e.target.value }
                      }))}
                      placeholder="e.g., Maruti"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="model">Vehicle Model</Label>
                    <Input
                      id="model"
                      value={rideData.vehicleInfo?.model || ''}
                      onChange={(e) => setRideData(prev => ({
                        ...prev,
                        vehicleInfo: { ...prev.vehicleInfo!, model: e.target.value }
                      }))}
                      placeholder="e.g., Swift"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="color">Vehicle Color</Label>
                    <Input
                      id="color"
                      value={rideData.vehicleInfo?.color || ''}
                      onChange={(e) => setRideData(prev => ({
                        ...prev,
                        vehicleInfo: { ...prev.vehicleInfo!, color: e.target.value }
                      }))}
                      placeholder="e.g., White"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="plateNumber">Plate Number</Label>
                    <Input
                      id="plateNumber"
                      value={rideData.vehicleInfo?.plateNumber || ''}
                      onChange={(e) => setRideData(prev => ({
                        ...prev,
                        vehicleInfo: { ...prev.vehicleInfo!, plateNumber: e.target.value }
                      }))}
                      placeholder="e.g., AP 05 AB 1234"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pricing & Seats */}
            <Card>
              <CardHeader>
                <CardTitle>Pricing & Availability</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="totalSeats">Total Seats Available</Label>
                    <Select 
                      value={rideData.totalSeats?.toString()} 
                      onValueChange={(value) => setRideData(prev => ({ ...prev, totalSeats: parseInt(value) }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select seats" />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                          <SelectItem key={num} value={num.toString()}>
                            {num} {num === 1 ? 'seat' : 'seats'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pricePerSeat">Price per Seat (₹)</Label>
                    <Input
                      id="pricePerSeat"
                      type="number"
                      value={rideData.pricePerSeat}
                      onChange={(e) => setRideData(prev => ({ ...prev, pricePerSeat: parseInt(e.target.value) }))}
                      placeholder="Enter price"
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex space-x-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => navigate('/pooling')} 
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || !fromLocationId || !toLocationId}
                className="flex-1"
              >
                {isSubmitting ? 'Creating...' : 'Create Ride'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateRidePage;
