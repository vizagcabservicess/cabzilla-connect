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

const MAX_RETRIES = 3;

// Default metrics to use as fallback in case of API failure
const DEFAULT_METRICS: DashboardMetricsType = {
  totalBookings: 0,
  activeRides: 0,
  totalRevenue: 0,
  availableDrivers: 0,
  busyDrivers: 0,
  avgRating: 0,
  upcomingRides: 0,
  availableStatuses: ['pending', 'confirmed', 'completed', 'cancelled'],
  currentFilter: 'all'
};

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

  useEffect(() => {
    const checkAuth = async () => {
      if (!authAPI.isAuthenticated()) {
        navigate('/login', { state: { from: location.pathname } });
        return;
      }

      try {
        const userData = await authAPI.getCurrentUser();
        if (userData) {
          // Store userId in localStorage for API requests - but don't overwrite if exists
          if (userData.id) {
            const currentStoredId = localStorage.getItem('userId');
            if (!currentStoredId || currentStoredId !== userData.id.toString()) {
              localStorage.setItem('userId', userData.id.toString());
              console.log(`Stored user ID ${userData.id} in localStorage`);
            } else {
              console.log(`User ID ${userData.id} already stored in localStorage`);
            }
          }
          
          setUser({
            id: userData.id || 0,
            name: userData.name || '',
            email: userData.email || '',
            role: userData.role || 'user'
          });
          
          const isAdminUser = userData.role === 'admin';
          setIsAdmin(isAdminUser);
          
          // Log for debugging purposes
          console.log(`User loaded: ID=${userData.id}, Name=${userData.name}, Role=${userData.role}, IsAdmin=${isAdminUser}`);
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
      navigate('/login');
      return;
    }

    try {
      setIsRefreshing(true);
      setError(null);
      
      // Get the user ID from localStorage or user state
      const userId = user?.id || localStorage.getItem('userId');
      console.log('Fetching bookings for user ID:', userId);
      
      // Fix: Remove the argument since getUserBookings can handle getting userId internally
      const data = await bookingAPI.getUserBookings();
      
      console.log('Bookings data received:', data);
      setBookings(Array.isArray(data) ? data : []);
      setRetryCount(0);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setError(error as Error);
      
      // Retry logic
      if (retryCount < MAX_RETRIES) {
        setRetryCount(prevCount => prevCount + 1);
        setTimeout(() => {
          console.log(`Retrying booking fetch (${retryCount + 1}/${MAX_RETRIES})...`);
          fetchBookings();
        }, 2000 * Math.pow(2, retryCount));
      }
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  }, [navigate, retryCount, user]);

  useEffect(() => {
    if (user?.id) {
      fetchBookings();
    }
  }, [fetchBookings, user]);

  const fetchAdminMetrics = useCallback(async (period: string = 'week', status: string = 'all') => {
    if (!isAdmin || !user) return;
    
    try {
      setIsLoadingAdminMetrics(true);
      setAdminMetricsError(null);
      
      // Fix: Only pass the period and status as arguments, not userId
      const metrics = await bookingAPI.getAdminDashboardMetrics(period, status);
      
      console.log('Admin metrics loaded:', metrics);
      setAdminMetrics(metrics || DEFAULT_METRICS);
    } catch (error) {
      console.error('Error loading admin metrics:', error);
      setAdminMetricsError(error as Error);
      setAdminMetrics(DEFAULT_METRICS);
      
      toast.error('Error loading metrics', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsLoadingAdminMetrics(false);
    }
  }, [isAdmin, user]);

  useEffect(() => {
    if (isAdmin && user?.id) {
      fetchAdminMetrics();
    }
  }, [fetchAdminMetrics, isAdmin, user]);

  const handleLogout = () => {
    authAPI.logout();
    localStorage.removeItem('userId'); // Clear user ID on logout
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

  if (error && !isRefreshing) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ApiErrorFallback 
          error={error} 
          onRetry={fetchBookings}
          title="Error Loading Dashboard"
        />
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

  const renderAdminMetrics = () => {
    if (!isAdmin) return null;
    
    // Create a safe metrics object with guaranteed structure
    const safeMetrics: DashboardMetricsType = {
      ...DEFAULT_METRICS,
      ...(adminMetrics || {})
    };
    
    // Final safety check for availableStatuses
    if (!Array.isArray(safeMetrics.availableStatuses)) {
      safeMetrics.availableStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
    }
    
    return (
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
              metrics={safeMetrics}
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
    );
  };

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

      {renderAdminMetrics()}

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
