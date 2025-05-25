
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LocationInput } from '@/components/LocationInput';
import { DateTimePicker } from '@/components/DateTimePicker';
import { GuestDetailsForm } from '@/components/GuestDetailsForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Location } from '@/types/api';

export default function BookingEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [pickupLocation, setPickupLocation] = useState<Location>({
    id: '1',
    name: 'Current Pickup',
    address: 'Current Pickup Address',
    lat: 17.6868,
    lng: 83.2185,
    city: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    type: 'other',
    popularityScore: 50
  });
  
  const [dropLocation, setDropLocation] = useState<Location>({
    id: '2',
    name: 'Current Drop',
    address: 'Current Drop Address',
    lat: 17.7,
    lng: 83.3,
    city: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    type: 'other',
    popularityScore: 50
  });
  
  const [pickupDate, setPickupDate] = useState<Date>(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePickupLocationChange = (location: any) => {
    setPickupLocation({
      id: location.place_id || 'pickup',
      name: location.description || location.main_text,
      address: location.description || location.main_text,
      lat: 17.6868,
      lng: 83.2185,
      city: 'Visakhapatnam',
      state: 'Andhra Pradesh',
      type: 'other',
      popularityScore: 50
    });
  };

  const handleDropLocationChange = (location: any) => {
    setDropLocation({
      id: location.place_id || 'drop',
      name: location.description || location.main_text,
      address: location.description || location.main_text,
      lat: 17.7,
      lng: 83.3,
      city: 'Visakhapatnam',
      state: 'Andhra Pradesh',
      type: 'other',
      popularityScore: 50
    });
  };

  const handleGuestDetailsSubmit = async (contactDetails: any) => {
    try {
      setIsSubmitting(true);
      
      // Mock API call
      console.log('Updating booking:', {
        id,
        pickupLocation,
        dropLocation,
        pickupDate,
        contactDetails
      });
      
      toast({
        title: "Booking Updated",
        description: "Your booking has been updated successfully.",
      });
      
      navigate('/bookings');
    } catch (error) {
      console.error('Error updating booking:', error);
      toast({
        title: "Error",
        description: "Failed to update booking. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-6">
          <Button 
            variant="outline" 
            onClick={() => navigate('/bookings')}
            className="mb-4"
          >
            ← Back to Bookings
          </Button>
          <h1 className="text-2xl font-bold">Edit Booking #{id}</h1>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Trip Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <LocationInput
                  label="Pickup Location"
                  placeholder="Enter pickup location"
                  value={{
                    place_id: pickupLocation.id,
                    description: pickupLocation.name
                  }}
                  onLocationChange={handlePickupLocationChange}
                  isPickupLocation={true}
                />
                
                <LocationInput
                  label="Drop Location"
                  placeholder="Enter drop location"
                  value={{
                    place_id: dropLocation.id,
                    description: dropLocation.name
                  }}
                  onLocationChange={handleDropLocationChange}
                  isPickupLocation={false}
                />
                
                <DateTimePicker
                  label="Pickup Date & Time"
                  date={pickupDate}
                  onDateChange={setPickupDate}
                  minDate={new Date()}
                />
              </CardContent>
            </Card>
          </div>
          
          <div>
            <GuestDetailsForm
              onSubmit={handleGuestDetailsSubmit}
              totalPrice={2500}
              initialData={{
                name: 'Current Guest Name',
                email: 'guest@example.com',
                phone: '1234567890'
              }}
              bookingId={id || ''}
              isEditing={true}
              isSubmitting={isSubmitting}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
