
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  Car, 
  DollarSign, 
  TrendingUp, 
  Activity,
  Calendar,
  Clock,
  MapPin,
  Star,
  Wallet
} from 'lucide-react';
import { poolingAPI } from '@/services/api/poolingAPI';
import { PoolingUser, PoolingRide, PoolingBooking, PoolingAnalytics } from '@/types/pooling';
import { format } from 'date-fns';

export function AdminDashboard() {
  const [analytics, setAnalytics] = useState<PoolingAnalytics | null>(null);
  const [users, setUsers] = useState<PoolingUser[]>([]);
  const [rides, setRides] = useState<PoolingRide[]>([]);
  const [bookings, setBookings] = useState<PoolingBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      const [analyticsData, usersData, ridesData, bookingsData] = await Promise.all([
        poolingAPI.admin.getAnalytics(),
        poolingAPI.admin.getUsers(),
        poolingAPI.admin.getRides(),
        poolingAPI.admin.getBookings()
      ]);

      setAnalytics(analyticsData);
      setUsers(usersData);
      setRides(ridesData);
      setBookings(bookingsData);
    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'completed': return 'bg-blue-500';
      case 'cancelled': return 'bg-red-500';
      case 'confirmed': return 'bg-green-600';
      default: return 'bg-gray-400';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-500';
      case 'provider': return 'bg-blue-500';
      case 'guest': return 'bg-green-500';
      default: return 'bg-gray-400';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Pooling System Administration</p>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Users className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold">{users.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Car className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Active Rides</p>
                  <p className="text-2xl font-bold">{rides.filter(r => r.status === 'active').length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Calendar className="w-8 h-8 text-orange-600" />
                <div>
                  <p className="text-sm text-gray-600">Total Bookings</p>
                  <p className="text-2xl font-bold">{bookings.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <DollarSign className="w-8 h-8 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold">₹{bookings.reduce((sum, b) => sum + b.totalAmount, 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users ({users.length})</TabsTrigger>
            <TabsTrigger value="rides">Rides ({rides.length})</TabsTrigger>
            <TabsTrigger value="bookings">Bookings ({bookings.length})</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Activity className="w-5 h-5" />
                    <span>Recent Activity</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {bookings.slice(0, 5).map((booking) => (
                      <div key={booking.id} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <p className="font-medium">New Booking #{booking.id}</p>
                          <p className="text-sm text-gray-600">{booking.passengerName}</p>
                        </div>
                        <Badge className={`${getStatusColor(booking.bookingStatus)} text-white`}>
                          {booking.bookingStatus}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Platform Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Platform Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Total Providers</span>
                      <span className="font-bold">{users.filter(u => u.role === 'provider').length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Guests</span>
                      <span className="font-bold">{users.filter(u => u.role === 'guest').length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Completed Rides</span>
                      <span className="font-bold">{rides.filter(r => r.status === 'completed').length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Success Rate</span>
                      <span className="font-bold">
                        {rides.length > 0 ? Math.round((rides.filter(r => r.status === 'completed').length / rides.length) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded">
                      <div>
                        <h3 className="font-semibold">{user.name}</h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span>{user.email}</span>
                          <span>{user.phone}</span>
                          <span>Joined: {format(new Date(user.createdAt), 'PP')}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={`${getRoleColor(user.role)} text-white`}>
                          {user.role}
                        </Badge>
                        <Badge variant={user.isActive ? "default" : "destructive"}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rides Tab */}
          <TabsContent value="rides">
            <Card>
              <CardHeader>
                <CardTitle>Ride Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {rides.map((ride) => (
                    <div key={ride.id} className="p-4 border rounded">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <MapPin className="w-4 h-4 text-gray-500" />
                            <span className="font-semibold">{ride.fromLocation} → {ride.toLocation}</span>
                            <Badge>{ride.type}</Badge>
                          </div>
                          <div className="text-sm text-gray-600">
                            Provider: {ride.providerName} | Departure: {format(new Date(ride.departureTime), 'PPP p')}
                          </div>
                        </div>
                        <Badge className={`${getStatusColor(ride.status)} text-white`}>
                          {ride.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Available Seats:</span>
                          <p className="font-medium">{ride.availableSeats}/{ride.totalSeats}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Price per Seat:</span>
                          <p className="font-medium">₹{ride.pricePerSeat}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Provider Rating:</span>
                          <p className="font-medium flex items-center">
                            <Star className="w-3 h-3 text-yellow-500 mr-1" />
                            {ride.providerRating?.toFixed(1) || 'New'}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600">Revenue:</span>
                          <p className="font-medium">₹{(ride.totalSeats - ride.availableSeats) * ride.pricePerSeat}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bookings Tab */}
          <TabsContent value="bookings">
            <Card>
              <CardHeader>
                <CardTitle>Booking Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {bookings.map((booking) => (
                    <div key={booking.id} className="p-4 border rounded">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-semibold">Booking #{booking.id}</h3>
                          <div className="text-sm text-gray-600">
                            {booking.passengerName} | {booking.passengerPhone} | {booking.passengerEmail}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Badge className={`${getStatusColor(booking.bookingStatus)} text-white`}>
                            {booking.bookingStatus}
                          </Badge>
                          <Badge variant="outline">{booking.paymentStatus}</Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Seats Booked:</span>
                          <p className="font-medium">{booking.seatsBooked}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Total Amount:</span>
                          <p className="font-medium">₹{booking.totalAmount}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Booking Date:</span>
                          <p className="font-medium">{format(new Date(booking.bookingDate), 'PP')}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Can Cancel:</span>
                          <p className="font-medium">{booking.canCancelFree ? 'Yes' : 'No'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue by Vehicle Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {['car', 'bus', 'shared-taxi'].map((type) => {
                      const typeRevenue = bookings
                        .filter(b => rides.find(r => r.id === b.rideId)?.type === type)
                        .reduce((sum, b) => sum + b.totalAmount, 0);
                      return (
                        <div key={type} className="flex justify-between items-center">
                          <span className="capitalize">{type.replace('-', ' ')}</span>
                          <span className="font-bold">₹{typeRevenue}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>System Health</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Active Users</span>
                      <span className="font-bold">{users.filter(u => u.isActive).length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pending Bookings</span>
                      <span className="font-bold">{bookings.filter(b => b.bookingStatus === 'pending').length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Payment Success Rate</span>
                      <span className="font-bold">
                        {bookings.length > 0 ? Math.round((bookings.filter(b => b.paymentStatus === 'paid').length / bookings.length) * 100) : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Average Rating</span>
                      <span className="font-bold">
                        {rides.length > 0 ? (rides.reduce((sum, r) => sum + (r.providerRating || 0), 0) / rides.filter(r => r.providerRating).length).toFixed(1) : 'N/A'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
