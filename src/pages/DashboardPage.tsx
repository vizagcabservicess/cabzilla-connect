import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Book, CircleOff, RefreshCw, Calendar, MapPin, Car, ShieldAlert, LogOut, Info } from "lucide-react";
import { bookingAPI, authAPI } from '@/services/api';
import { Booking, BookingStatus, DashboardMetrics as DashboardMetricsType } from '@/types/api';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { DashboardMetrics } from '@/components/admin/DashboardMetrics';
import { ApiErrorFallback } from "@/components/ApiErrorFallback";

const MAX_RETRIES = 1;

export default function DashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<{ id: number; name: string; email: string; role: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [adminMetrics, setAdminMetrics] = useState<DashboardMetricsType | null>(null);
  const [isLoadingAdminMetrics, setIsLoadingAdminMetrics] = useState(false);
  const [adminMetricsError, setAdminMetricsError] = useState<Error | null>(null);
  const [showFallbackBookings, setShowFallbackBookings] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      if (!authAPI.isAuthenticated()) {
        console.log('User not authenticated, redirecting to login');
        navigate('/login', { state: { from: location.pathname } });
        return;
      }

      try {
        const userData = await authAPI.getCurrentUser();
        if (userData) {
          console.log('User data loaded:', { ...userData, token: userData.token ? '(token exists)' : '(no token)' });
          setUser({
            id: userData.id || 0,
            name: userData.name || '',
            email: userData.email || '',
            role: userData.role || 'user'
          });
          setIsAdmin(userData.role === 'admin');
        } else {
          throw new Error('User data not found');
        }
      } catch (error) {
        console.error('Error getting user data:', error);
        toast.error('Error loading user data. Please try logging in again.');
      }
    };

    checkAuth();
  }, [navigate, location.pathname]);

  const fetchBookings = useCallback(async () => {
    if (!authAPI.isAuthenticated()) {
      console.log('Not authenticated, redirecting to login');
      navigate('/login');
      return;
    }

    try {
      setIsRefreshing(true);
      setError(null);
      
      console.log('Fetching user bookings, authenticated:', authAPI.isAuthenticated(), 'isAdmin:', isAdmin);
      const token = localStorage.getItem('authToken');
      console.log('Current token status:', token ? `${token.substring(0, 15)}...` : 'No token');
      
      const data = await bookingAPI.getUserBookings();
      console.log('Bookings data received:', data);
      
      if (Array.isArray(data) && data.length > 0) {
        setBookings(data);
        setShowFallbackBookings(false);
      } else {
        console.log('No bookings found, using fallback data');
        setShowFallbackBookings(true);
        setBookings(getFallbackBookings());
      }
      
      setRetryCount(0);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setError(error instanceof Error ? error : new Error('Failed to fetch bookings'));
      
      if (retryCount < MAX_RETRIES) {
        toast.error('Error loading bookings. Retrying...');
        setRetryCount(prev => prev + 1);
        
        setTimeout(() => {
          fetchBookings();
        }, 3000);
      } else {
        console.log('Using fallback booking data after max retries');
        setShowFallbackBookings(true);
        setBookings(getFallbackBookings());
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [navigate, retryCount, isAdmin]);

  const fetchAdminMetrics = useCallback(async () => {
    if (!isAdmin) return;
    
    try {
      setIsLoadingAdminMetrics(true);
      setAdminMetricsError(null);
      
      console.log('Fetching admin metrics...');
      const token = localStorage.getItem('authToken');
      console.log('Admin metrics token status:', token ? `${token.substring(0, 15)}...` : 'No token');
      
      const data = await bookingAPI.getAdminDashboardMetrics('week');
      console.log('Admin metrics received:', data);
      
      if (data) {
        setAdminMetrics(data);
      } else {
        console.warn('No admin metrics data received');
        setAdminMetrics(getFallbackMetrics());
      }
    } catch (error) {
      console.error('Error fetching admin metrics:', error);
      setAdminMetricsError(error instanceof Error ? error : new Error('Failed to fetch admin metrics'));
      
      console.log('Using fallback metrics data after error');
      setAdminMetrics(getFallbackMetrics());
    } finally {
      setIsLoadingAdminMetrics(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  useEffect(() => {
    if (isAdmin) {
      fetchAdminMetrics();
    }
  }, [isAdmin, fetchAdminMetrics]);

  const handleLogout = () => {
    authAPI.logout();
    navigate('/login');
    toast.success('Logged out successfully');
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getFallbackBookings = (): Booking[] => {
    return [
      {
        id: 1001,
        user_id: user?.id || 1,
        bookingNumber: 'BK12345',
        pickupLocation: 'Airport Terminal 1',
        dropLocation: 'Taj Hotel, City Center',
        pickupDate: new Date().toISOString(),
        returnDate: null,
        cabType: 'sedan',
        distance: 15.5,
        tripType: 'airport',
        tripMode: 'one-way',
        totalAmount: 1500,
        status: 'confirmed',
        passengerName: user?.name || 'Demo User',
        passengerPhone: '9876543210',
        passengerEmail: user?.email || 'demo@example.com',
        driverName: 'Raj Kumar',
        driverPhone: '9876543211',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 1002,
        user_id: user?.id || 1,
        bookingNumber: 'BK12346',
        pickupLocation: 'Home Address',
        dropLocation: 'Office Complex',
        pickupDate: new Date(Date.now() + 86400000).toISOString(),
        returnDate: null,
        cabType: 'suv',
        distance: 8.2,
        tripType: 'local',
        tripMode: 'one-way',
        totalAmount: 950,
        status: 'pending',
        passengerName: user?.name || 'Demo User',
        passengerPhone: '9876543210',
        passengerEmail: user?.email || 'demo@example.com',
        driverName: null,
        driverPhone: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
  };

  const getFallbackMetrics = (): DashboardMetricsType => {
    return {
      totalBookings: 24,
      pendingBookings: 5,
      completedBookings: 12,
      todayBookings: 3,
      recentBookings: [],
      monthlyRevenue: 28000,
      totalRevenue: 35600,
      activeRides: 3,
      availableDrivers: 8,
      busyDrivers: 6,
      avgRating: 4.7,
      upcomingRides: 5,
      availableStatuses: ['pending', 'confirmed', 'completed', 'cancelled'],
      currentFilter: 'all'
    };
  };

  if (isLoading && !error) {
    return (
      <div className="container mx-auto py-10 px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-gray-500">Loading your bookings...</p>
          </div>
        </div>
        
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-8 w-[250px]" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-[80%]" />
                  <Skeleton className="h-4 w-[60%]" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error && retryCount >= MAX_RETRIES && !showFallbackBookings) {
    return (
      <ApiErrorFallback 
        error={error} 
        onRetry={fetchBookings}
        title="Error Loading Dashboard"
        description="We couldn't load your bookings. Please try again."
      />
    );
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-500">Welcome back, {user?.name || 'User'}</p>
        </div>
        <div className="flex flex-col md:flex-row gap-2">
          <Button variant="outline" size="sm" onClick={fetchBookings} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => navigate('/')}>Book New Cab</Button>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-1" />
            Logout
          </Button>
        </div>
      </div>

      {showFallbackBookings && (
        <Alert className="mb-8 bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-700">Demo Mode</AlertTitle>
          <AlertDescription className="text-blue-600">
            Showing sample booking data. Your real bookings will appear here once available.
          </AlertDescription>
        </Alert>
      )}

      {isAdmin && (
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-amber-500" />
                Admin Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-gray-600">You have admin privileges. <Button variant="link" className="p-0 h-auto text-blue-600" onClick={() => navigate('/admin')}>Go to Admin Dashboard</Button></p>
              
              <DashboardMetrics 
                metrics={adminMetrics}
                isLoading={isLoadingAdminMetrics}
                error={adminMetricsError}
                onFilterChange={(status: BookingStatus | 'all') => {
                  console.log('Filtering by status:', status);
                }}
                selectedPeriod="week"
              />
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all" className="flex items-center gap-1">
            <Book className="h-4 w-4" /> All Bookings
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="flex items-center gap-1">
            <Calendar className="h-4 w-4" /> Upcoming
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-1">
            <Car className="h-4 w-4" /> Completed
          </TabsTrigger>
          <TabsTrigger value="cancelled" className="flex items-center gap-1">
            <CircleOff className="h-4 w-4" /> Cancelled
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="all">
          <BookingsList 
            bookings={bookings} 
            isRefreshing={isRefreshing} 
            formatDate={formatDate}
            getStatusColor={getStatusColor}
          />
        </TabsContent>
        
        <TabsContent value="upcoming">
          <BookingsList 
            bookings={bookings.filter(b => ['pending', 'confirmed'].includes(b.status))} 
            isRefreshing={isRefreshing}
            formatDate={formatDate}
            getStatusColor={getStatusColor}
            emptyMessage="No upcoming bookings found."
          />
        </TabsContent>
        
        <TabsContent value="completed">
          <BookingsList 
            bookings={bookings.filter(b => b.status === 'completed')} 
            isRefreshing={isRefreshing}
            formatDate={formatDate}
            getStatusColor={getStatusColor}
            emptyMessage="No completed bookings found."
          />
        </TabsContent>
        
        <TabsContent value="cancelled">
          <BookingsList 
            bookings={bookings.filter(b => b.status === 'cancelled')} 
            isRefreshing={isRefreshing}
            formatDate={formatDate}
            getStatusColor={getStatusColor}
            emptyMessage="No cancelled bookings found."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface BookingsListProps {
  bookings: Booking[];
  isRefreshing: boolean;
  formatDate: (date: string) => string;
  getStatusColor: (status: string) => string;
  emptyMessage?: string;
}

function BookingsList({ bookings, isRefreshing, formatDate, getStatusColor, emptyMessage = "No bookings found." }: BookingsListProps) {
  const navigate = useNavigate();
  
  if (isRefreshing) {
    return (
      <div className="flex justify-center items-center py-10">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }
  
  if (bookings.length === 0) {
    return (
      <Alert className="mt-4">
        <Info className="h-4 w-4" />
        <AlertTitle>No Bookings</AlertTitle>
        <AlertDescription>{emptyMessage}</AlertDescription>
      </Alert>
    );
  }
  
  return (
    <ScrollArea className="h-[600px] mt-4">
      <div className="space-y-4">
        {bookings.map((booking) => (
          <Card key={booking.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/booking/${booking.id}`)}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">Booking #{booking.bookingNumber}</CardTitle>
                  <p className="text-sm text-gray-500">{formatDate(booking.pickupDate)}</p>
                </div>
                <Badge className={getStatusColor(booking.status)}>
                  {booking.status.charAt(0).toUpperCase() + booking.status.slice(1).replace('_', ' ')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-gray-500 mt-1" />
                  <div>
                    <p className="font-medium">From: {booking.pickupLocation}</p>
                    {booking.dropLocation && <p className="text-gray-600">To: {booking.dropLocation}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Car className="h-4 w-4 text-gray-500" />
                  <p>{booking.cabType} - {booking.tripType} ({booking.tripMode})</p>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <p className="font-semibold">₹{booking.totalAmount.toLocaleString('en-IN')}</p>
                  <Button variant="outline" size="sm" onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/booking/${booking.id}`);
                  }}>
                    View Details
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}
