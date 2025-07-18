import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Book, CircleOff, RefreshCw, Calendar, MapPin, Car, ShieldAlert, LogOut, Info, AlertTriangle, Settings, Timer, Clock } from "lucide-react";
import { bookingAPI } from '@/services/api';
import { authAPI } from '@/services/api/authAPI';
import { apiHealthCheck } from '@/services/api/healthCheck';
import { Booking, BookingStatus, DashboardMetrics as DashboardMetricsType } from '@/types/api';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { DashboardMetrics } from '@/components/admin/DashboardMetrics';
import { ApiErrorFallback } from "@/components/ApiErrorFallback";
import { useAuth } from '@/providers/AuthProvider';

const MAX_RETRIES = 3;

export default function DashboardPage() {
  const { user, loading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [adminMetrics, setAdminMetrics] = useState<DashboardMetricsType | null>(null);
  const [isLoadingAdminMetrics, setIsLoadingAdminMetrics] = useState(false);
  const [adminMetricsError, setAdminMetricsError] = useState<Error | null>(null);
  const [authIssue, setAuthIssue] = useState(false);
  const [apiStatus, setApiStatus] = useState<{ connected: boolean; message: string }>({
    connected: false,
    message: 'Checking connection...'
  });

  // Check API connectivity on component mount
  useEffect(() => {
    const checkApiStatus = async () => {
      try {
        const result = await apiHealthCheck.checkConnection();
        if (result.success) {
          setApiStatus({
            connected: true,
            message: 'Connected to API'
          });
        } else {
          setApiStatus({
            connected: false,
            message: `API unavailable: ${result.error}`
          });
          console.error('API connectivity issue:', result);
        }
      } catch (error) {
        setApiStatus({
          connected: false,
          message: `Error checking API: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    };

    checkApiStatus();
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      if (!authAPI.isAuthenticated()) {
        console.log('No authentication token found, redirecting to login');
        navigate('/login', { state: { from: location.pathname } });
        return;
      }

      const userDataStr = localStorage.getItem('userData');
      let userData = null;
      
      if (userDataStr) {
        try {
          const cachedUser = JSON.parse(userDataStr);
          if (cachedUser && cachedUser.id) {
            console.log('Using cached user data:', cachedUser);
            userData = {
              id: cachedUser.id || 0,
              name: cachedUser.name || '',
              email: cachedUser.email || '',
              role: cachedUser.role || 'user'
            };
            setIsAdmin(cachedUser.role === 'admin');
          }
        } catch (e) {
          console.warn('Error parsing cached user data:', e);
        }
      }

      if (!userData) {
        try {
          userData = await authAPI.getCurrentUser();
          if (userData) {
            setIsAdmin(userData.role === 'admin');
            console.log('User data loaded from API:', userData);
          } else {
            throw new Error('User data not found');
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          toast.error('Could not fetch user data. Please log in again.');
          navigate('/login');
          return;
        }
      }
      
      if (userData) {
        localStorage.setItem('userData', JSON.stringify(userData));
      }
    };

    checkAuth();
  }, [navigate, location.pathname]);

  const fetchBookings = useCallback(async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    try {
      setIsRefreshing(true);
      setError(null);
      const data = await bookingAPI.getUserBookings(user.id);
      if (Array.isArray(data)) {
        setBookings(data);
      } else if (data && Array.isArray(data.bookings)) {
        setBookings(data.bookings);
      } else {
        setBookings([]);
      }
      setRetryCount(0);
    } catch (error) {
      setError(error instanceof Error ? error : new Error('Failed to fetch bookings'));
      setRetryCount(prev => prev + 1);
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  }, [isAuthenticated, navigate, user?.id]);

  const fetchAdminMetrics = useCallback(async () => {
    if (!isAdmin || !user?.id) return;
    
    try {
      setIsLoadingAdminMetrics(true);
      setAdminMetricsError(null);
      console.log('Fetching admin metrics for user ID:', user.id);
      
      const data = await bookingAPI.getAdminDashboardMetrics('week');
      
      if (data) {
        setAdminMetrics(data);
        console.log('Admin metrics loaded:', data);
      } else {
        console.warn('No admin metrics data received');
        setAdminMetrics(null);
      }
    } catch (error) {
      console.error('Error fetching admin metrics:', error);
      setAdminMetricsError(error instanceof Error ? error : new Error('Failed to fetch admin metrics'));
      toast.error('Could not load admin metrics');
    } finally {
      setIsLoadingAdminMetrics(false);
    }
  }, [isAdmin, user]);

  useEffect(() => {
    if (user?.id) {
      fetchBookings();
    }
  }, [fetchBookings, user]);

  useEffect(() => {
    if (isAdmin && user?.id) {
      fetchAdminMetrics();
    }
  }, [isAdmin, fetchAdminMetrics, user]);

  const handleLogout = () => {
    authAPI.logout();
    navigate('/login');
    toast.success('Logged out successfully');
  };

  const handleRelogin = () => {
    localStorage.removeItem('authToken');
    navigate('/login', { state: { from: location.pathname } });
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

  function safeToFixed(value, digits = 2, fallback = '0.00') {
    const num = Number(value);
    return isNaN(num) ? fallback : num.toFixed(digits);
  }

  // Categorize bookings
  const now = new Date();
  const parseDate = (dateStr) => new Date(dateStr);
  const isFuture = (dateStr) => parseDate(dateStr) > now;
  const isPast = (dateStr) => parseDate(dateStr) < now;

  const currentBooking = bookings.find(
    b => ['pending', 'confirmed', 'in_progress'].includes(b.status) && isFuture(b.pickup_date || b.pickupDate)
  );
  const upcomingBookings = bookings.filter(
    b => ['pending', 'confirmed'].includes(b.status) && isFuture(b.pickup_date || b.pickupDate) && b !== currentBooking
  );
  const pastBookings = bookings.filter(
    b => b.status === 'completed' && isPast(b.pickup_date || b.pickupDate)
  );
  const cancelledBookings = bookings.filter(
    b => b.status === 'cancelled'
  );

  // Helper for invoice download
  const getInvoiceUrl = (booking) => `/api/invoice/${booking.id}`;

  if (authIssue) {
    return (
      <div className="container mx-auto py-10 px-4">
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Authentication Issue</AlertTitle>
          <AlertDescription>
            Your session may have expired or there was a problem with your authentication. 
            Please try logging in again.
          </AlertDescription>
          <div className="mt-4">
            <Button onClick={handleRelogin}>Log In Again</Button>
          </div>
        </Alert>
        
        {bookings.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-medium mb-4">Cached Bookings</h2>
            <p className="text-gray-500 mb-4">These bookings were previously loaded and may not be up to date.</p>
            
            <BookingsList 
              bookings={bookings} 
              isRefreshing={false}
              formatDate={formatDate}
              getStatusColor={getStatusColor}
              safeToFixed={safeToFixed}
            />
          </div>
        )}
      </div>
    );
  }

  if (isLoading && !error) {
    return (
      <div className="container mx-auto py-10 px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-medium">Dashboard</h1>
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

  if (error && retryCount >= MAX_RETRIES) {
    return (
      <ApiErrorFallback 
        error={error} 
        onRetry={fetchBookings}
        title="Error Loading Dashboard"
        description="We couldn't load your bookings. Please try again."
      />
    );
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!isAuthenticated || !user) {
    navigate('/login');
    return null;
  }

  // If user is a guest, show enhanced guest dashboard
  if (user.role === 'guest') {
    const GuestDashboard = React.lazy(() => import('@/components/guest/GuestDashboard'));
    return (
      <React.Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
        <GuestDashboard user={user} onLogout={handleLogout} />
      </React.Suspense>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
      <h2 className="text-xl font-semibold mb-4">
        Welcome back, {user.name}
      </h2>
      {user.role && (
        <div className="mb-4 text-gray-600">Role: {user.role.replace('_', ' ')}</div>
      )}
      {!apiStatus.connected && (
        <Alert variant="warning" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>API Connection Issue</AlertTitle>
          <AlertDescription>{apiStatus.message}</AlertDescription>
        </Alert>
      )}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div />
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

      {(isAdmin) && (
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
            safeToFixed={safeToFixed}
          />
        </TabsContent>
        
        <TabsContent value="upcoming">
          <BookingsList 
            bookings={upcomingBookings} 
            isRefreshing={isRefreshing}
            formatDate={formatDate}
            getStatusColor={getStatusColor}
            safeToFixed={safeToFixed}
          />
        </TabsContent>
        
        <TabsContent value="completed">
          <BookingsList 
            bookings={pastBookings} 
            isRefreshing={isRefreshing}
            formatDate={formatDate}
            getStatusColor={getStatusColor}
            safeToFixed={safeToFixed}
          />
        </TabsContent>
        
        <TabsContent value="cancelled">
          <BookingsList 
            bookings={cancelledBookings} 
            isRefreshing={isRefreshing}
            formatDate={formatDate}
            getStatusColor={getStatusColor}
            safeToFixed={safeToFixed}
          />
        </TabsContent>
      </Tabs>

      {/* Current Booking */}
      <h2 className="text-2xl font-semibold mt-8 mb-2">Current Booking</h2>
      {currentBooking ? (
        <div className="mb-4 p-4 border rounded-lg bg-blue-50">
          <div>Booking #{currentBooking.bookingNumber || currentBooking.id}</div>
          <div>{currentBooking.pickup_location || currentBooking.pickupLocation} → {currentBooking.drop_location || currentBooking.dropLocation}</div>
          <div>Date: {currentBooking.pickup_date || currentBooking.pickupDate}</div>
          <div>Status: {currentBooking.status}</div>
        </div>
      ) : <p>No current booking.</p>}
      {/* Upcoming Bookings */}
      <h2 className="text-2xl font-semibold mt-8 mb-2">Upcoming Bookings</h2>
      {upcomingBookings.length > 0 ? upcomingBookings.map(b => (
        <div key={b.id} className="mb-2 p-4 border rounded-lg">
          <div>Booking #{b.bookingNumber || b.id}</div>
          <div>{b.pickup_location || b.pickupLocation} → {b.drop_location || b.dropLocation}</div>
          <div>Date: {b.pickup_date || b.pickupDate}</div>
          <div>Status: {b.status}</div>
        </div>
      )) : <p>No upcoming bookings.</p>}
      {/* Past Bookings */}
      <h2 className="text-2xl font-semibold mt-8 mb-2">Past Bookings</h2>
      {pastBookings.length > 0 ? pastBookings.map(b => (
        <div key={b.id} className="mb-2 p-4 border rounded-lg">
          <div>Booking #{b.bookingNumber || b.id}</div>
          <div>{b.pickup_location || b.pickupLocation} → {b.drop_location || b.dropLocation}</div>
          <div>Date: {b.pickup_date || b.pickupDate}</div>
          <div>Status: {b.status}</div>
          <a href={getInvoiceUrl(b)} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline mt-2 inline-block">Download Invoice</a>
        </div>
      )) : <p>No past bookings.</p>}
      {/* Cancelled Bookings */}
      <h2 className="text-2xl font-semibold mt-8 mb-2">Cancelled Bookings</h2>
      {cancelledBookings.length > 0 ? cancelledBookings.map(b => (
        <div key={b.id} className="mb-2 p-4 border rounded-lg bg-gray-100">
          <div>Booking #{b.bookingNumber || b.id}</div>
          <div>{b.pickup_location || b.pickupLocation} → {b.drop_location || b.dropLocation}</div>
          <div>Date: {b.pickup_date || b.pickupDate}</div>
          <div>Status: {b.status}</div>
        </div>
      )) : <p>No cancelled bookings.</p>}
    </div>
  );
}

function BookingsList({ bookings, isRefreshing, formatDate, getStatusColor, safeToFixed }: { 
  bookings: Booking[]; 
  isRefreshing: boolean;
  formatDate: (date: string) => string;
  getStatusColor: (status: string) => string;
  safeToFixed: (value: any, digits?: number, fallback?: string) => string;
}) {
  if (isRefreshing) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="text-center py-8">
        <CircleOff className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No bookings</h3>
        <p className="mt-1 text-sm text-gray-500">Get started by creating a new booking.</p>
        <div className="mt-6">
          <Button onClick={() => window.location.href = '/'}>
            Create Booking
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-300px)]">
      <div className="space-y-4">
        {bookings.map((booking) => (
          <Card key={booking.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusColor(booking.status) as any}>
                      {booking.status}
                    </Badge>
                    <span className="text-sm text-gray-500">
                      Booking #{booking.id}
                    </span>
                  </div>
                  <h3 className="mt-2 text-lg font-semibold">
                    {booking.pickupLocation} → {booking.dropLocation}
                  </h3>
                  <div className="mt-2 space-y-1 text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(booking.pickupDate)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4" />
                      <span>{booking.cabType || 'Standard'}</span>
                    </div>
                    {booking.driverName && (
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4" />
                        <span>Driver: {booking.driverName}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold">
                    ₹{safeToFixed(booking.totalAmount, 2, '0.00')}
                  </div>
                  <div className="text-sm text-gray-500">
                    {booking.payment_status || 'Pending'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}
