
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  Car, 
  Bus, 
  Users, 
  Calendar,
  MapPin,
  Star,
  TrendingUp,
  Clock,
  Phone,
  Mail,
  IndianRupee,
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface DashboardStats {
  totalRides: number;
  activeRides: number;
  totalBookings: number;
  totalRevenue: number;
  averageRating: number;
}

interface PoolingRide {
  id: number;
  type: 'car' | 'bus' | 'shared-taxi';
  fromLocation: string;
  toLocation: string;
  departureTime: string;
  totalSeats: number;
  availableSeats: number;
  pricePerSeat: number;
  providerName: string;
  status: string;
}

interface PoolingBooking {
  id: number;
  rideId: number;
  passengerName: string;
  passengerPhone: string;
  seatsBooked: number;
  totalAmount: number;
  bookingStatus: string;
  paymentStatus: string;
  bookingDate: string;
  fromLocation: string;
  toLocation: string;
  departureTime: string;
}

export default function PoolingDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalRides: 0,
    activeRides: 0,
    totalBookings: 0,
    totalRevenue: 0,
    averageRating: 0
  });
  const [rides, setRides] = useState<PoolingRide[]>([]);
  const [bookings, setBookings] = useState<PoolingBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // This would be replaced with actual API calls
      // For now, using mock data
      setTimeout(() => {
        setStats({
          totalRides: 125,
          activeRides: 45,
          totalBookings: 380,
          totalRevenue: 185000,
          averageRating: 4.3
        });

        setRides([
          {
            id: 1,
            type: 'car',
            fromLocation: 'Visakhapatnam',
            toLocation: 'Hyderabad',
            departureTime: '2024-01-20T09:00:00',
            totalSeats: 4,
            availableSeats: 2,
            pricePerSeat: 450,
            providerName: 'Ravi Kumar',
            status: 'active'
          },
          {
            id: 2,
            type: 'bus',
            fromLocation: 'Vijayawada',
            toLocation: 'Chennai',
            departureTime: '2024-01-20T14:30:00',
            totalSeats: 45,
            availableSeats: 12,
            pricePerSeat: 380,
            providerName: 'APSRTC',
            status: 'active'
          }
        ]);

        setBookings([
          {
            id: 1,
            rideId: 1,
            passengerName: 'John Doe',
            passengerPhone: '+91 9876543210',
            seatsBooked: 2,
            totalAmount: 900,
            bookingStatus: 'confirmed',
            paymentStatus: 'paid',
            bookingDate: '2024-01-19T10:30:00',
            fromLocation: 'Visakhapatnam',
            toLocation: 'Hyderabad',
            departureTime: '2024-01-20T09:00:00'
          }
        ]);

        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'car': return <Car className="h-4 w-4" />;
      case 'bus': return <Bus className="h-4 w-4" />;
      case 'shared-taxi': return <Users className="h-4 w-4" />;
      default: return <Car className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'car': return 'bg-blue-100 text-blue-800';
      case 'bus': return 'bg-green-100 text-green-800';
      case 'shared-taxi': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Pooling Dashboard</h1>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add New Ride
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Car className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Rides</p>
                <p className="text-2xl font-bold">{stats.totalRides}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Active Rides</p>
                <p className="text-2xl font-bold">{stats.activeRides}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                <p className="text-2xl font-bold">{stats.totalBookings}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <IndianRupee className="h-8 w-8 text-yellow-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold">₹{stats.totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Star className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Rating</p>
                <p className="text-2xl font-bold">{stats.averageRating}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="rides" className="space-y-6">
        <TabsList>
          <TabsTrigger value="rides">Manage Rides</TabsTrigger>
          <TabsTrigger value="bookings">Manage Bookings</TabsTrigger>
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="rides">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>All Rides</CardTitle>
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search rides..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  <Button variant="outline" size="sm">
                    <Filter className="mr-2 h-4 w-4" />
                    Filter
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {rides.map((ride) => (
                  <div key={ride.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Badge className={getTypeColor(ride.type)}>
                        {getTypeIcon(ride.type)}
                        <span className="ml-1">{ride.type}</span>
                      </Badge>
                      <div>
                        <p className="font-medium">{ride.fromLocation} → {ride.toLocation}</p>
                        <p className="text-sm text-gray-600">
                          {format(new Date(ride.departureTime), 'MMM dd, yyyy • HH:mm')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="font-medium">₹{ride.pricePerSeat}/seat</p>
                        <p className="text-sm text-gray-600">
                          {ride.availableSeats}/{ride.totalSeats} available
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" className="text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bookings">
          <Card>
            <CardHeader>
              <CardTitle>Recent Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {bookings.map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div>
                        <p className="font-medium">{booking.passengerName}</p>
                        <p className="text-sm text-gray-600">{booking.passengerPhone}</p>
                      </div>
                      <div>
                        <p className="font-medium">{booking.fromLocation} → {booking.toLocation}</p>
                        <p className="text-sm text-gray-600">
                          {booking.seatsBooked} seats • ₹{booking.totalAmount}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex flex-col space-y-1">
                        <Badge className={getStatusColor(booking.bookingStatus)}>
                          {booking.bookingStatus}
                        </Badge>
                        <Badge className={getStatusColor(booking.paymentStatus)}>
                          {booking.paymentStatus}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Phone className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="providers">
          <Card>
            <CardHeader>
              <CardTitle>Provider Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Provider management interface coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Analytics & Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Analytics dashboard coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
