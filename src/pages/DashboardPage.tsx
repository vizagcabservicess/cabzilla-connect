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
import { isPreviewMode } from '@/utils/apiHelper';

const MAX_RETRIES = 3;

// Mock bookings for preview mode
const MOCK_BOOKINGS: Booking[] = [
  {
    id: 101,
    user_id: 1, // Changed from userId to user_id
    bookingNumber: 'BK12345',
    pickupLocation: 'Mumbai Airport',
    dropLocation: 'Hotel Taj, Colaba',
    pickupDate: '2025-04-10T10:00:00',
    returnDate: null,
    cabType: 'Sedan',
    distance: 25,
    tripType: 'airport',
    tripMode: 'one-way',
    totalAmount: 1500,
    status: 'confirmed',
    passengerName: 'John Doe',
    passengerPhone: '+911234567890',
    passengerEmail: 'john@example.com',
    driverName: 'Rajesh Kumar',
    driverPhone: '+919876543210',
    createdAt: '2025-04-01T08:30:00',
    updatedAt: '2025-04-01T09:15:00'
  },
  {
    id: 102,
    user_id: 1,
    bookingNumber: 'BK12346',
    pickupLocation: 'Hotel Oberoi, Nariman Point',
    dropLocation: 'Mumbai Airport',
    pickupDate: '2025-04-12T14:00:00',
    returnDate: null,
    cabType: 'SUV',
    distance: 28,
    tripType: 'airport',
    tripMode: 'one-way',
    totalAmount: 1800,
    status: 'pending',
    passengerName: 'John Doe',
    passengerPhone: '+911234567890',
    passengerEmail: 'john@example.com',
    driverName: null,
    driverPhone: null,
    createdAt: '2025-04-02T10:15:00',
    updatedAt: '2025-04-02T10:15:00'
  },
  {
    id: 103,
    user_id: 1,
    bookingNumber: 'BK12347',
    pickupLocation: 'Hotel Taj, Colaba',
    dropLocation: 'Pune',
    pickupDate: '2025-03-25T09:00:00',
    returnDate: '2025-03-26T18:00:00',
    cabType: 'Tempo Traveller',
    distance: 150,
    tripType: 'outstation',
    tripMode: 'round-trip',
    totalAmount: 8500,
    status: 'completed',
    passengerName: 'John Doe Family Trip',
    passengerPhone: '+911234567890',
    passengerEmail: 'john@example.com',
    driverName: 'Santosh Sharma',
    driverPhone: '+919988776655',
    createdAt: '2025-03-20T11:30:00',
    updatedAt: '2025-03-27T19:15:00'
  },
  {
    id: 104,
    user_id: 1,
    bookingNumber: 'BK12348',
    pickupLocation: 'Office, BKC',
    dropLocation: null,
    pickupDate: '2025-03-15T10:00:00',
    returnDate: '2025-03-15T18:00:00',
    cabType: 'Sedan',
    distance: 40,
    tripType: 'local',
    tripMode: 'rental',
    totalAmount: 2500,
    status: 'cancelled',
    passengerName: 'John Doe',
    passengerPhone: '+911234567890',
    passengerEmail: 'john@example.com',
    driverName: null,
    driverPhone: null,
    createdAt: '2025-03-14T09:30:00',
    updatedAt: '2025-03-14T12:15:00'
  }
];

// Mock metrics for preview mode
const MOCK_METRICS: DashboardMetricsType = {
  totalBookings: 48,
  activeRides: 5,
  totalRevenue: 125000,
  availableDrivers: 12,
  busyDrivers: 18,
  avgRating: 4.7,
  upcomingRides: 15,
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
  const [usingMockData, setUsingMockData] = useState(false);

  // Check if user is logged in and get user data
  useEffect(() => {
    const checkAuth = async () => {
      if (!authAPI.isAuthenticated() && !isPreviewMode()) {
        navigate('/login', { state: { from: location.pathname } });
        return;
      }

      try {
        let userData = authAPI.getCurrentUser();
        
        // Use mock user data in preview mode
        if (!userData && isPreviewMode()) {
          console.log('Using mock user data in preview mode');
          userData = {
            id: 1,
            name: 'Demo User',
            email: 'demo@example.com',
            role: 'admin' // Set as admin in preview mode for testing
          };
          setUsingMockData(true);
        }
        
        if (userData) {
          setUser(userData);
          setIsAdmin(userData.role === 'admin');
        } else if (!isPreviewMode()) {
          throw new Error('User data not found');
        }
      } catch (error) {
        console.error('Error getting user data:', error);
        
        if (isPreviewMode()) {
          // Use mock data in preview mode
          setUser({
            id: 1,
            name: 'Demo User',
            email: 'demo@example.com',
            role: 'admin'
          });
          setIsAdmin(true);
          setUsingMockData(true);
        } else {
          // Don't redirect, just show an error message
          toast.error('Error loading user data. Please try logging in again.');
        }
      }
    };

    checkAuth();
  }, [navigate, location.pathname]);

  // Fetch bookings data
  const fetchBookings = useCallback(async () => {
    if (!authAPI.isAuthenticated() && !isPreviewMode()) {
      navigate('/login');
      return;
    }

    try {
      setIsRefreshing(true);
      setError(null);
      
      if (isPreviewMode()) {
        // Use mock data in preview mode
        console.log('Using mock booking data in preview mode');
        setBookings(MOCK_BOOKINGS);
        setUsingMockData(true);
        setRetryCount(0);
      } else {
        const data = await bookingAPI.getUserBookings();
        setBookings(data);
        setUsingMockData(false);
        setRetryCount(0); // Reset retry count on success
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
      
      if (isPreviewMode()) {
        // Use mock data in preview mode
        console.log('Using mock booking data in preview mode due to error');
        setBookings(MOCK_BOOKINGS);
        setUsingMockData(true);
        setRetryCount(0);
      } else {
        setError(error instanceof Error ? error : new Error('Failed to fetch bookings'));
        
        // Only show toast on first error
        if (retryCount === 0) {
          toast.error('Error loading bookings. Retrying...');
        }
        
        // Increment retry count
        setRetryCount(prev => prev + 1);
        
        // Auto-retry if under max retries
        if (retryCount < MAX_RETRIES) {
          setTimeout(() => {
            fetchBookings();
          }, 3000); // Wait 3 seconds before retrying
        }
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [navigate, retryCount]);

  // Fetch admin metrics if user is admin
  const fetchAdminMetrics = useCallback(async () => {
    if (!isAdmin && !isPreviewMode()) return;
    
    try {
      setIsLoadingAdminMetrics(true);
      setAdminMetricsError(null);
      
      if (isPreviewMode()) {
        // Use mock data in preview mode
        console.log('Using mock metrics data in preview mode');
        setAdminMetrics(MOCK_METRICS);
        setUsingMockData(true);
      } else {
        const data = await bookingAPI.getAdminDashboardMetrics('week');
        setAdminMetrics(data);
        setUsingMockData(false);
      }
    } catch (error) {
      console.error('Error fetching admin metrics:', error);
      
      if (isPreviewMode()) {
        // Use mock data in preview mode
        console.log('Using mock metrics data in preview mode due to error');
        setAdminMetrics(MOCK_METRICS);
        setUsingMockData(true);
      } else {
        setAdminMetricsError(error instanceof Error ? error : new Error('Failed to fetch admin metrics'));
      }
    } finally {
      setIsLoadingAdminMetrics(false);
    }
  }, [isAdmin]);

  // Initial data fetch
  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Fetch admin metrics if user is admin
  useEffect(() => {
    if (isAdmin || isPreviewMode()) {
      fetchAdminMetrics();
    }
  }, [isAdmin, fetchAdminMetrics]);

  // Handle logout
  const handleLogout = () => {
    authAPI.logout();
    navigate('/login');
    toast.success('Logged out successfully');
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
  if (error && retryCount >= MAX_RETRIES && !isPreviewMode()) {
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
      {usingMockData && (
        <Alert className="mb-4 bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-700">
            Using demo data for preview purposes. In production, real data from the database will be displayed.
          </AlertDescription>
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

      {/* Conditionally render admin metrics for admin users */}
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
