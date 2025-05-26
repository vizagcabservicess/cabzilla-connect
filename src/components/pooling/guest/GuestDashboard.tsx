
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, 
  MapPin, 
  Users, 
  Star, 
  Phone, 
  Mail, 
  MessageCircle, 
  Calendar,
  CreditCard,
  Car,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { usePoolingAuth } from '@/providers/PoolingAuthProvider';
import { GuestDashboardData, RideRequest, GuestBooking } from '@/types/poolingGuest';
import { toast } from 'sonner';

export const GuestDashboard: React.FC = () => {
  const { user } = usePoolingAuth();
  const [dashboardData, setDashboardData] = useState<GuestDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;
    
    try {
      // Mock data for now - replace with actual API call
      const mockData: GuestDashboardData = {
        activeBookings: [
          {
            id: 1,
            requestId: 1,
            rideId: 101,
            guestId: user.id,
            seatsBooked: 2,
            totalAmount: 800,
            paymentStatus: 'paid',
            paymentDate: '2024-01-15T10:30:00Z',
            bookingStatus: 'confirmed',
            contactsUnlocked: true,
            providerPhone: '+91 9876543210',
            providerEmail: 'provider@example.com',
            createdAt: '2024-01-15T10:30:00Z',
            updatedAt: '2024-01-15T10:30:00Z'
          }
        ],
        pendingRequests: [
          {
            id: 2,
            rideId: 102,
            guestId: user.id,
            guestName: user.name,
            guestPhone: user.phone || '',
            guestEmail: user.email,
            seatsRequested: 1,
            status: 'pending',
            requestDate: '2024-01-16T08:00:00Z',
            createdAt: '2024-01-16T08:00:00Z',
            updatedAt: '2024-01-16T08:00:00Z'
          }
        ],
        completedRides: [],
        totalRides: 5,
        averageRating: 4.5
      };
      
      setDashboardData(mockData);
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequest = async (requestId: number) => {
    try {
      // API call to cancel request
      toast.success('Request cancelled successfully');
      loadDashboardData();
    } catch (error) {
      toast.error('Failed to cancel request');
    }
  };

  const handlePayment = async (booking: GuestBooking) => {
    try {
      // Implement payment flow
      toast.success('Redirecting to payment...');
    } catch (error) {
      toast.error('Payment failed');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'paid':
      case 'confirmed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'confirmed':
      case 'paid':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-600">Failed to load dashboard data</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-lg">
                {user?.name?.split(' ').map(n => n[0]).join('') || 'G'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">Welcome back, {user?.name}!</h1>
              <p className="text-gray-600">Track your rides and manage bookings</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{dashboardData.totalRides}</div>
              <p className="text-sm text-gray-600">Total Rides</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1">
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                <span className="text-xl font-bold">{dashboardData.averageRating}</span>
              </div>
              <p className="text-sm text-gray-600">Your Rating</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dashboard Tabs */}
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active">
            Active Bookings ({dashboardData.activeBookings.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending Requests ({dashboardData.pendingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="history">
            Ride History ({dashboardData.completedRides.length})
          </TabsTrigger>
        </TabsList>

        {/* Active Bookings */}
        <TabsContent value="active" className="space-y-4">
          {dashboardData.activeBookings.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No active bookings</p>
                <Button className="mt-4" onClick={() => window.location.href = '/pooling'}>
                  Find Rides
                </Button>
              </CardContent>
            </Card>
          ) : (
            dashboardData.activeBookings.map((booking) => (
              <Card key={booking.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(booking.bookingStatus)}>
                        {getStatusIcon(booking.bookingStatus)}
                        {booking.bookingStatus.charAt(0).toUpperCase() + booking.bookingStatus.slice(1)}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        Booking #{booking.id}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">₹{booking.totalAmount}</div>
                      <div className="text-sm text-gray-500">{booking.seatsBooked} seats</div>
                    </div>
                  </div>

                  {booking.contactsUnlocked && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-green-600" />
                        <span className="font-medium">Provider:</span>
                        <a href={`tel:${booking.providerPhone}`} className="text-blue-600 hover:underline">
                          {booking.providerPhone}
                        </a>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-green-600" />
                        <a href={`mailto:${booking.providerEmail}`} className="text-blue-600 hover:underline">
                          {booking.providerEmail}
                        </a>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <MessageCircle className="h-4 w-4 mr-1" />
                      Message Provider
                    </Button>
                    {booking.bookingStatus === 'completed' && (
                      <Button variant="outline" size="sm">
                        <Star className="h-4 w-4 mr-1" />
                        Rate Ride
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Pending Requests */}
        <TabsContent value="pending" className="space-y-4">
          {dashboardData.pendingRequests.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No pending requests</p>
              </CardContent>
            </Card>
          ) : (
            dashboardData.pendingRequests.map((request) => (
              <Card key={request.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(request.status)}>
                        {getStatusIcon(request.status)}
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        Request #{request.id}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">{request.seatsRequested} seats</div>
                      <div className="text-xs text-gray-400">
                        {new Date(request.requestDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {request.requestMessage && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-700">"{request.requestMessage}"</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {request.status === 'pending' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleCancelRequest(request.id)}
                      >
                        Cancel Request
                      </Button>
                    )}
                    {request.status === 'approved' && request.paymentLink && (
                      <Button size="sm">
                        <CreditCard className="h-4 w-4 mr-1" />
                        Pay Now
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Ride History */}
        <TabsContent value="history" className="space-y-4">
          {dashboardData.completedRides.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No completed rides yet</p>
              </CardContent>
            </Card>
          ) : (
            dashboardData.completedRides.map((booking) => (
              <Card key={booking.id}>
                <CardContent className="p-6">
                  {/* Ride history content */}
                  <p>Completed ride #{booking.id}</p>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
