
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { usePoolingAuth } from '@/providers/PoolingAuthProvider';
import { poolingAPI } from '@/services/api/poolingAPI';
import { PoolingRide, PoolingBooking, PoolingType } from '@/types/pooling';
import { toast } from 'sonner';
import { Search, MapPin, Clock, Users, Star, LogOut } from 'lucide-react';

export default function GuestDashboard() {
  const navigate = useNavigate();
  const { user, logout } = usePoolingAuth();
  const [rides, setRides] = useState<PoolingRide[]>([]);
  const [bookings, setBookings] = useState<PoolingBooking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchForm, setSearchForm] = useState({
    type: 'car' as PoolingType,
    from: '',
    to: '',
    date: '',
    passengers: 1
  });

  useEffect(() => {
    if (user) {
      loadUserBookings();
    }
  }, [user]);

  const loadUserBookings = async () => {
    if (!user) return;
    
    try {
      const userBookings = await poolingAPI.bookings.getByUser(user.id);
      setBookings(userBookings);
    } catch (error) {
      console.error('Failed to load bookings:', error);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchForm.from || !searchForm.to || !searchForm.date) {
      toast.error('Please fill all required fields');
      return;
    }

    setIsLoading(true);
    try {
      const searchResults = await poolingAPI.rides.search({
        ...searchForm,
        sortBy: 'time'
      });
      setRides(searchResults);
      toast.success(`Found ${searchResults.length} rides`);
    } catch (error) {
      toast.error('Failed to search rides');
      setRides([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBookRide = async (ride: PoolingRide) => {
    if (!user) return;

    try {
      await poolingAPI.requests.create({
        rideId: ride.id,
        guestId: user.id,
        guestName: user.name,
        guestPhone: user.phone || '',
        guestEmail: user.email,
        seatsRequested: searchForm.passengers,
        status: 'pending'
      });
      toast.success('Ride request sent! Wait for provider approval.');
      loadUserBookings();
    } catch (error) {
      toast.error('Failed to send ride request');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/pooling/login');
  };

  const getBookingStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-xl font-semibold">Guest Dashboard</h1>
              <p className="text-sm text-gray-600">Welcome, {user?.name}</p>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="outline">
                Wallet: ₹{user?.walletBalance?.toFixed(2) || '0.00'}
              </Badge>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Search Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Search className="h-5 w-5 mr-2" />
                  Search Rides
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSearch} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="type">Vehicle Type</Label>
                      <Select value={searchForm.type} onValueChange={(value: PoolingType) => setSearchForm({...searchForm, type: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="car">Car</SelectItem>
                          <SelectItem value="shared-taxi">Shared Taxi</SelectItem>
                          <SelectItem value="bus">Bus</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="passengers">Passengers</Label>
                      <Input
                        id="passengers"
                        type="number"
                        min="1"
                        max="8"
                        value={searchForm.passengers}
                        onChange={(e) => setSearchForm({...searchForm, passengers: parseInt(e.target.value)})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="from">From</Label>
                      <Input
                        id="from"
                        placeholder="Enter pickup location"
                        value={searchForm.from}
                        onChange={(e) => setSearchForm({...searchForm, from: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="to">To</Label>
                      <Input
                        id="to"
                        placeholder="Enter destination"
                        value={searchForm.to}
                        onChange={(e) => setSearchForm({...searchForm, to: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="date">Travel Date</Label>
                    <Input
                      id="date"
                      type="datetime-local"
                      value={searchForm.date}
                      onChange={(e) => setSearchForm({...searchForm, date: e.target.value})}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Searching...' : 'Search Rides'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Search Results */}
            {rides.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Available Rides ({rides.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {rides.map((ride) => (
                      <div key={ride.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center text-lg font-semibold mb-2">
                              <MapPin className="h-4 w-4 mr-1" />
                              {ride.fromLocation} → {ride.toLocation}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                              <div className="flex items-center">
                                <Clock className="h-4 w-4 mr-1" />
                                {new Date(ride.departureTime).toLocaleString()}
                              </div>
                              <div className="flex items-center">
                                <Users className="h-4 w-4 mr-1" />
                                {ride.availableSeats} seats available
                              </div>
                              <div className="flex items-center">
                                <Star className="h-4 w-4 mr-1" />
                                Provider: {ride.providerName}
                              </div>
                            </div>
                            <div className="mt-2">
                              <span className="text-lg font-bold text-green-600">
                                ₹{ride.pricePerSeat} per seat
                              </span>
                            </div>
                          </div>
                          <Button 
                            onClick={() => handleBookRide(ride)}
                            disabled={ride.availableSeats < searchForm.passengers}
                          >
                            Request Booking
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* My Bookings */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>My Bookings</CardTitle>
              </CardHeader>
              <CardContent>
                {bookings.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No bookings yet</p>
                ) : (
                  <div className="space-y-3">
                    {bookings.slice(0, 5).map((booking) => (
                      <div key={booking.id} className="border rounded p-3">
                        <div className="flex justify-between items-start mb-2">
                          <div className="text-sm font-medium">
                            Booking #{booking.id}
                          </div>
                          <Badge className={getBookingStatusColor(booking.bookingStatus)}>
                            {booking.bookingStatus}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600">
                          <div>{booking.seatsBooked} seat(s)</div>
                          <div>₹{booking.totalAmount}</div>
                          <div>{new Date(booking.bookingDate).toLocaleDateString()}</div>
                        </div>
                      </div>
                    ))}
                    {bookings.length > 5 && (
                      <Button variant="outline" size="sm" className="w-full">
                        View All Bookings
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
