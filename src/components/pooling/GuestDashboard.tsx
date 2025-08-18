import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePoolingAuth } from '@/providers/PoolingAuthProvider';
import { poolingAPI } from '@/services/api/poolingAPI';
import { PoolingRide, PoolingBooking, RideRequest, PoolingType } from '@/types/pooling';
import { toast } from 'sonner';
import { Info, Bell, MessageSquare, Star, MapPin } from 'lucide-react';
import type { Location } from '@/lib/locationData';

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
import { BookingList } from '@/components/guest/BookingList';

interface SearchParams {
  type: string;
  from: string;
  to: string;
  date: string;
  passengers: number;
  maxPrice?: number;
  sortBy: 'time' | 'price' | 'rating';
}

// Add Razorpay type declaration for TypeScript
// @ts-ignore
declare global {
  interface Window {
    Razorpay: any;
  }
}

// Helper to map/fallback ride from request
function getMappedRideFromRequest(req: any) {
  return {
    id: req.rideId,
    type: (req as any).type || 'car',
    providerId: (req as any).providerId || 0,
    providerName: (req as any).providerName || '',
    providerPhone: (req as any).providerPhone || '',
    fromLocation: (req as any).from_location || (req as any).fromLocation || '',
    toLocation: (req as any).to_location || (req as any).toLocation || '',
    departureTime: (req as any).departure_time || (req as any).departureTime || '',
    arrivalTime: (req as any).arrival_time || (req as any).arrivalTime || '',
    totalSeats: Number((req as any).total_seats || (req as any).totalSeats || 1),
    availableSeats: Number((req as any).available_seats || (req as any).availableSeats || 1),
    pricePerSeat: Number((req as any).price_per_seat || (req as any).pricePerSeat || 0),
    vehicleInfo: { make: '', model: '', color: '', plateNumber: '' },
    route: [],
    amenities: [],
    rules: [],
    status: (req.status || 'pending') as any,
    createdAt: (req as any).created_at || (req as any).createdAt || '',
    updatedAt: (req as any).updated_at || (req as any).updatedAt || '',
  } as any;
}

export default function GuestDashboard() {
  const navigate = useNavigate();
  const { user, logout } = usePoolingAuth();
  const [rides, setRides] = useState<PoolingRide[]>([]);
  const [bookings, setBookings] = useState<PoolingBooking[]>([]);
  const [transactions, setTransactions] = useState([]);
  const [requests, setRequests] = useState<RideRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams, setSearchParams] = useState<SearchParams | null>(null);
  const [selectedRide, setSelectedRide] = useState<PoolingRide | null>(null);
  const [showBookingFlow, setShowBookingFlow] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [currentBookingStatus, setCurrentBookingStatus] = useState<'none' | 'pending' | 'approved' | 'rejected' | 'paid' | 'completed'>('none');
  const [searchCache, setSearchCache] = useState<Map<string, PoolingRide[]>>(new Map());
  const [fromLocation, setFromLocation] = useState<Location | null>(null);
  const [toLocation, setToLocation] = useState<Location | null>(null);
  const [isLoadingRideDetails, setIsLoadingRideDetails] = useState(false);

  useEffect(() => {
    if (user) {
      loadUserData();
      // Set up real-time updates
      const interval = setInterval(loadUserData, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    if (selectedRide && requests.length > 0) {
      const latestRequest = requests.find(req => req.rideId === selectedRide.id);
      if (latestRequest && latestRequest.status === 'approved' && currentBookingStatus !== 'approved') {
        setCurrentBookingStatus('approved');
        toast.info('Your ride request has been approved! You can now proceed to payment.');
      }
    }
  }, [requests, selectedRide, currentBookingStatus]);

  const loadUserData = async () => {
    if (!user) return;
    
    try {
      const [userBookings, userTransactions, userRequests] = await Promise.all([
        poolingAPI.bookings.getByUser(user.id).catch(() => []),
        poolingAPI.wallet.getTransactions(user.id).catch(() => []),
        poolingAPI.requests.getByUser(user.id).catch(() => [])
      ]);
      setBookings(userBookings);
      setTransactions(userTransactions);
      
      // Properly format and validate ride requests
      const formattedRequests = userRequests.map((r: any) => {
        // Ensure all required fields are present
        const rideId = r.rideId || r.ride_id || 0;
        if (!rideId) {
          console.warn('Ride request missing rideId:', r);
        }
        // Find a booking for this ride and guest
        const booking = userBookings.find(
          (b) => (b.rideId === rideId || b.ride_id === rideId) && (b.userId === user.id || b.user_id === user.id)
        );
        let status = r.status || 'pending';
        let paymentStatus = (booking && (booking.payment_status || booking.paymentStatus)) || '';
        if (paymentStatus === 'paid') {
          status = 'paid';
          paymentStatus = 'paid';
        }
        return {
          ...r,
          id: r.id || 0,
          rideId,
          guestId: r.guestId || r.guest_id || user.id,
          guestName: r.guestName || r.guest_name || user.name,
          guestPhone: r.guestPhone || r.guest_phone || user.phone || '',
          guestEmail: r.guestEmail || r.guest_email || user.email,
          seatsRequested: r.seatsRequested || r.seats_requested || 1,
          status,
          paymentStatus,
          requestMessage: r.requestMessage || r.request_message || 'Ride request',
          requestedAt: r.requested_at || r.requestedAt || new Date().toISOString()
        };
      });
      
      console.log('Loaded ride requests:', formattedRequests);
      setRequests(formattedRequests);
    } catch (error) {
      console.error('Failed to load user data:', error);
      toast.error('Failed to load your data. Please refresh the page.');
    }
  };

  const handleSearch = async (params: SearchParams) => {
    setIsLoading(true);
    setSearchParams({ ...params, type: params.type as PoolingType });
    
    // Check cache first
    const cacheKey = JSON.stringify(params);
    if (searchCache.has(cacheKey)) {
      setRides(searchCache.get(cacheKey)!);
      setIsLoading(false);
      return;
    }
    
    try {
      const searchResults = await poolingAPI.rides.search({
        type: params.type as PoolingType,
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
    logout();
    navigate('/pooling/login');
  };

  // Analytics tracking
  const trackInteraction = (action: string, data?: any) => {
    console.log('Analytics:', { action, data, userId: user?.id, timestamp: new Date().toISOString() });
  };

  // Razorpay payment handler placeholder
  const handleRazorpayPayment = async (ride, seats) => {
    const amount = ride.pricePerSeat * seats * 100; // in paise

    // Find the most recent approved request for this ride
    const userRequest = requests
      .filter(r => r.rideId === ride.id && r.guestId === user?.id && r.status === 'approved')
      .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime())[0];

    if (!userRequest) {
      toast.error('No approved request found for this ride');
      return;
    }

    // 1. Create order on backend
    const orderRes = await fetch('/api/create-razorpay-order.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount }),
    });
    const orderData = await orderRes.json();
    if (!orderData.success) {
      toast.error('Failed to create Razorpay order');
      return;
    }
    const { id: order_id, amount: order_amount, currency } = orderData.order;

    // 2. Open Razorpay modal
    const options = {
      key: 'rzp_live_R6nt1S648RxpNC', // Your live key
      amount: order_amount,
      currency,
      name: 'Cabzilla Connect',
      description: `Payment for ride from ${ride.fromLocation} to ${ride.toLocation}`,
      order_id,
      handler: async function (response) {
        // 3. Verify payment on backend
        const verifyRes = await fetch('/api/verify-razorpay-payment.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
            booking_id: userRequest.id // Include the request ID as booking_id
          }),
        });
        const verifyData = await verifyRes.json();
        if (verifyData.success) {
          toast.success('Payment successful!');
          loadUserData(); // Reload bookings/requests
          setShowBookingFlow(false);
        } else {
          toast.error('Payment verification failed');
        }
      },
      prefill: {
        name: user?.name || '',
        email: user?.email || '',
        contact: user?.phone || '',
      },
      theme: { color: '#3399cc' },
    };
    const rzp = new (window as any).Razorpay(options);
    rzp.open();
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
                onFromLocationChange={setFromLocation}
                onToLocationChange={setToLocation}
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
                      pickupLocation={fromLocation || undefined}
                      dropLocation={toLocation || undefined}
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

            {/* Enhanced Booking Management Section */}
            <div className="mt-8">
              <BookingList />
            </div>

            {/* Ride Requests Section */}
            <div className="mt-8">
              <h2 className="text-lg font-semibold mb-2">My Ride Requests</h2>
              {requests.length === 0 ? (
                <div className="text-gray-500">No ride requests yet.</div>
              ) : (
                <div className="space-y-2">
                  {requests.map((req) => {
                    const isApproved = String(req.status) === 'approved';
                    // Only show Paid if status is exactly 'paid'
                    const isPaid = String(req.status) === 'paid';
                    return (
                      <div 
                        key={req.id} 
                        className="border rounded p-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition"
                        onClick={async (e) => {
                          // Prevent modal from opening if Pay button is clicked
                          if ((e.target as HTMLElement).closest('.pay-btn')) return;
                          if (isLoadingRideDetails) return;
                          if (!req.rideId) {
                            console.error('Ride request missing rideId:', req);
                            toast.error('This request is missing ride details. Please contact support.');
                            return;
                          }
                          setIsLoadingRideDetails(true);
                          try {
                            let ride = rides.find(r => r.id === req.rideId);
                            if (!ride) {
                              try {
                                let apiRes = await poolingAPI.rides.getRideDetails(req.rideId);
                                if (apiRes && typeof apiRes === 'object' && 'data' in apiRes) {
                                  ride = (apiRes as any).data;
                                } else {
                                  ride = apiRes;
                                }
                              } catch (error) {
                                ride = getMappedRideFromRequest(req);
                              }
                            }
                            // Ensure pricePerSeat is set and a number (after fetching ride details)
                            if (!ride.pricePerSeat && (ride as any).price_per_seat) {
                              ride.pricePerSeat = (ride as any).price_per_seat;
                            }
                            ride.pricePerSeat = Number(ride.pricePerSeat) || 0;
                            setSelectedRide(ride);
                            setCurrentBookingStatus(isApproved ? 'approved' : req.status);
                            setSearchParams({
                              type: ride.type,
                              from: ride.fromLocation,
                              to: ride.toLocation,
                              date: ride.departureTime ? ride.departureTime.split('T')[0] : '',
                              passengers: req.seatsRequested || 1,
                              sortBy: 'time',
                            });
                            setShowBookingFlow(true);
                          } finally {
                            setIsLoadingRideDetails(false);
                          }
                        }}
                      >
                        <div>
                          <div className="font-medium">{req.requestMessage}</div>
                          <div className="text-sm text-gray-500">
                            {String(req.status) === 'pending' && 'Pending approval'}
                            {String(req.status) === 'approved' && 'Approved!'}
                            {String(req.status) === 'rejected' && 'Rejected'}
                          </div>
                          <div className="text-xs text-gray-400">Requested on {new Date(req.requestedAt).toLocaleString()}</div>
                        </div>
                        <div className={`flex items-center gap-2`}>
                          <div className={`px-2 py-1 rounded text-xs font-semibold ${isApproved ? 'bg-green-100 text-green-700' : String(req.status) === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{isLoadingRideDetails ? 'Loading...' : req.status}</div>
                          {isApproved && !isPaid && (
                            <Button
                              className="pay-btn"
                              size="sm"
                              onClick={async (e) => {
                                e.stopPropagation();
                                setIsLoadingRideDetails(true);
                                let ride = rides.find(r => r.id === req.rideId);
                                if (!ride) {
                                  try {
                                    let apiRes = await poolingAPI.rides.getRideDetails(req.rideId);
                                    if (apiRes && typeof apiRes === 'object' && 'data' in apiRes) {
                                      ride = (apiRes as any).data;
                                    } else {
                                      ride = apiRes;
                                    }
                                  } catch (error) {
                                    toast.error('Unable to load ride details. Please try again later.');
                                    setIsLoadingRideDetails(false);
                                    return;
                                  }
                                }
                                if (!ride.pricePerSeat && (ride as any).price_per_seat) {
                                  ride.pricePerSeat = (ride as any).price_per_seat;
                                }
                                ride.pricePerSeat = Number(ride.pricePerSeat) || 0;
                                setSelectedRide(ride);
                                setCurrentBookingStatus('approved');
                                setSearchParams({
                                  type: ride.type,
                                  from: ride.fromLocation,
                                  to: ride.toLocation,
                                  date: ride.departureTime ? ride.departureTime.split('T')[0] : '',
                                  passengers: req.seatsRequested || 1,
                                  sortBy: 'time',
                                });
                                setShowBookingFlow(true);
                              }}
                            >
                              Pay
                            </Button>
                          )}
                          {isPaid && (
                            <Button className="pay-btn" size="sm" disabled variant="secondary">Paid</Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <EnhancedWallet 
              transactions={transactions} 
              onTransactionUpdate={loadUserData} 
            />
            {/* Enhanced Booking List - Now replaced with comprehensive booking management */}
            <div className="xl:hidden">
              {/* Mobile booking summary - detailed view in main content */}
              <EnhancedBookings 
                bookings={bookings}
                onViewDetails={(booking) => {
                  trackInteraction('booking_details_viewed', { bookingId: booking.id });
                }}
              />
            </div>
            
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
              requestedSeats={searchParams?.passengers || 1}
              onSendRequest={(message) => { handleRideRequest(selectedRide, message); }}
              onPayment={async () => {
                await handleRazorpayPayment(selectedRide, searchParams?.passengers || 1);
                loadUserData();
              }}
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
