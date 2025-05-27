
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { BookingFlow } from '@/components/pooling/BookingFlow';
import { BookingFlowWithPayment } from '@/components/pooling/BookingFlowWithPayment';
import { RideRequestModal } from '@/components/pooling/guest/RideRequestModal';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { poolingAPI } from '@/services/api/poolingAPI';
import { usePoolingAuth } from '@/providers/PoolingAuthProvider';
import { toast } from 'sonner';

const PoolingBookingPage = () => {
  const { rideId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = usePoolingAuth();
  const [showRequestModal, setShowRequestModal] = useState(false);

  const { data: ride, isLoading, error } = useQuery({
    queryKey: ['ride-details', rideId],
    queryFn: () => poolingAPI.getRideDetails(parseInt(rideId!)),
    enabled: !!rideId,
  });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/pooling/auth');
    }
  }, [isAuthenticated, navigate]);

  const handleBookingComplete = (bookingId: number) => {
    toast.success('Booking completed successfully!');
    navigate('/pooling');
  };

  const handleRideRequest = async (requestData: any) => {
    // This would typically call an API to send the request
    console.log('Sending ride request:', requestData);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  if (!isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !ride) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-xl font-semibold mb-4">Ride Not Found</h2>
              <p className="text-gray-600 mb-4">The ride you're looking for doesn't exist or has been removed.</p>
              <Button onClick={() => navigate('/pooling')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Rides
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-6">
          <Button variant="ghost" onClick={() => navigate('/pooling')} className="mr-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Rides
          </Button>
          <h1 className="text-2xl font-bold">Book Your Ride</h1>
        </div>

        <div className="max-w-2xl mx-auto">
          {user?.role === 'guest' ? (
            <>
              <Button 
                onClick={() => setShowRequestModal(true)}
                className="w-full mb-4"
              >
                Request to Join Ride
              </Button>
              
              <RideRequestModal
                ride={ride}
                open={showRequestModal}
                onClose={() => setShowRequestModal(false)}
                onRequestSubmit={handleRideRequest}
              />
            </>
          ) : (
            <BookingFlowWithPayment
              ride={ride}
              onBookingComplete={handleBookingComplete}
              onCancel={() => navigate('/pooling')}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default PoolingBookingPage;
