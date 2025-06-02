
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, MapPin, Calendar, Users, Clock, Star, Phone } from 'lucide-react';
import { usePoolingAuth } from '@/providers/PoolingAuthProvider';
import { poolingAPI } from '@/services/api/poolingAPI';
import { PoolingRide, PoolingBooking, PoolingSearchRequest, RideRequest } from '@/types/pooling';
import { toast } from 'sonner';
import { format } from 'date-fns';

export function GuestDashboard() {
  const { user } = usePoolingAuth();
  const [searchParams, setSearchParams] = useState<PoolingSearchRequest>({
    type: 'car',
    from: '',
    to: '',
    date: '',
    passengers: 1
  });
  const [searchResults, setSearchResults] = useState<PoolingRide[]>([]);
  const [myBookings, setMyBookings] = useState<PoolingBooking[]>([]);
  const [myRequests, setMyRequests] = useState<RideRequest[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedRide, setSelectedRide] = useState<PoolingRide | null>(null);
  const [activeTab, setActiveTab] = useState<'search' | 'bookings' | 'requests'>('search');

  useEffect(() => {
    if (user?.id) {
      loadMyBookings();
      loadMyRequests();
    }
  }, [user]);

  const loadMyBookings = async () => {
    try {
      const bookings = await poolingAPI.bookings.getByUser(user!.id);
      setMyBookings(bookings);
    } catch (error) {
      console.error('Failed to load bookings:', error);
    }
  };

  const loadMyRequests = async () => {
    try {
      const requests = await poolingAPI.requests.getByUser(user!.id);
      setMyRequests(requests);
    } catch (error) {
      console.error('Failed to load requests:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchParams.from || !searchParams.to || !searchParams.date) {
      toast.error('Please fill in all search fields');
      return;
    }

    setIsSearching(true);
    try {
      const results = await poolingAPI.rides.search(searchParams);
      setSearchResults(results);
      if (results.length === 0) {
        toast.info('No rides found for your search criteria');
      }
    } catch (error) {
      toast.error('Failed to search rides');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendRequest = async (ride: PoolingRide) => {
    try {
      await poolingAPI.requests.create({
        rideId: ride.id,
        guestId: user!.id,
        guestName: user!.name,
        guestPhone: user!.phone,
        guestEmail: user!.email,
        seatsRequested: searchParams.passengers,
        status: 'pending',
        requestMessage: `I would like to book ${searchParams.passengers} seat(s) for this ride.`
      });
      toast.success('Request sent to provider');
      loadMyRequests();
    } catch (error) {
      toast.error('Failed to send request');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'approved': return 'bg-green-500';
      case 'rejected': return 'bg-red-500';
      case 'confirmed': return 'bg-blue-500';
      case 'completed': return 'bg-gray-500';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Guest Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user?.name}!</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-4 mb-6">
          <Button
            variant={activeTab === 'search' ? 'default' : 'outline'}
            onClick={() => setActiveTab('search')}
          >
            <Search className="w-4 h-4 mr-2" />
            Search Rides
          </Button>
          <Button
            variant={activeTab === 'bookings' ? 'default' : 'outline'}
            onClick={() => setActiveTab('bookings')}
          >
            <Calendar className="w-4 h-4 mr-2" />
            My Bookings ({myBookings.length})
          </Button>
          <Button
            variant={activeTab === 'requests' ? 'default' : 'outline'}
            onClick={() => setActiveTab('requests')}
          >
            <Clock className="w-4 h-4 mr-2" />
            My Requests ({myRequests.length})
          </Button>
        </div>

        {/* Search Tab */}
        {activeTab === 'search' && (
          <div className="space-y-6">
            {/* Search Form */}
            <Card>
              <CardHeader>
                <CardTitle>Find a Ride</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                  <Select value={searchParams.type} onValueChange={(value: any) => setSearchParams(prev => ({ ...prev, type: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Vehicle Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="car">Car</SelectItem>
                      <SelectItem value="bus">Bus</SelectItem>
                      <SelectItem value="shared-taxi">Shared Taxi</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Input
                    placeholder="From"
                    value={searchParams.from}
                    onChange={(e) => setSearchParams(prev => ({ ...prev, from: e.target.value }))}
                  />
                  
                  <Input
                    placeholder="To"
                    value={searchParams.to}
                    onChange={(e) => setSearchParams(prev => ({ ...prev, to: e.target.value }))}
                  />
                  
                  <Input
                    type="date"
                    value={searchParams.date}
                    onChange={(e) => setSearchParams(prev => ({ ...prev, date: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  
                  <Select value={searchParams.passengers.toString()} onValueChange={(value) => setSearchParams(prev => ({ ...prev, passengers: parseInt(value) }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6].map(num => (
                        <SelectItem key={num} value={num.toString()}>{num} passenger{num > 1 ? 's' : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Button onClick={handleSearch} disabled={isSearching} className="w-full">
                    {isSearching ? 'Searching...' : 'Search'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Search Results */}
            <div className="space-y-4">
              {searchResults.map((ride) => (
                <Card key={ride.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-4">
                          <div className="flex items-center space-x-2">
                            <MapPin className="w-4 h-4 text-gray-500" />
                            <span className="font-semibold">{ride.fromLocation}</span>
                            <span className="text-gray-500">→</span>
                            <span className="font-semibold">{ride.toLocation}</span>
                          </div>
                          <Badge>{ride.type}</Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4 text-gray-500" />
                            <span>{format(new Date(ride.departureTime), 'HH:mm')}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Users className="w-4 h-4 text-gray-500" />
                            <span>{ride.availableSeats} seats available</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Star className="w-4 h-4 text-yellow-500" />
                            <span>{ride.providerRating?.toFixed(1) || 'New'}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Phone className="w-4 h-4 text-gray-500" />
                            <span>{ride.providerName}</span>
                          </div>
                        </div>

                        {ride.amenities && ride.amenities.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-4">
                            {ride.amenities.map((amenity, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">{amenity}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-600 mb-2">
                          ₹{ride.pricePerSeat}
                        </div>
                        <div className="text-sm text-gray-500 mb-4">per seat</div>
                        <Button 
                          onClick={() => handleSendRequest(ride)}
                          disabled={ride.availableSeats < searchParams.passengers}
                        >
                          Send Request
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Bookings Tab */}
        {activeTab === 'bookings' && (
          <div className="space-y-4">
            {myBookings.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-gray-500">No bookings yet. Start by searching for rides!</p>
                </CardContent>
              </Card>
            ) : (
              myBookings.map((booking) => (
                <Card key={booking.id}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-lg mb-2">Booking #{booking.id}</h3>
                        <div className="space-y-1 text-sm text-gray-600">
                          <p><strong>Passenger:</strong> {booking.passengerName}</p>
                          <p><strong>Seats:</strong> {booking.seatsBooked}</p>
                          <p><strong>Amount:</strong> ₹{booking.totalAmount}</p>
                          <p><strong>Date:</strong> {format(new Date(booking.bookingDate), 'PPP')}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={`${getStatusColor(booking.bookingStatus)} text-white mb-2`}>
                          {booking.bookingStatus}
                        </Badge>
                        <div>
                          <Badge variant="outline">{booking.paymentStatus}</Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Requests Tab */}
        {activeTab === 'requests' && (
          <div className="space-y-4">
            {myRequests.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-gray-500">No requests sent yet. Search for rides and send requests!</p>
                </CardContent>
              </Card>
            ) : (
              myRequests.map((request) => (
                <Card key={request.id}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-lg mb-2">Request #{request.id}</h3>
                        <div className="space-y-1 text-sm text-gray-600">
                          <p><strong>Seats Requested:</strong> {request.seatsRequested}</p>
                          <p><strong>Message:</strong> {request.requestMessage}</p>
                          <p><strong>Sent:</strong> {format(new Date(request.requestedAt), 'PPP')}</p>
                          {request.responseMessage && (
                            <p><strong>Response:</strong> {request.responseMessage}</p>
                          )}
                        </div>
                      </div>
                      <Badge className={`${getStatusColor(request.status)} text-white`}>
                        {request.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
