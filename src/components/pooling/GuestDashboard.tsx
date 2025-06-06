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
import { PoolingRide, PoolingBooking, PoolingType, RequestStatus } from '@/types/pooling';
import { toast } from 'sonner';
import { Search, MapPin, Clock, Users, Star, LogOut, Wallet, Minus, CreditCard, IndianRupee } from 'lucide-react';

function safeToFixed(value, digits = 2, fallback = '0.00') {
  const num = Number(value);
  return isNaN(num) ? fallback : num.toFixed(digits);
}

export default function GuestDashboard() {
  const navigate = useNavigate();
  const { user, logout, walletData, setWalletData } = usePoolingAuth();
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
  const [transactions, setTransactions] = useState([]);
  const [withdrawAmount, setWithdrawAmount] = useState('');

  useEffect(() => {
    if (user) {
      loadUserBookings();
      poolingAPI.wallet.getTransactions(user.id).then(setTransactions);
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
    try {
      toast.info('handleBookRide triggered for ride: ' + ride.id);
      if (!user) return;

      const requestPayload = {
        rideId: ride.id,
        guestId: user.id,
        guestName: user.name,
        guestPhone: user.phone || '',
        guestEmail: user.email,
        seatsRequested: searchForm.passengers,
        status: 'pending' as RequestStatus
      };
      console.log('Sending ride request:', { rideId: ride.id, request: requestPayload });
      toast.info('About to call poolingAPI.requests.create');
      alert('About to call poolingAPI.requests.create');
      debugger;
      console.log('poolingAPI.requests:', poolingAPI.requests);
      console.log('poolingAPI.requests.create:', poolingAPI.requests.create);
      console.log('About to call poolingAPI.requests.create');
      const response = await poolingAPI.requests.create(requestPayload);
      console.log('API call response:', response);
      toast.success('Ride request sent! Wait for provider approval.');
      loadUserBookings();
    } catch (error) {
      console.error('handleBookRide: unexpected error', error);
      toast.error('Unexpected error in handleBookRide');
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

  const handleWalletWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!user || !amount || amount <= 0) return;
    try {
      await poolingAPI.wallet.withdraw(user.id, amount);
      // Refresh wallet balance
      const updatedWallet = await poolingAPI.wallet.getBalance(user.id);
      if (typeof setWalletData === 'function') setWalletData(updatedWallet);
      // Refresh transactions
      const updatedTransactions = await poolingAPI.wallet.getTransactions(user.id);
      setTransactions(updatedTransactions);
      setWithdrawAmount('');
      toast.success('Withdrawal successful!');
    } catch (error) {
      toast.error('Failed to process withdrawal');
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
                Wallet: ₹{safeToFixed(user?.walletBalance, 2, '0.00')}
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
          {/* Wallet Section */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Wallet className="h-5 w-5" />
                  <span>Wallet</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <p className="text-sm text-gray-600">Available Balance</p>
                  <p className="text-2xl font-bold text-green-600">₹{walletData?.data?.balance || 0}</p>
                </div>
                <div className="mb-4">
                  <Label htmlFor="withdraw-amount">Withdraw Amount (₹)</Label>
                  <Input
                    id="withdraw-amount"
                    type="number"
                    placeholder="Enter amount"
                    value={withdrawAmount}
                    onChange={e => setWithdrawAmount(e.target.value)}
                    max={walletData?.data?.balance || 0}
                  />
                  <Button
                    onClick={handleWalletWithdraw}
                    className="w-full mt-2"
                    variant="outline"
                    disabled={
                      !withdrawAmount ||
                      isNaN(Number(withdrawAmount)) ||
                      Number(withdrawAmount) <= 0 ||
                      Number(withdrawAmount) > (walletData?.data?.balance || 0)
                    }
                  >
                    <IndianRupee className="mr-2 h-4 w-4" />
                    Withdraw
                  </Button>
                </div>
                <div>
                  <CardTitle className="text-base mb-2">Transaction History</CardTitle>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {!Array.isArray(transactions) || transactions.length === 0 ? (
                      <p className="text-gray-600 text-center py-2">No transactions yet</p>
                    ) : (
                      Array.isArray(transactions) && transactions.map(transaction => (
                        <div key={transaction.id} className="flex items-center justify-between p-2 border rounded-lg">
                          <div>
                            <p className="font-medium">{transaction.description}</p>
                            <p className="text-xs text-gray-600">{new Date(transaction.createdAt).toLocaleString()}</p>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold ${transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                              {transaction.type === 'credit' ? '+' : '-'}₹{transaction.amount}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

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
            {Array.isArray(rides) && rides.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Available Rides ({rides.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Array.isArray(rides) && rides.map((ride) => (
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
                {!Array.isArray(bookings) || bookings.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No bookings yet</p>
                ) : (
                  <div className="space-y-3">
                    {Array.isArray(bookings) && bookings.slice(0, 5).map((booking) => (
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
                    {Array.isArray(bookings) && bookings.length > 5 && (
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
