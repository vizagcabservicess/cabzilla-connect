import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePoolingAuth } from '@/providers/PoolingAuthProvider';
import { poolingAPI } from '@/services/api/poolingAPI';
import { PoolingRide, PoolingBooking, RideRequest } from '@/types/pooling';
import { toast } from 'sonner';
import { Info, Bell, MessageSquare, Star, MapPin } from 'lucide-react';

import { GuestDashboardHeader } from './GuestDashboardHeader';
import { EnhancedGuestSearch } from './EnhancedGuestSearch';
import { EnhancedRideCard } from './EnhancedRideCard';
import { EnhancedWallet } from './EnhancedWallet';
import { EnhancedBookings } from './EnhancedBookings';
import { BookingFlow } from './BookingFlow';
import { ProviderChat } from './ProviderChat';
import { RatingSystem } from './RatingSystem';
import { NotificationCenter } from './NotificationCenter';
import GoogleMapComponent from '@/components/GoogleMapComponent';

interface SearchParams {
  type: string;
  from: string;
  to: string;
  date: string;
  passengers: number;
  maxPrice?: number;
  sortBy: 'time' | 'price' | 'rating';
}

export default function GuestDashboard() {
  const navigate = useNavigate();
  const { user } = usePoolingAuth();
  const [rides, setRides] = useState<PoolingRide[]>([]);
  const [bookings, setBookings] = useState<PoolingBooking[]>([]);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams, setSearchParams] = useState<SearchParams | null>(null);
  const [selectedRide, setSelectedRide] = useState<PoolingRide | null>(null);
  const [showBookingFlow, setShowBookingFlow] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [currentBookingStatus, setCurrentBookingStatus] = useState<'none' | 'pending' | 'approved' | 'rejected' | 'paid' | 'completed'>('none');
  const [searchCache, setSearchCache] = useState<Map<string, PoolingRide[]>>(new Map());

  useEffect(() => {
    if (user) {
      loadUserData();
      // Set up real-time updates
      const interval = setInterval(loadUserData, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadUserData = async () => {
    if (!user) return;
    
    try {
      const [userBookings, userTransactions] = await Promise.all([
        poolingAPI.bookings.getByUser(user.id).catch(() => []),
        poolingAPI.wallet.getTransactions(user.id).catch(() => [])
      ]);
      setBookings(userBookings);
      setTransactions(userTransactions);
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  const handleSearch = async (params: SearchParams) => {
    setIsLoading(true);
    setSearchParams(params);
    
    // Check cache first
    const cacheKey = JSON.stringify(params);
    if (searchCache.has(cacheKey)) {
      setRides(searchCache.get(cacheKey)!);
      setIsLoading(false);
      return;
    }
    
    try {
      const searchResults = await poolingAPI.rides.search({
        type: params.type,
        from: params.from,
        to: params.to,
        date: params.date,
        passengers: params.passengers,
        maxPrice: params.maxPrice,
        sortBy: params.sortBy
      });
      
      setRides(searchResults);
      
      // Cache results for 5 minutes
      setSearchCache(prev => {
        const newCache = new Map(prev);
        newCache.set(cacheKey, searchResults);
        // Simple cache cleanup - keep only last 10 searches
        if (newCache.size > 10) {
          const firstKey = newCache.keys().next().value;
          newCache.delete(firstKey);
        }
        return newCache;
      });
      
      toast.success(`Found ${searchResults.length} rides`);
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search rides. Please try again.');
      setRides([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRideRequest = async (ride: PoolingRide, message?: string) => {
    if (!user || !searchParams) return;

    try {
      const requestPayload: Omit<RideRequest, 'id' | 'requestedAt'> = {
        rideId: ride.id,
        guestId: user.id,
        guestName: user.name,
        guestPhone: user.phone || '',
        guestEmail: user.email,
        seatsRequested: searchParams.passengers,
        status: 'pending',
        requestMessage: message || `Request for ${searchParams.passengers} seat(s) from ${searchParams.from} to ${searchParams.to}`
      };

      await poolingAPI.requests.create(requestPayload);
      setCurrentBookingStatus('pending');
      setSelectedRide(ride);
      setShowBookingFlow(true);
      toast.success('Ride request sent! Wait for provider approval.');
      loadUserData(); // Refresh bookings
    } catch (error) {
      console.error('Failed to send ride request:', error);
      toast.error('Failed to send ride request. Please try again.');
    }
  };

  const handlePayment = async () => {
    try {
      // Mock payment implementation
      setCurrentBookingStatus('paid');
      toast.success('Payment completed successfully!');
      loadUserData();
    } catch (error) {
      console.error('Payment failed:', error);
      toast.error('Payment failed. Please try again.');
    }
  };

  const handleCancelBooking = async () => {
    try {
      setCurrentBookingStatus('none');
      setShowBookingFlow(false);
      toast.success('Booking cancelled successfully.');
      loadUserData();
    } catch (error) {
      console.error('Cancellation failed:', error);
      toast.error('Failed to cancel booking.');
    }
  };

  const handleSubmitRating = async (ratingData: any) => {
    try {
      console.log('Submitting rating:', ratingData);
      toast.success('Thank you for your feedback!');
      setShowRating(false);
    } catch (error) {
      console.error('Failed to submit rating:', error);
      toast.error('Failed to submit rating.');
    }
  };

  const handleLogout = () => {
    navigate('/pooling/login');
  };

  // Analytics tracking
  const trackInteraction = (action: string, data?: any) => {
    console.log('Analytics:', { action, data, userId: user?.id, timestamp: new Date().toISOString() });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <GuestDashboardHeader 
        onLogout={handleLogout}
        onNotificationClick={() => setShowNotifications(!showNotifications)}
        unreadNotifications={3}
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="xl:col-span-3 space-y-8">
            {/* Search Section */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Find Your Ride</h2>
              <EnhancedGuestSearch 
                onSearch={(params) => {
                  handleSearch(params);
                  trackInteraction('search_performed', params);
                }} 
                isLoading={isLoading} 
              />
            </div>

            {/* Map Integration */}
            {searchParams && searchParams.from && searchParams.to && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Route Overview
                </h3>
                <Card>
                  <CardContent className="p-0">
                    <GoogleMapComponent
                      pickupLocation={{ 
                        id: '1', 
                        name: searchParams.from, 
                        address: searchParams.from, 
                        lat: 17.6868, 
                        lng: 83.2185 
                      }}
                      dropLocation={{ 
                        id: '2', 
                        name: searchParams.to, 
                        address: searchParams.to, 
                        lat: 16.5062, 
                        lng: 80.6480 
                      }}
                      tripType="pooling"
                    />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Search Results */}
            {searchParams && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Available Rides
                  </h2>
                  {rides.length > 0 && (
                    <div className="text-sm text-gray-600">
                      {rides.length} rides found from {searchParams.from} to {searchParams.to}
                    </div>
                  )}
                </div>

                {isLoading && (
                  <Card>
                    <CardContent className="text-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-4 text-gray-600">Searching for rides...</p>
                    </CardContent>
                  </Card>
                )}

                {!isLoading && rides.length === 0 && (
                  <Card>
                    <CardContent className="text-center py-12">
                      <div className="text-gray-500 mb-4">
                        <Info className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p className="text-lg font-medium">No rides found</p>
                        <p className="text-sm">Try adjusting your search criteria or check back later.</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {!isLoading && rides.length > 0 && (
                  <div className="space-y-4">
                    {rides.map((ride) => (
                      <EnhancedRideCard
                        key={ride.id}
                        ride={ride}
                        onRequestRide={(ride) => {
                          setSelectedRide(ride);
                          setShowBookingFlow(true);
                          trackInteraction('ride_card_clicked', { rideId: ride.id });
                        }}
                        requestedSeats={searchParams.passengers}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Welcome Message */}
            {!searchParams && (
              <Card>
                <CardContent className="text-center py-16">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    Welcome to Pooling Platform
                  </h3>
                  <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
                    Find and book affordable shared rides, car pools, and bus travel between cities. 
                    Search for available rides above to get started.
                  </p>
                  <Alert className="max-w-md mx-auto">
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Start by searching for rides using the form above. You can filter by vehicle type, 
                      price, and departure time to find the perfect ride.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <EnhancedWallet 
              transactions={transactions} 
              onTransactionUpdate={loadUserData} 
            />
            <EnhancedBookings 
              bookings={bookings}
              onViewDetails={(booking) => {
                trackInteraction('booking_details_viewed', { bookingId: booking.id });
              }}
            />
            
            {/* Quick Actions */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <h4 className="font-medium text-gray-900">Quick Actions</h4>
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => setShowChat(true)}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Message Provider
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => setShowRating(true)}
                  >
                    <Star className="h-4 w-4 mr-2" />
                    Rate Experience
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Modals and Overlays */}
      {showBookingFlow && selectedRide && searchParams && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-screen overflow-y-auto">
            <BookingFlow
              ride={selectedRide}
              requestedSeats={searchParams.passengers}
              onSendRequest={handleRideRequest}
              onPayment={handlePayment}
              onCancel={handleCancelBooking}
              currentStatus={currentBookingStatus}
            />
            <div className="p-4">
              <Button 
                variant="outline" 
                onClick={() => setShowBookingFlow(false)}
                className="w-full"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {showChat && selectedRide && user && (
        <ProviderChat
          ride={selectedRide}
          currentUserId={user.id}
          currentUserName={user.name}
          isOpen={showChat}
          onClose={() => setShowChat(false)}
        />
      )}

      {showRating && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <RatingSystem
            booking={bookings[0]} // Mock booking
            onSubmitRating={handleSubmitRating}
            onClose={() => setShowRating(false)}
          />
        </div>
      )}

      {user && (
        <NotificationCenter
          userId={user.id}
          isOpen={showNotifications}
          onClose={() => setShowNotifications(false)}
        />
      )}
    </div>
  );
}
