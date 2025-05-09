
import { useState, useEffect, useCallback, useRef } from 'react';
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

const MAX_RETRIES = 3;

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
            setUser(userData);
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
            setUser({
              id: userData.id || 0,
              name: userData.name || '',
              email: userData.email || '',
              role: userData.role || 'user'
            });
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
    if (!authAPI.isAuthenticated() && !authIssue) {
      console.log('No authentication token found, redirecting to login');
      navigate('/login');
      return;
    }

    try {
      setIsRefreshing(true);
      setError(null);
      
      const userDataStr = localStorage.getItem('userData');
      if (!userDataStr) {
        throw new Error('User data not found in localStorage');
      }
      
      const userData = JSON.parse(userDataStr);
      if (!userData || !userData.id) {
        throw new Error('Invalid user data in localStorage');
      }
      
      const userId = userData.id;
      console.log('Fetching bookings for user ID:', userId);
      
      let data;
      try {
        // Attempt to fetch real booking data from the API
        data = await bookingAPI.getUserBookings(userId);
        console.log('Fetched bookings data:', data);
        
        if (Array.isArray(data)) {
          setBookings(data);
          if (data.length > 0) {
            setAuthIssue(false);
            toast.success(`Loaded ${data.length} bookings`);
          } else {
            toast.info('No bookings found');
          }
        } else if (data && Array.isArray(data.bookings)) {
          setBookings(data.bookings);
          if (data.bookings.length > 0) {
            setAuthIssue(false);
            toast.success(`Loaded ${data.bookings.length} bookings`);
          } else {
            toast.info('No bookings found');
          }
        } else {
          console.warn('Unexpected bookings data format:', data);
          toast.error('Received unexpected data format from server');
          setBookings([]);
          throw new Error('Invalid booking data format received');
        }
      } catch (apiError) {
        console.warn('bookingAPI.getUserBookings failed, trying direct fetch:', apiError);
        
        // If API call fails, try direct fetch as fallback
        const token = localStorage.getItem('authToken');
        const response = await fetch(`/api/user/bookings.php?user_id=${userId}`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Cache-Control': 'no-cache',
            'X-Force-Refresh': 'true',
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`API failed with status: ${response.status}`);
        }
        
        const jsonData = await response.json();
        if (jsonData && (Array.isArray(jsonData) || Array.isArray(jsonData.bookings))) {
          const bookingsData = Array.isArray(jsonData) ? jsonData : jsonData.bookings;
          setBookings(bookingsData);
          console.log('Fetched bookings via direct API:', bookingsData);
          if (bookingsData.length > 0) {
            setAuthIssue(false);
          } else {
            toast.info('No bookings found');
          }
        } else {
          throw new Error('Invalid response format from direct API call');
        }
      }
      
      setRetryCount(0);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setError(error instanceof Error ? error : new Error('Failed to fetch bookings'));
      
      if (retryCount === 0) {
        toast.error('Error loading bookings. Retrying...');
      }
      
      setRetryCount(prev => prev + 1);
      
      if (error instanceof Error && 
          (error.message.includes('401') || 
           error.message.includes('authentication') || 
           error.message.includes('unauthorized'))) {
        setAuthIssue(true);
      }
      
      if (retryCount < MAX_RETRIES - 1) {
        setTimeout(() => {
          fetchBookings();
        }, 3000);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [navigate, retryCount, authIssue]);

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
            <h2 className="text-2xl font-bold mb-4">Cached Bookings</h2>
            <p className="text-gray-500 mb-4">These bookings were previously loaded and may not be up to date.</p>
            
            <BookingsList 
              bookings={bookings} 
              isRefreshing={false}
              formatDate={formatDate}
              getStatusColor={getStatusColor}
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

  return (
    <div className="container mx-auto py-10 px-4">
      {!apiStatus.connected && (
        <Alert variant="warning" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>API Connection Issue</AlertTitle>
          <AlertDescription>{apiStatus.message}</AlertDescription>
        </Alert>
      )}
      
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
          />
        </TabsContent>
        
        <TabsContent value="upcoming">
          <BookingsList 
            bookings={bookings.filter(b => ['pending', 'confirmed'].includes(b.status))} 
            isRefreshing={isRefreshing}
            formatDate={formatDate}
            getStatusColor={getStatusColor}
          />
        </TabsContent>
        
        <TabsContent value="completed">
          <BookingsList 
            bookings={bookings.filter(b => b.status === 'completed')} 
            isRefreshing={isRefreshing}
            formatDate={formatDate}
            getStatusColor={getStatusColor}
          />
        </TabsContent>
        
        <TabsContent value="cancelled">
          <BookingsList 
            bookings={bookings.filter(b => b.status === 'cancelled')} 
            isRefreshing={isRefreshing}
            formatDate={formatDate}
            getStatusColor={getStatusColor}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BookingsList({ bookings, isRefreshing, formatDate, getStatusColor }: { 
  bookings: Booking[]; 
  isRefreshing: boolean;
  formatDate: (date: string) => string;
  getStatusColor: (status: string) => string;
}) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  if (isRefreshing) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Refreshing bookings...</span>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <Info className="h-10 w-10 text-gray-400 mb-2" />
        <h3 className="text-lg font-medium">No Bookings</h3>
        <p className="text-gray-500">You don't have any bookings yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-hidden">
      <ScrollArea className="h-[calc(100vh-300px)]" scrollHideDelay={0}>
        <div className="min-w-[1000px]"> {/* Force minimum width to ensure scrolling */}
          <div className="space-y-4 p-4">
            {bookings.map((booking) => (
              <Card key={booking.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">
                        {booking.pickupLocation} to {booking.dropLocation}
                      </CardTitle>
                      <p className="text-sm text-gray-500">
                        Booking #{booking.bookingNumber}
                      </p>
                    </div>
                    <Badge className={getStatusColor(booking.status)}>
                      {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm font-medium flex items-center">
                        <Calendar className="h-4 w-4 mr-1" /> Pickup Date
                      </p>
                      <p className="text-sm">{formatDate(booking.pickupDate)}</p>
                      
                      {booking.returnDate && (
                        <>
                          <p className="text-sm font-medium mt-2 flex items-center">
                            <Calendar className="h-4 w-4 mr-1" /> Return Date
                          </p>
                          <p className="text-sm">{formatDate(booking.returnDate)}</p>
                        </>
                      )}
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium flex items-center">
                        <MapPin className="h-4 w-4 mr-1" /> Trip Details
                      </p>
                      <p className="text-sm">
                        {booking.tripType.charAt(0).toUpperCase() + booking.tripType.slice(1)}, {' '}
                        {booking.tripMode === 'one-way' ? 'One Way' : 'Round Trip'}
                      </p>
                      <p className="text-sm">
                        Cab: {booking.cabType.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </p>
                      <p className="text-sm">Distance: {booking.distance} km</p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium">Fare Details</p>
                      <p className="text-xl font-bold">₹{booking.totalAmount.toLocaleString('en-IN')}</p>
                      
                      {booking.driverName && (
                        <>
                          <p className="text-sm font-medium mt-2">Driver</p>
                          <p className="text-sm">{booking.driverName}</p>
                          {booking.driverPhone && (
                            <p className="text-sm">{booking.driverPhone}</p>
                          )}
                          {booking.vehicleNumber && (
                            <p className="text-sm">Vehicle: {booking.vehicleNumber}</p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
