
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { Location } from '@/types/api';
import { CabType } from '@/types/cab';

export default function BookingConfirmation() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Mock data structure for demonstration
  const bookingData = location.state || {
    bookingId: 'BK001',
    pickupLocation: {
      id: '1',
      name: 'Mock Pickup Location',
      address: 'Mock Address',
      city: 'Visakhapatnam',
      state: 'Andhra Pradesh',
      lat: 17.6868,
      lng: 83.2185,
      type: 'other' as const,
      popularityScore: 50
    } as Location,
    dropLocation: {
      id: '2',
      name: 'Mock Drop Location',
      address: 'Mock Address',
      city: 'Visakhapatnam',
      state: 'Andhra Pradesh',
      lat: 17.7,
      lng: 83.3,
      type: 'other' as const,
      popularityScore: 50
    } as Location,
    selectedCab: {
      id: 'sedan',
      name: 'Sedan',
      capacity: 4,
      luggageCapacity: 2,
      price: 2000,
      pricePerKm: 12,
      image: '/sedan.jpg',
      amenities: ['AC', 'Music'],
      description: 'Comfortable sedan',
      ac: true
    } as CabType,
    pickupDate: new Date().toISOString(),
    totalPrice: 2500,
    discountAmount: 0,
    finalPrice: 2500,
    guestDetails: {
      name: 'Guest Name',
      email: 'guest@example.com',
      phone: '1234567890'
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl text-green-600">
              Booking Confirmed!
            </CardTitle>
            <p className="text-gray-600">
              Your booking has been successfully confirmed
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Booking Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Booking ID:</span>
                  <span className="font-medium">{bookingData.bookingId}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pickup:</span>
                  <span className="font-medium">{bookingData.pickupLocation.name}</span>
                </div>
                {bookingData.dropLocation && (
                  <div className="flex justify-between">
                    <span>Drop:</span>
                    <span className="font-medium">{bookingData.dropLocation.name}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Vehicle:</span>
                  <span className="font-medium">{bookingData.selectedCab.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date:</span>
                  <span className="font-medium">
                    {new Date(bookingData.pickupDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Price Breakdown</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatPrice(bookingData.totalPrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Discount:</span>
                  <span>{formatPrice(bookingData.discountAmount)}</span>
                </div>
                <div className="flex justify-between font-bold border-t pt-2">
                  <span>Total:</span>
                  <span>{formatPrice(bookingData.finalPrice)}</span>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Contact Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Name:</span>
                  <span className="font-medium">{bookingData.guestDetails.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Email:</span>
                  <span className="font-medium">{bookingData.guestDetails.email}</span>
                </div>
                <div className="flex justify-between">
                  <span>Phone:</span>
                  <span className="font-medium">{bookingData.guestDetails.phone}</span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-4">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => navigate('/')}
              >
                Book Another Ride
              </Button>
              <Button 
                className="flex-1"
                onClick={() => navigate('/bookings')}
              >
                View Bookings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
