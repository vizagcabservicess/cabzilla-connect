
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Book, CircleOff, RefreshCw, Calendar, MapPin, Car, ShieldAlert, LogOut, Info, AlertTriangle } from "lucide-react";
import { bookingAPI } from '@/services/api';
import { authAPI } from '@/services/api/authAPI';
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
  const [isDev, setIsDev] = useState(false);

  // Check if we're in development mode
  useEffect(() => {
    // Check if local storage has dev mode flag
    const devMode = localStorage.getItem('dev_mode') === 'true';
    setIsDev(devMode);
    
    // Also check URL for dev_mode parameter
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('dev_mode') === 'true') {
      setIsDev(true);
      localStorage.setItem('dev_mode', 'true');
    }
  }, []);

  // Check if user is logged in and get user data
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Allow access in dev mode without auth
        if (isDev) {
          console.log('Dev mode enabled, skipping authentication check');
          const devUser = { 
            id: 1, 
            name: 'Dev User', 
            email: 'dev@example.com', 
            role: 'admin' 
          };
          setUser(devUser);
          setIsAdmin(true);
          localStorage.setItem('userData', JSON.stringify(devUser));
          return;
        }

        if (!authAPI.isAuthenticated()) {
          console.log('No authentication token found, redirecting to login');
          navigate('/login', { state: { from: location.pathname } });
          return;
        }

        // Try to get user data from localStorage first
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

        // If cached data isn't available or valid, fetch from server
        if (!userData) {
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
        }
        
        // Make sure localStorage has the updated user data
        if (userData) {
          localStorage.setItem('userData', JSON.stringify(userData));
        }
      } catch (error) {
        console.error('Error getting user data:', error);
        
        // If we have a token but it's invalid, show auth issue banner
        if (localStorage.getItem('authToken') || isDev) {
          setAuthIssue(true);
        } else {
          toast.error('Error loading user data. Please try logging in again.');
          // Clear token and redirect to login if we can't get user data
          localStorage.removeItem('authToken');
          navigate('/login');
        }
      }
    };

    checkAuth();
  }, [navigate, location.pathname, isDev]);

  // Fetch bookings data
  const fetchBookings = useCallback(async () => {
    // Skip auth check in dev mode
    if (!isDev && !authAPI.isAuthenticated() && !authIssue) {
      console.log('No authentication token found, redirecting to login');
      navigate('/login');
      return;
    }

    try {
      setIsRefreshing(true);
      setError(null);
      
      // Get user data from localStorage to ensure we have the user ID
      const userDataStr = localStorage.getItem('userData');
      if (!userDataStr && !isDev) {
        throw new Error('User data not found in localStorage');
      }
      
      let userId = 1; // Default for dev mode
      
      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
        if (!userData || !userData.id) {
          throw new Error('Invalid user data in localStorage');
        }
        userId = userData.id;
      }
      
      console.log('Fetching bookings for user ID:', userId, 'Dev mode:', isDev);
      
      // Add dev_mode parameter if in dev mode
      const options = isDev ? { dev_mode: true } : undefined;
      
      // Pass the user ID explicitly to the bookings API
      const data = await bookingAPI.getUserBookings(userId, options);
      
      if (Array.isArray(data)) {
        setBookings(data);
        
        // If we got data, clear auth issue flag
        if (data.length > 0) {
          setAuthIssue(false);
        }
      } else {
        console.warn('Unexpected bookings data format:', data);
        setBookings([]);
      }
      
      setRetryCount(0); // Reset retry count on success
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setError(error instanceof Error ? error : new Error('Failed to fetch bookings'));
      
      // Only show toast on first error
      if (retryCount === 0) {
        toast.error('Error loading bookings. Retrying...');
      }
      
      // Increment retry count
      setRetryCount(prev => prev + 1);
      
      // Check if this might be an auth issue
      if (error instanceof Error && 
          (error.message.includes('401') || 
           error.message.includes('authentication') || 
           error.message.includes('unauthorized'))) {
        setAuthIssue(true);
      }
      
      // Auto-retry if under max retries
      if (retryCount < MAX_RETRIES) {
        setTimeout(() => {
          fetchBookings();
        }, 3000); // Wait 3 seconds before retrying
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [navigate, retryCount, authIssue, isDev]);

  // Fetch admin metrics if user is admin
  const fetchAdminMetrics = useCallback(async () => {
    if ((!isAdmin && !isDev) || !user?.id) return;
    
    try {
      setIsLoadingAdminMetrics(true);
      setAdminMetricsError(null);
      console.log('Fetching admin metrics for user ID:', user.id, 'Dev mode:', isDev);
      
      // Add dev_mode parameter if in dev mode
      const options = isDev ? { dev_mode: true } : undefined;
      
      const data = await bookingAPI.getAdminDashboardMetrics('week', user.id, options);
      
      if (data) {
        setAdminMetrics(data);
      } else {
        console.warn('No admin metrics data received');
        setAdminMetrics(null);
      }
    } catch (error) {
      console.error('Error fetching admin metrics:', error);
      setAdminMetricsError(error instanceof Error ? error : new Error('Failed to fetch admin metrics'));
    } finally {
      setIsLoadingAdminMetrics(false);
    }
  }, [isAdmin, user, isDev]);

  // Initial data fetch
  useEffect(() => {
    if (user?.id || isDev) {
      fetchBookings();
    }
  }, [fetchBookings, user, isDev]);

  // Fetch admin metrics if user is admin
  useEffect(() => {
    if ((isAdmin || isDev) && (user?.id || isDev)) {
      fetchAdminMetrics();
    }
  }, [isAdmin, fetchAdminMetrics, user, isDev]);

  // Handle logout
  const handleLogout = () => {
    authAPI.logout();
    localStorage.removeItem('dev_mode'); // Clear dev mode flag
    navigate('/login');
    toast.success('Logged out successfully');
  };

  // Handle re-login
  const handleRelogin = () => {
    localStorage.removeItem('authToken');
    navigate('/login', { state: { from: location.pathname } });
  };

  // Format date for display
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

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Enable dev mode
  const enableDevMode = () => {
    localStorage.setItem('dev_mode', 'true');
    setIsDev(true);
    window.location.reload();
  };

  // Show authentication issue banner
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
          <div className="mt-4 flex gap-2">
            <Button onClick={handleRelogin}>Log In Again</Button>
            <Button variant="outline" onClick={enableDevMode}>Enable Dev Mode</Button>
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

  // If still loading initial data
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

  // If error occurred and max retries exceeded
  if (error && retryCount >= MAX_RETRIES) {
    return (
      <ApiErrorFallback 
        error={error} 
        onRetry={fetchBookings}
        title="Error Loading Dashboard"
        description="We couldn't load your bookings. Please try again."
        extraActions={
          <Button variant="outline" onClick={enableDevMode}>Enable Dev Mode</Button>
        }
      />
    );
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-500">Welcome back, {user?.name || 'User'}</p>
          {isDev && (
            <Badge variant="outline" className="ml-2 bg-yellow-100 text-yellow-800">
              Dev Mode
            </Badge>
          )}
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

      {/* Conditionally render admin metrics for admin users */}
      {(isAdmin || isDev) && (
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
                  // Logic to filter metrics by status if needed
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

// Separate component for the bookings list
function BookingsList({ bookings, isRefreshing, formatDate, getStatusColor }: { 
  bookings: Booking[]; 
  isRefreshing: boolean;
  formatDate: (date: string) => string;
  getStatusColor: (status: string) => string;
}) {
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
        <p className="text-gray-500">No bookings found.</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-300px)] pr-4">
      <div className="space-y-4">
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
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}
